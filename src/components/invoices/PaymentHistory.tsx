
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Trash2 } from "lucide-react";
import { getInvoicePayments, deleteInvoicePayment } from "@/integrations/supabase/client";
import { InvoicePayment } from "@/types";
import { useAuth, UserRole } from "@/contexts/AuthContext";

interface PaymentHistoryProps {
  invoiceId: string;
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ invoiceId }) => {
  const queryClient = useQueryClient();
  const { checkPermission } = useAuth();
  const canEdit = checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT]);

  const { data: payments, isLoading } = useQuery({
    queryKey: ["invoicePayments", invoiceId],
    queryFn: () => getInvoicePayments(invoiceId),
    enabled: !!invoiceId,
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: string) =>
      deleteInvoicePayment(paymentId, invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoicePayments", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["finalInvoice", invoiceId] });
      toast({
        title: "Payment Deleted",
        description: "Payment has been deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Error deleting payment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete payment. Please try again.",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("fr-DZ", {
      style: "currency",
      currency: "DZD",
      minimumFractionDigits: 2,
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("fr-DZ");
  };

  const formatPaymentMethod = (method: string) => {
    const methodMap: Record<string, string> = {
      cash: "Cash",
      bank_transfer: "Bank Transfer",
      check: "Check",
      card: "Card",
      other: "Other",
    };
    return methodMap[method] || method;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <span>Loading payments...</span>
        </div>
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No payments have been recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Notes</TableHead>
            {canEdit && <TableHead className="w-[80px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment: InvoicePayment) => (
            <TableRow key={payment.id}>
              <TableCell>{formatDate(payment.paymentDate)}</TableCell>
              <TableCell className="font-medium">
                {formatCurrency(payment.amount)}
              </TableCell>
              <TableCell>{formatPaymentMethod(payment.paymentMethod)}</TableCell>
              <TableCell>{payment.reference || "-"}</TableCell>
              <TableCell>{payment.notes || "-"}</TableCell>
              {canEdit && (
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Payment</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this payment? This
                          action cannot be undone and will update the invoice's
                          payment status.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            deletePaymentMutation.mutate(payment.id)
                          }
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PaymentHistory;
