import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { User, Store } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function RoleChooser() {
  const [, setLocation] = useLocation();
  const { setEntryRole } = useAuth();

  const handleSelectRole = (role: "customer" | "merchant") => {
    setEntryRole(role);
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
             <span className="text-3xl font-bold text-white">L</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900">Welcome to Loom</h1>
          <p className="text-muted-foreground">Choose how you want to continue</p>
        </div>

        <div className="grid gap-4 mt-8">
          <button
            onClick={() => handleSelectRole("customer")}
            className="group relative flex items-center p-6 bg-white rounded-2xl border-2 border-slate-100 hover:border-primary/50 transition-all hover:shadow-md"
          >
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <User className="w-6 h-6" />
            </div>
            <div className="ml-4 text-left">
              <h3 className="font-bold text-slate-900">Customer</h3>
              <p className="text-xs text-slate-500 mt-1">Shop, track warranties & service</p>
            </div>
          </button>

          <button
            onClick={() => handleSelectRole("merchant")}
            className="group relative flex items-center p-6 bg-white rounded-2xl border-2 border-slate-100 hover:border-primary/50 transition-all hover:shadow-md"
          >
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Store className="w-6 h-6" />
            </div>
            <div className="ml-4 text-left">
              <h3 className="font-bold text-slate-900">Merchant / Store</h3>
              <p className="text-xs text-slate-500 mt-1">Manage products, orders & staff</p>
            </div>
          </button>
        </div>

        <div className="text-center text-xs text-slate-400 mt-12">
            By continuing you agree to our Terms of Service
        </div>
      </div>
    </div>
  );
}
