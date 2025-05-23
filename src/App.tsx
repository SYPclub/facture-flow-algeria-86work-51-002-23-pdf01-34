
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Auth
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";

// Pages
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";
import ClientsPage from "@/pages/clients/ClientsPage";
import ClientDetail from "@/pages/clients/ClientDetail";
import ProductsPage from "@/pages/products/ProductsPage";
import ProductDetail from "@/pages/products/ProductDetail";
import ProformaInvoicesPage from "@/pages/invoices/ProformaInvoicesPage";
import ProformaDetail from "@/pages/invoices/ProformaDetail";
import NewProformaInvoice from "@/pages/invoices/NewProformaInvoice";
import FinalInvoicesPage from "@/pages/invoices/FinalInvoicesPage";
import FinalInvoiceDetail from "@/pages/invoices/FinalInvoiceDetail";
import DeliveryNotesPage from "@/pages/delivery/DeliveryNotesPage";
import DeliveryNoteDetail from "@/pages/delivery/DeliveryNoteDetail";
import NewDeliveryNote from "@/pages/delivery/NewDeliveryNote";
import Etat104Page from "@/pages/reports/Etat104Page";
import ClientsDebtPage from "@/pages/reports/ClientsDebtPage";
import ClientDebtDetailPage from "@/pages/reports/ClientDebtDetailPage";
import UsersPage from "@/pages/admin/UsersPage";
import UserDetail from "@/pages/admin/UserDetail";
import CompanyInfoPage from "@/pages/admin/CompanyInfoPage";
import PrintableInvoice from "@/pages/invoices/PrintableInvoice";
import PrintableInvoiceV3 from "@/pages/invoices/PrintableInvoiceV3";
import PDFTemplates from "@/pages/admin/PDFTemplates";
import PDFTemplateDesigner from "@/pages/admin/PDFTemplateDesigner";

// Layout
import MainLayout from "@/components/layouts/MainLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Printable routes without layout */}
            <Route path="/print/invoice/:type/:id" element={<PrintableInvoice />} />
            <Route path="/print/v3/:type/:id" element={<PrintableInvoiceV3 />} />
            
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              
              <Route path="/invoices/proforma" element={<ProformaInvoicesPage />} />
              <Route path="/invoices/proforma/new" element={<NewProformaInvoice />} />
              <Route path="/invoices/proforma/:id" element={<ProformaDetail />} />
              <Route path="/invoices/proforma/edit/:id" element={<ProformaDetail />} />
              
              <Route path="/invoices/final" element={<FinalInvoicesPage />} />
              <Route path="/invoices/final/new" element={<FinalInvoiceDetail />} />
              <Route path="/invoices/final/:id" element={<FinalInvoiceDetail />} />
              <Route path="/invoices/final/edit/:id" element={<FinalInvoiceDetail />} />
              
              <Route path="/delivery-notes" element={<DeliveryNotesPage />} />
              <Route path="/delivery-notes/new" element={<NewDeliveryNote />} />
              <Route path="/delivery-notes/:id" element={<DeliveryNoteDetail />} />
              <Route path="/delivery-notes/edit/:id" element={<DeliveryNoteDetail />} />
              
              <Route path="/reports/etat104" element={<Etat104Page />} />
              <Route path="/reports/clients-debt" element={<ClientsDebtPage />} />
              <Route path="/reports/client-debt/:id" element={<ClientDebtDetailPage />} />
              
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/users/:id" element={<UserDetail />} />
              <Route path="/admin/company-info" element={<CompanyInfoPage />} />
              <Route path="/admin/pdf-templates" element={<PDFTemplates />} />
              <Route path="/admin/pdf-template/design/:id" element={<PDFTemplateDesigner />} />
              <Route path="/admin/pdf-template/new" element={<PDFTemplateDesigner />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
