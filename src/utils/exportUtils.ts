
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CompanyInfo } from '@/types/company';

interface ClientSummary {
  clientid: string;
  clientName: string;
  taxid: string;
  subtotal: number;
  taxTotal: number;
  total: number;
}

const addHeader = (doc: jsPDF, companyInfo: CompanyInfo | null) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Company name
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const companyName = companyInfo?.businessName || 'YOUR COMPANY NAME';
  doc.text(companyName, pageWidth / 2, 20, { align: 'center' });
  
  // Company address
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const address = companyInfo?.address || 'Company Address';
  doc.text(address, pageWidth / 2, 28, { align: 'center' });
  
  // Tax ID and Commerce Registration
  const taxId = companyInfo?.taxid || 'N/A';
  const commerceReg = companyInfo?.commerceRegNumber || 'N/A';
  doc.text(`NIF: ${taxId} | RC: ${commerceReg}`, pageWidth / 2, 36, { align: 'center' });
  
  // Phone and Email
  const phone = companyInfo?.phone || 'N/A';
  const email = companyInfo?.email || 'info@company.com';
  doc.text(`Tél: ${phone} | Email: ${email}`, pageWidth / 2, 44, { align: 'center' });
  
  return 60; // Return the Y position after header
};

export const exportEtat104ToPDF = (
  clientSummaries: ClientSummary[],
  year: string,
  month: string,
  totalAmount: number,
  totalTax: number,
  grandTotal: number,
  companyInfo: CompanyInfo | null = null
): boolean => {
  try {
    const doc = new jsPDF();
    
    // Add header with company info
    const startY = addHeader(doc, companyInfo);
    
    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`État 104 Report - ${month}/${year}`, 14, startY + 10);
    doc.text('Résumé mensuel de la déclaration de TVA', 14, startY + 20);
    
    // Table data
    const tableData = clientSummaries.map(summary => [
      summary.clientName,
      summary.taxid,
      summary.subtotal.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' }),
      summary.taxTotal.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' }),
      summary.total.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })
    ]);
    
    // Add totals row
    tableData.push([
      'TOTALS:',
      '',
      totalAmount.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' }),
      totalTax.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' }),
      grandTotal.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })
    ]);
    
    // Generate table
    autoTable(doc, {
      head: [['Client', 'NIF', 'Montant (Excl.)', 'TVA', 'Total']],
      body: tableData,
      startY: startY + 30,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] },
      footStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: 'bold' }
    });
    
    // Add summary section
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Résumé pour la déclaration de l\'État 104', 14, finalY);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ventes totales (hors taxes): ${totalAmount.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}`, 14, finalY + 10);
    doc.text(`Total TVA perçue: ${totalTax.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}`, 14, finalY + 20);
    doc.text(`Franchise TVA totale (simulée): ${(totalTax * 0.3).toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}`, 14, finalY + 30);
    doc.text(`TVA Due: ${(totalTax * 0.7).toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}`, 14, finalY + 40);
    
    // Save the PDF
    doc.save(`etat-104-${month}-${year}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};

export const exportEtat104ToExcel = (
  clientSummaries: ClientSummary[],
  year: string,
  month: string,
  totalAmount: number,
  totalTax: number,
  grandTotal: number,
  companyInfo: CompanyInfo | null = null
): boolean => {
  try {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Prepare data for Excel
    const excelData = [
      // Company header
      [companyInfo?.businessName || 'YOUR COMPANY NAME'],
      [companyInfo?.address || 'Company Address'],
      [`NIF: ${companyInfo?.taxid || 'N/A'} | RC: ${companyInfo?.commerceRegNumber || 'N/A'}`],
      [`Tél: ${companyInfo?.phone || 'N/A'} | Email: ${companyInfo?.email || 'info@company.com'}`],
      [],
      [`État 104 Report - ${month}/${year}`],
      ['Résumé mensuel de la déclaration de TVA'],
      [],
      // Table headers
      ['Client', 'NIF', 'Montant (Excl.)', 'TVA', 'Total'],
      // Client data
      ...clientSummaries.map(summary => [
        summary.clientName,
        summary.taxid,
        summary.subtotal,
        summary.taxTotal,
        summary.total
      ]),
      // Totals
      ['TOTALS:', '', totalAmount, totalTax, grandTotal],
      [],
      // Summary
      ['Résumé pour la déclaration de l\'État 104'],
      [`Ventes totales (hors taxes): ${totalAmount}`],
      [`Total TVA perçue: ${totalTax}`],
      [`Franchise TVA totale (simulée): ${totalTax * 0.3}`],
      [`TVA Due: ${totalTax * 0.7}`]
    ];
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'État 104');
    
    // Save the file
    XLSX.writeFile(wb, `etat-104-${month}-${year}.xlsx`);
    return true;
  } catch (error) {
    console.error('Error generating Excel:', error);
    return false;
  }
};
