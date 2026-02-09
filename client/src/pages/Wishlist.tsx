import { MobileLayout } from "@/components/layout/MobileLayout";
import { useStore } from "@/hooks/use-store";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export default function Wishlist() {
  const { wishlistItems, toggleWishlist, addToCart } = useStore();
  const [, setLocation] = useLocation();

  return (
    <MobileLayout>
      <div className="flex flex-col min-h-screen pb-24 bg-slate-50">
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b px-6 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold font-display">Wishlist</h1>
            {/* Optional Compare Toggle could go here */}
        </div>

        <div className="p-4">
          {wishlistItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                <Heart className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg font-medium text-slate-900">Your wishlist is empty</p>
              <p className="text-sm text-slate-500 mb-6">Save items you want to buy later</p>
              <Link href="/products">
                <Button>Browse Products</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {wishlistItems.map(product => (
                <div 
                  key={product.id} 
                  className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 relative group"
                  onClick={(e) => {
                      // Navigate to product unless clicking a button
                      if ((e.target as HTMLElement).closest('button')) return;
                      setLocation(`/product/${product.id}`);
                  }}
                >
                    {/* Image Area */}
                    <div className="aspect-square bg-slate-100 relative">
                        {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                             <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
                                <span className="text-xs">No Image</span>
                             </div>
                        )}

                        {/* Remove Action */}
                        <button 
                            className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm z-20"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleWishlist(product);
                            }}
                            aria-label="Remove from wishlist"
                        >
                            <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-3">
                        <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">{product.brand}</div>
                        <h3 className="text-sm font-medium line-clamp-2 h-10 leading-tight mb-2">{product.name}</h3>
                        
                        <div className="flex items-center justify-between mt-auto">
                            <div className="font-semibold text-sm">
                                {/* Mock Price since it's not in Product interface */}
                                SR {(Math.random() * 1000 + 100).toFixed(0)}
                            </div>
                            
                            {/* Add to Cart Action */}
                            <button
                                className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md z-20 active:scale-95 transition-transform"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(product);
                                }}
                                aria-label="Add to cart"
                            >
                                <ShoppingCart className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
