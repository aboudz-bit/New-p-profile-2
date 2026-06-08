import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, QrCode } from "lucide-react";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button, Card, Field, Input, Select, Spinner, Textarea } from "@/components/ui/index";
import { Table, Th, Td, Tr } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/format";
import { resolveModelId, NEW_MODEL, type ProductModelOption } from "@/lib/models";
import type { ProfileStatus } from "@shared/schema";

interface ProfileListItem {
  id: string;
  pProfileId: string;
  displayName: string;
  category: string | null;
  brand: string | null;
  serialNumber: string | null;
  status: ProfileStatus;
  branchName: string | null;
  internalReference: string | null;
  purchasePrice: string | null;
  currency: string;
  warrantyStatus: string | null;
}

const STATUSES: ProfileStatus[] = ["active", "in_service", "retired", "disposed"];

export default function ProductRegistry() {
  const { t } = useI18n();
  const { can, isBusiness } = useAuth();
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);
  const [showClaim, setShowClaim] = useState(false);

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  const qs = params.toString();

  const { data, isLoading } = useQuery({
    queryKey: ["profiles", q, status],
    queryFn: () => api.get<ProfileListItem[]>(`/profiles${qs ? `?${qs}` : ""}`),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("registry.title")}</h1>
        {can("profile:write") && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowClaim(true)}>
              <QrCode className="h-4 w-4" />
              {t("registry.claim")}
            </Button>
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" />
              {t("registry.add")}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted [inset-inline-start:0.75rem]" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("registry.search")}
            className="ps-9"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-48">
          <option value="">{t("profile.status")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">{t("registry.empty")}</Card>
      ) : (
        <Table
          head={
            <>
              <Th>{t("profile.name")}</Th>
              <Th>{t("profile.pProfileId")}</Th>
              <Th>{t("profile.serialNumber")}</Th>
              {isBusiness && <Th>{t("profile.branch")}</Th>}
              <Th>{t("profile.status")}</Th>
              <Th>{t("profile.warranties")}</Th>
              <Th>{t("profile.purchasePrice")}</Th>
            </>
          }
        >
          {data.map((p) => (
            <Tr key={p.id} onClick={() => navigate(`/registry/${p.id}`)}>
              <Td>
                <div className="font-medium">{p.displayName}</div>
                <div className="text-xs text-muted">{[p.brand, p.category].filter(Boolean).join(" · ")}</div>
              </Td>
              <Td className="font-mono text-xs">{p.pProfileId}</Td>
              <Td className="font-mono text-xs">{p.serialNumber ?? "—"}</Td>
              {isBusiness && <Td>{p.branchName ?? "—"}</Td>}
              <Td><StatusBadge status={p.status} /></Td>
              <Td><StatusBadge status={p.warrantyStatus as never} /></Td>
              <Td>{formatMoney(p.purchasePrice, p.currency)}</Td>
            </Tr>
          ))}
        </Table>
      )}

      {showAdd && <AddProfileModal onClose={() => setShowAdd(false)} />}
      {showClaim && <ClaimModal onClose={() => setShowClaim(false)} />}
    </div>
  );
}

function AddProfileModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { isBusiness } = useAuth();
  const [form, setForm] = useState({
    displayName: "",
    modelSelection: "",
    newModelName: "",
    category: "",
    brand: "",
    model: "",
    serialNumber: "",
    purchaseDate: "",
    purchasePrice: "",
    branchId: "",
    responsibleUserId: "",
    internalReference: "",
  });
  const [error, setError] = useState<string | null>(null);

  const branches = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.get<any[]>("/branches"),
    enabled: isBusiness,
  });
  const models = useQuery({
    queryKey: ["models"],
    queryFn: () => api.get<ProductModelOption[]>("/models"),
  });
  const assignable = useQuery({
    queryKey: ["users-assignable"],
    queryFn: () => api.get<{ id: string; name: string }[]>("/users/assignable"),
    enabled: isBusiness,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const productModelId = await resolveModelId(form.modelSelection, form.newModelName, {
        brand: form.brand,
        category: form.category,
      });
      return api.post("/profiles", {
        displayName: form.displayName,
        productModelId,
        category: form.category || null,
        brand: form.brand || null,
        model: form.model || null,
        serialNumber: form.serialNumber || null,
        purchaseDate: form.purchaseDate || null,
        purchasePrice: form.purchasePrice || null,
        branchId: isBusiness ? form.branchId || null : null,
        responsibleUserId: isBusiness ? form.responsibleUserId || null : null,
        internalReference: isBusiness ? form.internalReference || null : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Error"),
  });

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: e.target.value });
  }

  return (
    <Modal open title={t("registry.add")} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
        <Field label={t("profile.name")}>
          <Input value={form.displayName} onChange={field("displayName")} required />
        </Field>
        <Field label={t("profile.productModel")}>
          <Select value={form.modelSelection} onChange={field("modelSelection")}>
            <option value="">{t("model.none")}</option>
            {models.data?.map((m) => (
              <option key={m.id} value={m.id}>{[m.brand, m.name].filter(Boolean).join(" · ")}</option>
            ))}
            <option value={NEW_MODEL}>{t("model.new")}</option>
          </Select>
        </Field>
        {form.modelSelection === NEW_MODEL && (
          <Field label={t("model.create")}>
            <Input value={form.newModelName} onChange={field("newModelName")} placeholder={t("profile.name")} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("profile.category")}>
            <Input value={form.category} onChange={field("category")} />
          </Field>
          <Field label={t("profile.brand")}>
            <Input value={form.brand} onChange={field("brand")} />
          </Field>
          <Field label={t("profile.model")}>
            <Input value={form.model} onChange={field("model")} />
          </Field>
          <Field label={t("profile.serialNumber")}>
            <Input value={form.serialNumber} onChange={field("serialNumber")} />
          </Field>
          <Field label={t("profile.purchaseDate")}>
            <Input type="date" value={form.purchaseDate} onChange={field("purchaseDate")} />
          </Field>
          <Field label={t("profile.purchasePrice")}>
            <Input type="number" step="0.01" value={form.purchasePrice} onChange={field("purchasePrice")} />
          </Field>
          {isBusiness && (
            <>
              <Field label={t("profile.branch")}>
                <Select value={form.branchId} onChange={field("branchId")}>
                  <option value="">{t("common.none")}</option>
                  {branches.data?.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t("profile.responsibleUser")}>
                <Select value={form.responsibleUserId} onChange={field("responsibleUserId")}>
                  <option value="">{t("common.none")}</option>
                  {assignable.data?.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t("profile.internalReference")}>
                <Input value={form.internalReference} onChange={field("internalReference")} />
              </Field>
            </>
          )}
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" loading={mutation.isPending}>{t("common.save")}</Button>
        </div>
      </form>
    </Modal>
  );
}

interface ClaimResult {
  claimed: boolean;
  profile?: { id: string };
}

function ClaimModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const [pProfileId, setPProfileId] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [proof, setProof] = useState<{ name: string; base64: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    setProof({ name: file.name, base64 });
  }

  const mutation = useMutation({
    mutationFn: () =>
      api.post<ClaimResult>("/profiles/claim", {
        pProfileId,
        proofNote: proofNote || undefined,
        proofName: proof?.name,
        proofBase64: proof?.base64,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      if (res.claimed && res.profile) {
        onClose();
        navigate(`/registry/${res.profile.id}`);
      } else {
        // Owned profile → a pending claim request was created.
        setPending(true);
      }
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Error"),
  });

  return (
    <Modal open title={t("registry.claim")} onClose={onClose}>
      {pending ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-brand-50 p-3 text-sm">{t("claim.submitted")}</p>
          <div className="flex justify-end">
            <Button onClick={onClose}>{t("common.cancel")}</Button>
          </div>
        </div>
      ) : (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
          <p className="text-sm text-muted">{t("registry.claimDesc")}</p>
          <Field label={t("profile.pProfileId")}>
            <Input value={pProfileId} onChange={(e) => setPProfileId(e.target.value)} placeholder="PP-XXXXXXXXXX" required />
          </Field>
          <Field label={t("claim.proofNote")}>
            <Textarea value={proofNote} onChange={(e) => setProofNote(e.target.value)} />
          </Field>
          <Field label={t("claim.proofFile")}>
            <input type="file" onChange={onFile} className="text-sm" />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" loading={mutation.isPending}>{t("registry.claim")}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
