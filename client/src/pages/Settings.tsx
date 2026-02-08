import { MobileLayout } from "@/components/layout/MobileLayout";
import { MOCK_USER } from "@/lib/mockData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, Globe, Lock, ChevronRight, LogOut, Shield } from "lucide-react";

export default function Settings() {
  return (
    <MobileLayout>
      <div className="pb-24">
        {/* Profile Header */}
        <div className="p-6 bg-slate-50 border-b">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-white shadow-sm">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${MOCK_USER.name}`} />
              <AvatarFallback>AM</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-display font-bold">{MOCK_USER.name}</h1>
              <p className="text-sm text-muted-foreground">{MOCK_USER.email}</p>
              <p className="text-xs text-slate-400 mt-1">Member since {MOCK_USER.memberSince}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Notifications */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notifications</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-slate-500" />
                    <span className="font-medium text-sm">Warranty Expiry</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">Get notified 30 days before expiry</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-500" />
                    <span className="font-medium text-sm">Protection Offers</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">Relevant protection plans for your products</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </section>

          {/* Preferences */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Preferences</h2>
            
            <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-slate-500" />
                <span className="font-medium">Language</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                English
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-slate-500" />
                <span className="font-medium">Privacy & Security</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </section>
          
          <Button variant="outline" className="w-full text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>

          <div className="text-center text-xs text-slate-300 pt-8">
            P Profile v1.0.0 (Build 2024.1)
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
