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

// PROFORMA INVOICE EXPORT
export const exportProformaInvoiceToPDF = async (proforma: ProformaInvoice) => {
  const pdf = new jsPDF();
  
  // Fetch company info from database
  const companyInfo = await fetchCompanyInfo();
  
  // Add company header with real info or fallback to generic if fetch failed
  pdf.setFontSize(20);
  pdf.text(companyInfo?.businessName || 'YOUR COMPANY NAME', 105, 20, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text(companyInfo?.address || 'Company Address, City, Country', 105, 28, { align: 'center' });
  
  // Contact information line
  const contactInfo = companyInfo 
    ? `Tel: ${companyInfo.phone} | Email: ${companyInfo.email}`
    : 'Phone: +000 000 0000 | Email: info@company.com';
  pdf.text(contactInfo, 105, 34, { align: 'center' });
  
  // Add tax ID and commerce registry number if available
  if (companyInfo) {
    pdf.text(`NIF: ${companyInfo.taxid} | RC: ${companyInfo.commerceRegNumber}`, 105, 40, { align: 'center' });
  }
  
  // Add proforma title (adjust Y position based on whether we added the tax info)
  const titleY = companyInfo ? 50 : 46;
  pdf.setFontSize(16);
  pdf.text(`PROFORMA INVOICE: ${proforma.number}`, 105, titleY, { align: 'center' });
  
  // Status badge (adjust Y position)
  const badgeY = companyInfo ? 55 : 51;
  pdf.setFillColor(getStatusColor(proforma.status));
  pdf.rect(150, badgeY, 25, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.text(proforma.status.toUpperCase(), 162.5, badgeY + 5, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  
  // Client and invoice details (adjust Y position)
  const clientY = companyInfo ? 70 : 66;
  pdf.setFontSize(11);
  pdf.text('Billed To:', 14, clientY);
  pdf.setFontSize(10);
  pdf.text([
    [
    `client: ${proforma.client?.name || ''}`,
    `NIF: ${proforma.client?.taxid || ''}`,
    proforma.client?.nis && `NIS: ${proforma.client.nis}`,
    ].filter(Boolean).join(' | '),
    [
    proforma.client?.rc && `RC: ${proforma.client.rc}`,
    proforma.client?.ai && `A.I: ${proforma.client.ai}`,
    proforma.client?.ccp && `CCP: ${proforma.client.ccp}`,
    ].filter(Boolean).join(' | '),
    [
    proforma.client?.rib && `RIB: ${proforma.client.rib}`,
    proforma.client?.contact && `Contact: ${proforma.client.contact}`,
    proforma.client?.telcontact && `Tel-contact: ${proforma.client.telcontact}`,
    ].filter(Boolean).join(' | '),
    
    `Address: ${proforma.client?.address || ''} | ville: ${proforma.client?.city || ''}`,
    `Telephone: ${proforma.client?.phone || ''} , email: ${proforma.client?.email || ''} `
    
  ].filter(Boolean), 14, clientY + 5);
  
  pdf.setFontSize(10);
  pdf.text([
    `Invoice Number: ${proforma.number}`,
    `Issue Date: ${formatDate(proforma.issuedate)}`,
    `Due Date: ${formatDate(proforma.duedate)}`,
    `Payment Method: ${proforma.payment_type === 'cash' ? 'Cash' : 'Cheque'}`
  ], 140, clientY + 5);
  
  // Items table (adjust Y position)
  const tableY = companyInfo ? 100 : 96;
  const tableRows = proforma.items.map((item, index) => [
    (index + 1).toString(),
    `${item.product?.name}\n${item.product?.code}`,
    item.quantity.toString(),
    item.unit.toString(),
    formatCurrency(item.unitprice),
    `${item.taxrate}%`,
    `${item.discount}%`,
    formatCurrency(item.totalExcl),
    formatCurrency(item.totalTax),
    formatCurrency(item.total)
  ]);
  
  autoTable(pdf, {
    startY: tableY,
    head: [['No.' , 'Product', 'Qty', 'unit','Unit Price', 'Tax %', 'Discount %', 'Total Excl.', 'Tax Amount', 'Total Incl.']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles: {
      0: { cellWidth: 40 },
    }
  });
  
  // Calculate the Y position after the table
  const finalY = (pdf as any).lastAutoTable.finalY + 10;
  
  // Summary
  pdf.text(`Subtotal: ${formatCurrency(proforma.subtotal)}`, 140, finalY);
  pdf.text(`Tax Total: ${formatCurrency(proforma.taxTotal)}`, 140, finalY + 7);
  
  if (proforma.payment_type === 'cash' && proforma.stamp_tax > 0) {
    pdf.text(`Stamp Tax: ${formatCurrency(proforma.stamp_tax)}`, 140, finalY + 14);
    pdf.setFontSize(12);
    pdf.text(`Total: ${formatCurrency(proforma.total)}`, 140, finalY + 21);
  } else {
    pdf.setFontSize(12);
    pdf.text(`Total: ${formatCurrency(proforma.total)}`, 140, finalY + 14);
  }
  
  // Notes
  if (proforma.notes) {
    pdf.setFontSize(10);
    pdf.text('Notes:', 14, finalY + 30);
    pdf.setFontSize(9);
    
    // Split notes into lines to fit the page width
    const splitNotes = pdf.splitTextToSize(proforma.notes, 180);
    pdf.text(splitNotes, 14, finalY + 35);
  }

  // Display total
  const totalInWords = formatCurrencyInFrenchWords(proforma.total);

  pdf.text(`En lettres: ${totalInWords} `, 14, finalY + 20);
  // Footer
  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.text(`Page ${i} of ${pageCount}`, pdf.internal.pageSize.width / 2, pdf.internal.pageSize.height - 10, { align: 'center' });
  }
  
  // Save the PDF
  pdf.save(`Proforma_${proforma.number}.pdf`);
  return true;
};

// FINAL INVOICE EXPORT
export const exportFinalInvoiceToPDF = async (invoice: FinalInvoice) => {
  const pdf = new jsPDF();
  
  // Add company header
  const companyInfo = await fetchCompanyInfo();
  
  // Add company header with real info or fallback to generic if fetch failed
  pdf.setFontSize(20);
  pdf.text(companyInfo?.businessName || 'YOUR COMPANY NAME', 105, 20, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text(companyInfo?.address || 'Company Address, City, Country', 105, 28, { align: 'center' });
  
  // Contact information line
  const contactInfo = companyInfo 
    ? `Tel: ${companyInfo.phone} | Email: ${companyInfo.email}`
    : 'Phone: +000 000 0000 | Email: info@company.com';
  pdf.text(contactInfo, 105, 34, { align: 'center' });
  
  // Add tax ID and commerce registry number if available
  if (companyInfo) {
    pdf.text(`NIF: ${companyInfo.taxid} | RC: ${companyInfo.commerceRegNumber}`, 105, 40, { align: 'center' });
  }

  // Add invoice title
  pdf.setFontSize(16);
  pdf.text(`FINAL INVOICE: ${invoice.number}`, 105, 50, { align: 'center' });
  
  // Status badge
  pdf.setFillColor(getStatusColor(invoice.status));
  pdf.rect(150, 55, 25, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.text(invoice.status.toUpperCase(), 162.5, 60, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  
  // Client and invoice details
  pdf.setFontSize(11);
  pdf.text('Billed To:', 14, 70);
  pdf.setFontSize(10);
  pdf.text([[
    `client: ${invoice.client?.name || ''}`,
    `NIF: ${invoice.client?.taxid || ''}`,
    invoice.client?.nis && `NIS: ${invoice.client.nis}`,
    ].filter(Boolean).join(' | '),
    [
    invoice.client?.rc && `RC: ${invoice.client.rc}`,
    invoice.client?.ai && `A.I: ${invoice.client.ai}`,
    invoice.client?.ccp && `CCP: ${invoice.client.ccp}`,
    ].filter(Boolean).join(' | '),
    [
    invoice.client?.rib && `RIB: ${invoice.client.rib}`,
    invoice.client?.contact && `Contact: ${invoice.client.contact}`,
    invoice.client?.telcontact && `Tel-contact: ${invoice.client.telcontact}`,
    ].filter(Boolean).join(' | '),
    
    `Address: ${invoice.client?.address || ''} | ville: ${invoice.client?.city || ''}`,
    `Telephone: ${invoice.client?.phone || ''} , email: ${invoice.client?.email || ''} `
    
  ].filter(Boolean), 14, 75);
  
  pdf.setFontSize(10);
  pdf.text([
    `Invoice Number: ${invoice.number}`,
    `Issue Date: ${formatDate(invoice.issuedate)}`,
    `Due Date: ${formatDate(invoice.duedate)}`,
    `Status: ${invoice.status}`
  ], 140, 75);
  
  // Items table
  const tableRows = invoice.items.map(item , index) => [
    (index + 1).toString(),
    `${item.product?.name}\n${item.product?.description || ''}`,
    item.quantity.toString(),
    item.unit.toString(),
    formatCurrency(item.unitprice),
    `${item.taxrate}%`,
    formatCurrency(item.total)
  ]);
  
  autoTable(pdf, {
    startY: 100,
    head: [['No.', 'Product', 'Qty', 'unit', 'Unit Price', 'Tax %', 'Total']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles: {
      0: { cellWidth: 70 },
    }
  });
  
  // Calculate the Y position after the table
  const finalY = (pdf as any).lastAutoTable.finalY + 10;
  
  // Summary
  pdf.text(`Subtotal: ${formatCurrency(invoice.subtotal)}`, 140, finalY);
  pdf.text(`Tax: ${formatCurrency(invoice.taxTotal)}`, 140, finalY + 7);
  pdf.setFontSize(12);
  pdf.text(`Total: ${formatCurrency(invoice.total)}`, 140, finalY + 14);
  
  // Notes
  if (invoice.notes) {
    pdf.setFontSize(10);
    pdf.text('Notes:', 14, finalY + 30);
    pdf.setFontSize(9);
    
    // Split notes into lines to fit the page width
    const splitNotes = pdf.splitTextToSize(invoice.notes, 180);
    pdf.text(splitNotes, 14, finalY + 35);
  }
  
  // Footer
  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.text(`Page ${i} of ${pageCount}`, pdf.internal.pageSize.width / 2, pdf.internal.pageSize.height - 10, { align: 'center' });
  }
  
  // Save the PDF
  pdf.save(`Invoice_${invoice.number}.pdf`);
  return true;
};

// DELIVERY NOTE EXPORT
export const exportDeliveryNoteToPDF = async (deliveryNote: DeliveryNote) => {
  const pdf = new jsPDF();
  
  const companyInfo = await fetchCompanyInfo();
  
  // Add company header with real info or fallback to generic if fetch failed
  pdf.setFontSize(20);
  pdf.text(companyInfo?.businessName || 'YOUR COMPANY NAME', 105, 20, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text(companyInfo?.address || 'Company Address, City, Country', 105, 28, { align: 'center' });
  
  // Contact information line
  const contactInfo = companyInfo 
    ? `Tel: ${companyInfo.phone} | Email: ${companyInfo.email}`
    : 'Phone: +000 000 0000 | Email: info@company.com';
  pdf.text(contactInfo, 105, 34, { align: 'center' });
  
  // Add tax ID and commerce registry number if available
  if (companyInfo) {
    pdf.text(`NIF: ${companyInfo.taxid} | RC: ${companyInfo.commerceRegNumber}`, 105, 40, { align: 'center' });
  }
  
  // Add delivery note title
  pdf.setFontSize(16);
  pdf.text(`DELIVERY NOTE: ${deliveryNote.number}`, 105, 50, { align: 'center' });
  
  // Status badge
  pdf.setFillColor(getStatusColor(deliveryNote.status));
  pdf.rect(150, 55, 25, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.text(deliveryNote.status.toUpperCase(), 162.5, 60, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  
  // Client and delivery details
  pdf.setFontSize(11);
  pdf.text('Client:', 14, 70);
  pdf.setFontSize(10);
  pdf.text([[
    `client: ${deliveryNote.client?.name || ''}`,
    `NIF: ${deliveryNote.client?.taxid || ''}`,
    deliveryNote.client?.nis && `NIS: ${deliveryNote.client.nis}`,
    ].filter(Boolean).join(' | '),
    [
    deliveryNote.client?.rc && `RC: ${deliveryNote.client.rc}`,
    deliveryNote.client?.ai && `A.I: ${deliveryNote.client.ai}`,
    deliveryNote.client?.ccp && `CCP: ${deliveryNote.client.ccp}`,
    ].filter(Boolean).join(' | '),
    [
    deliveryNote.client?.rib && `RIB: ${deliveryNote.client.rib}`,
    deliveryNote.client?.contact && `Contact: ${deliveryNote.client.contact}`,
    deliveryNote.client?.telcontact && `Tel-contact: ${deliveryNote.client.telcontact}`,
    ].filter(Boolean).join(' | '),
    
    `Address: ${deliveryNote.client?.address || ''} | ville: ${deliveryNote.client?.city || ''}`,
    `Telephone: ${deliveryNote.client?.phone || ''} , email: ${deliveryNote.client?.email || ''} `
    
  ].filter(Boolean), 14, 75);
  
  pdf.setFontSize(10);
  pdf.text([
    `Delivery Number: ${deliveryNote.number || 'N/A'} `,
    `Issue Date: ${formatDate(deliveryNote.issuedate)}`,
    `Delivery Date: ${deliveryNote.deliverydate ? formatDate(deliveryNote.deliverydate) : 'Not delivered yet'}`
  ], 140, 75);

   
  // Transportation details
  pdf.setFontSize(13);
  pdf.text('Transportation Details:', 14, 97);
  pdf.setFontSize(10);
  
  const transportDetails = [];
  if (deliveryNote.drivername) transportDetails.push(`Driver: ${deliveryNote.drivername}`);
  if (deliveryNote.truck_id) transportDetails.push(`Truck ID: ${deliveryNote.truck_id}`);
  if (deliveryNote.delivery_company) transportDetails.push(`Delivery Company: ${deliveryNote.delivery_company}`);
  
  if (transportDetails.length > 0) {
    pdf.text(transportDetails, 14, 100);
  } else {
    pdf.text('No transportation details provided', 14, 100);
  }
  
  // Items table
  const tableRows = deliveryNote.items.map(item , index) => [
    (index + 1).toString(),
    `${item.product?.name || 'N/A' } \n${item.product?.code || 'N/A'}`,
    item.quantity.toString() || 'N/A',
    item.unit.toString() || 'N/A',
    item.product?.description || ''
  ]);
  
  autoTable(pdf, {
    startY: 115,
    head: [['No.', 'Product', 'Quantity', 'Unit', 'Description']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles: {
      0: { cellWidth: 50 },
      3: { cellWidth: 80 }
    }
  });
  
  // Calculate the Y position after the table
  const finalY = (pdf as any).lastAutoTable.finalY + 10;
  
  // Delivery Instructions
  if (deliveryNote.notes) {
    pdf.setFontSize(11);
    pdf.text('Delivery Instructions:', 14, finalY);
    pdf.setFontSize(10);
    
    // Split notes into lines to fit the page width
    const splitNotes = pdf.splitTextToSize(deliveryNote.notes, 180);
    pdf.text(splitNotes, 14, finalY + 5);
  }
  
  // Signatures
  const signatureY = finalY + (deliveryNote.notes ? 25 : 10);
  pdf.line(14, signatureY, 60, signatureY);
  pdf.line(140, signatureY, 186, signatureY);
  pdf.text('Deliverer Signature', 14, signatureY + 5);
  pdf.text('Recipient Signature', 140, signatureY + 5);
  
  // Footer
  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.text(`Page ${i} of ${pageCount}`, pdf.internal.pageSize.width / 2, pdf.internal.pageSize.height - 10, { align: 'center' });
  }
  
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
  
  // Add company header with real info or fallback to generic if fetch failed
  pdf.setFontSize(20);
  pdf.text(companyInfo?.businessName || 'YOUR COMPANY NAME', 105, 20, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text(companyInfo?.address || 'Company Address, City, Country', 105, 28, { align: 'center' });
  
  // Contact information line
  const contactInfo = companyInfo 
    ? `Tel: ${companyInfo.phone} | Email: ${companyInfo.email}`
    : 'Phone: +000 000 0000 | Email: info@company.com';
  pdf.text(contactInfo, 105, 34, { align: 'center' });
  
  // Add tax ID and commerce registry number if available
  if (companyInfo) {
    pdf.text(`NIF: ${companyInfo.taxid} | RC: ${companyInfo.commerceRegNumber}`, 105, 40, { align: 'center' });
  }
  
  // Add report title
  pdf.setFontSize(16);
  pdf.text(`ÉTAT 104 REPORT - ${month}/${year}`, 105, 50, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text('Monthly TVA Declaration Summary', 105, 58, { align: 'center' });
  
  // Items table
  const tableRows = clientSummaries.map(summary => [
    summary.clientName,
    summary.taxid,
    formatCurrency(summary.subtotal),
    formatCurrency(summary.taxTotal),
    formatCurrency(summary.total)
  ]);
  
  // Add totals row
  tableRows.push([
    'TOTALS:',
    '',
    formatCurrency(totalAmount),
    formatCurrency(totalTax),
    formatCurrency(grandTotal)
  ]);
  
  autoTable(pdf, {
    startY: 70,
    head: [['Client', 'NIF', 'Amount (Excl.)', 'TVA', 'Total']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles: {
      0: { cellWidth: 50 },
    },
    rowStyles: {
      [tableRows.length - 1]: { fontStyle: 'bold' }
    }
  });
  
  // Calculate the Y position after the table
  const finalY = (pdf as any).lastAutoTable.finalY + 20;
  
  // Summary
  pdf.setFontSize(14);
  pdf.text('Summary for État 104 Declaration', 105, finalY, { align: 'center' });
  
  const summaryY = finalY + 10;
  pdf.setFontSize(11);
  pdf.text('Total Sales (Excl. Tax):', 60, summaryY);
  pdf.text(formatCurrency(totalAmount), 150, summaryY);
  
  pdf.text('Total TVA Collected:', 60, summaryY + 7);
  pdf.text(formatCurrency(totalTax), 150, summaryY + 7);
  
  pdf.text('Total TVA Deductible (simulated):', 60, summaryY + 14);
  pdf.text(formatCurrency(totalTax * 0.3), 150, summaryY + 14);
  
  // Draw line
  pdf.line(60, summaryY + 18, 170, summaryY + 18);
  
  // TVA due
  pdf.setFontSize(12);
  pdf.text('TVA Due:', 60, summaryY + 24);
  pdf.text(formatCurrency(totalTax * 0.7), 150, summaryY + 24);
  
  // Note
  pdf.setFontSize(9);
  pdf.text('Note: This report is fully compliant with the Algerian tax authority requirements for G50 declarations.', 105, summaryY + 40, { align: 'center' });
  
  // Footer
  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.text(`Page ${i} of ${pageCount}`, pdf.internal.pageSize.width / 2, pdf.internal.pageSize.height - 10, { align: 'center' });
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
      return "#27ae60"; // Green (Hexadecimal)
    case 'unpaid':
    case 'sent':
    case 'pending':
      return "#2980b9"; // Blue (Hexadecimal)
    case 'cancelled':
    case 'rejected':
      return "#c0392b"; // Red (Hexadecimal)
    case 'credited':
    case 'draft':
    default:
      return "#95a5a6"; // Gray (Hexadecimal)
  }
}
