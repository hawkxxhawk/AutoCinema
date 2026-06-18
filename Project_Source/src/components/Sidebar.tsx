import React, { useState, useEffect } from 'react';
import { Folder, MovieItem, PlayMode, AutoAdvanceTrigger } from '../types';
import { Plus, FolderPlus, Film, Trash2, ArrowRightLeft, Radio, Play, Settings, Lightbulb, Clock, Layers, Eye, EyeOff, Link, AlertCircle, Heart, ChevronUp, ChevronDown } from 'lucide-react';
import { isDirectVideoLink, getEmbedUrl, extractDomain, cleanItemTitle } from '../utils/urlHelper';

interface SidebarProps {
  folders: Folder[];
  currentFolderId: string | null;
  currentItemIndex: number;
  playMode: PlayMode;
  autoAdvanceTrigger: AutoAdvanceTrigger;
  customTimerSeconds: number;
  onSelectFolder: (folderId: string) => void;
  onSelectItem: (index: number) => void;
  onSetPlayMode: (mode: PlayMode) => void;
  onSetAutoAdvanceTrigger: (trigger: AutoAdvanceTrigger) => void;
  onSetCustomTimerSeconds: (seconds: number) => void;
  onAddFolder: (name: string, description: string) => void;
  onAddMovie: (folderId: string, title: string, url: string, description: string, durationMinutes: number, posterUrl?: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onDeleteMovie: (folderId: string, movieId: string) => void;
  onToggleFavorite?: (folderId: string, movieId: string) => void;
  onMoveMovieUp?: (folderId: string, movieId: string) => void;
  onMoveMovieDown?: (folderId: string, movieId: string) => void;
  onSortByFavorite?: (folderId: string) => void;
  onSortByOldest?: (folderId: string) => void;
  onHideMovie?: (folderId: string, movieId: string) => void;
  onMarkBroken?: (folderId: string, movieId: string) => void;
  onSortByDomain?: (folderId: string) => void;
  onSortByTitle?: (folderId: string) => void;
  onSortByDate?: (folderId: string) => void;
  onDeleteBrokenLinks?: (folderId: string) => void;
}

export default function Sidebar({
  folders,
  currentFolderId,
  currentItemIndex,
  playMode,
  autoAdvanceTrigger,
  customTimerSeconds,
  onSelectFolder,
  onSelectItem,
  onSetPlayMode,
  onSetAutoAdvanceTrigger,
  onSetCustomTimerSeconds,
  onAddFolder,
  onAddMovie,
  onDeleteFolder,
  onDeleteMovie,
  onToggleFavorite,
  onMoveMovieUp,
  onMoveMovieDown,
  onSortByFavorite,
  onSortByOldest,
  onHideMovie,
  onMarkBroken,
  onSortByDomain,
  onSortByTitle,
  onSortByDate,
  onDeleteBrokenLinks,
}: SidebarProps) {
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const ITEMS_PER_PAGE = 8;

  // New movie form states
  const [selectedFolderIdForMovie, setSelectedFolderIdForMovie] = useState('');
  const [movieTitle, setMovieTitle] = useState('');
  const [movieUrl, setMovieUrl] = useState('');
  const [movieDesc, setMovieDesc] = useState('');
  const [moviePoster, setMoviePoster] = useState('');
  const [movieDuration, setMovieDuration] = useState(5);
  const [showMovieForm, setShowMovieForm] = useState(false);

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onAddFolder(newFolderName.trim(), newFolderDesc.trim());
    setNewFolderName('');
    setNewFolderDesc('');
    setShowFolderForm(false);
  };

  const handleCreateMovie = (e: React.FormEvent) => {
    e.preventDefault();
    const folderId = selectedFolderIdForMovie || currentFolderId;
    if (!folderId || !movieUrl.trim()) return;

    onAddMovie(
      folderId,
      movieTitle.trim(),
      movieUrl.trim(),
      movieDesc.trim(),
      movieDuration,
      moviePoster.trim() || undefined
    );

    setMovieTitle('');
    setMovieUrl('');
    setMovieDesc('');
    setMoviePoster('');
    setMovieDuration(5);
    setShowMovieForm(false);
  };

  const handleUrlPreFill = (url: string, title: string) => {
    setMovieUrl(url);
    setMovieTitle(title);
    if (!selectedFolderIdForMovie && currentFolderId) {
      setSelectedFolderIdForMovie(currentFolderId);
    }
  };

  useEffect(() => {
    setCurrentPage(0);
  }, [currentFolderId]);

