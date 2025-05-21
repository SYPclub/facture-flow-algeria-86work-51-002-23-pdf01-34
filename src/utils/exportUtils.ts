import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FinalInvoice, ProformaInvoice, DeliveryNote, Client } from '@/types';
import { fetchCompanyInfo } from '@/components/exports/CompanyInfoHeader';
import n2words from 'n2words';
import { fabric } from 'fabric';

export const convertNumberToFrenchWords = (num: number): string => {
  return n2words(num, { lang: 'fr' });
};

function formatCurrencyInFrenchWords(amount: number): string {
  const euros = Math.floor(amount);
  const cents = Math.round((amount - euros) * 100);

  const eurosText = euros === 0 ? 'zéro euro' : `${n2words(euros, { lang: 'fr' })} ${euros > 1 ? 'Dinar Algerien' : 'Dinar Algerien'}`;
  const centsText =
    cents === 0
      ? ''
      : `et ${n2words(cents, { lang: 'fr' })} ${cents > 1 ? 'centimes' : 'centime'}`;

  return `${eurosText} ${centsText}`.trim();
}

// Helper for formatting currency
const formatCurrency = (amount: number) => {
  return amount.toLocaleString('fr-DZ', { 
    style: 'currency', 
    currency: 'DZD',
    minimumFractionDigits: 2
  });
};

// Helper for formatting dates
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-DZ');
};

// Draw rounded rectangle with fill and border
const drawRoundedRect = (pdf: jsPDF, x: number, y: number, width: number, height: number, radius: number, fill: string, stroke?: string) => {
  pdf.setFillColor(hexToRgb(fill).r, hexToRgb(fill).g, hexToRgb(fill).b);
  
  if (stroke) {
    pdf.setDrawColor(hexToRgb(stroke).r, hexToRgb(stroke).g, hexToRgb(stroke).b);
    pdf.setLineWidth(0.5);
  }
  
  // Draw rounded rectangle
  pdf.roundedRect(x, y, width, height, radius, radius, stroke ? 'FD' : 'F');
};

// Convert hex to RGB
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

