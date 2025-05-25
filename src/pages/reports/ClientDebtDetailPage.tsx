
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronRight } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const statusColors = {
  unpaid: 'bg-red-100 text-red-800',
  partially_paid: 'bg-amber-100 text-amber-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  credited: 'bg-blue-100 text-blue-800',
};

const ClientDebtDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  
  const { data: clientDetails, isLoading } = useQuery({
    queryKey: ['client-debt-detail', id],
    queryFn: async () => {
      // Get client info
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      
      if (clientError) throw clientError;
      
      // Get client invoices with payment details
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('final_invoices')
        .select(`
          *,
          invoice_payments(*)
        `)
        .eq('clientid', id)
        .order('issuedate', { ascending: false });
      
      if (invoicesError) throw invoicesError;
      
      // Calculate totals
      const totalInvoiced = invoicesData.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const totalPaid = invoicesData.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
      const totalDebt = invoicesData.reduce((sum, inv) => sum + (inv.client_debt || 0), 0);
      
      return {
        client: clientData,
        invoices: invoicesData,
        summary: {
          totalInvoiced,
          totalPaid,
          totalDebt,
          invoiceCount: invoicesData.length,
          unpaidCount: invoicesData.filter(inv => (inv.client_debt || 0) > 0).length
        }
      };
    },
    enabled: !!id
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!clientDetails) {
    return (
      <div className="container mx-auto py-6">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold">Client non trouvé</h2>
          <p className="mt-2 text-muted-foreground">
            Les informations demandées sur le client n'ont pas été trouvées.
          </p>
          <Button asChild className="mt-4">
            <Link to="/reports/clients-debt">Retour aux clients</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const { client, invoices, summary } = clientDetails;

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" asChild size="sm">
          <Link to="/reports/clients-debt">
            <ChevronRight className="h-4 w-4 mr-2 rotate-180" /> Retour à la dette des clients
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <p className="text-muted-foreground">NIF: {client.taxid}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total facturé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {summary.totalInvoiced.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total payé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {summary.totalPaid.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total de la dette</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {summary.totalDebt.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Historique des factures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro de facture.</TableHead>
                  <TableHead>Date d'émission</TableHead>
                  <TableHead>Date d'échéance</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Payé</TableHead>
                  <TableHead>Dette</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                      Aucune facture trouvée pour ce client
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.number}</TableCell>
                      <TableCell>{new Date(invoice.issuedate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(invoice.duedate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {invoice.total.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
                      </TableCell>
                      <TableCell className="text-green-600">
                        {(invoice.amount_paid || 0).toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
                      </TableCell>
                      <TableCell className="text-red-600">
                        {(invoice.client_debt || 0).toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[invoice.status as keyof typeof statusColors] || statusColors.unpaid}>
                          {invoice.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link to={`/invoices/final/${invoice.id}`}>
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Voir la facture
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDebtDetailPage;
