import { MobileLayout } from "@/components/layout/MobileLayout";
import { useStore } from "@/hooks/use-store";
import { Button } from "@/components/ui/button";
import { Heart, Minus, Plus, ShoppingCart, Trash2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export default function Cart() {
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useStore();
  
  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => {
      // Mock price logic again
      const price = 500; // Placeholder
      return sum + (price * item.quantity);
  }, 0);

  return (
    <MobileLayout>
      <div className="flex flex-col min-h-screen pb-safe-area-inset-bottom bg-slate-50">
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b px-6 py-4">
            <div className="flex justify-between items-center mb-1">
                <h1 className="text-xl font-bold font-display">Cart</h1>
                <Link href="/wishlist">
                    <span className="text-xs font-medium text-primary cursor-pointer hover:underline">
                        Go to Wishlist
                    </span>
                </Link>
            </div>
        </div>

        <div className="p-4 flex-1">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                <ShoppingCart className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg font-medium text-slate-900">Your cart is empty</p>
              <Link href="/products">
                <Button className="mt-4">Start Shopping</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
                {cartItems.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex gap-4">
                        {/* Image */}
                        <div className="w-20 h-20 bg-slate-100 rounded-lg shrink-0 overflow-hidden">
                            {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">No Img</div>
                            )}
                        </div>
                        
                        {/* Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                                <div className="text-[10px] text-muted-foreground uppercase">{item.brand}</div>
                                <h3 className="text-sm font-medium line-clamp-1">{item.name}</h3>
                                <div className="font-bold mt-1 text-sm">SR 500</div>
                            </div>

                            <div className="flex justify-between items-end mt-2">
                                <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1 border border-slate-100">
                                    <button 
                                        className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white text-slate-500"
                                        onClick={() => updateQuantity(item.id, -1)}
                                        disabled={item.quantity <= 1}
                                    >
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-xs font-medium w-4 text-center">{item.quantity}</span>
                                    <button 
                                        className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white text-slate-500"
                                        onClick={() => updateQuantity(item.id, 1)}
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                                
                                <button 
                                    className="text-red-500 p-2 hover:bg-red-50 rounded-full"
                                    onClick={() => removeFromCart(item.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          )}
        </div>

        {/* Checkout Footer */}
        {cartItems.length > 0 && (
            <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] bg-white border-t p-4 shadow-lg space-y-4 z-20">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-bold text-lg">SR {subtotal}</span>
                </div>
                <Button className="w-full h-12 text-base font-semibold shadow-primary/20 shadow-lg" onClick={clearCart}>
                    Checkout <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        )}
      </div>
    </MobileLayout>
  );
}
