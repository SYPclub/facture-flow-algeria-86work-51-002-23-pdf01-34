import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { mockDataService } from '@/services/mockDataService';
import { FinalInvoice, Client } from '@/types';
import { FileSpreadsheet, printer, Download } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { exportEtat104ToPDF, exportEtat104ToExcel } from '@/utils/exportUtils';

interface ClientSummary {
  clientid: string;
  clientName: string;
  taxid: string;
  subtotal: number;
  taxTotal: number;
  total: number;
}

const Etat104Page = () => {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  
  const { data: finalInvoices = [], isLoading } = useQuery({
    queryKey: ['finalInvoices'],
    queryFn: () => mockDataService.getFinalInvoices(),
  });
  
  const filteredInvoices = finalInvoices.filter(invoice => {
    const invoiceDate = new Date(invoice.issuedate);
    return (
      invoiceDate.getFullYear() === parseInt(year) && 
      invoiceDate.getMonth() + 1 === parseInt(month)
    );
  });
  
  const clientSummaries: ClientSummary[] = React.useMemo(() => {
    const summaryMap = new Map<string, ClientSummary>();
    
    filteredInvoices.forEach(invoice => {
      if (!invoice.client) return;
      
      const clientid = invoice.client.id;
      
      if (summaryMap.has(clientid)) {
        const existing = summaryMap.get(clientid)!;
        summaryMap.set(clientid, {
          ...existing,
          subtotal: existing.subtotal + invoice.subtotal,
          taxTotal: existing.taxTotal + invoice.taxTotal,
          total: existing.total + invoice.total,
        });
      } else {
        summaryMap.set(clientid, {
          clientid,
          clientName: invoice.client.name,
          taxid: invoice.client.taxid,
          subtotal: invoice.subtotal,
          taxTotal: invoice.taxTotal,
          total: invoice.total,
        });
      }
    });
    
    return Array.from(summaryMap.values());
  }, [filteredInvoices]);
  
  const totalAmount = clientSummaries.reduce((sum, client) => sum + client.subtotal, 0);
  const totalTax = clientSummaries.reduce((sum, client) => sum + client.taxTotal, 0);
  const grandTotal = clientSummaries.reduce((sum, client) => sum + client.total, 0);
  
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-DZ', { 
      style: 'currency', 
      currency: 'DZD',
      minimumFractionDigits: 2
    });
  };
  
  const exportToPDF = () => {
    try {
      const result = exportEtat104ToPDF(
        clientSummaries,
        year,
        month,
        totalAmount,
        totalTax,
        grandTotal
      );
      
      if (result) {
        toast({
          title: 'PDF Generated',
          description: 'État 104 report has been exported to PDF'
        });
      }
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Failed to generate PDF. Please try again.'
      });
    }
  };
  
  const exportToExcel = () => {
    try {
      const result = exportEtat104ToExcel(
        clientSummaries,
        year,
        month,
        totalAmount,
        totalTax,
        grandTotal
      );
      
      if (result) {
        toast({
          title: 'Excel Generated',
          description: 'État 104 report has been exported to Excel'
        });
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Failed to generate Excel file. Please try again.'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">État 104 Report</h1>
          <p className="text-muted-foreground">
            Generate your monthly tax declaration summary
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToPDF}>
            <printer className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={exportToExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
          <CardDescription>Select the period for the État 104 report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:max-w-md">
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="01">January</SelectItem>
                  <SelectItem value="02">February</SelectItem>
                  <SelectItem value="03">March</SelectItem>
                  <SelectItem value="04">April</SelectItem>
                  <SelectItem value="05">May</SelectItem>
                  <SelectItem value="06">June</SelectItem>
                  <SelectItem value="07">July</SelectItem>
                  <SelectItem value="08">August</SelectItem>
                  <SelectItem value="09">September</SelectItem>
                  <SelectItem value="10">October</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">December</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button className="mt-4" onClick={() => console.log('Generate report')}>
            Generate Report
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>État 104 Report - {month}/{year}</CardTitle>
          <CardDescription>Monthly TVA Declaration Summary</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : clientSummaries.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-center text-muted-foreground">
                No invoice data available for this period
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>NIF</TableHead>
                      <TableHead className="text-right">Amount (Excl.)</TableHead>
                      <TableHead className="text-right">TVA</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientSummaries.map((summary) => (
                      <TableRow key={summary.clientid}>
                        <TableCell>{summary.clientName}</TableCell>
                        <TableCell>{summary.taxid}</TableCell>
                        <TableCell className="text-right">{formatCurrency(summary.subtotal)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(summary.taxTotal)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(summary.total)}</TableCell>
                      </TableRow>
                    ))}
                    
                    <TableRow className="font-medium">
                      <TableCell colSpan={2} className="text-right">
                        TOTALS:
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(totalAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalTax)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(grandTotal)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              
              <div className="rounded-md border p-4">
                <h3 className="mb-3 font-medium">Summary for État 104 Declaration</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-2">
                    <span>Total Sales (Excl. Tax):</span>
                    <span className="font-medium">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <span>Total TVA Collected:</span>
                    <span className="font-medium">{formatCurrency(totalTax)}</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <span>Total TVA Deductible (simulated):</span>
                    <span className="font-medium">{formatCurrency(totalTax * 0.3)}</span>
                  </div>
                  <div className="grid grid-cols-2 border-t pt-2">
                    <span>TVA Due:</span>
                    <span className="font-medium">{formatCurrency(totalTax * 0.7)}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>Note: In a production environment, this report would be fully compliant with the Algerian tax authority requirements for G50 declarations.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Etat104Page;