// Add common header with logo and company info
const addHeader = async (pdf: jsPDF, documentType: string, documentNumber: string, status: string) => {
  // Fetch company info from database
  const companyInfo = await fetchCompanyInfo();
  
  // Colors
  const primaryColor = "#3B82F6";  // Blue
  const secondaryColor = "#6366F1"; // Indigo
  const accentColor = "#F59E0B";   // Amber
  const lightGray = "#F3F4F6";     // Light gray for background
  const darkGray = "#374151";      // Dark gray for text

  // Add colored header banner
  const gradientHeight = 12;
  pdf.setFillColor(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b);
  pdf.rect(0, 0, pdf.internal.pageSize.width, gradientHeight, 'F');
  
  // Add company name in large font with custom positioning
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(50, 50, 50);
  pdf.setFontSize(22);
  pdf.text(companyInfo?.businessName || 'YOUR COMPANY NAME', 14, 25);
  
  // Add smaller company details below the name
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(70, 70, 70);
  
  const companyDetails = [
    companyInfo?.address || 'Company Address',
    `NIF: ${companyInfo?.taxid || 'N/A'} | RC: ${companyInfo?.commerceRegNumber || 'N/A'}`,
    `Tél: ${companyInfo?.phone || 'N/A'} | Email: ${companyInfo?.email || 'info@company.com'}`
  ];
  
  pdf.text(companyDetails, 14, 30);
  
  // Add document type in a styled box on the right
  pdf.setFillColor(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  
  const docTypeText = documentType.toUpperCase();
  const docTypeWidth = pdf.getStringUnitWidth(docTypeText) * 12 / pdf.internal.scaleFactor;
  const docTypeX = pdf.internal.pageSize.width - 14 - docTypeWidth - 10; // 10 = padding
  
  drawRoundedRect(pdf, docTypeX, 20, docTypeWidth + 10, 10, 2, primaryColor);
  pdf.text(docTypeText, docTypeX + 5, 27);
  
  // Add document number below document type
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(70, 70, 70);
  pdf.setFontSize(10);
  pdf.text(`No: ${documentNumber}`, docTypeX, 35);
  
  // Add status badge with appropriate color
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  
  const statusColor = getStatusColor(status);
  const statusText = status.toUpperCase();
  const statusWidth = pdf.getStringUnitWidth(statusText) * 10 / pdf.internal.scaleFactor;
  
  drawRoundedRect(pdf, docTypeX, 38, statusWidth + 10, 8, 2, statusColor);
  pdf.setTextColor(255, 255, 255);
  pdf.text(statusText, docTypeX + 5, 44);
  
  return { yPos: 50, companyInfo };
};

// Check if we have a custom template
const getCustomTemplate = (type: 'invoice' | 'proforma' | 'delivery' | 'report'): any => {
  try {
    // Check localStorage for custom templates
    const savedTemplates = localStorage.getItem('pdfTemplates') 
      ? JSON.parse(localStorage.getItem('pdfTemplates') || '{}')
      : {};
      
    // Find a template of the requested type
    const templateId = Object.keys(savedTemplates).find(key => 
      savedTemplates[key].type === type && savedTemplates[key].data
    );
    
    if (templateId) {
      return savedTemplates[templateId].data;
    }
    
    return null;
  } catch (error) {
    console.error("Error loading template:", error);
    return null;
  }
};

// Render a template if available
const renderCustomTemplate = async (
  pdf: jsPDF, 
  templateData: any, 
  data: any,
  companyInfo: any
): Promise<boolean> => {
  if (!templateData) return false;
  
  try {
    // Create a temporary canvas to render the template
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 794; // A4 width at 96dpi
    tempCanvas.height = 1123; // A4 height at 96dpi
    
    const canvas = new fabric.Canvas(tempCanvas);
    
    // Load the template
    canvas.loadFromJSON(templateData, async () => {
      // Replace placeholders with actual data
      canvas.getObjects().forEach(obj => {
        if (obj.type === 'text' || obj.type === 'textbox') {
          const textObj = obj as fabric.Text;
          let text = textObj.text || '';
          
          // Replace placeholders with actual data
          text = text.replace(/\{\{client\.name\}\}/g, data.client?.name || '');
          text = text.replace(/\{\{client\.address\}\}/g, data.client?.address || '');
          text = text.replace(/\{\{client\.taxid\}\}/g, data.client?.taxid || '');
          text = text.replace(/\{\{client\.phone\}\}/g, data.client?.phone || '');
          
          text = text.replace(/\{\{number\}\}/g, data.number || '');
          text = text.replace(/\{\{date\}\}/g, data.issuedate ? formatDate(data.issuedate) : '');
          text = text.replace(/\{\{duedate\}\}/g, data.duedate ? formatDate(data.duedate) : '');
          
          text = text.replace(/\{\{subtotal\}\}/g, formatCurrency(data.subtotal || 0));
          text = text.replace(/\{\{taxTotal\}\}/g, formatCurrency(data.taxTotal || 0));
          text = text.replace(/\{\{total\}\}/g, formatCurrency(data.total || 0));
          text = text.replace(/\{\{total_in_words\}\}/g, formatCurrencyInFrenchWords(data.total || 0));
          
          textObj.set({ text });
        }
      });
      
      // Convert to image
      const dataURL = canvas.toDataURL({ format: 'png', quality: 1 });
      
      // Add to PDF
      pdf.addImage(dataURL, 'PNG', 0, 0, pdf.internal.pageSize.width, pdf.internal.pageSize.height);
      
      // Check if we need to add items table
      const hasItemsTable = canvas.getObjects().some(obj => {
        if (obj.type === 'text' || obj.type === 'textbox') {
          const textObj = obj as fabric.Text;
          return textObj.text?.includes('{{items_table}}');
        }
        return false;
      });
      
      // If items table placeholder exists, render the table
      if (hasItemsTable && data.items) {
        // Find placeholder position through a group that contains the text
        let tableY = 280; // Default position
        
        // Prepare table data based on document type
        let tableHeaders = [];
        let tableRows: any[] = [];
        
        if (data.items && Array.isArray(data.items)) {
          if (data.type === 'delivery') {
            tableHeaders = ['No', 'Product', 'Quantity', 'Unit', 'Description'];
            let counter = 0;
            tableRows = data.items.map((item: any) => [
              (++counter).toString(),
              `${item.product?.name || ''}\n${item.product?.code || ''}`,
              item.quantity.toString(),
              item.unit ? item.unit.toString() : '-',
              item.product?.description || ''
            ]);
          } else {
            tableHeaders = ['No', 'Product', 'Qty', 'Unit Price', 'Tax %', 'Total Excl.', 'Tax', 'Total'];
            let counter = 0;
            tableRows = data.items.map((item: any) => [
              (++counter).toString(),
              `${item.product?.name || ''}\n${item.product?.code || ''}`,
              item.quantity.toString(),
              formatCurrency(item.unitprice),
              `${item.taxrate}%`,
              formatCurrency(item.totalExcl),
              formatCurrency(item.totalTax),
              formatCurrency(item.total)
            ]);
          }
        }
        
        // Add items table
        addStylizedTable(pdf, tableHeaders, tableRows, tableY);
      }
    });
    
    return true;
  } catch (error) {
    console.error("Error rendering custom template:", error);
    return false;
  }
};

// Add client info section with styled design
const addClientInfo = (pdf: jsPDF, client: Client | undefined, invoiceDetails: any, startY: number) => {
  // Colors
  const lightBlue = "#EFF6FF";  // Light blue background
  const darkBlue = "#1E40AF";   // Dark blue for accent
  const darkGray = "#374151";   // Dark gray for text

  // Client section box with light blue background
  drawRoundedRect(pdf, 14, startY, 180, 40, 3, lightBlue);
  
  // Left side: Client info
  pdf.setTextColor(darkBlue);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("BILLED TO:", 20, startY + 8);
  
  // Client details
  pdf.setTextColor(darkGray);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  
  const clientInfo = [
    `${client?.name || 'Client Name'}`,
    `NIF: ${client?.taxid || 'N/A'}${client?.nis ? ` | NIS: ${client.nis}` : ''}`,
    `${client?.address || 'Address'}, ${client?.city || 'City'}`,
    `Tel: ${client?.phone || 'N/A'} | Email: ${client?.email || 'N/A'}`
  ];
  
  pdf.text(clientInfo, 20, startY + 15);
  
  // Right side: Invoice details
  pdf.setTextColor(darkBlue);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("DOCUMENT DETAILS:", 115, startY + 8);
  
  // Create array of invoice details
  pdf.setTextColor(darkGray);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  
  const details = [];
  
  if (invoiceDetails.issuedate) {
    details.push(`Issue Date: ${formatDate(invoiceDetails.issuedate)}`);
  }
  
  if (invoiceDetails.duedate) {
    details.push(`Due Date: ${formatDate(invoiceDetails.duedate)}`);
  }
  
  if (invoiceDetails.payment_type) {
    details.push(`Payment Method: ${invoiceDetails.payment_type === 'cash' ? 'Cash' : 'Cheque'}`);
  }
  
  if (invoiceDetails.deliverydate) {
    details.push(`Delivery Date: ${formatDate(invoiceDetails.deliverydate)}`);
  }
  
  pdf.text(details, 115, startY + 15);
  
  return startY + 45; // Return next Y position
};

// Helper for adding stylized table
const addStylizedTable = (pdf: jsPDF, headers: string[], rows: any[][], startY: number) => {
  const primaryColor = "#3B82F6";  // Blue
  const lightGray = "#F9FAFB";     // Very light gray for alternating rows
  
  autoTable(pdf, {
    startY: startY,
    head: [headers],
    body: rows,
    headStyles: {
      fillColor: [59, 130, 246], // primaryColor in RGB
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      lineWidth: 0.2,
      lineColor: [41, 98, 255]
    },
    bodyStyles: {
      fontSize: 9,
      lineWidth: 0.1,
      lineColor: [220, 220, 220]
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251] // lightGray in RGB
    },
    margin: { left: 14, right: 14 },
    didDrawPage: function(data) {
      // Add page numbers at the bottom of each page
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `Page ${pdf.internal.getNumberOfPages()}`,
        data.settings.margin.left,
        pdf.internal.pageSize.height - 10
      );
      
      // Add subtle footer line
      pdf.setDrawColor(220, 220, 220);
      pdf.line(
        data.settings.margin.left,
        pdf.internal.pageSize.height - 15,
        pdf.internal.pageSize.width - data.settings.margin.right,
        pdf.internal.pageSize.height - 15
      );
    }
  });
  
  return (pdf as any).lastAutoTable.finalY;
};

