import React, { useMemo, useState } from 'react';
import { Folder } from '../types';
import { X, Play, Film, Search, Eye, EyeOff, Pencil, Trash2, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cleanItemTitle, extractDomain } from '../utils/urlHelper';

interface FolderFullViewProps {
  folder: Folder | null;
  folders: Folder[];
  currentItemIndex: number;
  onClose: () => void;
  onSelectItem: (index: number) => void;
  onSwitchFolder: (folderId: string) => void;
  onHideMovie?: (folderId: string, movieId: string) => void;
  onEditMovie?: (folderId: string, movieId: string) => void;
  onDeleteMovie?: (folderId: string, movieId: string) => void;
}

const ITEMS_PER_PAGE = 50;

export default function FolderFullView({
  folder,
  folders,
  currentItemIndex,
  onClose,
  onSelectItem,
  onSwitchFolder,
  onHideMovie,
  onEditMovie,
  onDeleteMovie,
}: FolderFullViewProps) {
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredItems = useMemo(() => {
    if (!folder) return [] as Array<{ index: number; id: string; title: string; url: string; posterUrl?: string; isHidden?: boolean; isBroken?: boolean }>;
    const q = query.trim().toLowerCase();
    return folder.items
      .map((item, index) => ({
        index,
        id: item.id,
        title: cleanItemTitle(item.title) || item.title,
        url: item.url,
        posterUrl: item.posterUrl,
        isHidden: item.isHidden,
        isBroken: item.isBroken,
      }))
      .filter((it) =>
        q.length === 0 ||
        it.title.toLowerCase().includes(q) ||
        extractDomain(it.url).toLowerCase().includes(q)
      );
  }, [folder, query]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredItems.slice(start, end);
  }, [filteredItems, currentPage]);

  // Reset page when query or folder changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [query, folder]);

  if (!folder) return null;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md flex flex-col" dir="rtl">
      {/* Header - optimized for mobile */}
      <header className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3 border-b border-neutral-800 bg-neutral-950 flex-wrap">
        {/* Folder switcher */}
        <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-none">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: folder.color || '#a855f7' }}
          />
          <div className="relative min-w-0">
            <select
              value={folder.id}
              onChange={(e) => {
                if (e.target.value !== folder.id) {
                  onSwitchFolder(e.target.value);
                }
              }}
              className="appearance-none bg-neutral-900 border border-neutral-700 rounded-xl px-2 sm:px-3 py-1.5 pr-7 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-purple-500 cursor-pointer max-w-full sm:max-w-[200px] truncate"
            >
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.items.length})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400 pointer-events-none" />
          </div>
          <span className="text-[10px] sm:text-[11px] text-purple-400 font-bold whitespace-nowrap">
                {folder.items.length} عنصر
              </span>
        </div>

        {/* Search + Close */}
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto sm:flex-none order-3 sm:order-none mt-2 sm:mt-0">
          <div className="flex items-center flex-1 gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5">
            <Search className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث باسم العنصر أو الموقع..."
              className="flex-1 bg-transparent text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none min-w-0"
            />
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 flex items-center gap-1.5 text-xs flex-shrink-0"
            title="إغلاق العرض الكامل"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">إغلاق</span>
          </button>
        </div>
      </header>

      {/* Grid - optimized for mobile */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="text-center text-neutral-500 text-sm py-20">
            {folder.items.length === 0 ? 'لا توجد عناصر في هذا المستودع بعد.' : 'لا توجد نتائج مطابقة للبحث.'}
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                    {paginatedItems.map(({ index, id, title, url, posterUrl, isHidden, isBroken }) => {
                      const isCurrent = index === currentItemIndex;
                      return (
                        <div
                          key={id}
                          className={`group relative rounded-xl overflow-hidden border bg-neutral-900 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                            isCurrent ? 'border-purple-500 shadow-purple-900/40 shadow-lg' : 'border-neutral-800 hover:border-neutral-700'
                          } ${isHidden ? 'opacity-50' : ''}`}
                        >
                          <div className="absolute top-2 right-2 z-20 bg-neutral-900/80 backdrop-blur-sm text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full font-mono">
                            {index + 1}
                          </div>
                          <button
                            onClick={() => onSelectItem(index)}
                            className="block w-full text-right"
                            title={`تشغيل: ${title}`}
                          >
                      {/* Poster - increased height */}
                      <div className="aspect-[3/4] bg-neutral-950 overflow-hidden relative">
                        {posterUrl ? (
                          <img
                            src={posterUrl}
                            alt={title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-700">
                            <Film className="w-8 sm:w-10 h-8 sm:h-10" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                          <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-purple-600 flex items-center justify-center shadow-xl">
                            <Play className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
                          </div>
                        </div>
                        {isBroken && (
                          <span className="absolute top-1 sm:top-2 right-1 sm:right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-red-600/90 text-[10px] sm:text-xs font-bold">معطوب</span>
                        )}
                        {isCurrent && (
                          <span className="absolute top-1 sm:top-2 left-1 sm:left-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-purple-600/90 text-[10px] sm:text-xs font-bold">▶ الآن</span>
                        )}
                      </div>
                      {/* Title row - increased font size */}
                      <div className="px-2 sm:px-3 py-1.5 sm:py-2">
                        <h4 className="text-[11px] sm:text-sm font-semibold text-white line-clamp-2 leading-snug" title={title}>{title}</h4>
                        <p className="text-[10px] sm:text-xs text-neutral-500 truncate pt-0.5 sm:pt-1">{extractDomain(url)}</p>
                      </div>
                    </button>
                    {/* Action buttons row */}
                    <div className="flex border-t border-neutral-800 divide-x divide-neutral-800 divide-x-reverse">
                      <button
                        onClick={() => onHideMovie?.(folder.id, id)}
                        className="flex-1 py-1.5 sm:py-2 text-neutral-400 hover:text-amber-300 hover:bg-neutral-850 flex items-center justify-center"
                        title={isHidden ? 'إظهار' : 'إخفاء'}
                      >
                        {isHidden ? <EyeOff className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : <Eye className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
                      </button>
                      <button
                        onClick={() => onEditMovie?.(folder.id, id)}
                        className="flex-1 py-1.5 sm:py-2 text-neutral-400 hover:text-amber-200 hover:bg-neutral-850 flex items-center justify-center"
                        title="تعديل بيانات العنصر"
                      >
                        <Pencil className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteMovie?.(folder.id, id)}
                        className="flex-1 py-1.5 sm:py-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-850 flex items-center justify-center"
                        title="حذف العنصر"
                      >
                        <Trash2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 pb-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-xs">السابق</span>
                </button>
                <span className="text-xs text-neutral-400 px-2">
                  صفحة {currentPage} من {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span className="text-xs">التالي</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
