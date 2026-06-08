import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button, Card, Field, Input, Select, Spinner, Badge } from "@/components/ui/index";
import { Modal } from "@/components/ui/Modal";
import { Table, Th, Td, Tr } from "@/components/ui/Table";
import type { DirectoryKind } from "@shared/schema";

const KINDS: DirectoryKind[] = ["service_center", "manufacturer", "warranty_provider"];
const SOURCES = ["platform_listed", "business_designated", "self_declared"] as const;

export default function Directory() {
  const { t } = useI18n();
  const { can } = useAuth();
  const [kind, setKind] = useState<DirectoryKind>("service_center");
  const [show, setShow] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["directory", kind],
    queryFn: () => api.get<any[]>(`/directory?kind=${kind}`),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.del(`/directory/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["directory"] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("directory.title")}</h1>
        {can("directory:write") && (
          <Button onClick={() => setShow(true)}>
            <Plus className="h-4 w-4" />
            {t("directory.add")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <Button
            key={k}
            size="sm"
            variant={kind === k ? "primary" : "outline"}
            onClick={() => setKind(k)}
          >
            {t(`directory.${k}`)}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data?.length ? (
        <Card className="p-10 text-center text-sm text-muted">{t("directory.empty")}</Card>
      ) : (
        <Table
          head={
            <>
              <Th>{t("common.name")}</Th>
              <Th>{t("directory.location")}</Th>
              <Th>{t("directory.contact")}</Th>
              {kind === "service_center" && <Th>{t("directory.authorization")}</Th>}
              <Th>{t("common.actions")}</Th>
            </>
          }
        >
          {data.map((d) => (
            <Tr key={d.id}>
              <Td>
                <div className="font-medium">{d.name}</div>
                {kind === "service_center" && Array.isArray(d.supportedBrands) && d.supportedBrands.length > 0 && (
                  <div className="text-xs text-muted">{d.supportedBrands.join(", ")}</div>
                )}
              </Td>
              <Td>{d.location ?? "—"}</Td>
              <Td>{d.contactInfo ?? "—"}</Td>
              {kind === "service_center" && (
                <Td>
                  {d.authorizationSource ? (
                    <Badge tone="neutral">{t(`auth_src.${d.authorizationSource}` as never)}</Badge>
                  ) : "—"}
                </Td>
              )}
              <Td>
                {can("directory:write") && (
                  <button onClick={() => del.mutate(d.id)} className="text-muted hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </Td>
            </Tr>
          ))}
        </Table>
      )}

      {show && <AddEntryModal initialKind={kind} onClose={() => setShow(false)} />}
    </div>
  );
}

function AddEntryModal({ initialKind, onClose }: { initialKind: DirectoryKind; onClose: () => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    kind: initialKind,
    name: "",
    location: "",
    contactInfo: "",
    website: "",
    authorizationSource: "self_declared" as (typeof SOURCES)[number],
    supportedBrands: "",
  });
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api.post("/directory", {
        kind: form.kind,
        name: form.name,
        location: form.location || undefined,
        contactInfo: form.contactInfo || undefined,
        website: form.website || undefined,
        authorizationSource: form.kind === "service_center" ? form.authorizationSource : undefined,
        supportedBrands:
          form.kind === "service_center" && form.supportedBrands
            ? form.supportedBrands.split(",").map((s) => s.trim()).filter(Boolean)
            : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["directory"] });
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Error"),
  });

  return (
    <Modal open title={t("directory.add")} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
        <Field label={t("directory.kind")}>
          <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as DirectoryKind })}>
            {KINDS.map((k) => <option key={k} value={k}>{t(`directory.${k}`)}</option>)}
          </Select>
        </Field>
        <Field label={t("common.name")}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("directory.location")}>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label={t("directory.contact")}>
            <Input value={form.contactInfo} onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} />
          </Field>
        </div>
        <Field label={t("directory.website")}>
          <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        </Field>
        {form.kind === "service_center" && (
          <>
            <Field label={t("directory.authorization")}>
              <Select
                value={form.authorizationSource}
                onChange={(e) => setForm({ ...form, authorizationSource: e.target.value as (typeof SOURCES)[number] })}
              >
                {SOURCES.map((s) => <option key={s} value={s}>{t(`auth_src.${s}` as never)}</option>)}
              </Select>
            </Field>
            <Field label={t("directory.brands")}>
              <Input
                value={form.supportedBrands}
                onChange={(e) => setForm({ ...form, supportedBrands: e.target.value })}
                placeholder="Apple, Samsung, ..."
              />
            </Field>
          </>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" loading={create.isPending}>{t("common.save")}</Button>
        </div>
      </form>
    </Modal>
  );
}
