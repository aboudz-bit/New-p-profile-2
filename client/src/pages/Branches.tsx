import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button, Card, Field, Input, Spinner } from "@/components/ui/index";
import { Modal } from "@/components/ui/Modal";
import { Table, Th, Td, Tr } from "@/components/ui/Table";

export default function Branches() {
  const { t } = useI18n();
  const { can } = useAuth();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", phone: "" });

  const { data, isLoading } = useQuery({ queryKey: ["branches"], queryFn: () => api.get<any[]>("/branches") });

  const create = useMutation({
    mutationFn: () => api.post("/branches", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setForm({ name: "", location: "", phone: "" });
      setShow(false);
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/branches/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["branches"] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("branches.title")}</h1>
        {can("branch:manage") && <Button onClick={() => setShow(true)}><Plus className="h-4 w-4" />{t("branches.add")}</Button>}
      </div>

      {isLoading ? <Spinner /> : !data?.length ? (
        <Card className="p-10 text-center text-sm text-muted">—</Card>
      ) : (
        <Table head={<><Th>{t("common.name")}</Th><Th>{t("branch.location")}</Th><Th>{t("branch.phone")}</Th><Th>{t("common.actions")}</Th></>}>
          {data.map((b) => (
            <Tr key={b.id}>
              <Td><span className="font-medium">{b.name}</span>{b.isPrimary && <span className="ms-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">★</span>}</Td>
              <Td>{b.location ?? "—"}</Td>
              <Td>{b.phone ?? "—"}</Td>
              <Td>
                {can("branch:manage") && !b.isPrimary && (
                  <button onClick={() => del.mutate(b.id)} className="text-muted hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                )}
              </Td>
            </Tr>
          ))}
        </Table>
      )}

      <Modal open={show} title={t("branches.add")} onClose={() => setShow(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <Field label={t("common.name")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label={t("branch.location")}><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          <Field label={t("branch.phone")}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShow(false)}>{t("common.cancel")}</Button>
            <Button type="submit" loading={create.isPending}>{t("common.save")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
