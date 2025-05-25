
import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CompanyInfoHeader from "@/components/exports/CompanyInfoHeader";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";

interface InvoiceItem {
  id: string;
  name: string;
  code: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  tax_rate?: number;
  tax_amount?: number;
}

interface Invoice {
  id: string;
  number: string;
  issuedate: string;
  duedate?: string;
  clientid: string;
  client: {
    name: string;
    address: string;
    taxid: string;
    city: string;
    country: string;
  };
  subtotal: number;
  taxtotal: number;
  total: number;
  status: string;
  notes?: string;
  items: InvoiceItem[];
}

const PrintableInvoiceV3 = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const location = useLocation();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const { companyInfo } = useCompanyInfo();
  const [template, setTemplate] = useState<string | null>(null);

  // Get template ID from query params
  const getTemplateId = () => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get("template");
  };

  useEffect(() => {
    // Automatically trigger print when the invoice data is loaded
    if (invoice && template) {
      // Small delay to ensure the DOM has been updated
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [invoice, template]);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);

        let tableName, itemsTableName, itemsRelationKey;
        
        // Determine the table names based on document type
        switch (type) {
          case 'final':
            tableName = 'final_invoices';
            itemsTableName = 'final_invoice_items';
            itemsRelationKey = 'finalinvoiceid';
            break;
          case 'proforma':
            tableName = 'proforma_invoices';
            itemsTableName = 'proforma_invoice_items';
            itemsRelationKey = 'proformainvoiceid';
            break;
          case 'delivery_note':
            tableName = 'delivery_notes';
            itemsTableName = 'delivery_note_items';
            itemsRelationKey = 'deliverynoteid';
            break;
          default:
            tableName = 'final_invoices';
            itemsTableName = 'final_invoice_items';
            itemsRelationKey = 'finalinvoiceid';
        }

        // Fetch the invoice
        const { data: invoiceData, error: invoiceError } = await supabase
          .from(tableName)
          .select(`
            *,
            client:clientid (
              name, 
              address, 
              taxid, 
              city,
              country
            )
          `)
          .eq('id', id)
          .single();

        if (invoiceError) {
          console.error("Error fetching invoice:", invoiceError);
          return;
        }

        // Fetch invoice items
        const { data: items, error: itemsError } = await supabase
          .from('products')
          .select(`
            id,
            name,
            code,
            description,
            unitprice,
            taxrate,
            quantity
          `)

          .eq(itemsRelationKey, id);

        if (itemsError) {
          console.error("Error fetching items:", itemsError);
          return;
        }

        // Format items
        const formattedItems = items.map(item => ({
          id: item.id,
          name: item.name,
          code: item.code,
          description: item.product?.name || item.description || "",
          quantity: item.quantity || 1,
          unit_price: item.unitprice,
          total: (item.quantity || 1) * item.unitprice,
          tax_rate: item.taxrate,
          tax_amount: ((item.quantity || 1) * item.unitprice * (item.taxrate / 100))
        }));

        // Combine invoice with items
        const fullInvoice = {
          ...invoiceData,
          items: formattedItems
        };

        setInvoice(fullInvoice);

        // Fetch specified template if template ID is provided
        const templateId = getTemplateId();
        if (templateId) {
          const { data: templateData, error: templateError } = await supabase
            .from('pdf_templates')
            .select('template_html')
            .eq('id', templateId)
            .single();

          if (templateError) {
            console.error("Error fetching specified template:", templateError);
          } else if (templateData?.template_html) {
            setTemplate(templateData.template_html);
            setLoading(false);
            return;
          }
        }

        // If no specific template ID or template not found, get the default template
        const templateType = type === 'final' ? 'invoice' : type;
        const { data: templateData } = await supabase
          .from('pdf_templates')
          .select('template_html')
          .eq('type', templateType)
          .eq('is_default', true)
          .single();

        if (templateData?.template_html) {
          setTemplate(templateData.template_html);
        } else {
          // If no default template is found, try to get any template for this type
          const { data: anyTemplate } = await supabase
            .from('pdf_templates')
            .select('template_html')
            .eq('type', templateType)
            .limit(1)
            .single();

          if (anyTemplate?.template_html) {
            setTemplate(anyTemplate.template_html);
          } else {
            // Use default template if none found
            setTemplate(generateDefaultTemplate());
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Error in fetch operation:", err);
        setLoading(false);
      }
    };

    if (id && type) {
      fetchInvoice();
    }
  }, [id, type, location.search]);

  const generateDefaultTemplate = () => {
    return `
      <div class="invoice-container">
        <div class="company-header"></div>
        <div class="invoice-details">
          <h1>${type === 'final' ? 'INVOICE' : type === 'proforma' ? 'PROFORMA INVOICE' : 'DELIVERY NOTE'}</h1>
          <div data-field="invoice.number">No: {{invoice.number}}</div>
          <div data-field="invoice.issuedate">Date: {{invoice.issuedate}}</div>
          <div data-field="invoice.duedate">Due: {{invoice.duedate}}</div>
        </div>
        <div class="client-details">
          <h2>Client:</h2>
          <div data-field="client.name">{{invoice.client.name}}</div>
          <div data-field="client.address">{{invoice.client.address}}</div>
          <div data-field="client.city">{{invoice.client.city}}</div>
          <div data-field="client.taxid">Tax ID: {{invoice.client.taxid}}</div>
        </div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Tax</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {{#each invoice.items}}
            <tr>
              <td data-field="item.description">{{name}}</td>
              <td data-field="item.quantity">{{quantity}}</td>
              <td data-field="item.unit_price">{{unit_price}}</td>
              <td data-field="item.tax_rate">{{tax_rate}}%</td>
              <td data-field="item.total">{{total}}</td>
            </tr>
            {{/each}}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3"></td>
              <td>Subtotal:</td>
              <td data-field="invoice.subtotal">{{invoice.subtotal}}</td>
            </tr>
            <tr>
              <td colspan="3"></td>
              <td>Tax:</td>
              <td data-field="invoice.taxtotal">{{invoice.taxtotal}}</td>
            </tr>
            <tr>
              <td colspan="3"></td>
              <td>Total:</td>
              <td data-field="invoice.total">{{invoice.total}}</td>
            </tr>
          </tfoot>
        </table>
        <div class="notes">
          <h3>Notes:</h3>
          <p data-field="invoice.notes">{{invoice.notes}}</p>
        </div>
      </div>
    `;
  };

  const renderTemplate = () => {
    if (!invoice || !template) return null;

    // Replace data fields in the template with actual data
    let rendered = template;

    // Replace simple invoice fields
    rendered = rendered.replace(/{{invoice\.number}}/g, invoice.number || '');
    rendered = rendered.replace(/{{invoice\.issuedate}}/g, new Date(invoice.issuedate).toLocaleDateString());
    rendered = rendered.replace(/{{invoice\.duedate}}/g, invoice.duedate ? new Date(invoice.duedate).toLocaleDateString() : '');
    rendered = rendered.replace(/{{invoice\.subtotal}}/g, invoice.subtotal?.toFixed(2) || '0.00');
    rendered = rendered.replace(/{{invoice\.taxtotal}}/g, invoice.taxtotal?.toFixed(2) || '0.00');
    rendered = rendered.replace(/{{invoice\.total}}/g, invoice.total?.toFixed(2) || '0.00');
    rendered = rendered.replace(/{{invoice\.notes}}/g, invoice.notes || '');
    rendered = rendered.replace(/{{invoice\.status}}/g, invoice.status || '');
    
    // Replace client fields
    if (invoice.client) {
      rendered = rendered.replace(/{{invoice\.client\.name}}/g, invoice.client.name || '');
      rendered = rendered.replace(/{{invoice\.client\.address}}/g, invoice.client.address || '');
      rendered = rendered.replace(/{{invoice\.client\.city}}/g, invoice.client.city || '');
      rendered = rendered.replace(/{{invoice\.client\.country}}/g, invoice.client.country || '');
      rendered = rendered.replace(/{{invoice\.client\.taxid}}/g, invoice.client.taxid || '');
    }

    // Handle items
    if (invoice.items && invoice.items.length > 0) {
      // Find the template for a row
      const rowTemplateMatch = rendered.match(/{{#each invoice\.items}}([\s\S]*?){{\/each}}/);
      if (rowTemplateMatch) {
        const rowTemplate = rowTemplateMatch[1];
        let rowsHTML = '';
        
        // Generate HTML for each item
        invoice.items.forEach(item => {
          let itemRow = rowTemplate;
          itemRow = itemRow.replace(/{{description}}/g, item.name || '');
          itemRow = itemRow.replace(/{{quantity}}/g, String(item.quantity) || '1');
          itemRow = itemRow.replace(/{{unit_price}}/g, item.unit_price?.toFixed(2) || '0.00');
          itemRow = itemRow.replace(/{{tax_rate}}/g, item.tax_rate?.toString() || '0');
          itemRow = itemRow.replace(/{{total}}/g, item.total?.toFixed(2) || '0.00');
          
          rowsHTML += itemRow;
        });
        
        // Replace the each block with generated rows
        rendered = rendered.replace(/{{#each invoice\.items}}[\s\S]*?{{\/each}}/g, rowsHTML);
      }
    }

    return rendered;
  };

  return (
    <div className="print-container">
      {loading ? (
        <div className="flex items-center justify-center h-screen">
          <p className="text-xl font-semibold">Loading document data...</p>
        </div>
      ) : !invoice ? (
        <div className="flex items-center justify-center h-screen">
          <p className="text-xl font-semibold text-red-600">Failed to load document data</p>
        </div>
      ) : (
        <div className="print-content">
          <style jsx>{`
            @media print {
              body { 
                margin: 0;
                padding: 0;
              }
              .print-content {
                width: 100%;
                max-width: 100%;
                padding: 0;
                margin: 0;
              }
              .no-print {
                display: none !important;
              }
            }
            .invoice-container {
              padding: 20px;
              font-family: Arial, sans-serif;
            }
            .company-header {
              margin-bottom: 30px;
            }
            .invoice-details {
              margin-bottom: 20px;
            }
            .client-details {
              margin-bottom: 30px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .items-table th, .items-table td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            .items-table th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            .notes {
              margin-top: 30px;
            }
          `}</style>

          <div className="no-print p-4 bg-blue-100 flex justify-between items-center">
            <h1 className="text-xl font-bold">
              {type === 'final' ? 'Invoice' : type === 'proforma' ? 'Proforma Invoice' : 'Delivery Note'} #{invoice.number}
            </h1>
            <button 
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => window.print()}
            >
              Print Now
            </button>
          </div>

          {companyInfo && <CompanyInfoHeader companyInfo={companyInfo} />}
          
          <div dangerouslySetInnerHTML={{ __html: renderTemplate() || '' }} />
        </div>
      )}
    </div>
  );
};

export default PrintableInvoiceV3;
