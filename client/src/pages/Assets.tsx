import { MobileLayout } from "@/components/layout/MobileLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useB2BStore, useActiveCompany, useActiveUser, roleAllows } from "@/lib/b2bStore";
import type { AssetStatus, WarrantyStatus } from "@/lib/b2bTypes";
import { enrichAssetWarranty } from "@/lib/warranty";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Building2,
  Filter,
  Plus,
  Search,
  ShieldCheck,
  ShieldX,
  Trash2,
  TriangleAlert,
  User2,
  ArrowUpDown,
} from "lucide-react";
import { useMemo, useState } from "react";

type SortKey = "name" | "purchase" | "warrantyEnd" | "assetNumber";

type FormState = {
  name: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyMonths: number;
  warrantyEndDate: string;
  overrideWarrantyEndDate: boolean;
  branchId: string;
  responsibleUserId: string;
  status: AssetStatus;
  notes: string;
};

function statusPill(warrantyStatus: WarrantyStatus) {
  if (warrantyStatus === "ACTIVE") {
    return {
      label: "Active / نشط",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: ShieldCheck,
    };
  }
  if (warrantyStatus === "EXPIRING_SOON") {
    return {
      label: "Expiring / قريب",
      className: "bg-amber-50 text-amber-700 border-amber-200",
      icon: TriangleAlert,
    };
  }
  return {
    label: "Expired / منتهي",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    icon: ShieldX,
  };
}

