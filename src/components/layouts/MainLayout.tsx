
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { 
  FileText, 
  Users, 
  Package, 
  Truck, 
  FileSpreadsheet, 
  UserCog, 
  Home, 
  LogOut, 
  Menu, 
  X,
  ChevronDown,
  ChevronRight,
  Building,
  FileCode
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface SidebarItemProps {
  icon: React.ElementType;
  title: string;
  href?: string;
  children?: React.ReactNode;
  allowedRoles?: UserRole[];
}

const SidebarItem = ({ 
  icon: Icon, 
  title, 
  href, 
  children,
  allowedRoles 
}: SidebarItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, checkPermission } = useAuth();
  
  // Check permissions for this menu item
  if (allowedRoles && !checkPermission(allowedRoles)) {
    return null;
  }

  const hasChildren = Boolean(children);
  
  if (hasChildren) {
    return (
      <div className="mb-1">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
            "hover:bg-primary/10 hover:text-primary",
          )}
        >
          <Icon className="h-5 w-5" />
          <span className="flex-1">{title}</span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {isOpen && (
          <div className="ml-4 mt-1 space-y-1 border-l pl-2">{children}</div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={href || "#"}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
        "hover:bg-primary/10 hover:text-primary",
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{title}</span>
    </Link>
  );
};

const MainLayout = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?';

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white bg-white transition-all duration-300 ease-in-out lg:relative",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:w-20"
        )}
      >
        <div className={cn("flex h-16 items-center border-b border-white px-4", !sidebarOpen && "justify-center")}>
          <h2 className={cn("text-xl font-bold text-primary", !sidebarOpen && "hidden")}>FactureFlow</h2>
          {!sidebarOpen && <FileText className="h-6 w-6 text-primary" />}
        </div>

        {/* Sidebar content */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          <SidebarItem icon={Home} title="Tableau de bord" href="/" />
          
          <SidebarItem 
            icon={FileText} 
            title="Factures"
            allowedRoles={[UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALESPERSON, UserRole.VIEWER]}
          >
            <SidebarItem 
              icon={FileText} 
              title="Factures pro forma" 
              href="/invoices/proforma"
              allowedRoles={[UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALESPERSON, UserRole.VIEWER]}
            />
            <SidebarItem 
              icon={FileText} 
              title="Factures finales" 
              href="/invoices/final"
              allowedRoles={[UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.VIEWER]}
            />
          </SidebarItem>
          
          <SidebarItem 
            icon={Truck} 
            title="bon de livraison" 
            href="/delivery-notes"
            allowedRoles={[UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALESPERSON, UserRole.VIEWER]}
          />
          
          <SidebarItem 
            icon={Users} 
            title="Clients" 
            href="/clients"
            allowedRoles={[UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALESPERSON, UserRole.VIEWER]}
          />
          
          <SidebarItem 
            icon={Package} 
            title="Produits" 
            href="/products"
            allowedRoles={[UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.VIEWER]}
          />
          
          <SidebarItem 
            icon={FileSpreadsheet} 
            title="État 104" 
            href="/reports/etat104"
            allowedRoles={[UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.VIEWER]}
          />
          <SidebarItem 
            icon={FileSpreadsheet} 
            title="dette du client" 
            href="/reports/clients-debt"
            allowedRoles={[UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.VIEWER]}
          />
          
          <SidebarItem 
            icon={UserCog} 
            title="Administrateur"
            allowedRoles={[UserRole.ADMIN]}
          >
            <SidebarItem 
              icon={Users} 
              title="Utilisateurs" 
              href="/admin/users"
              allowedRoles={[UserRole.ADMIN]}
            />
            <SidebarItem 
              icon={Building} 
              title="Informations sur l'entreprise" 
              href="/admin/company-info"
              allowedRoles={[UserRole.ADMIN]}
            />
            
          </SidebarItem>
        </nav>

        {/* User section */}
        <div className={cn(
          "mt-auto border-t p-4",
          !sidebarOpen && "flex flex-col items-center"
        )}>
          <div className={cn("flex items-center justify-between", !sidebarOpen && "flex-col")}>
            <div className={cn("flex items-center gap-2", !sidebarOpen && "flex-col")}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-white">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {sidebarOpen && (
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-medium">{user?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto text-muted-foreground hover:text-foreground"
              onClick={logout}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white bg-white px-4 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-2 shrink-0 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-2 hidden shrink-0 lg:flex"
          >
            {sidebarOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm font-medium">
              {user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
