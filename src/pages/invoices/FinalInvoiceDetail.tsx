import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { mockDataService } from '@/services/mockDataService';
import { 
  supabase, 
  updateFinalInvoice, 
  deleteFinalInvoice,
  getInvoicePayments
} from '@/integrations/supabase/client';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Banknote,
  FileText,
  Ban,
  Check,
  Edit,
  Save,
  Printer,
  Trash2,
  Undo,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { exportFinalInvoiceToPDF } from '@/utils/exportUtils';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import PaymentForm from '@/components/invoices/PaymentForm';
import PaymentHistory from '@/components/invoices/PaymentHistory';

const finalInvoiceFormSchema = z.object({
  notes: z.string().optional(),
  issuedate: z.string().optional(),
  duedate: z.string().optional(),
  status: z.string(),
  paymentdate: z.string().optional(),
  paymentreference: z.string().optional(),
  bc: z.string().optional(),
  stamp_tax: z.string().optional(),
  payment_type: z.string().optional(),
});

const FinalInvoiceDetail = () => {
  const paymentMethods = {
        1: 'espèces',
        2: 'Cheque / Virement',
        3: 'carte',
        // Add more as needed
      };
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { checkPermission } = useAuth();
  const canEdit = checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT]);
  const isEditMode = window.location.pathname.includes('/edit/');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState({
    amountPaid: 0,
    clientDebt: 0
  });

  // Main invoice query
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['finalInvoice', id],
    queryFn: () => mockDataService.getFinalInvoiceById(id!),
    enabled: !!id,
  });

  // Get payment data
  const { data: payments = [], refetch: refetchPayments } = useQuery({
    queryKey: ['invoicePayments', id],
    queryFn: () => getInvoicePayments(id!),
    enabled: !!id,
  });

  // Calculate payment summary
  useEffect(() => {
    if (invoice) {
      // If we have specific amount_paid and client_debt from database, use those
      if (invoice.amount_paid !== undefined && invoice.client_debt !== undefined) {
        setPaymentSummary({
          amountPaid: invoice.amount_paid,
          clientDebt: invoice.client_debt
        });
      } else {
        // Otherwise calculate from payments
        const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const remainingDebt = Math.max(0, invoice.total - totalPaid);
        
        setPaymentSummary({
          amountPaid: totalPaid,
          clientDebt: remainingDebt
        });
      }
    }
  }, [invoice, payments]);

  // Form handling
  const form = useForm({
    resolver: zodResolver(finalInvoiceFormSchema),
    defaultValues: {
      notes: invoice?.notes || '',
      issuedate: invoice?.issuedate || null,
      duedate: invoice?.duedate || null,
      status: invoice?.status || 'NonPayé',
      paymentdate: invoice?.paymentDate || '',
      paymentreference: invoice?.paymentReference || '',
      bc: invoice?.bc || '',
      stamp_tax: invoice?.stamp_tax || '',
      payment_type: invoice?.payment_type || '',
    },
    values: {
      notes: invoice?.notes || '',
      issuedate: invoice?.issuedate || null,
      duedate: invoice?.duedate || null,
      status: invoice?.status || 'NonPayé',
      paymentdate: invoice?.paymentDate || '',
      paymentreference: invoice?.paymentReference || '',
      bc: invoice?.bc || '',
      stamp_tax: invoice?.stamp_tax || '',
      payment_type: invoice?.payment_type || '',
    }
  });

  // Invoice update mutation
  const updateInvoiceMutation = useMutation({
    mutationFn: (data: any) => updateFinalInvoice(id || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finalInvoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoicePayments', id] });
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

  // Invoice deletion mutation
  const deleteInvoiceMutation = useMutation({
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

  // Status update mutation
  const statusUpdateMutation = useMutation({
    mutationFn: (data: any) => {
      return updateFinalInvoice(id || '', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finalInvoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoicePayments', id] });
      refetchPayments();
      toast({
        title: 'Status Updated',
        description: 'Invoice status has been updated successfully'
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Status Update Failed',
        description: 'Failed to update invoice status. Please try again.'
      });
      console.error('Error updating invoice status:', error);
    }
  });

  // Handle status update
  const handleUpdateStatus = (status: 'NonPayé' | 'payé' | 'partially_paid' | 'annulé' | 'credited', additionalData = {}) => {
    if (!id || !invoice) return;
    
    let updateData = { status, ...additionalData };
    
    // If marking as payé, calculate the amount payé and client debt
    if (status === 'payé' && !additionalData.amount_paid) {
      updateData = {
        ...updateData,
        amount_paid: invoice.total,
        client_debt: 0
      };
    }
    
    // If reverting to NonPayé, handle payment data
    if (status === 'NonPayé') {
      // Don't reset amount_paid if there are actual payments, just status
      const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      if (totalPaid > 0) {
        updateData = {
          ...updateData,
          // Keep the amount_paid from payments 
          amount_paid: totalPaid,
          // Recalculate client debt
          client_debt: Math.max(0, invoice.total - totalPaid)
        };
      } else {
        // No payments, reset everything
        updateData = {
          ...updateData,
          amount_paid: 0,
          client_debt: invoice.total,
          paymentdate: null,
        };
      }
    }
    
    statusUpdateMutation.mutate(updateData);
  };

  // Mark as payé handler 
  const handleMarkAsPaid = () => {
    if (!invoice) return;
    
    const payment_date = new Date().toISOString().split('T')[0];
    handleUpdateStatus('payé', { 
      payment_date, 
      amount_paid: invoice.total, 
      client_debt: 0 
    });
  };

  // Export to PDF handler
  const handleExportPDF = () => {
    if (!invoice) return;
    
    try {
      const result = exportFinalInvoiceToPDF(invoice);
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

  // Delete invoice handler
  const handleDeleteInvoice = () => {
    if (!id) return;
    deleteInvoiceMutation.mutate();
  };

  // Form submission handler
  const onSubmit = (data: any) => {
    if (!id) return;
    updateInvoiceMutation.mutate(data);
  };

  // Helper functions
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 2
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-DZ');
  };

  const getPaymentTypeIcon = (paymentType: string) => {
    if (paymentType === 'cash') {
      return <Banknote className="h-4 w-4 text-green-600 mr-2" />;
    }
    return <CreditCard className="h-4 w-4 text-blue-600 mr-2" />;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="flex items-center gap-2">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"></span>
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  // Invoice not found state
  if (!invoice) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex h-40 flex-col items-center justify-center gap-2">
            <p className="text-center text-muted-foreground">
              Facture non trouvée
            </p>
            <Button asChild variant="outline">
              <Link to="/invoices/final">Retour à la liste</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Status styling
  const statusColor = {
    NonPayé: "bg-amber-500",
    payé: "bg-green-500",
    partially_paid: "bg-blue-500",
    annulé: "bg-red-500",
    credited: "bg-purple-500",
  };

  // Calculate invoice status based on payments
  const amountPaid = paymentSummary.amountPaid;
  const clientDebt = paymentSummary.clientDebt;

  // Compute status from payment amounts
  let computedStatus = invoice.status;
  if (amountPaid >= invoice.total) {
    computedStatus = 'payé';
  } else if (amountPaid > 0) {
    computedStatus = 'partially_paid';
  } else if (invoice.status !== 'annulé' && invoice.status !== 'credited') {
    computedStatus = 'NonPayé';
  }

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
            {isEditMode ? `Edit Invoice: ${invoice.number}` : `Invoice: ${invoice.number}`}
          </h1>
        </div>
        {!isEditMode && (
          <Badge
            className={`${statusColor[computedStatus]} text-white px-3 py-1 text-xs font-medium uppercase`}
          >
            {computedStatus}
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
              <CardContent className="p-6 pt-0 grid gap-4 sm:grid-cols-3">
                <div>
                  <strong className="font-semibold">Nom:</strong>{" "}
                  {invoice.client?.name}
                </div>
                <div>
                  <strong className="font-semibold">NIF:</strong>{" "}
                  {invoice.client?.taxid}
                </div>
                <div>
                  <strong className="font-semibold">TIN:</strong>{" "}
                  {invoice.client?.city}
                </div>
                <div>
                  <strong className="font-semibold">NIS:</strong>{" "}
                  {invoice.client?.nis}
                </div>
                <div>
                  <strong className="font-semibold">RC:</strong>{" "}
                  {invoice.client?.rc}
                </div>
                <div>
                  <strong className="font-semibold">A.I:</strong>{" "}
                  {invoice.client?.ai}
                </div>
                <div>
                  <strong className="font-semibold">RIB:</strong>{" "}
                  {invoice.client?.rib}
                </div>
                <div>
                  <strong className="font-semibold">CCP:</strong>{" "}
                  {invoice.client?.ccp}
                </div>
                <div>
                  <strong className="font-semibold">nom du contact:</strong>{" "}
                  {invoice.client?.contact}
                </div>
                <div>
                  <strong className="font-semibold">téléphone de contact:</strong>{" "}
                  {invoice.client?.telcontact}
                </div>
                <div>
                  <strong className="font-semibold">Address:</strong>{" "}
                  {invoice.client?.address}
                </div>
                
                <div>
                  <strong className="font-semibold">Contact:</strong>{" "}
                  {invoice.client?.phone} | {invoice.client?.email}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Détails de la facture</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div>
                  <strong className="font-semibold">Numéro de la facture:</strong>{" "}
                  {invoice.number}
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
                  name="bc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bon de Commande:</FormLabel>
                      <FormControl>
                        <Input type="BC .." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="paymentReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mode de paiement</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner le mode de paiement" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Chèque/virement</SelectItem>
                          <SelectItem value="2">Espèce</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Statut</FormLabel>
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
                          <SelectItem value="NonPayé">Non payé</SelectItem>
                          <SelectItem value="partially_paid">Partiellement Payé</SelectItem>
                          <SelectItem value="payé">Payé</SelectItem>
                          <SelectItem value="annulé">Annulé</SelectItem>
                          <SelectItem value="credited">Archiver</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                

                {invoice.proformaId && (
                  <div>
                    <strong className="font-semibold">De Proforma:</strong>{" "}
                    <Link
                      to={`/invoices/proforma/${invoice.proformaId}`}
                      className="text-primary hover:underline"
                    >
                      Voir Proforma
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Articles</CardTitle>
                <CardDescription>Produits et services inclus dans cette facture</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-right">Qté</TableHead>
                      <TableHead className="text-right">Unité</TableHead>
                      <TableHead className="text-right">Prix unitaire</TableHead>
                      <TableHead className="text-right">Tax %</TableHead>
                      <TableHead className="text-right">Remise</TableHead>
                      <TableHead className="text-right">Total Excl..</TableHead>
                      <TableHead className="text-right">Montant de l'impôt</TableHead>
                      <TableHead className="text-right">Total inclus.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.product?.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.product?.code}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item.unit}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitprice)}</TableCell>
                        <TableCell className="text-right">{item.taxrate}%</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.discount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.totalExcl)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.totalTax)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
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
                <Link to={`/invoices/final/${invoice.id}`}>Annuler</Link>
              </Button>
              <Button type="submit" disabled={updateInvoiceMutation.isPending}>
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
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div>
                  <strong className="font-semibold">Nom:</strong>{" "}
                  {invoice.client?.name}
                </div>
                <div>
                  <strong className="font-semibold">NIF:</strong>{" "}
                  {invoice.client?.taxid} 
                </div>
                <div>
                  <strong className="font-semibold">TIN:</strong>{" "}
                  {invoice.client?.city}
                </div>
                <div>
                  <strong className="font-semibold">NIS:</strong>{" "}
                  {invoice.client?.nis}
                </div>
                <div>
                  <strong className="font-semibold">RC:</strong>{" "}
                  {invoice.client?.rc}
                </div>
                <div>
                  <strong className="font-semibold">A.I:</strong>{" "}
                  {invoice.client?.ai}
                </div>
                <div>
                  <strong className="font-semibold">RIB:</strong>{" "}
                  {invoice.client?.rib}
                </div>
                <div>
                  <strong className="font-semibold">CCP:</strong>{" "}
                  {invoice.client?.ccp}
                </div>
                <div>
                  <strong className="font-semibold">nom du contact:</strong>{" "}
                  {invoice.client?.contact}
                </div>
                <div>
                  <strong className="font-semibold">téléphone de contact:</strong>{" "}
                  {invoice.client?.telcontact}
                </div>
                <div>
                  <strong className="font-semibold">Address:</strong>{" "}
                  {invoice.client?.address}
                </div>
                
                <div>
                  <strong className="font-semibold">Contact:</strong>{" "}
                  {invoice.client?.phone} | {invoice.client?.email}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Détails de la facture</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div>
                  <strong className="font-semibold">Numéro de la facture:</strong>{" "}
                  {invoice.number}
                </div>
                <div>
                  <strong className="font-semibold">Date d'émission:</strong>{" "}
                  {formatDate(invoice.issuedate)}
                </div>
                <div>
                  <strong className="font-semibold">Mode de paiement:</strong>{" "}
                  
                    
                    {invoice.payment_type}
                    
                  
                </div>
                <div>
                  <strong className="font-semibold">Statut:</strong>{" "}
                  <Badge
                    className={`${statusColor[computedStatus]} text-white px-2 py-0.5 text-xs font-medium`}
                  >
                    {computedStatus}
                  </Badge>
                </div>
                
                <div>
                  <strong className="font-semibold">Montant total:</strong>{" "}
                  {formatCurrency(invoice.total)}
                </div>
                <div>
                  <strong className="font-semibold">Montant payé:</strong>{" "}
                  {formatCurrency(amountPaid)}
                </div>
                <div>
                  <strong className="font-semibold">Dette restante:</strong>{" "}
                  <span className={clientDebt <= 0 ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                    {formatCurrency(clientDebt > 0 ? clientDebt : 0)}
                  </span>
                </div>
                
                

                {invoice.proformaId && (
                  <div>
                    <strong className="font-semibold">De Proforma:</strong>{" "}
                    <Link
                      to={`/invoices/proforma/${invoice.proformaId}`}
                      className="text-primary hover:underline"
                    >
                      Voir Proforma
                    </Link>
                  </div>
                )}
                <div>
                  <strong className="font-semibold">Bon de commande:</strong>{" "}
                  {invoice.bc}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Articles</CardTitle>
              <CardDescription>Produits et services inclus dans cette facture</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Qté</TableHead>
                    <TableHead className="text-right">unité</TableHead>
                    <TableHead className="text-right">Prix unitaire</TableHead>
                    <TableHead className="text-right">Tax %</TableHead>
                    <TableHead className="text-right">Remise</TableHead>
                    <TableHead className="text-right">Total Excl..</TableHead>
                    <TableHead className="text-right">Montant de l'impôt</TableHead>
                    <TableHead className="text-right">Total inclus.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.product?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.product?.code}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item.unit}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitprice)}</TableCell>
                      <TableCell className="text-right">{item.taxrate}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.discount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.totalExcl)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.totalTax)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot>
                  <tr className="border-t">
                    <td colSpan={5} className="px-4 py-2 text-right font-semibold">
                      Sous-total:
                    </td>
                    <td colSpan={3} className="px-4 py-2 text-right">
                      {formatCurrency(invoice.subtotal)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-right font-semibold">
                      TVA:
                    </td>
                    <td colSpan={3} className="px-4 py-2 text-right">
                      {formatCurrency(invoice.taxTotal)}
                    </td>
                  </tr>
                  
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-right font-semibold">
                      droit de timbre:
                    </td>
                    <td colSpan={3} className="px-4 py-2 text-right">
                      {formatCurrency(invoice.stamp_tax)}
                    </td>
                  </tr>
                  
                  <tr className="border-t">
                    <td colSpan={5} className="px-4 py-2 text-right font-bold text-lg">
                      Total:
                    </td>
                    <td colSpan={3} className="px-4 py-2 text-right font-bold text-lg">
                      {formatCurrency(invoice.total)}
                    </td>
                  </tr>
                </tfoot>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Historique des paiements</span>
                {canEdit && clientDebt > 0 && (
                  <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="ml-auto">
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter un paiement
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Enregistrer un nouveau paiement</DialogTitle>
                      </DialogHeader>
                      <PaymentForm 
                        invoiceId={id || ''} 
                        invoiceTotal={invoice.total} 
                        remainingDebt={clientDebt}
                        onSuccess={() => {
                          setIsPaymentDialogOpen(false);
                          refetchPayments();
                          queryClient.invalidateQueries({ queryKey: ['finalInvoice', id] });
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentHistory 
                invoiceId={id || ''} 
                onPaymentDeleted={() => {
                  refetchPayments();
                  queryClient.invalidateQueries({ queryKey: ['finalInvoice', id] });
                }}
              />
            </CardContent>
          </Card>

          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-line">{invoice.notes}</CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Gérer cette facture</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {canEdit && invoice.status !== 'credited' && (
                <Button asChild variant="outline">
                  <Link to={`/invoices/final/edit/${invoice.id}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Modifier la facture
                  </Link>
                </Button>
              )}
              
              {computedStatus === 'NonPayé' && canEdit && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Marquer comme payé</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette opération marquera la facture comme payée et fixera la date de paiement à aujourd'hui.
                        Souhaitez-vous ajouter une référence de paiement ?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          const paymentdate = new Date().toISOString().split('T')[0];
                          const data = {
                            status: 'payé',
                            payment_date: paymentdate,
                            amount_paid: invoice.total,
                            client_debt: 0
                            
                          };
                          statusUpdateMutation.mutate(data);
                        }}
                      >
                        Marquer comme payé
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {computedStatus !== 'annulé' && computedStatus !== 'credited' && canEdit && clientDebt > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="bg-blue-50 hover:bg-blue-100">
                      <Plus className="mr-2 h-4 w-4 text-blue-600" />
                      Ajouter un paiement
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Enregistrer un nouveau paiement</DialogTitle>
                    </DialogHeader>
                    <PaymentForm 
                      invoiceId={id || ''} 
                      invoiceTotal={invoice.total} 
                      remainingDebt={clientDebt}
                      onSuccess={() => {
                        refetchPayments();
                        queryClient.invalidateQueries({ queryKey: ['finalInvoice', id] });
                      }}
                    />
                  </DialogContent>
                </Dialog>
              )}

              {computedStatus === 'NonPayé' && canEdit && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="bg-red-50 hover:bg-red-100">
                      <Ban className="mr-2 h-4 w-4 text-red-600" />
                      Annuler la facture
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Annuler la facture</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette opération marquera la facture comme étant annulée.
                        Etes-vous sûr de vouloir continuer ?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Non, gardez-le</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleUpdateStatus('annulé')}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Oui, annuler
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {canEdit && computedStatus === 'NonPayé' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer une facture</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action ne peut être annulée. Cette action supprimera définitivement cette facture.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteInvoice}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {(computedStatus === 'payé' || computedStatus === 'partially_paid' || computedStatus === 'annulé') && canEdit && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="bg-yellow-50 hover:bg-yellow-100">
                      <Undo className="mr-2 h-4 w-4 text-yellow-600" />
                      Revenir à l'impayé
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revenir à l'impayé</AlertDialogTitle>
                      <AlertDialogDescription>
                        Le statut de la facture redeviendra alors impayé.
                        Tous les enregistrements de paiement existants seront conservés, mais le statut sera modifié.
                        Êtes-vous sûr de vouloir continuer ?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleUpdateStatus('NonPayé')}
                      >
                        Confirmer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              
              <Button variant="outline" onClick={handleExportPDF}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimer / Télécharger
              </Button>
              
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default FinalInvoiceDetail;
