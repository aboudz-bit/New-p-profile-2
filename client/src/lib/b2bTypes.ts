export type WarrantyStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";
export type AssetStatus = "ACTIVE" | "MAINTENANCE" | "RETIRED";

export type Role = "ADMIN" | "FINANCE" | "IT" | "MAINTENANCE";

export type Company = {
  id: string;
  name: string;
  plan?: "BASIC" | "PRO" | "ENTERPRISE";
  assetLimit?: number | null;
};

export type Branch = {
  id: string;
  companyId: string;
  name: string;
  location?: string;
  code?: string;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  companyId: string;
  name: string;
  role: Role;
  branchScope: "ALL" | string[];
};

export type Asset = {
  id: string;
  companyId: string;
  internalAssetNumber: string;
  name: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyMonths: number;
  warrantyEndDate?: string;
  branchId: string;
  responsibleUser: { id: string; name: string };
  status: AssetStatus;
  createdAt: string;
  updatedAt: string;
};
