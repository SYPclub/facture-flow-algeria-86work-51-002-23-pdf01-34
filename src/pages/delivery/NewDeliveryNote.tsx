
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { mockDataService } from '@/services/mockDataService';
import { 
  useAuth, 
  UserRole 
} from '@/contexts/AuthContext';
import { 
  ArrowLeft, 
  Plus, 
  Save, 
  X,
  Truck,
  User 
} from 'lucide-react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getCurrentDate, generateId } from '@/types';

const deliveryNoteSchema = z.object({
  clientid: z.string().min(1, 'Client is required'),
  finalInvoiceId: z.string().optional(),
  issuedate: z.string().min(1, 'Issue date is required'),
  notes: z.string().optional(),
  drivername: z.string().min(1, 'Driver name is required'),
  truck_id: z.string().optional(),
  delivery_company: z.string().optional(),
  items: z.array(
    z.object({
      id: z.string(),
      productId: z.string().min(1, 'Product is required'),
      quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
      product: z.object({
        name: z.string(),
        description: z.string(),
        code: z.string(),
        unitprice: z.number(),
        taxrate: z.number(),
      }).optional()
    })
  ).min(1, 'At least one item is required')
});

type DeliveryNoteFormValues = z.infer<typeof deliveryNoteSchema>;

