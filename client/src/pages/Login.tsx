import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button, Card, Field, Input } from "@/components/ui/index";

export default function Login() {
  const { t } = useI18n();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg p-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-xl font-bold text-brand-700">{t("app.name")}</h1>
        <p className="mb-6 text-sm text-muted">{t("auth.login")}</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t("auth.email")}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          <Field label={t("auth.password")}>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            {t("auth.signIn")}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted">
          {t("auth.noAccount")}{" "}
          <Link href="/register" className="font-medium text-brand-600">
            {t("auth.createAccount")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
