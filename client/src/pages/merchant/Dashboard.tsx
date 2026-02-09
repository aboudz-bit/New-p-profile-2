import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Users, 
  Settings as SettingsIcon,
  Wallet
} from "lucide-react";

export default function MerchantDashboard() {
  return (
    <MobileLayout showNav={true}>
      <div className="p-6 space-y-8">
        <div className="space-y-2">
            <h1 className="text-2xl font-display font-bold text-slate-900">Store Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, Sami Owner</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <Card title="Today's Orders" value="12" icon={ShoppingBag} color="blue" />
            <Card title="Revenue" value="SAR 4,500" icon={Wallet} color="emerald" />
            <Card title="Active Products" value="142" icon={Package} color="purple" />
            <Card title="Staff" value="4" icon={Users} color="orange" />
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h3 className="font-bold text-sm mb-4">Quick Actions</h3>
            <div className="space-y-2">
                <Button className="w-full justify-start" variant="outline">
                    <Package className="w-4 h-4 mr-2" /> Add New Product
                </Button>
                <Button className="w-full justify-start" variant="outline">
                    <Users className="w-4 h-4 mr-2" /> Manage Staff Permissions
                </Button>
            </div>
        </div>
      </div>
    </MobileLayout>
  );
}

function Card({ title, value, icon: Icon, color }: any) {
    const colors: any = {
        blue: "bg-blue-50 text-blue-600",
        emerald: "bg-emerald-50 text-emerald-600",
        purple: "bg-purple-50 text-purple-600",
        orange: "bg-orange-50 text-orange-600",
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
                <Icon className="w-5 h-5" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className="text-xl font-bold text-slate-900">{value}</p>
        </div>
    );
}
