import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Camera, Check, ChevronRight, Loader2, ScanLine, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type Step = 'scan' | 'review' | 'confirm';

export default function AddProduct() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialStep = searchParams.get('step') as Step || 'review';
  
  const [step, setStep] = useState<Step>(initialStep);
  // We're skipping the scanning UI, so we don't need scanning state here for the flow anymore
  // But keeping it if we need fallback
  const [scanning, setScanning] = useState(false);
  
  const { t, language } = useI18n();

  // Mock extracted data
  const [detectedProducts, setDetectedProducts] = useState([
    { id: 1, name: "Sony PlayStation 5", category: "Gaming", price: 499.99, selected: true },
    { id: 2, name: "DualSense Controller", category: "Gaming", price: 69.99, selected: true },
  ]);

  // If we land here directly without step=review, and we want to enforce skipping scan:
  useEffect(() => {
     if (step === 'scan') {
        // In the new architecture, we shouldn't really be in 'scan' mode here
        // But if someone navigates manually, maybe redirect or show file picker again?
        // For now, let's just default to review to simulate "file received"
        setStep('review');
     }
  }, []);

  const toggleProduct = (id: number) => {
    setDetectedProducts(products => 
      products.map(p => p.id === id ? { ...p, selected: !p.selected } : p)
    );
  };

  const handleSave = () => {
    // In a real app, this would save to the backend
    setStep('confirm');
    setTimeout(() => {
      setLocation('/');
    }, 2000);
  };

  return (
    <MobileLayout showNav={false}>
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-white z-10">
          <Button variant="ghost" size="sm" onClick={() => setLocation('/')}>
            {t("add_product.cancel")}
          </Button>
          <span className="font-semibold text-sm">
            {step === 'scan' ? t("add_product.scan_invoice") : step === 'review' ? t("add_product.review_items") : t("add_product.saved")}
          </span>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          
          {/* STEP 1: SCAN (DEPRECATED IN NEW FLOW - BUT KEPT AS FALLBACK IF NEEDED, THOUGH HIDDEN BY LOGIC) */}
          {step === 'scan' && (
             <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
             </div>
          )}

          {/* STEP 2: REVIEW */}
          {step === 'review' && (
            <div className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Best Buy #2910</p>
                  <p className="text-xs text-muted-foreground">{t("add_product.detected_today")}</p>
                </div>
                <div className={cn(language === 'ar' ? "text-left" : "text-right")}>
                  <p className="font-mono text-sm font-medium">$569.98</p>
                  <p className="text-xs text-green-600">{t("add_product.verified")}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t("add_product.detected_products", { count: detectedProducts.filter(p => p.selected).length })}</h3>
                
                {detectedProducts.map(product => (
                  <Card key={product.id} className={cn("p-4 transition-all duration-200 border-2", product.selected ? "border-primary/20 shadow-md" : "border-transparent opacity-60 bg-slate-50")}>
                    <div className="flex items-start gap-4">
                      <Switch 
                        checked={product.selected}
                        onCheckedChange={() => toggleProduct(product.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t("add_product.product_name")}</Label>
                          <Input defaultValue={product.name} className="h-8 bg-white" disabled={!product.selected} />
                        </div>
                        <div className="flex gap-3">
                           <div className="flex-1 space-y-1">
                              <Label className="text-xs text-muted-foreground">{t("add_product.category")}</Label>
                              <Input defaultValue={product.category} className="h-8 bg-white" disabled={!product.selected} />
                           </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRM */}
          {step === 'confirm' && (
             <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6 animate-in zoom-in-95 duration-500">
               <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4 shadow-lg shadow-emerald-100">
                 <Check className="w-10 h-10" />
               </div>
               <h2 className="text-2xl font-display font-bold">{t("add_product.success_saved")}</h2>
               <p className="text-muted-foreground">
                 {t("add_product.success_desc", { count: detectedProducts.filter(p => p.selected).length })}
               </p>
             </div>
          )}
        </div>

        {/* Footer Actions */}
        {step === 'review' && (
          <div className="p-4 border-t bg-white safe-area-pb">
            <Button className="w-full h-12 text-base shadow-lg shadow-primary/20" onClick={handleSave}>
              {t("add_product.save_action", { count: detectedProducts.filter(p => p.selected).length })}
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
