import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { addDays } from "date-fns";
import type { Asset, Branch, Company, Role, User } from "./b2bTypes";

type StoreState = {
  companies: Company[];
  activeCompanyId: string;
  branches: Branch[];
  users: User[];
  assets: Asset[];
  activeUserId: string;
};

type StoreApi = {
  state: StoreState;
  setActiveCompanyId: (id: string) => void;
  setActiveUserId: (id: string) => void;

  createBranch: (input: Pick<Branch, "name" | "location" | "code">) => void;
  updateBranch: (id: string, patch: Partial<Pick<Branch, "name" | "location" | "code">>) => void;
  deleteBranch: (id: string) => { ok: boolean; reason?: "HAS_ASSETS" };

  createUser: (input: Pick<User, "name" | "role" | "branchScope">) => void;
  updateUser: (id: string, patch: Partial<Pick<User, "name" | "role" | "branchScope">>) => void;

  createAsset: (input: Omit<Asset, "id" | "companyId" | "internalAssetNumber" | "createdAt" | "updatedAt">) => { ok: boolean; reason?: "LIMIT" };
  updateAsset: (id: string, patch: Partial<Omit<Asset, "id" | "companyId" | "internalAssetNumber" | "createdAt">>) => void;
  deleteAsset: (id: string) => void;
};

const STORAGE_KEY = "b2b_store_v1";

function nowIso() {
  return new Date().toISOString();
}

function nextAssetNumber(existing: Asset[]) {
  const max = existing.reduce((acc, a) => {
    const m = a.internalAssetNumber.match(/^AST-(\d{4})$/);
    const n = m ? Number(m[1]) : 0;
    return Math.max(acc, n);
  }, 0);
  return `AST-${String(max + 1).padStart(4, "0")}`;
}

function seed(): StoreState {
  const createdAt = addDays(new Date(), -40).toISOString();
  const updatedAt = addDays(new Date(), -2).toISOString();

  const companies: Company[] = [
    { id: "co_acme", name: "Acme Holdings", plan: "PRO", assetLimit: 500 },
    { id: "co_northwind", name: "Northwind Retail", plan: "BASIC", assetLimit: 100 },
  ];

  const branches: Branch[] = [
    { id: "br_01", companyId: "co_acme", name: "Warehouse", location: "Riyadh", code: "WH", createdAt, updatedAt },
    { id: "br_02", companyId: "co_acme", name: "Head Office", location: "Riyadh", code: "HQ", createdAt, updatedAt },
    { id: "br_03", companyId: "co_acme", name: "Branch A", location: "Riyadh", code: "A", createdAt, updatedAt },
    { id: "br_11", companyId: "co_northwind", name: "Main Branch", location: "Jeddah", code: "MAIN", createdAt, updatedAt },
  ];

  const users: User[] = [
    { id: "u_01", companyId: "co_acme", name: "Sara Al-Harbi", role: "ADMIN", branchScope: "ALL" },
    { id: "u_02", companyId: "co_acme", name: "Faisal Khan", role: "IT", branchScope: ["br_02"] },
    { id: "u_03", companyId: "co_acme", name: "Noor Ibrahim", role: "MAINTENANCE", branchScope: ["br_01"] },
    { id: "u_11", companyId: "co_northwind", name: "Maya Chen", role: "ADMIN", branchScope: "ALL" },
  ];

  const assets: Asset[] = [
    {
      id: "as_001",
      companyId: "co_acme",
      internalAssetNumber: "AST-0001",
      name: "MacBook Pro 14\" (M3 Pro)",
      serialNumber: "C02X8291M",
      purchaseDate: addDays(new Date(), -180).toISOString(),
      warrantyMonths: 12,
      branchId: "br_02",
      responsibleUser: { id: "u_02", name: "Faisal Khan" },
      status: "ACTIVE",
      createdAt,
      updatedAt,
    },
    {
      id: "as_002",
      companyId: "co_acme",
      internalAssetNumber: "AST-0002",
      name: "Zebra ZT411 Label Printer",
      serialNumber: "ZT411-90A1",
      purchaseDate: addDays(new Date(), -350).toISOString(),
      warrantyMonths: 24,
      branchId: "br_01",
      responsibleUser: { id: "u_03", name: "Noor Ibrahim" },
      status: "MAINTENANCE",
      createdAt,
      updatedAt,
    },
    {
      id: "as_003",
      companyId: "co_acme",
      internalAssetNumber: "AST-0003",
      name: "Cisco Meraki MR46",
      serialNumber: "Q2MN-4R46-7D",
      purchaseDate: addDays(new Date(), -600).toISOString(),
      warrantyMonths: 12,
      warrantyEndDate: addDays(new Date(), -12).toISOString(),
      branchId: "br_03",
      responsibleUser: { id: "u_01", name: "Sara Al-Harbi" },
      status: "ACTIVE",
      createdAt,
      updatedAt,
    },
    {
      id: "as_011",
      companyId: "co_northwind",
      internalAssetNumber: "AST-0001",
      name: "HP LaserJet Pro",
      serialNumber: "HP-28A-991K",
      purchaseDate: addDays(new Date(), -60).toISOString(),
      warrantyMonths: 12,
      branchId: "br_11",
      responsibleUser: { id: "u_11", name: "Maya Chen" },
      status: "ACTIVE",
      createdAt,
      updatedAt,
    },
  ];

  return { companies, activeCompanyId: companies[0].id, branches, users, assets, activeUserId: users[0].id };
}

