import { MobileLayout } from "@/components/layout/MobileLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { downloadCsv } from "@/lib/csv";
import { useB2BStore, useActiveCompany, useActiveUser, roleAllows } from "@/lib/b2bStore";
import { enrichAssetWarranty } from "@/lib/warranty";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { BarChart3, Download, Filter, PieChart as PieIcon, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

const WARRANTY_COLORS: Record<string, string> = {
  ACTIVE: "hsl(var(--primary))",
  EXPIRING_SOON: "#f59e0b",
  EXPIRED: "#f43f5e",
};

function WarrantyBadge({ status }: { status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" }) {
  const map = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    EXPIRING_SOON: "bg-amber-50 text-amber-700 border-amber-200",
    EXPIRED: "bg-rose-50 text-rose-700 border-rose-200",
  } as const;
  const label = status === "ACTIVE" ? "Active / نشط" : status === "EXPIRING_SOON" ? "Expiring / قريب" : "Expired / منتهي";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium", map[status])} data-testid={`badge-warranty-${status}`}>
      {label}
    </span>
  );
}

export default function Dashboard() {
  const { state, setActiveCompanyId } = useB2BStore();
  const company = useActiveCompany();
  const user = useActiveUser();

  const branches = useMemo(() => state.branches.filter((b) => b.companyId === state.activeCompanyId), [state.branches, state.activeCompanyId]);
  const users = useMemo(() => state.users.filter((u) => u.companyId === state.activeCompanyId), [state.users, state.activeCompanyId]);
  const assets = useMemo(() => state.assets.filter((a) => a.companyId === state.activeCompanyId), [state.assets, state.activeCompanyId]);

  const enriched = useMemo(() => {
    return assets
      .map((a) => {
        const w = enrichAssetWarranty(a);
        return { asset: a, ...w };
      })
      .sort((x, y) => x.daysRemaining - y.daysRemaining);
  }, [assets]);

  const totals = useMemo(() => {
    const total = assets.length;
    const expSoon = enriched.filter((e) => e.warrantyStatus === "EXPIRING_SOON").length;
    const expired = enriched.filter((e) => e.warrantyStatus === "EXPIRED").length;
    const maintenance = assets.filter((a) => a.status === "MAINTENANCE").length;
    return { total, expSoon, expired, maintenance };
  }, [assets, enriched]);

  const [kpiFilter, setKpiFilter] = useState<"ALL" | "EXPIRING" | "EXPIRED" | "MAINTENANCE">("ALL");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [warrantyFilter, setWarrantyFilter] = useState<"all" | "ACTIVE" | "EXPIRING_SOON" | "EXPIRED">("all");

  const tableRows = useMemo(() => {
    return enriched
      .filter((e) => (branchFilter === "all" ? true : e.asset.branchId === branchFilter))
      .filter((e) => (warrantyFilter === "all" ? true : e.warrantyStatus === warrantyFilter))
      .filter((e) => {
        if (kpiFilter === "ALL") return true;
        if (kpiFilter === "EXPIRING") return e.warrantyStatus === "EXPIRING_SOON";
        if (kpiFilter === "EXPIRED") return e.warrantyStatus === "EXPIRED";
        if (kpiFilter === "MAINTENANCE") return e.asset.status === "MAINTENANCE";
        return true;
      });
  }, [enriched, branchFilter, warrantyFilter, kpiFilter]);

  const branchChart = useMemo(() => {
    const map = new Map<string, number>();
    branches.forEach((b) => map.set(b.id, 0));
    assets.forEach((a) => map.set(a.branchId, (map.get(a.branchId) ?? 0) + 1));
    return Array.from(map.entries()).map(([branchId, count]) => ({
      branch: branches.find((b) => b.id === branchId)?.name ?? "—",
      count,
    }));
  }, [branches, assets]);

  const warrantyPie = useMemo(() => {
    const counts = {
      ACTIVE: enriched.filter((e) => e.warrantyStatus === "ACTIVE").length,
      EXPIRING_SOON: enriched.filter((e) => e.warrantyStatus === "EXPIRING_SOON").length,
      EXPIRED: enriched.filter((e) => e.warrantyStatus === "EXPIRED").length,
    };
    return (Object.keys(counts) as Array<keyof typeof counts>).map((k) => ({ name: k, value: counts[k] }));
  }, [enriched]);

  const exportWarranty = () => {
    const rows = enriched.map((e) => {
      const b = branches.find((x) => x.id === e.asset.branchId);
      return {
        "Internal Asset #": e.asset.internalAssetNumber,
        Name: e.asset.name,
        Serial: e.asset.serialNumber,
        Branch: b?.name ?? "",
        "Purchase Date": format(new Date(e.asset.purchaseDate), "yyyy-MM-dd"),
        "Warranty Months": e.asset.warrantyMonths,
        "Warranty End Date": format(new Date(e.endDateISO), "yyyy-MM-dd"),
        "Warranty Status": e.warrantyStatus,
        Responsible: e.asset.responsibleUser?.name ?? "",
        "Asset Status": e.asset.status,
      };
    });
    downloadCsv(`warranty_report_${company.id}.csv`, rows);
  };

  return (
    <MobileLayout>
      <div className="min-h-screen pb-24">
        <div className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur-md">
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" data-testid="text-dashboard-tenant">
                  {"Dashboard / لوحة الضمانات"}
                </p>
                <h1 className="text-2xl font-display font-bold" data-testid="text-dashboard-title">
                  Warranty Tracking
                </h1>
                <p className="mt-1 text-sm text-muted-foreground" dir="auto" data-testid="text-dashboard-subtitle">
                  {company.name} • {user.name}
                </p>
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

                <Button
                  size="sm"
                  className="h-9"
                  onClick={() => exportWarranty()}
                  disabled={!roleAllows(user.role, "REPORTS_EXPORT") && user.role !== "ADMIN"}
                  data-testid="button-export-warranty"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Card
                className={cn("p-4 cursor-pointer hover:shadow-sm transition-shadow", kpiFilter === "ALL" && "ring-1 ring-primary/30")}
                onClick={() => setKpiFilter("ALL")}
                data-testid="kpi-total-assets"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Total Assets</div>
                  <Badge variant="secondary">All</Badge>
                </div>
                <div className="mt-2 text-2xl font-display font-bold tabular-nums">{totals.total}</div>
              </Card>

              <Card
                className={cn("p-4 cursor-pointer hover:shadow-sm transition-shadow", kpiFilter === "EXPIRING" && "ring-1 ring-amber-400/40")}
                onClick={() => setKpiFilter("EXPIRING")}
                data-testid="kpi-expiring-soon"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Expiring ≤ 30d</div>
                  <Badge className="bg-amber-50 text-amber-700 border border-amber-200">Alert</Badge>
                </div>
                <div className="mt-2 text-2xl font-display font-bold tabular-nums">{totals.expSoon}</div>
              </Card>

              <Card
                className={cn("p-4 cursor-pointer hover:shadow-sm transition-shadow", kpiFilter === "EXPIRED" && "ring-1 ring-rose-500/30")}
                onClick={() => setKpiFilter("EXPIRED")}
                data-testid="kpi-expired"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Expired</div>
                  <Badge className="bg-rose-50 text-rose-700 border border-rose-200">Risk</Badge>
                </div>
                <div className="mt-2 text-2xl font-display font-bold tabular-nums">{totals.expired}</div>
              </Card>

              <Card
                className={cn("p-4 cursor-pointer hover:shadow-sm transition-shadow", kpiFilter === "MAINTENANCE" && "ring-1 ring-slate-400/40")}
                onClick={() => setKpiFilter("MAINTENANCE")}
                data-testid="kpi-maintenance"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Under Maintenance</div>
                  <Badge variant="secondary">Ops</Badge>
                </div>
                <div className="mt-2 text-2xl font-display font-bold tabular-nums">{totals.maintenance}</div>
              </Card>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Filter className="h-4 w-4" /> Filters
              </div>

              <Select value={branchFilter} onValueChange={(v) => setBranchFilter(v)}>
                <SelectTrigger className="h-9 w-[180px]" data-testid="select-filter-branch">
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

              <Select value={warrantyFilter} onValueChange={(v) => setWarrantyFilter(v as any)}>
                <SelectTrigger className="h-9 w-[200px]" data-testid="select-filter-warranty">
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
                  setBranchFilter("all");
                  setWarrantyFilter("all");
                  setKpiFilter("ALL");
                }}
                data-testid="button-clear-filters"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="p-4" data-testid="card-chart-branch">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-semibold">Assets per Branch</div>
              </div>
            </div>
            <div className="mt-3">
              <ChartContainer
                className="h-[220px]"
                config={{ count: { label: "Assets", color: "hsl(var(--primary))" } }}
              >
                <BarChart data={branchChart} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                  <XAxis dataKey="branch" tickLine={false} axisLine={false} />
                  <YAxis width={30} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="var(--color-count)" />
                </BarChart>
              </ChartContainer>
            </div>
          </Card>

          <Card className="p-4" data-testid="card-chart-warranty">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-semibold">Warranty Distribution</div>
              </div>
            </div>
            <div className="mt-3">
              <ChartContainer
                className="h-[220px]"
                config={{
                  ACTIVE: { label: "Active", color: WARRANTY_COLORS.ACTIVE },
                  EXPIRING_SOON: { label: "Expiring", color: WARRANTY_COLORS.EXPIRING_SOON },
                  EXPIRED: { label: "Expired", color: WARRANTY_COLORS.EXPIRED },
                }}
              >
                <ResponsiveContainer>
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie data={warrantyPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80}>
                      {warrantyPie.map((entry) => (
                        <Cell key={entry.name} fill={WARRANTY_COLORS[entry.name] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <ChartLegend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </Card>
        </div>

        <div className="p-4">
          <Card className="overflow-hidden border-border/60" data-testid="card-dashboard-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[104px]">Asset #</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead className="w-[140px]">Branch</TableHead>
                  <TableHead className="w-[160px]">Responsible</TableHead>
                  <TableHead className="w-[150px]">Warranty End</TableHead>
                  <TableHead className="w-[120px]">Days</TableHead>
                  <TableHead className="w-[160px]">Warranty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.map(({ asset, endDateISO, daysRemaining, warrantyStatus }) => {
                  const branch = branches.find((b) => b.id === asset.branchId);
                  return (
                    <TableRow key={asset.id} data-testid={`row-dashboard-${asset.id}`}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{asset.internalAssetNumber}</TableCell>
                      <TableCell>
                        <div className="font-medium" dir="auto">{asset.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{asset.serialNumber}</div>
                      </TableCell>
                      <TableCell className="text-sm">{branch?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm" dir="auto">{asset.responsibleUser?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{format(new Date(endDateISO), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <div className={cn("inline-flex items-center gap-2 font-mono text-xs", daysRemaining <= 30 && daysRemaining >= 0 && "text-amber-700", daysRemaining < 0 && "text-rose-700")} data-testid={`text-days-${asset.id}`}>
                          {daysRemaining}
                          {daysRemaining <= 30 && daysRemaining >= 0 && <TriangleAlert className="h-3.5 w-3.5" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <WarrantyBadge status={warrantyStatus} />
                      </TableCell>
                    </TableRow>
                  );
                })}

                {tableRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-amber-50 p-3 text-amber-700">
                          <TriangleAlert className="h-5 w-5" />
                        </div>
                        <div className="mt-3 text-sm font-medium" data-testid="text-empty-title">No rows for these filters</div>
                        <div className="mt-1 text-xs text-muted-foreground" data-testid="text-empty-subtitle">Try clearing the warranty/branch filters.</div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          <div className="mt-3 text-xs text-muted-foreground" data-testid="text-rbac-note" dir="auto">
            RBAC (UI-ready): current role is <span className="font-mono">{user.role}</span>. Export is enabled for Admin/Finance.
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