export default function Assets() {
  const { state, setActiveCompanyId, createAsset, updateAsset, deleteAsset } = useB2BStore();
  const company = useActiveCompany();
  const user = useActiveUser();

  const branches = useMemo(
    () => state.branches.filter((b) => b.companyId === state.activeCompanyId),
    [state.branches, state.activeCompanyId]
  );
  const users = useMemo(
    () => state.users.filter((u) => u.companyId === state.activeCompanyId),
    [state.users, state.activeCompanyId]
  );
  const assets = useMemo(
    () => state.assets.filter((a) => a.companyId === state.activeCompanyId),
    [state.assets, state.activeCompanyId]
  );

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "all">("all");
  const [warrantyFilter, setWarrantyFilter] = useState<WarrantyStatus | "all">("all");

  const [sortKey, setSortKey] = useState<SortKey>("warrantyEnd");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => ({
    name: "",
    serialNumber: "",
    purchaseDate: format(new Date(), "yyyy-MM-dd"),
    warrantyMonths: 12,
    warrantyEndDate: format(new Date(), "yyyy-MM-dd"),
    overrideWarrantyEndDate: false,
    branchId: "",
    responsibleUserId: "",
    status: "ACTIVE",
    notes: "",
  }));

  const canEditAssets = roleAllows(user.role, "ASSETS_EDIT") || user.role === "ADMIN";

  const headerStats = useMemo(() => {
    const active = assets.filter((a) => a.status === "ACTIVE").length;
    const maint = assets.filter((a) => a.status === "MAINTENANCE").length;
    const retired = assets.filter((a) => a.status === "RETIRED").length;
    return { active, maint, retired };
  }, [assets]);

  const enriched = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = assets
      .map((a) => {
        const w = enrichAssetWarranty(a);
        return { asset: a, ...w };
      })
      .filter(({ asset }) => {
        if (!q) return true;
        return (
          asset.internalAssetNumber.toLowerCase().includes(q) ||
          asset.name.toLowerCase().includes(q) ||
          asset.serialNumber.toLowerCase().includes(q)
        );
      })
      .filter(({ asset }) => (branchFilter === "all" ? true : asset.branchId === branchFilter))
      .filter(({ asset }) => (statusFilter === "all" ? true : asset.status === statusFilter))
      .filter(({ warrantyStatus }) => (warrantyFilter === "all" ? true : warrantyStatus === warrantyFilter));

    const dir = sortDir === "asc" ? 1 : -1;
    const sorted = [...list].sort((a, b) => {
      if (sortKey === "name") return a.asset.name.localeCompare(b.asset.name) * dir;
      if (sortKey === "purchase") return (new Date(a.asset.purchaseDate).getTime() - new Date(b.asset.purchaseDate).getTime()) * dir;
      if (sortKey === "warrantyEnd") return (new Date(a.endDateISO).getTime() - new Date(b.endDateISO).getTime()) * dir;
      return a.asset.internalAssetNumber.localeCompare(b.asset.internalAssetNumber) * dir;
    });

    return sorted;
  }, [assets, search, branchFilter, statusFilter, warrantyFilter, sortKey, sortDir]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: "",
      serialNumber: "",
      purchaseDate: format(new Date(), "yyyy-MM-dd"),
      warrantyMonths: 12,
      warrantyEndDate: format(new Date(), "yyyy-MM-dd"),
      overrideWarrantyEndDate: false,
      branchId: branches[0]?.id ?? "",
      responsibleUserId: users[0]?.id ?? "",
      status: "ACTIVE",
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (id: string) => {
    const a = assets.find((x) => x.id === id);
    if (!a) return;
    const w = enrichAssetWarranty(a);

    setEditingId(id);
    setForm({
      name: a.name,
      serialNumber: a.serialNumber,
      purchaseDate: format(new Date(a.purchaseDate), "yyyy-MM-dd"),
      warrantyMonths: a.warrantyMonths,
      warrantyEndDate: format(new Date(w.endDateISO), "yyyy-MM-dd"),
      overrideWarrantyEndDate: Boolean(a.warrantyEndDate),
      branchId: a.branchId,
      responsibleUserId: a.responsibleUser?.id ?? "",
      status: a.status,
      notes: "",
    });
    setDialogOpen(true);
  };

  const validate = () => {
    if (!form.name.trim()) return false;
    if (!form.serialNumber.trim()) return false;
    if (!form.branchId) return false;
    if (!form.responsibleUserId) return false;
    if (!Number.isFinite(form.warrantyMonths) || form.warrantyMonths < 0 || form.warrantyMonths > 120) return false;
    return true;
  };

  const submit = () => {
    if (!validate()) return;

    const responsible = users.find((u) => u.id === form.responsibleUserId);
    if (!responsible) return;

    const patch = {
      name: form.name.trim(),
      serialNumber: form.serialNumber.trim(),
      purchaseDate: new Date(form.purchaseDate).toISOString(),
      warrantyMonths: form.warrantyMonths,
      warrantyEndDate: form.overrideWarrantyEndDate ? new Date(form.warrantyEndDate).toISOString() : undefined,
      branchId: form.branchId,
      responsibleUser: { id: responsible.id, name: responsible.name },
      status: form.status,
    };

    if (editingId) {
      updateAsset(editingId, patch);
      setDialogOpen(false);
      return;
    }

    const res = createAsset({
      ...patch,
      responsibleUser: patch.responsibleUser,
      status: patch.status,
    } as any);

    if (!res.ok && res.reason === "LIMIT") {
      alert("Asset limit reached for this plan.");
      return;
    }

    setDialogOpen(false);
  };

  return (
    <MobileLayout>
      <div className="min-h-screen pb-24">
        <div className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur-md">
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" data-testid="text-tenant-label" dir="auto">
                  Asset Registry / سجل الأصول
                </p>
                <h1 className="text-2xl font-display font-bold" data-testid="text-assets-title" dir="auto">
                  Asset Registry
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <Select value={state.activeCompanyId} onValueChange={(v) => setActiveCompanyId(v)}>
                  <SelectTrigger className="h-9 w-[180px]" data-testid="select-company">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.companies.map((c) => (
                      <SelectItem key={c.id} value={c.id} data-testid={`option-company-${c.id}`}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Dialog open={dialogOpen} onOpenChange={(o) => setDialogOpen(o)}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="h-9"
                      onClick={(e) => {
                        e.preventDefault();
                        openCreate();
                      }}
                      disabled={!canEditAssets}
                      data-testid="button-create-asset"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md" data-testid="dialog-asset">
                    <DialogHeader>
                      <DialogTitle data-testid="text-dialog-title">{editingId ? "Edit asset" : "New asset"}</DialogTitle>
                    </DialogHeader>

                    {!canEditAssets && (
                      <Card className="border-amber-200 bg-amber-50/60 p-3" data-testid="status-assets-readonly" dir="auto">
                        <div className="flex items-start gap-2">
                          <TriangleAlert className="mt-0.5 h-4 w-4 text-amber-700" />
                          <div className="text-sm text-amber-900">
                            Your role (<span className="font-mono">{user.role}</span>) can view assets but cannot create or edit.
                          </div>
                        </div>
                      </Card>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1">
                        <Label htmlFor="name">Asset name</Label>
                        <Input
                          id="name"
                          value={form.name}
                          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                          placeholder="e.g., Dell Latitude 7440"
                          data-testid="input-asset-name"
                          dir="auto"
                          disabled={!canEditAssets}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="serialNumber">Serial number</Label>
                        <Input
                          id="serialNumber"
                          value={form.serialNumber}
                          onChange={(e) => setForm((p) => ({ ...p, serialNumber: e.target.value }))}
                          placeholder="e.g., SN-1234"
                          data-testid="input-serial-number"
                          dir="auto"
                          disabled={!canEditAssets}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label>Asset status</Label>
                        <Select
                          value={form.status}
                          onValueChange={(v) => setForm((p) => ({ ...p, status: v as AssetStatus }))}
                          disabled={!canEditAssets}
                        >
                          <SelectTrigger className="h-10" data-testid="select-asset-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE" data-testid="option-assetstatus-active">
                              ACTIVE
                            </SelectItem>
                            <SelectItem value="MAINTENANCE" data-testid="option-assetstatus-maintenance">
                              MAINTENANCE
                            </SelectItem>
                            <SelectItem value="RETIRED" data-testid="option-assetstatus-retired">
                              RETIRED
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="purchaseDate">Purchase date</Label>
                        <Input
                          id="purchaseDate"
                          type="date"
                          value={form.purchaseDate}
                          onChange={(e) => setForm((p) => ({ ...p, purchaseDate: e.target.value }))}
                          data-testid="input-purchase-date"
                          disabled={!canEditAssets}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="warrantyMonths">Warranty (months)</Label>
                        <Input
                          id="warrantyMonths"
                          type="number"
                          min={0}
                          max={120}
                          value={form.warrantyMonths}
                          onChange={(e) => setForm((p) => ({ ...p, warrantyMonths: Number(e.target.value) }))}
                          data-testid="input-warranty-months"
                          disabled={!canEditAssets}
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
                        <div className="space-y-0.5" dir="auto">
                          <div className="text-sm font-medium">Manual warranty end date override</div>
                          <div className="text-xs text-muted-foreground">If enabled, warranty end date will not be computed from purchase date + months.</div>
                        </div>
                        <button
                          className={cn(
                            "h-6 w-10 rounded-full border transition-colors",
                            form.overrideWarrantyEndDate ? "bg-primary border-primary" : "bg-white"
                          )}
                          onClick={() => canEditAssets && setForm((p) => ({ ...p, overrideWarrantyEndDate: !p.overrideWarrantyEndDate }))}
                          data-testid="toggle-warranty-override"
                          disabled={!canEditAssets}
                        >
                          <span
                            className={cn(
                              "block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform",
                              form.overrideWarrantyEndDate && "translate-x-4"
                            )}
                          />
                        </button>
                      </div>

                      <div className="col-span-2 space-y-1">
                        <Label htmlFor="warrantyEnd">Warranty end date</Label>
                        <Input
                          id="warrantyEnd"
                          type="date"
                          value={form.warrantyEndDate}
                          onChange={(e) => setForm((p) => ({ ...p, warrantyEndDate: e.target.value }))}
                          data-testid="input-warranty-end"
                          disabled={!canEditAssets || !form.overrideWarrantyEndDate}
                        />
                      </div>

                      <div className="col-span-2 space-y-1">
                        <Label>Branch</Label>
                        <Select value={form.branchId} onValueChange={(v) => setForm((p) => ({ ...p, branchId: v }))} disabled={!canEditAssets}>
                          <SelectTrigger className="h-10" data-testid="select-branch">
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map((b) => (
                              <SelectItem key={b.id} value={b.id} data-testid={`option-branch-${b.id}`}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2 space-y-1">
                        <Label>Responsible</Label>
                        <Select
                          value={form.responsibleUserId}
                          onValueChange={(v) => setForm((p) => ({ ...p, responsibleUserId: v }))}
                          disabled={!canEditAssets}
                        >
                          <SelectTrigger className="h-10" data-testid="select-responsible">
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id} data-testid={`option-user-${u.id}`}>
                                {u.name} — {u.role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2 space-y-1">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={form.notes}
                          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                          placeholder="Optional"
                          data-testid="textarea-notes"
                          disabled={!canEditAssets}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2">
                      {editingId ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="border-rose-200 text-rose-700 hover:bg-rose-50"
                              disabled={!canEditAssets}
                              data-testid="button-delete-asset"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent data-testid="dialog-delete-asset">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete asset?</AlertDialogTitle>
                              <AlertDialogDescription dir="auto">This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-rose-600 hover:bg-rose-700"
                                onClick={() => {
                                  if (editingId) deleteAsset(editingId);
                                  setDialogOpen(false);
                                }}
                                data-testid="button-confirm-delete"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <div />
                      )}

                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-asset">
                          Cancel
                        </Button>
                        <Button onClick={() => submit()} disabled={!canEditAssets || !validate()} data-testid="button-save-asset">
                          {editingId ? "Save changes" : "Create asset"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1" data-testid="badge-assets-company" dir="auto">
                <Building2 className="h-3.5 w-3.5" />
                {company.name}
              </Badge>
              <Badge variant="secondary" className="gap-1" data-testid="badge-assets-active">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active: {headerStats.active}
              </Badge>
              <Badge variant="secondary" className="gap-1" data-testid="badge-assets-maintenance">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Maintenance: {headerStats.maint}
              </Badge>
              <Badge variant="secondary" className="gap-1" data-testid="badge-assets-retired">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Retired: {headerStats.retired}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by asset #, name, serial…"
                  className="pl-9"
                  data-testid="input-search-assets"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Filter className="h-4 w-4" /> Filters
                </div>

                <Select value={branchFilter} onValueChange={(v) => setBranchFilter(v)}>
                  <SelectTrigger className="h-9 w-[170px]" data-testid="select-filter-branch">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-filter-branch-all">All branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id} data-testid={`option-filter-branch-${b.id}`}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AssetStatus | "all")}> 
                  <SelectTrigger className="h-9 w-[200px]" data-testid="select-filter-status">
                    <SelectValue placeholder="Asset status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-filter-status-all">All statuses</SelectItem>
                    <SelectItem value="ACTIVE" data-testid="option-filter-status-active">ACTIVE</SelectItem>
                    <SelectItem value="MAINTENANCE" data-testid="option-filter-status-maintenance">MAINTENANCE</SelectItem>
                    <SelectItem value="RETIRED" data-testid="option-filter-status-retired">RETIRED</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={warrantyFilter} onValueChange={(v) => setWarrantyFilter(v as WarrantyStatus | "all")}> 
                  <SelectTrigger className="h-9 w-[200px]" data-testid="select-filter-warranty">
                    <SelectValue placeholder="Warranty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-filter-warranty-all">All warranties</SelectItem>
                    <SelectItem value="ACTIVE" data-testid="option-filter-warranty-active">ACTIVE</SelectItem>
                    <SelectItem value="EXPIRING_SOON" data-testid="option-filter-warranty-expiring">EXPIRING_SOON</SelectItem>
                    <SelectItem value="EXPIRED" data-testid="option-filter-warranty-expired">EXPIRED</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    setSearch("");
                    setBranchFilter("all");
                    setStatusFilter("all");
                    setWarrantyFilter("all");
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear
                </Button>

                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    }}
                    data-testid="button-sort-dir"
                  >
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    {sortDir.toUpperCase()}
                  </Button>

                  <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                    <SelectTrigger className="h-9 w-[170px]" data-testid="select-sort">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warrantyEnd" data-testid="option-sort-warranty">Warranty end</SelectItem>
                      <SelectItem value="purchase" data-testid="option-sort-purchase">Purchase date</SelectItem>
                      <SelectItem value="name" data-testid="option-sort-name">Name</SelectItem>
                      <SelectItem value="assetNumber" data-testid="option-sort-assetnumber">Asset #</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <Card className="overflow-hidden border-border/60" data-testid="card-assets-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[104px]">Asset #</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead className="w-[140px]">Branch</TableHead>
                  <TableHead className="w-[160px]">Responsible</TableHead>
                  <TableHead className="w-[200px]">Warranty</TableHead>
                  <TableHead className="w-[150px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enriched.map(({ asset, endDateISO, warrantyStatus, daysRemaining }) => {
                  const branch = branches.find((b) => b.id === asset.branchId);
                  const pill = statusPill(warrantyStatus);
                  const Icon = pill.icon;

                  return (
                    <TableRow
                      key={asset.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => openEdit(asset.id)}
                      data-testid={`row-asset-${asset.id}`}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">{asset.internalAssetNumber}</TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="truncate font-medium" data-testid={`text-assetname-${asset.id}`} dir="auto">
                            {asset.name}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono" data-testid={`text-serial-${asset.id}`}>{asset.serialNumber}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-branch-${asset.id}`} dir="auto">
                        {branch?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                            <User2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium" data-testid={`text-owner-${asset.id}`} dir="auto">
                              {asset.responsibleUser?.name ?? "—"}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">{asset.responsibleUser?.id ?? ""}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium", pill.className)}
                              data-testid={`badge-warranty-${asset.id}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {pill.label}
                            </span>
                            <span className="text-xs text-muted-foreground" data-testid={`text-warrantydate-${asset.id}`}>
                              {format(new Date(endDateISO), "MMM d, yyyy")}
                            </span>
                          </div>
                          <div className={cn("text-[11px] font-mono text-muted-foreground", daysRemaining <= 30 && daysRemaining >= 0 && "text-amber-700", daysRemaining < 0 && "text-rose-700")}>
                            {daysRemaining} days remaining
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "border",
                            asset.status === "ACTIVE" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                            asset.status === "MAINTENANCE" && "border-amber-200 bg-amber-50 text-amber-700",
                            asset.status === "RETIRED" && "border-slate-200 bg-slate-50 text-slate-700"
                          )}
                          data-testid={`badge-assetstatus-${asset.id}`}
                        >
                          {asset.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {enriched.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-slate-100 p-3 text-slate-600">
                          <Search className="h-5 w-5" />
                        </div>
                        <div className="mt-3 text-sm font-medium" data-testid="text-empty-title" dir="auto">
                          No assets match your filters
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground" data-testid="text-empty-subtitle" dir="auto">
                          Try adjusting branch/status/warranty filters or search by serial number.
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          <div className="mt-3 text-xs text-muted-foreground" data-testid="text-multitenant-note" dir="auto">
            Tenant isolation (mock): switching the company selector filters everything by <span className="font-mono">companyId</span>.
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
