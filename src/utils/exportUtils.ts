import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FinalInvoice, ProformaInvoice, DeliveryNote, Client } from '@/types';
import { fetchCompanyInfo } from '@/components/exports/CompanyInfoHeader';
import n2words from 'n2words';

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
const addHeader = async (pdf: jsPDF, documentType: string, documentNumber: string, status: string,  ) => {
  // Fetch company info from database
  const companyInfo = await fetchCompanyInfo();
  const logoBase64 = 'data:image/jpeg;base64,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'; // your base64 string
  
  // Colors
  const primaryColor = "#3B82F6";  // Blue
  const secondaryColor = "#6366F1"; // Indigo
  const accentColor = "#F59E0B";   // Amber
  const lightGray = "#F3F4F6";     // Light gray for background
  const darkGray = "#374151";      // Dark gray for text
  if (logoBase64) {
      try {
        // Add logo to the left of the company name
        pdf.addImage(logoBase64, 'PNG', 110, 14, 90, 35); // Adjust dimensions as needed
      } catch (error) {
        console.error('Error adding logo:', error);
      }
    }
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
  const docTypeXX = 80;
  const docTypeYY = 50;


  drawRoundedRect(pdf, docTypeXX, docTypeYY, docTypeWidth + 10, 14, 2, primaryColor);
  pdf.text([docTypeText, `        N°: ${documentNumber}`], docTypeXX + 5, docTypeYY + 7);
  
  return { yPos: docTypeYY+16, companyInfo };
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
    `${item.discount}%`,
    formatCurrency(item.totalExcl),
    formatCurrency(item.totalTax),
    formatCurrency(item.total)
  ]);
  
  // Add items table
  const tableY = addStylizedTable(
    pdf,
    ['No', 'Product', 'Qty', 'Unit', 'Unit Price', 'Tax %', 'Discount %', 'Total Excl.', 'Tax Amount', 'Total'],
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

// Helper function to open a new window with HTML content for printing
export const openPrintableInvoice = (
  invoiceType: 'final' | 'proforma',
  invoiceId: string
) => {
  // Open a new tab/window with the printable invoice route - using v3 version
  const url = `/print/v3/${invoiceType}/${invoiceId}`;
  window.open(url, '_blank');
};
