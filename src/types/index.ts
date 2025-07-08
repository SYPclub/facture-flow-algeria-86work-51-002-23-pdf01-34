
// Base types for our domain models

export interface Client {
  id: string;
  name: string;
  address: string;
  taxid: string; // NIF (tax ID )
  phone: string;
  email: string;
  country: string;
  city: string;
  createdAt: string;
  updatedAt: string;
  // New fields
  rc:string | null;
  nis: string | null;
  ai: string | null;
  rib: string | null;
  ccp: string | null;
  contact: string | null;
  telcontact: string | null;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  unitprice: number;
  taxrate: number; // TVA rate
  stockquantity: number;
  unit: string; // Added unit field
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitprice: number;
  taxrate: number;
  discount: number;
  totalExcl: number;
  totalTax: number;
  total: number;
  unit?: string; // Added unit field
}

export interface BaseInvoice {
  id: string;
  number: string;
  clientid: string;
  client?: Client;
  issuedate: string;
  duedate: string;
  items: InvoiceItem[];
  notes: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  created_by_userid: string; // Required field for user who created the document
}

export interface ProformaInvoice extends BaseInvoice {
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  finalInvoiceId?: string; // If approved and converted to final invoice
  payment_type?: string; // 'cheque' or 'cash'
  stamp_tax?: number; // For cash payment tax
  bc?: string;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  payment_date: string;
  paymentMethod: string;
  reference: string;
  notes?: string;
  createdAt: string;
}

export interface FinalInvoice extends BaseInvoice {
  status: 'NonPayé' | 'payé' | 'partially_paid' | 'annulé' | 'credited';
  proformaId?: string; // Reference to the source proforma invoice
  payment_date?: string;
  paymentreference?: string;
  bc?: string;
  payment_type?: string;
  stamp_tax?: string;
  amount_paid?: number;
  client_debt?: number;
  payments?: InvoicePayment[];
}

export interface DeliveryNote {
  id: string;
  number: string;
  finalInvoiceId: string;
  finalInvoice?: FinalInvoice;
  clientid: string;
  client?: Client;
  issuedate: string;
  deliverydate?: string;
  items: InvoiceItem[];
  notes: string;
  status: 'en_attente_de_livraison' | 'livrée' | 'annulé';
  createdAt: string;
  updatedAt: string;
  drivername: string | null;
  truck_id?: string | null;
  delivery_company?: string | null;
  driverlisence?: string | null;
  drivertel?: string | null;
  created_by_userid: string; // Required field for user who created the document
}

// User related types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export enum UserRole {
  ADMIN = 'admin',
  ACCOUNTANT = 'accountant',
  SALESPERSON = 'salesperson',
  VIEWER = 'viewer',
}

// Mock data generators
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

export const getCurrentDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const getFutureDate = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};
