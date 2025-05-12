
// Helper functions to map between database schema and our domain models

import { User, UserRole } from '@/types';

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
export const mapDbProductToDomainProduct = (dbProduct: any): any => {
  if (!dbProduct) return null;
  
  return {
    id: dbProduct.id,
    code: dbProduct.code,
    name: dbProduct.name,
    description: dbProduct.description,
    unitprice: dbProduct.unitprice,
    taxrate: dbProduct.taxrate,
    stockquantity: dbProduct.stockquantity,
    unit: dbProduct.unit || '', // Make sure unit is included with fallback
    createdAt: dbProduct.createdat,
    updatedAt: dbProduct.updatedat,
  };
};

/**
 * Maps a domain Product model to database columns
 */
export const mapDomainProductToDb = (product: any): any => {
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    description: product.description,
    unitprice: product.unitprice,
    taxrate: product.taxrate,
    stockquantity: product.stockquantity,
    unit: product.unit || '', // Make sure unit is included with fallback
    createdat: product.createdAt,
    updatedat: product.updatedAt,
  };
};

/**
 * Maps invoice item from DB to domain model
 */
export const mapDbInvoiceItemToDomainItem = (dbItem: any, dbProduct?: any): any => {
  if (!dbItem) return null;
  
  let product = null;
  if (dbProduct) {
    product = mapDbProductToDomainProduct(dbProduct);
  }
  
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
    unit: dbItem.unit || (product?.unit || ''), // Make sure unit is included with fallback
  };
};
