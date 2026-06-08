import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button, Card, Field, Input, Select, Spinner, Badge } from "@/components/ui/index";
import { Modal } from "@/components/ui/Modal";
import { Table, Th, Td, Tr } from "@/components/ui/Table";
import type { UserRole } from "@shared/schema";

const ROLES: UserRole[] = ["admin", "manager", "technician", "viewer"];

export default function Users() {
  const { t } = useI18n();
  const { can } = useAuth();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "viewer" as UserRole });
  const [error, setError] = useState<string | null>(null);

  const allowed = can("user:manage");
  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<any[]>("/users"),
    enabled: allowed,
  });

  const create = useMutation({
    mutationFn: () => api.post("/users", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setForm({ name: "", email: "", password: "", role: "viewer" });
      setShow(false);
      setError(null);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Error"),
  });

  if (!allowed) return <Card className="p-10 text-center text-sm text-muted">403</Card>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("users.title")}</h1>
        <Button onClick={() => setShow(true)}><Plus className="h-4 w-4" />{t("users.add")}</Button>
      </div>

      {isLoading ? <Spinner /> : (
        <Table head={<><Th>{t("auth.name")}</Th><Th>{t("auth.email")}</Th><Th>{t("user.role")}</Th><Th>{t("profile.status")}</Th></>}>
          {data?.map((u) => (
            <Tr key={u.id}>
              <Td><span className="font-medium">{u.name}</span></Td>
              <Td>{u.email}</Td>
              <Td><Badge tone="brand">{t(`role.${u.role}` as never)}</Badge></Td>
              <Td>{u.status}</Td>
            </Tr>
          ))}
        </Table>
      )}

      <Modal open={show} title={t("users.add")} onClose={() => setShow(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <Field label={t("auth.name")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label={t("auth.email")}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
          <Field label={t("auth.password")}><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} /></Field>
          <Field label={t("user.role")}>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
              {ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}` as never)}</option>)}
            </Select>
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShow(false)}>{t("common.cancel")}</Button>
            <Button type="submit" loading={create.isPending}>{t("common.save")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
