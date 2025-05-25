
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { mockDataService } from '@/services/mockDataService';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { ArrowLeft, Save, Trash } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from "@/integrations/supabase/client";

const clientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  taxid: z.string().min(5, 'Tax ID must be at least 5 characters'),
  phone: z.string().min(8, 'Phone number must be at least 8 characters'),
  email: z.string().email('Invalid email address'),
  country: z.string().min(2, 'Country must be at least 2 characters'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  // New fields - all optional
  nis: z.string().optional().nullable(),
  rc: z.string().optional().nullable(),
  ai: z.string().optional().nullable(),
  rib: z.string().optional().nullable(),
  ccp: z.string().optional().nullable(),
  contact: z.string().optional().nullable(),
  telcontact: z.string().optional().nullable(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { checkPermission } = useAuth();
  const isNewClient = id === 'new';
  const [isEditing, setIsEditing] = useState(isNewClient);
  const canEdit = checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { 
    data: client, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['client', id],
    queryFn: () => isNewClient ? null : mockDataService.getClientById(id!),
    enabled: !isNewClient,
  });

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: isNewClient 
      ? {
          name: '',
          address: '',
          taxid: '',
          phone: '',
          email: '',
          country: 'Algeria', // Default country
          city: '',
          nis: '',
          ai: '',
          rc: '',
          rib: '',
          ccp: '',
          contact: '',
          telcontact: '',
        }
      : {
          name: client?.name || '',
          address: client?.address || '',
          taxid: client?.taxid || '',
          phone: client?.phone || '',
          email: client?.email || '',
          country: client?.country || '',
          city: client?.city || '',
          nis: client?.nis || '',
          ai: client?.ai || '',
          rib: client?.rib || '',
          rc: client?.rc || '',
          ccp: client?.ccp || '',
          contact: client?.contact || '',
          telcontact: client?.telcontact || '',
        },
  });
  
  React.useEffect(() => {
    if (!isNewClient && client) {
      form.reset({
        name: client.name,
        address: client.address,
        taxid: client.taxid,
        phone: client.phone,
        email: client.email,
        country: client.country,
        city: client.city,
        nis: client.nis || '',
        ai: client.ai || '',
        rib: client.rib || '',
        rc: client?.rc || '',
        ccp: client.ccp || '',
        contact: client.contact || '',
        telcontact: client.telcontact || '',
      });
    }
  }, [client, form, isNewClient]);

  const createMutation = useMutation({
    mutationFn: (data: ClientFormValues) => {
      const newClient = {
        name: data.name,
        address: data.address,
        taxid: data.taxid,
        phone: data.phone,
        email: data.email,
        country: data.country,
        city: data.city,
        nis: data.nis || null,
        ai: data.ai || null,
        rib: data.rib || null,
        rc: data.rc || null,
        ccp: data.ccp || null,
        contact: data.contact || null,
        telcontact: data.telcontact || null
      };
      return mockDataService.createClient(newClient);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Client created',
        description: 'New client has been successfully created',
      });
      navigate('/clients');
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create client. Please try again.',
      });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: (data: ClientFormValues) => {
      const updatedClient = {
        name: data.name,
        address: data.address,
        taxid: data.taxid,
        phone: data.phone,
        email: data.email,
        country: data.country,
        city: data.city,
        nis: data.nis || null,
        ai: data.ai || null,
        rib: data.rib || null,
        rc: data.rc || null,
        ccp: data.ccp || null,
        contact: data.contact || null,
        telcontact: data.telcontact || null
      };
      return mockDataService.updateClient(id!, updatedClient);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Client updated',
        description: 'Client information has been successfully updated',
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update client. Please try again.',
      });
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: () => mockDataService.deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Client Deleted',
        description: 'Client has been successfully deleted'
      });
      navigate('/clients');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete client. It may be referenced by invoices or delivery notes.'
      });
      console.error('Error deleting client:', error);
      setDeleteDialogOpen(false);
    }
  });

  const onSubmit = (data: ClientFormValues) => {
    if (isNewClient) {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const deleteHandler = () => {
    if (canEdit) {
      deleteMutation.mutate();
    } else {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You do not have permission to delete clients'
      });
      setDeleteDialogOpen(false);
    }
  };

  if (!isNewClient && isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  if (!isNewClient && error) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-red-500">Erreur de chargement des informations sur le client</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            {isNewClient ? 'New Client' : client?.name}
          </h1>
        </div>
        <div className="flex gap-2">
          {!isNewClient && !isEditing && canEdit && (
            <Button onClick={() => setIsEditing(true)}>
              Editer Client
            </Button>
          )}
          {!isNewClient && canEdit && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette opération supprime définitivement le client et ne peut être annulée.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => deleteHandler()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isNewClient 
              ? 'Créer un nouveau client' 
              : isEditing 
                ? 'Editer Client Information' 
                : 'Client Information'}
          </CardTitle>
          <CardDescription>
            {isNewClient 
              ? 'Ajouter un nouveau client à votre système' 
              : isEditing 
                ? 'Mise à jour des coordonnées du client' 
                : 'Voir les détails du client'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l'entreprise</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Saisir le nom de l'entreprise" 
                          {...field} 
                          disabled={!isEditing && !isNewClient}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro de register de commerce (RC)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Saisir le rc" 
                          {...field} 
                          disabled={!isEditing && !isNewClient}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro d'identification fiscale (NIF)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Saisir le numéro d'identification fiscale" 
                          {...field} 
                          disabled={!isEditing && !isNewClient}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* New fields: NIS and AI */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIS</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Entrer NIS" 
                          {...field} 
                          disabled={!isEditing && !isNewClient}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="ai"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AI</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Entrer AI" 
                          {...field} 
                          disabled={!isEditing && !isNewClient}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Saisir l'adresse complète" 
                        {...field} 
                        disabled={!isEditing && !isNewClient}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Saisir la ville" 
                          {...field} 
                          disabled={!isEditing && !isNewClient}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pays</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Saisir le pays" 
                          {...field} 
                          disabled={!isEditing && !isNewClient}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Separator />
              
              {/* Contact person details */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personne de contact</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Saisir le nom de la personne de contact" 
                          {...field} 
                          disabled={!isEditing && !isNewClient}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="telcontact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone de contact</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Saisir le numéro de téléphone de la personne de contact" 
                          {...field} 
                          disabled={!isEditing && !isNewClient}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Banking details */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="rib"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RIB (Bank Account)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter RIB" 
                          {...field} 
                          disabled={!isEditing && !isNewClient}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="ccp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CCP</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter CCP" 
                          {...field} 
                          disabled={!isEditing && !isNewClient}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Separator />
              
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter email address" 
                          type="email"
                          {...field} 
                          disabled={!isEditing && !isNewClient}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro de téléphone</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Saisir le numéro de téléphone" 
                          {...field} 
                          disabled={!isEditing && !isNewClient}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {(isEditing || isNewClient) && (
                <div className="flex justify-end gap-2">
                  {!isNewClient && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false);
                        form.reset({
                          name: client?.name || '',
                          address: client?.address || '',
                          taxid: client?.taxid || '',
                          phone: client?.phone || '',
                          email: client?.email || '',
                          country: client?.country || '',
                          city: client?.city || '',
                          rc: client?.rc || '',
                          nis: client?.nis || '',
                          ai: client?.ai || '',
                          rib: client?.rib || '',
                          ccp: client?.ccp || '',
                          contact: client?.contact || '',
                          telcontact: client?.telcontact || '',
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></span>
                        {isNewClient ? 'Création...' : 'Économiser...'}
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {isNewClient ? 'Créer un client' : 'Enregistrer les modifications'}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDetail;
