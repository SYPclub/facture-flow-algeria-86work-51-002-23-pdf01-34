
import React, { useState, useEffect } from 'react';

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
import { getUserEmailsById } from '@/utils/supabaseHelpers';
import { mockDataService } from '@/services/mockDataService';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Truck, ChevronDown, Search, Plus, User } from 'lucide-react';

const DeliveryNotesPage = () => {
  const { checkPermission, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [creatorEmails, setCreatorEmails] = useState<Record<string, string>>({});
  
  const canCreate = checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALESPERSON]);
  
  // Fetch delivery notes
  const { data: deliveryNotes = [], isLoading, error } = useQuery({
    queryKey: ['deliveryNotes'],
    queryFn: () => mockDataService.getDeliveryNotes(),
  });
  useEffect(() => {
    const fetchCreatorEmails = async () => {
      if (deliveryNotes.length === 0) return;
      
      // Get unique user IDs from notes
      const userIds = [...new Set(deliveryNotes
        .filter(note => note.created_by_userid)
        .map(note => note.created_by_userid))];
      if (userIds.length === 0) return;
      
      // Fetch emails for all creators at once
      const emailsMap = await getUserEmailsById(userIds);
      setCreatorEmails(emailsMap);
    };
    
    fetchCreatorEmails();
  }, [deliveryNotes]);



  // Filter delivery notes based on search query and status filter
  const filteredDeliveryNotes = deliveryNotes.filter((note) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      note.number.toLowerCase().includes(query) ||
      (note.client?.name?.toLowerCase().includes(query) || '');
      
    const matchesStatus = statusFilter ? note.status === statusFilter : true;
    
    return matchesSearch && matchesStatus;
  });
  
  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  

  
  // Check if document is owned by current user
  const isOwnedByCurrentUser = (note: any) => {
    return note.created_by_userid === user?.id;
  };

  // Get creator email display
  const getCreatorEmailDisplay = (note: any) => {
    const userId = note.created_by_userid;
    
    if (!userId) return 'Unknown User';
    
    return creatorEmails[userId] || 'Loading...';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">bon de livraison</h1>
          <p className="text-muted-foreground">
            Gérer les documents de livraison pour vos clients
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to="/delivery-notes/new">
              <Plus className="mr-2 h-4 w-4" />
              Créer un bon de livraison
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Liste des bons de livraison</CardTitle>
            <CardDescription>Suivi des bon de livraison</CardDescription>
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
                <DropdownMenuItem onClick={() => setStatusFilter('pending')}>En attente</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('delivered')}>Livré</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>Annulé</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Recherche de bons de livraison..."
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
              <p className="text-red-500">Erreur de chargement des bons de livraison</p>
            </div>
          ) : filteredDeliveryNotes.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2">
              <Truck className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-center text-muted-foreground">
                {searchQuery || statusFilter
                  ? "No delivery notes found matching your criteria"
                  : "No delivery notes created yet"}
              </p>
              {canCreate && !searchQuery && !statusFilter && (
                <Button asChild variant="outline" className="mt-2">
                  <Link to="/delivery-notes/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Créez votre premier bon de livraison
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Facture associée</TableHead>
                    <TableHead className="hidden md:table-cell">Date d'émission</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créateur</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveryNotes.map((note) => (
                    <TableRow key={note.id} className={isOwnedByCurrentUser(note) ? "bg-muted/20" : ""}>
                      <TableCell className="font-mono font-medium">
                        {note.number}
                      </TableCell>
                      <TableCell>
                        {note.client?.name || 'Client inconnu'}
                      </TableCell>
                      <TableCell>
                        <Link 
                          to={`/invoices/final/${note.finalInvoiceId}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {/* Would normally fetch the actual invoice number */}
                          F-{note.finalInvoiceId?.padStart(4, '0')}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {note.issuedate}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(note.status)}>
                          {note.status.charAt(0).toUpperCase() + note.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs">
                          <span className={isOwnedByCurrentUser(note) ? "font-medium" : ""}>
                            {getCreatorEmailDisplay(note)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          to={`/delivery-notes/${note.id}`}
                          className="rounded-md px-2 py-1 text-sm font-medium text-primary hover:underline"
                        >
                          View Details
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

export default DeliveryNotesPage;