// Add totals section with styled design
const addTotals = (pdf: jsPDF, invoice: any, startY: number) => {
  const primaryColor = "#3B82F6";  // Blue
  const lightGray = "#F3F4F6";     // Light gray for background
  const darkGray = "#374151";      // Dark gray for text
  
  // Draw totals container with light gray background
  drawRoundedRect(pdf, pdf.internal.pageSize.width - 80, startY, 66, 50, 3, lightGray);
  
  // Add totals
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(darkGray);
  pdf.setFontSize(9);
  
  pdf.text("Subtotal:", pdf.internal.pageSize.width - 75, startY + 10);
  pdf.text("Tax:", pdf.internal.pageSize.width - 75, startY + 20);
  
  let nextY = startY + 30;
  
  // Add stamp tax line if applicable
  if (invoice.payment_type === 'cash' && invoice.stamp_tax > 0) {
    pdf.text("Stamp Tax:", pdf.internal.pageSize.width - 75, nextY);
    pdf.text(formatCurrency(invoice.stamp_tax), pdf.internal.pageSize.width - 20, nextY, { align: 'right' });
    nextY += 10;
  }
  
  // Draw separator line above total
  pdf.setDrawColor(hexToRgb(darkGray).r, hexToRgb(darkGray).g, hexToRgb(darkGray).b);
  pdf.line(pdf.internal.pageSize.width - 75, nextY - 2, pdf.internal.pageSize.width - 15, nextY - 2);
  
  // Add total amount in larger, bold font
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b);
  pdf.setFontSize(12);
  pdf.text("Total:", pdf.internal.pageSize.width - 75, nextY + 5);
  
  // Add the amount values aligned to the right
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(darkGray);
  pdf.setFontSize(9);
  pdf.text(formatCurrency(invoice.subtotal), pdf.internal.pageSize.width - 20, startY + 10, { align: 'right' });
  pdf.text(formatCurrency(invoice.taxTotal), pdf.internal.pageSize.width - 20, startY + 20, { align: 'right' });
  
  // Add total with primary color
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b);
  pdf.setFontSize(12);
  pdf.text(formatCurrency(invoice.total), pdf.internal.pageSize.width - 20, nextY + 5, { align: 'right' });
  
  return nextY + 15;
};

