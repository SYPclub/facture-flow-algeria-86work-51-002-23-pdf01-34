
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Check, Edit } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CompanyInfo } from '@/types/company';
import { supabase } from '@/integrations/supabase/client';

export default function CompanyInfoPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const form = useForm<CompanyInfo>({
    defaultValues: {
      businessName: '',
      address: '',
      taxid: '',
      commerceRegNumber: '',
      phone: '',
      email: '',
    }
  });

  // Fetch company info
  useEffect(() => {
    async function fetchCompanyInfo() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('company_info')
          .select('*')
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          form.reset({
            id: data.id,
            businessName: data.business_name || '',
            address: data.address || '',
            taxid: data.tax_id || '',
            commerceRegNumber: data.commerce_reg_number || '',
            phone: data.phone || '',
            email: data.email || '',
          });
        }
      } catch (error) {
        console.error('Error fetching company info:', error);
        toast.error('Failed to load company information');
      } finally {
        setIsLoading(false);
      }
    }

    fetchCompanyInfo();
  }, [form]);

  const onSubmit = async (formData: CompanyInfo) => {
    try {
      const companyData = {
        business_name: formData.businessName,
        address: formData.address,
        tax_id: formData.taxid,
        commerce_reg_number: formData.commerceRegNumber,
        phone: formData.phone,
        email: formData.email,
      };
      
      let response;
      
      if (formData.id) {
        // Update existing record
        response = await supabase
          .from('company_info')
          .update(companyData)
          .eq('id', formData.id);
      } else {
        // Insert new record
        response = await supabase
          .from('company_info')
          .insert([companyData]);
      }
      
      if (response.error) throw response.error;
      
      toast.success('Company information saved successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving company info:', error);
      toast.error('Failed to save company information');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Informations sur l'entreprise</h1>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="outline" className="flex items-center gap-2">
            <Edit className="h-4 w-4" /> Editer
          </Button>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Détails de l'entreprise</CardTitle>
          <CardDescription>
            Visualisez et gérez les informations relatives à votre entreprise qui figureront sur les factures et les documents officiels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="loader">Chargement...</div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l'entreprise (Raison sociale)</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse (Adresse complète)</FormLabel>
                      <FormControl>
                        <Textarea {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="taxid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro d'identification fiscale (N° d'identification fiscale)</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="commerceRegNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registre du commerce (N° registre de commerce)</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone (Téléphone)</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} type="tel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {isEditing && (
                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsEditing(false)}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" className="flex items-center gap-2">
                      <Check className="h-4 w-4" /> Enregistrer les modifications
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
