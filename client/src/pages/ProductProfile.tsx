import { useRoute } from "wouter";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { MOCK_PRODUCTS } from "@/lib/mockData";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, ShieldCheck, Wrench, FileText, ChevronRight, Calendar } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function ProductProfile() {
  const [match, params] = useRoute("/product/:id");
  const productId = params?.id;
  const product = MOCK_PRODUCTS.find(p => p.id === productId);

  if (!product) {
    return (
      <MobileLayout showNav={false}>
        <div className="p-6 flex flex-col items-center justify-center h-screen">
          <p>Product not found</p>
          <Link href="/products">
            <Button variant="link">Go back</Button>
          </Link>
        </div>
      </MobileLayout>
    );
  }

  const isProtected = product.status === 'active';
  const hasExtendedProtection = !!product.extendedProtection;

  return (
    <MobileLayout showNav={false}>
      <div className="pb-24 relative">
        {/* Header with Back Button */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between">
          <Link href="/products">
            <Button variant="ghost" size="icon" className="-ml-2 text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-sm font-semibold truncate max-w-[200px]">{product.name}</h1>
          <Button variant="ghost" size="icon" className="-mr-2 text-slate-500">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-8">
          {/* Identity Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{product.brand}</p>
                <h1 className="text-3xl font-display font-bold text-slate-900 leading-tight">{product.name}</h1>
                <p className="text-sm text-slate-500 mt-2">{product.model}</p>
              </div>
              <div className="bg-slate-100 w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-slate-300">
                {product.brand.charAt(0)}
              </div>
            </div>

            <div className="flex gap-2">
              <StatusBadge status={product.status} className="text-sm px-3 py-1" />
            </div>
            
            {product.serialNumber && (
              <div className="bg-slate-50 px-3 py-2 rounded border border-slate-100 inline-block">
                 <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Serial Number</p>
                 <p className="font-mono text-xs">{product.serialNumber}</p>
              </div>
            )}
          </div>

          {/* Warranty Section */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Manufacturer Warranty</h2>
            <Card className="p-5 border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <ShieldCheck className="w-24 h-24" />
              </div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{product.manufacturerWarranty.provider}</h3>
                    <p className="text-sm text-muted-foreground">{product.manufacturerWarranty.type}</p>
                  </div>
                  <div className={cn("w-3 h-3 rounded-full", product.manufacturerWarranty.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300')} />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Coverage Start</p>
                    <p className="text-sm font-medium">{format(product.manufacturerWarranty.startDate, 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expires</p>
                    <p className={cn("text-sm font-medium", product.manufacturerWarranty.status === 'expired' ? 'text-destructive' : '')}>
                      {format(product.manufacturerWarranty.endDate, 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                
                <p className="text-xs bg-slate-50 p-2 rounded text-slate-600 border border-slate-100">
                  {product.manufacturerWarranty.coverageSummary}
                </p>
              </div>
            </Card>
          </section>

          {/* Protection Plan Section (Optional) */}
          <section className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Protection Plan</h2>
              {!hasExtendedProtection && product.status === 'eligible' && (
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">Offer Available</span>
              )}
            </div>

            {hasExtendedProtection ? (
              <Card className="p-5 border-blue-200 bg-blue-50/30 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-blue-900">{product.extendedProtection?.provider}</h3>
                    <p className="text-sm text-blue-700">{product.extendedProtection?.type}</p>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex gap-2 text-sm text-blue-800">
                   <Calendar className="w-4 h-4 opacity-70" />
                   <span>Expires {format(product.extendedProtection!.endDate, 'MMMM d, yyyy')}</span>
                </div>
              </Card>
            ) : (
              <Card className="p-5 border-dashed border-slate-300 bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <ShieldCheck className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-700">Extend your coverage</h3>
                  <p className="text-xs text-slate-500 max-w-[200px] mx-auto mt-1">
                    Protect against accidental damage and mechanical failure.
                  </p>
                </div>
                <Button size="sm" className="w-full max-w-[200px]">See Protection Options</Button>
              </Card>
            )}
          </section>

          {/* Maintenance History */}
          <section className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">History</h2>
              <Button variant="ghost" size="sm" className="h-6 text-xs hover:bg-transparent hover:text-primary px-0">Add Record</Button>
            </div>
            
            <div className="relative pl-4 space-y-6 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
              {product.maintenanceHistory.length > 0 ? (
                product.maintenanceHistory.map((record) => (
                  <div key={record.id} className="relative">
                    <div className="absolute -left-[15px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400 border-2 border-white ring-1 ring-slate-100" />
                    <div className="bg-white p-3 rounded-lg border shadow-sm">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm">{record.type}</span>
                        <span className="text-xs text-slate-400">{format(record.date, 'MMM d, yyyy')}</span>
                      </div>
                      <p className="text-xs text-slate-500">{record.notes}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{record.provider}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="relative">
                  <div className="absolute -left-[15px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-white ring-1 ring-primary/20" />
                  <p className="text-sm text-slate-500 italic">Purchased on {format(product.purchaseDate, 'MMMM d, yyyy')}</p>
                </div>
              )}
            </div>
          </section>

          {/* Transfer Ownership CTA */}
          <section className="pt-4">
             <Button variant="outline" className="w-full border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-900">
               Transfer Ownership / Sell
             </Button>
          </section>
        </div>
      </div>
    </MobileLayout>
  );
}
