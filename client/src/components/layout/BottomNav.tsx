import { BarChart3, Building2, Package, Users, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export function BottomNav() {
  const [location] = useLocation();
  const { t } = useI18n();

  const navItems = [
    { icon: BarChart3, label: t("nav.dashboard"), href: "/dashboard" },
    { icon: Package, label: t("nav.assets"), href: "/assets" },
    { icon: Building2, label: t("nav.branches"), href: "/branches" },
    { icon: FileText, label: t("nav.reports"), href: "/reports" },
    { icon: Users, label: t("nav.users"), href: "/users" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-white/80 backdrop-blur-md pb-safe-area-inset-bottom z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} data-testid={`link-nav-${item.href.replaceAll('/', '').trim() || 'home'}`}>
              <div
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors duration-200 cursor-pointer",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon
                  strokeWidth={isActive ? 2.5 : 2}
                  className={cn("w-6 h-6 transition-transform", isActive && "scale-110")}
                />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
