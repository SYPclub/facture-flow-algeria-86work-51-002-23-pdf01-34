
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { 
  FileText, 
  Users, 
  Package, 
  Truck,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Loader
} from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useCompanyInfo } from '@/hooks/useCompanyInfo';

const Dashboard = () => {
  const { user, checkPermission } = useAuth();
  const { stats, isLoading } = useDashboardData();
  const { companyInfo } = useCompanyInfo();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          Welcome, {user?.name}
          {companyInfo && <span className="ml-2">| {companyInfo.businessName}</span>}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-xs text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.activeClients}</div>
                <p className="text-xs text-muted-foreground">Active clients</p>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Link to="/clients" className="text-xs text-primary flex items-center">
              View all clients <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Proforma Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-xs text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.proformaInvoices}</div>
                <p className="text-xs text-muted-foreground">Active proforma invoices</p>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Link to="/invoices/proforma" className="text-xs text-primary flex items-center">
              View all proformas <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Final Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-xs text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.finalInvoices}</div>
                <p className="text-xs text-muted-foreground">Issued final invoices</p>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Link to="/invoices/final" className="text-xs text-primary flex items-center">
              View all invoices <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-xs text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.products}</div>
                <p className="text-xs text-muted-foreground">Products in catalog</p>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Link to="/products" className="text-xs text-primary flex items-center">
              Manage products <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALESPERSON]) && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Commonly used actions</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALESPERSON]) && (
                <Button asChild variant="outline" className="justify-start">
                  <Link to="/invoices/proforma/new">
                    <FileText className="mr-2 h-4 w-4" />
                    Create New Proforma Invoice
                  </Link>
                </Button>
              )}
              
              {checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT]) && (
                <Button asChild variant="outline" className="justify-start">
                  <Link to="/invoices/final/new">
                    <FileText className="mr-2 h-4 w-4" />
                    Create New Final Invoice
                  </Link>
                </Button>
              )}
              
              {checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALESPERSON]) && (
                <Button asChild variant="outline" className="justify-start">
                  <Link to="/delivery-notes/new">
                    <Truck className="mr-2 h-4 w-4" />
                    Create Delivery Note
                  </Link>
                </Button>
              )}
              
              {checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT]) && (
                <Button asChild variant="outline" className="justify-start">
                  <Link to="/clients/new">
                    <Users className="mr-2 h-4 w-4" />
                    Add New Client
                  </Link>
                </Button>
              )}
              
              {checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT]) && (
                <Button asChild variant="outline" className="justify-start">
                  <Link to="/products/new">
                    <Package className="mr-2 h-4 w-4" />
                    Add New Product
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Proformas */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Proforma Invoices</CardTitle>
            <CardDescription>Latest created proformas</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2">
                <Loader className="h-10 w-10 animate-spin text-muted-foreground/50" />
                <p className="text-center text-muted-foreground">Loading proformas...</p>
              </div>
            ) : stats.recentProformas.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2">
                <FileText className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-center text-muted-foreground">No proforma invoices yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recentProformas.map(item => (
                  <div key={item.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{item.number}</p>
                      <p className="text-xs text-muted-foreground">{item.client?.name || 'Unknown client'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{item.total.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}</p>
                      <p className="text-xs text-muted-foreground">{item.issuedate}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild className="w-full">
              <Link to="/invoices/proforma">View All Proformas</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Final Invoices</CardTitle>
            <CardDescription>Latest issued invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2">
                <Loader className="h-10 w-10 animate-spin text-muted-foreground/50" />
                <p className="text-center text-muted-foreground">Loading invoices...</p>
              </div>
            ) : stats.recentInvoices.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2">
                <FileText className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-center text-muted-foreground">No final invoices yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recentInvoices.map(item => (
                  <div key={item.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{item.number}</p>
                      <p className="text-xs text-muted-foreground">{item.client?.name || 'Unknown client'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{item.total.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}</p>
                      <div className="flex items-center justify-end gap-1">
                        <span className={`h-2 w-2 rounded-full ${item.status === 'paid' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                        <p className="text-xs text-muted-foreground">{
                          item.status.charAt(0).toUpperCase() + item.status.slice(1)
                        }</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild className="w-full">
              <Link to="/invoices/final">View All Invoices</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* System notices - only shown when there's no real data */}
      {(!isLoading && stats.activeClients === 0 && stats.proformaInvoices === 0 && stats.finalInvoices === 0) && (
        <Card className="border-amber-500/20 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-amber-800">
              <AlertCircle className="mr-2 h-5 w-5" />
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-800">
            <p>Welcome to your new invoice management system! To get started:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>First, set up your company information in the Admin section</li>
              <li>Add your clients and products to the system</li>
              <li>Start creating proforma invoices and converting them to final invoices</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
