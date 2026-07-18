import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Folder } from '../types';
import { X, Play, Film, Search, Eye, EyeOff, Pencil, Trash2, ChevronDown, ChevronLeft, ChevronRight, Heart, ChevronUp, Clock, Link, ExternalLink } from 'lucide-react';
import { cleanItemTitle, extractDomain } from '../utils/urlHelper';

interface FolderFullViewProps {
  key?: string;
  folder: Folder | null;
  folders: Folder[];
  currentItemIndex: number;
  onClose: () => void;
  onSelectItem: (index: number) => void;
  onSwitchFolder: (folderId: string) => void;
  onToggleFavorite?: (folderId: string, movieId: string) => void;
  onMoveMovieUp?: (folderId: string, movieId: string) => void;
  onMoveMovieDown?: (folderId: string, movieId: string) => void;
  onOpenMoveToPosition?: (folderId: string, movieId: string) => void;
  onSortByFavorite?: (folderId: string) => void;
  onSortByOldest?: (folderId: string) => void;
  onSortByDate?: (folderId: string) => void;
  onSortByManual?: (folderId: string) => void;
  onSortByDomain?: (folderId: string) => void;
  onSortByTitle?: (folderId: string) => void;
  onHideMovie?: (folderId: string, movieId: string) => void;
  onEditMovie?: (folderId: string, movieId: string) => void;
  onDeleteMovie?: (folderId: string, movieId: string) => void;
}

const ITEMS_PER_PAGE = 50;

