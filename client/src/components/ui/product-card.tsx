import { Link } from "wouter";
import { Product } from "@/lib/mockData";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card } from "@/components/ui/card";
import { ChevronRight, Heart } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/use-store";

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const { wishlistIds, toggleWishlist } = useStore();
  const isLiked = wishlistIds.includes(product.id);

  return (
    <div className="relative">
      <Link href={`/product/${product.id}`}>
        <Card className={cn("group cursor-pointer overflow-hidden transition-all hover:shadow-md border-border/50", compact ? "p-3" : "p-4 mb-3")}>
          <div className="flex items-center gap-4">
            <div className={cn("bg-slate-100 rounded-lg flex items-center justify-center shrink-0 text-2xl relative overflow-hidden", compact ? "w-10 h-10" : "w-14 h-14")}>
              {/* Placeholder for product image - using first letter of brand */}
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-display font-bold text-slate-300">
                  {product.brand.charAt(0)}
                </span>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-foreground truncate pr-8">{product.name}</h3>
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
      
      {/* Wishlist Button - Overlay */}
      <button
        className="absolute top-2 right-2 p-2 z-10 rounded-full hover:bg-slate-100/50 active:scale-90 transition-all"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleWishlist(product);
        }}
      >
        <Heart 
          className={cn("w-5 h-5 transition-colors", isLiked ? "fill-red-500 text-red-500" : "text-slate-400")} 
        />
      </button>
    </div>
  );
}
