import { useState } from "react";
import { Link } from "wouter";
import { Building2, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button, Card, Field, Input } from "@/components/ui/index";
import { cn } from "@/lib/utils";

type AccountType = "business" | "personal";

export default function Register() {
  const { t } = useI18n();
  const { register } = useAuth();
  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [form, setForm] = useState({ companyName: "", name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({
        accountType,
        companyName: accountType === "business" ? form.companyName : undefined,
        name: form.name,
        email: form.email,
        password: form.password,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const types: { id: AccountType; icon: typeof User; label: string; desc: string }[] = [
    { id: "personal", icon: User, label: t("auth.personal"), desc: t("auth.personalDesc") },
    { id: "business", icon: Building2, label: t("auth.business"), desc: t("auth.businessDesc") },
  ];

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-bold text-brand-700">{t("app.name")}</h1>
        <p className="mb-5 text-sm text-muted">{t("auth.register")}</p>

        {/* Account-type toggle */}
        <div className="mb-5 grid grid-cols-2 gap-2">
          {types.map((ty) => {
            const Icon = ty.icon;
            const active = accountType === ty.id;
            return (
              <button
                key={ty.id}
                type="button"
                onClick={() => setAccountType(ty.id)}
                className={cn(
                  "rounded-xl border p-3 text-start transition-colors",
                  active ? "border-brand-500 bg-brand-50" : "border-border hover:bg-brand-50/50",
                )}
              >
                <Icon className={cn("mb-1 h-5 w-5", active ? "text-brand-600" : "text-muted")} />
                <div className="text-sm font-semibold">{ty.label}</div>
                <div className="text-xs text-muted">{ty.desc}</div>
              </button>
            );
          })}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {accountType === "business" && (
            <Field label={t("auth.companyName")}>
              <Input value={form.companyName} onChange={set("companyName")} required />
            </Field>
          )}
          <Field label={t("auth.fullName")}>
            <Input value={form.name} onChange={set("name")} required />
          </Field>
          <Field label={t("auth.email")}>
            <Input type="email" value={form.email} onChange={set("email")} required autoComplete="email" />
          </Field>
          <Field label={t("auth.password")}>
            <Input type="password" value={form.password} onChange={set("password")} required minLength={8} autoComplete="new-password" />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            {t("auth.createAccount")}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted">
          {t("auth.haveAccount")}{" "}
          <Link href="/login" className="font-medium text-brand-600">
            {t("auth.signIn")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
