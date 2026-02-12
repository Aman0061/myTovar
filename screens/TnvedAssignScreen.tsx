import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { TaxEntry } from '../types';
import { supabase } from '../lib/supabaseClient';

type Suggestion = { name: string; code: string; score?: number };

interface TnvedAssignScreenProps {
  entries: TaxEntry[];
}

const TnvedAssignScreen: React.FC<TnvedAssignScreenProps> = ({ entries }) => {
  const navigate = useNavigate();
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [searchById, setSearchById] = useState<Record<string, string>>({});
  const [codeById, setCodeById] = useState<Record<string, string>>({});
  const [nameById, setNameById] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [activity, setActivity] = useState('');
  const [aiSuggestedIds, setAiSuggestedIds] = useState<Set<string>>(new Set());
  const [sourceById, setSourceById] = useState<Record<string, 'ai' | 'manual'>>({});
  const [invalidIds, setInvalidIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<number | null>(null);
  const cacheRef = useRef<Map<string, Suggestion[]>>(new Map());

  const filteredEntries = useMemo(() => entries.filter((e) => !e.archived), [entries]);

  const fetchSuggestions = async (query: string) => {
    if (!supabase || !query.trim()) {
      setSuggestions([]);
      return;
    }
    const normalized = query.trim().toLowerCase();
    if (cacheRef.current.has(normalized)) {
      setSuggestions(cacheRef.current.get(normalized) || []);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('tnved_match', {
        p_query: normalized,
        p_limit_count: 15
      });
      if (error || !data) {
        setSuggestions([]);
        return;
      }
      const next = (data as any[]).map((row) => ({
        name: String(row.name || ''),
        code: String(row.code || ''),
        score: Number(row.similarity ?? 0)
      }));
      cacheRef.current.set(normalized, next);
      setSuggestions(next);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiAssist = async () => {
    if (!supabase) {
      toast.error('Нет подключения к базе справочника.');
      return;
    }
    const missing = filteredEntries.filter((e) => !getCodeForEntry(e.id));
    if (missing.length === 0) {
      toast('Все коды уже заполнены', { icon: '✅' });
      return;
    }

    setIsAiRunning(true);
    const toastId = toast.loading('ИИ подбирает коды...');
    try {
      const baseUrl =
        import.meta.env.VITE_EXCEL_PARSE_URL?.replace(/\/excel-to-rows\/?$/, '') ||
        'http://localhost:5055';
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 120000);
      const response = await fetch(`${baseUrl}/api/classify-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity,
          items: missing.map((e) => ({ id: e.id, name: e.product }))
        }),
        signal: controller.signal
      }).finally(() => window.clearTimeout(timeoutId));
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || response.statusText || 'Ошибка ИИ');
      }
      const data = await response.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      if (results.length === 0) {
        toast.error('ИИ не вернул коды. Проверьте сервер и ключ API.');
      }
      const nextAiIds = new Set(aiSuggestedIds);
      results.forEach((row: any) => {
        const entryId = String(row.id || '');
        const code = String(row.code || '');
        if (!entryId || !code) return;
        setCodeById((prev) => ({ ...prev, [entryId]: code }));
        setSearchById((prev) => ({ ...prev, [entryId]: code }));
        setSourceById((prev) => ({ ...prev, [entryId]: 'ai' }));
        nextAiIds.add(entryId);
      });
      setAiSuggestedIds(nextAiIds);
    } catch (error: any) {
      const message = error?.name === 'AbortError'
        ? 'ИИ не отвечает. Проверьте, что сервер запущен.'
        : error?.message || 'Ошибка ИИ';
      toast.error(message);
    } finally {
      toast.dismiss(toastId);
      setIsAiRunning(false);
    }
  };

  const handleSearchChange = (entryId: string, value: string) => {
    setSearchById((prev) => ({ ...prev, [entryId]: value }));
    setCodeById((prev) => ({ ...prev, [entryId]: value }));
    setSourceById((prev) => ({ ...prev, [entryId]: 'manual' }));
    setAiSuggestedIds((prev) => {
      const next = new Set(prev);
      next.delete(entryId);
      return next;
    });
    setActiveRowId(entryId);
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const handlePick = (entryId: string, suggestion: Suggestion) => {
    setCodeById((prev) => ({ ...prev, [entryId]: suggestion.code }));
    setNameById((prev) => ({ ...prev, [entryId]: suggestion.name }));
    setSearchById((prev) => ({ ...prev, [entryId]: suggestion.code }));
    setSourceById((prev) => ({ ...prev, [entryId]: 'manual' }));
    setInvalidIds((prev) => {
      const next = new Set(prev);
      next.delete(entryId);
      return next;
    });
    setAiSuggestedIds((prev) => {
      const next = new Set(prev);
      next.delete(entryId);
      return next;
    });
    setSuggestions([]);
    setActiveRowId(null);
  };

  const handleExport = async () => {
    const missing = filteredEntries.filter((e) => !getCodeForEntry(e.id)).length;
    if (missing > 0) {
      toast.error(`Нужно выбрать коды ТН ВЭД для ${missing} позиций`);
      return;
    }

    if (supabase) {
      const codes = filteredEntries
        .map((entry) => getCodeForEntry(entry.id))
        .filter(Boolean);
      if (codes.length > 0) {
        const uniqueCodes = Array.from(new Set(codes));
        const { data, error } = await supabase
          .from('tnved_catalog')
          .select('code')
          .in('code', uniqueCodes);
        if (error) {
          toast.error('Не удалось проверить коды ТН ВЭД по базе');
          return;
        }
        const allowed = new Set((data || []).map((row: any) => String(row.code)));
        const invalid = new Set<string>();
        filteredEntries.forEach((entry) => {
          const code = getCodeForEntry(entry.id);
          if (code && !allowed.has(code)) {
            invalid.add(entry.id);
          }
        });
        if (invalid.size > 0) {
          setInvalidIds(invalid);
          toast.error(`Коды не найдены в базе ЭСФ для ${invalid.size} позиций`);
          return;
        }
      }

      const payload = filteredEntries
        .map((entry) => ({
          product_name: entry.product,
          tnved_code: getCodeForEntry(entry.id),
          source: sourceById[entry.id] || 'manual',
          activity
        }))
        .filter((row) => row.tnved_code);
      if (payload.length > 0) {
        await supabase.from('product_mappings').insert(payload);
      }
    }

    const normalizeUnit = (value?: string) => {
      const raw = String(value || '').trim();
      if (!raw) return 'шт';
      const lower = raw.toLowerCase();
      if (lower === 'шт.' || lower === 'шт') return 'шт';
      if (lower === 'п/м') return 'метр';
      return raw;
    };

    const excelData = filteredEntries.map((entry) => ({
      "Наименование товара": entry.product,
      "Код единицы измерения": normalizeUnit(entry.unit),
      "Код ТН ВЭД": getCodeForEntry(entry.id),
      "Признак товара": "1",
      "Цена": entry.price || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 50 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 10 }
    ];
    const range = XLSX.utils.decode_range(worksheet['!ref'] as string);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const tnvedCell = XLSX.utils.encode_cell({ r: R, c: 2 });
      if (worksheet[tnvedCell]) worksheet[tnvedCell].t = 's';
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ESF_Catalog');
    XLSX.writeFile(workbook, `full_catalog_export_${new Date().getTime()}.xlsx`);
  };

  const getCodeForEntry = (entryId: string) => {
    const raw = codeById[entryId] || searchById[entryId] || '';
    const match = raw.match(/\d{8,10}/);
    return match ? match[0] : '';
  };

  return (
    <div className="min-h-screen bg-background-light p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Подбор ТН ВЭД</h1>
            <p className="text-sm text-slate-500">Заполните коды вручную, используя поиск по справочнику.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="Вид деятельности / ГКЭД"
              className="text-xs font-bold text-slate-600 px-3 py-2 rounded-xl border border-slate-200 bg-white dark:bg-slate-900"
            />
            <button
              onClick={handleAiAssist}
              disabled={isAiRunning}
              className="text-xs font-black text-slate-600 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              Магическое заполнение через ИИ
            </button>
            <button
              onClick={() => navigate('/data-grid')}
              className="text-xs font-black text-slate-500 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
            >
              Назад
            </button>
            <button
              onClick={handleExport}
              className="text-xs font-black text-emerald-600 px-4 py-2 rounded-xl border border-emerald-200 hover:bg-emerald-50"
            >
              Экспорт в ГНС
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white dark:bg-slate-900">
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Товар</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Кол-во</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Цена</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Код ТН ВЭД</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-200">
                      {entry.product}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">{entry.quantity}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{entry.price}</td>
                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-200 relative">
                      <input
                        value={searchById[entry.id] || ''}
                        onChange={(e) => handleSearchChange(entry.id, e.target.value)}
                        onFocus={() => {
                          setActiveRowId(entry.id);
                          fetchSuggestions(searchById[entry.id] || entry.product);
                        }}
                        placeholder="Введите название или код"
                        title={nameById[entry.id] || ''}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          invalidIds.has(entry.id)
                            ? 'border-rose-400 bg-rose-50'
                            : aiSuggestedIds.has(entry.id)
                              ? 'border-blue-300 bg-blue-50'
                              : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                        }`}
                      />
                      {activeRowId === entry.id && suggestions.length > 0 && (
                        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-64 overflow-auto">
                          {suggestions.map((s, idx) => (
                            <button
                              key={`${s.code}-${idx}`}
                              onClick={() => handlePick(entry.id, s)}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              <div className="font-bold text-slate-800 dark:text-slate-100">{s.code}</div>
                              <div className="text-xs text-slate-500">{s.name}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      {activeRowId === entry.id && suggestions.length === 0 && !isLoading && (
                        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                          <div className="px-4 py-2 text-xs text-slate-500">Нет результатов</div>
                        </div>
                      )}
                      {activeRowId === entry.id && isLoading && (
                        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                          <div className="px-4 py-2 text-xs text-slate-500">Ищем в справочнике...</div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TnvedAssignScreen;
