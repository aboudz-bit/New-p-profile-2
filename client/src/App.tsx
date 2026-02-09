import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Products from "@/pages/Products";
import ProductProfile from "@/pages/ProductProfile";
import Documents from "@/pages/Documents";
import Settings from "@/pages/Settings";
import AddProduct from "@/pages/AddProduct";
import Wishlist from "@/pages/Wishlist";
import Cart from "@/pages/Cart";
import RoleChooser from "@/pages/RoleChooser";
import Login from "@/pages/Login";
import MerchantDashboard from "@/pages/merchant/Dashboard";
import { useAuth } from "@/hooks/use-auth";

function ProtectedRoute({ component: Component, allowedRoles }: { component: any, allowedRoles: string[] }) {
    const { user, isAuthenticated, selectedEntryRole } = useAuth();

    if (!isAuthenticated) return <Redirect to="/role" />;
    
    // Check if role matches allowed roles
    // Logic: 
    // - If allowedRoles includes 'customer', allow customers (and merchant staff viewing as customer if we supported that)
    // - If allowedRoles includes 'merchant', allow merchant_owner and merchant_staff
    
    const userRole = user?.role || 'customer';
    
    // Simple check:
    const isMerchantRoute = allowedRoles.includes('merchant_owner'); // Basic heuristic
    const isCustomerRoute = allowedRoles.includes('customer');

    if (isMerchantRoute) {
        if (selectedEntryRole !== 'merchant') return <Redirect to="/" />;
        if (userRole === 'customer') return <Redirect to="/" />;
    }

    if (isCustomerRoute) {
        if (selectedEntryRole !== 'customer') return <Redirect to="/merchant/dashboard" />;
    }

    return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/role" component={RoleChooser} />
      <Route path="/login" component={Login} />

      {/* Customer Routes */}
      <Route path="/">
        <ProtectedRoute component={Home} allowedRoles={['customer']} />
      </Route>
      <Route path="/products">
        <ProtectedRoute component={Products} allowedRoles={['customer']} />
      </Route>
      <Route path="/product/:id">
        <ProtectedRoute component={ProductProfile} allowedRoles={['customer']} />
      </Route>
      <Route path="/documents">
        <ProtectedRoute component={Documents} allowedRoles={['customer']} />
      </Route>
      <Route path="/settings">
        {/* Profile is shared but content differs */}
        <ProtectedRoute component={Settings} allowedRoles={['customer', 'merchant_owner', 'merchant_staff']} />
      </Route>
      <Route path="/add-product">
        <ProtectedRoute component={AddProduct} allowedRoles={['customer']} />
      </Route>
      <Route path="/wishlist">
        <ProtectedRoute component={Wishlist} allowedRoles={['customer']} />
      </Route>
      <Route path="/cart">
        <ProtectedRoute component={Cart} allowedRoles={['customer']} />
      </Route>

      {/* Merchant Routes */}
      <Route path="/merchant/dashboard">
        <ProtectedRoute component={MerchantDashboard} allowedRoles={['merchant_owner', 'merchant_staff']} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
