import { MobileLayout } from "@/components/layout/MobileLayout";
import { MOCK_PRODUCTS } from "@/lib/mockData";
import { ProductCard } from "@/components/ui/product-card";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export default function Products() {
  const [filter, setFilter] = useState<'all' | 'protected' | 'attention'>('all');
  const [search, setSearch] = useState('');
  const { t, language } = useI18n();

  const filteredProducts = MOCK_PRODUCTS.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filter === 'protected') return p.status === 'active';
    if (filter === 'attention') return p.status === 'expiring' || p.status === 'expired' || p.status === 'eligible';
    return true;
  });

  return (
    <MobileLayout>
      <div className="flex flex-col h-full min-h-screen">
        <div className="p-6 pb-2 sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h1 className="text-2xl font-display font-bold" data-testid="text-assets-title-legacy">{t("products.title")}</h1>
            <Link href="/assets" data-testid="link-open-assets">
              <Button size="sm" className="h-9">Open Asset Registry</Button>
            </Link>
          </div>
          
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", language === 'ar' ? "right-3" : "left-3")} />
              <Input 
                placeholder={t("products.search_placeholder")}
                className={cn("bg-slate-50 border-none shadow-none focus-visible:ring-1", language === 'ar' ? "pr-9 pl-3" : "pl-9 pr-3")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
              <SlidersHorizontal className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <Button 
              variant={filter === 'all' ? "default" : "outline"} 
              size="sm" 
              onClick={() => setFilter('all')}
              className="rounded-full text-xs h-8"
            >
              {t("products.filter.all")}
            </Button>
            <Button 
              variant={filter === 'protected' ? "default" : "outline"} 
              size="sm" 
              onClick={() => setFilter('protected')}
              className="rounded-full text-xs h-8"
            >
              {t("products.filter.protected")}
            </Button>
            <Button 
              variant={filter === 'attention' ? "default" : "outline"} 
              size="sm" 
              onClick={() => setFilter('attention')}
              className="rounded-full text-xs h-8"
            >
              {t("products.filter.attention")}
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-3 pb-24">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg font-medium text-slate-900">{t("products.empty.title")}</p>
              <p className="text-sm text-slate-500">{t("products.empty.subtitle")}</p>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
