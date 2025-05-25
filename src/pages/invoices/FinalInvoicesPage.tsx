
import React, { useState, useEffect } from 'react';
import { getUserEmailsById } from '@/utils/supabaseHelpers';
import { getUserEmailById } from '@/utils/supabaseHelpers';

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { mockDataService } from '@/services/mockDataService';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { FileText, ChevronDown, Plus, Search, Truck, User } from 'lucide-react';

const FinalInvoicesPage = () => {
  const { checkPermission, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [creatorEmails, setCreatorEmails] = useState<Record<string, string>>({});
  // Fetch final invoices
  const { data: finalInvoices = [], isLoading, error } = useQuery({
    queryKey: ['finalInvoices'],
    queryFn: () => mockDataService.getFinalInvoices(),
  });
  useEffect(() => {
      const fetchCreatorEmails = async () => {
        if (finalInvoices.length === 0) return;
        
        // Get unique user IDs from notes
        const userIds = [...new Set(finalInvoices
          .filter(invoice => invoice.created_by_userid)
          .map(invoice => invoice.created_by_userid))];
        if (userIds.length === 0) return;
        
        // Fetch emails for all creators at once
        const emailsMap = await getUserEmailsById(userIds);
        setCreatorEmails(emailsMap);
      };
      
      fetchCreatorEmails();
    }, [finalInvoices]);

  // Filter invoices based on search query and status filter
  const filteredInvoices = finalInvoices.filter((invoice) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      invoice.number.toLowerCase().includes(query) ||
      (invoice.client?.name?.toLowerCase().includes(query) || '') ||
      (invoice.notes?.toLowerCase().includes(query) || '');
      
    const matchesStatus = statusFilter ? invoice.status === statusFilter : true;
    
    return matchesSearch && matchesStatus;
  });
  
  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'unpaid':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'credited':
        return 'outline';
      default:
        return 'outline';
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-DZ', { 
      style: 'currency', 
      currency: 'DZD',
      minimumFractionDigits: 2
    });
  };

  // Check if a delivery note can be created for this invoice
  const canCreateDeliveryNote = (invoiceId: string) => {
    // This would normally check if a delivery note already exists for this invoice
    // For demo purposes we're just returning true for all unpaid/paid invoices
    const invoice = finalInvoices.find(i => i.id === invoiceId);
    return invoice && ['unpaid', 'paid'].includes(invoice.status);
  };

  // Check if document is owned by current user
  const isOwnedByCurrentUser = (invoice: any) => {
    return invoice.created_by_userid === user?.id;
  };

  // Get creator email display
  const getCreatorEmailDisplay = (invoice: any) => {
    const userId = invoice.created_by_userid;
    
    if (!userId) return 'Unknown User';
    
    return creatorEmails[userId] || 'Loading...';
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Factures finales</h1>
          <p className="text-muted-foreground">
            Gérer vos factures formelles
          </p>
        </div>
        {checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT]) && (
          <Button asChild>
            <Link to="/invoices/final/new">
              <Plus className="mr-2 h-4 w-4" /> Nouvelle facture
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Liste des factures finales</CardTitle>
            <CardDescription>Factures formelles émises aux clients</CardDescription>
          </div>
          <div className="mt-4 sm:mt-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {statusFilter ? `Status: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}` : 'Filter by Status'}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter(null)}>Tous</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('unpaid')}>Non payé</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('paid')}>Payé</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>Annulé</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('credited')}>Crédité</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Recherche de factures..."
              className="max-w-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-red-500">Erreur de chargement des factures</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-center text-muted-foreground">
                {searchQuery || statusFilter
                  ? "Aucune facture ne correspond à vos critères"
                  : "Aucune facture finale n'a encore été émise"}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créateur</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className={isOwnedByCurrentUser(invoice) ? "bg-muted/20" : ""}>
                      <TableCell className="font-mono font-medium">
                        {invoice.number}
                      </TableCell>
                      <TableCell>
                        {invoice.client?.name || 'Unknown Client'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {invoice.issuedate}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(invoice.status)}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs">
                          <span className={isOwnedByCurrentUser(invoice) ? "font-medium" : ""}>
                            {getCreatorEmailDisplay(invoice)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(invoice.total)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end space-x-2">
                          <Link 
                            to={`/invoices/final/${invoice.id}`}
                            className="rounded-md px-2 py-1 text-sm font-medium text-primary hover:underline"
                          >
                            View
                          </Link>
                          {canCreateDeliveryNote(invoice.id) && checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALESPERSON]) && (
                            <Link 
                              to={`/delivery-notes/new?invoiceId=${invoice.id}`}
                              className="flex items-center rounded-md px-2 py-1 text-sm font-medium text-primary hover:underline"
                            >
                              <Truck className="mr-1 h-3 w-3" />
                              Delivery
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinalInvoicesPage;
