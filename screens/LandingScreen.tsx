
import React, { useRef } from 'react';
import { TaxEntry } from '../types';

interface LandingScreenProps {
  onDataLoaded: (entries: TaxEntry[]) => void;
}

const LandingScreen: React.FC<LandingScreenProps> = ({ onDataLoaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const maxSizeBytes = 10 * 1024 * 1024;
    if (!file.name.toLowerCase().endsWith('.xml')) {
      alert('Поддерживаются только XML файлы.');
      return;
    }
    if (file.size > maxSizeBytes) {
      alert('Файл слишком большой. Максимум 10 МБ.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const xmlString = e.target?.result as string;
      parseXml(xmlString);
    };
    reader.onerror = () => {
      alert('Не удалось прочитать файл. Попробуйте еще раз.');
    };
    reader.readAsText(file);
  };

  const parseXml = (xmlString: string) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      alert('XML содержит ошибки. Проверьте формат файла.');
      return;
    }
    
    const entries: TaxEntry[] = [];
    const receipts = xmlDoc.getElementsByTagName('receipt');

    if (receipts.length > 0) {
      let globalId = 1;
      for (let i = 0; i < receipts.length; i++) {
        const receipt = receipts[i];
        
        // Extract shared receipt info
        const supplier = receipt.getElementsByTagName('contractorName')[0]?.textContent || "Неизвестный поставщик";
        const rawDate = receipt.getElementsByTagName('createdDate')[0]?.textContent || "";
        
        // Format date from YYYY-MM-DD to DD.MM.YYYY for display
        let formattedDate = rawDate;
        if (rawDate && rawDate.includes('-')) {
          const [y, m, d] = rawDate.split('-');
          formattedDate = `${d}.${m}.${y}`;
        }

        const goods = receipt.getElementsByTagName('good');
        for (let j = 0; j < goods.length; j++) {
          const good = goods[j];
          const productName = good.getElementsByTagName('goodsName')[0]?.textContent || "Без названия";
          const quantity = parseFloat(good.getElementsByTagName('baseCount')[0]?.textContent || "0");
          const price = parseFloat(good.getElementsByTagName('price')[0]?.textContent || "0");
          const total = quantity * price;

          entries.push({
            id: globalId.toString(),
            date: formattedDate,
            supplier: supplier,
            product: productName,
            quantity: quantity,
            price: price,
            total: total
          });
          globalId++;
        }
      }
    } else {
      // Very basic fallback if structure is flat
      const goods = xmlDoc.getElementsByTagName('good');
      if (goods.length > 0) {
        for (let i = 0; i < goods.length; i++) {
          const good = goods[i];
          entries.push({
            id: (i + 1).toString(),
            date: new Date().toLocaleDateString('ru-RU'),
            supplier: "Импортированные данные",
            product: good.getElementsByTagName('goodsName')[0]?.textContent || "Товар",
            quantity: parseFloat(good.getElementsByTagName('baseCount')[0]?.textContent || "0"),
            price: parseFloat(good.getElementsByTagName('price')[0]?.textContent || "0"),
            total: 0
          });
        }
      }
    }

    if (entries.length > 0) {
      onDataLoaded(entries);
    } else {
      alert("Не удалось распознать структуру XML. Пожалуйста, проверьте формат файла.");
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".xml" 
        className="hidden" 
      />

      <div className="w-full max-w-2xl flex flex-col items-center text-center">
        <div className="mb-10 relative">
          <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150 animate-pulse"></div>
          <div className="relative bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center transform transition-transform hover:scale-105">
            <span className="material-symbols-outlined text-primary text-8xl">upload_file</span>
          </div>
        </div>

        <div className="mb-10">
          <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">Готов к обработке файлов</h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-md mx-auto leading-relaxed">
            Ваш кабинет пуст. Загрузите выписку из личного кабинета налоговой службы для автоматического расчета.
          </p>
        </div>

        <div className="flex flex-col items-center gap-5 w-full">
          <button 
            onClick={handleButtonClick}
            className="group flex items-center justify-center gap-3 bg-primary hover:bg-blue-700 text-white font-bold py-5 px-12 rounded-2xl transition-all shadow-2xl shadow-primary/40 hover:shadow-primary/50 active:scale-95 text-xl w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-2xl">add_circle</span>
            <span>Загрузить XML из Налоговой</span>
          </button>
          <p className="text-gray-500 dark:text-gray-500 text-sm font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-green-500 font-bold">verified</span>
            Поддерживается формат «Квитанции ГНС»
          </p>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm p-8 rounded-3xl border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-slate-500">security</span>
            </div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Безопасно</h3>
            <p className="text-xs text-gray-500 mt-2 font-medium">Данные шифруются на стороне клиента</p>
          </div>
          
          <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm p-8 rounded-3xl border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-slate-500">bolt</span>
            </div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Мгновенно</h3>
            <p className="text-xs text-gray-500 mt-2 font-medium">Распознавание занимает до 3 секунд</p>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm p-8 rounded-3xl border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-slate-500">description</span>
            </div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Точно</h3>
            <p className="text-xs text-gray-500 mt-2 font-medium">Сверка по актуальным ставкам 2024</p>
          </div>
        </div>
      </div>

      <footer className="mt-auto pt-16 w-full flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400">
        <div className="flex items-center gap-8">
          <a href="#" className="text-sm font-bold hover:text-primary transition-colors">Помощь</a>
          <a href="#" className="text-sm font-bold hover:text-primary transition-colors">Конфиденциальность</a>
          <a href="#" className="text-sm font-bold hover:text-primary transition-colors">Условия</a>
        </div>
        <p className="text-xs font-medium">© 2024 TaxFlow. Все права защищены.</p>
      </footer>
    </div>
  );
};

export default LandingScreen;
