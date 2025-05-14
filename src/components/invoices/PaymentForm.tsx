
import React from 'react';
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

  const addPaymentMutation = useMutation({
    mutationFn: (values: z.infer<typeof paymentFormSchema>) =>
      addInvoicePayment(invoiceId, values),
    onSuccess: () => {
      // Force refetch to get the updated data
      queryClient.invalidateQueries({ queryKey: ['finalInvoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoicePayments', invoiceId] });
      toast({
        title: 'Payment Added',
        description: 'Payment has been recorded successfully',
      });
      // Reset the form
      form.reset();
      // Call onSuccess callback if provided
      onSuccess?.();
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
              Invoice Total:
            </span>
            <span className="font-medium">{formatCurrency(invoiceTotal)}</span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground mr-2">
              Remaining Debt:
            </span>
            <span className="font-medium">{formatCurrency(remainingDebt)}</span>
          </div>
        </div>

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value <= remainingDebt) {
                      field.onChange(value);
                    } else if (isNaN(value)) {
                      field.onChange(0);
                    } else {
                      field.onChange(remainingDebt);
                      toast({
                        title: "Maximum Payment",
                        description: "Payment cannot exceed remaining debt",
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
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Method</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
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
                  placeholder="Check number, transaction ID, etc."
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
                  placeholder="Additional information about this payment"
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
            {addPaymentMutation.isPending ? "Processing..." : "Add Payment"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PaymentForm;
