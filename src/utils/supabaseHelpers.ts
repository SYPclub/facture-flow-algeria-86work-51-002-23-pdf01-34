
// Helper functions to map between database schema and our domain models

import { User, UserRole, Product, InvoiceItem } from '@/types';

/**
 * Maps a user from Supabase Auth to our domain User model
 */
export const mapSupabaseAuthUserToDomainUser = (authUser: any): User => {
  return {
    id: authUser.id,
    email: authUser.email || '',
    name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Unnamed User',
    role: (authUser.user_metadata?.role as UserRole) || UserRole.VIEWER,
    active: authUser.user_metadata?.active !== false,
    createdAt: authUser.created_at,
    updatedAt: authUser.created_at,
  };
};

/**
 * Maps product from DB to domain model
 */
export const mapDbProductToDomainProduct = (dbProduct: any): Product => {
  if (!dbProduct) return null as unknown as Product;
  
  return {
    id: dbProduct.id,
    code: dbProduct.code,
    name: dbProduct.name,
    description: dbProduct.description,
    unitprice: dbProduct.unitprice,
    taxrate: dbProduct.taxrate,
    stockquantity: dbProduct.stockquantity,
    unit: dbProduct.unit || '', // Ensure unit field is present
    createdAt: dbProduct.createdat,
    updatedAt: dbProduct.updatedat,
  };
};

/**
 * Maps a domain Product model to database columns
 */
export const mapDomainProductToDb = (product: Product): any => {
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    description: product.description,
    unitprice: product.unitprice,
    taxrate: product.taxrate,
    stockquantity: product.stockquantity,
    unit: product.unit || '', // Ensure unit field is present
    createdat: product.createdAt,
    updatedat: product.updatedAt,
  };
};

/**
 * Maps invoice item from DB to domain model
 */
export const mapDbInvoiceItemToDomainItem = (dbItem: any, product?: Product): InvoiceItem => {
  if (!dbItem) return null as unknown as InvoiceItem;
  
  return {
    id: dbItem.id,
    productId: dbItem.productid,
    product: product,
    quantity: dbItem.quantity,
    unitprice: dbItem.unitprice,
    taxrate: dbItem.taxrate,
    discount: dbItem.discount || 0,
    totalExcl: dbItem.totalexcl,
    totalTax: dbItem.totaltax,
    total: dbItem.total,
    unit: product?.unit || '', // Use product unit as default
  };
};
