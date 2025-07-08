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
import { FileText, ChevronDown, Plus, Search, User } from 'lucide-react';

const ProformaInvoicesPage = () => {
  const { checkPermission, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [creatorEmails, setCreatorEmails] = useState<Record<string, string>>({});
  // Fetch proforma invoices
  const { data: proformaInvoices = [], isLoading, error } = useQuery({
    queryKey: ['proformaInvoices'],
    queryFn: () => mockDataService.getProformaInvoices(),
  });
  useEffect(() => {
    const fetchCreatorEmails = async () => {
      if (proformaInvoices.length === 0) return;
      
      // Get unique user IDs from notes
      const userIds = [...new Set(proformaInvoices
        .filter(invoice => invoice.created_by_userid)
        .map(invoice => invoice.created_by_userid))];
      if (userIds.length === 0) return;
      
      // Fetch emails for all creators at once
      const emailsMap = await getUserEmailsById(userIds);
      setCreatorEmails(emailsMap);
    };
    
    fetchCreatorEmails();
  }, [proformaInvoices]);

  // Filter invoices based on search query and status filter
  const filteredInvoices = proformaInvoices.filter((invoice) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      invoice.number.toLowerCase().includes(query) ||
      (invoice.client?.name.toLowerCase().includes(query) || '') ||
      (invoice.notes.toLowerCase().includes(query) || '');
      
    const matchesStatus = statusFilter ? invoice.status === statusFilter : true;
    
    return matchesSearch && matchesStatus;
  });
  
  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'draft':
        return 'outline';
      case 'sent':
        return 'secondary';
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
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
          <h1 className="text-3xl font-bold tracking-tight">Factures pro forma</h1>
          <p className="text-muted-foreground">
            Créer et gérer des factures pro forma
          </p>
        </div>
        {checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALESPERSON]) && (
          <Button asChild>
            <Link to="/invoices/proforma/new">
              <Plus className="mr-2 h-4 w-4" /> Nouveau proforma
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Liste pro forma</CardTitle>
            <CardDescription>Visualisez et gérez vos factures pro forma</CardDescription>
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
                <DropdownMenuItem onClick={() => setStatusFilter('draft')}>Projet</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('sent')}>Envoyé</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('approved')}>Approuvé</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('rejected')}>Rejeté</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Recherche de factures pro forma..."
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
              <p className="text-red-500">Erreur de chargement des factures proforma</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-center text-muted-foreground">
                {searchQuery || statusFilter
                  ? "Aucune facture proforma ne correspond à vos critères"
                  : "Aucune facture proforma n'a encore été créée"}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden md:table-cell">Date d'émission</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créateur</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...filteredInvoices]
                    .sort((a, b) => new Date(b.issuedate).getTime() - new Date(a.issuedate).getTime())
                    .map((invoice) => (

                      <TableRow key={invoice.id} className={isOwnedByCurrentUser(invoice) ? "bg-muted/20" : ""}>
                        <TableCell className="font-mono font-medium">
                          {invoice.number}
                        </TableCell>
                        <TableCell>
                          {invoice.client?.name || 'Client inconnu'}
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
                        <TableCell className="text-right">
                          <Link
                            to={`/invoices/proforma/${invoice.id}`}
                            className="rounded-md px-2 py-1 text-sm font-medium text-primary hover:underline"
                          >
                            Voir 
                          </Link>
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

export default ProformaInvoicesPage;
