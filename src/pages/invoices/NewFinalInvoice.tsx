import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';

import {
  Card,
  CardContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { ArrowLeft, Plus, Trash2, Save, Calendar } from 'lucide-react';
import { mockDataService } from '@/services/mockDataService';
import { createFinalInvoice } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Client, Product, InvoiceItem, FinalInvoice } from '@/types';

const invoiceItemSchema = z.object({
  id: z.string(),
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitprice: z.number().min(0, 'Unit price must be positive'),
  taxrate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100'),
  discount: z.number().min(0).max(100, 'Discount must be between 0 and 100'),
});

const finalInvoiceSchema = z.object({
  clientid: z.string().min(1, 'Client is required'),
  issuedate: z.string().min(1, 'Issue date is required'),
  duedate: z.string().min(1, 'Due date is required'),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  payment_type: z.string().optional(),
  bc: z.string().optional(),
});

const NewFinalInvoice = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const proformaId = searchParams.get('proformaId');
  
  // Fetch clients and products
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => mockDataService.getClients(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => mockDataService.getProducts(),
  });

  // If converting from proforma, fetch the proforma data
  const { data: sourceProforma } = useQuery({
    queryKey: ['proformaInvoice', proformaId],
    queryFn: () => mockDataService.getProformaInvoiceById(proformaId!),
    enabled: !!proformaId,
  });

  const form = useForm<z.infer<typeof finalInvoiceSchema>>({
    resolver: zodResolver(finalInvoiceSchema),
    defaultValues: {
      clientid: '',
      issuedate: new Date().toISOString().split('T')[0],
      duedate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '',
      items: [],
      payment_type: '',
      bc: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Initialize form with proforma data if converting
  useEffect(() => {
    if (sourceProforma) {
      form.reset({
        clientid: sourceProforma.clientid,
        issuedate: new Date().toISOString().split('T')[0],
        duedate: sourceProforma.duedate,
        notes: sourceProforma.notes,
        items: sourceProforma.items.map(item => ({
          id: uuidv4(),
          productId: item.productId,
          quantity: item.quantity,
          unitprice: item.unitprice,
          taxrate: item.taxrate,
          discount: item.discount,
        })),
        payment_type: sourceProforma.payment_type || '',
        bc: sourceProforma.bc || '',
      });
    }
  }, [sourceProforma, form]);

  // Create final invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof finalInvoiceSchema>) => {
      const calculatedItems = data.items.map(item => {
        const product = products.find(p => p.id === item.productId);
        const totalExcl = item.quantity * item.unitprice * (1 - item.discount / 100);
        const totalTax = totalExcl * (item.taxrate / 100);
        const total = totalExcl + totalTax;

        return {
          ...item,
          product,
          totalExcl,
          totalTax,
          total,
          unit: product?.unit || 'Unit',
        };
      });

      const subtotal = calculatedItems.reduce((sum, item) => sum + item.totalExcl, 0);
      const taxTotal = calculatedItems.reduce((sum, item) => sum + item.totalTax, 0);
      const total = subtotal + taxTotal;

      const invoiceData: Partial<FinalInvoice> = {
        id: uuidv4(),
        number: `FIN-${Date.now()}`,
        clientid: data.clientid,
        issuedate: data.issuedate,
        duedate: data.duedate,
        items: calculatedItems,
        notes: data.notes || '',
        subtotal,
        taxTotal,
        total,
        status: 'unpaid',
        created_by_userid: user?.id || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        payment_type: data.payment_type,
        bc: data.bc,
        amount_paid: 0,
        client_debt: total,
      };

      return createFinalInvoice(invoiceData as FinalInvoice);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['finalInvoices'] });
      toast({
        title: 'Facture créée',
        description: 'La facture finale a été créée avec succès',
      });
      navigate(`/invoices/final/${result.id}`);
    },
    onError: (error) => {
      console.error('Error creating final invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de créer la facture finale',
      });
    },
  });

  const addItem = () => {
    append({
      id: uuidv4(),
      productId: '',
      quantity: 1,
      unitprice: 0,
      taxrate: 19,
      discount: 0,
    });
  };

  const updateItemProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      form.setValue(`items.${index}.productId`, productId);
      form.setValue(`items.${index}.unitprice`, product.unitprice);
      form.setValue(`items.${index}.taxrate`, product.taxrate);
    }
  };

  const calculateItemTotal = (item: any) => {
    const product = products.find(p => p.id === item.productId);
    if (!product) return 0;
    
    const totalExcl = item.quantity * item.unitprice * (1 - item.discount / 100);
    const totalTax = totalExcl * (item.taxrate / 100);
    return totalExcl + totalTax;
  };

  const calculateTotals = () => {
    const items = form.watch('items');
    const subtotal = items.reduce((sum, item) => {
      const totalExcl = item.quantity * item.unitprice * (1 - item.discount / 100);
      return sum + totalExcl;
    }, 0);
    const taxTotal = items.reduce((sum, item) => {
      const totalExcl = item.quantity * item.unitprice * (1 - item.discount / 100);
      const tax = totalExcl * (item.taxrate / 100);
      return sum + tax;
    }, 0);
    const total = subtotal + taxTotal;

    return { subtotal, taxTotal, total };
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 2
    });
  };

  const onSubmit = (data: z.infer<typeof finalInvoiceSchema>) => {
    createInvoiceMutation.mutate(data);
  };

  const { subtotal, taxTotal, total } = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/invoices/final">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {proformaId ? 'Convertir en facture finale' : 'Nouvelle facture finale'}
          </h1>
          <p className="text-muted-foreground">
            {proformaId ? 'Créer une facture finale à partir du proforma' : 'Créer une nouvelle facture finale'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
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
                  name="payment_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de paiement</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Type de paiement" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Espèces</SelectItem>
                          <SelectItem value="cheque">Chèque</SelectItem>
                          <SelectItem value="transfer">Virement</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                  name="duedate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date d'échéance</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bon de commande</FormLabel>
                      <FormControl>
                        <Input placeholder="Numéro BC" {...field} />
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
                        placeholder="Notes additionnelles..."
                        className="resize-none"
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
              <CardTitle>Articles</CardTitle>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un article
              </Button>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun article ajouté. Cliquez sur "Ajouter un article" pour commencer.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Prix unitaire</TableHead>
                      <TableHead>TVA %</TableHead>
                      <TableHead>Remise %</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const item = form.watch(`items.${index}`);
                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.productId`}
                              render={({ field }) => (
                                <Select
                                  onValueChange={(value) => updateItemProduct(index, value)}
                                  value={field.value}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Produit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products.map((product) => (
                                      <SelectItem key={product.id} value={product.id}>
                                        {product.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min="1"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.unitprice`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.taxrate`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.discount`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            {formatCurrency(calculateItemTotal(item))}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Totaux</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Sous-total (HT):</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA:</span>
                  <span>{formatCurrency(taxTotal)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total (TTC):</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link to="/invoices/final">Annuler</Link>
            </Button>
            <Button type="submit" disabled={createInvoiceMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {createInvoiceMutation.isPending ? 'Création...' : 'Créer la facture'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default NewFinalInvoice;