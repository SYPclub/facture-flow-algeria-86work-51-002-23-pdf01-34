
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Client, ProformaInvoice, FinalInvoice, Product } from '@/types';

export interface DashboardStats {
  activeClients: number;
  proformaInvoices: number;
  finalInvoices: number;
  products: number;
  recentProformas: ProformaInvoice[];
  recentInvoices: FinalInvoice[];
}

export const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats>({
    activeClients: 0,
    proformaInvoices: 0,
    finalInvoices: 0,
    products: 0,
    recentProformas: [],
    recentInvoices: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch client count
        const { count: clientCount, error: clientError } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true });
        
        if (clientError) throw clientError;
        
        // Fetch proforma invoice count
        const { count: proformaCount, error: proformaError } = await supabase
          .from('proforma_invoices')
          .select('*', { count: 'exact', head: true });
        
        if (proformaError) throw proformaError;
        
        // Fetch final invoice count
        const { count: finalInvoiceCount, error: finalInvoiceError } = await supabase
          .from('final_invoices')
          .select('*', { count: 'exact', head: true });
        
        if (finalInvoiceError) throw finalInvoiceError;
        
        // Fetch product count
        const { count: productCount, error: productError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true });
        
        if (productError) throw productError;
        
        // Fetch recent proforma invoices
        const { data: recentProformas, error: recentProformaError } = await supabase
          .from('proforma_invoices')
          .select('*, clients(*)')
          .order('issuedate', { ascending: false })
          .limit(3);
        
        if (recentProformaError) throw recentProformaError;
        
        // Fetch recent final invoices
        const { data: recentInvoices, error: recentInvoiceError } = await supabase
          .from('final_invoices')
          .select('*, clients(*)')
          .order('issuedate', { ascending: false })
          .limit(3);
        
        if (recentInvoiceError) throw recentInvoiceError;
        
        // Map data to our domain models
        const mappedProformas: ProformaInvoice[] = recentProformas.map(invoice => ({
          id: invoice.id,
          number: invoice.number,
          clientid: invoice.clientid,
          client: invoice.clients ? {
            id: invoice.clients.id,
            name: invoice.clients.name,
            address: invoice.clients.address,
            taxid: invoice.clients.taxid,
            phone: invoice.clients.phone,
            email: invoice.clients.email,
            country: invoice.clients.country,
            city: invoice.clients.city,
            createdAt: invoice.clients.createdat,
            updatedAt: invoice.clients.updatedat
          } : undefined,
          issuedate: invoice.issuedate,
          duedate: invoice.duedate,
          items: [],
          notes: invoice.notes || '',
          subtotal: invoice.subtotal,
          taxTotal: invoice.taxtotal,
          total: invoice.total,
          status: invoice.status as 'draft' | 'sent' | 'approved' | 'rejected',
          finalInvoiceId: invoice.finalinvoiceid,
          payment_type: invoice.payment_type,
          stamp_tax: invoice.stamp_tax,
          bc:invoice.bc,
          createdAt: invoice.createdat,
          updatedAt: invoice.updatedat
        }));
        
        const mappedInvoices: FinalInvoice[] = recentInvoices.map(invoice => ({
          id: invoice.id,
          number: invoice.number,
          clientid: invoice.clientid,
          client: invoice.clients ? {
            id: invoice.clients.id,
            name: invoice.clients.name,
            address: invoice.clients.address,
            taxid: invoice.clients.taxid,
            phone: invoice.clients.phone,
            email: invoice.clients.email,
            country: invoice.clients.country,
            city: invoice.clients.city,
            createdAt: invoice.clients.createdat,
            updatedAt: invoice.clients.updatedat
          } : undefined,
          issuedate: invoice.issuedate,
          duedate: invoice.duedate,
          items: [],
          notes: invoice.notes || '',
          subtotal: invoice.subtotal,
          taxTotal: invoice.taxtotal,
          total: invoice.total,
          status: invoice.status as 'unpaid' | 'paid' | 'cancelled' | 'credited',
          proformaId: invoice.proformaid,
          paymentDate: invoice.paymentdate,
          paymentReference: invoice.paymentreference,
          payment_type: invoice.payment_type,
          stamp_tax: invoice.stamp_tax,
          bc:invoice.bc,
          createdAt: invoice.createdat,
          updatedAt: invoice.updatedat
        }));
        
        setStats({
          activeClients: clientCount || 0,
          proformaInvoices: proformaCount || 0,
          finalInvoices: finalInvoiceCount || 0,
          products: productCount || 0,
          recentProformas: mappedProformas,
          recentInvoices: mappedInvoices
        });
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load dashboard data.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  return { stats, isLoading };
};
