import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowRight, Plus, Trash2, Upload, Copy, Check, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button, Card, Field, Input, Select, Textarea, Spinner } from "@/components/ui/index";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { QRCode } from "@/components/QRCode";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { resolveModelId, NEW_MODEL, type ProductModelOption } from "@/lib/models";
import type { WarrantyType, MaintenanceStatus, MaintenanceType } from "@shared/schema";

export default function ProductProfile() {
  const [, params] = useRoute("/registry/:id");
  const id = params?.id;
  const { t } = useI18n();
  const { can } = useAuth();
  const [tab, setTab] = useState("overview");
  const [showEdit, setShowEdit] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", id],
    queryFn: () => api.get<any>(`/profiles/${id}`),
    enabled: !!id,
  });

  if (isLoading) return <Spinner />;
  if (!profile) return <Card className="p-10 text-center text-muted">{t("profile.notFound")}</Card>;

  const tabs = [
    { id: "overview", label: t("profile.overview") },
    { id: "warranties", label: t("profile.warranties"), count: profile.warranties?.length ?? 0 },
    { id: "service", label: t("profile.service"), count: profile.maintenanceRecords?.length ?? 0 },
    { id: "documents", label: t("profile.documents"), count: profile.documents?.length ?? 0 },
    { id: "serviceCenters", label: t("profile.serviceCenters") },
    { id: "history", label: t("profile.history"), count: profile.statusHistory?.length ?? 0 },
  ];

  return (
    <div className="space-y-5">
      <Link href="/registry" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowRight className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
        {t("common.back")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{profile.displayName}</h1>
          <p className="text-sm text-muted">{[profile.brand, profile.model].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={profile.status} />
          {can("profile:write") && (
            <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>
              <Pencil className="h-4 w-4" />
              {t("common.edit")}
            </Button>
          )}
        </div>
      </div>

      {can("profile:write") && (profile.claimRequests?.length ?? 0) > 0 && (
        <ClaimRequestsBanner profileId={id!} requests={profile.claimRequests} />
      )}

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "overview" && <Overview profile={profile} />}
      {tab === "history" && <HistoryTab history={profile.statusHistory ?? []} />}
      {tab === "warranties" && <WarrantiesTab profileId={id!} warranties={profile.warranties ?? []} />}
      {tab === "service" && <ServiceTab profileId={id!} records={profile.maintenanceRecords ?? []} />}
      {tab === "documents" && <DocumentsTab profileId={id!} documents={profile.documents ?? []} />}
      {tab === "serviceCenters" && <ServiceCentersTab profileId={id!} linkedIds={profile.serviceCenterIds ?? []} />}

      {showEdit && <EditProfileModal profileId={id!} profile={profile} onClose={() => setShowEdit(false)} />}
    </div>
  );
}

/* ---------------- Status history ---------------- */
function HistoryTab({ history }: { history: any[] }) {
  const { t } = useI18n();
  if (!history.length)
    return <Card className="p-6 text-center text-sm text-muted">{t("history.empty")}</Card>;
  return (
    <ol className="relative space-y-3 border-s-2 border-border ps-4">
      {history.map((h) => (
        <li key={h.id} className="relative">
          <span className="absolute -start-[1.30rem] top-3 h-2.5 w-2.5 rounded-full bg-brand-500" />
          <Card className="p-3">
            <div className="flex items-center gap-2 text-sm">
              {h.oldStatus && (
                <>
                  <StatusBadge status={h.oldStatus} />
                  <span className="text-muted">→</span>
                </>
              )}
              <StatusBadge status={h.newStatus} />
            </div>
            <div className="mt-1 text-xs text-muted">
              {formatDateTime(h.createdAt)}
              {h.changedByName ? ` · ${h.changedByName}` : ""}
              {h.reason ? ` · ${h.reason}` : ""}
            </div>
          </Card>
        </li>
      ))}
    </ol>
  );
}

