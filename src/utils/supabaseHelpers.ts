
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
 * Maps database product rows to our domain Product model
 */
export const mapDbProductToDomainProduct = (dbProduct: any) => {
  return {
    id: dbProduct.id,
    code: dbProduct.code,
    name: dbProduct.name,
    description: dbProduct.description,
    unitprice: dbProduct.unitprice,
    taxrate: dbProduct.taxrate,
    stockquantity: dbProduct.stockquantity,
    createdAt: dbProduct.createdat || dbProduct.created_at,
    updatedAt: dbProduct.updatedat || dbProduct.updated_at,
  };
};

/**
 * Maps a domain Product model to database columns
 */
export const mapDomainProductToDb = (product: any) => {
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    description: product.description,
    unitprice: product.unitprice,
    taxrate: product.taxrate,
    stockquantity: product.stockquantity,
    // We don't map created_at and updated_at as they're handled by the database
  };
};
