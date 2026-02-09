
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TaxEntry } from '../types';
import * as XLSX from 'xlsx';

interface DataGridScreenProps {
  entries: TaxEntry[];
  onDataLoaded: (entries: TaxEntry[]) => void;
  onEntriesUpdated?: (entries: TaxEntry[]) => void;
}

const DataGridScreen: React.FC<DataGridScreenProps> = ({
  entries,
  onDataLoaded,
  onEntriesUpdated
}) => {
  const [search, setSearch] = useState('');
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  
  // States for Catalog Tool
  const [supplierXmlContent, setSupplierXmlContent] = useState<string | null>(null);
  const [catalogCsvContent, setCatalogCsvContent] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [openEntryMenuId, setOpenEntryMenuId] = useState<string | null>(null);

  const supplierFileRef = useRef<HTMLInputElement>(null);
  const catalogFileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        openEntryMenuId &&
        !(event.target as HTMLElement).closest('[data-entry-menu]')
      ) {
        setOpenEntryMenuId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [openEntryMenuId]);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => 
      e.product.toLowerCase().includes(search.toLowerCase()) || 
      e.supplier.toLowerCase().includes(search.toLowerCase())
    );
  }, [entries, search]);

  const totalSum = useMemo(() => {
    return entries.reduce((acc, curr) => acc + curr.total, 0);
  }, [entries]);

  const supplierCount = useMemo(() => {
    return new Set(entries.map(e => e.supplier)).size;
  }, [entries]);

  const toggleEntryMenu = (id: string) => {
    setOpenEntryMenuId((prev) => (prev === id ? null : id));
  };

  const handleDeleteEntry = (id: string) => {
    setOpenEntryMenuId(null);
    const next = entries.filter((entry) => entry.id !== id);
    if (onEntriesUpdated) {
      onEntriesUpdated(next);
    } else {
      onDataLoaded(next);
    }
  };

  const getSmartTnved = (name: string) => {
    const n = name.toUpperCase();
    if (n.includes('ЛЕСТНИЦА') || n.includes('СТРЕМЯНКА')) return '7616999008';
    if (n.includes('ДРЕЛЬ') || n.includes('ПЕРФОРАТОР') || n.includes('ШУРУПОВЕРТ')) return '8467211000';
    return '3214101009'; // Default for paints/glue/mixes
  };

  const handleFullCatalogExport = () => {
    if (entries.length === 0) {
      alert("На складе нет товаров для экспорта.");
      return;
    }

    const excelData = entries.map((entry) => ({
      "Наименование товара": entry.product,
      "Код единицы измерения": entry.unit || "шт",
      "Код ТН ВЭД": getSmartTnved(entry.product),
      "Признак товара": "1",
      "Цена": entry.price || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths for better visibility
    worksheet['!cols'] = [
      { wch: 50 }, // Name
      { wch: 15 }, // Unit
      { wch: 20 }, // TNVED
      { wch: 15 }, // Flag
      { wch: 10 }  // Price
    ];

    // Force string format for codes column
    // Fix: Cast worksheet['!ref'] to string to handle "unknown" type error in some environments
    const range = XLSX.utils.decode_range(worksheet['!ref'] as string);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const tnvedCell = XLSX.utils.encode_cell({ r: R, c: 2 });
      if (worksheet[tnvedCell]) worksheet[tnvedCell].t = 's';
      
      const unitCell = XLSX.utils.encode_cell({ r: R, c: 1 });
      if (worksheet[unitCell]) worksheet[unitCell].t = 's';
      
      const flagCell = XLSX.utils.encode_cell({ r: R, c: 3 });
      if (worksheet[flagCell]) worksheet[flagCell].t = 's';
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ESF_Catalog");

    XLSX.writeFile(workbook, `full_catalog_export_${new Date().getTime()}.xlsx`);
  };

  const handleAddGoodsClick = () => {
    navigate('/add-products');
  };


  const handleCatalogImport = () => {
    if (!supplierXmlContent || !catalogCsvContent) {
      alert('Пожалуйста, выберите оба файла (XML поставщика и каталог)');
      return;
    }

    setIsProcessing(true);
    
    try {
      const csvLines = catalogCsvContent.split(/\r?\n/).filter(Boolean);
      if (csvLines.length === 0) {
        alert('Каталог пуст или имеет неверный формат.');
        setIsProcessing(false);
        return;
      }
      const headers = csvLines[0].split(/[;|,]/);
      const nameIndex = headers.findIndex(h => h.toLowerCase().includes('наименование'));
      if (nameIndex === -1) {
        alert('Не удалось найти колонку "Наименование" в каталоге.');
        setIsProcessing(false);
        return;
      }
      
      const existingProducts = new Set<string>();
      if (nameIndex !== -1) {
        for (let i = 1; i < csvLines.length; i++) {
          const columns = csvLines[i].split(/[;|,]/);
          if (columns[nameIndex]) {
            existingProducts.add(columns[nameIndex].trim());
          }
        }
      }

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(supplierXmlContent, "text/xml");
      if (xmlDoc.querySelector('parsererror')) {
        alert('XML поставщика содержит ошибки.');
        setIsProcessing(false);
        return;
      }
      const goodNodes = xmlDoc.getElementsByTagName('good');
      
      const newItemsToAdd = new Set<string>();
      for (let i = 0; i < goodNodes.length; i++) {
        const nameNode = goodNodes[i].getElementsByTagName('goodsName')[0];
        const name = nameNode?.textContent?.trim();
        if (name && !existingProducts.has(name)) {
          newItemsToAdd.add(name);
        }
      }

      if (newItemsToAdd.size === 0) {
        alert('Все товары из этого счета уже есть в вашем каталоге.');
        setIsProcessing(false);
        return;
      }

      const excelData = Array.from(newItemsToAdd).sort().map(productName => ({
        "Наименование товара": productName,
        "Код единицы измерения": "шт",
        "Код ТН ВЭД": getSmartTnved(productName),
        "Признак товара": "1",
        "Цена": 0
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      // Fix: Cast worksheet['!ref'] to string to handle "unknown" type error in some environments
      const range = XLSX.utils.decode_range(worksheet['!ref'] as string);
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: 2 });
        if (worksheet[cellRef]) worksheet[cellRef].t = 's';
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Import");
      XLSX.writeFile(workbook, `esf_catalog_import_${new Date().getTime()}.xlsx`);
      
      setIsCatalogModalOpen(false);
      setSupplierXmlContent(null);
      setCatalogCsvContent(null);
    } catch (err) {
      console.error(err);
      alert('Ошибка при обработке файлов.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileRead = (file: File, setter: (content: string) => void, kind: 'supplierXml' | 'catalog') => {
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      alert('Файл слишком большой. Максимум 10 МБ.');
      return;
    }
    const fileName = file.name.toLowerCase();
    if (kind === 'supplierXml' && !fileName.endsWith('.xml')) {
      alert('Для поставщика поддерживается только XML.');
      return;
    }
    if (kind === 'catalog') {
      const isAllowed = ['.csv', '.xml', '.xls', '.xlsx'].some(ext => fileName.endsWith(ext));
      if (!isAllowed) {
        alert('Каталог поддерживает CSV, XML, XLS или XLSX.');
        return;
      }
    }
    const reader = new FileReader();
    reader.onerror = () => alert('Ошибка чтения файла. Попробуйте еще раз.');
    if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            alert('Не удалось прочитать лист Excel.');
            return;
          }
          const worksheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(worksheet);
          setter(csv);
        } catch (error) {
          console.error(error);
          alert('Ошибка при чтении Excel файла.');
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }
    reader.onload = (e) => setter(e.target?.result as string);
    reader.readAsText(file);
  };

  return (
    <div className="p-5 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Мой Склад</h2>
          <nav className="flex items-center text-xs text-slate-500 gap-2 font-bold">
            <span className="hover:text-primary cursor-pointer transition-colors">Главная</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-primary">Товарные запасы</span>
          </nav>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative group flex-1 md:flex-none">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary">
              <span className="material-symbols-outlined text-xl">search</span>
            </div>
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full md:w-72 pl-10 pr-4 py-2.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl text-sm focus:ring-primary focus:border-primary transition-all shadow-sm"
              placeholder="Поиск по поставщику или товару..."
            />
          </div>
          <button
            onClick={handleAddGoodsClick}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 shadow-sm transition-all hover:border-primary hover:text-primary"
          >
            <span className="material-symbols-outlined text-xl">upload_file</span>
            Добавить товары
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Всего позиций', value: entries.length.toLocaleString(), icon: 'inventory_2' },
          { label: 'Стоимость склада', value: totalSum.toLocaleString(), sub: 'сом', icon: 'payments' },
          { label: 'Активных поставщиков', value: supplierCount.toString(), icon: 'groups' }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-3 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <span className="material-symbols-outlined text-slate-300 text-xl">{stat.icon}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <>
                <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">{stat.value}</p>
                {stat.sub && <span className="text-xs font-bold text-slate-400 ml-1">{stat.sub}</span>}
              </>
            </div>
          </div>
        ))}
      </div>

      {/* Main Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 gap-3">
          <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight">Товары на складе</h3>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleFullCatalogExport}
              className="text-[10px] font-black text-emerald-600 px-3 py-2 rounded-xl hover:bg-emerald-50 border border-emerald-200 transition-all flex items-center gap-2 group"
            >
              <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">database</span>
              ЭКСПОРТ ТОВАРОВ В ГНС
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[320px]">
          {filteredEntries.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white dark:bg-slate-900">
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Дата поступл.</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Поставщик</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Наименование товара</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 text-right">Остаток</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 text-right">Цена зак.</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 text-right">Сумма</th>
                  <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filteredEntries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer">
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-500 font-bold tabular-nums">{item.date}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">{item.supplier}</td>
                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300 min-w-[260px]">
                      <span className="truncate block max-w-sm font-medium" title={item.product}>{item.product}</span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 text-right tabular-nums font-bold">{item.quantity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 text-right tabular-nums font-bold">{item.price.toLocaleString()}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm font-black text-slate-900 dark:text-white text-right tabular-nums">
                      {(item.total).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right">
                      <div className="relative inline-flex" data-entry-menu>
                        <button
                          onClick={() => toggleEntryMenu(item.id)}
                          className="size-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Действия"
                        >
                          <span className="material-symbols-outlined">more_horiz</span>
                        </button>
                        {openEntryMenuId === item.id && (
                          <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden">
                            <button
                              onClick={() => handleDeleteEntry(item.id)}
                              className="w-full text-left px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800"
                            >
                              Удалить товар
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">search_off</span>
              <p className="text-slate-500 font-bold">
                {entries.length === 0 ? 'Товаров пока нет' : 'Ничего не найдено по вашему запросу'}
              </p>
            </div>
          )}
        </div>

        {/* Table Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-slate-500 font-bold">
            Всего на складе: <span className="text-slate-900 dark:text-white font-black">{entries.length}</span> позиций
          </p>
          <div className="flex items-center gap-2">
            <button className="size-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <button className="size-10 flex items-center justify-center rounded-xl bg-primary text-white font-black text-sm shadow-lg shadow-primary/20">1</button>
            <button className="size-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Catalog Modal */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined">library_add</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Пополнение справочника</h3>
              </div>
              <button onClick={() => setIsCatalogModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <p className="text-sm text-slate-500 font-medium">
                Выберите файлы для сравнения. Система применит Smart TNVED логику и создаст таблицу для импорта в справочник ГНС.
              </p>

              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">1. XML Счет поставщика</label>
                  <button 
                    onClick={() => supplierFileRef.current?.click()}
                    className={`flex items-center gap-3 w-full px-5 py-4 border-2 border-dashed rounded-2xl transition-all ${supplierXmlContent ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 hover:border-primary hover:bg-primary/5 text-slate-500'}`}
                  >
                    <span className="material-symbols-outlined">{supplierXmlContent ? 'check_circle' : 'upload_file'}</span>
                    <span className="font-bold">{supplierXmlContent ? 'Файл выбран' : 'Загрузить XML'}</span>
                    <input 
                      type="file" 
                      ref={supplierFileRef} 
                      className="hidden" 
                      accept=".xml" 
                      onChange={(e) => e.target.files?.[0] && handleFileRead(e.target.files[0], setSupplierXmlContent, 'supplierXml')}
                    />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">2. Ваш каталог (Excel/CSV/XML)</label>
                  <button 
                    onClick={() => catalogFileRef.current?.click()}
                    className={`flex items-center gap-3 w-full px-5 py-4 border-2 border-dashed rounded-2xl transition-all ${catalogCsvContent ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 hover:border-primary hover:bg-primary/5 text-slate-500'}`}
                  >
                    <span className="material-symbols-outlined">{catalogCsvContent ? 'check_circle' : 'table_view'}</span>
                    <span className="font-bold">{catalogCsvContent ? 'Файл выбран' : 'Загрузить таблицу'}</span>
                    <input 
                      type="file" 
                      ref={catalogFileRef} 
                      className="hidden" 
                      accept=".xls,.xlsx,.csv,.xml" 
                      onChange={(e) => e.target.files?.[0] && handleFileRead(e.target.files[0], setCatalogCsvContent, 'catalog')}
                    />
                  </button>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  onClick={handleCatalogImport}
                  disabled={!supplierXmlContent || !catalogCsvContent || isProcessing}
                  className="w-full bg-primary hover:bg-blue-700 text-white font-black py-5 rounded-3xl transition-all shadow-xl shadow-primary/25 active:scale-95 flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:grayscale"
                >
                  {isProcessing ? (
                    <div className="size-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Сформировать Excel для импорта</span>
                      <span className="material-symbols-outlined">auto_fix_high</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DataGridScreen;
