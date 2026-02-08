import { BottomNav } from "./BottomNav";
import { Toaster } from "@/components/ui/toaster";

interface MobileLayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export function MobileLayout({ children, showNav = true }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/20">
      <main className="max-w-md mx-auto min-h-screen bg-background shadow-2xl overflow-hidden pb-20 relative">
        {children}
      </main>
      {showNav && <BottomNav />}
      <Toaster />
    </div>
  );
}
