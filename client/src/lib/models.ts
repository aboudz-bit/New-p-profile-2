import { api } from "./api";

/** Sentinel select value meaning "create a new model from the entered name". */
export const NEW_MODEL = "__new__";

export interface ProductModelOption {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
}

/**
 * Resolve a `productModelId` for profile create/edit:
 *  - a UUID selection → that id
 *  - NEW_MODEL + a name → create the model (carrying brand/category) → its id
 *  - empty → null (free-text brand/model fallback)
 */
export async function resolveModelId(
  selection: string,
  newName: string,
  extra: { brand?: string | null; category?: string | null; manufacturerKey?: string | null },
): Promise<string | null> {
  if (selection === NEW_MODEL) {
    if (!newName.trim()) return null;
    const m = await api.post<{ id: string }>("/models", {
      name: newName.trim(),
      brand: extra.brand || undefined,
      category: extra.category || undefined,
      manufacturerKey: extra.manufacturerKey || undefined,
    });
    return m.id;
  }
  return selection || null;
}
