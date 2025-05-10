
import React, { useState } from 'react';
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
import { Truck, ChevronDown, Search, Plus } from 'lucide-react';

const DeliveryNotesPage = () => {
  const { checkPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  const canCreate = checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALESPERSON]);
  
  // Fetch delivery notes
  const { data: deliveryNotes = [], isLoading, error } = useQuery({
    queryKey: ['deliveryNotes'],
    queryFn: () => mockDataService.getDeliveryNotes(),
  });

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delivery Notes</h1>
          <p className="text-muted-foreground">
            Manage delivery documents for your clients
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to="/delivery-notes/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Delivery Note
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Delivery Note List</CardTitle>
            <CardDescription>Track delivery documentation</CardDescription>
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
                <DropdownMenuItem onClick={() => setStatusFilter(null)}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('pending')}>Pending</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('delivered')}>Delivered</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>Cancelled</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search delivery notes..."
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
              <p className="text-red-500">Error loading delivery notes</p>
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
                    Create Your First Delivery Note
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Related Invoice</TableHead>
                    <TableHead className="hidden md:table-cell">Issue Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveryNotes.map((note) => (
                    <TableRow key={note.id}>
                      <TableCell className="font-mono font-medium">
                        {note.number}
                      </TableCell>
                      <TableCell>
                        {note.client?.name || 'Unknown Client'}
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
