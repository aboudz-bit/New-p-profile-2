import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ShieldOff, PackageCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, Spinner, Badge } from "@/components/ui/index";
import { QRCode } from "@/components/QRCode";
import { StatusBadge } from "@/components/StatusBadge";

interface PublicProfile {
  pProfileId: string;
  productName: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  status: string;
  registered: boolean;
  serialVerified: boolean;
  registeredAt: string;
}

export default function PublicPreview() {
  const [, params] = useRoute("/p/:pProfileId");
  const pProfileId = params?.pProfileId ?? "";
  const { t } = useI18n();
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-profile", pProfileId],
    queryFn: () => api.get<PublicProfile>(`/public/profiles/${pProfileId}`),
    enabled: !!pProfileId,
    retry: false,
  });

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg p-4">
      <Card className="w-full max-w-md p-6">
        <div className="mb-4 text-center">
          <div className="text-lg font-bold text-brand-700">{t("app.name")}</div>
          <div className="text-xs text-muted">{t("public.title")}</div>
        </div>

        {isLoading ? (
          <Spinner />
        ) : isError || !data ? (
          <p className="py-10 text-center text-sm text-muted">{t("public.notFound")}</p>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3">
              <QRCode value={`${window.location.origin}/p/${data.pProfileId}`} size={140} />
              <div className="font-mono text-sm font-semibold">{data.pProfileId}</div>
            </div>

            <div className="text-center">
              <h1 className="text-xl font-bold">{data.productName}</h1>
              <p className="text-sm text-muted">{[data.brand, data.model].filter(Boolean).join(" · ")}</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge tone="brand">
                <PackageCheck className="me-1 inline h-3 w-3" />
                {t("public.registered")}
              </Badge>
              <StatusBadge status={data.status as never} />
              {data.serialVerified ? (
                <Badge tone="ok">
                  <ShieldCheck className="me-1 inline h-3 w-3" />
                  {t("public.verified")}
                </Badge>
              ) : (
                <Badge tone="neutral">
                  <ShieldOff className="me-1 inline h-3 w-3" />
                  {t("public.notVerified")}
                </Badge>
              )}
            </div>

            <div className="rounded-lg bg-brand-50 p-3 text-center text-xs text-muted">
              {user ? (
                <Link href="/registry" className="font-medium text-brand-600 hover:underline">
                  {t("nav.registry")}
                </Link>
              ) : (
                <Link href="/login" className="font-medium text-brand-600 hover:underline">
                  {t("public.loginPrompt")}
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
