import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, Button } from "@/components/ui/index";

export default function Settings() {
  const { t, language, setLanguage } = useI18n();
  const { user } = useAuth();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">{t("settings.language")}</h2>
        <div className="flex gap-2">
          <Button variant={language === "ar" ? "primary" : "outline"} size="sm" onClick={() => setLanguage("ar")}>
            العربية
          </Button>
          <Button variant={language === "en" ? "primary" : "outline"} size="sm" onClick={() => setLanguage("en")}>
            English
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">{t("settings.account")}</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted">{t("auth.name")}</dt><dd className="font-medium">{user?.name}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">{t("auth.email")}</dt><dd className="font-medium">{user?.email}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">{t("user.role")}</dt><dd className="font-medium">{user && t(`role.${user.role}`)}</dd></div>
        </dl>
      </Card>
    </div>
  );
}
