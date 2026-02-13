import { MobileLayout } from "@/components/layout/MobileLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useB2BStore, useActiveCompany, useActiveUser, roleAllows } from "@/lib/b2bStore";
import type { Role } from "@/lib/b2bTypes";
import { Shield, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";

export default function Users() {
  const { state, createUser, updateUser } = useB2BStore();
  const company = useActiveCompany();
  const activeUser = useActiveUser();

  const branches = useMemo(() => state.branches.filter((b) => b.companyId === state.activeCompanyId), [state.branches, state.activeCompanyId]);
  const users = useMemo(() => state.users.filter((u) => u.companyId === state.activeCompanyId), [state.users, state.activeCompanyId]);

  const canEdit = activeUser.role === "ADMIN";

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; role: Role; scope: "ALL" | string[] }>({ name: "", role: "FINANCE", scope: "ALL" });

  const submit = () => {
    if (!form.name.trim()) return;
    createUser({ name: form.name.trim(), role: form.role, branchScope: form.scope });
    setOpen(false);
    setForm({ name: "", role: "FINANCE", scope: "ALL" });
  };

  return (
    <MobileLayout>
      <div className="min-h-screen pb-24">
        <div className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur-md">
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" data-testid="text-users-tenant">
                  Users & Roles / المستخدمون والصلاحيات
                </p>
                <h1 className="text-2xl font-display font-bold" data-testid="text-users-title">
                  Users
                </h1>
                <p className="mt-1 text-sm text-muted-foreground" dir="auto" data-testid="text-users-subtitle">
                  {company.name} • Role: <span className="font-mono">{activeUser.role}</span>
                </p>
              </div>

              <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="h-9"
                    onClick={(e) => {
                      e.preventDefault();
                      setOpen(true);
                    }}
                    disabled={!canEdit}
                    data-testid="button-create-user"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md" data-testid="dialog-user">
                  <DialogHeader>
                    <DialogTitle data-testid="text-user-dialog-title">New user</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="userName">Name</Label>
                      <Input id="userName" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} data-testid="input-user-name" />
                    </div>

                    <div className="space-y-1">
                      <Label>Role</Label>
                      <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v as Role }))}>
                        <SelectTrigger className="h-10" data-testid="select-user-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN" data-testid="option-role-admin">ADMIN</SelectItem>
                          <SelectItem value="FINANCE" data-testid="option-role-finance">FINANCE</SelectItem>
                          <SelectItem value="IT" data-testid="option-role-it">IT</SelectItem>
                          <SelectItem value="MAINTENANCE" data-testid="option-role-maintenance">MAINTENANCE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>Branch scope</Label>
                      <Select
                        value={form.scope === "ALL" ? "ALL" : "CUSTOM"}
                        onValueChange={(v) => setForm((p) => ({ ...p, scope: v === "ALL" ? "ALL" : [] }))}
                      >
                        <SelectTrigger className="h-10" data-testid="select-user-scope">
                          <SelectValue placeholder="Select scope" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL" data-testid="option-scope-all">All branches</SelectItem>
                          <SelectItem value="CUSTOM" data-testid="option-scope-custom">Specific branches</SelectItem>
                        </SelectContent>
                      </Select>

                      {Array.isArray(form.scope) && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {branches.map((b) => {
                            const checked = form.scope.includes(b.id);
                            return (
                              <button
                                key={b.id}
                                className={
                                  "rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/40 " +
                                  (checked ? "border-primary/40 bg-primary/5" : "border-border")
                                }
                                onClick={() =>
                                  setForm((p) => ({
                                    ...p,
                                    scope: checked ? (p.scope as string[]).filter((x) => x !== b.id) : [...(p.scope as string[]), b.id],
                                  }))
                                }
                                data-testid={`toggle-scope-branch-${b.id}`}
                                dir="auto"
                              >
                                {b.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel-user">Cancel</Button>
                    <Button onClick={() => submit()} disabled={!canEdit} data-testid="button-save-user">Create</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {!canEdit && (
              <Card className="mt-4 border-amber-200 bg-amber-50/60 p-3" data-testid="status-users-readonly">
                <div className="flex items-start gap-2">
                  <Shield className="mt-0.5 h-4 w-4 text-amber-700" />
                  <div className="text-sm text-amber-900" dir="auto">
                    Only <span className="font-semibold">ADMIN</span> can manage users. This screen is read-only for your role.
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        <div className="p-4">
          <Card className="overflow-hidden border-border/60" data-testid="card-users-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="w-[160px]">Role</TableHead>
                  <TableHead className="w-[220px]">Branch scope</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                    <TableCell>
                      <div className="font-medium" dir="auto">{u.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{u.id}</div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(v) => updateUser(u.id, { role: v as Role })}
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="h-9" data-testid={`select-role-${u.id}`}>
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN" data-testid={`option-role-admin-${u.id}`}>ADMIN</SelectItem>
                          <SelectItem value="FINANCE" data-testid={`option-role-finance-${u.id}`}>FINANCE</SelectItem>
                          <SelectItem value="IT" data-testid={`option-role-it-${u.id}`}>IT</SelectItem>
                          <SelectItem value="MAINTENANCE" data-testid={`option-role-maintenance-${u.id}`}>MAINTENANCE</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell dir="auto">
                      {u.branchScope === "ALL" ? (
                        <Badge variant="secondary">ALL</Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.branchScope.map((id) => {
                            const b = branches.find((x) => x.id === id);
                            return (
                              <Badge key={id} variant="secondary" data-testid={`badge-scope-${u.id}-${id}`}>
                                {b?.name ?? id}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10">
                      <div className="text-center text-sm text-muted-foreground" data-testid="text-users-empty" dir="auto">
                        No users found.
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