// Add notes section with styled design
const addNotes = (pdf: jsPDF, notes: string | undefined, startY: number) => {
  if (!notes) return startY;
  
  const lightYellow = "#FEF9C3";  // Light yellow for note background
  const darkBrown = "#78350F";    // Dark brown for note text
  
  // Notes title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(darkBrown);
  pdf.text("NOTES:", 14, startY + 5);
  
  // Notes content
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  
  // Draw light yellow background
  drawRoundedRect(pdf, 14, startY + 7, 180, 20, 3, lightYellow);
  
  // Split notes into lines to fit the page width
  const splitNotes = pdf.splitTextToSize(notes, 170);
  pdf.text(splitNotes, 19, startY + 15);
  
  return startY + 30;
};

// Add amount in words section
const addAmountInWords = (pdf: jsPDF, amount: number, startY: number) => {
  const lightGreen = "#ECFCCB";  // Light green background
  const darkGreen = "#3F6212";   // Dark green for text
  
  // Draw background
  drawRoundedRect(pdf, 14, startY, 180, 12, 3, lightGreen);
  
  // Add text
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(9);
  pdf.setTextColor(darkGreen);
  
  const totalInWords = formatCurrencyInFrenchWords(amount);
  pdf.text(`Montant en lettres: ${totalInWords}`, 19, startY + 7);
  
  return startY + 15;
};

// Add footer with thank you message
const addFooter = (pdf: jsPDF) => {
  const accentColor = "#F59E0B";   // Amber color for thank you
  
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(hexToRgb(accentColor).r, hexToRgb(accentColor).g, hexToRgb(accentColor).b);
  pdf.text("Nous vous remercions pour votre confiance!", 105, pdf.internal.pageSize.height - 20, { align: 'center' });
};

