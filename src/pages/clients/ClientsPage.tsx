
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
import { Client } from '@/types';
import { mockDataService } from '@/services/mockDataService';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Users, Plus, Search } from 'lucide-react';

const ClientsPage = () => {
  const { checkPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch clients
  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: () => mockDataService.getClients(),
  });

  // Filter clients based on search query
  const filteredClients = clients.filter((client) => {
    const query = searchQuery.toLowerCase();
    return (
      client.name.toLowerCase().includes(query) ||
      client.taxid.toLowerCase().includes(query) ||
      client.city.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      (client.nis && client.nis.toLowerCase().includes(query)) ||
      (client.contact && client.contact.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Gérer votre client information
          </p>
        </div>
        {checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT]) && (
          <Button asChild>
            <Link to="/clients/new">
              <Plus className="mr-2 h-4 w-4" /> Ajouter un nouveau client
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des clients</CardTitle>
          <CardDescription>Visualisez et gérez vos clients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Recherche de clients..."
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
              <p className="text-red-500">Erreur de chargement des clients</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2">
              <Users className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-center text-muted-foreground">
                {searchQuery
                  ? "Aucun client ne correspond à votre recherche"
                  : "Aucun client n'a encore été ajouté"}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>NIF</TableHead>
                    <TableHead>NIS</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.taxid}</TableCell>
                      <TableCell>{client.nis || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs">{client.contact || client.email}</span>
                          <span className="text-xs text-muted-foreground">{client.telcontact || client.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          to={`/clients/${client.id}`}
                          className="rounded-md px-2 py-1 text-sm font-medium text-primary hover:underline"
                        >
                          Voir les détails
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

export default ClientsPage;
