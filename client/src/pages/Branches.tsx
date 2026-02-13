import { MobileLayout } from "@/components/layout/MobileLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { cn } from "@/lib/utils";
import { Building2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export default function Branches() {
  const { state, setActiveCompanyId, createBranch, updateBranch, deleteBranch } = useB2BStore();
  const company = useActiveCompany();
  const user = useActiveUser();

  const branches = useMemo(() => state.branches.filter((b) => b.companyId === state.activeCompanyId), [state.branches, state.activeCompanyId]);
  const assets = useMemo(() => state.assets.filter((a) => a.companyId === state.activeCompanyId), [state.assets, state.activeCompanyId]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", location: "", code: "" });

  const canEdit = roleAllows(user.role, "BRANCHES_EDIT");

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", location: "", code: "" });
    setDialogOpen(true);
  };

  const openEdit = (id: string) => {
    const b = branches.find((x) => x.id === id);
    if (!b) return;
    setEditingId(id);
    setForm({ name: b.name ?? "", location: b.location ?? "", code: b.code ?? "" });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      updateBranch(editingId, { name: form.name.trim(), location: form.location.trim(), code: form.code.trim() });
      setDialogOpen(false);
      return;
    }
    createBranch({ name: form.name.trim(), location: form.location.trim(), code: form.code.trim() });
    setDialogOpen(false);
  };

  const assetCount = (branchId: string) => assets.filter((a) => a.branchId === branchId).length;

  return (
    <MobileLayout>
      <div className="min-h-screen pb-24">
        <div className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur-md">
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" data-testid="text-branches-tenant">
                  Branches / الفروع
                </p>
                <h1 className="text-2xl font-display font-bold" data-testid="text-branches-title">
                  Branch Management
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <Dialog open={dialogOpen} onOpenChange={(o) => setDialogOpen(o)}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="h-9"
                      onClick={(e) => {
                        e.preventDefault();
                        openCreate();
                      }}
                      disabled={!canEdit}
                      data-testid="button-create-branch"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md" data-testid="dialog-branch">
                    <DialogHeader>
                      <DialogTitle data-testid="text-branch-dialog-title">{editingId ? "Edit branch" : "New branch"}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1">
                        <Label htmlFor="branchName">Branch name</Label>
                        <Input
                          id="branchName"
                          value={form.name}
                          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                          placeholder="e.g., Warehouse / المستودع"
                          data-testid="input-branch-name"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="branchLocation">Location</Label>
                        <Input
                          id="branchLocation"
                          value={form.location}
                          onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                          placeholder="e.g., Riyadh"
                          data-testid="input-branch-location"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="branchCode">Code (optional)</Label>
                        <Input
                          id="branchCode"
                          value={form.code}
                          onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                          placeholder="e.g., HQ"
                          data-testid="input-branch-code"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-branch">
                        Cancel
                      </Button>
                      <Button onClick={() => submit()} disabled={!canEdit} data-testid="button-save-branch">
                        {editingId ? "Save changes" : "Create branch"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1" data-testid="badge-branches-company">
                <Building2 className="h-3.5 w-3.5" />
                {company.name}
              </Badge>
              <Badge variant="secondary" className="gap-1" data-testid="badge-branches-count">
                Total: {branches.length}
              </Badge>
              <Badge variant="secondary" className="gap-1" data-testid="badge-branches-role" dir="auto">
                Role: <span className="font-mono">{user.role}</span>
              </Badge>
            </div>
          </div>
        </div>

        <div className="p-4">
          <Card className="overflow-hidden border-border/60" data-testid="card-branches-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead className="w-[160px]">Location</TableHead>
                  <TableHead className="w-[110px]">Code</TableHead>
                  <TableHead className="w-[110px]">Assets</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((b) => (
                  <TableRow key={b.id} data-testid={`row-branch-${b.id}`}>
                    <TableCell>
                      <button
                        className={cn("text-left w-full", canEdit && "hover:underline")}
                        disabled={!canEdit}
                        onClick={() => canEdit && openEdit(b.id)}
                        data-testid={`button-edit-branch-${b.id}`}
                        dir="auto"
                      >
                        <div className="font-medium">{b.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{b.id}</div>
                      </button>
                    </TableCell>
                    <TableCell className="text-sm" dir="auto">{b.location || "—"}</TableCell>
                    <TableCell className="text-sm font-mono">{b.code || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" data-testid={`badge-branch-assets-${b.id}`}>
                        {assetCount(b.id)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9"
                            disabled={!canEdit}
                            data-testid={`button-delete-branch-${b.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent data-testid={`dialog-delete-branch-${b.id}`}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete branch?</AlertDialogTitle>
                            <AlertDialogDescription dir="auto">
                              This will remove the branch. If assets exist in this branch, deletion will be blocked.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`button-cancel-delete-branch-${b.id}`}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-rose-600 hover:bg-rose-700"
                              onClick={() => {
                                const res = deleteBranch(b.id);
                                if (!res.ok && res.reason === "HAS_ASSETS") {
                                  // no toast dependency; keep minimal
                                  alert("Cannot delete: branch has assets. Reassign assets first.");
                                }
                              }}
                              data-testid={`button-confirm-delete-branch-${b.id}`}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}

                {branches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10">
                      <div className="text-center text-sm text-muted-foreground" data-testid="text-branches-empty" dir="auto">
                        No branches yet. Create your first branch.
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </MobileLayout>
  );
}
