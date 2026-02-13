import { MobileLayout } from "@/components/layout/MobileLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { Building2, Filter, Plus, Search, ShieldCheck, ShieldX, TriangleAlert, User2 } from "lucide-react";
import { useMemo, useState } from "react";

type WarrantyStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";
type AssetStatus = "ACTIVE" | "UNDER_MAINTENANCE" | "RETIRED";

type Company = {
  id: string;
  name: string;
  plan: "BASIC" | "PRO" | "ENTERPRISE";
  assetLimit: number | null;
};

type Branch = {
  id: string;
  companyId: string;
  name: string;
  location: string;
};

type Employee = {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: "ADMIN" | "FINANCE" | "IT" | "MAINTENANCE";
  branchId?: string;
};

type Asset = {
  id: string;
  companyId: string;
  branchId: string;
  internalAssetNumber: string;
  productName: string;
  serialNumber: string;
  invoiceNumber: string;
  purchaseDate: string;
  warrantyExpiryDate: string;
  warrantyStatus: WarrantyStatus;
  assetStatus: AssetStatus;
  responsibleUserId?: string;
  issueNotes?: string;
  createdAt: string;
  updatedAt: string;
};

function computeWarrantyStatus(expiryISO: string) {
  const days = differenceInCalendarDays(new Date(expiryISO), new Date());
  if (days < 0) return "EXPIRED" as const;
  if (days <= 30) return "EXPIRING_SOON" as const;
  return "ACTIVE" as const;
}

function nextAssetNumber(existing: Asset[]) {
  const max = existing.reduce((acc, a) => {
    const m = a.internalAssetNumber.match(/^AST-(\d{4})$/);
    const n = m ? Number(m[1]) : 0;
    return Math.max(acc, n);
  }, 0);
  return `AST-${String(max + 1).padStart(4, "0")}`;
}

function statusPill(warrantyStatus: WarrantyStatus) {
  if (warrantyStatus === "ACTIVE") {
    return {
      label: "Active",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: ShieldCheck,
    };
  }
  if (warrantyStatus === "EXPIRING_SOON") {
    return {
      label: "Expiring soon",
      className: "bg-amber-50 text-amber-700 border-amber-200",
      icon: TriangleAlert,
    };
  }
  return {
    label: "Expired",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    icon: ShieldX,
  };
}

const MOCK_COMPANIES: Company[] = [
  { id: "co_acme", name: "Acme Holdings", plan: "PRO", assetLimit: 500 },
  { id: "co_northwind", name: "Northwind Retail", plan: "BASIC", assetLimit: 100 },
];

const MOCK_BRANCHES: Branch[] = [
  { id: "br_01", companyId: "co_acme", name: "Warehouse", location: "Riyadh" },
  { id: "br_02", companyId: "co_acme", name: "Head Office", location: "Riyadh" },
  { id: "br_03", companyId: "co_acme", name: "Store \u2014 Olaya", location: "Riyadh" },
  { id: "br_11", companyId: "co_northwind", name: "Main Branch", location: "Jeddah" },
];

const MOCK_EMPLOYEES: Employee[] = [
  { id: "u_01", companyId: "co_acme", name: "Sara Al-Harbi", email: "sara@acme.com", role: "ADMIN" },
  { id: "u_02", companyId: "co_acme", name: "Faisal Khan", email: "faisal@acme.com", role: "IT", branchId: "br_02" },
  { id: "u_03", companyId: "co_acme", name: "Noor Ibrahim", email: "noor@acme.com", role: "MAINTENANCE", branchId: "br_01" },
  { id: "u_11", companyId: "co_northwind", name: "Maya Chen", email: "maya@northwind.com", role: "ADMIN", branchId: "br_11" },
];

