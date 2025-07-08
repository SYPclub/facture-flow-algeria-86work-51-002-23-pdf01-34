import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  CreditCard,
  Banknote 
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getCurrentDate, getFutureDate, generateId } from '@/types';

const proformaSchema = z.object({
  clientid: z.string().min(1, 'Client is required'),
  issuedate: z.string().min(1, 'Issue date is required'),
  duedate: z.string().min(1, 'Due date is required'),
  notes: z.string().optional(),
  bc: z.string().optional(),
  paymentType: z.enum(['cheque', 'cash']),
  items: z.array(
    z.object({
      id: z.string(),
      productId: z.string().min(1, 'Product is required'),
      quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
      unitprice: z.coerce.number().min(0, 'Price must be positive'),
      unit: z.coerce.string(),
      taxrate: z.coerce.number().min(0, 'Tax rate must be positive'),
      discount: z.coerce.number().min(0).max(100, 'Discount must be between 0 and 100'),
      product: z.object({
        name: z.string(),
        description: z.string(),
        code: z.string(),
        unitprice: z.number(),
        unit: z.string(),
        taxrate: z.number(),
      }).optional()
    })
  ).min(1, 'At least one item is required')
});

type ProformaFormValues = z.infer<typeof proformaSchema>;

const NewProformaInvoice = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { checkPermission } = useAuth();
  const canCreate = checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALESPERSON]);
  const [totals, setTotals] = useState({ 
    subtotal: 0, 
    taxTotal: 0, 
    stampTax: 0,
    total: 0 
  });
  
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => mockDataService.getClients(),
  });
  
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => mockDataService.getProducts(),
  });

  const form = useForm<ProformaFormValues>({
    resolver: zodResolver(proformaSchema),
    defaultValues: {
      clientid: '',
      issuedate: getCurrentDate(),
      duedate: getFutureDate(30),
      notes: '',
      paymentType: 'cheque',
      items: [
        {
          id: generateId(),
          productId: '',
          quantity: 1,
          unitprice: 0,
          unit: '',
          taxrate: 0,
          discount: 0
        }
      ]
    }
  });

  const calculateStampTax = (paymentType: string, subtotal: number) => {
    if (paymentType !== "cash") return 0;

    if (subtotal > 100000) {
      return subtotal * 0.02;
    } else if (subtotal > 30000) {
      return subtotal * 0.015;
    } else if (subtotal > 300) {
      return subtotal * 0.01;
    } else {
      return 0;
    }
  };

  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith('items') || name === 'items' || name === 'paymentType') {
        calculateTotals();
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const calculateTotals = () => {
    const items = form.getValues('items') || [];
    const paymentType = form.getValues('paymentType');
    
    let subtotal = 0;
    let taxTotal = 0;
    
    items.forEach(item => {
      if (!item.productId) return;
      
      const quantity = item.quantity || 0;
      const unitprice = item.unitprice || 0;
      const taxrate = item.taxrate || 0;
      const discount = item.discount || 0;
      
      const itemSubtotal = quantity * unitprice * (1 - discount / 100);
      const itemTax = itemSubtotal * (taxrate / 100);
      
      subtotal += itemSubtotal;
      taxTotal += itemTax;
    });
    
    const stampTax = calculateStampTax(paymentType, subtotal);
    const total = subtotal + taxTotal + stampTax;
    
    setTotals({ subtotal, taxTotal, stampTax, total });
  };

  const addItem = () => {
    const currentItems = form.getValues('items') || [];
    form.setValue('items', [
      ...currentItems,
      {
        id: generateId(),
        productId: '',
        quantity: 1,
        unitprice: 0,
        unit: '',
        taxrate: 0,
        discount: 0
      }
    ]);
  };

  const removeItem = (index: number) => {
    const currentItems = [...form.getValues('items')];
    currentItems.splice(index, 1);
    form.setValue('items', currentItems);
  };

  const updateItemProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const items = [...form.getValues('items')];
      items[index] = {
        ...items[index],
        productId: productId,
        unitprice: product.unitprice,
        unit: product.unit,
        taxrate: product.taxrate,
        product: product
      };
      form.setValue('items', items);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-DZ', { 
      style: 'currency', 
      currency: 'DZD',
      minimumFractionDigits: 2
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data: ProformaFormValues) => {
      const items = data.items.map(item => {
        const quantity = item.quantity || 0;
        const unitprice = item.unitprice || 0;
        const taxrate = item.taxrate || 0;
        const discount = item.discount || 0;
        
        const totalExcl = quantity * unitprice * (1 - discount / 100);
        const totalTax = totalExcl * (taxrate / 100);
        const total = totalExcl + totalTax;
        
        return {
          id: generateId(),
          productId: item.productId,
          product: products.find(p => p.id === item.productId),
          quantity,
          unitprice,
          unit: item.unit,
          taxrate,
          discount,
          totalExcl,
          totalTax,
          total
        };
      });
      
      const subtotal = items.reduce((sum, item) => sum + item.totalExcl, 0);
      const taxTotal = items.reduce((sum, item) => sum + item.totalTax, 0);
      const stampTax = calculateStampTax(data.paymentType, subtotal);
      const total = subtotal + taxTotal + stampTax;
      
      const proforma = {
        clientid: data.clientid,
        client: clients.find(c => c.id === data.clientid),
        issuedate: data.issuedate,
        duedate: data.duedate,
        notes: data.notes || '',
        status: 'draft',
        payment_type: data.paymentType,
        stamp_tax: stampTax,
        bc: data.bc,
        items,
        subtotal,
        taxTotal,
        total
      };
      
      return mockDataService.createProformaInvoice(proforma);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proformaInvoices'] });
      toast({
        title: 'Proforma Invoice Created',
        description: 'Proforma invoice has been successfully created'
      });
      navigate('/invoices/proforma');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create proforma invoice. Please try again.'
      });
      console.error('Error creating proforma invoice:', error);
    }
  });

  const onSubmit = (data: ProformaFormValues) => {
    if (!canCreate) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You do not have permission to create proforma invoices'
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
              Vous n'avez pas l'autorisation de créer des factures pro forma
            </p>
            <Button asChild variant="outline">
              <Link to="/invoices/proforma">Retour à la liste</Link>
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
            <Link to="/invoices/proforma">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            Créer une nouvelle facture pro forma
          </h1>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations sur le client</CardTitle>
              <CardDescription>Sélectionnez le client pour ce formulaire</CardDescription>
            </CardHeader>
            <CardContent>
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
                          <SelectValue placeholder="Select a client" />
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Proforma Details</CardTitle>
              <CardDescription>Détails de la facture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
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
              </div>

              <FormField
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode de paiement</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="cheque" />
                          </FormControl>
                          <FormLabel className="flex items-center">
                            <CreditCard className="mr-2 h-4 w-4" />
                            Cheque/virment
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="cash" />
                          </FormControl>
                          <FormLabel className="flex items-center">
                            <Banknote className="mr-2 h-4 w-4" />
                            Espece
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Saisir toute information supplémentaire pour cette facture proforma"
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
                <CardDescription>Produits et services pour ce formulaire</CardDescription>
              </div>
              <Button type="button" onClick={addItem} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" /> Ajouter un élément
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead className="w-[120px]">Qté</TableHead>
                      <TableHead className="w-[120px]">unité</TableHead>
                      <TableHead className="w-[120px]">Prix unitaire</TableHead>
                      <TableHead className="w-[120px]">Tax %</TableHead>
                      <TableHead className="w-[120px]">Remise</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.getValues('items')?.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
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
                          {form.formState.errors.items?.[index]?.productId && (
                            <p className="text-xs text-destructive mt-1">
                              {form.formState.errors.items?.[index]?.productId?.message}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            defaultValue={item.quantity}
                            onChange={(e) => {
                              const items = [...form.getValues('items')];
                              items[index].quantity = parseInt(e.target.value) || 1;
                              form.setValue('items', items);
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right">{item.unit}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitprice}
                            onChange={(e) => {
                              const items = [...form.getValues('items')];
                              items[index].unitprice = parseFloat(e.target.value) || 0;
                              form.setValue('items', items);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.taxrate}
                            onChange={(e) => {
                              const items = [...form.getValues('items')];
                              items[index].taxrate = parseFloat(e.target.value) || 0;
                              form.setValue('items', items);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) => {
                              const items = [...form.getValues('items')];
                              items[index].discount = parseFloat(e.target.value) || 0;
                              form.setValue('items', items);
                            }}
                          />
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
              
              <div className="mt-4 space-y-2 border-t pt-4 text-right">
                <div className="flex justify-between">
                  <span className="font-medium">Sous-total:</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Tax:</span>
                  <span>{formatCurrency(totals.taxTotal)}</span>
                </div>
                {form.getValues('paymentType') === 'cash' && (
                  <div className="flex justify-between">
                    <span className="font-medium">droit de timbre:</span>
                    <span>{formatCurrency(totals.stampTax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link to="/invoices/proforma">Annuler</Link>
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
                  Créer un proforma
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default NewProformaInvoice;
