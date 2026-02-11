import { supabase } from './supabaseClient';
import type { CompanyInfo } from '../types';

export interface Profile {
  id: string;
  full_name: string | null;
  company_type: 'ИП' | 'ОсОО';
  inn: string | null;
  address: string | null;
  settlement_account: string | null;
  bank_name: string | null;
  bik: string | null;
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase не настроен');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data!;
}

export async function signUp(email: string, password: string) {
  if (!supabase) throw new Error('Supabase не настроен');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/` }
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as Profile;
}

export async function upsertProfile(userId: string, company: CompanyInfo & { full_name: string }) {
  if (!supabase) throw new Error('Supabase не настроен');
  const row = {
    full_name: company.full_name || null,
    company_type: company.type,
    inn: company.inn || null,
    address: company.address || null,
    settlement_account: company.account || null,
    bank_name: company.bankName || null,
    bik: company.bik || null
  };
  const { data: updated, error: updateErr } = await supabase
    .from('profiles')
    .update(row)
    .eq('id', userId)
    .select();
  if (updateErr) throw updateErr;
  if (updated && updated.length > 0) return updated;
  const { data: inserted, error: insertErr } = await supabase
    .from('profiles')
    .insert({ id: userId, ...row })
    .select();
  if (insertErr) throw insertErr;
  return inserted;
}

export function profileToCompanyInfo(profile: Profile): CompanyInfo {
  return {
    type: profile.company_type,
    inn: profile.inn || '',
    address: profile.address || '',
    account: profile.settlement_account || '',
    bankName: profile.bank_name || '',
    bik: profile.bik || '',
    name: profile.full_name || undefined
  };
}
