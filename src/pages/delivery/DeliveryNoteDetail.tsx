
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockDataService } from '@/services/mockDataService';
import { 
  supabase, 
  updateDeliveryNote, 
  deleteDeliveryNote 
} from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  FileText, 
  Truck, 
  User, 
  Printer, 
  Edit, 
  Save,
  Check,
  Trash2,
  Plus,
  X,
  Building,
  CarFront,
  Bus,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from '@/components/ui/use-toast';
import { exportDeliveryNoteToPDF } from '@/utils/exportUtils';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { InvoiceItem, Product } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';



const deliveryNoteFormSchema = z.object({
  notes: z.string().optional(),
  drivername: z.string().optional(),
  truck_id: z.string().optional(),
  delivery_company: z.string().optional(),
  issuedate: z.string(),
  deliverydate: z.string().optional().nullable(),
  items: z.array(
    z.object({
      id: z.string().uuid('Invalid item ID format'),
      productId: z.string().min(1, 'Product is required'),
      quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
      product: z.object({
        name: z.string(),
        description: z.string(),
        code: z.string(),
        unit: z.string(),
        unitprice: z.number(),
        taxrate: z.number(),
      }).optional(),
      unitprice: z.number().default(0),
      taxrate: z.number().default(0),
      discount: z.number().default(0),
      totalExcl: z.number().default(0),
      totalTax: z.number().default(0),
      total: z.number().default(0)
    })
  ).min(1, 'At least one item is required')
});

type DeliveryNoteFormValues = z.infer<typeof deliveryNoteFormSchema>;

const DeliveryNoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNewNote = id === 'new';
  const isEditMode = window.location.pathname.includes('/edit/');
  const { checkPermission } = useAuth();
  const canEdit = checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT]);
  
  const { 
    data: deliveryNotes = [],
    isLoading 
  } = useQuery({
    queryKey: ['deliveryNotes'],
    queryFn: () => mockDataService.getDeliveryNotes(),
    enabled: !isNewNote,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => mockDataService.getProducts(),
  });
  
  const deliveryNote = isNewNote ? null : deliveryNotes.find(n => n.id === id);

  // Initialize form with empty values
  const form = useForm<DeliveryNoteFormValues>({
    resolver: zodResolver(deliveryNoteFormSchema),
    defaultValues: {
      notes: '',
      drivername: '',
      truck_id: '',
      delivery_company: '',
      issuedate: '',
      deliverydate: null,
      items: []
    }
  });

  // Update form values when deliveryNote changes
  React.useEffect(() => {
    if (deliveryNote) {
      console.log("Delivery note loaded:", deliveryNote);
      form.reset({
        notes: deliveryNote.notes || '',
        drivername: deliveryNote.drivername || '',
        truck_id: deliveryNote.truck_id || null,
        delivery_company: deliveryNote.delivery_company || '',
        issuedate: deliveryNote.issuedate || '',
        deliverydate: deliveryNote.deliverydate || null,
        items: deliveryNote.items || []
      });
    }
  }, [deliveryNote, form]);

  const updateDeliveryNoteMutation = useMutation({
    mutationFn: (data: DeliveryNoteFormValues) => {
      // Make sure we're only sending valid fields to the delivery_notes table
      const { notes, drivername, truck_id, delivery_company, issuedate, deliverydate, items } = data;
      const deliveryNoteData = {
        notes,
        drivername,
        truck_id,
        delivery_company,
        issuedate,
        deliverydate, // Now correctly handled in updateDeliveryNote
        items // This will be handled separately in the updateDeliveryNote function
      };
      
      if (!id) throw new Error('No delivery note ID provided');
      return updateDeliveryNote(id, deliveryNoteData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryNotes'] });
      toast({
        title: 'Delivery Note Updated',
        description: 'Delivery note has been updated successfully'
      });
      navigate(`/delivery-notes/${id}`);
    },
    onError: (error) => {
      console.error('Error updating delivery note:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Failed to update delivery note. Please try again.'
      });
    }
  });

  const markAsDeliveredMutation = useMutation({
    mutationFn: () => {
      if (!id) throw new Error('No delivery note ID provided');
      return updateDeliveryNote(id, { 
        status: 'delivered', 
        deliverydate: new Date().toISOString().split('T')[0] 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryNotes'] });
      toast({
        title: 'Status Updated',
        description: 'Delivery note has been marked as delivered'
      });
    },
    onError: (error) => {
      console.error('Error marking as delivered:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Failed to update delivery status. Please try again.'
      });
    }
  });

  const deleteDeliveryNoteMutation = useMutation({
    mutationFn: () => {
      if (!id) throw new Error('No delivery note ID provided');
      return deleteDeliveryNote(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryNotes'] });
      toast({
        title: 'Delivery Note Deleted',
        description: 'Delivery note has been deleted successfully'
      });
      navigate('/delivery-notes');
    },
    onError: (error) => {
      console.error('Error deleting delivery note:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Failed to delete delivery note. Please try again.'
      });
    }
  });
  
  const formatCurrency = (amount?: number) => {
    if (amount === undefined) return '';
    return amount.toLocaleString('fr-DZ', { 
      style: 'currency', 
      currency: 'DZD',
      minimumFractionDigits: 2
    });
  };
  
  const getStatusBadgeVariant = (status?: string) => {
    if (!status) return 'outline';
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

  const addItem = () => {
    const currentItems = form.getValues('items') || [];
    form.setValue('items', [
      ...currentItems,
      {
        id: uuidv4(), 
        productId: '',
        quantity: 1,
        unitprice: 0,
        taxrate: 0,
        discount: 0,
        totalExcl: 0,
        totalTax: 0,
        total: 0
      }
    ]);
  };

  const removeItem = (index: number) => {
    const currentItems = [...form.getValues('items')];
    if (currentItems.length <= 1) {
      toast({
        variant: 'destructive',
        title: 'Cannot Remove',
        description: 'At least one item is required'
      });
      return;
    }
    currentItems.splice(index, 1);
    form.setValue('items', currentItems);
  };

  const updateItemProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    const items = [...form.getValues('items')];
    items[index].productId = productId;
    items[index].product = product;
    form.setValue('items', items);
  };

  const onSubmit = (data: DeliveryNoteFormValues) => {
    if (!id) return;
    updateDeliveryNoteMutation.mutate(data);
  };

  const handleMarkAsDelivered = () => {
    if (!id) return;
    markAsDeliveredMutation.mutate();
  };

  const handleDeleteDeliveryNote = () => {
    if (!id) return;
    deleteDeliveryNoteMutation.mutate();
  };

  if (!isNewNote && isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const handlePrintDeliveryNote = () => {
    if (!deliveryNote) return;
    
    try {
      const result = exportDeliveryNoteToPDF(deliveryNote);
      if (result) {
        toast({
          title: 'PDF généré',
          description: 'Le bon de livraison a été exporté au format PDF'
        });
      }
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Échec de la génération du PDF. Veuillez réessayer.'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/delivery-notes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            {isNewNote ? 'Nouveau bon de livraison' : isEditMode ? `Modifier le bon de livraison: ${deliveryNote?.number}` : `bon de livraison : ${deliveryNote?.number}`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isNewNote && !isEditMode && deliveryNote?.status && (
            <Badge variant={getStatusBadgeVariant(deliveryNote.status)}>
              {deliveryNote.status.charAt(0).toUpperCase() + deliveryNote.status.slice(1)}
            </Badge>
          )}
        </div>
      </div>
      
      {!isNewNote && deliveryNote ? (
        isEditMode ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Informations sur le client</CardTitle>
                    <CardDescription>Détails du client pour cette livraison</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2">
                        <span className="text-sm text-muted-foreground">Nom:</span>
                        <span>{deliveryNote.client?.name}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-sm text-muted-foreground">Adresse:</span>
                        <span>{deliveryNote.client?.address}</span>
                      </div>
                      
                      <div className="grid grid-cols-2">
                        <span className="text-sm text-muted-foreground">Téléphone:</span>
                        <span>{deliveryNote.client?.phone}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Détails de la livraison</CardTitle>
                    <CardDescription>Informations sur ce document</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2">
                        <span className="text-sm text-muted-foreground">Numéro de livraison:</span>
                        <span>{deliveryNote.number}</span>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="issuedate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date d'émission</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="deliverydate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date de livraison (optional)</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => field.onChange(e.target.value || null)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2">
                        <span className="text-sm text-muted-foreground">Statut:</span>
                        <span>
                          <Badge variant={getStatusBadgeVariant(deliveryNote.status)}>
                            {deliveryNote.status.charAt(0).toUpperCase() + deliveryNote.status.slice(1)}
                          </Badge>
                        </span>
                      </div>
                      
                      {deliveryNote.finalInvoiceId && (
                        <div className="grid grid-cols-2">
                          <span className="text-sm text-muted-foreground">Facture associée:</span>
                          <span>
                            <Link to={`/invoices/final/${deliveryNote.finalInvoiceId}`} className="text-primary hover:underline">
                              F-{deliveryNote.finalInvoiceId.padStart(4, '0')}
                            </Link>
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Détails du transport</CardTitle>
                  <CardDescription>Informations sur le transport de livraison</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="drivername"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom du conducteur</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="truck_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID du camion / plaque d'immatriculation</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="delivery_company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Société de livraison (facultatif)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Articles à livrer</CardTitle>
                    <CardDescription>Produits à livrer</CardDescription>
                  </div>
                  <Button type="button" onClick={addItem} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Ajouter un article
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-2 text-left">Produit</th>
                          <th className="px-4 py-2 text-right">Quantité</th>
                          <th className="px-4 py-2 text-left w-[100px]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.watch('items')?.map((item, index) => (
                          <tr key={item.id || index} className="border-b">
                            <td className="px-4 py-2">
                              <Select
                                value={item.productId}
                                onValueChange={(value) => updateItemProduct(index, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un produit" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map(product => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name} ({product.code})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {form.formState.errors.items?.[index]?.productId?.message && (
                                <p className="text-xs text-destructive mt-1">
                                  Le produit est nécessaire
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const items = [...form.watch('items')];
                                  items[index].quantity = parseInt(e.target.value) || 1;
                                  form.setValue('items', items);
                                }}
                                className="text-right"
                              />
                              {form.formState.errors.items?.[index]?.quantity?.message && (
                                <p className="text-xs text-destructive mt-1">
                                  Une quantité valide est requise
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <Button 
                                type="button"
                                variant="ghost" 
                                size="sm"
                                onClick={() => removeItem(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {form.formState.errors.items && !Array.isArray(form.formState.errors.items) && (
                    <p className="text-xs text-destructive mt-1">
                      {form.formState.errors.items.message}
                    </p>
                  )}
                  
                  <div className="mt-6">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instructions de livraison</FormLabel>
                          <FormControl>
                            <Textarea rows={4} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" asChild>
                  <Link to={`/delivery-notes/${deliveryNote.id}`}>Annuler</Link>
                </Button>
                <Button type="submit" disabled={updateDeliveryNoteMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer les modifications
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Informations sur le client</CardTitle>
                  <CardDescription>Détails du client pour cette livraison</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2">
                      <span className="text-sm text-muted-foreground">Nom:</span>
                      <span>{deliveryNote.client?.name}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span className="text-sm text-muted-foreground">Adresse:</span>
                      <span>{deliveryNote.client?.address}</span>
                    </div>
                    
                    <div className="grid grid-cols-2">
                      <span className="text-sm text-muted-foreground">Téléphone:</span>
                      <span>{deliveryNote.client?.phone}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Détails de la livraison</CardTitle>
                  <CardDescription>Informations sur ce document</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2">
                      <span className="text-sm text-muted-foreground">Numéro de livraison:</span>
                      <span>{deliveryNote.number}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span className="text-sm text-muted-foreground">Date d'émission:</span>
                      <span>{deliveryNote.issuedate}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span className="text-sm text-muted-foreground">Date de livraison:</span>
                       
                      <span>{deliveryNote.deliverydate || 'Not delivered yet'}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span className="text-sm text-muted-foreground">Statut:</span>
                      <span>
                        <Badge variant={getStatusBadgeVariant(deliveryNote.status)}>
                          {deliveryNote.status.charAt(0).toUpperCase() + deliveryNote.status.slice(1)}
                        </Badge>
                      </span>
                    </div>
                    {deliveryNote.finalInvoiceId && (
                      <div className="grid grid-cols-2">
                        <span className="text-sm text-muted-foreground">Facture associée:</span>
                        <span>
                          <Link to={`/invoices/final/${deliveryNote.finalInvoiceId}`} className="text-primary hover:underline">
                            F-{deliveryNote.finalInvoiceId.padStart(4, '0')}
                          </Link>
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Détails du transport</CardTitle>
                <CardDescription>Informations sur le transport de livraison</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="grid grid-cols-2">
                    <span className="text-sm text-muted-foreground flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Conducteur:
                    </span>
                    <span> d :{deliveryNote.drivername?.trim() ? deliveryNote.drivername : 'Non spécifié'}</span>

                  </div>
                  
                  <div className="grid grid-cols-2">
                    <span className="text-sm text-muted-foreground flex items-center">
                      <Truck className="mr-2 h-4 w-4" />
                      ID du camion :
                    </span>
                    <span>{deliveryNote.truck_id || 'Non spécifié'}</span>
                  </div>
                  
                  <div className="grid grid-cols-2">
                    <span className="text-sm text-muted-foreground flex items-center">
                      <Building className="mr-2 h-4 w-4" />
                      Société de livraison:
                    </span>
                    <span>{deliveryNote.delivery_company || 'Not specified'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Articles à livrer</CardTitle>
                <CardDescription>Produits à livrer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left">Produit</th>
                        <th className="px-4 py-2 text-right">Quantité</th>
                        <th className="px-4 py-2 text-left">Unité</th>
                        <th className="px-4 py-2 text-left">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryNote.items.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="px-4 py-2 font-medium">
                            {item.product?.name}
                            <div className="text-xs text-muted-foreground">Code: {item.product?.code}</div>
                          </td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2">{item.product?.unit}</td>
                          <td className="px-4 py-2 text-sm text-muted-foreground">{item.product?.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {deliveryNote.notes && (
                  <div className="mt-6 rounded-md border p-4">
                    <h4 className="mb-2 font-medium">Instructions de livraison</h4>
                    <p className="text-sm">{deliveryNote.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handlePrintDeliveryNote}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimer le bon de livraison
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate(`/print/v3/delivery-notes/${id}`)}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print V3
              </Button>
              
              {canEdit && deliveryNote.status === 'pending' && (
                <Button asChild variant="outline">
                  <Link to={`/delivery-notes/edit/${deliveryNote.id}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Modifier le bon de livraison
                  </Link>
                </Button>
              )}
              
              {canEdit && deliveryNote.status === 'pending' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer le bon de livraison</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action ne peut être annulée. Cette action supprimera définitivement le bon de livraison.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteDeliveryNote}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              
              {deliveryNote.status === 'pending' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button>
                      <Check className="mr-2 h-4 w-4" />
                      Marquer comme délivré
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Marquer comme délivré</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette opération marquera la livraison comme étant terminée et fixera la date de livraison à aujourd'hui.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleMarkAsDelivered}
                      >
                        Confirmer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </>
        )
      ) : isNewNote ? (
        <Card>
          <CardHeader>
            <CardTitle>Nouveau bulletin de livraison</CardTitle>
            <CardDescription>Créer un nouveau bon de livraison</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center py-8 text-muted-foreground">
              Il s'agit d'une demande de démonstration. <br />
              Le formulaire complet de création de bons de livraison serait mis en œuvre ici dans un environnement de production.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex h-40 flex-col items-center justify-center gap-2">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-center text-muted-foreground">
                Bon de livraison introuvable
              </p>
              <Button asChild variant="outline">
                <Link to="/delivery-notes">Retour à la liste</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeliveryNoteDetail;
