
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { InvoiceItem, TaxEntry, Client, CompanyInfo, RealizationRecord } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'react-hot-toast';

interface NewInvoiceScreenProps {
  onBack: () => void;
  availableProducts: TaxEntry[];
  clients: Client[];
  userCompany: CompanyInfo | null;
  realizations: RealizationRecord[];
  onSaveRealization: (realization: RealizationRecord) => void;
  onUpdateRealization: (realization: RealizationRecord) => void;
}

const NewInvoiceScreen = ({
  onBack,
  availableProducts,
  clients,
  userCompany,
  realizations,
  onSaveRealization,
  onUpdateRealization
}: NewInvoiceScreenProps) => {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [customerName, setCustomerName] = useState('');
  const [customerInn, setCustomerInn] = useState('');
  const [customerAccount, setCustomerAccount] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [exportTarget, setExportTarget] = useState<RealizationRecord | null>(null);
  const [editingRealization, setEditingRealization] = useState<RealizationRecord | null>(null);
  const exportPdfRef = useRef<HTMLDivElement>(null);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const clientSearchRef = useRef<HTMLDivElement>(null);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };
  const generateExchangeCode = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    const hex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
    return `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
  };
  const escapeXml = (value: string) => {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };
  const formatDate = (value: string) => {
    if (!value) return '';
    const [y, m, d] = value.split('-');
    if (!y || !m || !d) return value;
    return `${d}.${m}.${y}`;
  };
  const resetForm = () => {
    setCustomerName('');
    setCustomerInn('');
    setCustomerAccount('');
    setContractNumber('');
    setClientSearchQuery('');
    setSelectedClientId(null);
    setItems([]);
    setSearchQuery('');
    setIsSearchOpen(false);
    setIsClientSearchOpen(false);
    setDeliveryDate(new Date().toISOString().slice(0, 10));
    setIssueDate(new Date().toISOString().slice(0, 10));
  };
  const hasRealizations = realizations.length > 0;
  const toggleMenu = (id: string) => {
    setOpenMenuId((prev) => (prev === id ? null : id));
  };
  const startNew = () => {
    setEditingRealization(null);
    resetForm();
    setView('create');
  };
  const goToList = () => {
    setEditingRealization(null);
    resetForm();
    setView('list');
  };
  const cancelEdit = () => {
    setEditingRealization(null);
    resetForm();
    setView('list');
  };
  const buildXmlFor = (realization: RealizationRecord) => {
    const now = new Date();
    const dateStr = realization.issueDate || now.toISOString().split('T')[0];
    const fullDateStr = `${dateStr}T00:00:00+06:00`;
    const exchangeCode = generateExchangeCode();
    const itemsForExport = Array.isArray(realization.items) ? realization.items : [];
    if (itemsForExport.length === 0) {
      throw new Error('В реализации нет товаров для экспорта');
    }

    let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
    xml += `<receipts>\n`;
    xml += `    <receipt>\n`;
    xml += `        <exchangeCode>${exchangeCode}</exchangeCode>\n`;
    xml += `        <isResident>true</isResident>\n`;
    xml += `        <isIndustry>false</isIndustry>\n`;
    xml += `        <isPriceWithoutTaxes>false</isPriceWithoutTaxes>\n`;
    xml += `        <type>10</type>\n`;
    xml += `        <receiptTypeCode>10</receiptTypeCode>\n`;
    xml += `        <paymentTypeCode>20</paymentTypeCode>\n`;
    xml += `        <invoiceDeliveryTypeCode>399</invoiceDeliveryTypeCode>\n`;
    xml += `        <currencyCode>417</currencyCode>\n`;
    xml += `        <currencyName>Сом</currencyName>\n`;
    xml += `        <vatCode>100</vatCode>\n`;
    xml += `        <vatDeliveryTypeCode>102</vatDeliveryTypeCode>\n`;
    xml += `        <bankAccount>1091820802830157</bankAccount>\n`;
    xml += `        <contractorName>${escapeXml(realization.counterparty || '')}</contractorName>\n`;
    xml += `        <contractorPin>${escapeXml(realization.customerInn || '')}</contractorPin>\n`;
    xml += `        <contractorBankAccount>${escapeXml(realization.customerAccount || '')}</contractorBankAccount>\n`;
    xml += `        <createdDate>${dateStr}</createdDate>\n`;
    xml += `        <invoiceDate>${fullDateStr}</invoiceDate>\n`;
    xml += `        <deliveryContractNumber>${escapeXml(realization.contractNumber || '1')}</deliveryContractNumber>\n`;
    xml += `        <goods>\n`;
    itemsForExport.forEach(item => {
      xml += `            <good>\n`;
      xml += `                <goodsName>${escapeXml(item.name)}</goodsName>\n`;
      xml += `                <baseCount>${item.quantity.toFixed(5)}</baseCount>\n`;
      xml += `                <price>${item.price.toFixed(5)}</price>\n`;
      xml += `                <vatCode>100</vatCode>\n`;
      xml += `                <vatAmount>0.00</vatAmount>\n`;
      xml += `                <stCode>50</stCode>\n`;
      xml += `                <stAmount>0.00</stAmount>\n`;
      xml += `            </good>\n`;
    });
    xml += `        </goods>\n`;
    xml += `        <totalCost>${realization.total.toFixed(2)}</totalCost>\n`;
    xml += `    </receipt>\n`;
    xml += `</receipts>`;
    return xml;
  };
  const handleExportXml = (realization: RealizationRecord) => {
    try {
      const xml = buildXmlFor(realization);
      const blob = new Blob([xml], { type: 'text/xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `esf_export_${realization.id}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('XML сформирован');
    } catch (error) {
      alert('Нельзя сформировать XML: у реализации нет товаров.');
      console.error(error);
    } finally {
      setOpenMenuId(null);
    }
  };
  const handleExportPdf = async (realization: RealizationRecord) => {
    setOpenMenuId(null);
    setExportTarget(realization);
    setIsGenerating(true);
    requestAnimationFrame(async () => {
      try {
        if (!exportPdfRef.current) return;
        const canvas = await html2canvas(exportPdfRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`invoice_${realization.id}.pdf`);
        toast.success('Счет на оплату сформирован');
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast.error('Не удалось сформировать PDF');
      } finally {
        setIsGenerating(false);
        setExportTarget(null);
      }
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setIsClientSearchOpen(false);
      }
      if (openMenuId && !(event.target as HTMLElement).closest('[data-realization-menu]')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const isAlreadyAdded = (productName: string) => {
    return items.some(item => item.name === productName);
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const seen = new Set();
    return availableProducts.filter(p => {
      const isMatch = p.product.toLowerCase().includes(query) || p.supplier.toLowerCase().includes(query);
      if (isMatch && !seen.has(p.product)) {
        seen.add(p.product);
        return true;
      }
      return false;
    }).slice(0, 8);
  }, [availableProducts, searchQuery]);

  const filteredClients = useMemo(() => {
    const query = clientSearchQuery.trim().toLowerCase();
    const list = query
      ? clients.filter(c =>
          c.name.toLowerCase().includes(query) ||
          c.inn.includes(query)
        )
      : clients;
    return list.slice(0, 8);
  }, [clients, clientSearchQuery]);

  const addProductToInvoice = (product: TaxEntry) => {
    if (isAlreadyAdded(product.product)) return;
    const newItem: InvoiceItem = {
      id: generateId(),
      name: product.product,
      unit: product.unit || 'шт.',
      price: product.price,
      quantity: 1
    };
    setItems(prev => [...prev, newItem]);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const addAllProductsToInvoice = () => {
    if (!canSelectProducts) return;
    const existing = new Set(items.map((item) => item.name));
    const next = [...items];
    availableProducts.forEach((product) => {
      if (product.archived) return;
      if (existing.has(product.product)) return;
      const qty = Number(product.quantity);
      next.push({
        id: generateId(),
        name: product.product,
        unit: product.unit || 'шт.',
        price: product.price,
        quantity: qty > 0 ? qty : 1
      });
      existing.add(product.product);
    });
    setItems(next);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const selectClient = (client: Client) => {
    setCustomerName(client.name);
    setCustomerInn(client.inn);
    setCustomerAccount(client.account);
    setClientSearchQuery(client.name);
    setSelectedClientId(client.id);
    setIsClientSearchOpen(false);
  };

  const handleEdit = (realization: RealizationRecord) => {
    setEditingRealization(realization);
    setCustomerName(realization.counterparty || '');
    setCustomerInn(realization.customerInn || '');
    setCustomerAccount(realization.customerAccount || '');
    setContractNumber(realization.contractNumber || '');
    setDeliveryDate(realization.deliveryDate || new Date().toISOString().slice(0, 10));
    setIssueDate(realization.issueDate || new Date().toISOString().slice(0, 10));
    setItems(
      (realization.items || []).map((item) => ({
        ...item
      }))
    );
    const matchedClient = clients.find((c) => c.name === realization.counterparty);
    setSelectedClientId(matchedClient ? matchedClient.id : null);
    setClientSearchQuery(realization.counterparty || '');
    setView('create');
    setOpenMenuId(null);
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [items]);

  const handleSave = () => {
    if (items.length === 0) return;
    if (!selectedClientId && !editingRealization) return;
    const realization: RealizationRecord = {
      id: editingRealization?.id || generateId(),
      createdAt: editingRealization?.createdAt || new Date().toISOString().slice(0, 10),
      deliveryDate,
      issueDate,
      counterparty: customerName,
      total: totalAmount,
      items: items.map((item) => ({ ...item })),
      customerInn: customerInn || undefined,
      customerAccount: customerAccount || undefined,
      contractNumber: contractNumber || undefined
    };
    if (editingRealization) {
      onUpdateRealization(realization);
      toast.success('Реализация обновлена');
    } else {
      onSaveRealization(realization);
      toast.success('Реализация сохранена');
    }
    resetForm();
    setEditingRealization(null);
    setView('list');
  };

  const handleGeneratePDF = async () => {
    if (!pdfTemplateRef.current || items.length === 0) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(pdfTemplateRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateXML = () => {
    if (items.length === 0) return;
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const fullDateStr = `${dateStr}T00:00:00+06:00`;
    const exchangeCode = generateExchangeCode();

    let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
    xml += `<receipts>\n`;
    xml += `    <receipt>\n`;
    xml += `        <exchangeCode>${exchangeCode}</exchangeCode>\n`;
    xml += `        <isResident>true</isResident>\n`;
    xml += `        <isIndustry>false</isIndustry>\n`;
    xml += `        <isPriceWithoutTaxes>false</isPriceWithoutTaxes>\n`;
    xml += `        <type>10</type>\n`;
    xml += `        <receiptTypeCode>10</receiptTypeCode>\n`;
    xml += `        <paymentTypeCode>20</paymentTypeCode>\n`;
    xml += `        <invoiceDeliveryTypeCode>399</invoiceDeliveryTypeCode>\n`;
    xml += `        <currencyCode>417</currencyCode>\n`;
    xml += `        <currencyName>Сом</currencyName>\n`;
    xml += `        <vatCode>100</vatCode>\n`;
    xml += `        <vatDeliveryTypeCode>102</vatDeliveryTypeCode>\n`;
    
    // Seller Info (Fixed based on service provider account)
    xml += `        <bankAccount>1091820802830157</bankAccount>\n`;
    
    // Buyer Info
    xml += `        <contractorName>${escapeXml(customerName || '')}</contractorName>\n`;
    xml += `        <contractorPin>${escapeXml(customerInn || '')}</contractorPin>\n`;
    xml += `        <contractorBankAccount>${escapeXml(customerAccount || '')}</contractorBankAccount>\n`;
    
    xml += `        <createdDate>${dateStr}</createdDate>\n`;
    xml += `        <invoiceDate>${fullDateStr}</invoiceDate>\n`;
    xml += `        <deliveryContractNumber>${escapeXml(contractNumber || '1')}</deliveryContractNumber>\n`;
    
    xml += `        <goods>\n`;
    items.forEach(item => {
      xml += `            <good>\n`;
      xml += `                <goodsName>${escapeXml(item.name)}</goodsName>\n`;
      xml += `                <baseCount>${item.quantity.toFixed(5)}</baseCount>\n`;
      xml += `                <price>${item.price.toFixed(5)}</price>\n`;
      xml += `                <vatCode>100</vatCode>\n`;
      xml += `                <vatAmount>0.00</vatAmount>\n`;
      xml += `                <stCode>50</stCode>\n`;
      xml += `                <stAmount>0.00</stAmount>\n`;
      xml += `            </good>\n`;
    });
    xml += `        </goods>\n`;
    
    xml += `        <totalCost>${totalAmount.toFixed(2)}</totalCost>\n`;
    xml += `    </receipt>\n`;
    xml += `</receipts>`;

    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `esf_export_${now.getTime()}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentDate = new Date().toLocaleDateString('ru-RU');

  if (view === 'list') {
    return (
      <div className="max-w-[1200px] mx-auto py-6 px-5">
        <div className="absolute -top-[9999px] left-0">
          {exportTarget && (
            <div ref={exportPdfRef} className="text-black bg-white leading-normal" id="export-pdf-template">
              <div className="border-b-2 border-black pb-4 mb-6">
                <h1 className="text-xl font-bold text-center">
                  Счет на оплату № {Math.floor(Math.random() * 1000)} от {formatDate(exportTarget.issueDate)}
                </h1>
              </div>
              <div className="grid grid-cols-6 gap-2 mb-6 text-sm">
                <div className="col-span-1 font-bold">Поставщик:</div>
                <div className="col-span-5 border-b border-gray-300 pb-1">
                  {userCompany?.name || 'ОсОО "TaxFlow Solutions"'}{userCompany?.inn ? `, ИНН ${userCompany.inn}` : ''}
                </div>
                <div className="col-span-1 font-bold mt-2">Покупатель:</div>
                <div className="col-span-5 border-b border-gray-300 pb-1 mt-2">
                  {exportTarget.counterparty || '________________'} {exportTarget.customerInn ? `(ИНН: ${exportTarget.customerInn})` : ''}
                </div>
                <div className="col-span-1 font-bold mt-2">Договор:</div>
                <div className="col-span-5 border-b border-gray-300 pb-1 mt-2">
                  {exportTarget.contractNumber || 'Без договора'}
                </div>
              </div>
              <table className="w-full border-collapse border border-black text-[12px] mb-6">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-1 text-center w-8">№</th>
                    <th className="border border-black p-1 text-left">Товары</th>
                    <th className="border border-black p-1 text-center w-16">Кол-во</th>
                    <th className="border border-black p-1 text-center w-12">Ед.</th>
                    <th className="border border-black p-1 text-right w-24">Цена</th>
                    <th className="border border-black p-1 text-right w-24">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {exportTarget.items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="border border-black p-1 text-center">{idx + 1}</td>
                      <td className="border border-black p-1">{item.name}</td>
                      <td className="border border-black p-1 text-center">{item.quantity}</td>
                      <td className="border border-black p-1 text-center">{item.unit}</td>
                      <td className="border border-black p-1 text-right">{item.price.toLocaleString()}</td>
                      <td className="border border-black p-1 text-right">{(item.price * item.quantity).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-col items-end gap-1 text-sm font-bold">
                <div>Всего к оплате: {exportTarget.total.toLocaleString()} сом</div>
              </div>
            </div>
          )}
        </div>
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Реализация</h2>
            <nav className="flex items-center text-xs text-slate-500 gap-2 font-bold">
              <button onClick={onBack} className="hover:text-primary transition-colors">Мой склад</button>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-primary">Реализация</span>
            </nav>
          </div>

          {hasRealizations && (
            <div className="flex items-center gap-2">
              {editingRealization && (
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-2 rounded-2xl">
                  Режим редактирования
                </span>
              )}
              <button
                onClick={startNew}
                className="bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl shadow-primary/20 transition-all active:scale-95 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-xl">add_circle</span>
                Реализовать
              </button>
            </div>
          )}
        </header>

        {hasRealizations ? (
          <section className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto min-h-[320px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-3 px-5">UUID</th>
                    <th className="py-3 px-5">Дата создания</th>
                    <th className="py-3 px-5">Дата поставки</th>
                    <th className="py-3 px-5">Дата оформления</th>
                    <th className="py-3 px-5">Контрагент</th>
                    <th className="py-3 px-5 text-right">Общая стоимость</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {realizations.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/30">
                      <td className="py-3 px-5 text-xs text-slate-500 font-bold">{row.id}</td>
                      <td className="py-3 px-5 text-sm text-slate-600 dark:text-slate-400 font-bold">{formatDate(row.createdAt)}</td>
                      <td className="py-3 px-5 text-sm text-slate-600 dark:text-slate-400 font-bold">{formatDate(row.deliveryDate)}</td>
                      <td className="py-3 px-5 text-sm text-slate-600 dark:text-slate-400 font-bold">{formatDate(row.issueDate)}</td>
                      <td className="py-3 px-5 text-sm font-black text-slate-900 dark:text-white">{row.counterparty}</td>
                      <td className="py-3 px-5 text-sm font-black text-slate-900 dark:text-white text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span>{row.total.toLocaleString()} сом</span>
                          <div className="relative" data-realization-menu>
                            <button
                              onClick={() => toggleMenu(row.id)}
                              className="size-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Действия"
                            >
                              <span className="material-symbols-outlined">more_horiz</span>
                            </button>
                            {openMenuId === row.id && (
                              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden" data-realization-menu>
                                <button
                                  onClick={() => handleEdit(row)}
                                  className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-base">edit</span>
                                  Редактировать
                                </button>
                                <button
                                  onClick={() => handleExportXml(row)}
                                  className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-base">description</span>
                                  Сформировать XML (ЭСФ)
                                </button>
                                <button
                                  onClick={() => handleExportPdf(row)}
                                  className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                                  Сформировать счет на оплату
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8 text-center">
            <p className="text-slate-500 font-bold mb-4">Вы еще не реализовали товары</p>
            <button
              onClick={startNew}
              className="bg-primary hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-sm inline-flex items-center gap-2 shadow-xl shadow-primary/20 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-xl">add_circle</span>
              Реализовать
            </button>
          </div>
        )}
      </div>
    );
  }

  const canSelectProducts = Boolean(selectedClientId);
  return (
    <div className="max-w-[1200px] mx-auto py-6 px-5">
      {/* Hidden PDF Template */}
      <div className="absolute -top-[9999px] left-0">
        <div id="pdf-template" ref={pdfTemplateRef} className="text-black bg-white leading-normal">
          <div className="border-b-2 border-black pb-4 mb-6">
            <h1 className="text-xl font-bold text-center">Счет на оплату № {Math.floor(Math.random() * 1000)} от {currentDate}</h1>
          </div>
          <div className="grid grid-cols-6 gap-2 mb-6 text-sm">
            <div className="col-span-1 font-bold">Поставщик:</div>
            <div className="col-span-5 border-b border-gray-300 pb-1">{userCompany?.name || 'ОсОО "TaxFlow Solutions"'}, ИНН {userCompany?.inn || '12345678901234'}</div>
            <div className="col-span-1 font-bold mt-2">Покупатель:</div>
            <div className="col-span-5 border-b border-gray-300 pb-1 mt-2">{customerName || '________________'} {customerInn ? `(ИНН: ${customerInn})` : ''}</div>
            <div className="col-span-1 font-bold mt-2">Договор:</div>
            <div className="col-span-5 border-b border-gray-300 pb-1 mt-2">{contractNumber || 'Без договора'}</div>
          </div>
          <table className="w-full border-collapse border border-black text-[12px] mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1 text-center w-8">№</th>
                <th className="border border-black p-1 text-left">Товары</th>
                <th className="border border-black p-1 text-center w-16">Кол-во</th>
                <th className="border border-black p-1 text-center w-12">Ед.</th>
                <th className="border border-black p-1 text-right w-24">Цена</th>
                <th className="border border-black p-1 text-right w-24">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="border border-black p-1 text-center">{idx + 1}</td>
                  <td className="border border-black p-1">{item.name}</td>
                  <td className="border border-black p-1 text-center">{item.quantity}</td>
                  <td className="border border-black p-1 text-center">{item.unit}</td>
                  <td className="border border-black p-1 text-right">{item.price.toLocaleString()}</td>
                  <td className="border border-black p-1 text-right">{(item.price * item.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col items-end gap-1 text-sm font-bold">
            <div>Всего к оплате: {totalAmount.toLocaleString()} сом</div>
          </div>
        </div>
      </div>

      <nav className="flex items-center gap-2 mb-4 text-xs font-black">
        <button onClick={goToList} className="text-slate-500 hover:text-primary transition-colors">Реализация</button>
        <span className="material-symbols-outlined text-slate-300 text-xs">chevron_right</span>
        <span className="text-slate-900 dark:text-white">
          {editingRealization ? 'Редактирование' : 'Новая реализация'}
        </span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {editingRealization ? 'Редактирование' : 'Новая реализация'}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <section className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-black mb-5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">person_search</span>
            </div>
            Данные покупателя
          </h2>
          <div className="grid grid-cols-1 gap-5">
            <div className="flex flex-col gap-3 relative" ref={clientSearchRef}>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Поиск в базе клиентов</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary">person</span>
                <input
                  type="text"
                  value={clientSearchQuery}
                  onChange={(e) => {
                    setClientSearchQuery(e.target.value);
                    setCustomerName(e.target.value);
                    setSelectedClientId(null);
                    setIsClientSearchOpen(true);
                  }}
                  onFocus={() => setIsClientSearchOpen(true)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary text-base font-medium transition-all"
                  placeholder="Нажмите, чтобы выбрать клиента"
                />
              </div>

              {isClientSearchOpen && filteredClients.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[60] overflow-hidden">
                  <div className="p-2">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => selectClient(client)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors group"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white group-hover:text-primary">{client.name}</span>
                          <span className="text-xs text-slate-500">ИНН: {client.inn}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[11px] text-slate-500 font-bold mt-2">
                Если вы не нашли клиента, заведите его в разделе "Клиенты"
              </p>
            </div>
          </div>
        </section>

        <section className="relative" ref={searchRef}>
          <div className="flex items-center justify-end mb-2">
            <button
              onClick={addAllProductsToInvoice}
              disabled={!canSelectProducts || availableProducts.length === 0}
              className="text-xs font-black text-slate-600 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              Выбрать все
            </button>
          </div>
          <div className={`relative group shadow-md z-20 ${!canSelectProducts ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-xl">inventory_2</span>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full pl-12 pr-5 py-4 rounded-3xl border-2 border-transparent bg-white dark:bg-slate-900 focus:border-primary focus:ring-0 text-base font-medium dark:text-white outline-none"
              placeholder="Добавить товар со склада..."
            />
          </div>
          {!canSelectProducts && (
            <p className="text-xs text-slate-500 font-bold mt-2">Сначала выберите покупателя</p>
          )}

          {isSearchOpen && searchQuery.length > 0 && canSelectProducts && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden">
              {filteredProducts.length > 0 ? (
                <div className="p-2">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      disabled={isAlreadyAdded(p.product)}
                      onClick={() => addProductToInvoice(p)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors group disabled:opacity-50"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold group-hover:text-primary">{p.product}</span>
                        <span className="text-xs text-slate-500">Остаток: {p.quantity}</span>
                      </div>
                      <span className="text-sm font-black">{p.price.toLocaleString()} сом</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 font-bold">Ничего не найдено</div>
              )}
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            {items.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-4 px-6">#</th>
                    <th className="py-4 px-6">Наименование</th>
                    <th className="py-4 px-6">Цена</th>
                    <th className="py-4 px-6">Кол-во</th>
                    <th className="py-4 px-6">Итого</th>
                    <th className="py-4 px-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/30">
                      <td className="py-4 px-6 text-sm font-bold text-slate-400">{index + 1}</td>
                      <td className="py-4 px-6 font-black text-slate-900 dark:text-white">{item.name}</td>
                      <td className="py-4 px-6 font-black">{item.price.toLocaleString()}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-xl p-1 w-fit">
                          <button onClick={() => updateQuantity(item.id, -1)} className="size-7 flex items-center justify-center rounded-lg hover:bg-slate-100"><span className="material-symbols-outlined text-base">remove</span></button>
                          <span className="w-6 text-center font-black">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="size-7 flex items-center justify-center rounded-lg hover:bg-slate-100"><span className="material-symbols-outlined text-primary text-base">add</span></button>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-black">{(item.price * item.quantity).toLocaleString()}</td>
                      <td className="py-4 px-6 text-right">
                        <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600"><span className="material-symbols-outlined">delete</span></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
            <div className="py-16 text-center text-slate-500 font-bold">Счет пуст</div>
            )}
          </div>

          <div className="p-6 border-t-2 border-slate-100 dark:border-slate-800 flex justify-between items-end bg-slate-50/20">
            <div className="text-right space-y-2 ml-auto">
              <p className="text-xs font-bold text-slate-500">Всего позиций: {items.length}</p>
              <div className="flex items-baseline gap-3">
                <span className="text-lg font-black text-slate-400">ИТОГО</span>
                <span className="text-3xl font-black text-slate-900 dark:text-white">{totalAmount.toLocaleString()} сом</span>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap justify-end items-center gap-3 pt-3 mb-12">
          {editingRealization && (
            <button
              onClick={cancelEdit}
              className="px-6 py-3 rounded-2xl font-black text-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-all flex items-center gap-3"
            >
              <span className="material-symbols-outlined">close</span>
              Отмена редактирования
            </button>
          )}
          <button
            disabled={!selectedClientId || items.length === 0}
            onClick={handleSave}
            className="px-6 py-3 rounded-2xl font-black text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-3 disabled:opacity-50"
          >
            <span className="material-symbols-outlined">save</span>
            {editingRealization ? 'Сохранить изменения' : 'Сохранить реализацию'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewInvoiceScreen;
