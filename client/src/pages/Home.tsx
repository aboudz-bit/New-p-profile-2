import { MobileLayout } from "@/components/layout/MobileLayout";
import { MOCK_USER, MOCK_PRODUCTS } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Plus, ScanLine, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProductCard } from "@/components/ui/product-card";
import { Link } from "wouter";

export default function Home() {
  const expiringProducts = MOCK_PRODUCTS.filter(p => p.status === 'expiring' || p.status === 'eligible');
  const recentProducts = MOCK_PRODUCTS.slice(0, 3);

  return (
    <MobileLayout>
      <div className="p-6 space-y-8 pb-24">
        {/* Header */}
        <div className="flex justify-between items-start pt-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900">
              Hello, {MOCK_USER.name.split(' ')[0]}
            </h1>
            <p className="text-slate-500 mt-1">
              You have <span className="font-semibold text-slate-900">{MOCK_PRODUCTS.length} products</span> in your profile.
            </p>
          </div>
        </div>

        {/* Alerts Section - Conditional */}
        {expiringProducts.length > 0 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Attention Needed</h2>
            {expiringProducts.map(product => (
              <Link key={product.id} href={`/product/${product.id}`}>
                <Card className="p-4 border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors cursor-pointer group">
                  <div className="flex items-start gap-3">
                    <div className="bg-amber-100 p-2 rounded-full text-amber-600 group-hover:scale-110 transition-transform">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-amber-900">Protection Action Needed</h3>
                      <p className="text-sm text-amber-700/80 mt-1">
                        {product.name} is {product.status === 'eligible' ? 'eligible for protection' : 'expiring soon'}.
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <Link href="/add-product">
            <Button variant="outline" className="w-full h-auto flex-col py-6 gap-3 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 group">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Plus className="w-5 h-5 text-slate-600 group-hover:text-primary" />
              </div>
              <span className="font-medium text-slate-700 group-hover:text-primary">Add Product</span>
            </Button>
          </Link>
          
          <Link href="/scan-invoice">
            <Button variant="outline" className="w-full h-auto flex-col py-6 gap-3 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 group">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <ScanLine className="w-5 h-5 text-slate-600 group-hover:text-primary" />
              </div>
              <span className="font-medium text-slate-700 group-hover:text-primary">Scan Invoice</span>
            </Button>
          </Link>
        </div>

        {/* Recent Products */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-display font-semibold">Recent Products</h2>
            <Link href="/products" className="text-sm text-primary font-medium hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {recentProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
