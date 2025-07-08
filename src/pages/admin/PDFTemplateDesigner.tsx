import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Save, FileText, Eye, Code, Wand2, PanelLeft, ArrowLeft } from "lucide-react";
import { PDFTemplate, TemplateDocument, VariableCategory } from "@/types/pdf-templates";

const PDFTemplateDesigner: React.FC = () => {
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [templateType, setTemplateType] = useState<'invoice' | 'proforma' | 'delivery_note'>('proforma');
  const [templateHtml, setTemplateHtml] = useState<string>('');
  const [templateName, setTemplateName] = useState<string>('');
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [sampleDocuments, setSampleDocuments] = useState<TemplateDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // Get template type from query string if available (for new templates)
    const typeFromQuery = searchParams.get('type');
    if (typeFromQuery && (typeFromQuery === 'invoice' || typeFromQuery === 'proforma' || typeFromQuery === 'delivery_note')) {
      setTemplateType(typeFromQuery);
    }

    // If template ID is provided, load the template
    if (id) {
      loadTemplate(id);
    } else {
      // Otherwise set a default template based on type
      setTemplateHtml(getDefaultTemplate(templateType));
      setTemplateName(`New ${templateType} Template`);
    }

    // Load sample documents
    fetchSampleDocuments();
  }, [id, templateType]);

  // Variable categories and examples to help users build templates
  const variableCategories: VariableCategory[] = [
    {
      name: "Invoice Data",
      description: "Basic invoice information",
      variables: [
        { name: "invoice.number", description: "Invoice number", example: "INV-2025-001" },
        { name: "invoice.issuedate", description: "Issue date", example: "2025-05-21" },
        { name: "invoice.duedate", description: "Due date", example: "2025-06-21" },
        { name: "invoice.subtotal", description: "Subtotal amount", example: "1000.00" },
        { name: "invoice.taxtotal", description: "Total tax amount", example: "190.00" },
        { name: "invoice.total", description: "Total amount", example: "1190.00" },
        { name: "invoice.notes", description: "Invoice notes", example: "Payment due within 30 days" },
        { name: "invoice.status", description: "Invoice status", example: "payé" }
      ]
    },
    {
      name: "Client Data",
      description: "Client information",
      variables: [
        { name: "invoice.client.name", description: "Client name", example: "Acme Corp" },
        { name: "invoice.client.address", description: "Client address", example: "123 Main St" },
        { name: "invoice.client.city", description: "Client city", example: "Algiers" },
        { name: "invoice.client.country", description: "Client country", example: "Algeria" },
        { name: "invoice.client.taxid", description: "Client tax ID", example: "TAX123456789" }
      ]
    },
    {
      name: "Items Loop",
      description: "Loop through invoice items",
      variables: [
        { 
          name: "{{#each invoice.items}}...{{/each}}", 
          description: "Loop through invoice items",
          example: `{{#each invoice.items}}
  <tr>
    <td>{{name}}</td>
    <td>{{quantity}}</td>
    <td>{{unit_price}}</td>
    <td>{{total}}</td>
  </tr>
{{/each}}`
        }
      ]
    }
  ];

  // Load a specific template
  const loadTemplate = async (templateId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      if (data) {
        setTemplateType(data.type);
        setTemplateHtml(data.template_html);
        setTemplateName(data.name || '');
        setIsDefault(!!data.is_default);
        setSelectedTemplateId(data.id);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast({
        title: 'Error',
        description: 'Failed to load template',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Default templates
  const getDefaultTemplate = (type: 'invoice' | 'proforma' | 'delivery_note') => {
    return `
      <div class="invoice-container">
        <div class="company-header"></div>
        <div class="invoice-details">
          <h1>${type === 'invoice' ? 'INVOICE' : type === 'proforma' ? 'PROFORMA INVOICE' : 'DELIVERY NOTE'}</h1>
          <div data-field="invoice.number">No: {{invoice.number}}</div>
          <div data-field="invoice.issuedate">Date: {{invoice.issuedate}}</div>
          ${type !== 'delivery_note' ? '<div data-field="invoice.duedate">Due: {{invoice.duedate}}</div>' : ''}
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
              ${type !== 'delivery_note' ? '<th>Unit Price</th>' : ''}
              ${type !== 'delivery_note' ? '<th>Tax</th>' : ''}
              ${type !== 'delivery_note' ? '<th>Total</th>' : ''}
            </tr>
          </thead>
          <tbody>
            {{#each invoice.items}}
            <tr>
              <td data-field="item.name">{{name}}</td>
              <td data-field="item.quantity">{{quantity}}</td>
              ${type !== 'delivery_note' ? '<td data-field="item.unit_price">{{unit_price}}</td>' : ''}
              ${type !== 'delivery_note' ? '<td data-field="item.tax_rate">{{tax_rate}}%</td>' : ''}
              ${type !== 'delivery_note' ? '<td data-field="item.total">{{total}}</td>' : ''}
            </tr>
            {{/each}}
          </tbody>
          ${type !== 'delivery_note' ? `
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
          ` : ''}
        </table>
        <div class="notes">
          <h3>Notes:</h3>
          <p data-field="invoice.notes">{{invoice.notes}}</p>
        </div>
        ${type === 'delivery_note' ? `
        <div class="signatures">
          <div class="signature-block">
            <p>livrée by:</p>
            <div class="signature-line"></div>
          </div>
          <div class="signature-block">
            <p>Received by:</p>
            <div class="signature-line"></div>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  };

  // Fetch sample documents for preview
  const fetchSampleDocuments = async () => {
    try {
      setLoading(true);
      let tableName: string;
      
      switch (templateType) {
        case 'invoice':
          tableName = 'final_invoices';
          break;
        case 'proforma':
          tableName = 'proforma_invoices';
          break;
        case 'delivery_note':
          tableName = 'delivery_notes';
          break;
      }

      const { data, error } = await supabase
        .from(tableName)
        .select('id, number, client:clientid (name)')
        .limit(10);

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedData = data.map(doc => ({
          id: doc.id,
          number: doc.number,
          clientName: doc.client?.name || 'Unknown Client'
        }));
        setSampleDocuments(formattedData);
        setSelectedDocumentId(formattedData[0].id);
      } else {
        setSampleDocuments([]);
        setSelectedDocumentId(null);
      }
    } catch (error) {
      console.error('Error fetching sample documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch sample documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Save template
  const saveTemplate = async () => {
    try {
      setLoading(true);

      if (!templateName.trim()) {
        toast({
          title: 'Error',
          description: 'Template name is required',
          variant: 'destructive',
        });
        return;
      }

      const templateData: PDFTemplate = {
        type: templateType,
        template_html: templateHtml,
        name: templateName,
        is_default: isDefault,
      };

      let result;

      if (id) {
        // Update existing template
        result = await supabase
          .from('pdf_templates')
          .update(templateData)
          .eq('id', id);
      } else {
        // Create new template
        result = await supabase
          .from('pdf_templates')
          .insert(templateData)
          .select('*')
          .single();
      }

      if (result.error) throw result.error;

      // If this is set as default, update other templates to non-default
      if (isDefault) {
        await supabase
          .from('pdf_templates')
          .update({ is_default: false })
          .eq('type', templateType)
          .neq('id', id || result.data?.id || '');
      }

      toast({
        title: 'Success',
        description: `Template ${id ? 'updated' : 'created'} successfully`,
      });

      // Navigate back to templates list
      navigate('/admin/pdf-templates');
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate preview using sample document data
  const generatePreview = async () => {
    if (!selectedDocumentId) {
      toast({
        title: 'Error',
        description: 'Please select a document for preview',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      let tableName, itemsTableName, itemsRelationKey;
      
      switch (templateType) {
        case 'invoice':
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
      }

      // Fetch document data
      const { data: documentData, error: documentError } = await supabase
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
        .eq('id', selectedDocumentId)
        .single();

      if (documentError) throw documentError;

      // Fetch document items
      const { data: items, error: itemsError } = await supabase
        .from(itemsTableName)
        .select('*')
        .eq(itemsRelationKey, selectedDocumentId);

      if (itemsError) throw itemsError;

      // Create document with items for preview
      const document = {
        ...documentData,
        items: items || []
      };

      // Create preview HTML using template and document data
      let html = templateHtml;
      
      // Replace simple fields
      html = html.replace(/{{invoice\.number}}/g, document.number || '');
      html = html.replace(/{{invoice\.issuedate}}/g, formatDate(document.issuedate) || '');
      html = html.replace(/{{invoice\.duedate}}/g, document.duedate ? formatDate(document.duedate) : '');
      html = html.replace(/{{invoice\.subtotal}}/g, formatCurrency(document.subtotal) || '0.00');
      html = html.replace(/{{invoice\.taxtotal}}/g, formatCurrency(document.taxtotal) || '0.00');
      html = html.replace(/{{invoice\.total}}/g, formatCurrency(document.total) || '0.00');
      html = html.replace(/{{invoice\.notes}}/g, document.notes || '');
      html = html.replace(/{{invoice\.status}}/g, document.status || '');

      // Replace client fields
      if (document.client) {
        html = html.replace(/{{invoice\.client\.name}}/g, document.client.name || '');
        html = html.replace(/{{invoice\.client\.address}}/g, document.client.address || '');
        html = html.replace(/{{invoice\.client\.city}}/g, document.client.city || '');
        html = html.replace(/{{invoice\.client\.country}}/g, document.client.country || '');
        html = html.replace(/{{invoice\.client\.taxid}}/g, document.client.taxid || '');
      }

      // Handle item loops
      const itemsLoopRegex = /{{#each invoice\.items}}([\s\S]*?){{\/each}}/g;
      const match = itemsLoopRegex.exec(html);
      
      if (match && match[1] && document.items) {
        const itemTemplate = match[1];
        let itemsHtml = '';
        
        document.items.forEach(item => {
          let itemHtml = itemTemplate;
          itemHtml = itemHtml.replace(/{{name}}/g, item.name || '');
          itemHtml = itemHtml.replace(/{{quantity}}/g, String(item.quantity) || '1');
          itemHtml = itemHtml.replace(/{{unit_price}}/g, formatCurrency(item.unitprice) || '0.00');
          itemHtml = itemHtml.replace(/{{tax_rate}}/g, item.taxrate?.toString() || '0');
          itemHtml = itemHtml.replace(/{{total}}/g, formatCurrency(item.total || (item.quantity * item.unitprice)) || '0.00');
          
          itemsHtml += itemHtml;
        });
        
        html = html.replace(itemsLoopRegex, itemsHtml);
      }

      setPreviewHtml(html);
      setPreviewMode(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate preview',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Format helpers
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '0.00';
    return amount.toLocaleString(undefined, { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const insertVariable = (variable: string) => {
    setTemplateHtml(prevHTML => prevHTML + `{{${variable}}}`);
  };

  const insertSnippet = (snippet: string) => {
    setTemplateHtml(prevHTML => prevHTML + snippet);
  };
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin/pdf-templates')}
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>
          <h1 className="text-3xl font-bold text-gray-800">
            {id ? 'Edit Template' : 'Create New Template'}
          </h1>
        </div>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setPreviewMode(!previewMode)}
            disabled={loading}
          >
            {previewMode ? <Code className="mr-2" /> : <Eye className="mr-2" />}
            {previewMode ? 'Edit Mode' : 'Preview'}
          </Button>
          <Button 
            variant="default" 
            onClick={saveTemplate}
            disabled={loading}
          >
            <Save className="mr-2" />
            Save Template
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {!previewMode ? (
          <>
            {/* Template Editor */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Template Editor</CardTitle>
                <CardDescription>Edit the HTML template for your PDF document</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="templateName">Template Name</Label>
                      <Input 
                        id="templateName"
                        placeholder="Enter template name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2 mt-7">
                      <Switch 
                        checked={isDefault} 
                        onCheckedChange={setIsDefault} 
                        id="default-template" 
                      />
                      <Label htmlFor="default-template">Set as Default Template</Label>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="templateType">Template Type</Label>
                    <Select 
                      value={templateType} 
                      onValueChange={(value: 'invoice' | 'proforma' | 'delivery_note') => setTemplateType(value)}
                      disabled={!!id}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select template type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="invoice">Invoice</SelectItem>
                        <SelectItem value="proforma">Proforma Invoice</SelectItem>
                        <SelectItem value="delivery_note">Delivery Note</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="template-editor">HTML Template</Label>
                    <Textarea
                      id="template-editor"
                      className="min-h-[400px] font-mono"
                      value={templateHtml}
                      onChange={(e) => setTemplateHtml(e.target.value)}
                      placeholder="Enter your template HTML here..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Template Variables and Helpers */}
            <Card>
              <CardHeader>
                <CardTitle>Template Variables</CardTitle>
                <CardDescription>Insert these variables into your template</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <Accordion type="single" collapsible className="w-full">
                    {variableCategories.map((category, index) => (
                      <AccordionItem key={index} value={`category-${index}`}>
                        <AccordionTrigger>{category.name}</AccordionTrigger>
                        <AccordionContent>
                          <p className="text-sm text-gray-500 mb-2">{category.description}</p>
                          <div className="space-y-2">
                            {category.variables.map((variable, vIndex) => (
                              <div key={vIndex} className="border rounded-md p-3">
                                <div className="flex justify-between items-center">
                                  <span className="font-mono text-sm text-blue-600">
                                    {variable.name}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (variable.name.includes('{{#each')) {
                                        insertSnippet(variable.example);
                                      } else {
                                        insertVariable(variable.name);
                                      }
                                    }}
                                  >
                                    Insert
                                  </Button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{variable.description}</p>
                                {variable.example && variable.name.includes('{{#each') && (
                                  <div className="mt-2">
                                    <Label className="text-xs">Example:</Label>
                                    <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto mt-1">
                                      {variable.example}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Preview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Template Preview</CardTitle>
                <CardDescription>Live preview of your template with real data</CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="border rounded-md p-6 bg-white min-h-[600px] overflow-auto"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                ></div>
              </CardContent>
            </Card>
            
            {/* Preview Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Preview Controls</CardTitle>
                <CardDescription>Select data to preview your template</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="documentSelect">Select Document</Label>
                  <Select 
                    value={selectedDocumentId || ''} 
                    onValueChange={setSelectedDocumentId}
                    disabled={sampleDocuments.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a document" />
                    </SelectTrigger>
                    <SelectContent>
                      {sampleDocuments.map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.number} - {doc.clientName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={generatePreview}
                  disabled={!selectedDocumentId || loading}
                >
                  <FileText className="mr-2" />
                  Generate Preview
                </Button>
                
                <Separator />
                
                <div>
                  <p className="text-sm text-gray-500 mb-2">Not seeing what you expect?</p>
                  <ul className="list-disc list-inside text-sm text-gray-500 space-y-1">
                    <li>Check your template syntax</li>
                    <li>Verify variable names are correct</li>
                    <li>Ensure HTML is properly formatted</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default PDFTemplateDesigner;
