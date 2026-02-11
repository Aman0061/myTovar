
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TaxEntry } from '../types';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';

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
  const [showArchived, setShowArchived] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TaxEntry | null>(null);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    action: (() => void) | null;
  } | null>(null);
  const [tnvedMap, setTnvedMap] = useState<Map<string, string>>(new Map());
  const [tnvedCount, setTnvedCount] = useState(0);
  const [tnvedIndex, setTnvedIndex] = useState<Array<{ key: string; code: string; tokens: string[] }>>([]);
  const [tnvedOverrides, setTnvedOverrides] = useState<Map<string, string>>(new Map());
  const [tnvedKeywordOverrides, setTnvedKeywordOverrides] = useState<Map<string, string>>(new Map());
  const [tnvedEmbeddings, setTnvedEmbeddings] = useState<
    Array<{ key: string; code: string; embedding: number[] }>
  >([]);
  const [tnvedEmbeddingsReady, setTnvedEmbeddingsReady] = useState(false);
  const [editDraft, setEditDraft] = useState({
    date: '',
    supplier: '',
    product: '',
    quantity: '',
    price: '',
    unit: ''
  });

  const supplierFileRef = useRef<HTMLInputElement>(null);
  const catalogFileRef = useRef<HTMLInputElement>(null);
  const tnvedFileRef = useRef<HTMLInputElement>(null);
  const tnvedCacheLoadingRef = useRef(false);
  const navigate = useNavigate();
  const TNVED_STORAGE_KEY = 'taxflow_tnved_map';
  const TNVED_OVERRIDES_KEY = 'taxflow_tnved_overrides';
  const TNVED_KEYWORD_OVERRIDES_KEY = 'taxflow_tnved_keyword_overrides';
  const TNVED_EMBEDDINGS_DB = 'taxflow_db';
  const TNVED_EMBEDDINGS_STORE = 'tnved_embeddings';
  const TNVED_EMBEDDINGS_KEY = 'v1';
  const hasSupabaseCatalog = Boolean(supabase);

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TNVED_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>;
        const map = new Map(Object.entries(parsed));
        setTnvedMap(map);
        setTnvedCount(map.size);
        setTnvedIndex(
          Array.from(map.entries()).map(([key, code]) => ({
            key,
            code,
            tokens: key.split(' ').filter(Boolean)
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load TNVED map', error);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TNVED_OVERRIDES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>;
        setTnvedOverrides(new Map(Object.entries(parsed)));
      }
    } catch (error) {
      console.error('Failed to load TNVED overrides', error);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    if (tnvedCacheLoadingRef.current) return;
    tnvedCacheLoadingRef.current = true;
    (async () => {
      try {
        const { data, error } = await supabase.from('tnved_cache').select('product_name, code');
        if (error) throw error;
        if (data && data.length > 0) {
          const map = new Map(tnvedOverrides);
          data.forEach((row: any) => {
            const key = normalizeProductName(row.product_name || '');
            if (key && row.code) map.set(key, row.code);
          });
          setTnvedOverrides(map);
        }
      } catch (error) {
        console.error('Failed to load tnved_cache', error);
      } finally {
        tnvedCacheLoadingRef.current = false;
      }
    })();
  }, []);

  const openTnvedDb = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(TNVED_EMBEDDINGS_DB, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(TNVED_EMBEDDINGS_STORE)) {
          db.createObjectStore(TNVED_EMBEDDINGS_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

  const idbGet = async (key: string) => {
    const db = await openTnvedDb();
    return new Promise<any>((resolve, reject) => {
      const tx = db.transaction(TNVED_EMBEDDINGS_STORE, 'readonly');
      const store = tx.objectStore(TNVED_EMBEDDINGS_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  };

  const idbSet = async (key: string, value: any) => {
    const db = await openTnvedDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(TNVED_EMBEDDINGS_STORE, 'readwrite');
      const store = tx.objectStore(TNVED_EMBEDDINGS_STORE);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await idbGet(TNVED_EMBEDDINGS_KEY);
        if (data && isMounted) {
          setTnvedEmbeddings(data);
          setTnvedEmbeddingsReady(true);
        }
      } catch (error) {
        console.error('Failed to load TNVED embeddings', error);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TNVED_KEYWORD_OVERRIDES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>;
        setTnvedKeywordOverrides(new Map(Object.entries(parsed)));
      }
    } catch (error) {
      console.error('Failed to load TNVED keyword overrides', error);
    }
  }, []);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (!showArchived && e.archived) return false;
      if (showArchived && !e.archived) return false;
      return (
      e.product.toLowerCase().includes(search.toLowerCase()) || 
      e.supplier.toLowerCase().includes(search.toLowerCase())
    );
    });
  }, [entries, search, showArchived]);

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
    setConfirmState({
      title: 'Удалить товар',
      message: 'Товар будет удален без возможности восстановления.',
      action: () => {
        const next = entries.filter((entry) => entry.id !== id);
        if (onEntriesUpdated) {
          onEntriesUpdated(next);
        } else {
          onDataLoaded(next);
        }
        toast.success('Товар удален');
      }
    });
  };

  const handleArchiveEntry = (id: string, archived: boolean) => {
    setOpenEntryMenuId(null);
    setConfirmState({
      title: archived ? 'Архивировать товар' : 'Вернуть из архива',
      message: archived
        ? 'Товар будет перемещен в архив. Продажи будут недоступны.'
        : 'Товар будет возвращен в активные.',
      action: () => {
        const next = entries.map((entry) =>
          entry.id === id ? { ...entry, archived } : entry
        );
        if (onEntriesUpdated) {
          onEntriesUpdated(next);
        } else {
          onDataLoaded(next);
        }
        toast.success(archived ? 'Товар архивирован' : 'Товар восстановлен');
      }
    });
  };

  const handleEditEntry = (entry: TaxEntry) => {
    setOpenEntryMenuId(null);
    setEditingEntry(entry);
    setEditDraft({
      date: entry.date || '',
      supplier: entry.supplier || '',
      product: entry.product || '',
      quantity: String(entry.quantity ?? ''),
      price: String(entry.price ?? ''),
      unit: entry.unit || ''
    });
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;
    const quantity = Number(editDraft.quantity.replace(',', '.')) || 0;
    const price = Number(editDraft.price.replace(',', '.')) || 0;
    const next = entries.map((entry) =>
      entry.id === editingEntry.id
        ? {
            ...entry,
            date: editDraft.date || entry.date,
            supplier: editDraft.supplier,
            product: editDraft.product,
            quantity,
            price,
            total: Number((quantity * price).toFixed(2)),
            unit: editDraft.unit || undefined
          }
        : entry
    );
    if (onEntriesUpdated) {
      onEntriesUpdated(next);
    } else {
      onDataLoaded(next);
    }
    setEditingEntry(null);
    toast.success('Товар обновлен');
  };

  const getSmartTnved = (name: string, industry: keyof typeof industryConfigs) => {
    const n = name.toLowerCase();
    if (industry === 'construction') {
      if (/(саморез|болт|шуруп|анкер|дюбел|гайк)/i.test(n)) {
        return industryConfigs.construction.fallbackAlt;
      }
    }
    return industryConfigs[industry].fallback;
  };

  const normalizeTnvedKey = (value: string) =>
    value
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/\s+/g, ' ')
      .replace(/[^\p{L}\p{N}\s.-]/gu, '')
      .trim();

  const normalizeProductName = (value: string) => {
    let text = normalizeTnvedKey(value);
    const replacements: Array<[RegExp, string]> = [
      [/\bлестн\.?/g, 'лестница алюминиевая'],
      [/\bстрем\.?/g, 'стремянка металлическая'],
      [/\bкраскоп\.?/g, 'краскопульт'],
      [/\bопрыск\.?/g, 'опрыскиватель']
    ];
    replacements.forEach(([pattern, replacement]) => {
      text = text.replace(pattern, replacement);
    });
    return text;
  };

  const getEmbedding = async (text: string): Promise<number[] | null> => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) return null;
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.data?.[0]?.embedding || null;
  };

  const cosineSimilarity = (a: number[], b: number[]) => {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i += 1) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (!normA || !normB) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  };

  const keywordRules: Array<{ keyword: string; code: string; includeTokens: string[] }> = [
    { keyword: 'стремянк', code: '7616999008', includeTokens: ['лестниц', 'стремянк'] },
    { keyword: 'лестниц', code: '7616999008', includeTokens: ['лестниц', 'стремянк'] },
    { keyword: 'краскопульт', code: '8424200000', includeTokens: ['краскопульт', 'опрыск'] },
    { keyword: 'опрыск', code: '8424200000', includeTokens: ['краскопульт', 'опрыск'] },
    { keyword: 'щетк', code: '9603400000', includeTokens: ['щетк', 'кисть'] },
    { keyword: 'кисть', code: '9603400000', includeTokens: ['щетк', 'кисть'] },
    { keyword: 'клей', code: '3506100000', includeTokens: ['клей', 'клеев'] },
    { keyword: 'герметик', code: '3214100000', includeTokens: ['герметик'] },
    { keyword: 'пена', code: '3214100000', includeTokens: ['пена'] },
    { keyword: 'шланг', code: '3917390000', includeTokens: ['шланг', 'труб'] }
  ];

  const categoryFilters: Array<{ keywords: string[]; codePrefixes: string[]; description: string }> = [
    { keywords: ['футболк', 'брюк', 'джинс', 'куртк', 'пальто', 'рубашк', 'плать', 'юбк', 'толстовк', 'свитер', 'обув', 'кроссовк'], codePrefixes: ['61', '62', '64'], description: 'одежда и обувь' },
    { keywords: ['молоко', 'сыр', 'хлеб', 'масло', 'сахар', 'мука', 'чай', 'кофе', 'сок', 'конфет', 'печень', 'круп', 'макарон', 'колбас', 'мяс', 'рыб', 'овощ', 'фрукт'], codePrefixes: ['02', '03', '04', '07', '08', '10', '11', '15', '16', '17', '19', '20', '21'], description: 'продукты питания' },
    { keywords: ['телефон', 'смартфон', 'планшет', 'ноутбук', 'компьютер', 'монитор', 'принтер', 'роутер', 'наушник', 'колонк', 'телевизор'], codePrefixes: ['84', '85'], description: 'электроника и техника' },
    { keywords: ['стиральн', 'холодильник', 'микроволн', 'пылесос', 'чайник', 'утюг', 'кондиционер'], codePrefixes: ['84', '85'], description: 'бытовая техника' },
    { keywords: ['мыло', 'шампун', 'порошок', 'моющ', 'чистящ', 'гель', 'отбеливател', 'дезинфиц'], codePrefixes: ['34'], description: 'бытовая химия' },
    { keywords: ['канцел', 'бумаг', 'тетрад', 'карандаш', 'ручк', 'маркер', 'степлер', 'скрепк'], codePrefixes: ['48', '82', '96'], description: 'канцтовары' },
    { keywords: ['мебел', 'стол', 'стул', 'шкаф', 'диван', 'кресло', 'кровать'], codePrefixes: ['94'], description: 'мебель' },
    { keywords: ['игрушк', 'кук', 'мяч', 'конструктор'], codePrefixes: ['95'], description: 'игрушки' },
    { keywords: ['космет', 'крем', 'лосьон', 'духи', 'парфюм'], codePrefixes: ['33'], description: 'косметика и парфюмерия' },
    { keywords: ['саморез', 'болт', 'шуруп', 'анкер', 'дюбел'], codePrefixes: ['7318'], description: 'метизы' },
    { keywords: ['лестниц', 'стремянк'], codePrefixes: ['7616', '7326'], description: 'лестницы/стремянки' },
    { keywords: ['шланг'], codePrefixes: ['3917'], description: 'шланги' },
    { keywords: ['валик', 'кисть', 'щетк'], codePrefixes: ['9603'], description: 'инструменты для покраски' },
    { keywords: ['краскопульт', 'опрыск'], codePrefixes: ['8424'], description: 'опрыскиватели' },
    { keywords: ['инструмент', 'ключ'], codePrefixes: ['8204', '8205'], description: 'инструменты ручные' },
    { keywords: ['уголок', 'профиль', 'труба', 'труб'], codePrefixes: ['7216', '7306'], description: 'прокат/трубы' },
    { keywords: ['рулетк', 'уровен', 'линейк', 'штангенциркул'], codePrefixes: ['9017'], description: 'измерительные инструменты' },
    { keywords: ['отвертк', 'молоток', 'плоскогуб', 'степлер'], codePrefixes: ['8205'], description: 'ручные инструменты' },
    { keywords: ['ламп', 'светильник'], codePrefixes: ['9405'], description: 'осветительные приборы' },
    { keywords: ['выключател', 'розетк', 'автомат', 'узо'], codePrefixes: ['8536'], description: 'электроаппаратура' },
    { keywords: ['кабель', 'провод'], codePrefixes: ['8544'], description: 'кабели и провода' },
    { keywords: ['электролобзик', 'перфоратор', 'шуруповерт'], codePrefixes: ['8467'], description: 'электроинструмент' },
    { keywords: ['растворител', 'вд-40', 'обезжиривател'], codePrefixes: ['3814'], description: 'растворители' },
    { keywords: ['литол', 'смазк', 'солидол'], codePrefixes: ['2710'], description: 'смазочные материалы' },
    { keywords: ['электрод'], codePrefixes: ['8545'], description: 'электроды' }
  ];

  const industryConfigs = {
    construction: {
      label: 'Стройка (ГКЭД 41/42/43)',
      fallback: '3214101009',
      fallbackAlt: '7318150000'
    }
  } as const;

  const extractKeywords = (key: string) => {
    const hits: Array<{ keyword: string; includeTokens: string[] }> = [];
    keywordRules.forEach((rule) => {
      if (key.includes(rule.keyword)) {
        hits.push({ keyword: rule.keyword, includeTokens: rule.includeTokens });
      }
    });
    return hits;
  };

  const tokenize = (value: string) =>
    value
      .split(' ')
      .map((t) => t.trim())
      .filter((t) => t.length > 2);

  const getCategoryFilter = (key: string) => {
    const rule = categoryFilters.find((r) => r.keywords.some((k) => key.includes(k)));
    if (!rule) return null;
    if (rule.codePrefixes.length > 1) {
      if (key.includes('алюмин')) return { ...rule, codePrefixes: ['7616'] };
      if (key.includes('сталь') || key.includes('стальной')) return { ...rule, codePrefixes: ['7326'] };
    }
    return rule;
  };

  const getCandidateList = (name: string, limit = 30) => {
    if (tnvedIndex.length === 0) return [];
    const key = normalizeProductName(name);
    const category = getCategoryFilter(key);
    const keywordHits = extractKeywords(key);
    const includeTokens = keywordHits.flatMap((h) => h.includeTokens);
    const tokens = tokenize(key);
    const scored = tnvedIndex.map((row) => {
      if (category && !category.codePrefixes.some((prefix) => row.code.startsWith(prefix))) {
        return { ...row, score: 0 };
      }
      if (includeTokens.length > 0) {
        const hasInclude = includeTokens.some((t) => row.key.includes(t));
        if (!hasInclude) {
          return { ...row, score: 0 };
        }
      }
      const common = tokens.filter((t) =>
        row.tokens.some((c) => c.startsWith(t) || t.startsWith(c))
      ).length;
      const score = common / Math.max(tokens.length, row.tokens.length || 1);
      return { ...row, score };
    });
    return scored
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  };

  const fetchTnvedCandidatesFromDb = async (
    name: string,
    limit = 100
  ): Promise<Array<{ key: string; code: string; score: number }>> => {
    if (!supabase) return [];
    const query = normalizeProductName(name);
    const { data, error } = await supabase.rpc('tnved_match', {
      p_query: query,
      p_limit_count: limit
    });
    if (error || !data) return [];
    return (data as any[]).map((row) => ({
      key: String(row.name || ''),
      code: String(row.code || ''),
      score: Number(row.similarity ?? 0)
    }));
  };

  const resolveTnvedCode = async (
    name: string
  ): Promise<{ code: string; status: 'auto' | 'review' | 'error'; options: string[]; score: number }> => {
    const key = normalizeProductName(name);
    const keywordHit = extractKeywords(key).find((h) => tnvedKeywordOverrides.get(h.keyword));
    if (keywordHit) {
      const cached = tnvedKeywordOverrides.get(keywordHit.keyword);
      if (cached) {
        return { code: cached, status: 'auto', options: [], score: 1 };
      }
    }
    const override = tnvedOverrides.get(key);
    if (override) {
      return { code: override, status: 'auto', options: [], score: 1 };
    }
    const rule = keywordRules.find((r) => key.includes(r.keyword));
    if (rule) {
      return { code: rule.code, status: 'auto', options: [], score: 1 };
    }
    const direct = tnvedMap.get(key);
    if (direct) {
      return { code: direct, status: 'auto', options: [], score: 1 };
    }

    const scoredCandidates = await fetchTnvedCandidatesFromDb(name, 100);
    const category = getCategoryFilter(key);
    const filteredCandidates = category
      ? scoredCandidates.filter((c) =>
          category.codePrefixes.some((prefix) => c.code.startsWith(prefix))
        )
      : scoredCandidates;
    const topCandidates = filteredCandidates.sort((a, b) => b.score - a.score).slice(0, 20);
    const bestCandidate = topCandidates[0];

    if (bestCandidate) {
      if (bestCandidate.score >= 0.85) {
        const next = new Map(tnvedOverrides);
        next.set(key, bestCandidate.code);
        setTnvedOverrides(next);
        localStorage.setItem(TNVED_OVERRIDES_KEY, JSON.stringify(Object.fromEntries(next)));
        if (supabase) {
          supabase.from('tnved_cache').insert({ product_name: key, code: bestCandidate.code });
        }
        return { code: bestCandidate.code, status: 'auto', options: [], score: bestCandidate.score };
      }
      if (bestCandidate.score >= 0.5) {
        const options = topCandidates.slice(0, 3).map((c) => `${c.code} — ${c.key}`);
        return {
          code: bestCandidate.code,
          status: 'review',
          options,
          score: bestCandidate.score
        };
      }
    }

    return { code: '', status: 'error', options: [], score: 0 };
  };

  const handleTnvedFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
        reader.onerror = () => reject(new Error('Ошибка чтения файла'));
        reader.readAsArrayBuffer(file);
      });
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        toast.error('Не удалось прочитать лист справочника');
        return;
      }
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        raw: false
      }) as any[][];

      const headerRowIndex = rows.findIndex((row) =>
        row.some((cell) => {
          const v = String(cell).toLowerCase();
          return v.includes('тнвэд') || v.includes('тн вэд') || v.includes('наименование');
        })
      );
      const headerIndex = headerRowIndex >= 0 ? headerRowIndex : 0;
      const headers = rows[headerIndex].map((cell) => normalizeTnvedKey(String(cell)));
      const compactHeaders = headers.map((h) => h.replace(/\s/g, ''));
      let nameIdx = compactHeaders.findIndex((h) =>
        ['наименование', 'наименованиетовара', 'товар', 'описание', 'product', 'name'].some((k) =>
          h.includes(k)
        )
      );
      let codeIdx = compactHeaders.findIndex((h) =>
        ['тнвэд', 'тнвед', 'кодтнвэд', 'кодтнвед', 'tnved', 'код'].some((k) =>
          h.includes(k)
        )
      );

      if (nameIdx === -1 || codeIdx === -1) {
        const sampleRows = rows.slice(headerIndex + 1, headerIndex + 201);
        const colCount = headers.length;
        const codeScores = new Array(colCount).fill(0);
        const nameScores = new Array(colCount).fill(0);
        sampleRows.forEach((row) => {
          for (let c = 0; c < colCount; c += 1) {
            const value = String(row[c] ?? '').trim();
            if (!value) continue;
            const digits = value.replace(/\D/g, '');
            if (digits.length >= 8 && digits.length <= 12) {
              codeScores[c] += 1;
            }
            if (/[А-ЯA-Z]/i.test(value) && value.length > 3) {
              nameScores[c] += 1;
            }
          }
        });
        if (codeIdx === -1) {
          codeIdx = codeScores.indexOf(Math.max(...codeScores));
        }
        if (nameIdx === -1) {
          nameIdx = nameScores.indexOf(Math.max(...nameScores));
        }
      }

      if (nameIdx === -1 || codeIdx === -1) {
        toast.error('Не удалось найти колонки Название / ТН ВЭД');
        return;
      }

      const map = new Map<string, string>();
      for (let i = headerIndex + 1; i < rows.length; i += 1) {
        const row = rows[i];
        const name = String(row[nameIdx] ?? '').trim();
        let code = String(row[codeIdx] ?? '').trim();
        code = code.replace(/\s/g, '');
        if (!name || !code) continue;
        map.set(normalizeTnvedKey(name), code);
      }

      setTnvedMap(map);
      setTnvedCount(map.size);
      setTnvedIndex(
        Array.from(map.entries()).map(([key, code]) => ({
          key,
          code,
          tokens: key.split(' ').filter(Boolean)
        }))
      );
      localStorage.setItem(TNVED_STORAGE_KEY, JSON.stringify(Object.fromEntries(map)));

      const toastId = toast.loading('Считаем эмбеддинги справочника...');
      const items = Array.from(map.entries());
      const embeddings: Array<{ key: string; code: string; embedding: number[] }> = [];
      const batchSize = 50;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const inputs = batch.map(([key]) => key);
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!apiKey) break;
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: inputs
          })
        });
        if (!response.ok) break;
        const data = await response.json();
        const vectors = data?.data || [];
        vectors.forEach((v: any, idx: number) => {
          const [key, code] = batch[idx];
          if (v?.embedding) embeddings.push({ key, code, embedding: v.embedding });
        });
      }
      if (embeddings.length > 0) {
        setTnvedEmbeddings(embeddings);
        setTnvedEmbeddingsReady(true);
        try {
          await idbSet(TNVED_EMBEDDINGS_KEY, embeddings);
        } catch (error) {
          console.error('Failed to save embeddings to IndexedDB', error);
          toast.error('Не удалось сохранить эмбеддинги (память браузера)');
        }
        toast.dismiss(toastId);
        toast.success(`Эмбеддинги готовы: ${embeddings.length}`);
      } else {
        toast.dismiss(toastId);
        toast.error('Не удалось получить эмбеддинги');
      }
      toast.success(`Справочник ТН ВЭД загружен: ${map.size}`);
    } catch (error) {
      console.error(error);
      toast.error('Ошибка загрузки справочника');
    } finally {
      event.target.value = '';
    }
  };

  const handleFullCatalogExport = async () => {
    if (entries.length === 0) {
      alert("На складе нет товаров для экспорта.");
      return;
    }
    if (!supabase && tnvedCount === 0) {
      toast.error('Справочник ТН ВЭД не найден — добавьте файл справочника.');
      return;
    }

    const toastId = toast.loading('Подбор кодов ТН ВЭД...');
    const normalizeUnit = (value?: string) => {
      const raw = String(value || '').trim();
      if (!raw) return 'шт';
      const lower = raw.toLowerCase();
      if (lower === 'шт.' || lower === 'шт') return 'шт';
      if (lower === 'п/м') return 'метр';
      return raw;
    };
    const excelData: Array<Record<string, any>> = [];
    let missingCodes = 0;
    let reviewCodes = 0;
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      const result = await resolveTnvedCode(entry.product);
      if (result.status === 'error') missingCodes += 1;
      if (result.status === 'review') reviewCodes += 1;
      excelData.push({
        "Наименование товара": entry.product,
        "Код единицы измерения": normalizeUnit(entry.unit),
        "Код ТН ВЭД": result.code,
        "Признак товара": "1",
        "Цена": entry.price || 0,
        "Статус ТН ВЭД": result.status === 'auto' ? 'ОК' : result.status === 'review' ? 'Нужна проверка' : 'Ошибка',
        "Варианты ТН ВЭД": result.options.join(' | ')
      });
      toast.loading(`Подбор кодов ТН ВЭД... ${i + 1}/${entries.length}`, { id: toastId });
    }
    toast.dismiss(toastId);
    if (missingCodes > 0) {
      toast.error(`Не нашли коды ТН ВЭД для ${missingCodes} позиций — нужен ручной выбор.`);
    }
    if (reviewCodes > 0) {
      toast(`Нужна проверка для ${reviewCodes} позиций`, { icon: '⚠️' });
    }

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths for better visibility
    worksheet['!cols'] = [
      { wch: 50 }, // Name
      { wch: 15 }, // Unit
      { wch: 20 }, // TNVED
      { wch: 15 }, // Flag
      { wch: 10 }, // Price
      { wch: 18 }, // Status
      { wch: 80 }  // Options
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

      const statusCell = XLSX.utils.encode_cell({ r: R, c: 5 });
      if (worksheet[statusCell]) worksheet[statusCell].t = 's';

      const optionsCell = XLSX.utils.encode_cell({ r: R, c: 6 });
      if (worksheet[optionsCell]) worksheet[optionsCell].t = 's';
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
        "Код ТН ВЭД": getSmartTnved(productName, 'construction'),
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
            {!hasSupabaseCatalog ? (
              <>
                <input
                  type="file"
                  ref={tnvedFileRef}
                  onChange={handleTnvedFileChange}
                  accept=".xls,.xlsx,.csv"
                  className="hidden"
                />
                <button
                  onClick={() => tnvedFileRef.current?.click()}
                  className="text-[10px] font-black text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-50 border border-slate-200 transition-all flex items-center gap-2"
                  title="Загрузить справочник ТН ВЭД"
                >
                  <span className="material-symbols-outlined text-lg">upload_file</span>
                  ТН ВЭД ({tnvedCount || 0})
                </button>
              </>
            ) : (
              <div
                className="text-[10px] font-black text-emerald-700 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center gap-2"
                title="Подбор кодов ТН ВЭД идет напрямую из базы"
              >
                <span className="material-symbols-outlined text-lg">cloud_done</span>
                ТН ВЭД из базы
              </div>
            )}
            <button
              onClick={() => setShowArchived((prev) => !prev)}
              className={`text-[10px] font-black px-3 py-2 rounded-xl border transition-all flex items-center gap-2 ${
                showArchived
                  ? 'text-amber-700 border-amber-200 bg-amber-50'
                  : 'text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-lg">archive</span>
              {showArchived ? 'Показать активные' : 'Показать архив'}
            </button>
            <button 
              onClick={() => navigate('/tnved-assign')}
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
                              onClick={() => handleEditEntry(item)}
                              className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-base">edit</span>
                              Редактировать
                            </button>
                            <button
                              onClick={() => handleArchiveEntry(item.id, !item.archived)}
                              className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-base">archive</span>
                              {item.archived ? 'Вернуть из архива' : 'Архивировать'}
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(item.id)}
                              className="w-full text-left px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
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

      {editingEntry && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Редактировать товар</h3>
                <p className="text-xs text-slate-500 font-bold">Обновите поля и сохраните изменения</p>
        </div>
              <button
                onClick={() => setEditingEntry(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
        </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Дата</label>
                  <input
                    value={editDraft.date}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Поставщик</label>
                  <input
                    value={editDraft.supplier}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, supplier: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Наименование</label>
                <input
                  value={editDraft.product}
                  onChange={(e) => setEditDraft((prev) => ({ ...prev, product: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Кол-во</label>
                  <input
                    value={editDraft.quantity}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, quantity: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Цена закупки</label>
                  <input
                    value={editDraft.price}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, price: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Ед.</label>
                  <input
                    value={editDraft.unit}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-black shadow-lg"
              >
                Сохранить
        </button>
      </div>
          </div>
        </div>
      )}

      {confirmState && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{confirmState.title}</h3>
              <p className="text-xs text-slate-500 font-bold mt-1">{confirmState.message}</p>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmState(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  const action = confirmState.action;
                  setConfirmState(null);
                  action?.();
                }}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-black shadow-lg"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DataGridScreen;
