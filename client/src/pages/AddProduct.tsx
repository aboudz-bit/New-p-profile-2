import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Camera, Check, ChevronRight, Loader2, ScanLine, X, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { simulateOCR, ExtractedProduct } from "@/lib/ocrService";

type Step = 'scan' | 'review' | 'confirm';

export default function AddProduct() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialStep = searchParams.get('step') as Step || 'review';
  
  const [step, setStep] = useState<Step>(initialStep);
  const [processing, setProcessing] = useState(true);
  const { t, language } = useI18n();

  // Data state
  const [detectedProducts, setDetectedProducts] = useState<ExtractedProduct[]>([]);
  const [scanConfidence, setScanConfidence] = useState(0);

  // If we land here directly without step=review, and we want to enforce skipping scan:
  useEffect(() => {
     if (step === 'scan') {
        setStep('review');
     }
  }, []);

  // Simulate OCR processing on mount (since we "received" a file)
  useEffect(() => {
    if (step === 'review') {
       runOCR();
    }
  }, [step]);

  const runOCR = async () => {
    setProcessing(true);
    try {
      // Simulate file passing
      const mockFile = new File([""], "invoice.jpg"); 
      const result = await simulateOCR(mockFile);
      
      setDetectedProducts(result.products);
      setScanConfidence(result.confidence);
    } catch (e) {
      console.error("OCR Failed", e);
    } finally {
      setProcessing(false);
    }
  };

  const toggleProduct = (id: number) => {
    setDetectedProducts(products => 
      products.map(p => p.id === id ? { ...p, selected: !p.selected } : p)
    );
  };

  const handleSave = () => {
    setStep('confirm');
    setTimeout(() => {
      setLocation('/');
    }, 2000);
  };

  const ManualEntryFallback = () => (
    <div className="text-center py-10 space-y-4">
      <div className="bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
        <AlertCircle className="w-8 h-8 text-amber-500" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
           {language === 'ar' ? "لم يتم التعرف على المنتجات تلقائيًا" : "Could not detect products automatically"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
           {language === 'ar' 
             ? "يرجى إدخال تفاصيل المنتج يدوياً. لقد قمنا بحفظ صورة الفاتورة للرجوع إليها." 
             : "Please enter product details manually. We've saved the invoice image for reference."}
        </p>
      </div>
      <Button 
        variant="outline" 
        className="mt-4"
        onClick={() => {
            // Add a blank manual product
            setDetectedProducts([{ 
                id: Date.now(), 
                name: "", 
                category: "", 
                price: 0, 
                selected: true 
            }]);
            setScanConfidence(1); // Override confidence to show form
        }}
      >
        {language === 'ar' ? "إضافة منتج يدوياً" : "Add Product Manually"}
      </Button>
    </div>
  );

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
          
          {/* PROCESSING STATE */}
          {processing && (
             <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse">
                  {language === 'ar' ? "جاري تحليل الفاتورة..." : "Analyzing invoice..."}
                </p>
             </div>
          )}

          {/* STEP 2: REVIEW */}
          {!processing && step === 'review' && (
            <div className="p-6 space-y-6">
              
              {/* FALLBACK UX if confidence is low or no products */}
              {detectedProducts.length === 0 ? (
                 <ManualEntryFallback />
              ) : (
                <>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">eXtra Stores</p>
                      <p className="text-xs text-muted-foreground">{t("add_product.detected_today")}</p>
                    </div>
                    <div className={cn(language === 'ar' ? "text-left" : "text-right")}>
                      <p className="font-mono text-sm font-medium">4,798.00 SR</p>
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
                              <div className="w-24 space-y-1">
                                  <Label className="text-xs text-muted-foreground">Price</Label>
                                  <Input defaultValue={product.price} className="h-8 bg-white font-mono text-xs" disabled={!product.selected} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
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
        {!processing && step === 'review' && detectedProducts.length > 0 && (
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
