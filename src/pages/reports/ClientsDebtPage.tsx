
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Eye, ChevronRight } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow, 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ClientsDebtPage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients-debt'],
    queryFn: async () => {
      // Fetch clients with their total debt amount
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          taxid,
          final_invoices(
            id,
            total,
            amount_paid,
            client_debt
          )
        `);
        
      if (error) throw error;
      
      // Calculate the total debt for each client
      return data.map(client => {
        const totalDebt = client.final_invoices.reduce((acc, invoice) => {
          return acc + (invoice.client_debt || 0);
        }, 0);
        
        return {
          ...client,
          totalDebt,
          invoiceCount: client.final_invoices.length,
          NonPayéInvoiceCount: client.final_invoices.filter(inv => inv.client_debt > 0).length
        };
      });
    }
  });
  
  // Filter clients by search term
  const filteredClients = clients?.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.taxid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Rapport sur la dette des clients</h1>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recherche et filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by client name or tax ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>NIF</TableHead>
                    <TableHead>Total de la dette</TableHead>
                    <TableHead>Factures impayées</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Aucun client n'a été trouvé avec une dette
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients?.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.taxid}</TableCell>
                        <TableCell className="font-medium">
                          {client.totalDebt.toLocaleString('fr-DZ', { 
                            style: 'currency', 
                            currency: 'DZD' 
                          })}
                        </TableCell>
                        <TableCell>{client.NonPayéInvoiceCount} / {client.invoiceCount}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <Link to={`/reports/client-debt/${client.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Voir les détails
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientsDebtPage;
