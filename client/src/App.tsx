import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Assets from "@/pages/Assets";
import Branches from "@/pages/Branches";
import Users from "@/pages/Users";
import Reports from "@/pages/Reports";
import ProductProfile from "@/pages/ProductProfile";
import Documents from "@/pages/Documents";
import Settings from "@/pages/Settings";
import AddProduct from "@/pages/AddProduct";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/assets" component={Assets} />
      <Route path="/branches" component={Branches} />
      <Route path="/users" component={Users} />
      <Route path="/reports" component={Reports} />
      <Route path="/product/:id" component={ProductProfile} />
      <Route path="/documents" component={Documents} />
      <Route path="/settings" component={Settings} />
      <Route path="/add-product" component={AddProduct} />
      {/* <Route path="/scan-invoice" component={AddProduct} />  REMOVED as per requirements */}
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
