import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { mockDataService } from '@/services/mockDataService';
import {
  ArrowLeft,
  Printer,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { exportDeliveryNoteToPDF } from '@/utils/exportUtils';

const DeliveryNoteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: deliveryNote, isLoading } = useQuery({
    queryKey: ['deliveryNote', id],
    queryFn: () => mockDataService.getDeliveryNoteById(id!),
    enabled: !!id,
  });

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 2
    });
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-DZ');
  };

  const handleExportPDF = () => {
    if (!deliveryNote) return;

    try {
      const result = exportDeliveryNoteToPDF(deliveryNote);
      if (result) {
        toast({
          title: 'PDF Generated',
          description: 'Delivery note has been exported to PDF'
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

  if (!deliveryNote) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex h-40 flex-col items-center justify-center gap-2">
            <p className="text-center text-muted-foreground">
              Delivery note not found
            </p>
            <Button asChild variant="outline">
              <Link to="/delivery">Return to List</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusColor = {
    pending: "bg-gray-500",
    delivered: "bg-green-500",
    cancelled: "bg-red-500"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/delivery">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            Delivery Note: {deliveryNote.number}
          </h1>
        </div>
        <Badge
          className={`${statusColor[deliveryNote.status]} text-white px-3 py-1 text-xs font-medium uppercase`}
        >
          {deliveryNote.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Note Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <strong className="font-semibold">Number:</strong>{" "}
            {deliveryNote.number}
          </div>
          <div>
            <strong className="font-semibold">Issue Date:</strong>{" "}
            {formatDate(deliveryNote.issuedate)}
          </div>
          <div>
            <strong className="font-semibold">Delivery Date:</strong>{" "}
            {formatDate(deliveryNote.deliverydate)}
          </div>
          <div>
            <strong className="font-semibold">Status:</strong>{" "}
            <Badge
              className={`${statusColor[deliveryNote.status]} text-white px-2 py-0.5 text-xs font-medium`}
            >
              {deliveryNote.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <strong className="font-semibold">Name:</strong>{" "}
            {deliveryNote.client?.name}
          </div>
          <div>
            <strong className="font-semibold">Address:</strong>{" "}
            {deliveryNote.client?.address}
          </div>
          <div>
            <strong className="font-semibold">City:</strong>{" "}
            {deliveryNote.client?.city}, {deliveryNote.client?.country}
          </div>
          <div>
            <strong className="font-semibold">Contact:</strong>{" "}
            {deliveryNote.client?.phone} | {deliveryNote.client?.email}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transportation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <strong className="font-semibold">Driver Name:</strong>{" "}
            {deliveryNote.drivername || '-'}
          </div>
          <div>
            <strong className="font-semibold">Truck ID:</strong>{" "}
            {deliveryNote.truck_id || '-'}
          </div>
          <div>
            <strong className="font-semibold">Delivery Company:</strong>{" "}
            {deliveryNote.delivery_company || '-'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>Products included in this delivery note</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-center">Unit</TableHead> {/* Added Unit column */}
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveryNote?.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.product?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.product?.code}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-center">{item.unit || item.product?.unit || '-'}</TableCell> {/* Display Unit */}
                  <TableCell className="text-right">{formatCurrency(item.unitprice)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {deliveryNote.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-line">{deliveryNote.notes}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Manage this delivery note</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExportPDF}>
            <Printer className="mr-2 h-4 w-4" />
            Print / Download
          </Button>
          <Button asChild variant="outline">
            <Link to={`/delivery/edit/${deliveryNote.id}`}>
              Edit Delivery Note
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryNoteDetail;
