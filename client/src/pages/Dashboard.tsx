import { useQuery } from "@tanstack/react-query";
import { Package, Wrench, ShieldAlert, ShieldX } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, Spinner } from "@/components/ui/index";
import { formatDateTime } from "@/lib/format";

interface Stats {
  totalProfiles: number;
  profilesInService: number;
  openMaintenance: number;
  expiredWarranties: number;
  expiringWarranties: number;
  recentActivity: {
    id: string;
    action: string;
    summary: string | null;
    entityType: string;
    createdAt: string;
    actorName: string | null;
  }[];
}

export default function Dashboard() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<Stats>("/dashboard/stats"),
  });

  if (isLoading || !data) return <Spinner />;

  const cards = [
    { label: t("dashboard.totalProfiles"), value: data.totalProfiles, icon: Package, tone: "text-brand-600" },
    { label: t("dashboard.inService"), value: data.profilesInService, icon: Wrench, tone: "text-warn" },
    { label: t("dashboard.expiringWarranties"), value: data.expiringWarranties, icon: ShieldAlert, tone: "text-warn" },
    { label: t("dashboard.expiredWarranties"), value: data.expiredWarranties, icon: ShieldX, tone: "text-danger" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">{c.label}</span>
                <Icon className={`h-5 w-5 ${c.tone}`} />
              </div>
              <div className="mt-2 text-3xl font-bold">{c.value}</div>
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <h2 className="mb-4 font-semibold">{t("dashboard.recentActivity")}</h2>
        {data.recentActivity.length === 0 ? (
          <p className="text-sm text-muted">{t("dashboard.noActivity")}</p>
        ) : (
          <ul className="space-y-3">
            {data.recentActivity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{a.summary ?? `${a.entityType} ${a.action}`}</p>
                  <p className="text-xs text-muted">
                    {a.actorName ? `${a.actorName} · ` : ""}
                    {formatDateTime(a.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
