import { supabase } from './supabaseClient';
import type { Client } from '../types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

function toDbRow(client: Client, userId: string, includeId = false) {
  const row: Record<string, unknown> = {
    user_id: userId,
    name: client.name,
    type: client.type,
    inn: client.inn,
    okpo: client.okpo,
    bank_name: client.bankName,
    bik: client.bik,
    account: client.account
  };
  if (includeId && client.id) {
    row.id = client.id;
  }
  return row;
}

function fromDbRow(row: Record<string, unknown>): Client {
  return {
    id: String(row.id ?? ''),
    name: (row.name as string) ?? '',
    type: (row.type as 'ИП' | 'ОсОО') ?? 'ОсОО',
    inn: (row.inn as string) ?? '',
    okpo: (row.okpo as string) ?? '',
    bankName: (row.bank_name as string) ?? '',
    bik: (row.bik as string) ?? '',
    account: (row.account as string) ?? ''
  };
}

export async function getClients(userId: string): Promise<Client[]> {
  if (!supabase || !isValidUuid(userId)) return [];
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getClients error:', error);
    return [];
  }
  return (data ?? []).map(fromDbRow);
}

export async function insertClient(userId: string, client: Omit<Client, 'id'>): Promise<Client> {
  if (!supabase) throw new Error('Supabase не настроен');
  if (!isValidUuid(userId)) throw new Error('Некорректный ID пользователя');
  const row = toDbRow({ ...client, id: '' }, userId, false);
  const { data, error } = await supabase
    .from('clients')
    .insert(row)
    .select()
    .single();
  if (error) {
    console.error('[Clients] insert error:', error);
    throw new Error(error.message || JSON.stringify(error));
  }
  return fromDbRow(data);
}

export async function updateClient(userId: string, client: Client): Promise<void> {
  if (!supabase) throw new Error('Supabase не настроен');
  if (!isValidUuid(userId)) throw new Error('Некорректный ID пользователя');
  const { error } = await supabase
    .from('clients')
    .update({
      name: client.name,
      type: client.type,
      inn: client.inn,
      okpo: client.okpo,
      bank_name: client.bankName,
      bik: client.bik,
      account: client.account,
      updated_at: new Date().toISOString()
    })
    .eq('id', client.id)
    .eq('user_id', userId);
  if (error) {
    console.error('[Clients] update error:', error);
    throw new Error(error.message || JSON.stringify(error));
  }
}

export async function deleteClient(userId: string, clientId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase не настроен');
  if (!isValidUuid(userId)) throw new Error('Некорректный ID пользователя');
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)
    .eq('user_id', userId);
  if (error) {
    console.error('[Clients] delete error:', error);
    throw new Error(error.message || JSON.stringify(error));
  }
}
