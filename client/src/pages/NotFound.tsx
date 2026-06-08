import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="text-5xl font-bold text-brand-600">404</div>
      <Link href="/" className="text-sm font-medium text-brand-600 hover:underline">
        {t("nav.dashboard")}
      </Link>
    </div>
  );
}
