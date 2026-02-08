
export enum Screen {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  LANDING = 'LANDING',
  DATA_GRID = 'DATA_GRID',
  NEW_INVOICE = 'NEW_INVOICE',
  CLIENTS = 'CLIENTS'
}

export interface TaxEntry {
  id: string;
  date: string;
  supplier: string;
  product: string;
  quantity: number;
  price: number;
  total: number;
}

export interface InvoiceItem {
  id: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
}

export interface Client {
  id: string;
  name: string;
  type: 'ИП' | 'ОсОО';
  inn: string;
  okpo: string;
  bankName: string;
  bik: string;
  account: string;
}

export interface CompanyInfo {
  type: 'ИП' | 'ОсОО';
  inn: string;
  address: string;
  account: string;
  bankName: string;
  bik: string;
  name?: string; // Optional login or company name
}

export interface AccountUser {
  id: string;
  email: string;
  login: string;
  password: string;
  company: CompanyInfo;
}
