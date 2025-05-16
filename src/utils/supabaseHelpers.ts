// Helper functions to map between database schema and our domain models

import { User, UserRole } from '@/types';
import { supabase } from '@/integrations/supabase/client';

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

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // First check session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session for user:', sessionError.message);
      return null;
    }
    
    let userData;
    
    // If we have a session with user, use that
    if (sessionData?.session?.user) {
      userData = sessionData.session.user;
    } else {
      // Otherwise try getUser()
      const { data: userData2, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error getting current user profile:', error.message);
        return null;
      }
      
      userData = userData2.user;
    }
    
    if (!userData) {
      return null;
    }
    
    // Map to domain user
    return mapSupabaseAuthUserToDomainUser(userData);
  } catch (error) {
    console.error('Exception in getCurrentUser:', error);
    return null;
  }
};
/**
 * Get a user's email by their ID using auth API
 * (Works for current user, admins can see others)
 */
export const getUserEmailById = async (userId: string): Promise<string | null> => {
  try {
    if (!userId) return null;

    // Check if it's the current user
    const currentUser = await getCurrentUser();
    if (currentUser?.id === userId) {
      return currentUser.email;
    }

    // Try to get from public profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('id', userId)
      .single();

    if (!error && data) {
      return data.email || `user-${userId.slice(0, 6)}`;
    }

    // Final fallback to ID-based placeholder
    return `user-${userId.slice(0, 6)}`;
  } catch (error) {
    console.error('Error in getUserEmailById:', error);
    return `user-${userId.slice(0, 6)}`;
  }
};
/**
 * Get multiple user emails using auth API
 */
export const getUserEmailsById = async (userIds: string[]): Promise<Record<string, string>> => {
  try {
    if (!userIds?.length) return {};
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    
    const emailsMap: Record<string, string> = {};
    const currentUser = await getCurrentUser();

    // Batch fetch all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, name')
      .in('id', uniqueIds);

    // Process all users
    await Promise.all(uniqueIds.map(async (userId) => {
      // Current user optimization
      if (currentUser?.id === userId) {
        emailsMap[userId] = currentUser.name;
        return;
      }

      // Find in fetched profiles
      const profile = profiles?.find(p => p.id === userId);
      emailsMap[userId] = profile?.email || profile?.name || `user-${userId.slice(0, 6)}`;
    }));

    return emailsMap;
  } catch (error) {
    console.error('Error in getUserEmailsById:', error);
    return {};
  }
};
/**
export const getUserEmailById = async (userId: string): Promise<string | null> => {
  try {
    if (!userId) return null;
    
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error) {
      console.error('Error getting user email by ID:', error.message);
      
      // Try fallback to user metadata table if available
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single();
        
      if (userError) {
        console.error('Error getting user from users table:', userError.message);
        return null;
      }
      
      return userData?.name || null;
    }
    
    return data?.user?.name || null;
  } catch (error) {
    console.error('Exception in getUserEmailById:', error);
    return null;
  }
};


export const getUserEmailsById = async (userIds: string[]): Promise<Record<string, string>> => {
  try {
    if (!userIds || userIds.length === 0) return {};
    
    // Filter out duplicates and empty values
    const uniqueIds = [...new Set(userIds.filter(id => !!id))];
    if (uniqueIds.length === 0) return {};
    
    console.log('Fetching emails for user IDs:', uniqueIds);
    
    const emailsMap: Record<string, string> = {};
    
    // First try to get users from the auth.users table via RLS policies
    // Note: This requires appropriate RLS policies to be set up
    const { data: usersData, error } = await supabase
      .from('users')
      .select('id, email')
      .in('id', uniqueIds);
      
    if (!error && usersData && usersData.length > 0) {
      // Populate the map with found users
      usersData.forEach(user => {
        emailsMap[user.id] = user.name;
      });
      
      console.log(`Found ${usersData.length} user emails from users table`);
      
      // If we got all users, return the map
      if (usersData.length === uniqueIds.length) {
        return emailsMap;
      }
    }
    
    // For any users that weren't found, try to get them one by one from the auth API
    // This is less efficient but necessary if we don't have a users table
    const missingIds = uniqueIds.filter(id => !emailsMap[id]);
    
    if (missingIds.length > 0) {
      console.log(`Fetching ${missingIds.length} missing user emails individually`);
      
      for (const userId of missingIds) {
        try {
          // Try to get user from the session if it's the current user
          const currentUser = await getCurrentUser();
          if (currentUser && currentUser.id === userId) {
            emailsMap[userId] = currentUser.name;
            continue;
          }
          
          // Otherwise try the admin API (requires admin access)
          const email = await getUserEmailById(userId);
          emailsMap[userId] = email || ''; 
        } catch (e) {
          console.error(`Error fetching email for user ${userId}:`, e);
          emailsMap[userId] = `User ${userId.substring(0, 8)}...`;
        }
      }
    }
    
    return emailsMap;
  } catch (error) {
    console.error('Exception in getUserEmailsById:', error);
    return {};
  }
};



export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    // Always get the session directly from supabase auth
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError.message);
      return null;
    }
    
    // If we have a session with user, return the user ID
    if (sessionData?.session?.user) {
      const userId = sessionData.session.user.id;
      console.log('Found user ID in session:', userId);
      return userId;
    }
    
    // If no session, try getUser as a fallback
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting current user:', error.message);
      return null;
    }
    
    if (data?.user?.id) {
      console.log('Found user ID via getUser:', data.user.id);
      return data.user.id;
    }
    
    console.log('No authenticated user found');
    return null;
  } catch (error) {
    console.error('Exception in getCurrentUserId:', error);
    return null;
  }
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
    unit: dbProduct.unit || '', // Added unit field with fallback to empty string
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
    unit: product.unit || '', // Added unit field with fallback to empty string
    createdat: product.createdAt,
    updatedat: product.updatedAt,
  };
};
