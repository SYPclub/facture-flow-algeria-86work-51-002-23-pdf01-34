import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Button } from '@/components/ui/button';
import { mockDataService } from '@/services/mockDataService';
import { 
  supabase, 
  updateFinalInvoice,
  deleteFinalInvoice
} from '@/integrations/supabase/client';
import {
  useAuth,
  UserRole
} from '@/contexts/AuthContext';
import {
  ArrowLeft,
  File,
  FileCheck,
  Send,
  ThumbsDown,
  ThumbsUp,
  CreditCard,
  Banknote,
  Printer,
  Edit,
  Save,
  Trash2,
  Undo,
  Plus,
  X,
  FileText
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { exportFinalInvoiceToPDF } from '@/utils/exportUtils';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { generateId } from '@/types';

const finalInvoiceFormSchema = z.object({
  clientid: z.string().min(1, "Client is required"),
  notes: z.string().optional(),
  issuedate: z.string(),
  duedate: z.string(),
  status: z.string().optional(),
  paymentdate: z.string().optional(),
  paymentreference: z.string().optional(),
  items: z.array(
    z.object({
      id: z.string(),
      productId: z.string().min(1, 'Product is required'),
      quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
      unitprice: z.coerce.number().min(0, 'Price must be positive'),
      taxrate: z.coerce.number().min(0, 'Tax rate must be positive'),
      discount: z.coerce.number().min(0).max(100, 'Discount must be between 0 and 100'),
      product: z.object({
        name: z.string(),
        description: z.string(),
        code: z.string(),
        unitprice: z.number(),
        taxrate: z.number(),
        unit: z.string().optional(),
      }).optional(),
      unit: z.string().optional(),
      totalExcl: z.number().optional(),
      totalTax: z.number().optional(),
      total: z.number().optional()
    })
  ).min(1, 'At least one item is required')
});

const FinalInvoiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { checkPermission } = useAuth();
  const canEdit = checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT]);
  const isEditMode = window.location.pathname.includes('/edit/');
  const [totals, setTotals] = useState({ 
    subtotal: 0, 
    taxTotal: 0, 
    total: 0 
  });

  const { data: finalInvoice, isLoading } = useQuery({
    queryKey: ['finalInvoice', id],
    queryFn: () => mockDataService.getFinalInvoiceById(id!),
    enabled: !!id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => mockDataService.getClients(),
  });
  
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => mockDataService.getProducts(),
  });

  const form = useForm({
    resolver: zodResolver(finalInvoiceFormSchema),
    defaultValues: {
      clientid: finalInvoice?.clientid || '',
      notes: finalInvoice?.notes || '',
      issuedate: finalInvoice?.issuedate || '',
      duedate: finalInvoice?.duedate || '',
      status: finalInvoice?.status || 'unpaid',
      paymentdate: finalInvoice?.paymentdate || '',
      paymentreference: finalInvoice?.paymentreference || '',
      items: finalInvoice?.items || [],
    },
    values: {
      clientid: finalInvoice?.clientid || '',
      notes: finalInvoice?.notes || '',
      issuedate: finalInvoice?.issuedate || '',
      duedate: finalInvoice?.duedate || '',
      status: finalInvoice?.status || 'unpaid',
      paymentdate: finalInvoice?.paymentdate || '',
      paymentreference: finalInvoice?.paymentreference || '',
      items: finalInvoice?.items || [],
    }
  });

  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith('items') || name === 'items') {
        calculateTotals();
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const calculateTotals = () => {
    const items = form.getValues('items') || [];
    
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
    
    const total = subtotal + taxTotal;
    
    setTotals({ subtotal, taxTotal, total });
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
        taxrate: 0,
        discount: 0,
        unit: '', // Initialize unit field
        totalExcl: 0,
        totalTax: 0,
        total: 0
      }
    ]);
    // Force a re-render to show the new item
    setTimeout(() => calculateTotals(), 0);
  };

  const removeItem = (index: number) => {
    const currentItems = [...form.getValues('items')];
    currentItems.splice(index, 1);
    form.setValue('items', currentItems);
    setTimeout(() => calculateTotals(), 0);
  };

  const updateItemProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const items = [...form.getValues('items')];
      items[index] = {
        ...items[index],
        productId: productId,
        unitprice: product.unitprice,
        taxrate: product.taxrate,
        unit: product.unit || '', // Set unit from product
        product: product,
        totalExcl: items[index].quantity * product.unitprice * (1 - (items[index].discount || 0) / 100),
        totalTax: items[index].quantity * product.unitprice * (1 - (items[index].discount || 0) / 100) * (product.taxrate / 100),
        total: items[index].quantity * product.unitprice * (1 - (items[index].discount || 0) / 100) * (1 + (product.taxrate / 100))
      };
      form.setValue('items', items);
      setTimeout(() => calculateTotals(), 0);
    }
  };

  const updateFinalInvoiceMutation = useMutation({
    mutationFn: async (data) => {
      // Process items to calculate their totals
      const processedItems = data.items.map(item => {
        const quantity = item.quantity || 0;
        const unitprice = item.unitprice || 0;
        const taxrate = item.taxrate || 0;
        const discount = item.discount || 0;
        
        const totalExcl = quantity * unitprice * (1 - discount / 100);
        const totalTax = totalExcl * (taxrate / 100);
        const total = totalExcl + totalTax;
        
        return {
          ...item,
          totalExcl,
          totalTax,
          total
        };
      });

      // Calculate invoice totals
      const subtotal = processedItems.reduce((sum, item) => sum + item.totalExcl, 0);
      const taxTotal = processedItems.reduce((sum, item) => sum + item.totalTax, 0);
      const total = subtotal + taxTotal;

      // Use the mockDataService to update the invoice with all data including items
      return await mockDataService.updateFinalInvoice(id || '', {
        ...data,
        items: processedItems,
        subtotal,
        taxTotal,
        total
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finalInvoice', id] });
      toast({
        title: 'Invoice Updated',
        description: 'Invoice has been updated successfully'
      });
      navigate(`/invoices/final/${id}`);
    },
    onError: (error) => {
      console.error('Error updating invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Failed to update invoice. Please try again.'
      });
    }
  });

  const deleteFinalInvoiceMutation = useMutation({
    mutationFn: () => deleteFinalInvoice(id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finalInvoices'] });
      toast({
        title: 'Invoice Deleted',
        description: 'Invoice has been deleted successfully'
      });
      navigate('/invoices/final');
    },
    onError: (error) => {
      console.error('Error deleting invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Failed to delete invoice. Please try again.'
      });
    }
  });

  const statusUpdateMutation = useMutation({
    mutationFn: (status: 'unpaid' | 'paid' | 'cancelled' | 'credited') => {
      return updateFinalInvoice(id || '', { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finalInvoice', id] });
      toast({
        title: 'Status Updated',
        description: `Invoice status has been updated`
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update status. Please try again.'
      });
      console.error('Error updating invoice status:', error);
    }
  });

  const handleUpdateStatus = (status: 'unpaid' | 'paid' | 'cancelled' | 'credited') => {
    if (!id) return;
    statusUpdateMutation.mutate(status);
  };

  const handleExportPDF = () => {
    if (!finalInvoice) return;
    
    try {
      const result = exportFinalInvoiceToPDF(finalInvoice);
      if (result) {
        toast({
          title: 'PDF Generated',
          description: 'Invoice has been exported to PDF'
        });
      }
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Failed to generate PDF. Please try again.'
      });
    }
  };

  const onSubmit = (data) => {
    if (!id) return;
    updateFinalInvoiceMutation.mutate(data);
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 2
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-DZ');
  };

  const handleDeleteInvoice = () => {
    if (!id) return;
    deleteFinalInvoiceMutation.mutate();
  };

  const createDeliveryNote = () => {
    if (!finalInvoice) return;
    navigate(`/delivery/new?invoiceId=${finalInvoice.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="flex items-center gap-2">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"></span>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!finalInvoice) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex h-40 flex-col items-center justify-center gap-2">
            <p className="text-center text-muted-foreground">
              Invoice not found
            </p>
            <Button asChild variant="outline">
              <Link to="/invoices/final">Return to List</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusColor = {
    unpaid: "bg-yellow-500",
    paid: "bg-green-500",
    cancelled: "bg-red-500",
    credited: "bg-purple-500"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/invoices/final">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditMode ? `Edit Invoice: ${finalInvoice.number}` : `Invoice: ${finalInvoice.number}`}
          </h1>
        </div>
        {!isEditMode && (
          <Badge
            className={`${statusColor[finalInvoice.status]} text-white px-3 py-1 text-xs font-medium uppercase`}
          >
            {finalInvoice.status}
          </Badge>
        )}
      </div>

      {isEditMode ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
                {field => field.value && (
                  <div className="mt-4 space-y-2 border-t pt-4">
                    <div>
                      <strong className="font-semibold">NIF:</strong>{" "}
                      {clients.find(c => c.id === field.value)?.taxid}
                    </div>
                    <div>
                      <strong className="font-semibold">Address:</strong>{" "}
                      {clients.find(c => c.id === field.value)?.address || ''}
                    </div>
                    <div>
                      <strong className="font-semibold">City:</strong>{" "}
                      {clients.find(c => c.id === field.value)?.city || ''}, {clients.find(c => c.id === field.value)?.country || ''}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <strong className="font-semibold">Invoice Number:</strong>{" "}
                  {finalInvoice.number}
                </div>
                <FormField
                  control={form.control}
                  name="issuedate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Date</FormLabel>
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
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="credited">Credited</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.getValues('status') === 'paid' && (
                  <>
                    <FormField
                      control={form.control}
                      name="paymentdate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paymentreference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Reference</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                {finalInvoice.proformaId && (
                  <div>
                    <strong className="font-semibold">Proforma Invoice:</strong>{" "}
                    <Link
                      to={`/invoices/proforma/${finalInvoice.proformaId}`}
                      className="text-primary hover:underline"
                    >
                      View Proforma
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Items</CardTitle>
                  <CardDescription>Products and services included in this invoice</CardDescription>
                </div>
                <Button type="button" onClick={addItem} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="w-[80px]">Qty</TableHead>
                        <TableHead className="w-[80px]">Unit</TableHead>
                        <TableHead className="w-[120px]">Unit Price</TableHead>
                        <TableHead className="w-[80px]">Tax %</TableHead>
                        <TableHead className="w-[80px]">Disc %</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.getValues('items')?.map((item, index) => (
                        <TableRow key={item.id || index}>
                          <TableCell>
                            <Select
                              value={item.productId}
                              onValueChange={(value) => updateItemProduct(index, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a product" />
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
                              value={item.quantity}
                              onChange={(e) => {
                                const items = [...form.getValues('items')];
                                items[index].quantity = parseInt(e.target.value) || 1;
                                form.setValue('items', items);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              value={item.unit || ''}
                              onChange={(e) => {
                                const items = [...form.getValues('items')];
                                items[index].unit = e.target.value;
                                form.setValue('items', items);
                              }}
                            />
                          </TableCell>
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
                              value={item.discount || 0}
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
                    <span className="font-medium">Subtotal:</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Tax:</span>
                    <span>{formatCurrency(totals.taxTotal)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(totals.total)}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
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
                <Link to={`/invoices/final/${finalInvoice.id}`}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={updateFinalInvoiceMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <strong className="font-semibold">Name:</strong>{" "}
                {finalInvoice.client?.name}
              </div>
              <div>
                <strong className="font-semibold">NIF:</strong>{" "}
                {finalInvoice.client?.taxid}
              </div>
              <div>
                <strong className="font-semibold">Address:</strong>{" "}
                {finalInvoice.client?.address}
              </div>
              <div>
                <strong className="font-semibold">City:</strong>{" "}
                {finalInvoice.client?.city}, {finalInvoice.client?.country}
              </div>
              <div>
                <strong className="font-semibold">Contact:</strong>{" "}
                {finalInvoice.client?.phone} | {finalInvoice.client?.email}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <strong className="font-semibold">Invoice Number:</strong>{" "}
                {finalInvoice.number}
              </div>
              <div>
                <strong className="font-semibold">Issue Date:</strong>{" "}
                {formatDate(finalInvoice.issuedate)}
              </div>
              <div>
                <strong className="font-semibold">Due Date:</strong>{" "}
                {formatDate(finalInvoice.duedate)}
              </div>
              <div>
                <strong className="font-semibold">Status:</strong>{" "}
                <Badge
                  className={`${statusColor[finalInvoice.status]} text-white px-2 py-0.5 text-xs font-medium`}
                >
                  {finalInvoice.status}
                </Badge>
              </div>
              {finalInvoice.status === 'paid' && (
                <>
                  <div>
                    <strong className="font-semibold">Payment Date:</strong>{" "}
                    {finalInvoice.paymentdate ? formatDate(finalInvoice.paymentdate) : 'Not specified'}
                  </div>
                  <div>
                    <strong className="font-semibold">Payment Reference:</strong>{" "}
                    {finalInvoice.paymentreference || 'Not specified'}
                  </div>
                </>
              )}
              {finalInvoice.proformaId && (
                <div>
                  <strong className="font-semibold">Proforma Invoice:</strong>{" "}
                  <Link
                    to={`/invoices/proforma/${finalInvoice.proformaId}`}
                    className="text-primary hover:underline"
                  >
                    View Proforma
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>Products and services included in this invoice</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-center">Unit</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Tax %</TableHead>
                    <TableHead className="text-right">Discount %</TableHead>
                    <TableHead className="text-right">Total Excl.</TableHead>
                    <TableHead className="text-right">Tax Amount</TableHead>
                    <TableHead className="text-right">Total Incl.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finalInvoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.product?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.product?.code}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-center">{item.unit || item.product?.unit || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitprice)}</TableCell>
                      <TableCell className="text-right">{item.taxrate}%</TableCell>
                      <TableCell className="text-right">{item.discount}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.totalExcl)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.totalTax)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot>
                  <tr className="border-t">
                    <td colSpan={6} className="px-4 py-2 text-right font-semibold">
                      Subtotal:
                    </td>
                    <td colSpan={3} className="px-4 py-2 text-right">
                      {formatCurrency(finalInvoice.subtotal)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={6} className="px-4 py-2 text-right font-semibold">
                      Tax Total:
                    </td>
                    <td colSpan={3} className="px-4 py-2 text-right">
                      {formatCurrency(finalInvoice.taxTotal)}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td colSpan={6} className="px-4 py-2 text-right font-bold text-lg">
                      Total:
                    </td>
                    <td colSpan={3} className="px-4 py-2 text-right font-bold text-lg">
                      {formatCurrency(finalInvoice.total)}
                    </td>
                  </tr>
                </tfoot>
              </Table>
            </CardContent>
          </Card>

          {finalInvoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-line">{finalInvoice.notes}</CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Manage this invoice</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {canEdit && finalInvoice.status !== 'cancelled' && finalInvoice.status !== 'credited' && (
                <Button asChild variant="outline">
                  <Link to={`/invoices/final/edit/${finalInvoice.id}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Invoice
                  </Link>
                </Button>
              )}
              
              {finalInvoice.status === 'unpaid' && canEdit && (
                <Button
                  variant="outline"
                  className="bg-green-50 hover:bg-green-100"
                  onClick={() => handleUpdateStatus('paid')}
                  disabled={statusUpdateMutation.isPending}
                >
                  <CreditCard className="mr-2 h-4 w-4 text-green-600" />
                  Mark as Paid
                </Button>
              )}

              {finalInvoice.status === 'unpaid' && canEdit && (
                <Button
                  variant="outline"
                  className="bg-red-50 hover:bg-red-100"
                  onClick={() => handleUpdateStatus('cancelled')}
                  disabled={statusUpdateMutation.isPending}
                >
                  <X className="mr-2 h-4 w-4 text-red-600" />
                  Cancel Invoice
                </Button>
              )}

              {finalInvoice.status === 'paid' && canEdit && (
                <Button
                  variant="outline"
                  className="bg-yellow-50 hover:bg-yellow-100"
                  onClick={() => handleUpdateStatus('unpaid')}
                  disabled={statusUpdateMutation.isPending}
                >
                  <Undo className="mr-2 h-4 w-4 text-yellow-600" />
                  Mark as Unpaid
                </Button>
              )}

              <Button variant="outline" onClick={handleExportPDF}>
                <Printer className="mr-2 h-4 w-4" />
                Print / Download
              </Button>
              
              <Button variant="outline" onClick={createDeliveryNote}>
                <FileText className="mr-2 h-4 w-4" />
                Create Delivery Note
              </Button>
              
              {canEdit && finalInvoice.status === 'unpaid' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this invoice.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteInvoice}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default FinalInvoiceDetail;
