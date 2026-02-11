import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TaxEntry } from '../types';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { toast } from 'react-hot-toast';

interface AddProductsScreenProps {
  onDataLoaded: (entries: TaxEntry[]) => void;
}

const AddProductsScreen: React.FC<AddProductsScreenProps> = ({ onDataLoaded }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xmlInputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [progress, setProgress] = useState(0);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualProduct, setManualProduct] = useState('');
  const [manualQty, setManualQty] = useState('1');
  const [manualPrice, setManualPrice] = useState('');
  const [manualUnit, setManualUnit] = useState('шт');
  const [manualSupplier, setManualSupplier] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [previewEntries, setPreviewEntries] = useState<TaxEntry[] | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [confirmClosePreview, setConfirmClosePreview] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingType, setPendingType] = useState<'ai' | 'xml' | null>(null);
  const [showLongWaitMessage, setShowLongWaitMessage] = useState(false);

  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const openPreview = (entries: TaxEntry[]) => {
    const withRetail = entries.map((entry) => ({
      ...entry,
      retailPrice: entry.retailPrice ?? entry.price
    }));
    setPreviewEntries(withRetail);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewEntries(null);
  };

  useEffect(() => {
    if (!isPreviewOpen) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const handlePopState = () => {
      setConfirmClosePreview(true);
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isPreviewOpen, navigate]);

  const parseNumber = (value: string) => {
    const cleaned = value.replace(',', '.').replace(/\s/g, '');
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  };

  const applyMarkup = (percent: number) => {
    setPreviewEntries((prev) => {
      if (!prev) return prev;
      const factor = 1 + percent / 100;
      return prev.map((entry) => ({
        ...entry,
        retailPrice: Number((entry.price * factor).toFixed(2))
      }));
    });
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const startXmlImport = (file: File) => {
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setParseError('Файл слишком большой. Максимум 10 МБ.');
      toast.error('Файл слишком большой. Максимум 10 МБ.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => handleXmlImport((ev.target?.result as string) || '');
    reader.onerror = () => {
      setParseError('Не удалось прочитать XML файл.');
      toast.error('Не удалось прочитать XML файл.');
    };
    reader.readAsText(file);
  };

  const confirmPendingFile = () => {
    if (!pendingFile || !pendingType) return;
    if (pendingType === 'ai') {
      handleImportFile(pendingFile);
    } else {
      startXmlImport(pendingFile);
    }
    setPendingFile(null);
    setPendingType(null);
  };

  const cancelPendingFile = () => {
    setPendingFile(null);
    setPendingType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (xmlInputRef.current) xmlInputRef.current.value = '';
  };

  const handlePreviewChange = (id: string, field: keyof TaxEntry, value: string) => {
    setPreviewEntries((prev) => {
      if (!prev) return prev;
      return prev.map((entry) => {
        if (entry.id !== id) return entry;
        const next: TaxEntry = { ...entry };
        if (field === 'quantity') {
          next.quantity = parseNumber(value) || 0;
        } else if (field === 'price') {
          next.price = parseNumber(value) || 0;
        } else if (field === 'retailPrice') {
          next.retailPrice = parseNumber(value) || 0;
        } else if (field === 'product') {
          next.product = value;
        } else if (field === 'supplier') {
          next.supplier = value;
        } else if (field === 'date') {
          next.date = value;
        } else if (field === 'unit') {
          next.unit = value;
        }
        next.total = Number((next.quantity * next.price).toFixed(2));
        return next;
      });
    });
  };

  const handlePreviewDelete = (id: string) => {
    setPreviewEntries((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
  };

  const handlePreviewSave = () => {
    if (!previewEntries || previewEntries.length === 0) {
      setParseError('Нет товаров для сохранения.');
      toast.error('Нет товаров для сохранения');
      return;
    }
    onDataLoaded(previewEntries);
    closePreview();
    navigate('/data-grid');
    toast.success('Товары сохранены');
  };

  const previewRetailTotal = useMemo(() => {
    if (!previewEntries) return 0;
    return previewEntries.reduce((sum, entry) => {
      const price = entry.retailPrice ?? entry.price;
      return sum + price * entry.quantity;
    }, 0);
  }, [previewEntries]);

  const previewPurchaseTotal = useMemo(() => {
    if (!previewEntries) return 0;
    return previewEntries.reduce((sum, entry) => sum + entry.price * entry.quantity, 0);
  }, [previewEntries]);

  const previewMarkupTotal = useMemo(
    () => previewRetailTotal - previewPurchaseTotal,
    [previewRetailTotal, previewPurchaseTotal]
  );

  const readAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsText(file);
    });

  const readAsArrayBuffer = (file: File) =>
    new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsArrayBuffer(file);
    });

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsDataURL(file);
    });

  const renderPdfToImageDataUrls = async (file: File) => {
    const data = new Uint8Array(await readAsArrayBuffer(file));
    const pdf = await getDocument({ data }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
      pages.push(canvas.toDataURL('image/jpeg', 0.95));
    }
    return pages;
  };

  const convertPdfViaServer = async (file: File) => {
    const serverUrl =
      import.meta.env.VITE_PDF_PARSE_URL || 'http://localhost:5055/pdf-to-images';
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(serverUrl, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Ошибка сервера PDF');
    }
    const data = await response.json();
    if (!Array.isArray(data.images) || data.images.length === 0) {
      throw new Error('Сервер не вернул страницы PDF');
    }
    return data.images as string[];
  };

  const parseWithAI = async (payload: {
    text?: string;
    imageDataUrls?: string[];
    fileName: string;
  }): Promise<TaxEntry[]> => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_OPENAI_API_KEY не задан');
    }

    const prompt = [
      'Ты ассистент по распознаванию документов для учета товаров.',
      'Верни только JSON массив объектов без лишнего текста.',
      'Поля объекта: row, product, quantity, price, supplier, date (опционально).',
      'quantity и price должны быть числами.',
      'Цены не округляй. Сохраняй как в исходнике, минимум 2 знака после запятой.',
      'НЕ меняй написание названий товаров: сохраняй точный текст из документа (регистр, орфография).',
      'Кириллицу не заменяй на латиницу (например, "МЛ" не заменяй на "ML").',
      'Не придумывай слов и не исправляй опечатки. Возвращай строго то, что видишь.',
      'Extract text EXACTLY as shown. Do not autocorrect, do not guess symbols. If a character is unclear, mark it, but do not replace A with 4 or S with 5.',
      'Pay extreme attention to commas and dots in quantities and dimensions (e.g., 2,6 should not become 6). Capture all digits.',
      'Combine multi-line product descriptions into a single string carefully, ensuring no parts of the name are lost.',
      'Если один и тот же товар встречается несколько раз с разными ценами — НЕ объединяй их. Выдавай каждую строку отдельно.',
      'Строго следуй порядковому номеру (№) из документа. Верни row для КАЖДОЙ строки и не создавай дубликаты.',
      'Будь внимателен к единицам измерения. Если видишь "п/м", "кг" или "л" — записывай их как есть, не превращай всё в "шт".',
      'Никогда не ставь единицу измерения по умолчанию. Строго проверяй колонку Ед.изм для КАЖДОЙ строки. Если там "м", "кг" или "л" — пиши именно их.',
      'Если не уверен в коде ТН ВЭД — оставь пустым или "0". Не выдумывай.',
      `Имя файла: ${payload.fileName}`
    ].join('\n');

    const content: any[] = [{ type: 'input_text', text: prompt }];
    if (payload.text) {
      content.push({ type: 'input_text', text: payload.text.slice(0, 20000) });
    }
    if (payload.imageDataUrls && payload.imageDataUrls.length > 0) {
      payload.imageDataUrls.forEach((url) => {
        content.push({ type: 'input_image', image_url: url });
      });
    }

    const model = payload.imageDataUrls && payload.imageDataUrls.length > 0
      ? 'gpt-4o'
      : 'gpt-4o-mini';

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        input: [{ role: 'user', content }],
        temperature: 0
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Ошибка запроса к OpenAI');
    }

    const data = await response.json();
    const outputText =
      data?.output?.[0]?.content?.find((c: any) => c.type === 'output_text')?.text ||
      '';
    const cleaned = outputText
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    const jsonTextMatch = cleaned.match(/\[[\s\S]*\]/);
    const jsonText = jsonTextMatch ? jsonTextMatch[0] : cleaned;
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) {
      throw new Error('Ответ ИИ не является массивом');
    }

    const today = new Date().toLocaleDateString('ru-RU');
    const entries = parsed.map((item, idx) => {
      const quantity = Number(item.quantity ?? item.qty ?? 1) || 1;
      const price = Number(item.price ?? 0) || 0;
      const unit = item.unit || item.Unit || item['Ед.'] || undefined;
      return {
        id: `${Date.now()}-${idx}`,
        date: item.date || item.Date || today,
        supplier: item.supplier || item.Supplier || 'Импортированные данные',
        product: item.product || item.Product || item['Наименование'] || 'Товар',
        quantity,
        price,
        total: quantity * price,
        unit: unit ? String(unit) : undefined
      } as TaxEntry;
    });

    return entries;
  };

  const parseExcelSmart = async (file: File): Promise<TaxEntry[]> => {
    const baseUrl =
      import.meta.env.VITE_EXCEL_PARSE_URL?.replace(/\/excel-to-rows\/?$/, '') ||
      'http://localhost:5055';
    const url = `${baseUrl}/excel-smart-parse`;
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || response.statusText || 'Ошибка сервера');
    }
    const data = await response.json();
    if (!Array.isArray(data.entries) || data.entries.length === 0) {
      throw new Error('Не удалось распознать товары в файле');
    }
    return data.entries as TaxEntry[];
  };

  const handleImportFile = async (file: File) => {
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setParseError('Файл слишком большой. Максимум 10 МБ.');
      toast.error('Файл слишком большой. Максимум 10 МБ.');
      return;
    }
    setIsParsing(true);
    setShowLongWaitMessage(false);
    setParseError('');
    setProgress(10);
    const longWaitTimer = setTimeout(() => {
      setShowLongWaitMessage(true);
    }, 30000);
    try {
      const name = file.name.toLowerCase();
      let text: string | undefined;
      let imageDataUrls: string[] | undefined;

      if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
        setProgress(30);
        const nextEntries = await parseExcelSmart(file);
        setProgress(85);
        openPreview(nextEntries);
        return;
      }

      if (name.endsWith('.pdf')) {
        try {
          imageDataUrls = await convertPdfViaServer(file);
        } catch (error) {
          console.warn('PDF server failed, fallback to client render', error);
          imageDataUrls = await renderPdfToImageDataUrls(file);
        }
        setProgress(30);
      } else if (file.type.startsWith('image/')) {
        imageDataUrls = [await readAsDataUrl(file)];
        setProgress(30);
      } else {
        text = await readAsText(file);
        setProgress(30);
      }

      setProgress(60);
      const nextEntries = await parseWithAI({
        text,
        imageDataUrls,
        fileName: file.name
      });
      setProgress(85);
      openPreview(nextEntries);
    } catch (error: any) {
      console.error(error);
      setParseError(error?.message || 'Ошибка распознавания. Проверьте файл или API ключ.');
      toast.error(error?.message || 'Ошибка распознавания');
    } finally {
      clearTimeout(longWaitTimer);
      setIsParsing(false);
      setShowLongWaitMessage(false);
    }
  };

  const handleXmlImport = (xmlString: string) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      setParseError('XML содержит ошибки. Проверьте формат файла.');
      toast.error('XML содержит ошибки');
      return;
    }

    const entries: TaxEntry[] = [];
    const receipts = xmlDoc.getElementsByTagName('receipt');

    if (receipts.length > 0) {
      let globalId = 1;
      for (let i = 0; i < receipts.length; i++) {
        const receipt = receipts[i];
        const supplier =
          receipt.getElementsByTagName('contractorName')[0]?.textContent ||
          'Неизвестный поставщик';
        const rawDate = receipt.getElementsByTagName('createdDate')[0]?.textContent || '';
        let formattedDate = rawDate;
        if (rawDate && rawDate.includes('-')) {
          const [y, m, d] = rawDate.split('-');
          formattedDate = `${d}.${m}.${y}`;
        }
        const goods = receipt.getElementsByTagName('good');
        for (let j = 0; j < goods.length; j++) {
          const good = goods[j];
          const productName =
            good.getElementsByTagName('goodsName')[0]?.textContent || 'Без названия';
          const quantity = parseFloat(
            good.getElementsByTagName('baseCount')[0]?.textContent || '0'
          );
          const price = parseFloat(
            good.getElementsByTagName('price')[0]?.textContent || '0'
          );
          const total = quantity * price;
          entries.push({
            id: globalId.toString(),
            date: formattedDate,
            supplier,
            product: productName,
            quantity,
            price,
            total
          });
          globalId++;
        }
      }
    } else {
      const goods = xmlDoc.getElementsByTagName('good');
      if (goods.length > 0) {
        for (let i = 0; i < goods.length; i++) {
          const good = goods[i];
          entries.push({
            id: (i + 1).toString(),
            date: new Date().toLocaleDateString('ru-RU'),
            supplier: 'Импортированные данные',
            product: good.getElementsByTagName('goodsName')[0]?.textContent || 'Товар',
            quantity: parseFloat(
              good.getElementsByTagName('baseCount')[0]?.textContent || '0'
            ),
            price: parseFloat(good.getElementsByTagName('price')[0]?.textContent || '0'),
            total: 0
          });
        }
      }
    }

    if (entries.length > 0) {
      openPreview(entries);
      toast.success('XML распознан');
    } else {
      setParseError('Не удалось распознать структуру XML. Проверьте формат файла.');
      toast.error('Не удалось распознать XML');
    }
  };

  const handleManualSubmit = () => {
    if (!manualProduct.trim()) {
      setParseError('Укажите наименование товара.');
      toast.error('Укажите наименование товара');
      return;
    }
    const quantity = Number(manualQty.replace(',', '.')) || 1;
    const price = Number(manualPrice.replace(',', '.')) || 0;
    const today = new Date().toLocaleDateString('ru-RU');
    const entry: TaxEntry = {
      id: `${Date.now()}`,
      date: manualDate || today,
      supplier: manualSupplier || 'Импортированные данные',
      product: manualProduct.trim(),
      quantity,
      price,
      total: quantity * price,
      unit: manualUnit || 'шт'
    };
    openPreview([entry]);
    toast.success('Товар добавлен');
  };

  return (
    <div className="max-w-[1100px] mx-auto py-6 px-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Добавление товаров
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Выберите способ импорта
          </p>
        </div>
        <button
          onClick={() => navigate('/data-grid')}
          className="text-sm font-bold text-slate-500 hover:text-slate-700"
        >
          Назад
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.xls,.xlsx,.csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setPendingFile(file);
            setPendingType('ai');
          }
        }}
      />
      <input
        type="file"
        ref={xmlInputRef}
        className="hidden"
        accept=".xml"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setPendingFile(file);
          setPendingType('xml');
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-left hover:shadow-lg transition-all"
        >
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <span className="material-symbols-outlined">upload_file</span>
          </div>
          <div className="font-black text-slate-900 dark:text-white">
            Импорт из PDF, Excel
          </div>
          <p className="text-xs text-slate-500 mt-2">
            PDF, XLS, XLSX, CSV
          </p>
        </button>

        <button
          onClick={() => xmlInputRef.current?.click()}
          className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-left hover:shadow-lg transition-all"
        >
          <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined">description</span>
          </div>
          <div className="font-black text-slate-900 dark:text-white">
            Импорт с XML ГНС
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Парсер по фиксированной структуре
          </p>
        </button>

        <button
          onClick={() => setShowManualForm((v) => !v)}
          className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-left hover:shadow-lg transition-all"
        >
          <div className="size-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined">edit</span>
          </div>
          <div className="font-black text-slate-900 dark:text-white">
            Добавить вручную
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Быстрое создание одной позиции
          </p>
        </button>
      </div>

      {showManualForm && (
        <div className="mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              value={manualProduct}
              onChange={(e) => setManualProduct(e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              placeholder="Наименование товара"
            />
            <input
              value={manualQty}
              onChange={(e) => setManualQty(e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              placeholder="Количество"
            />
            <input
              value={manualPrice}
              onChange={(e) => setManualPrice(e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              placeholder="Цена"
            />
            <input
              value={manualUnit}
              onChange={(e) => setManualUnit(e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              placeholder="Ед. изм (шт, кг, л)"
            />
            <input
              value={manualSupplier}
              onChange={(e) => setManualSupplier(e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              placeholder="Поставщик (необязательно)"
            />
            <input
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              placeholder="Дата (ДД.ММ.ГГГГ)"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleManualSubmit}
              className="bg-primary hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg"
            >
              Добавить
            </button>
          </div>
        </div>
      )}

      {pendingFile && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Подтверждение файла
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  Проверьте файл перед загрузкой
                </p>
              </div>
              <button
                onClick={cancelPendingFile}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                title="Закрыть"
              >
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>

            <div className="p-6 space-y-2">
              <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {pendingFile.name}
              </div>
              <div className="text-xs text-slate-500 font-bold">
                Размер: {formatBytes(pendingFile.size)}
              </div>
              <div className="text-xs text-slate-400">
                {pendingType === 'xml'
                  ? 'Будет использован XML‑парсер ГНС.'
                  : 'Будет выполнено распознавание через ИИ.'}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={cancelPendingFile}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold"
              >
                Отмена
              </button>
              <button
                onClick={confirmPendingFile}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-black shadow-lg"
              >
                Загрузить
              </button>
            </div>
          </div>
        </div>
      )}

      {isPreviewOpen && previewEntries && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[92rem] rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Предпросмотр товаров
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  Проверьте данные, при необходимости измените или удалите
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Наценка к закупочной
                </span>
                {[10, 20, 30, 40].map((percent) => (
                  <button
                    key={percent}
                    onClick={() => applyMarkup(percent)}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    +{percent}%
                  </button>
                ))}
              </div>
              <button
                onClick={() => setConfirmClosePreview(true)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                title="Закрыть"
              >
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>

            <div className="overflow-x-hidden max-h-[70vh]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-2.5 px-3 w-[120px]">Дата</th>
                    <th className="py-2.5 px-3 w-[200px]">Поставщик</th>
                    <th className="py-2.5 px-3 w-[420px]">Наименование</th>
                    <th className="py-2.5 px-3 w-[90px] text-right">Кол-во</th>
                    <th className="py-2.5 px-3 w-[120px] text-right">Цена закупки</th>
                    <th className="py-2.5 px-3 w-[130px] text-right">Цена продажи</th>
                    <th className="py-2.5 px-3 w-[150px] text-right">Сумма закупки</th>
                    <th className="py-2.5 px-3 w-[70px] text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {previewEntries.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/30">
                      <td className="py-2 px-4">
                        <input
                          value={item.date}
                          onChange={(e) => handlePreviewChange(item.id, 'date', e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          value={item.supplier}
                          onChange={(e) => handlePreviewChange(item.id, 'supplier', e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex items-start gap-3">
                          <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                            <span className="material-symbols-outlined text-base">inventory_2</span>
                          </div>
                          <input
                            value={item.product}
                            onChange={(e) => handlePreviewChange(item.id, 'product', e.target.value)}
                            className="w-full px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-4 text-right">
                        <input
                          value={String(item.quantity ?? '')}
                          onChange={(e) => handlePreviewChange(item.id, 'quantity', e.target.value)}
                          className="w-full text-right px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                        />
                      </td>
                      <td className="py-2 px-4 text-right">
                        <input
                          value={String(item.price ?? '')}
                          onChange={(e) => handlePreviewChange(item.id, 'price', e.target.value)}
                          className="w-full text-right px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                        />
                      </td>
                      <td className="py-2 px-4 text-right">
                        <input
                          value={String(item.retailPrice ?? '')}
                          onChange={(e) =>
                            handlePreviewChange(item.id, 'retailPrice', e.target.value)
                          }
                          className="w-full text-right px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                        />
                      </td>
                      <td className="py-2 px-4 text-right text-sm font-black text-slate-900 dark:text-white">
                        {(Number(item.price) * item.quantity).toLocaleString()}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <button
                          onClick={() => handlePreviewDelete(item.id)}
                          className="text-rose-600 hover:text-rose-700"
                          title="Удалить"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40">
                    <td colSpan={6} className="py-4 px-4 text-right text-xs font-black uppercase tracking-widest text-slate-400">
                      Общая сумма партии
                    </td>
                    <td className="py-4 px-4 text-right text-lg font-black text-primary">
                      {previewRetailTotal.toLocaleString()}
                    </td>
                    <td colSpan={1} />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500 font-bold">
                Всего: {previewEntries.length}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-xs text-slate-500 font-bold">
                  Закупка: <span className="text-slate-900 dark:text-white">{previewPurchaseTotal.toLocaleString()}</span>
                </div>
                <div className="text-xs text-slate-500 font-bold">
                  Наценка: <span className="text-emerald-600">{previewMarkupTotal.toLocaleString()}</span>
                </div>
                <div className="text-xs text-slate-500 font-bold">
                  Выручка: <span className="text-primary">{previewRetailTotal.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmClosePreview(true)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold"
              >
                  Отмена
                </button>
                <button
                  onClick={handlePreviewSave}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-black shadow-lg"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmClosePreview && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Закрыть предпросмотр?</h3>
              <p className="text-xs text-slate-500 font-bold mt-1">
                Прогресс будет потерян. Вы уверены?
              </p>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmClosePreview(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  setConfirmClosePreview(false);
                  closePreview();
                }}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-black shadow-lg"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {isParsing && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Идет распознавание
              </h3>
              <p className="text-xs text-slate-500 font-bold">
                Пожалуйста, подождите. Мы обрабатываем документ.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Парсинг файла...
                </div>
              </div>
              {showLongWaitMessage && (
                <div className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2">
                  Осталось немного, подождите пожалуйста
                </div>
              )}
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 font-bold">
                Прогресс: {Math.min(progress, 100)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {parseError && (
        <div className="mt-4 text-sm text-rose-600 font-bold">{parseError}</div>
      )}
      {isParsing && (
        <div className="mt-4">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 mt-1 font-bold">
            Обработка: {Math.min(progress, 100)}%
          </div>
        </div>
      )}
    </div>
  );
};

export default AddProductsScreen;