// PROFORMA INVOICE EXPORT
export const exportProformaInvoiceToPDF = async (proforma: ProformaInvoice) => {
  const pdf = new jsPDF();
  
  // First try to use a custom template
  const customTemplate = getCustomTemplate('proforma');
  
  if (customTemplate) {
    // Add header first for company info
    const { companyInfo } = await addHeader(pdf, "PROFORMA INVOICE", proforma.number, proforma.status);
    
    // Try to render using custom template
    const customRendered = await renderCustomTemplate(pdf, customTemplate, {
      ...proforma, 
      type: 'proforma',
      companyInfo
    }, companyInfo);
    
    if (customRendered) {
      // Save the PDF and exit
      pdf.save(`Proforma_${proforma.number}.pdf`);
      return true;
    }
  }
  
  // Fallback to default template
  
  // Add header
  const { yPos } = await addHeader(pdf, "PROFORMA INVOICE", proforma.number, proforma.status);
  
  // Add client info section
  const clientY = addClientInfo(pdf, proforma.client, proforma, yPos);
  
  // Prepare items table data
  let counter = 0;
  const tableRows = proforma.items.map(item => [
    (++counter).toString(),
    `${item.product?.name || ''}\n${item.product?.code || ''}`,
    item.quantity.toString(),
    item.unit ? item.unit.toString() : '-',
    formatCurrency(item.unitprice),
    `${item.taxrate}%`,
    formatCurrency(item.totalExcl),
    formatCurrency(item.totalTax),
    formatCurrency(item.total)
  ]);
  
  // Add items table
  const tableY = addStylizedTable(
    pdf,
    ['No', 'Product', 'Qty', 'Unit', 'Unit Price', 'Tax %', 'Total Excl.', 'Tax Amount', 'Total'],
    tableRows,
    clientY
  );
  
  // Add totals section
  const totalsY = addTotals(pdf, proforma, tableY + 10);
  
  // Add amount in words
  const wordsY = addAmountInWords(pdf, proforma.total, totalsY);
  
  // Add notes if present
  const notesY = addNotes(pdf, proforma.notes, wordsY);
  
  // Add footer
  addFooter(pdf);
  
  // Save the PDF
  pdf.save(`Proforma_${proforma.number}.pdf`);
  return true;
};

// FINAL INVOICE EXPORT
export const exportFinalInvoiceToPDF = async (invoice: FinalInvoice) => {
  const pdf = new jsPDF();
  
  // First try to use a custom template
  const customTemplate = getCustomTemplate('invoice');
  
  if (customTemplate) {
    // Add header first for company info
    const { companyInfo } = await addHeader(pdf, "INVOICE", invoice.number, invoice.status);
    
    // Try to render using custom template
    const customRendered = await renderCustomTemplate(pdf, customTemplate, {
      ...invoice, 
      type: 'invoice',
      companyInfo
    }, companyInfo);
    
    if (customRendered) {
      // Save the PDF and exit
      pdf.save(`Invoice_${invoice.number}.pdf`);
      return true;
    }
  }
  
  // Fallback to default template
  
  // Add header
  const { yPos } = await addHeader(pdf, "INVOICE", invoice.number, invoice.status);
  
  // Add client info section
  const clientY = addClientInfo(pdf, invoice.client, invoice, yPos);
  
  // Prepare items table data
  let counter = 0;
  const tableRows = invoice.items.map(item => [
    (++counter).toString(),
    `${item.product?.name || ''}\n${item.product?.code || ''}`,
    item.quantity.toString(),
    item.unit ? item.unit.toString() : '-',
    formatCurrency(item.unitprice),
    `${item.taxrate}%`,
    formatCurrency(item.totalExcl),
    formatCurrency(item.totalTax),
    formatCurrency(item.total)
  ]);
  
  // Add items table
  const tableY = addStylizedTable(
    pdf,
    ['No', 'Product', 'Qty', 'Unit', 'Unit Price', 'Tax %', 'Total Excl.', 'Tax Amount', 'Total'],
    tableRows,
    clientY
  );
  
  // Add totals section
  const totalsY = addTotals(pdf, invoice, tableY + 10);
  
  // Add amount in words
  const wordsY = addAmountInWords(pdf, invoice.total, totalsY);
  
  // Add notes if present
  const notesY = addNotes(pdf, invoice.notes, wordsY);
  
  // Add payments section if any
  let paymentsY = notesY;
  
  if (invoice.payments && invoice.payments.length > 0) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(59, 130, 246); // primaryColor
    pdf.text("PAYMENT HISTORY:", 14, paymentsY);
    
    const paymentRows = invoice.payments.map(payment => [
      formatDate(payment.payment_date),
      payment.paymentMethod,
      payment.reference || 'N/A',
      formatCurrency(payment.amount)
    ]);
    
    paymentsY = addStylizedTable(
      pdf,
      ['Date', 'Method', 'Reference', 'Amount'],
      paymentRows,
      paymentsY + 5
    );
    
    paymentsY += 10;
  }
  
  // Add footer
  addFooter(pdf);
  
  // Save the PDF
  pdf.save(`Invoice_${invoice.number}.pdf`);
  return true;
};

