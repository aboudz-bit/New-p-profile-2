import { MobileLayout } from "@/components/layout/MobileLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadCsv } from "@/lib/csv";
import { useB2BStore, useActiveCompany, useActiveUser, roleAllows } from "@/lib/b2bStore";
import { enrichAssetWarranty } from "@/lib/warranty";
import { format } from "date-fns";
import { Download, FileSpreadsheet } from "lucide-react";
import { useMemo, useState } from "react";

export default function Reports() {
  const { state } = useB2BStore();
  const company = useActiveCompany();
  const user = useActiveUser();

  const branches = useMemo(() => state.branches.filter((b) => b.companyId === state.activeCompanyId), [state.branches, state.activeCompanyId]);
  const assets = useMemo(() => state.assets.filter((a) => a.companyId === state.activeCompanyId), [state.assets, state.activeCompanyId]);

  const [branchId, setBranchId] = useState<string>("all");
  const canExport = roleAllows(user.role, "REPORTS_EXPORT") || user.role === "ADMIN";

  const filtered = useMemo(() => (branchId === "all" ? assets : assets.filter((a) => a.branchId === branchId)), [assets, branchId]);

  const rowsAssets = () =>
    filtered.map((a) => {
      const b = branches.find((x) => x.id === a.branchId);
      const w = enrichAssetWarranty(a);
      return {
        "Internal Asset #": a.internalAssetNumber,
        Name: a.name,
        Serial: a.serialNumber,
        Branch: b?.name ?? "",
        "Purchase Date": format(new Date(a.purchaseDate), "yyyy-MM-dd"),
        "Warranty Months": a.warrantyMonths,
        "Warranty End Date": format(new Date(w.endDateISO), "yyyy-MM-dd"),
        "Warranty Status": w.warrantyStatus,
        Responsible: a.responsibleUser?.name ?? "",
        Status: a.status,
        "Updated At": format(new Date(a.updatedAt), "yyyy-MM-dd"),
      };
    });

  const exportAssets = () => downloadCsv(`assets_${company.id}.csv`, rowsAssets());

  const exportWarranty = () => {
    const rows = rowsAssets().map((r) => ({
      "Internal Asset #": r["Internal Asset #"],
      Name: r.Name,
      Serial: r.Serial,
      Branch: r.Branch,
      "Purchase Date": r["Purchase Date"],
      "Warranty Months": r["Warranty Months"],
      "Warranty End Date": r["Warranty End Date"],
      "Warranty Status": r["Warranty Status"],
      Responsible: r.Responsible,
      "Asset Status": r.Status,
    }));
    downloadCsv(`warranty_${company.id}.csv`, rows);
  };

  const exportMaintenance = () => {
    const rows = rowsAssets()
      .filter((r) => r.Status === "MAINTENANCE")
      .map((r) => ({
        "Internal Asset #": r["Internal Asset #"],
        Name: r.Name,
        Serial: r.Serial,
        Branch: r.Branch,
        "Updated At": r["Updated At"],
        Status: r.Status,
      }));
    downloadCsv(`maintenance_${company.id}.csv`, rows);
  };

  return (
    <MobileLayout>
      <div className="min-h-screen pb-24">
        <div className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur-md">
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" data-testid="text-reports-tenant">
                  Reports / التقارير
                </p>
                <h1 className="text-2xl font-display font-bold" data-testid="text-reports-title">
                  Exports
                </h1>
              </div>

              <Button
                size="sm"
                className="h-9"
                onClick={() => exportWarranty()}
                disabled={!canExport}
                data-testid="button-export-warranty-primary"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Warranty
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" data-testid="badge-reports-company" dir="auto">
                {company.name}
              </Badge>
              <Badge variant="secondary" data-testid="badge-reports-role" dir="auto">
                Role: <span className="font-mono">{user.role}</span>
              </Badge>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label>Branch</Label>
                <Select value={branchId} onValueChange={(v) => setBranchId(v)}>
                  <SelectTrigger className="h-9 w-[220px]" data-testid="select-report-branch">
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-report-branch-all">
                      All branches
                    </SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id} data-testid={`option-report-branch-${b.id}`}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!canExport && (
              <Card className="mt-4 border-amber-200 bg-amber-50/60 p-3" data-testid="status-reports-readonly" dir="auto">
                Exports are enabled for <span className="font-semibold">FINANCE</span> and <span className="font-semibold">ADMIN</span>.
              </Card>
            )}
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="p-4" data-testid="panel-assets-report">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-semibold">Assets Report</div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground" dir="auto">
              Full asset registry export (filtered by branch).
            </p>
            <Button className="mt-3 w-full" onClick={() => exportAssets()} disabled={!canExport} data-testid="button-export-assets">
              Export CSV
            </Button>
          </Card>

          <Card className="p-4" data-testid="panel-warranty-report">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-semibold">Warranty Report</div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground" dir="auto">
              Warranty end dates + computed warranty status.
            </p>
            <Button className="mt-3 w-full" onClick={() => exportWarranty()} disabled={!canExport} data-testid="button-export-warranty">
              Export CSV
            </Button>
          </Card>

          <Card className="p-4" data-testid="panel-maintenance-report">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-semibold">Maintenance / Failures</div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground" dir="auto">
              Current assets in MAINTENANCE (basic version).
            </p>
            <Button className="mt-3 w-full" onClick={() => exportMaintenance()} disabled={!canExport} data-testid="button-export-maintenance">
              Export CSV
            </Button>
          </Card>
        </div>
      </div>
    </MobileLayout>
  );
}
