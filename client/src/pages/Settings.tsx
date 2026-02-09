import { MobileLayout } from "@/components/layout/MobileLayout";
import { MOCK_USER } from "@/lib/mockData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, Globe, Lock, ChevronRight, LogOut, Shield, ChevronLeft, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

export default function Settings() {
  const { language, setLanguage, t } = useI18n();
  const ChevronIcon = language === 'ar' ? ChevronLeft : ChevronRight;
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const handleLogout = () => {
      logout();
      setLocation("/role");
  };

  // If used in context where no auth (e.g. dev), fallback to mock
  const displayUser = user || { ...MOCK_USER, role: 'customer' };

  return (
    <MobileLayout>
      <div className="pb-24">
        {/* Profile Header */}
        <div className="p-6 bg-slate-50 border-b">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-white shadow-sm">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${displayUser.name}`} />
              <AvatarFallback>AM</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-display font-bold">{displayUser.name}</h1>
              <p className="text-sm text-muted-foreground">{displayUser.phone || displayUser.email}</p>
              <div className="flex items-center gap-2 mt-1">
                 <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold text-slate-600">
                     {displayUser.role?.replace('_', ' ')}
                 </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">

          {/* MERCHANT OWNER ONLY: Staff Management */}
          {displayUser.role === 'merchant_owner' && (
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Business Settings</h2>
                <button className="w-full flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 hover:bg-emerald-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-900">Staff Management</span>
                  </div>
                  <ChevronIcon className="w-4 h-4 text-emerald-600" />
                </button>
              </section>
          )}

          {/* Notifications */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("settings.notifications")}</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-slate-500" />
                    <span className="font-medium text-sm">{t("settings.warranty_expiry")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground px-6">{t("settings.warranty_expiry_desc")}</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-500" />
                    <span className="font-medium text-sm">{t("settings.protection_offers")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground px-6">{t("settings.protection_offers_desc")}</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </section>

          {/* Preferences */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("settings.preferences")}</h2>
            
            <button 
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
              onClick={toggleLanguage}
            >
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-slate-500" />
                <span className="font-medium">{t("settings.language")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {language === 'en' ? 'English' : 'العربية'}
                <ChevronIcon className="w-4 h-4" />
              </div>
            </button>

            <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-slate-500" />
                <span className="font-medium">{t("settings.privacy")}</span>
              </div>
              <ChevronIcon className="w-4 h-4 text-muted-foreground" />
            </button>
          </section>
          
          <Button 
            variant="outline" 
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
            onClick={handleLogout}
          >
            <LogOut className={cn("w-4 h-4", language === 'ar' ? "ml-2" : "mr-2")} />
            {t("settings.sign_out")}
          </Button>

          <div className="text-center text-xs text-slate-300 pt-8">
            Loom v1.1.0 (Mockup Mode)
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
