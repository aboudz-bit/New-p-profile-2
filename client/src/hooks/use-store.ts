import { useState, useEffect } from 'react';
import { Product, MOCK_PRODUCTS } from '@/lib/mockData';
import { toast } from '@/hooks/use-toast';

export interface CartItem extends Product {
  quantity: number;
}

// Simple event bus for cross-component updates without context hell
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

export const useStore = () => {
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const loadData = () => {
      try {
        const storedWishlist = localStorage.getItem('favorites'); // Using 'favorites' as requested
        const storedCart = localStorage.getItem('cart');
        
        if (storedWishlist) setWishlistIds(JSON.parse(storedWishlist));
        if (storedCart) setCartItems(JSON.parse(storedCart));
      } catch (e) {
        console.error("Failed to load store", e);
      } finally {
        setIsInitialized(true);
      }
    };

    loadData();

    // Subscribe to changes
    listeners.add(loadData);
    return () => {
      listeners.delete(loadData);
    };
  }, []);

  // Actions
  const toggleWishlist = (product: Product) => {
    const newIds = wishlistIds.includes(product.id)
      ? wishlistIds.filter(id => id !== product.id)
      : [...wishlistIds, product.id];
    
    setWishlistIds(newIds);
    localStorage.setItem('favorites', JSON.stringify(newIds));
    
    if (newIds.includes(product.id)) {
      toast({ title: "Added to Wishlist", description: `${product.name} saved to favorites` });
    } else {
      toast({ title: "Removed from Wishlist" });
    }
    notify();
  };

  const addToCart = (product: Product) => {
    const existing = cartItems.find(item => item.id === product.id);
    let newCart;
    
    if (existing) {
      newCart = cartItems.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      newCart = [...cartItems, { ...product, quantity: 1 }];
    }
    
    setCartItems(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    toast({ title: "Added to Cart", description: `${product.name} added to your cart` });
    notify();
  };

  const removeFromCart = (productId: string) => {
    const newCart = cartItems.filter(item => item.id !== productId);
    setCartItems(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    notify();
  };

  const updateQuantity = (productId: string, delta: number) => {
    const newCart = cartItems.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setCartItems(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    notify();
  };

  const clearCart = () => {
      setCartItems([]);
      localStorage.setItem('cart', JSON.stringify([]));
      notify();
  };

  // Hydrate full objects
  const wishlistItems = wishlistIds
    .map(id => MOCK_PRODUCTS.find(p => p.id === id))
    .filter((p): p is Product => !!p);

  return {
    wishlistIds,
    wishlistItems,
    cartItems,
    toggleWishlist,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isInitialized
  };
};