  const activeFolder = folders.find((f) => f.id === currentFolderId) || null;
  const totalPages = activeFolder ? Math.max(1, Math.ceil(activeFolder.items.length / ITEMS_PER_PAGE)) : 1;
  const currentPageItems = activeFolder ? activeFolder.items.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE) : [];
  
  // Navigation between folders
  const currentFolderIndex = folders.findIndex((f) => f.id === currentFolderId);
  const nextFolder = currentFolderIndex < folders.length - 1 ? folders[currentFolderIndex + 1] : null;
  const prevFolder = currentFolderIndex > 0 ? folders[currentFolderIndex - 1] : null;

  return (
    <aside className="w-full lg:w-80 h-screen flex-shrink-0 bg-neutral-900 border-l border-neutral-800 flex flex-col overflow-y-auto custom-scrollbar" id="sidebar-panel">
      {/* Platform Branding */}
      <div className="p-6 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between flex-shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-900/40">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">مسرح العرض التلقائي</h1>
            <p className="text-xs text-neutral-400">نظام بث الأفلام والروابط المستمر</p>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0">
        {/* Main Content Area */}
        <div className="p-5 space-y-6">
          {/* SECTION 1: Active Folder Display with Navigation Arrows */}
          {activeFolder && (
            <div className="mb-6 rounded-3xl border border-neutral-800 bg-neutral-950/80 p-4">
              {/* Folder Navigation Arrows */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => prevFolder && onSelectFolder(prevFolder.id)}
                  disabled={!prevFolder}
                  className="p-1.5 rounded-lg border border-neutral-700 text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800 hover:text-white transition-all flex items-center gap-1"
                  title={prevFolder ? `الذهاب للمستودع السابق: ${prevFolder.name}` : 'لا توجد مستودعات سابقة'}
                >
                  <span className="text-xs font-bold">→</span>
                </button>
                
                <div className="flex-1 text-center">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">{activeFolder.name}</h3>
                        <p className="text-[10px] text-purple-400 font-bold mt-1">{activeFolder.items.length} روابط في هذا المستودع</p>
                      </div>

                <button
                  onClick={() => nextFolder && onSelectFolder(nextFolder.id)}
                  disabled={!nextFolder}
                  className="p-1.5 rounded-lg border border-neutral-700 text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800 hover:text-white transition-all flex items-center gap-1"
                  title={nextFolder ? `الذهاب للمستودع التالي: ${nextFolder.name}` : 'لا توجد مستودعات تالية'}
                >
                  <span className="text-xs font-bold">←</span>
                </button>
              </div>

              {activeFolder.items.length === 0 ? (
                <p className="text-[10px] text-neutral-500 text-center py-4 bg-neutral-900/50 rounded">لا توجد روابط حتى الآن في هذا المستودع. اختر مستودعاً أو أضف روابط جديدة.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-400 mb-3">
                    <span>الصفحة {currentPage + 1} من {totalPages}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                        disabled={currentPage === 0}
                        className="px-2 py-1 rounded-lg border border-neutral-700 text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800"
                      >سابق</button>
                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                        disabled={currentPage >= totalPages - 1}
                        className="px-2 py-1 rounded-lg border border-neutral-700 text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800"
                      >التالي</button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar border border-neutral-800 rounded-2xl bg-neutral-950/70 p-1">
                    {currentPageItems.map((item, index) => {
                      const itemIndex = currentPage * ITEMS_PER_PAGE + index;
                      const isCurrentPlaying = currentItemIndex === itemIndex;
                      const isHidden = item.isHidden;
                      const isBroken = item.isBroken;
                      const isFavorite = item.isFavorite;
                      const domainName = extractDomain(item.url);

                      return (
                        <div
                          key={item.id}
                          onClick={() => !isHidden && onSelectItem(itemIndex)}
                          className={`p-2 rounded flex items-center justify-between gap-2 cursor-pointer transition-all ${
                            isHidden
                              ? 'opacity-40 bg-neutral-950 border border-neutral-800'
                              : isCurrentPlaying
                              ? 'bg-purple-950/40 border border-purple-800/40 text-purple-200'
                              : 'bg-neutral-900 hover:bg-neutral-855 text-neutral-300 hover:text-white'
                          } ${isBroken ? 'border-l-2 border-l-red-500' : ''}`}
                          title={isHidden ? 'مخفي' : isBroken ? 'معطوب' : domainName}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-[10px] font-bold text-neutral-500 font-mono">{itemIndex + 1}</span>
                            {item.posterUrl ? (
                              <img
                                src={item.posterUrl}
                                alt=""
                                referrerPolicy="no-referrer"
                              className={`w-7 h-9 object-cover rounded border flex-shrink-0 ${isFavorite ? 'border-amber-400' : 'border-neutral-850'}`}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                            <Film className={`w-3.5 h-3.5 flex-shrink-0 ${isCurrentPlaying ? 'text-purple-400 animate-pulse' : isFavorite ? 'text-amber-400' : 'text-neutral-500'}`} />
                            )}
                            <div className="truncate">
                              <h4 className="text-xs font-medium truncate">{cleanItemTitle(item.title)}</h4>
                              <p className="text-[9px] text-neutral-500 truncate uppercase mt-0.5 tracking-wider">{domainName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite?.(activeFolder.id, item.id);
                            }}
                            className={`p-0.5 transition-colors ${isFavorite ? 'text-amber-400' : 'text-neutral-600 hover:text-amber-300'}`}
                            title="تفضيل العنصر"
                          >
                            <Heart className={`w-3 h-3 ${isFavorite ? 'fill-current' : ''}`} />
                          </button>
                          <div className="flex flex-col">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMoveMovieUp?.(activeFolder.id, item.id);
                              }}
                              className="p-0 text-neutral-600 hover:text-neutral-300 disabled:opacity-20"
                              disabled={itemIndex === 0}
                            >
                              <ChevronUp className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMoveMovieDown?.(activeFolder.id, item.id);
                              }}
                              className="p-0 text-neutral-600 hover:text-neutral-300 disabled:opacity-20"
                              disabled={itemIndex === activeFolder.items.length - 1}
                            >
                              <ChevronDown className="w-2.5 h-2.5" />
                            </button>
                          </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onHideMovie?.(activeFolder.id, item.id);
                              }}
                              className={`p-0.5 transition-colors ${
                                isHidden
                                  ? 'text-amber-400 hover:text-amber-300'
                                  : 'text-neutral-600 hover:text-neutral-400'
                              }`}
                              title={isHidden ? 'إظهار الرابط' : 'إخفاء الرابط المعطوب'}
                            >
                              {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkBroken?.(activeFolder.id, item.id);
                              }}
                              className={`p-0.5 transition-colors ${
                                isBroken
                                  ? 'text-red-400 hover:text-red-300'
                                  : 'text-neutral-600 hover:text-neutral-400'
                              }`}
                              title={isBroken ? 'إلغاء علامة معطوبة' : 'وضع علامة كمعطوب'}
                            >
                              <AlertCircle className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* SECTION 2: List of Folders */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-neutral-200 font-semibold text-sm">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>مستودعات وروابط الحفظ ({folders.length})</span>
            </div>
            <button
              onClick={() => setShowFolderForm(!showFolderForm)}
              className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-900/20 px-2 py-1 rounded"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>مستودع جديد</span>
            </button>
          </div>

          {/* Add Folder Form */}
          {showFolderForm && (
            <form onSubmit={handleCreateFolder} className="p-3 bg-neutral-950 rounded-lg space-y-2 border border-purple-900/30">
              <input
                type="text"
                placeholder="اسم مستودع الحفظ... (مثال: أفلام عائلية)"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                required
              />
              <input
                type="text"
                placeholder="وصف بسيط..."
                value={newFolderDesc}
                onChange={(e) => setNewFolderDesc(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
              />
              <div className="flex justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowFolderForm(false)}
                  className="text-[10px] bg-neutral-800 text-neutral-400 hover:text-white px-2 py-1 rounded"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1 rounded"
                >
                  إنشاء مستودع
                </button>
              </div>
            </form>
          )}

          {/* List of Folders */}
          <div className="space-y-3">
            {folders.map((folder, folderIndex) => {
              const isSelected = folder.id === currentFolderId;
              return (
                <div
                  key={folder.id}
                  className={`rounded-lg transition-all border ${
                    isSelected
                      ? 'bg-neutral-950 border-purple-500/50 shadow'
                      : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  {/* Folder Header */}
                  <div className="p-3 flex items-center justify-between cursor-pointer" onClick={() => onSelectFolder(folder.id)}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-bold text-neutral-500 font-mono w-5 text-center">{folderIndex + 1}</span>
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: folder.color || '#a855f7' }}
                      />
                      <div className="truncate">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">{folder.name}</h3>
                        <p className="text-[10px] text-neutral-500 truncate">{folder.items.length} أفلام مدخلة</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedFolder(expandedFolder === folder.id ? null : folder.id);
                        }}
                        className="p-1 hover:text-purple-400 text-neutral-600 transition-colors text-xs"
                        title="خيارات المستودع"
                      >
                        ⚙️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFolder(folder.id);
                        }}
                        className="p-1 hover:text-red-400 text-neutral-600 transition-colors"
                        title="حذف هذا المستودع بالكامل"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Folder Options Panel */}
                  {expandedFolder === folder.id && (
                    <div className="px-3 py-2 border-t border-neutral-800 bg-neutral-950/50 space-y-2">
                      <div className="text-[10px] text-neutral-400 font-bold mb-2">خيارات الترتيب والإدارة:</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => onSortByFavorite?.(folder.id)}
                          className="py-1 px-2 text-[9px] bg-neutral-900 hover:bg-amber-900/30 text-neutral-300 hover:text-amber-300 rounded border border-neutral-800 transition-all flex items-center justify-center gap-1"
                        >
                          <Heart className="w-3 h-3" />
                          <span>بناءً على التفضيل</span>
                        </button>
                        <button
                          onClick={() => onSortByDate?.(folder.id)}
                          className="py-1 px-2 text-[9px] bg-neutral-900 hover:bg-purple-900/30 text-neutral-300 hover:text-purple-300 rounded border border-neutral-800 transition-all flex items-center justify-center gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          <span>حسب الأحدث</span>
                        </button>
                        <button
                          onClick={() => onSortByOldest?.(folder.id)}
                          className="py-1 px-2 text-[9px] bg-neutral-900 hover:bg-purple-900/20 text-neutral-300 hover:text-purple-200 rounded border border-neutral-800 transition-all flex items-center justify-center gap-1"
                        >
                          <Clock className="w-3 h-3 rotate-180" />
                          <span>حسب الأقدم</span>
                        </button>
                        <button
                          onClick={() => onSortByDomain?.(folder.id)}
                          className="py-1 px-2 text-[9px] bg-neutral-900 hover:bg-purple-900/30 text-neutral-300 hover:text-purple-300 rounded border border-neutral-800 transition-all flex items-center justify-center gap-1"
                        >
                          <Link className="w-3 h-3" />
                          <span>حسب الموقع</span>
                        </button>
                        <button
                          onClick={() => onSortByTitle?.(folder.id)}
                          className="py-1 px-2 text-[9px] bg-neutral-900 hover:bg-blue-900/30 text-neutral-300 hover:text-blue-300 rounded border border-neutral-800 transition-all flex items-center justify-center gap-1"
                        >
                          <span>📝</span>
                          <span>حسب العنوان</span>
                        </button>
                        <button
                          onClick={() => onDeleteBrokenLinks?.(folder.id)}
                          className="py-1 px-2 text-[9px] bg-red-950/30 hover:bg-red-900/50 text-red-300 hover:text-red-200 rounded border border-red-800/30 transition-all flex items-center justify-center gap-1"
                          title="حذف جميع الروابط المعطوبة"
                        >
                          <AlertCircle className="w-3 h-3" />
                          <span>حذف معطوب</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: Playback Settings & Controls (at the bottom) */}
        <div className="border-t border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
            <Settings className="w-4 h-4" />
            <span>تخصيص طريقة اختيار وعرض العناصر</span>
          </div>

          {/* Selection mode */}
          <div className="space-y-2">
            <label className="text-xs text-neutral-300 block font-medium">نظام ترتيب التشغيل:</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-950 rounded-lg">
              <button
                onClick={() => onSetPlayMode('sequential')}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
                  playMode === 'sequential'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="يتم الانتقال بالتسلسل الطبيعي للفيلم التالي"
              >
                تسلسلي 🔁
              </button>
              <button
                onClick={() => onSetPlayMode('shuffle')}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
                  playMode === 'shuffle'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="يتم اختيار الفيلم التالي عشوائياً بدون تكرار حتى تنتهي القائمة"
              >
                عشوائي 🔀
              </button>
              <button
                onClick={() => onSetPlayMode('loop')}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
                  playMode === 'loop'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="تكرار تشغيل الفيلم الحالي بشكل مستمر"
              >
                تكرار 🔂
              </button>
            </div>
          </div>

          {/* Auto Advance Method */}
          <div className="space-y-2">
            <label className="text-xs text-neutral-300 block font-medium">آلية الانتقال التلقائي:</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-950 rounded-lg">
              <button
                onClick={() => onSetAutoAdvanceTrigger('timer')}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
                  autoAdvanceTrigger === 'timer'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="الانتقال التلقائي بعد انتهاء عدد الثواني المحدد للفيلم"
              >
                مؤقت ⏱️
              </button>
              <button
                onClick={() => onSetAutoAdvanceTrigger('ended')}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
                  autoAdvanceTrigger === 'ended'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="الانتقال لروابط الفيديو المباشرة بمجرد انتهاء المقطع في المشغل"
              >
                انتهاء 🎬
              </button>
              <button
                onClick={() => onSetAutoAdvanceTrigger('manual')}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
                  autoAdvanceTrigger === 'manual'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="يدوياً فقط"
              >
                يدوياً 🛑
              </button>
            </div>
          </div>

          {/* Timer controls */}
          {autoAdvanceTrigger === 'timer' && (
            <div className="space-y-2 p-3 bg-neutral-950 rounded-xl border border-neutral-800 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-neutral-400 font-medium">مؤقت الانتقال:</label>
                <span className="text-xs font-bold text-pink-400 font-mono bg-pink-400/10 px-2 py-0.5 rounded-full">
                  {customTimerSeconds >= 60 ? `${Math.floor(customTimerSeconds / 60)}د ` : ''}{customTimerSeconds % 60} ثانية
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="1200"
                step="10"
                value={customTimerSeconds}
                onChange={(e) => onSetCustomTimerSeconds(Number(e.target.value))}
                className="w-full accent-pink-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>
          )}

        </div>
      </div>

      {/* Add Cinema Links & Presets Panel */}
      <div className="p-5 border-t border-neutral-800 bg-neutral-955 w-full space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-purple-400" />
            <span>إضافة رابط جديد</span>
          </div>
          <button
            onClick={() => setShowMovieForm(!showMovieForm)}
            className="text-[10px] font-bold text-purple-400 hover:text-purple-300"
          >
            {showMovieForm ? 'إخفاء ↑' : 'عرض ↓'}
          </button>
        </div>

        {showMovieForm && (
          <form onSubmit={handleCreateMovie} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 block">المستودع المستهدف:</label>
              <select
                value={selectedFolderIdForMovie}
                onChange={(e) => setSelectedFolderIdForMovie(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                required
              >
                <option value="">-- اختر مجلد الحفظ --</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 block">اسم الفيلم:</label>
              <input
                type="text"
                placeholder="فيلم السهرة"
                value={movieTitle}
                onChange={(e) => setMovieTitle(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 block">الرابط:</label>
              <input
                type="url"
                placeholder="https://..."
                value={movieUrl}
                onChange={(e) => setMovieUrl(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500 font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 block">صورة الغلاف (اختياري):</label>
              <input
                type="url"
                placeholder="https://..."
                value={moviePoster}
                onChange={(e) => setMoviePoster(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 block">التصنيف:</label>
                <input
                  type="text"
                  placeholder="رعب، خيال"
                  value={movieDesc}
                  onChange={(e) => setMovieDesc(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white placeholder-neutral-600 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 block">مدة العرض (دقيقة):</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={movieDuration}
                  onChange={(e) => setMovieDuration(Math.max(1, Number(e.target.value)))}
                  className="w-full text-xs px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white focus:outline-none focus:border-purple-500 font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded font-bold text-xs hover:from-purple-500 hover:to-pink-400 transition-all shadow-md shadow-purple-900/30 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إدراج الفيلم</span>
            </button>
          </form>
        )}

        {/* Quick links */}
        <div className="p-3 bg-neutral-950 rounded-lg space-y-2 border border-neutral-900">
          <div className="text-[10px] text-neutral-400 flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
            <span>روابط سريعة:</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => handleUrlPreFill('https://www.egybest.co.in/watch/12963', 'فيلم إيچي بست')}
              className="text-[9px] py-1 px-1.5 bg-neutral-900 hover:bg-neutral-800 text-purple-300 rounded border border-neutral-800 truncate"
            >
              إيجي بست 🍿
            </button>
            <button
              onClick={() => handleUrlPreFill('https://movizhome.click/rape-1976/watch/', 'موفيز هوم')}
              className="text-[9px] py-1 px-1.5 bg-neutral-900 hover:bg-neutral-800 text-pink-300 rounded border border-neutral-800 truncate"
            >
              موفيز هوم 🎬
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