const FolderFullView = ({
  folder,
  folders,
  currentItemIndex,
  onClose,
  onSelectItem,
  onSwitchFolder,
  onToggleFavorite,
  onMoveMovieUp,
  onMoveMovieDown,
  onOpenMoveToPosition,
  onSortByFavorite,
  onSortByOldest,
  onSortByDate,
  onSortByManual,
  onSortByDomain,
  onSortByTitle,
  onHideMovie,
  onEditMovie,
  onDeleteMovie,
}: FolderFullViewProps) => {
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
        isFavorite: item.isFavorite,
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

  // Generate page numbers: current ±3, within 1 to totalPages
  const pageNumbers = useMemo(() => {
    const pages = [];
    const start = Math.max(1, currentPage - 3);
    const end = Math.min(totalPages, currentPage + 3);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  // Scroll to top when page changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  // Reset page and query when folder changes
  React.useEffect(() => {
    setCurrentPage(1);
    setQuery('');
  }, [folder]);

  if (!folder) return null;

  const currentFolderIndex = folders.findIndex(f => f.id === folder.id);
  const prevFolder = currentFolderIndex > 0 ? folders[currentFolderIndex - 1] : null;
  const nextFolder = currentFolderIndex < folders.length - 1 ? folders[currentFolderIndex + 1] : null;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md flex flex-col" dir="rtl">
      {/* Header - optimized for mobile */}
      <header className={isHeaderCollapsed ? 'border-b border-neutral-800 bg-neutral-950 py-1 px-2 transition-all duration-300' : 'border-b border-neutral-800 bg-neutral-950 px-3 py-2 sm:px-4 sm:py-3 transition-all duration-300'}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Folder switcher */}
          <div className={isHeaderCollapsed ? 'hidden sm:flex items-center gap-2 min-w-0 flex-1 sm:flex-none transition-all' : 'flex items-center gap-2 min-w-0 flex-1 sm:flex-none transition-all'}>
            <button
              onClick={() => prevFolder && onSwitchFolder(prevFolder.id)}
              disabled={!prevFolder}
              className="p-1.5 rounded-lg border border-neutral-700 text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800 hover:text-white transition-all flex items-center gap-1"
              title={prevFolder ? `المستودع السابق: ${prevFolder.name}` : "لا يوجد مستودع سابق"}
            >
              <ChevronRight className="w-3 h-3" />
            </button>
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
                className="appearance-none bg-neutral-900 border border-neutral-700 rounded-xl px-2 sm:px-3 py-1.5 pr-7 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-purple-500 cursor-pointer w-full sm:w-[400px] max-w-full sm:max-w-[400px] truncate"
              >
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.items.length})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400 pointer-events-none" />
            </div>
            <button
              onClick={() => nextFolder && onSwitchFolder(nextFolder.id)}
              disabled={!nextFolder}
              className="p-1.5 rounded-lg border border-neutral-700 text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800 hover:text-white transition-all flex items-center gap-1"
              title={nextFolder ? `المستودع التالي: ${nextFolder.name}` : "لا يوجد مستودع تالي"}
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="text-[10px] sm:text-[11px] text-purple-400 font-bold whitespace-nowrap">
              {folder.items.length} عنصر
            </span>
          </div>

          {/* Collapse/Expand + Search + Close */}
          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto sm:flex-none order-3 sm:order-none mt-2 sm:mt-0">
            <button
              onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 flex items-center gap-1 text-xs flex-shrink-0"
              title={isHeaderCollapsed ? "إظهار الشريط العلوي" : "إخفاء الشريط العلوي"}
            >
              {isHeaderCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
            <div className={isHeaderCollapsed ? 'hidden sm:flex items-center flex-1 gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 transition-all' : 'flex items-center flex-1 gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 transition-all'}>
              <Search className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="بحث باسم العنصر أو الموقع..."
                className="flex-1 bg-transparent text-xs text-neutral-300 placeholder-neutral-600 focus:outline-none min-w-0"
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
        </div>
      </header>

      {/* Sorting Bar - New */}
      <div className={isHeaderCollapsed ? 'hidden sm:flex bg-neutral-900/50 border-b border-neutral-800 px-4 py-2 items-center gap-3 overflow-x-auto scrollbar-hide flex-wrap transition-all duration-300' : 'bg-neutral-900/50 border-b border-neutral-800 px-4 py-2 flex items-center gap-3 overflow-x-auto scrollbar-hide flex-wrap transition-all duration-300'}>
        <span className="text-[10px] font-bold text-neutral-500 uppercase whitespace-nowrap">ترتيب العناصر:</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => folder && onSortByFavorite?.(folder.id)}
            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-amber-900/40 text-neutral-300 hover:text-amber-400 text-[10px] font-bold border border-neutral-700 transition-all flex items-center gap-1"
          >
            <Heart className="w-3 h-3" /> المفضلات
          </button>
          <button
            onClick={() => folder && onSortByDate?.(folder.id)}
            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-purple-900/40 text-neutral-300 hover:text-purple-400 text-[10px] font-bold border border-neutral-700 transition-all flex items-center gap-1"
          >
            <Clock className="w-3 h-3" /> الأحدث
          </button>
          <button
            onClick={() => folder && onSortByOldest?.(folder.id)}
            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-purple-900/40 text-neutral-300 hover:text-purple-400 text-[10px] font-bold border border-neutral-700 transition-all flex items-center gap-1"
          >
            <Clock className="w-3 h-3 rotate-180" /> الأقدم
          </button>
          <button
            onClick={() => folder && onSortByManual?.(folder.id)}
            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-purple-900/40 text-neutral-300 hover:text-purple-400 text-[10px] font-bold border border-neutral-700 transition-all flex items-center gap-1"
          >
            <span>🔀</span> يدوى
          </button>
        </div>
        <div className="h-4 w-px bg-neutral-800 mx-1" />
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-[10px] font-bold transition-all"
            >
              <ChevronRight className="w-3 h-3" />
              <span>السابق</span>
            </button>
            <div className="flex items-center gap-1">
              {pageNumbers.map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={page === currentPage ? 'px-2 py-1 rounded-lg text-[10px] font-bold transition-all bg-purple-600 text-white border border-purple-500' : 'px-2 py-1 rounded-lg text-[10px] font-bold transition-all bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white border border-neutral-700'}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-[10px] font-bold transition-all"
            >
              <span>التالي</span>
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-[10px] font-bold transition-all"
            >
              <span>{totalPages}</span>
            </button>
          </div>
        )}
        
        <div className="h-4 w-px bg-neutral-800 mx-1" />
        <span className="text-[10px] text-neutral-500 italic">الترتيب اليدوي متاح عبر الأسهم على كل بطاقة</span>
      </div>

      {/* Grid - optimized for mobile */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="text-center text-neutral-500 text-sm py-20">
            {folder.items.length === 0 ? 'لا توجد عناصر في هذا المستودع بعد.' : 'لا توجد نتائج مطابقة للبحث.'}
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {paginatedItems.map(({ index, id, title, url, posterUrl, isHidden, isBroken, isFavorite }) => {
                const isCurrent = index === currentItemIndex;
                return (
                  <div
                    key={id}
                    className={isCurrent ? 'group relative rounded-xl overflow-hidden border bg-neutral-900 transition-all hover:-translate-y-0.5 hover:shadow-lg border-purple-500 shadow-purple-900/40 shadow-lg' : isFavorite ? 'group relative rounded-xl overflow-hidden border bg-neutral-900 transition-all hover:-translate-y-0.5 hover:shadow-lg border-amber-400' : 'group relative rounded-xl overflow-hidden border bg-neutral-900 transition-all hover:-translate-y-0.5 hover:shadow-lg border-neutral-800 hover:border-neutral-700'}
                  >
                    {/* Side buttons */}
                    <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg shadow-md transition-all"
                        title="فتح في المتصفح الخارجي"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(title + ' مشاهدة')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-md transition-all"
                        title="بحث في جوجل"
                      >
                        <Search className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`https://yandex.com/search/?text=${encodeURIComponent(title + ' مشاهدة')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-md transition-all"
                        title="بحث في ياندكس"
                      >
                        <Search className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    
                    {/* Index number badge */}
                    <div className="absolute top-2 right-2 z-20 bg-neutral-900/80 backdrop-blur-sm text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full font-mono">
                      {index + 1}
                    </div>

                    {/* Item Actions (Favorite / Manual Order) overlay on the right */}
                    <div className="absolute top-8 right-2 z-20 flex flex-col gap-1 items-center bg-black/60 backdrop-blur-sm p-1 rounded-lg">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite?.(folder.id, id);
                        }}
                        className={isFavorite ? 'p-0.5 transition-colors text-amber-400' : 'p-0.5 transition-colors text-neutral-400 hover:text-amber-300'}
                        title="تفضيل العنصر"
                      >
                        <Heart className={isFavorite ? 'w-3.5 h-3.5 fill-current' : 'w-3.5 h-3.5'} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenMoveToPosition?.(folder.id, id);
                        }}
                        className="p-0 text-neutral-400 hover:text-neutral-200"
                        title="تحديد ترتيب العنصر يدوياً"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenMoveToPosition?.(folder.id, id);
                        }}
                        className="p-0 text-neutral-400 hover:text-neutral-200"
                        title="تحديد ترتيب العنصر يدوياً"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => onSelectItem(index)}
                      className="block w-full text-right"
                      title={`تشغيل: ${title}`}
                    >
                      {/* Poster */}
                      <div className="aspect-[5/6.05] bg-neutral-950 overflow-hidden relative">
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
                        {/* Domain badge overlaid at bottom of poster */}
                        <div className="absolute bottom-0 inset-x-0 px-1.5 py-1">
                          <span className="inline-flex items-center gap-1 bg-black/65 backdrop-blur-sm text-[9px] sm:text-[10px] font-bold text-neutral-300 px-1.5 py-0.5 rounded-md max-w-full truncate">
                            <Link className="w-2 h-2 flex-shrink-0 text-purple-400" />
                            <span className="truncate">{extractDomain(url)}</span>
                          </span>
                        </div>
                      </div>
                      {/* Title row - full space for 2-line title */}
                      <div className="px-2 py-1.5">
                        <h4 className="text-[13.2px] sm:text-sm font-extrabold text-white line-clamp-2 leading-snug animate-in fade-in text-right" title={title}>
                          {title}
                        </h4>
                      </div>
                    </button>
                    {/* Action buttons row */}
                    <div className="flex border-t border-neutral-800 divide-x divide-neutral-800 divide-x-reverse">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onHideMovie?.(folder.id, id);
                        }}
                        className="flex-1 py-1 text-neutral-400 hover:text-amber-300 hover:bg-neutral-850 flex items-center justify-center"
                        title={isHidden ? 'إظهار' : 'إخفاء'}
                      >
                        {isHidden ? <EyeOff className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : <Eye className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditMovie?.(folder.id, id);
                        }}
                        className="flex-1 py-1 text-neutral-400 hover:text-amber-200 hover:bg-neutral-850 flex items-center justify-center"
                        title="تعديل بيانات العنصر"
                      >
                        <Pencil className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMovie?.(folder.id, id);
                        }}
                        className="flex-1 py-1 text-neutral-400 hover:text-red-400 hover:bg-neutral-850 flex items-center justify-center"
                        title="حذف العنصر"
                      >
                        <Trash2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination Controls (Bottom) */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 pb-2 flex-wrap">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-[10px] font-bold transition-all"
                >
                  <ChevronRight className="w-3 h-3" />
                  <span>السابق</span>
                </button>
                <div className="flex items-center gap-1">
                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={page === currentPage ? 'px-2 py-1 rounded-lg text-[10px] font-bold transition-all bg-purple-600 text-white border border-purple-500' : 'px-2 py-1 rounded-lg text-[10px] font-bold transition-all bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white border border-neutral-700'}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-[10px] font-bold transition-all"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-[10px] font-bold transition-all"
                >
                  <span>{totalPages}</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FolderFullView;
