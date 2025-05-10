
import { useState, useEffect } from 'react';
import { CompanyInfo } from '@/types/company';
import { fetchCompanyInfo } from '@/components/exports/CompanyInfoHeader';
import { toast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';

export const useCompanyInfo = () => {
  const { data: companyInfo, isLoading, error } = useQuery({
    queryKey: ['companyInfo'],
    queryFn: async () => {
      try {
        return await fetchCompanyInfo();
      } catch (error) {
        console.error('Error fetching company info:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load company information.',
        });
        throw error;
      }
    }
  });

  return { companyInfo, isLoading };
};