const NewDeliveryNote = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { checkPermission } = useAuth();
  const canCreate = checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALESPERSON]);
  
  // Added state to force re-render when items update
  const [itemsState, setItemsState] = useState<any[]>([]);
  
  const queryParams = new URLSearchParams(location.search);
  const invoiceId = queryParams.get('invoiceId');
  
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => mockDataService.getClients(),
  });
  
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => mockDataService.getProducts(),
  });

  const { data: finalInvoices = [] } = useQuery({
    queryKey: ['finalInvoices'],
    queryFn: () => mockDataService.getFinalInvoices(),
  });

  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ['finalInvoice', invoiceId],
    queryFn: () => mockDataService.getFinalInvoiceById(invoiceId!),
    enabled: !!invoiceId,
  });

  const form = useForm<DeliveryNoteFormValues>({
    resolver: zodResolver(deliveryNoteSchema),
    defaultValues: {
      clientid: '',
      finalInvoiceId: '',
      issuedate: getCurrentDate(),
      notes: '',
      drivername: 'Unknown Driver', // Initialize with a default value
      truck_id: '',
      delivery_company: '',
      items: [
        {
          id: generateId(),
          productId: '',
          quantity: 1,
        }
      ]
    }
  });

  useEffect(() => {
    if (invoice) {
      form.setValue('clientid', invoice.clientid);
      form.setValue('finalInvoiceId', invoice.id);
      form.setValue('notes', `Delivery for invoice ${invoice.number}`);
      
      if (invoice.items && invoice.items.length > 0) {
        const items = invoice.items.map(item => ({
          id: generateId(),
          productId: item.productId,
          quantity: item.quantity,
          product: item.product
        }));
        form.setValue('items', items);
        setItemsState(items);
      }
    }
  }, [invoice, form]);
  
  // Update itemsState when form values change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.includes('items')) {
        setItemsState([...form.getValues('items')]);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  const addItem = () => {
    const currentItems = form.getValues('items') || [];
    const newItems = [
      ...currentItems,
      {
        id: generateId(),
        productId: '',
        quantity: 1
      }
    ];
    form.setValue('items', newItems);
    setItemsState(newItems);
  };

  const removeItem = (index: number) => {
    const currentItems = [...form.getValues('items')];
    currentItems.splice(index, 1);
    form.setValue('items', currentItems);
    setItemsState([...currentItems]);
  };

  const updateItemProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    const items = [...form.getValues('items')];
    items[index].productId = productId;
    items[index].product = product;
    // Transfer the unit from the product to the item
    if (product?.unit) {
      items[index].unit = product.unit;
    }
    form.setValue('items', items);
    setItemsState([...items]);
  };

  const createMutation = useMutation({
    mutationFn: async (data: DeliveryNoteFormValues) => {
      // Always ensure non-empty values for required fields
      const deliveryNote = {
        clientid: data.clientid,
        finalInvoiceId: data.finalInvoiceId || null,
        issuedate: data.issuedate || getCurrentDate(),
        deliverydate: null, // Default to null
        notes: data.notes || '',
        status: 'pending',
        // Ensure all transportation fields are properly included
        drivername: data.drivername.trim() || 'Unknown Driver',
        truck_id: data.truck_id || null, 
        delivery_company: data.delivery_company || null,
        items: data.items.map(item => {
          const product = products.find(p => p.id === item.productId);
          return {
            id: generateId(),
            productId: item.productId,
            product,
            quantity: item.quantity,
            unitprice: product?.unitprice || 0,
            taxrate: product?.taxrate || 0,
            discount: 0,
            totalExcl: (product?.unitprice || 0) * item.quantity,
            totalTax: (product?.unitprice || 0) * item.quantity * (product?.taxrate || 0) / 100,
            total: (product?.unitprice || 0) * item.quantity * (1 + (product?.taxrate || 0) / 100),
            unit: product?.unit || '', // Include the unit from the product
          };
        })
      };
      
      console.log('Creating delivery note with data:', deliveryNote);
      return mockDataService.createDeliveryNote(deliveryNote);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryNotes'] });
      toast({
        title: 'Delivery Note Created',
        description: 'Delivery note has been successfully created'
      });
      navigate('/delivery-notes');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create delivery note. Please try again.'
      });
      console.error('Error creating delivery note:', error);
    }
  });

  const onSubmit = (data: DeliveryNoteFormValues) => {
    if (!canCreate) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You do not have permission to create delivery notes'
      });
      return;
    }
    
    createMutation.mutate(data);
  };

  if (!canCreate) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex h-40 flex-col items-center justify-center gap-2">
            <p className="text-center text-muted-foreground">
              Vous n'avez pas l'autorisation de créer des bons de livraison
            </p>
            <Button asChild variant="outline">
              <Link to="/delivery-notes">Retour à la liste</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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
            Nouveau bon de livraison
          </h1>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations sur le client</CardTitle>
              <CardDescription>Sélectionner le client pour ce bon de livraison</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="clientid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} ({client.taxid})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="finalInvoiceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facture finale (optionnel)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une facture finale" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {finalInvoices.map(invoice => (
                          <SelectItem key={invoice.id} value={invoice.id}>
                            {invoice.number} - {clients.find(c => c.id === invoice.clientid)?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Détails de la livraison</CardTitle>
              <CardDescription>Informations sur la livraison</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="drivername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du conducteur</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Saisir le nom du conducteur"
                        />
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
                      <FormLabel className="flex items-center">
                        <Truck className="mr-2 h-4 w-4" />
                        ID du camion
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Saisir le numéro d'identification du camion ou la plaque d'immatriculation" {...field} />
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
                      <FormLabel>Société de livraison</FormLabel>
                      <FormControl>
                        <Input placeholder="Saisir le nom de l'entreprise de livraison" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Saisir toute information supplémentaire ou instruction de livraison"
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Articles</CardTitle>
                <CardDescription>Produits à livrer</CardDescription>
              </div>
              <Button type="button" onClick={addItem} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" /> Ajouter un article
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Unité</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsState.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Select
                            value={item.productId}
                            onValueChange={(value) => updateItemProduct(index, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un produit">
                                {item.productId && products.find(p => p.id === item.productId)?.name}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {products.map(product => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} ({product.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {form.formState.errors.items?.[index]?.productId && (
                            <p className="text-xs text-destructive mt-1">
                              Le produit est nécessaire
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const items = [...form.getValues('items')];
                              items[index].quantity = parseInt(e.target.value) || 1;
                              form.setValue('items', items);
                              setItemsState([...items]);
                            }}
                          />
                          {form.formState.errors.items?.[index]?.quantity && (
                            <p className="text-xs text-destructive mt-1">
                              Une quantité valide est requise
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.productId && products.find(p => p.id === item.productId)?.unit || '-'}
                        </TableCell>
                        <TableCell>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeItem(index)}
                            disabled={form.getValues('items').length <= 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {form.formState.errors.items && !Array.isArray(form.formState.errors.items) && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.items.message}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link to="/delivery-notes">Annuler</Link>
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></span>
                  Création...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Créer un bon de livraison
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default NewDeliveryNote;