const seedAssets = (() => {
  const today = new Date();
  const mk = (companyId: string, branchId: string, n: number, overrides?: Partial<Asset>) => {
    const expiry = addDays(today, n);
    const warrantyExpiryDate = expiry.toISOString();
    const purchaseDate = addDays(today, -180).toISOString();
    const createdAt = addDays(today, -40).toISOString();
    const updatedAt = addDays(today, -2).toISOString();
    const base: Asset = {
      id: `as_${Math.random().toString(16).slice(2)}`,
      companyId,
      branchId,
      internalAssetNumber: `AST-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      productName: "Dell Latitude 7440",
      serialNumber: "SN-8X2K-19QA",
      invoiceNumber: "INV-2025-0192",
      purchaseDate,
      warrantyExpiryDate,
      warrantyStatus: computeWarrantyStatus(warrantyExpiryDate),
      assetStatus: "ACTIVE",
      responsibleUserId: undefined,
      issueNotes: "",
      createdAt,
      updatedAt,
    };
    return { ...base, ...overrides, warrantyStatus: computeWarrantyStatus(overrides?.warrantyExpiryDate ?? base.warrantyExpiryDate) };
  };

  return [
    mk("co_acme", "br_02", 220, { internalAssetNumber: "AST-0003", productName: "MacBook Pro 14\" (M3 Pro)", serialNumber: "C02X8291M", invoiceNumber: "ACME-INV-4451", responsibleUserId: "u_02" }),
    mk("co_acme", "br_01", 18, { internalAssetNumber: "AST-0004", productName: "Zebra ZT411 Label Printer", serialNumber: "ZT411-90A1", invoiceNumber: "ACME-INV-4522", responsibleUserId: "u_03" }),
    mk("co_acme", "br_03", -12, { internalAssetNumber: "AST-0005", productName: "Cisco Meraki MR46", serialNumber: "Q2MN-4R46-7D", invoiceNumber: "ACME-INV-4330", assetStatus: "UNDER_MAINTENANCE", issueNotes: "Intermittent connectivity\u2014ticket opened." }),
    mk("co_northwind", "br_11", 8, { internalAssetNumber: "AST-0001", productName: "HP LaserJet Pro", serialNumber: "HP-28A-991K", invoiceNumber: "NW-INV-1008", responsibleUserId: "u_11" }),
    mk("co_northwind", "br_11", 120, { internalAssetNumber: "AST-0002", productName: "iPad 10th Gen", serialNumber: "IPD-10-1A2B", invoiceNumber: "NW-INV-1012" }),
  ];
})();

const emptyForm = {
  productName: "",
  serialNumber: "",
  invoiceNumber: "",
  purchaseDate: format(new Date(), "yyyy-MM-dd"),
  warrantyExpiryDate: format(addDays(new Date(), 365), "yyyy-MM-dd"),
  branchId: "",
  responsibleUserId: "",
  assetStatus: "ACTIVE" as AssetStatus,
  issueNotes: "",
};

export default function Assets() {
  const [activeCompanyId, setActiveCompanyId] = useState<string>(MOCK_COMPANIES[0].id);
  const [assets, setAssets] = useState<Asset[]>(seedAssets);

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "all">("all");
  const [warrantyFilter, setWarrantyFilter] = useState<WarrantyStatus | "all">("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const activeCompany = useMemo(() => MOCK_COMPANIES.find((c) => c.id === activeCompanyId)!, [activeCompanyId]);
  const branches = useMemo(() => MOCK_BRANCHES.filter((b) => b.companyId === activeCompanyId), [activeCompanyId]);
  const employees = useMemo(() => MOCK_EMPLOYEES.filter((e) => e.companyId === activeCompanyId), [activeCompanyId]);

  const companyAssets = useMemo(() => assets.filter((a) => a.companyId === activeCompanyId), [assets, activeCompanyId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companyAssets
      .filter((a) => {
        if (!q) return true;
        return (
          a.internalAssetNumber.toLowerCase().includes(q) ||
          a.productName.toLowerCase().includes(q) ||
          a.serialNumber.toLowerCase().includes(q) ||
          a.invoiceNumber.toLowerCase().includes(q)
        );
      })
      .filter((a) => (branchFilter === "all" ? true : a.branchId === branchFilter))
      .filter((a) => (statusFilter === "all" ? true : a.assetStatus === statusFilter))
      .filter((a) => (warrantyFilter === "all" ? true : a.warrantyStatus === warrantyFilter));
  }, [companyAssets, search, branchFilter, statusFilter, warrantyFilter]);

  const canCreateMore = useMemo(() => {
    if (activeCompany.assetLimit == null) return true;
    return companyAssets.length < activeCompany.assetLimit;
  }, [activeCompany.assetLimit, companyAssets.length]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      branchId: branches[0]?.id ?? "",
      responsibleUserId: employees[0]?.id ?? "",
    });
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setEditingId(asset.id);
    setForm({
      productName: asset.productName,
      serialNumber: asset.serialNumber,
      invoiceNumber: asset.invoiceNumber,
      purchaseDate: format(new Date(asset.purchaseDate), "yyyy-MM-dd"),
      warrantyExpiryDate: format(new Date(asset.warrantyExpiryDate), "yyyy-MM-dd"),
      branchId: asset.branchId,
      responsibleUserId: asset.responsibleUserId ?? "",
      assetStatus: asset.assetStatus,
      issueNotes: asset.issueNotes ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = () => {
    const purchaseISO = new Date(form.purchaseDate).toISOString();
    const warrantyISO = new Date(form.warrantyExpiryDate).toISOString();

    if (!form.productName.trim()) return;
    if (!form.serialNumber.trim()) return;
    if (!form.invoiceNumber.trim()) return;
    if (!form.branchId) return;

    const now = new Date().toISOString();

    if (editingId) {
      setAssets((prev) =>
        prev.map((a) => {
          if (a.id !== editingId) return a;
          const next = {
            ...a,
            branchId: form.branchId,
            productName: form.productName.trim(),
            serialNumber: form.serialNumber.trim(),
            invoiceNumber: form.invoiceNumber.trim(),
            purchaseDate: purchaseISO,
            warrantyExpiryDate: warrantyISO,
            warrantyStatus: computeWarrantyStatus(warrantyISO),
            assetStatus: form.assetStatus,
            responsibleUserId: form.responsibleUserId || undefined,
            issueNotes: form.issueNotes,
            updatedAt: now,
          };
          return next;
        })
      );
      setDialogOpen(false);
      return;
    }

    if (!canCreateMore) return;

    const created: Asset = {
      id: `as_${crypto.randomUUID()}`,
      companyId: activeCompanyId,
      branchId: form.branchId,
      internalAssetNumber: nextAssetNumber(companyAssets),
      productName: form.productName.trim(),
      serialNumber: form.serialNumber.trim(),
      invoiceNumber: form.invoiceNumber.trim(),
      purchaseDate: purchaseISO,
      warrantyExpiryDate: warrantyISO,
      warrantyStatus: computeWarrantyStatus(warrantyISO),
      assetStatus: form.assetStatus,
      responsibleUserId: form.responsibleUserId || undefined,
      issueNotes: form.issueNotes,
      createdAt: now,
      updatedAt: now,
    };

    setAssets((prev) => [created, ...prev]);
    setDialogOpen(false);
  };

  const onDelete = (assetId: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
  };

  const headerStats = useMemo(() => {
    const active = companyAssets.filter((a) => a.assetStatus === "ACTIVE").length;
    const maint = companyAssets.filter((a) => a.assetStatus === "UNDER_MAINTENANCE").length;
    const retired = companyAssets.filter((a) => a.assetStatus === "RETIRED").length;
    return { active, maint, retired };
  }, [companyAssets]);

  return (
    <MobileLayout>
      <div className="min-h-screen pb-24">
        <div className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur-md">
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" data-testid="text-tenant-label">
                  Company
                </p>
                <h1 className="text-2xl font-display font-bold" data-testid="text-assets-title">
                  Asset Registry
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <Select value={activeCompanyId} onValueChange={(v) => setActiveCompanyId(v)}>
                  <SelectTrigger className="h-9 w-[180px]" data-testid="select-company">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_COMPANIES.map((c) => (
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
                      disabled={!canCreateMore}
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

                    {!canCreateMore && !editingId && (
                      <Card className="border-amber-200 bg-amber-50/60 p-3" data-testid="status-assetlimit">
                        <div className="flex items-start gap-2">
                          <TriangleAlert className="mt-0.5 h-4 w-4 text-amber-700" />
                          <div className="text-sm text-amber-900">
                            Asset limit reached for <span className="font-semibold">{activeCompany.plan}</span> ({activeCompany.assetLimit}).
                          </div>
                        </div>
                      </Card>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1">
                        <Label htmlFor="productName">Product name</Label>
                        <Input
                          id="productName"
                          value={form.productName}
                          onChange={(e) => setForm((p) => ({ ...p, productName: e.target.value }))}
                          placeholder="e.g., Dell Latitude 7440"
                          data-testid="input-product-name"
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
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="invoiceNumber">Invoice #</Label>
                        <Input
                          id="invoiceNumber"
                          value={form.invoiceNumber}
                          onChange={(e) => setForm((p) => ({ ...p, invoiceNumber: e.target.value }))}
                          placeholder="e.g., INV-2025-0192"
                          data-testid="input-invoice-number"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="purchaseDate">Purchase date</Label>
                        <Input
                          id="purchaseDate"
                          type="date"
                          value={form.purchaseDate}
                          onChange={(e) => setForm((p) => ({ ...p, purchaseDate: e.target.value }))}
                          data-testid="input-purchase-date"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="warrantyExpiry">Warranty expiry</Label>
                        <Input
                          id="warrantyExpiry"
                          type="date"
                          value={form.warrantyExpiryDate}
                          onChange={(e) => setForm((p) => ({ ...p, warrantyExpiryDate: e.target.value }))}
                          data-testid="input-warranty-expiry"
                        />
                      </div>

                      <div className="col-span-2 space-y-1">
                        <Label>Branch</Label>
                        <Select value={form.branchId} onValueChange={(v) => setForm((p) => ({ ...p, branchId: v }))}>
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
                        <Label>Responsible employee</Label>
                        <Select value={form.responsibleUserId} onValueChange={(v) => setForm((p) => ({ ...p, responsibleUserId: v }))}>
                          <SelectTrigger className="h-10" data-testid="select-responsible">
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((e) => (
                              <SelectItem key={e.id} value={e.id} data-testid={`option-employee-${e.id}`}>
                                {e.name} \u2014 {e.role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2 space-y-1">
                        <Label>Asset status</Label>
                        <Select value={form.assetStatus} onValueChange={(v) => setForm((p) => ({ ...p, assetStatus: v as AssetStatus }))}>
                          <SelectTrigger className="h-10" data-testid="select-asset-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE" data-testid="option-assetstatus-active">
                              ACTIVE
                            </SelectItem>
                            <SelectItem value="UNDER_MAINTENANCE" data-testid="option-assetstatus-maintenance">
                              UNDER_MAINTENANCE
                            </SelectItem>
                            <SelectItem value="RETIRED" data-testid="option-assetstatus-retired">
                              RETIRED
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2 space-y-1">
                        <Label htmlFor="issueNotes">Notes</Label>
                        <Textarea
                          id="issueNotes"
                          value={form.issueNotes}
                          onChange={(e) => setForm((p) => ({ ...p, issueNotes: e.target.value }))}
                          placeholder="Optional: incident details, maintenance notes, etc."
                          data-testid="textarea-notes"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDialogOpen(false);
                        }}
                        data-testid="button-cancel-asset"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => onSubmit()}
                        disabled={!editingId && !canCreateMore}
                        data-testid="button-save-asset"
                      >
                        {editingId ? "Save changes" : "Create asset"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1" data-testid="badge-assets-count">
                <Building2 className="h-3.5 w-3.5" />
                {activeCompany.name}
              </Badge>
              <Badge variant="secondary" className="gap-1" data-testid="badge-assets-active">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active: {headerStats.active}
              </Badge>
              <Badge variant="secondary" className="gap-1" data-testid="badge-assets-maintenance">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Maintenance: {headerStats.maint}
              </Badge>
              <Badge variant="secondary" className="gap-1" data-testid="badge-assets-retired">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                Retired: {headerStats.retired}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by asset #, product, serial, invoice\u2026"
                  className="pl-9"
                  data-testid="input-search-assets"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  Filters
                </div>

                <Select value={branchFilter} onValueChange={(v) => setBranchFilter(v)}>
                  <SelectTrigger className="h-9 w-[160px]" data-testid="select-filter-branch">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-filter-branch-all">
                      All branches
                    </SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id} data-testid={`option-filter-branch-${b.id}`}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AssetStatus | "all")}>
                  <SelectTrigger className="h-9 w-[190px]" data-testid="select-filter-status">
                    <SelectValue placeholder="Asset status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-filter-status-all">
                      All asset statuses
                    </SelectItem>
                    <SelectItem value="ACTIVE" data-testid="option-filter-status-active">
                      ACTIVE
                    </SelectItem>
                    <SelectItem value="UNDER_MAINTENANCE" data-testid="option-filter-status-maintenance">
                      UNDER_MAINTENANCE
                    </SelectItem>
                    <SelectItem value="RETIRED" data-testid="option-filter-status-retired">
                      RETIRED
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={warrantyFilter} onValueChange={(v) => setWarrantyFilter(v as WarrantyStatus | "all")}>
                  <SelectTrigger className="h-9 w-[170px]" data-testid="select-filter-warranty">
                    <SelectValue placeholder="Warranty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-filter-warranty-all">
                      All warranties
                    </SelectItem>
                    <SelectItem value="ACTIVE" data-testid="option-filter-warranty-active">
                      ACTIVE
                    </SelectItem>
                    <SelectItem value="EXPIRING_SOON" data-testid="option-filter-warranty-expiring">
                      EXPIRING_SOON
                    </SelectItem>
                    <SelectItem value="EXPIRED" data-testid="option-filter-warranty-expired">
                      EXPIRED
                    </SelectItem>
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
                  <TableHead className="w-[150px]">Owner</TableHead>
                  <TableHead className="w-[160px]">Warranty</TableHead>
                  <TableHead className="w-[150px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const branch = branches.find((b) => b.id === a.branchId);
                  const owner = employees.find((e) => e.id === a.responsibleUserId);
                  const pill = statusPill(a.warrantyStatus);
                  const Icon = pill.icon;

                  return (
                    <TableRow
                      key={a.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => openEdit(a)}
                      data-testid={`row-asset-${a.id}`}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground" data-testid={`text-assetnumber-${a.id}`}>
                        {a.internalAssetNumber}
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="truncate font-medium" data-testid={`text-productname-${a.id}`}>
                            {a.productName}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono" data-testid={`text-serial-${a.id}`}>
                              {a.serialNumber}
                            </span>
                            <span className="text-muted-foreground/60">\u2022</span>
                            <span className="font-mono" data-testid={`text-invoice-${a.id}`}>
                              {a.invoiceNumber}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-branch-${a.id}`}>
                        {branch?.name ?? "\u2014"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                            <User2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium" data-testid={`text-owner-${a.id}`}>
                              {owner?.name ?? "Unassigned"}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">{owner?.role ?? "\u2014"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium", pill.className)} data-testid={`badge-warranty-${a.id}`}>
                            <Icon className="h-3.5 w-3.5" />
                            {pill.label}
                          </span>
                          <span className="text-xs text-muted-foreground" data-testid={`text-warrantydate-${a.id}`}>
                            {format(new Date(a.warrantyExpiryDate), "MMM d, yyyy")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "border",
                            a.assetStatus === "ACTIVE" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                            a.assetStatus === "UNDER_MAINTENANCE" && "border-amber-200 bg-amber-50 text-amber-700",
                            a.assetStatus === "RETIRED" && "border-slate-200 bg-slate-50 text-slate-700"
                          )}
                          data-testid={`badge-assetstatus-${a.id}`}
                        >
                          {a.assetStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-slate-100 p-3 text-slate-600">
                          <Search className="h-5 w-5" />
                        </div>
                        <div className="mt-3 text-sm font-medium" data-testid="text-empty-title">
                          No assets match your filters
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground" data-testid="text-empty-subtitle">
                          Try adjusting branch/status filters or search by serial number.
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          <div className="mt-3 text-xs text-muted-foreground" data-testid="text-multitenant-note">
            Tenant isolation (UI mock): switching the company selector filters all rows by <span className="font-mono">companyId</span>.
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
