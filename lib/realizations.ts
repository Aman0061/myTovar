import { supabase } from './supabaseClient';
import type { RealizationRecord, InvoiceItem } from '../types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

function toDbRow(r: RealizationRecord, userId: string) {
  return {
    id: r.id,
    user_id: userId,
    delivery_date: r.deliveryDate ?? null,
    issue_date: r.issueDate ?? null,
    counterparty: r.counterparty ?? null,
    total: r.total ?? 0,
    customer_inn: r.customerInn ?? null,
    customer_account: r.customerAccount ?? null,
    contract_number: r.contractNumber ?? null,
    items: Array.isArray(r.items) ? r.items : [],
    record_created_at: r.createdAt ?? null
  };
}

function fromDbRow(row: Record<string, unknown>): RealizationRecord {
  const items = row.items;
  const itemsArr = Array.isArray(items)
    ? (items as InvoiceItem[])
    : [];
  return {
    id: String(row.id ?? ''),
    createdAt: (row.record_created_at as string) ?? '',
    deliveryDate: (row.delivery_date as string) ?? '',
    issueDate: (row.issue_date as string) ?? '',
    counterparty: (row.counterparty as string) ?? '',
    total: Number(row.total ?? 0),
    items: itemsArr,
    customerInn: row.customer_inn != null ? String(row.customer_inn) : undefined,
    customerAccount: row.customer_account != null ? String(row.customer_account) : undefined,
    contractNumber: row.contract_number != null ? String(row.contract_number) : undefined
  };
}

export async function getRealizations(userId: string): Promise<RealizationRecord[]> {
  if (!supabase || !isValidUuid(userId)) return [];
  const { data, error } = await supabase
    .from('realized')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getRealizations error:', error);
    return [];
  }
  return (data ?? []).map(fromDbRow);
}

export async function insertRealization(
  userId: string,
  realization: RealizationRecord
): Promise<RealizationRecord> {
  if (!supabase) throw new Error('Supabase не настроен');
  if (!isValidUuid(userId)) throw new Error('Некорректный ID пользователя');
  const row = toDbRow(realization, userId);
  const { data, error } = await supabase
    .from('realized')
    .insert(row)
    .select()
    .single();
  if (error) {
    console.error('[Realizations] insert error:', error);
    throw new Error(error.message || JSON.stringify(error));
  }
  return fromDbRow(data);
}

export async function updateRealization(
  userId: string,
  realization: RealizationRecord
): Promise<void> {
  if (!supabase) throw new Error('Supabase не настроен');
  if (!isValidUuid(userId)) throw new Error('Некорректный ID пользователя');
  const { error } = await supabase
    .from('realized')
    .update({
      delivery_date: realization.deliveryDate ?? null,
      issue_date: realization.issueDate ?? null,
      counterparty: realization.counterparty ?? null,
      total: realization.total ?? 0,
      customer_inn: realization.customerInn ?? null,
      customer_account: realization.customerAccount ?? null,
      contract_number: realization.contractNumber ?? null,
      items: Array.isArray(realization.items) ? realization.items : [],
      record_created_at: realization.createdAt ?? null,
      updated_at: new Date().toISOString()
    })
    .eq('id', realization.id)
    .eq('user_id', userId);
  if (error) {
    console.error('[Realizations] update error:', error);
    throw new Error(error.message || JSON.stringify(error));
  }
}
