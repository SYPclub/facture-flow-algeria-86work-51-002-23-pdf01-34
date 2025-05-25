
import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addInvoicePayment } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Watch } from 'lucide-react';

const paymentFormSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  payment_date: z.string().min(1, 'Payment date is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormProps = {
  invoiceId: string;
  invoiceTotal: number;
  remainingDebt: number;
  onSuccess?: () => void;
  onCancel?: () => void;
};

const PaymentForm = ({
  invoiceId,
  invoiceTotal,
  remainingDebt,
  onSuccess,
  onCancel,
}: PaymentFormProps) => {
  const queryClient = useQueryClient();
  const [previewAmountPaid, setPreviewAmountPaid] = useState(invoiceTotal - remainingDebt);
  const [previewRemainingDebt, setPreviewRemainingDebt] = useState(remainingDebt);

  const form = useForm<z.infer<typeof paymentFormSchema>>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: remainingDebt,
      payment_date: new Date().toISOString().split('T')[0],
      paymentMethod: 'bank_transfer',
      reference: '',
      notes: '',
    },
  });

  // Reset form whenever invoiceTotal or remainingDebt changes
  useEffect(() => {
    form.setValue('amount', remainingDebt);
    setPreviewAmountPaid(invoiceTotal - remainingDebt);
    setPreviewRemainingDebt(remainingDebt);
  }, [form, invoiceTotal, remainingDebt]);

  // Watch for payment amount changes to update preview values
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'amount' || name === undefined) {
        const currentAmount = value.amount as number || 0;
        const baseAmountPaid = invoiceTotal - remainingDebt;
        
        // Calculate preview values
        const newAmountPaid = baseAmountPaid + currentAmount;
        const newRemainingDebt = Math.max(0, invoiceTotal - newAmountPaid);
        
        setPreviewAmountPaid(newAmountPaid);
        setPreviewRemainingDebt(newRemainingDebt);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, form.watch, invoiceTotal, remainingDebt]);

  const addPaymentMutation = useMutation({
    mutationFn: (values: z.infer<typeof paymentFormSchema>) =>
      addInvoicePayment(invoiceId, values),
    onSuccess: () => {
      // Force refetch to get the updated data - use exact query keys for maximum compatibility
      queryClient.invalidateQueries({ queryKey: ['finalInvoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoicePayments', invoiceId] });
      
      // Wait for queries to refresh before resetting form
      Promise.all([
        queryClient.refetchQueries({ queryKey: ['finalInvoice', invoiceId] }),
        queryClient.refetchQueries({ queryKey: ['invoicePayments', invoiceId] })
      ]).then(() => {
        toast({
          title: 'Payment Added',
          description: 'Payment has been recorded successfully',
        });
        
        // Reset the form with updated values
        form.reset({
          amount: 0,
          payment_date: new Date().toISOString().split('T')[0],
          paymentMethod: 'bank_transfer',
          reference: '',
          notes: '',
        });
        
        // Call onSuccess callback if provided
        onSuccess?.();
      });
    },
    onError: (error) => {
      console.error('Error adding payment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add payment. Please try again.',
      });
    },
  });

  const onSubmit = (values: z.infer<typeof paymentFormSchema>) => {
    console.log('Submitting payment:', values);
    addPaymentMutation.mutate(values);
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 2,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <span className="text-sm text-muted-foreground mr-2">
              Total de la facture:
            </span>
            <span className="font-medium">{formatCurrency(invoiceTotal)}</span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground mr-2">
              Dette restante:
            </span>
            <span className="font-medium">{formatCurrency(remainingDebt)}</span>
          </div>
        </div>

        {/* Live calculation preview */}
        <div className="bg-muted/50 p-3 rounded-md border border-muted">
          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
            <Watch size={16} />
            <span>Aperçu du paiement</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Après le paiement:</span>
            </div>
            <div className="text-right"></div>
            <div>
              <span className="mr-2">Montant payé:</span>
              <span className="font-medium text-green-600">{formatCurrency(previewAmountPaid)}</span>
            </div>
            <div>
              <span className="mr-2">Dette restante:</span>
              <span className={`font-medium ${previewRemainingDebt > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {formatCurrency(previewRemainingDebt)}
              </span>
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Montant</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => {
                    const value = Math.round(parseFloat(e.target.value) * 100) / 100;

                    if (!isNaN(value) && value <= remainingDebt) {
                      field.onChange(value);
                    } else if (isNaN(value)) {
                      field.onChange(0);
                    } else {
                      field.onChange(Math.round(remainingDebt * 100) / 100);
                      toast({
                        title: "Paiement maximum",
                        description: "Le paiement ne peut excéder la dette restante",
                        variant: "default",
                      });
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="payment_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date de paiement</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paymentMethod"
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
                  <SelectItem value="cash">Cash - Argent liquide</SelectItem>
                  <SelectItem value="bank_transfer">Virement</SelectItem>
                  <SelectItem value="check">cheque</SelectItem>
                  <SelectItem value="card">ccp</SelectItem>
                  <SelectItem value="other">Autres</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Numéro de chèque, numéro d'identification de la transaction, etc.."
                  {...field}
                  value={field.value || ''}
                />
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
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Informations complémentaires sur ce paiement"
                  rows={3}
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={addPaymentMutation.isPending}
          >
            {addPaymentMutation.isPending ? "Traitement..." : "Ajouter un paiement"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PaymentForm;
