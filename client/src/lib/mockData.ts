import { addDays, subDays } from "date-fns";

export interface MaintenanceRecord {
  id: string;
  date: Date;
  type: "Repair" | "Service" | "Part Replacement" | "Inspection";
  notes: string;
  provider: string;
}

export interface ProtectionPlan {
  id: string;
  provider: string;
  type: "Manufacturer Warranty" | "Extended Protection" | "Insurance";
  startDate: Date;
  endDate: Date;
  status: "active" | "expired" | "expiring";
  coverageSummary: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  serialNumber?: string;
  purchaseDate: Date;
  imageUrl?: string;
  invoiceId: string;
  
  // Warranty & Protection
  manufacturerWarranty: ProtectionPlan;
  extendedProtection?: ProtectionPlan;
  
  // Status derived from plans
  status: "active" | "expiring" | "expired" | "unprotected" | "eligible";

  maintenanceHistory: MaintenanceRecord[];
}

export interface Invoice {
  id: string;
  merchant: string;
  date: Date;
  total: number;
  currency: string;
  itemsCount: number;
  productIds: string[];
}

// MOCK DATA

export const MOCK_INVOICES: Invoice[] = [
  {
    id: "inv_001",
    merchant: "Apple Store",
    date: subDays(new Date(), 45),
    total: 1299.00,
    currency: "USD",
    itemsCount: 1,
    productIds: ["prod_001"]
  },
  {
    id: "inv_002",
    merchant: "Best Buy",
    date: subDays(new Date(), 180),
    total: 2499.99,
    currency: "USD",
    itemsCount: 2,
    productIds: ["prod_002", "prod_003"]
  },
  {
    id: "inv_003",
    merchant: "Amazon",
    date: subDays(new Date(), 400),
    total: 159.00,
    currency: "USD",
    itemsCount: 1,
    productIds: ["prod_004"]
  }
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "prod_001",
    name: "iPhone 15 Pro",
    category: "Electronics",
    brand: "Apple",
    model: "Pro Max 256GB",
    serialNumber: "H8X92KLA2",
    purchaseDate: subDays(new Date(), 45),
    invoiceId: "inv_001",
    status: "active",
    manufacturerWarranty: {
      id: "w_001",
      provider: "Apple",
      type: "Manufacturer Warranty",
      startDate: subDays(new Date(), 45),
      endDate: addDays(new Date(), 320),
      status: "active",
      coverageSummary: "Hardware coverage and technical support"
    },
    maintenanceHistory: []
  },
  {
    id: "prod_002",
    name: "MacBook Pro M3",
    category: "Computers",
    brand: "Apple",
    model: "14-inch M3 Pro",
    serialNumber: "C02X8291M",
    purchaseDate: subDays(new Date(), 180),
    invoiceId: "inv_002",
    status: "active",
    manufacturerWarranty: {
      id: "w_002",
      provider: "Apple",
      type: "Manufacturer Warranty",
      startDate: subDays(new Date(), 180),
      endDate: addDays(new Date(), 185),
      status: "active",
      coverageSummary: "Limited Warranty"
    },
    extendedProtection: {
      id: "ep_001",
      provider: "AppleCare+",
      type: "Extended Protection",
      startDate: subDays(new Date(), 180),
      endDate: addDays(new Date(), 900),
      status: "active",
      coverageSummary: "Accidental damage protection"
    },
    maintenanceHistory: [
      {
        id: "m_001",
        date: subDays(new Date(), 20),
        type: "Service",
        provider: "Genius Bar",
        notes: "Screen diagnostic check - passed"
      }
    ]
  },
  {
    id: "prod_003",
    name: "Sony WH-1000XM5",
    category: "Audio",
    brand: "Sony",
    model: "Noise Canceling",
    purchaseDate: subDays(new Date(), 180),
    invoiceId: "inv_002",
    status: "eligible",
    manufacturerWarranty: {
      id: "w_003",
      provider: "Sony",
      type: "Manufacturer Warranty",
      startDate: subDays(new Date(), 180),
      endDate: addDays(new Date(), 185),
      status: "active",
      coverageSummary: "Standard manufacturer warranty"
    },
    maintenanceHistory: []
  },
  {
    id: "prod_004",
    name: "Nespresso Vertuo",
    category: "Home Appliances",
    brand: "Nespresso",
    model: "Vertuo Next",
    purchaseDate: subDays(new Date(), 400),
    invoiceId: "inv_003",
    status: "expired",
    manufacturerWarranty: {
      id: "w_004",
      provider: "Nespresso",
      type: "Manufacturer Warranty",
      startDate: subDays(new Date(), 400),
      endDate: subDays(new Date(), 35),
      status: "expired",
      coverageSummary: "1 Year Limited Warranty"
    },
    maintenanceHistory: [
      {
        id: "m_002",
        date: subDays(new Date(), 50),
        type: "Repair",
        provider: "Authorized Service Center",
        notes: "Descaling mechanism repair"
      }
    ]
  }
];

export const MOCK_USER = {
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
  phone: "+1 (555) 012-3456",
  memberSince: "Nov 2023",
  totalProducts: 4,
  protectedProducts: 2
};