/* ---------------- Claim requests (incoming, for the owner) ---------------- */
function ClaimRequestsBanner({ profileId, requests }: { profileId: string; requests: any[] }) {
  const { t } = useI18n();
  const reject = useMutation({
    mutationFn: (cid: string) => api.patch(`/claim-requests/${cid}`, { action: "reject" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile", profileId] }),
  });
  return (
    <Card className="border-warn/40 bg-warn/5 p-4">
      <h2 className="mb-2 text-sm font-semibold">
        {t("claim.requests")} ({requests.length})
      </h2>
      <div className="space-y-2">
        {requests.map((r) => (
          <div
            key={r.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface p-3 text-sm"
          >
            <div className="min-w-0">
              <div className="font-medium">{r.requesterName ?? "—"}</div>
              {r.proofNote && <div className="text-xs text-muted">{r.proofNote}</div>}
              {r.proofUrl && (
                <a
                  href={r.proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand-600 hover:underline"
                >
                  {t("claim.proofFile")}
                </a>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              loading={reject.isPending}
              onClick={() => reject.mutate(r.id)}
            >
              {t("claim.reject")}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- Edit profile ---------------- */
const PROFILE_STATUSES = ["active", "in_service", "retired", "disposed"] as const;

function EditProfileModal({
  profileId,
  profile,
  onClose,
}: {
  profileId: string;
  profile: any;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { isBusiness } = useAuth();
  const [form, setForm] = useState({
    displayName: profile.displayName ?? "",
    modelSelection: profile.productModelId ?? "",
    newModelName: "",
    category: profile.category ?? "",
    brand: profile.brand ?? "",
    model: profile.model ?? "",
    serialNumber: profile.serialNumber ?? "",
    status: (profile.status ?? "active") as (typeof PROFILE_STATUSES)[number],
    notes: profile.notes ?? "",
    branchId: profile.context?.branchId ?? "",
    responsibleUserId: profile.context?.responsibleUserId ?? "",
    internalReference: profile.context?.internalReference ?? "",
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

  const save = useMutation({
    mutationFn: async () => {
      const productModelId = await resolveModelId(form.modelSelection, form.newModelName, {
        brand: form.brand,
        category: form.category,
      });
      return api.patch(`/profiles/${profileId}`, {
        displayName: form.displayName,
        productModelId,
        category: form.category || null,
        brand: form.brand || null,
        model: form.model || null,
        serialNumber: form.serialNumber || null,
        status: form.status,
        notes: form.notes || null,
        branchId: isBusiness ? form.branchId || null : undefined,
        responsibleUserId: isBusiness ? form.responsibleUserId || null : undefined,
        internalReference: isBusiness ? form.internalReference || null : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", profileId] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Error"),
  });

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [key]: e.target.value });
  }

  return (
    <Modal open title={t("common.edit")} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
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
          <Field label={t("profile.status")}>
            <Select value={form.status} onChange={field("status")}>
              {PROFILE_STATUSES.map((s) => (
                <option key={s} value={s}>{t(`status.${s}` as never)}</option>
              ))}
            </Select>
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
            </>
          )}
        </div>
        {isBusiness && (
          <Field label={t("profile.internalReference")}>
            <Input value={form.internalReference} onChange={field("internalReference")} />
          </Field>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" loading={save.isPending}>{t("common.save")}</Button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Overview (incl. Identity & QR) ---------------- */
function Overview({ profile }: { profile: any }) {
  const { t } = useI18n();
  const { isBusiness } = useAuth();
  const [copied, setCopied] = useState(false);
  const publicUrl = `${window.location.origin}/p/${profile.pProfileId}`;

  function copyId() {
    navigator.clipboard?.writeText(profile.pProfileId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const rows: [string, string][] = [
    [t("profile.productModel"), profile.productModel?.name ?? "—"],
    [t("profile.category"), profile.category ?? "—"],
    [t("profile.brand"), profile.brand ?? "—"],
    [t("profile.model"), profile.model ?? "—"],
    [t("profile.serialNumber"), profile.serialNumber ?? "—"],
    [t("profile.purchaseDate"), formatDate(profile.purchase?.purchaseDate)],
    [t("profile.purchasePrice"), formatMoney(profile.purchase?.total, profile.purchase?.currency)],
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Identity & QR */}
      <Card className="p-5 lg:col-span-1">
        <h2 className="mb-3 text-sm font-semibold text-muted">{t("profile.identity")}</h2>
        <div className="flex flex-col items-center gap-3">
          <QRCode value={publicUrl} />
          <div className="text-center">
            <div className="font-mono text-sm font-semibold">{profile.pProfileId}</div>
            <button onClick={copyId} className="mt-1 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? t("common.copied") : t("common.copy")}
            </button>
          </div>
        </div>
      </Card>

      {/* Details */}
      <Card className="divide-y divide-border lg:col-span-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between px-5 py-3 text-sm">
            <span className="text-muted">{label}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
        {isBusiness && profile.context && (
          <>
            <div className="flex justify-between px-5 py-3 text-sm">
              <span className="text-muted">{t("profile.branch")}</span>
              <span className="font-medium">{profile.context.branchName ?? "—"}</span>
            </div>
            <div className="flex justify-between px-5 py-3 text-sm">
              <span className="text-muted">{t("profile.responsibleUser")}</span>
              <span className="font-medium">{profile.context.responsibleUserName ?? "—"}</span>
            </div>
            <div className="flex justify-between px-5 py-3 text-sm">
              <span className="text-muted">{t("profile.internalReference")}</span>
              <span className="font-medium">{profile.context.internalReference ?? "—"}</span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/* ---------------- Warranties (timeline) ---------------- */
function WarrantiesTab({ profileId, warranties }: { profileId: string; warranties: any[] }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    type: "manufacturer" as WarrantyType,
    providerName: "",
    startDate: "",
    endDate: "",
    coverageSummary: "",
    supersedesId: "",
    shareableWithProvider: false,
  });

  const create = useMutation({
    mutationFn: () =>
      api.post("/warranties", {
        profileId,
        type: form.type,
        providerName: form.providerName || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        coverageSummary: form.coverageSummary || null,
        supersedesId: form.supersedesId || null,
        shareableWithProvider: form.shareableWithProvider,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", profileId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShow(false);
    },
  });
  const del = useMutation({
    mutationFn: (wid: string) => api.del(`/warranties/${wid}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile", profileId] }),
  });

  return (
    <div className="space-y-3">
      {can("warranty:write") && (
        <Button size="sm" onClick={() => setShow(true)}>
          <Plus className="h-4 w-4" />
          {t("warranty.add")}
        </Button>
      )}
      {warranties.length === 0 && <Card className="p-6 text-center text-sm text-muted">—</Card>}

      {/* Coverage timeline */}
      <ol className="relative space-y-3 border-s-2 border-border ps-4">
        {warranties.map((w) => (
          <li key={w.id} className="relative">
            <span className="absolute -inset-y-0 -start-[1.30rem] top-4 h-2.5 w-2.5 rounded-full bg-brand-500" />
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{t(`warranty.${w.type}` as never)}</span>
                    <StatusBadge status={w.status} />
                  </div>
                  <p className="text-sm text-muted">{w.providerName ?? "—"}</p>
                </div>
                {can("warranty:write") && (
                  <button onClick={() => del.mutate(w.id)} className="text-muted hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div><div className="text-xs text-muted">{t("warranty.startDate")}</div>{formatDate(w.startDate)}</div>
                <div><div className="text-xs text-muted">{t("warranty.endDate")}</div>{formatDate(w.endDate)}</div>
                <div><div className="text-xs text-muted">{t("warranty.remainingDays")}</div>{w.remainingDays ?? "—"}</div>
              </div>
              {w.supersedesId && <p className="mt-2 text-xs text-brand-600">↳ {t("warranty.supersedes")}</p>}
              {w.coverageSummary && <p className="mt-2 rounded-lg bg-brand-50 p-2 text-xs text-muted">{w.coverageSummary}</p>}
            </Card>
          </li>
        ))}
      </ol>

      <Modal open={show} title={t("warranty.add")} onClose={() => setShow(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <Field label={t("warranty.type")}>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as WarrantyType })}>
              <option value="manufacturer">{t("warranty.manufacturer")}</option>
              <option value="extended">{t("warranty.extended")}</option>
              <option value="protection_plan">{t("warranty.protection_plan")}</option>
            </Select>
          </Field>
          <Field label={t("warranty.provider")}>
            <Input value={form.providerName} onChange={(e) => setForm({ ...form, providerName: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("warranty.startDate")}>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </Field>
            <Field label={t("warranty.endDate")}>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </Field>
          </div>
          {warranties.length > 0 && form.type !== "manufacturer" && (
            <Field label={t("warranty.supersedes")}>
              <Select value={form.supersedesId} onChange={(e) => setForm({ ...form, supersedesId: e.target.value })}>
                <option value="">{t("common.none")}</option>
                {warranties.map((w) => (
                  <option key={w.id} value={w.id}>{t(`warranty.${w.type}` as never)} · {formatDate(w.endDate)}</option>
                ))}
              </Select>
            </Field>
          )}
          <Field label={t("warranty.coverage")}>
            <Textarea value={form.coverageSummary} onChange={(e) => setForm({ ...form, coverageSummary: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={form.shareableWithProvider}
              onChange={(e) => setForm({ ...form, shareableWithProvider: e.target.checked })}
            />
            {t("warranty.shareable")}
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShow(false)}>{t("common.cancel")}</Button>
            <Button type="submit" loading={create.isPending}>{t("common.save")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ---------------- Service history ---------------- */
function ServiceTab({ profileId, records }: { profileId: string; records: any[] }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    date: "",
    type: "service" as MaintenanceType,
    status: "open" as MaintenanceStatus,
    description: "",
    serviceCenterId: "",
    providerName: "",
    cost: "",
    notes: "",
  });

  const centers = useQuery({
    queryKey: ["directory", "service_center"],
    queryFn: () => api.get<any[]>("/directory?kind=service_center"),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post("/maintenance", {
        profileId,
        date: form.date || null,
        type: form.type,
        status: form.status,
        description: form.description || null,
        serviceCenterId: form.serviceCenterId || null,
        providerName: form.providerName || null,
        cost: form.cost || null,
        notes: form.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", profileId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShow(false);
    },
  });

  const TYPES: MaintenanceType[] = ["repair", "service", "inspection", "part_replacement", "other"];

  return (
    <div className="space-y-3">
      {can("maintenance:write") && (
        <Button size="sm" onClick={() => setShow(true)}>
          <Plus className="h-4 w-4" />
          {t("maintenance.add")}
        </Button>
      )}
      {records.length === 0 && <Card className="p-6 text-center text-sm text-muted">{t("maintenance.empty")}</Card>}
      {records.map((m) => (
        <Card key={m.id} className="p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">{m.type}</span>
            <StatusBadge status={m.status} />
          </div>
          <p className="mt-1 text-sm">{m.description ?? "—"}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>{formatDate(m.date)}</span>
            {m.serviceCenter?.name && <span>{m.serviceCenter.name}</span>}
            {m.providerName && <span>{m.providerName}</span>}
            {m.cost && <span>{formatMoney(m.cost, m.currency)}</span>}
          </div>
        </Card>
      ))}

      <Modal open={show} title={t("maintenance.add")} onClose={() => setShow(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("maintenance.date")}>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label={t("maintenance.type")}>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as MaintenanceType })}>
                {TYPES.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
              </Select>
            </Field>
            <Field label={t("maintenance.status")}>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MaintenanceStatus })}>
                <option value="open">{t("status.open")}</option>
                <option value="in_progress">{t("status.in_progress")}</option>
                <option value="completed">{t("status.completed")}</option>
              </Select>
            </Field>
            <Field label={t("maintenance.cost")}>
              <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </Field>
          </div>
          <Field label={t("maintenance.serviceCenter")}>
            <Select value={form.serviceCenterId} onChange={(e) => setForm({ ...form, serviceCenterId: e.target.value })}>
              <option value="">{t("common.none")}</option>
              {centers.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label={t("maintenance.provider")}>
            <Input value={form.providerName} onChange={(e) => setForm({ ...form, providerName: e.target.value })} />
          </Field>
          <Field label={t("maintenance.description")}>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShow(false)}>{t("common.cancel")}</Button>
            <Button type="submit" loading={create.isPending}>{t("common.save")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ---------------- Documents ---------------- */
function DocumentsTab({ profileId, documents }: { profileId: string; documents: any[] }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const [busy, setBusy] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      await api.post("/documents", {
        name: file.name,
        type: "other",
        profileId,
        mimeType: file.type,
        contentBase64: base64,
      });
      queryClient.invalidateQueries({ queryKey: ["profile", profileId] });
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const del = useMutation({
    mutationFn: (did: string) => api.del(`/documents/${did}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile", profileId] }),
  });

  return (
    <div className="space-y-3">
      {can("document:write") && (
        <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700">
          <Upload className="h-4 w-4" />
          {busy ? t("common.loading") : t("common.add")}
          <input type="file" className="hidden" onChange={onFile} disabled={busy} />
        </label>
      )}
      {documents.length === 0 && <Card className="p-6 text-center text-sm text-muted">—</Card>}
      {documents.map((d) => (
        <Card key={d.id} className="flex items-center justify-between p-3">
          <a href={d.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-600 hover:underline">
            {d.name}
          </a>
          {can("document:write") && (
            <button onClick={() => del.mutate(d.id)} className="text-muted hover:text-danger">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ---------------- Service Centers links ---------------- */
function ServiceCentersTab({ profileId, linkedIds }: { profileId: string; linkedIds: string[] }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const [selected, setSelected] = useState<string[]>(linkedIds);
  const all = useQuery({
    queryKey: ["directory", "service_center"],
    queryFn: () => api.get<any[]>("/directory?kind=service_center"),
  });

  const save = useMutation({
    mutationFn: () => api.put(`/profiles/${profileId}/service-centers`, { directoryEntryIds: selected }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile", profileId] }),
  });

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="space-y-3">
      {all.data?.length === 0 && <Card className="p-6 text-center text-sm text-muted">{t("directory.empty")}</Card>}
      <div className="space-y-2">
        {all.data?.map((sc) => (
          <label key={sc.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface p-3 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(sc.id)}
              onChange={() => toggle(sc.id)}
              disabled={!can("profile:write")}
            />
            <div>
              <div className="font-medium">{sc.name}</div>
              <div className="text-xs text-muted">{sc.location ?? "—"}</div>
            </div>
          </label>
        ))}
      </div>
      {can("profile:write") && (
        <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>
          {t("common.save")}
        </Button>
      )}
    </div>
  );
}