// DELIVERY NOTE EXPORT
export const exportDeliveryNoteToPDF = async (deliveryNote: DeliveryNote) => {
  const pdf = new jsPDF();
  
  // First try to use a custom template
  const customTemplate = getCustomTemplate('delivery');
  
  if (customTemplate) {
    // Add header first for company info
    const { companyInfo } = await addHeader(pdf, "DELIVERY NOTE", deliveryNote.number, deliveryNote.status);
    
    // Try to render using custom template
    const customRendered = await renderCustomTemplate(pdf, customTemplate, {
      ...deliveryNote, 
      type: 'delivery',
      companyInfo
    }, companyInfo);
    
    if (customRendered) {
      // Save the PDF and exit
      pdf.save(`DeliveryNote_${deliveryNote.number}.pdf`);
      return true;
    }
  }
  
  // Fallback to default template
  
  // Add header
  const { yPos } = await addHeader(pdf, "DELIVERY NOTE", deliveryNote.number, deliveryNote.status);
  
  // Add client info section
  let nextY = addClientInfo(pdf, deliveryNote.client, deliveryNote, yPos);
  
  // Add transportation details in a styled box
  const primaryColor = "#3B82F6";  // Blue
  const lightPurple = "#EEF2FF";   // Light purple for background
  const darkPurple = "#4F46E5";    // Dark purple for text
  
  if (deliveryNote.drivername || deliveryNote.truck_id || deliveryNote.delivery_company) {
    // Draw background box
    drawRoundedRect(pdf, 14, nextY, 180, 20, 3, lightPurple);
    
    // Add title
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(darkPurple);
    pdf.text("TRANSPORTATION DETAILS:", 20, nextY + 7);
    
    // Add details
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    
    const transportDetails = [];
    
    if (deliveryNote.drivername) {
      transportDetails.push(`Driver: ${deliveryNote.drivername}`);
    }
    
    if (deliveryNote.truck_id) {
      transportDetails.push(`Truck ID: ${deliveryNote.truck_id}`);
    }
    
    if (deliveryNote.delivery_company) {
      transportDetails.push(`Delivery Company: ${deliveryNote.delivery_company}`);
    }
    
    pdf.text(transportDetails.join(' | '), 20, nextY + 15);
    
    nextY += 25;
  }
  
  // Prepare items table data
  let counter = 0;
  const tableRows = deliveryNote.items.map(item => [
    (++counter).toString(),
    `${item.product?.name || 'N/A'}\n${item.product?.code || 'N/A'}`,
    item.quantity.toString(),
    item.unit ? item.unit.toString() : 'N/A',
    item.product?.description || ''
  ]);
  
  // Add items table
  const tableY = addStylizedTable(
    pdf,
    ['No', 'Product', 'Quantity', 'Unit', 'Description'],
    tableRows,
    nextY
  );
  
  // Add notes if present
  const notesY = addNotes(pdf, deliveryNote.notes, tableY + 10);
  
  // Add signatures section
  const signatureY = notesY + 10;
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(59, 130, 246); // primaryColor
  
  // Draw signature lines
  pdf.line(30, signatureY + 20, 80, signatureY + 20);
  pdf.line(130, signatureY + 20, 180, signatureY + 20);
  
  pdf.text("Deliverer Signature", 30, signatureY + 10);
  pdf.text("Recipient Signature", 130, signatureY + 10);
  
  // Add footer
  addFooter(pdf);
  
  // Save the PDF
  pdf.save(`DeliveryNote_${deliveryNote.number}.pdf`);
  return true;
};

// ETAT 104 REPORT EXPORTS
interface ClientSummary {
  clientid: string;
  clientName: string;
  taxid: string;
  subtotal: number;
  taxTotal: number;
  total: number;
}

