
export enum Screen {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  LANDING = 'LANDING',
  DATA_GRID = 'DATA_GRID',
  NEW_INVOICE = 'NEW_INVOICE',
  CLIENTS = 'CLIENTS',
  REPORTS = 'REPORTS',
  RETAIL = 'RETAIL',
  ARCHIVE = 'ARCHIVE',
  SETTINGS = 'SETTINGS'
}

export interface TaxEntry {
  id: string;
  date: string;
  supplier: string;
  product: string;
  quantity: number;
  price: number;
  retailPrice?: number;
  total: number;
  row?: string;
  unit?: string;
  archived?: boolean;
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

export interface RealizationRecord {
  id: string;
  createdAt: string;
  deliveryDate: string;
  issueDate: string;
  counterparty: string;
  total: number;
  items: InvoiceItem[];
  customerInn?: string;
  customerAccount?: string;
  contractNumber?: string;
}

export interface RetailMatchCandidate {
  product: string;
  score: number;
}

export interface RetailSale {
  id: string;
  text: string;
  createdAt: string;
  status: 'pending' | 'matched' | 'applied';
  matchedProduct?: string;
  matchScore?: number;
  candidates?: RetailMatchCandidate[];
}