function safeParse(json: string | null) {
  if (!json) return null;
  try {
    return JSON.parse(json) as StoreState;
  } catch {
    return null;
  }
}

const StoreContext = createContext<StoreApi | null>(null);

export function B2BStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoreState>(() => safeParse(localStorage.getItem(STORAGE_KEY)) ?? seed());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const api = useMemo<StoreApi>(() => {
    const setActiveCompanyId = (id: string) => {
      setState((s) => {
        const companyUsers = s.users.filter((u) => u.companyId === id);
        const nextUserId = companyUsers.some((u) => u.id === s.activeUserId) ? s.activeUserId : companyUsers[0]?.id ?? s.activeUserId;
        return { ...s, activeCompanyId: id, activeUserId: nextUserId };
      });
    };

    const setActiveUserId = (id: string) => setState((s) => ({ ...s, activeUserId: id }));

    const createBranch: StoreApi["createBranch"] = (input) => {
      setState((s) => {
        const id = `br_${crypto.randomUUID()}`;
        const t = nowIso();
        const created: Branch = {
          id,
          companyId: s.activeCompanyId,
          name: input.name.trim(),
          location: input.location?.trim() || "",
          code: input.code?.trim() || "",
          createdAt: t,
          updatedAt: t,
        };
        return { ...s, branches: [created, ...s.branches] };
      });
    };

    const updateBranch: StoreApi["updateBranch"] = (id, patch) => {
      setState((s) => ({
        ...s,
        branches: s.branches.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: nowIso() } : b)),
      }));
    };

    const deleteBranch: StoreApi["deleteBranch"] = (id) => {
      const hasAssets = state.assets.some((a) => a.companyId === state.activeCompanyId && a.branchId === id);
      if (hasAssets) return { ok: false, reason: "HAS_ASSETS" as const };
      setState((s) => ({ ...s, branches: s.branches.filter((b) => b.id !== id) }));
      return { ok: true };
    };

    const createUser: StoreApi["createUser"] = (input) => {
      setState((s) => {
        const id = `u_${crypto.randomUUID()}`;
        const created: User = { id, companyId: s.activeCompanyId, name: input.name.trim(), role: input.role, branchScope: input.branchScope };
        return { ...s, users: [created, ...s.users] };
      });
    };

    const updateUser: StoreApi["updateUser"] = (id, patch) => {
      setState((s) => ({
        ...s,
        users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
      }));
    };

    const createAsset: StoreApi["createAsset"] = (input) => {
      const company = state.companies.find((c) => c.id === state.activeCompanyId);
      const limit = company?.assetLimit ?? null;
      const companyAssets = state.assets.filter((a) => a.companyId === state.activeCompanyId);
      if (limit != null && companyAssets.length >= limit) return { ok: false, reason: "LIMIT" as const };

      setState((s) => {
        const companyAssetsInner = s.assets.filter((a) => a.companyId === s.activeCompanyId);
        const id = `as_${crypto.randomUUID()}`;
        const t = nowIso();
        const created: Asset = {
          ...input,
          id,
          companyId: s.activeCompanyId,
          internalAssetNumber: nextAssetNumber(companyAssetsInner),
          createdAt: t,
          updatedAt: t,
        };
        return { ...s, assets: [created, ...s.assets] };
      });

      return { ok: true };
    };

    const updateAsset: StoreApi["updateAsset"] = (id, patch) => {
      setState((s) => ({
        ...s,
        assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: nowIso() } : a)),
      }));
    };

    const deleteAsset: StoreApi["deleteAsset"] = (id) => {
      setState((s) => ({ ...s, assets: s.assets.filter((a) => a.id !== id) }));
    };

    return {
      state,
      setActiveCompanyId,
      setActiveUserId,
      createBranch,
      updateBranch,
      deleteBranch,
      createUser,
      updateUser,
      createAsset,
      updateAsset,
      deleteAsset,
    };
  }, [state]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useB2BStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useB2BStore must be used within B2BStoreProvider");
  return ctx;
}

export function useActiveCompany() {
  const { state } = useB2BStore();
  return state.companies.find((c) => c.id === state.activeCompanyId)!;
}

export function useActiveUser() {
  const { state } = useB2BStore();
  return state.users.find((u) => u.id === state.activeUserId)!;
}

export function roleAllows(role: Role, capability: "ASSETS_VIEW" | "ASSETS_EDIT" | "BRANCHES_EDIT" | "REPORTS_EXPORT" | "USERS_EDIT") {
  if (role === "ADMIN") return true;
  if (capability === "ASSETS_VIEW") return role === "FINANCE" || role === "IT" || role === "MAINTENANCE";
  if (capability === "ASSETS_EDIT") return role === "IT";
  if (capability === "BRANCHES_EDIT") return role === "IT";
  if (capability === "REPORTS_EXPORT") return role === "FINANCE";
  if (capability === "USERS_EDIT") return false;
  return false;
}
