import React, { useEffect, useMemo, useState } from 'react';
import { TaxEntry, RetailSale, RetailMatchCandidate } from '../types';
import { toast } from 'react-hot-toast';

interface RetailScreenProps {
  entries: TaxEntry[];
  onEntriesUpdated: (entries: TaxEntry[]) => void;
}

const STORAGE_KEY = 'taxflow_retail_sales';

const RetailScreen: React.FC<RetailScreenProps> = ({ entries, onEntriesUpdated }) => {
  const [inputText, setInputText] = useState('');
  const [sales, setSales] = useState<RetailSale[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSales(JSON.parse(raw));
      }
    } catch (error) {
      console.error('Failed to load retail sales:', error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
  }, [sales]);

  const totals = useMemo(() => {
    const total = sales.length;
    const matched = sales.filter((s) => s.status === 'matched').length;
    const applied = sales.filter((s) => s.status === 'applied').length;
    return { total, matched, applied, pending: total - matched - applied };
  }, [sales]);

  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/\s+/g, ' ')
      .replace(/[^\p{L}\p{N}\s.-]/gu, '')
      .trim();

  const extractName = (value: string) => {
    const cleaned = value.replace(/\s+/g, ' ').trim();
    return cleaned.replace(/(\s+[\d,.]+(?:\s*(сом|kgs|kg|л|шт|р\.|руб\.))?)$/i, '').trim();
  };

  const levenshtein = (a: string, b: string) => {
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[a.length][b.length];
  };

  const similarity = (a: string, b: string) => {
    if (!a || !b) return 0;
    const dist = levenshtein(a, b);
    return 1 - dist / Math.max(a.length, b.length);
  };

  const buildCandidates = (name: string, products: string[]): RetailMatchCandidate[] => {
    const base = normalize(name);
    const ranked = products.map((product) => ({
      product,
      score: Number(similarity(base, normalize(product)).toFixed(2))
    }));
    return ranked.sort((a, b) => b.score - a.score).slice(0, 5);
  };

  const aiPickCandidate = async (name: string, candidates: RetailMatchCandidate[]) => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) return null;
    const prompt = [
      'Выбери наиболее подходящее название товара из списка.',
      'Верни только JSON: {"best_index": number|null}',
      `Продажа: ${name}`,
      'Кандидаты:',
      candidates.map((c, i) => `${i}. ${c.product}`).join('\n')
    ].join('\n');
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
        temperature: 0
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    const outputText =
      data?.output?.[0]?.content?.find((c: any) => c.type === 'output_text')?.text || '';
    const cleaned = outputText.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      const idx = parsed?.best_index;
      if (typeof idx === 'number' && candidates[idx]) return candidates[idx];
      return null;
    } catch {
      return null;
    }
  };

  const handleAddSale = () => {
    const text = inputText.trim();
    if (!text) {
      toast.error('Введите название продажи');
      return;
    }
    const sale: RetailSale = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    setSales((prev) => [sale, ...prev]);
    setInputText('');
    toast.success('Продажа добавлена');
  };

  const applyCandidate = (saleId: string, productName: string) => {
    const idx = entries.findIndex((e) => e.product === productName);
    if (idx === -1) {
      toast.error('Товар не найден в базе');
      return;
    }
    const updated = [...entries];
    const target = updated[idx];
    const nextQty = Math.max(0, target.quantity - 1);
    updated[idx] = { ...target, quantity: nextQty, total: nextQty * target.price };
    onEntriesUpdated(updated);
    setSales((prev) =>
      prev.map((sale) =>
        sale.id === saleId ? { ...sale, status: 'applied', matchedProduct: productName } : sale
      )
    );
    toast.success('Списание выполнено');
  };

  const handleSync = async () => {
    if (entries.length === 0) {
      toast.error('База товаров пуста');
      return;
    }
    setIsSyncing(true);
    try {
      const products = Array.from(new Set(entries.map((e) => e.product)));
      const nextSales = [...sales];
      for (let i = 0; i < nextSales.length; i++) {
        const sale = nextSales[i];
        if (sale.status === 'applied') continue;
        const name = extractName(sale.text);
        const normalizedName = normalize(name);
        const exact = products.find((p) => normalize(p) === normalizedName);
        if (exact) {
          nextSales[i] = {
            ...sale,
            status: 'matched',
            matchedProduct: exact,
            matchScore: 1,
            candidates: [{ product: exact, score: 1 }]
          };
          continue;
        }
        const candidates = buildCandidates(name, products);
        let best = candidates[0];
        if (best && best.score < 0.5) {
          const aiPick = await aiPickCandidate(name, candidates);
          if (aiPick) best = aiPick;
        }
        nextSales[i] = {
          ...sale,
          status: best ? 'matched' : 'pending',
          matchedProduct: best?.product,
          matchScore: best?.score,
          candidates
        };
      }
      setSales(nextSales);
      toast.success('Синхронизация завершена');
    } catch (error) {
      console.error(error);
      toast.error('Не удалось синхронизировать');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString('ru-RU');
  };

  return (
    <div className="p-5 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Розница</h2>
          <nav className="flex items-center text-xs text-slate-500 gap-2 font-bold">
            <span className="hover:text-primary cursor-pointer transition-colors">Главная</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-primary">Розница</span>
          </nav>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl shadow-primary/20 transition-all active:scale-95 whitespace-nowrap disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-xl">sync</span>
          {isSyncing ? 'Синхронизация...' : 'Синхронизировать'}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Продано сегодня', value: totals.total },
          { label: 'Не сопоставлено', value: totals.pending },
          { label: 'Сопоставлено', value: totals.matched },
          { label: 'Списано', value: totals.applied }
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden mb-5">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
              placeholder='Например: "Краска Алина 3200"'
            />
            <button
              onClick={handleAddSale}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl shadow-emerald-500/20"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              Добавить продажу
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[320px]">
          {sales.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Дата</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Текст продажи</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Статус</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Совпадение</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-500 font-bold">{formatDate(sale.createdAt)}</td>
                    <td className="px-5 py-3 text-sm font-black text-slate-900 dark:text-white">{sale.text}</td>
                    <td className="px-5 py-3 text-xs font-bold text-slate-500">
                      {sale.status === 'applied' && 'Списано'}
                      {sale.status === 'matched' && 'Сопоставлено'}
                      {sale.status === 'pending' && 'Не сопоставлено'}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {sale.matchedProduct ? (
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {sale.matchedProduct}
                          </span>
                          {sale.matchScore !== undefined && (
                            <span className="text-[10px] text-slate-400">Сходство: {Math.round(sale.matchScore * 100)}%</span>
                          )}
                          {sale.status !== 'applied' && sale.candidates && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {sale.candidates.map((c) => (
                                <button
                                  key={c.product}
                                  onClick={() => applyCandidate(sale.id, c.product)}
                                  className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary"
                                >
                                  {c.product} · {Math.round(c.score * 100)}%
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">Нет</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-3xl text-slate-300">point_of_sale</span>
              </div>
              <p className="text-slate-500 font-bold">Продаж пока нет</p>
            </div>
          )}
        </div>
      </div>

      {/* TODO: заменить локальное хранилище на API */}
    </div>
  );
};

export default RetailScreen;
