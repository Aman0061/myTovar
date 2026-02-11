import { supabase } from "./supabaseClient";
import type { TaxEntry } from "../types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

function toDbRow(entry: TaxEntry, userId: string) {
  return {
    id: entry.id,
    user_id: userId,
    date: entry.date ?? null,
    supplier: entry.supplier ?? null,
    product: entry.product,
    quantity: entry.quantity ?? 0,
    price: entry.price ?? 0,
    retail_price: entry.retailPrice ?? null,
    total: entry.total ?? 0,
    row: entry.row ?? null,
    unit: entry.unit ?? null,
    archived: entry.archived ?? false,
  };
}

function fromDbRow(row: Record<string, unknown>): TaxEntry {
  return {
    id: row.id as string,
    date: (row.date as string) ?? "",
    supplier: (row.supplier as string) ?? "",
    product: (row.product as string) ?? "",
    quantity: Number(row.quantity ?? 0),
    price: Number(row.price ?? 0),
    retailPrice:
      row.retail_price != null ? Number(row.retail_price) : undefined,
    total: Number(row.total ?? 0),
    row: row.row != null ? (row.row as string) : undefined,
    unit: row.unit != null ? (row.unit as string) : undefined,
    archived: row.archived === true,
  };
}

export async function getProducts(userId: string): Promise<TaxEntry[]> {
  if (!supabase || !isValidUuid(userId)) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getProducts error:", error);
    return [];
  }
  const result = (data ?? []).map(fromDbRow);
  return result;
}

export async function saveProducts(
  userId: string,
  entries: TaxEntry[],
): Promise<void> {
  if (!supabase || !isValidUuid(userId)) return;
  const { error: deleteErr } = await supabase
    .from("products")
    .delete()
    .eq("user_id", userId);
  if (deleteErr) {
    console.error("saveProducts delete error:", deleteErr);
    throw new Error(deleteErr.message);
  }
  if (entries.length === 0) return;
  const byId = new Map<string, TaxEntry>();
  for (const e of entries) byId.set(e.id, e);
  const uniqueEntries = Array.from(byId.values());
  const rows = uniqueEntries.map((e) => toDbRow(e, userId));
  const { error: insertErr } = await supabase.from("products").insert(rows);
  if (insertErr) {
    console.error("saveProducts insert error:", insertErr);
    throw new Error(insertErr.message);
  }
}

export async function addProducts(
  userId: string,
  entries: TaxEntry[],
): Promise<void> {
  if (!supabase || !isValidUuid(userId) || entries.length === 0) return;
  const rows = entries.map((e) => toDbRow(e, userId));
  const { error } = await supabase.from("products").insert(rows);
  if (error) throw error;
}
