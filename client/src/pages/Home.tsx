import { MobileLayout } from "@/components/layout/MobileLayout";
import { MOCK_USER, MOCK_PRODUCTS } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Plus, ScanLine, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProductCard } from "@/components/ui/product-card";
import { Link, useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useRef } from "react";

export default function Home() {
  const { t, language } = useI18n();
  const expiringProducts = MOCK_PRODUCTS.filter(p => p.status === 'expiring' || p.status === 'eligible');
  const recentProducts = MOCK_PRODUCTS.slice(0, 3);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  const handleAddProduct = () => {
    fileInputRef.current?.click();
  };

  const handleScanInvoice = () => {
    cameraInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real app, we would process the file here.
      // For the prototype, we'll navigate to the review step of the Add Product flow
      // passing a state or just navigating to the route that handles the "scanned" state.
      // Since the current AddProduct page handles the scanning simulation, we can
      // simulate that a scan has "completed" by navigating to it.
      // Ideally, we'd pass the file object, but for now we just trigger the flow.
      setLocation('/add-product?step=review'); 
    }
  };

  return (
    <MobileLayout>
      <div className="p-6 space-y-8 pb-24">
        {/* Hidden File Input (Add Product) */}
        <input
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        {/* Hidden Camera Input (Scan Invoice) */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={cameraInputRef}
          onChange={handleFileChange}
        />

        {/* Header */}
        <div className="flex justify-between items-start pt-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900">
              {t("home.hello", { name: MOCK_USER.name.split(' ')[0] })}
            </h1>
            <p className="text-slate-500 mt-1">
              {t("home.products_count", { count: MOCK_PRODUCTS.length })}
            </p>
          </div>
        </div>

        {/* Alerts Section - Conditional */}
        {expiringProducts.length > 0 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("home.attention_needed")}</h2>
            {expiringProducts.map(product => (
              <Link key={product.id} href={`/product/${product.id}`}>
                <Card className="p-4 border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors cursor-pointer group">
                  <div className="flex items-start gap-3">
                    <div className="bg-amber-100 p-2 rounded-full text-amber-600 group-hover:scale-110 transition-transform">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-amber-900">{t("home.protection_action")}</h3>
                      <p className="text-sm text-amber-700/80 mt-1">
                        {product.name} - {product.status === 'eligible' ? t("home.eligible_for_protection") : t("home.expiring_soon")}.
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
          <Button 
            variant="outline" 
            className="w-full h-auto flex-col py-6 gap-3 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 group"
            onClick={handleAddProduct}
            data-testid="button-add-asset"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Plus className="w-5 h-5 text-slate-600 group-hover:text-primary" />
            </div>
            <span className="font-medium text-slate-700 group-hover:text-primary">{t("home.add_product")}</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-auto flex-col py-6 gap-3 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 group"
            onClick={handleScanInvoice}
            data-testid="button-scan-invoice"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <ScanLine className="w-5 h-5 text-slate-600 group-hover:text-primary" />
            </div>
            <span className="font-medium text-slate-700 group-hover:text-primary">{t("home.scan_invoice")}</span>
          </Button>
        </div>

        {/* Recent Products */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-display font-semibold">{t("home.recent_products")}</h2>
            <Link href="/assets" className="text-sm text-primary font-medium hover:underline" data-testid="link-viewall-assets">{t("home.view_all")}</Link>
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
