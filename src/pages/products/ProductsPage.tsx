
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Product } from '@/types';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Package2, Plus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { mapDbProductToDomainProduct } from '@/utils/supabaseHelpers';

const ProductsPage = () => {
  const { checkPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch products from Supabase
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data ? data.map(mapDbProductToDomainProduct) : [];
    },
  });

  // Filter products based on search query
  const filteredProducts = products.filter((product: Product) => {
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.code.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query)
    );
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-DZ', { 
      style: 'currency', 
      currency: 'DZD',
      minimumFractionDigits: 2
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produits</h1>
          <p className="text-muted-foreground">
            Gérer votre catalogue de produits
          </p>
        </div>
        {checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT]) && (
          <Button asChild>
            <Link to="/products/new">
              <Plus className="mr-2 h-4 w-4" /> Ajouter un nouveau produit
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des produits</CardTitle>
          <CardDescription>Visualisez et gérez vos produits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Recherche de produits..."
              className="max-w-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-red-500">Erreur de chargement des produits</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2">
              <Package2 className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-center text-muted-foreground">
                {searchQuery
                  ? "No products found matching your search"
                  : "No products added yet"}
              </p>
              {checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT]) && (
                <Button asChild variant="outline" className="mt-2">
                  <Link to="/products/new">
                    <Plus className="mr-2 h-4 w-4" /> Ajouter votre premier produit
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Nom du produit</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead className="hidden sm:table-cell">Stock</TableHead>
                    <TableHead className="hidden md:table-cell">Unité</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product: Product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono">{product.code}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="hidden max-w-xs truncate md:table-cell">
                        {product.description}
                      </TableCell>
                      <TableCell>{formatCurrency(product.unitprice)}</TableCell>
                      <TableCell>{product.taxrate}%</TableCell>
                      <TableCell className="hidden sm:table-cell">{product.stockquantity}</TableCell>
                      <TableCell className="hidden md:table-cell">{product.unit || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Link
                          to={`/products/${product.id}`}
                          className="rounded-md px-2 py-1 text-sm font-medium text-primary hover:underline"
                        >
                          Voir les détails
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductsPage;
