import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  BookUser,
  Building2,
  Users,
  Settings,
  LogOut,
  Globe,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/translations";

interface NavItem {
  href: string;
  icon: typeof Package;
  key: TranslationKey;
  businessOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/", icon: LayoutDashboard, key: "nav.dashboard" },
  { href: "/registry", icon: Package, key: "nav.registry" },
  { href: "/directory", icon: BookUser, key: "nav.directory" },
  { href: "/branches", icon: Building2, key: "nav.branches", businessOnly: true },
  { href: "/users", icon: Users, key: "nav.users", businessOnly: true },
  { href: "/settings", icon: Settings, key: "nav.settings" },
];

function isActive(href: string, location: string) {
  return href === "/" ? location === "/" : location.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t, language, setLanguage } = useI18n();
  const { user, logout, isBusiness } = useAuth();
  const [location] = useLocation();

  const nav = NAV.filter((n) => !n.businessOnly || isBusiness);
  const mobileNav = nav.filter((n) =>
    ["/", "/registry", "/directory", "/settings"].includes(n.href),
  );

  return (
    <div className="flex min-h-[100dvh] bg-bg">
      {/* Desktop sidebar (logical start side → right in RTL, left in LTR) */}
      <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-e border-border bg-surface md:flex">
        <div className="px-5 py-5">
          <div className="text-lg font-bold text-brand-700">{t("app.name")}</div>
          <div className="text-xs text-muted">{t("app.tagline")}</div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, location);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-brand-600 text-white" : "text-fg hover:bg-brand-50",
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <div className="mb-2 px-2 text-xs text-muted">{user?.name}</div>
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-fg hover:bg-brand-50"
          >
            <LogOut className="h-4.5 w-4.5" />
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur md:px-6">
          <div className="font-semibold md:hidden">{t("app.name")}</div>
          <div className="hidden md:block" />
          <button
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-brand-50"
          >
            <Globe className="h-4 w-4" />
            {language === "ar" ? "English" : "العربية"}
          </button>
        </header>

        <main className="flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-8">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface md:hidden">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, location);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                active ? "text-brand-700" : "text-muted",
              )}
            >
              <Icon className="h-5 w-5" />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