export const exportEtat104ToPDF = async (
  clientSummaries: ClientSummary[], 
  year: string, 
  month: string,
  totalAmount: number,
  totalTax: number,
  grandTotal: number
) => {
  const pdf = new jsPDF();
  
  // First try to use a custom template
  const customTemplate = getCustomTemplate('report');
  
  if (customTemplate) {
    // Try to render using custom template
    const { companyInfo } = await addHeader(pdf, "REPORT", `${month}/${year}`, "Generated");
    
    const customRendered = await renderCustomTemplate(pdf, customTemplate, {
      clientSummaries,
      year,
      month,
      totalAmount,
      totalTax,
      grandTotal,
      type: 'report',
      companyInfo
    }, companyInfo);
    
    if (customRendered) {
      // Save the PDF and exit
      pdf.save(`Etat104_${month}_${year}.pdf`);
      return true;
    }
  }
  
  // Fallback to default template
  
  // Add company header
  const companyInfo = await fetchCompanyInfo();
  
  // Define colors for report
  const primaryColor = "#3B82F6";  // Blue
  const secondaryColor = "#6366F1"; // Indigo
  
  // Add colored header banner
  const gradientHeight = 15;
  pdf.setFillColor(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b);
  pdf.rect(0, 0, pdf.internal.pageSize.width, gradientHeight, 'F');
  
  // Add company name
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(50, 50, 50);
  pdf.setFontSize(18);
  pdf.text(companyInfo?.businessName || 'YOUR COMPANY NAME', 105, 25, { align: 'center' });
  
  // Add company details
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(70, 70, 70);
  
  const companyDetails = [
    companyInfo?.address || 'Company Address',
    `NIF: ${companyInfo?.taxid || 'N/A'} | RC: ${companyInfo?.commerceRegNumber || 'N/A'}`,
    `Tel: ${companyInfo?.phone || 'N/A'} | Email: ${companyInfo?.email || 'info@company.com'}`
  ];
  
  pdf.text(companyDetails, 105, 30, { align: 'center' });
  
  // Add report title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b);
  pdf.text(`ÉTAT 104 REPORT - ${month}/${year}`, 105, 50, { align: 'center' });
  
  // Add report subtitle
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(12);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Monthly TVA Declaration Summary', 105, 58, { align: 'center' });
  
  // Prepare table data
  const tableRows = clientSummaries.map(summary => [
    summary.clientName,
    summary.taxid,
    formatCurrency(summary.subtotal),
    formatCurrency(summary.taxTotal),
    formatCurrency(summary.total)
  ]);
  
  // Add totals row with bold styling
  tableRows.push([
    'TOTALS',
    '',
    formatCurrency(totalAmount),
    formatCurrency(totalTax),
    formatCurrency(grandTotal)
  ]);
  
  // Add data table
  const tableY = addStylizedTable(
    pdf,
    ['Client', 'NIF', 'Amount (Excl.)', 'TVA', 'Total'],
    tableRows,
    70
  );
  
  // Add summary section with styled box
  const summaryY = tableY + 20;
  
  // Draw summary box with light background
  drawRoundedRect(pdf, 40, summaryY, 130, 60, 3, "#F0F9FF"); // Light blue background
  
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b);
  pdf.text('Summary for État 104 Declaration', 105, summaryY + 10, { align: 'center' });
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(70, 70, 70);
  
  const detailsY = summaryY + 20;
  pdf.text('Total Sales (Excl. Tax):', 60, detailsY);
  pdf.text('Total TVA Collected:', 60, detailsY + 10);
  pdf.text('Total TVA Deductible (simulated):', 60, detailsY + 20);
  
  // Draw separator line
  pdf.setDrawColor(200, 200, 200);
  pdf.line(60, detailsY + 25, 150, detailsY + 25);
  
  // TVA due
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b);
  pdf.text('TVA Due:', 60, detailsY + 35);
  
  // Add amount values
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(70, 70, 70);
  pdf.text(formatCurrency(totalAmount), 150, detailsY, { align: 'right' });
  pdf.text(formatCurrency(totalTax), 150, detailsY + 10, { align: 'right' });
  pdf.text(formatCurrency(totalTax * 0.3), 150, detailsY + 20, { align: 'right' });
  
  // Add TVA due amount
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b);
  pdf.text(formatCurrency(totalTax * 0.7), 150, detailsY + 35, { align: 'right' });
  
  // Add compliance note
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Note: This report is fully compliant with the Algerian tax authority requirements for G50 declarations.', 
    105, 
    summaryY + 70, 
    { align: 'center' }
  );
  
  // Add date of generation
  const today = new Date().toLocaleDateString('fr-DZ');
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`Generated on: ${today}`, 105, pdf.internal.pageSize.height - 20, { align: 'center' });
  
  // Add page numbers
  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Page ${i} of ${pageCount}`, 105, pdf.internal.pageSize.height - 10, { align: 'center' });
  }
  
  // Save the PDF
  pdf.save(`Etat104_${month}_${year}.pdf`);
  return true;
};

export const exportEtat104ToExcel = (
  clientSummaries: ClientSummary[], 
  year: string, 
  month: string,
  totalAmount: number,
  totalTax: number,
  grandTotal: number
) => {
  // Prepare data for Excel
  const data = clientSummaries.map(summary => ({
    'Client': summary.clientName,
    'NIF': summary.taxid,
    'Amount (Excl.)': summary.subtotal,
    'TVA': summary.taxTotal,
    'Total': summary.total
  }));
  
  // Add totals row
  data.push({
    'Client': 'TOTALS:',
    'NIF': '',
    'Amount (Excl.)': totalAmount,
    'TVA': totalTax,
    'Total': grandTotal
  });
  
  // Create summary sheet data
  const summaryData = [
    { 'Summary': 'Total Sales (Excl. Tax):', 'Value': totalAmount },
    { 'Summary': 'Total TVA Collected:', 'Value': totalTax },
    { 'Summary': 'Total TVA Deductible (simulated):', 'Value': totalTax * 0.3 },
    { 'Summary': 'TVA Due:', 'Value': totalTax * 0.7 }
  ];
  
  // Create workbook and worksheets
  const wb = XLSX.utils.book_new();
  
  // Main data sheet
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'État 104 Data');
  
  // Summary sheet
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
  
  // Save Excel file
  XLSX.writeFile(wb, `Etat104_${month}_${year}.xlsx`);
  return true;
};

// Helper function for status colors
function getStatusColor(status: string): string {
  switch (status) {
    case 'paid':
    case 'approved':
    case 'delivered':
      return "#22C55E"; // Green
    case 'unpaid':
    case 'sent':
    case 'pending':
      return "#3B82F6"; // Blue
    case 'cancelled':
    case 'rejected':
      return "#EF4444"; // Red
    case 'credited':
    case 'draft':
    default:
      return "#94A3B8"; // Gray
  }
}

// Save the templates to localStorage
export const saveTemplate = (
  templateId: string,
  templateName: string,
  templateType: string,
  templateData: any
): boolean => {
  try {
    // Get existing templates or initialize
    const savedTemplates = localStorage.getItem('pdfTemplates') 
      ? JSON.parse(localStorage.getItem('pdfTemplates') || '{}')
      : {};
    
    // Save the template
    savedTemplates[templateId] = {
      name: templateName,
      type: templateType,
      data: templateData,
    };
    
    localStorage.setItem('pdfTemplates', JSON.stringify(savedTemplates));
    return true;
  } catch (error) {
    console.error("Error saving template:", error);
    return false;
  }
};

// Get saved templates
export const getSavedTemplates = (): { 
  id: string; 
  name: string; 
  type: string;
}[] => {
  try {
    const savedTemplates = localStorage.getItem('pdfTemplates') 
      ? JSON.parse(localStorage.getItem('pdfTemplates') || '{}')
      : {};
    
    return Object.keys(savedTemplates).map(key => ({
      id: key,
      name: savedTemplates[key].name || 'Unnamed Template',
      type: savedTemplates[key].type || 'invoice',
    }));
  } catch (error) {
    console.error("Error getting templates:", error);
    return [];
  }
};

// Delete template
export const deleteTemplate = (templateId: string): boolean => {
  try {
    const savedTemplates = localStorage.getItem('pdfTemplates') 
      ? JSON.parse(localStorage.getItem('pdfTemplates') || '{}')
      : {};
    
    if (savedTemplates[templateId]) {
      delete savedTemplates[templateId];
      localStorage.setItem('pdfTemplates', JSON.stringify(savedTemplates));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error deleting template:", error);
    return false;
  }
}
