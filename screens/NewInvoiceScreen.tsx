
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { InvoiceItem, TaxEntry, Client, CompanyInfo } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface NewInvoiceScreenProps {
  onBack: () => void;
  availableProducts: TaxEntry[];
  clients: Client[];
  userCompany: CompanyInfo | null;
}

const NewInvoiceScreen: React.FC<NewInvoiceScreenProps> = ({ onBack, availableProducts, clients, userCompany }) => {
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
  
  const searchRef = useRef<HTMLDivElement>(null);
  const clientSearchRef = useRef<HTMLDivElement>(null);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };
  const escapeXml = (value: string) => {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setIsClientSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    if (!clientSearchQuery.trim()) return [];
    const query = clientSearchQuery.toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.inn.includes(query)
    ).slice(0, 5);
  }, [clients, clientSearchQuery]);

  const addProductToInvoice = (product: TaxEntry) => {
    if (isAlreadyAdded(product.product)) return;
    const newItem: InvoiceItem = {
      id: generateId(),
      name: product.product,
      unit: 'шт.',
      price: product.price,
      quantity: 1
    };
    setItems(prev => [...prev, newItem]);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const selectClient = (client: Client) => {
    setCustomerName(client.name);
    setCustomerInn(client.inn);
    setCustomerAccount(client.account);
    setClientSearchQuery(client.name);
    setIsClientSearchOpen(false);
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
    const exchangeCode = generateId();

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
        <button onClick={onBack} className="text-slate-500 hover:text-primary transition-colors">Реализация</button>
        <span className="material-symbols-outlined text-slate-300 text-xs">chevron_right</span>
        <span className="text-slate-900 dark:text-white">Новый счет</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Новый счет на оплату</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <section className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-black mb-5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">person_search</span>
            </div>
            Данные покупателя
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                    setIsClientSearchOpen(true);
                  }}
                  onFocus={() => setIsClientSearchOpen(true)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary text-base font-medium transition-all"
                  placeholder="Введите имя или ИНН..."
                />
              </div>

              {isClientSearchOpen && clientSearchQuery.length > 0 && filteredClients.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[60] overflow-hidden">
                  <div className="p-2">
                    {filteredClients.map(client => (
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
            </div>
            
            <div className="flex flex-col gap-3">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Номер договора</label>
              <input 
                type="text"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                className="form-input rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary py-3 px-4 text-base font-medium transition-all"
                placeholder="№2024-001"
              />
            </div>
          </div>
        </section>

        <section className="relative" ref={searchRef}>
          <div className="relative group shadow-md z-20">
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

          {isSearchOpen && searchQuery.length > 0 && (
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

        <div className="flex justify-end items-center gap-3 pt-3 mb-12">
          <button 
            disabled={items.length === 0}
            onClick={handleGenerateXML}
            className="px-6 py-3 rounded-2xl font-black text-sm border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all flex items-center gap-3 disabled:opacity-50"
          >
            <span className="material-symbols-outlined">xml</span>
            Сформировать XML (ЭСФ)
          </button>
          
          <button 
            disabled={items.length === 0 || isGenerating}
            onClick={handleGeneratePDF}
            className={`px-8 py-4 rounded-3xl font-black text-base shadow-2xl flex items-center gap-3 transition-all ${items.length > 0 && !isGenerating ? 'bg-primary hover:bg-blue-700 text-white shadow-primary/30' : 'bg-slate-100 text-slate-400'}`}
          >
            {isGenerating ? 'Создание...' : 'Сформировать PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewInvoiceScreen;
