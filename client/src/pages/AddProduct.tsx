import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Camera, Check, ChevronRight, Loader2, ScanLine, X, FileText, PenTool } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type Step = 'choose' | 'scan' | 'manual' | 'review' | 'confirm';

export default function AddProduct() {
  const [step, setStep] = useState<Step>('choose');
  const [scanning, setScanning] = useState(false);
  const [, setLocation] = useLocation();
  const { t, language } = useI18n();

  // Mock extracted data
  const [detectedProducts, setDetectedProducts] = useState([
    { id: 1, name: "Sony PlayStation 5", category: "Gaming", price: 499.99, selected: true },
    { id: 2, name: "DualSense Controller", category: "Gaming", price: 69.99, selected: true },
  ]);

  // Simulate scanning
  const startScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setStep('review');
    }, 2500);
  };

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
          <Button variant="ghost" size="sm" onClick={() => step === 'choose' ? setLocation('/') : setStep('choose')}>
            {t("add_product.cancel")}
          </Button>
          <span className="font-semibold text-sm">
            {step === 'choose' ? t("add_product.choose_method") :
             step === 'scan' ? t("add_product.scan_invoice") :
             step === 'manual' ? t("add_product.method_manual") :
             step === 'review' ? t("add_product.review_items") : t("add_product.saved")}
          </span>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          
          {/* STEP 0: CHOOSE METHOD */}
          {step === 'choose' && (
            <div className="p-6 space-y-6 pt-12 animate-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-display font-bold mb-2">{t("add_product.choose_method")}</h2>
              </div>

              <div className="grid gap-4">
                {/* Option 1: Scan */}
                <button 
                  onClick={() => setStep('scan')}
                  className="w-full text-left bg-white p-6 rounded-2xl border-2 border-slate-100 hover:border-primary/20 hover:bg-slate-50 transition-all shadow-sm group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-slate-900 mb-1 group-hover:text-primary transition-colors">
                        {t("add_product.method_scan")}
                      </h3>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        {t("add_product.method_scan_desc")}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Option 2: Manual */}
                <button 
                  onClick={() => setStep('manual')}
                  className="w-full text-left bg-white p-6 rounded-2xl border-2 border-slate-100 hover:border-primary/20 hover:bg-slate-50 transition-all shadow-sm group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <PenTool className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-slate-900 mb-1 group-hover:text-primary transition-colors">
                        {t("add_product.method_manual")}
                      </h3>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        {t("add_product.method_manual_desc")}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: SCAN */}
          {step === 'scan' && (
            <div className="flex flex-col items-center justify-center h-full p-8 space-y-8 animate-in fade-in duration-300">
              <div className="relative w-64 h-80 bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 flex items-center justify-center">
                {scanning ? (
                  <>
                    <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
                    <ScanLine className="w-16 h-16 text-emerald-400 animate-bounce" />
                    <div className="absolute bottom-8 text-emerald-400 font-mono text-sm">{t("add_product.processing")}...</div>
                  </>
                ) : (
                  <Camera className="w-16 h-16 text-slate-700" />
                )}
                
                {/* Camera UI overlay */}
                <div className={cn("absolute top-4 w-2 h-2 rounded-full bg-red-500", language === 'ar' ? "left-4" : "right-4")} />
                <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-xl font-display font-bold">{t("add_product.snap_invoice")}</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {t("add_product.snap_desc")}
                </p>
              </div>

              <Button size="lg" className="w-full max-w-xs h-12 text-base shadow-lg shadow-primary/20" onClick={startScan} disabled={scanning}>
                {scanning ? (
                  <><Loader2 className={cn("w-4 h-4 animate-spin", language === 'ar' ? "ml-2" : "mr-2")} /> {t("add_product.processing")}</>
                ) : (
                  <>{t("add_product.capture_photo")}</>
                )}
              </Button>
            </div>
          )}

          {/* STEP: MANUAL FORM */}
          {step === 'manual' && (
            <div className="p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product-name">{t("add_product.product_name")}</Label>
                  <Input id="product-name" placeholder="e.g. iPhone 15 Pro" className="h-12" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">{t("add_product.category")}</Label>
                  <Input id="category" placeholder="e.g. Electronics" className="h-12" />
                </div>

                <div className="space-y-2">
                  <Label>Manufacturer (Optional)</Label>
                  <Input placeholder="e.g. Apple" className="h-12" />
                </div>
                
                <div className="pt-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="space-y-0.5">
                      <Label className="text-base">Manufacturer Warranty</Label>
                      <p className="text-xs text-muted-foreground">Does this product have active warranty?</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: REVIEW */}
          {step === 'review' && (
            <div className="p-6 space-y-6 animate-in fade-in duration-300">
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
        {step === 'manual' && (
          <div className="p-4 border-t bg-white safe-area-pb animate-in slide-in-from-bottom-4 duration-300">
            <Button className="w-full h-12 text-base shadow-lg shadow-primary/20" onClick={handleSave}>
              Save Product
            </Button>
          </div>
        )}

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
