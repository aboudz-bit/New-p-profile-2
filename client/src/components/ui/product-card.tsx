import { Link } from "wouter";
import { Product } from "@/lib/mockData";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  return (
    <Link href={`/product/${product.id}`}>
      <Card className={cn("group cursor-pointer overflow-hidden transition-all hover:shadow-md border-border/50", compact ? "p-3" : "p-4 mb-3")}>
        <div className="flex items-center gap-4">
          <div className={cn("bg-slate-100 rounded-lg flex items-center justify-center shrink-0 text-2xl", compact ? "w-10 h-10" : "w-14 h-14")}>
            {/* Placeholder for product image - using first letter of brand */}
            <span className="font-display font-bold text-slate-300">
              {product.brand.charAt(0)}
            </span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-foreground truncate pr-2">{product.name}</h3>
                <p className="text-xs text-muted-foreground">{product.brand} • {product.category}</p>
              </div>
              {!compact && <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />}
            </div>
            
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={product.status} showIcon={!compact} />
              {!compact && product.status === 'expiring' && (
                <span className="text-xs text-amber-600 font-medium">
                  Expires {format(product.manufacturerWarranty.endDate, 'MMM d')}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
