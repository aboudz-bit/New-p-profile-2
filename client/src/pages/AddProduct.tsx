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

type Step = 'scan' | 'review' | 'confirm';

export default function AddProduct() {
  const [step, setStep] = useState<Step>('scan');
  const [scanning, setScanning] = useState(false);
  const [, setLocation] = useLocation();

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
          <Button variant="ghost" size="sm" onClick={() => step === 'scan' ? setLocation('/') : setStep('scan')}>
            Cancel
          </Button>
          <span className="font-semibold text-sm">
            {step === 'scan' ? 'Scan Invoice' : step === 'review' ? 'Review Items' : 'Saved'}
          </span>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          
          {/* STEP 1: SCAN */}
          {step === 'scan' && (
            <div className="flex flex-col items-center justify-center h-full p-8 space-y-8">
              <div className="relative w-64 h-80 bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 flex items-center justify-center">
                {scanning ? (
                  <>
                    <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
                    <ScanLine className="w-16 h-16 text-emerald-400 animate-bounce" />
                    <div className="absolute bottom-8 text-emerald-400 font-mono text-sm">Scanning...</div>
                  </>
                ) : (
                  <Camera className="w-16 h-16 text-slate-700" />
                )}
                
                {/* Camera UI overlay */}
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500" />
                <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-xl font-display font-bold">Snap your invoice</h2>
                <p className="text-sm text-muted-foreground">
                  Position the receipt within the frame.<br/>We'll detect items automatically.
                </p>
              </div>

              <Button size="lg" className="w-full max-w-xs h-12 text-base shadow-lg shadow-primary/20" onClick={startScan} disabled={scanning}>
                {scanning ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing</>
                ) : (
                  <>Capture Photo</>
                )}
              </Button>
            </div>
          )}

          {/* STEP 2: REVIEW */}
          {step === 'review' && (
            <div className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Best Buy #2910</p>
                  <p className="text-xs text-muted-foreground">Detected today</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-medium">$569.98</p>
                  <p className="text-xs text-green-600">Verified</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Detected Products ({detectedProducts.filter(p => p.selected).length})</h3>
                
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
                          <Label className="text-xs text-muted-foreground">Product Name</Label>
                          <Input defaultValue={product.name} className="h-8 bg-white" disabled={!product.selected} />
                        </div>
                        <div className="flex gap-3">
                           <div className="flex-1 space-y-1">
                              <Label className="text-xs text-muted-foreground">Category</Label>
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
               <h2 className="text-2xl font-display font-bold">Successfully Saved!</h2>
               <p className="text-muted-foreground">
                 Added 1 invoice and {detectedProducts.filter(p => p.selected).length} products to your profile.
               </p>
             </div>
          )}
        </div>

        {/* Footer Actions */}
        {step === 'review' && (
          <div className="p-4 border-t bg-white safe-area-pb">
            <Button className="w-full h-12 text-base shadow-lg shadow-primary/20" onClick={handleSave}>
              Save {detectedProducts.filter(p => p.selected).length} Products
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
