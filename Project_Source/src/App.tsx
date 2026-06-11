import React, { useState, useEffect, useRef } from 'react';
import { Folder, MovieItem, PlayMode, AutoAdvanceTrigger } from './types';
import { PRESEEDED_FOLDERS } from './data';
import { isDirectVideoLink, getEmbedUrl, extractDomain, cleanItemTitle, getDefaultVOffset } from './utils/urlHelper';
import Sidebar from './components/Sidebar';
import CinemaTheater from './components/CinemaTheater';
import FolderFullView from './components/FolderFullView';
import { Radio, Heart, HelpCircle, Sparkles, Plus, FolderHeart, Info, Download, Upload, Eye, EyeOff, Trash2, Pencil, Link, SkipBack, SkipForward, Play, Pause, Save, LayoutGrid, RefreshCw, Copy, ArrowRightLeft, ChevronUp, ChevronDown, Search, X } from 'lucide-react';

const STORAGE_KEY = 'autocinema_folders_custom_v1';
const PLAYMODE_KEY = 'autocinema_playmode';
const ADVANCE_KEY = 'autocinema_advance';
const TIMER_KEY = 'autocinema_timer_secs';
const DATA_VERSION_KEY = 'autocinema_data_version';
const DEFAULT_FOLDER_KEY = 'autocinema_default_folder_id';

export default function App() {
  // 1. Core State
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [defaultFolderId, setDefaultFolderId] = useState<string | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState<number>(0);

  // Playback parameters
  const [isPlaying, setIsPlaying] = useState<boolean>(true); // Highly requested autoplay!
  const [playMode, setPlayMode] = useState<PlayMode>('sequential');
  const [autoAdvanceTrigger, setAutoAdvanceTrigger] = useState<AutoAdvanceTrigger>('timer');
  const [customTimerSeconds, setCustomTimerSeconds] = useState<number>(60); // Default 60 seconds interval demo

  // Maximize view
  const [isFullscreenTheater, setIsFullscreenTheater] = useState<boolean>(false);

  // Drag and Drop States
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [showDropFormModal, setShowDropFormModal] = useState<boolean>(false);
  const [droppedLinkUrl, setDroppedLinkUrl] = useState<string>('');
  const [droppedLinkTitle, setDroppedLinkTitle] = useState<string>('');
  const [droppedLinkPoster, setDroppedLinkPoster] = useState<string>('');
  const [droppedLinkDesc, setDroppedLinkDesc] = useState<string>('');
  const [droppedFolderId, setDroppedFolderId] = useState<string>('');

  // Notification / logs feed for simulated broadcast event tracker
  const [logs, setLogs] = useState<Array<{ id: string; msg: string; type: 'info' | 'success' | 'warn' }>>([]);

  // Interface panels visibility
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showExtraButtons, setShowExtraButtons] = useState<boolean>(false);
  const [showFullFolderView, setShowFullFolderView] = useState<boolean>(false);
  const [showEditItemModal, setShowEditItemModal] = useState<boolean>(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);
  const [editItemTitle, setEditItemTitle] = useState<string>('');
  const [editItemUrl, setEditItemUrl] = useState<string>('');
  const [editItemDesc, setEditItemDesc] = useState<string>('');
  const [editItemPoster, setEditItemPoster] = useState<string>('');
  const [editItemDuration, setEditItemDuration] = useState<number>(5);
  const [editItemActiveTab, setEditItemActiveTab] = useState<'edit' | 'move' | 'copy'>('edit');
  const [editItemMoveTargetFolderId, setEditItemMoveTargetFolderId] = useState<string>('');
  const [editItemCopyTargetFolderId, setEditItemCopyTargetFolderId] = useState<string>('');
  const [editMovieFolderId, setEditMovieFolderId] = useState<string | null>(null);
  const [editMovieId, setEditMovieId] = useState<string | null>(null);
  const [showJsonImportModal, setShowJsonImportModal] = useState<boolean>(false);
  const [importedJsonMovies, setImportedJsonMovies] = useState<MovieItem[]>([]);
  const [importTargetFolderId, setImportTargetFolderId] = useState<string>('');
  const [importNewFolderName, setImportNewFolderName] = useState<string>('');
  const [importNewFolderDesc, setImportNewFolderDesc] = useState<string>('');
  const [importFileName, setImportFileName] = useState<string>('');
  const jsonImportInputRef = useRef<HTMLInputElement | null>(null);
  const fullBackupInputRef = useRef<HTMLInputElement | null>(null);

  // Inline folder rename within the settings modal
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState<string>('');
  const [quickUrl, setQuickUrl] = useState<string>('');
  const [quickTestItem, setQuickTestItem] = useState<MovieItem | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Array<{ folderId: string; folderName: string; item: MovieItem }>>([]);
  const [searchResultAction, setSearchResultAction] = useState<{
    key: string;
    mode: 'copy' | 'move';
    sourceFolderId: string;
    movieId: string;
    targetFolderId: string;
  } | null>(null);

  // Sync state for the manual refresh button
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncStamp, setLastSyncStamp] = useState<string>('');

  // Normalize incoming folders so titles never carry the recurring "Poster for HD" prefix.
  const normalizeFolders = (input: Folder[]): Folder[] =>
    input.map((folder) => ({
      ...folder,
      items: folder.items.map((it) => ({ ...it, title: cleanItemTitle(it.title) || it.title })),
    }));

  const restoreLocalSession = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedDefaultFolderId = localStorage.getItem(DEFAULT_FOLDER_KEY);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = normalizeFolders(parsed);
          setFolders(normalized);
          
          // Check if stored default folder exists in the loaded folders
          if (storedDefaultFolderId && normalized.some(f => f.id === storedDefaultFolderId)) {
            setDefaultFolderId(storedDefaultFolderId);
            setCurrentFolderId(storedDefaultFolderId);
          } else {
            setCurrentFolderId(normalized[0].id);
          }
        } else {
          setFolders(normalizeFolders(PRESEEDED_FOLDERS));
          setCurrentFolderId(PRESEEDED_FOLDERS[0].id);
        }
      } catch (e) {
        setFolders(normalizeFolders(PRESEEDED_FOLDERS));
        setCurrentFolderId(PRESEEDED_FOLDERS[0].id);
      }
    } else {
      setFolders(normalizeFolders(PRESEEDED_FOLDERS));
      setCurrentFolderId(PRESEEDED_FOLDERS[0].id);
    }

    const pm = localStorage.getItem(PLAYMODE_KEY) as PlayMode;
    if (pm) setPlayMode(pm);
    const adv = localStorage.getItem(ADVANCE_KEY) as AutoAdvanceTrigger;
    if (adv) setAutoAdvanceTrigger(adv);
    const tm = localStorage.getItem(TIMER_KEY);
    if (tm) setCustomTimerSeconds(Number(tm));
  };

  // Pull autocinema_data.json from the host. The file is the source of truth: any
  // valid bundle always overrides the local cached session so a fresh upload is
  // reflected on the next open (or via the manual refresh button).
  const syncFromBundledFile = async (options: { manual?: boolean } = {}): Promise<{
    applied: boolean;
    version?: string;
    foldersCount?: number;
    itemsCount?: number;
    error?: string;
  }> => {
    const { manual = false } = options;
    const dataUrl = `${import.meta.env.BASE_URL}database_chunks/autocinema_data.json?ts=${Date.now()}`;
    console.log('[autocinema-sync] fetching:', dataUrl, 'manual=', manual);
    try {
      const res = await fetch(dataUrl, { cache: 'no-store' });
      console.log('[autocinema-sync] HTTP', res.status, res.statusText);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bundled: any = await res.json();
      const fileFolders: Folder[] | undefined = Array.isArray(bundled)
        ? bundled
        : Array.isArray(bundled?.folders)
          ? bundled.folders
          : undefined;
      const fileSettings = Array.isArray(bundled)
        ? {}
        : (bundled?.settings || {}) as Partial<{
            playMode: PlayMode;
            autoAdvanceTrigger: AutoAdvanceTrigger;
            customTimerSeconds: number;
          }>;
      const fileVersion: string | undefined = Array.isArray(bundled)
        ? undefined
        : typeof bundled?.exportedAt === 'string'
          ? bundled.exportedAt
          : undefined;
      console.log('[autocinema-sync] parsed bundle:', {
        app: Array.isArray(bundled) ? 'legacy-array' : bundled?.app,
        exportedAt: fileVersion,
        foldersCount: Array.isArray(fileFolders) ? fileFolders.length : 0,
      });

      const isValidBundle = fileFolders && fileFolders.length > 0;
      if (!isValidBundle) {
        const msg = `ملف database_chunks/autocinema_data.json تم جلبه لكنه غير صالح (app=${Array.isArray(bundled) ? 'legacy-array' : bundled?.app}, folders=${fileFolders?.length ?? 0}).`;
        console.warn('[autocinema-sync]', msg);
        if (manual) addLog(msg, 'warn');
        return { applied: false, error: 'invalid-bundle' };
      }

      const cleanedFolders = normalizeFolders(fileFolders!);
      const itemsCount = cleanedFolders.reduce((sum, f) => sum + f.items.length, 0);
      setFolders(cleanedFolders);

      // Respect the default folder setting from localStorage if available
      const storedDefaultFolderId = localStorage.getItem(DEFAULT_FOLDER_KEY);
      if (storedDefaultFolderId && cleanedFolders.some(f => f.id === storedDefaultFolderId)) {
        setDefaultFolderId(storedDefaultFolderId);
        setCurrentFolderId(storedDefaultFolderId);
      } else {
        setCurrentFolderId(cleanedFolders[0].id);
      }
      
      setCurrentItemIndex(0);

      if (fileSettings.playMode === 'sequential' || fileSettings.playMode === 'shuffle' || fileSettings.playMode === 'loop') {
        setPlayMode(fileSettings.playMode);
        safeLocalStorageSetItem(PLAYMODE_KEY, fileSettings.playMode);
      }
      if (fileSettings.autoAdvanceTrigger === 'timer' || fileSettings.autoAdvanceTrigger === 'ended' || fileSettings.autoAdvanceTrigger === 'manual') {
        setAutoAdvanceTrigger(fileSettings.autoAdvanceTrigger);
        safeLocalStorageSetItem(ADVANCE_KEY, fileSettings.autoAdvanceTrigger);
      }
      if (typeof fileSettings.customTimerSeconds === 'number' && fileSettings.customTimerSeconds >= 10) {
        setCustomTimerSeconds(fileSettings.customTimerSeconds);
        safeLocalStorageSetItem(TIMER_KEY, String(fileSettings.customTimerSeconds));
      }

      if (fileVersion) safeLocalStorageSetItem(DATA_VERSION_KEY, fileVersion);
      const stamp = fileVersion ? fileVersion.slice(0, 16).replace('T', ' ') : 'بدون تاريخ';
      setLastSyncStamp(stamp);
      const baseMsg = manual
        ? `تمت المزامنة اليدوية: ${cleanedFolders.length} مستودع · ${itemsCount} عنصر · إصدار ${stamp} ✅`
        : `تم تحميل البيانات من database_chunks/autocinema_data.json: ${cleanedFolders.length} مستودع · ${itemsCount} عنصر · إصدار ${stamp} ✅`;
      addLog(baseMsg, 'success');
      console.log('[autocinema-sync] applied:', { foldersCount: cleanedFolders.length, itemsCount, version: fileVersion });
      return { applied: true, version: fileVersion, foldersCount: cleanedFolders.length, itemsCount };
    } catch (e: any) {
      const msg = `تعذّر تحميل database_chunks/autocinema_data.json (${e?.message || e}). تأكد من رفع الملف في مجلد database_chunks على الاستضافة.`;
      console.error('[autocinema-sync] failed:', e);
      if (manual) addLog(msg, 'warn');
      return { applied: false, error: e?.message || String(e) };
    }
  };

  // 2. Initial Setup & Persist
  useEffect(() => {
    // Immediate load of default folder setting from localStorage
    const savedDefaultId = localStorage.getItem(DEFAULT_FOLDER_KEY);
    if (savedDefaultId) {
      setDefaultFolderId(savedDefaultId);
    }

    let cancelled = false;
    syncFromBundledFile().then((result) => {
      if (cancelled) return;
      if (!result.applied) {
        restoreLocalSession();
        addLog('تعذّر تحميل database_chunks/autocinema_data.json، تم استرجاع الجلسة من الذاكرة المحلية.', 'warn');
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualSyncFromFile = async () => {
    setIsSyncing(true);
    addLog('جاري المزامنة من autocinema_data.json ...', 'info');
    const result = await syncFromBundledFile({ manual: true });
    setIsSyncing(false);
    if (result.applied) {
      window.alert(`✅ تمت المزامنة بنجاح\n\nالمستودعات: ${result.foldersCount}\nالعناصر: ${result.itemsCount}\nالإصدار: ${result.version ? result.version.slice(0, 16).replace('T', ' ') : 'بدون تاريخ'}`);
    } else {
      window.alert(`⚠️ فشلت المزامنة\n\n${result.error || 'سبب غير معروف'}\n\nتأكد من أن ملف autocinema_data.json موجود داخل مجلد database_chunks على الاستضافة.`);
      addLog('فشلت المزامنة اليدوية، الجلسة الحالية لم تتغير.', 'warn');
    }
  };

  // Safe localStorage helpers
  const safeLocalStorageSetItem = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.warn('[autocinema] localStorage quota exceeded, skipping save to localStorage');
      } else {
        console.error('[autocinema] Error saving to localStorage:', e);
      }
    }
  };

  // Save to LocalStorage on modifications
  useEffect(() => {
    if (folders.length > 0) {
      safeLocalStorageSetItem(STORAGE_KEY, JSON.stringify(folders));
    }
  }, [folders]);

  const addLog = (msg: string, type: 'info' | 'success' | 'warn' = 'info') => {
    const newLog = { id: Math.random().toString(), msg, type };
    setLogs((prev) => [newLog, ...prev.slice(0, 10)]);
  };

  // 3. Navigation Engine / Selection Logic
  const handleNavigateNext = () => {
    setQuickTestItem(null);
    const activeFolder = folders.find((f) => f.id === currentFolderId);
    if (!activeFolder || activeFolder.items.length === 0) return;

    let nextIndex = currentItemIndex;

    const folderLength = activeFolder.items.length;

    if (playMode === 'loop') {
      nextIndex = currentItemIndex;
      addLog(`إعادة تشغيل الفيلم الحالي بالتناوب المستمر: ${activeFolder.items[nextIndex].title}`, 'info');
    } else if (playMode === 'shuffle') {
      if (folderLength > 1) {
        // Pick random different item
        let rand = currentItemIndex;
        while (rand === currentItemIndex) {
          rand = Math.floor(Math.random() * folderLength);
        }
        nextIndex = rand;
      } else {
        nextIndex = 0;
      }
      addLog(`اختيار المادة التالية عشوائياً: ${activeFolder.items[nextIndex].title}`, 'success');
    } else {
      // Sequential play
      nextIndex = (currentItemIndex + 1) % folderLength;
      addLog(`الانتقال التلقائي المستمر للفيلم التالي بالتسلسل: ${activeFolder.items[nextIndex].title}`, 'success');
    }

    setCurrentItemIndex(nextIndex);
    setIsPlaying(true); // Auto play!
  };

  const handleNavigatePrev = () => {
    setQuickTestItem(null);
    const activeFolder = folders.find((f) => f.id === currentFolderId);
    if (!activeFolder || activeFolder.items.length === 0) return;

    const folderLength = activeFolder.items.length;
    const prevIndex = (currentItemIndex - 1 + folderLength) % folderLength;

    setCurrentItemIndex(prevIndex);
    setIsPlaying(true);
    addLog(`العودة للفيلم السابق يدوياً: ${activeFolder.items[prevIndex].title}`, 'info');
  };

  // Navigate to next folder
  const handleNavigateNextFolder = () => {
    if (folders.length === 0) return;
    
    const currentIndex = folders.findIndex((f) => f.id === currentFolderId);
    const nextIndex = (currentIndex + 1) % folders.length;
    
    setCurrentFolderId(folders[nextIndex].id);
    setCurrentItemIndex(0);
    setIsPlaying(true);
    addLog(`الانتقال للمستودع التالي: ${folders[nextIndex].name}`, 'info');
  };

  // Navigate to previous folder
  const handleNavigatePrevFolder = () => {
    if (folders.length === 0) return;
    
    const currentIndex = folders.findIndex((f) => f.id === currentFolderId);
    const prevIndex = (currentIndex - 1 + folders.length) % folders.length;
    
    setCurrentFolderId(folders[prevIndex].id);
    setCurrentItemIndex(0);
    setIsPlaying(true);
    addLog(`العودة للمستودع السابق: ${folders[prevIndex].name}`, 'info');
  };

  // 4. State Mutators
  const handleSelectFolder = (folderId: string) => {
    setQuickTestItem(null);
    setCurrentFolderId(folderId);
    setCurrentItemIndex(0);
    setIsPlaying(true);
    const target = folders.find((f) => f.id === folderId);
    if (target) {
      addLog(`تم تفعيل مستودع الحفظ النشط: ${target.name}`, 'info');
    }
  };

  const handleSelectItem = (index: number) => {
    setQuickTestItem(null);
    setCurrentItemIndex(index);
    setIsPlaying(true);
    const activeFolder = folders.find((f) => f.id === currentFolderId);
    if (activeFolder) {
      addLog(`تشغيل فوري للفيلم المختار: ${activeFolder.items[index]?.title}`, 'success');
    }
  };

  const handleAddFolder = (name: string, description: string) => {
    const newF: Folder = {
      id: 'f_' + Math.random().toString(36).substr(2, 9),
      name,
      description,
      items: [],
      color: ['#8b5cf6', '#ec4899', '#f43f5e', '#3b82f6', '#10b981', '#f59e0b'][Math.floor(Math.random() * 6)],
    };

    setFolders((prev) => [...prev, newF]);
    setCurrentFolderId(newF.id);
    setCurrentItemIndex(0);
    addLog(`تم إنشاء مستودع روابط جديد برمز لوني مخصص: ${name}`, 'success');
  };

  const handleAddMovie = (
    folderId: string,
    title: string,
    url: string,
    description: string,
    durationMinutes: number,
    posterUrl?: string
  ) => {
    const useDirect = isDirectVideoLink(url);
    const embedUrl = getEmbedUrl(url);

    const newItem: MovieItem = {
      id: 'm_' + Math.random().toString(36).substr(2, 9),
      title,
      url,
      embedUrl,
      duration: durationMinutes * 60,
      useDirectPlayer: useDirect,
      description: description || undefined,
      category: useDirect ? 'بث مباشر / مباشر' : 'مشاهدة سينمائية خارجية',
      posterUrl: posterUrl || undefined,
      addedAt: new Date().toISOString(),
      vOffset: getDefaultVOffset(url),
    };

    setFolders((prev) =>
      prev.map((f) => {
        if (f.id === folderId) {
          return {
            ...f,
            items: [...f.items, newItem],
          };
        }
        return f;
      })
    );

    addLog(`تم حفظ الفيلم "${title}" بنجاح في المستودع المختار!`, 'success');

    // If currently selected, trigger reload state safely
    if (currentFolderId === folderId) {
      const folder = folders.find((f) => f.id === folderId);
      if (folder && folder.items.length === 0) {
        setCurrentItemIndex(0);
      }
    }
  };

  const handleRenameFolder = (folderId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      addLog('اسم المستودع لا يمكن أن يكون فارغاً.', 'warn');
      return;
    }
    const target = folders.find((f) => f.id === folderId);
    if (!target) return;
    if (target.name === trimmed) {
      setEditingFolderId(null);
      return;
    }
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, name: trimmed } : f))
    );
    setEditingFolderId(null);
    addLog(`تم تعديل اسم المستودع إلى: ${trimmed}`, 'success');
  };

  const handleDeleteFolder = (folderId: string) => {
    if (folders.length <= 1) {
      addLog('تنبيه: يجب أن يتبقى مستودع واحد على الأقل لتجربة النظام.', 'warn');
      return;
    }

    const nextFolders = folders.filter((f) => f.id !== folderId);
    setFolders(nextFolders);

    if (currentFolderId === folderId) {
      setCurrentFolderId(nextFolders[0].id);
      setCurrentItemIndex(0);
    }

    addLog('تم حذف مستودع الحفظ بالكامل بنجاح.', 'warn');
  };

  const handleMoveFolderUp = (folderId: string) => {
    const index = folders.findIndex(f => f.id === folderId);
    if (index <= 0) return; // Can't move up from first position

    const newFolders = [...folders];
    const temp = newFolders[index - 1];
    newFolders[index - 1] = newFolders[index];
    newFolders[index] = temp;

    setFolders(newFolders);
    addLog('تم تحريك المستودع للأعلى.', 'info');
  };

  const handleMoveFolderDown = (folderId: string) => {
    const index = folders.findIndex(f => f.id === folderId);
    if (index >= folders.length - 1) return; // Can't move down from last position

    const newFolders = [...folders];
    const temp = newFolders[index + 1];
    newFolders[index + 1] = newFolders[index];
    newFolders[index] = temp;

    setFolders(newFolders);
    addLog('تم تحريك المستودع للأسفل.', 'info');
  };

  const handleDeleteMovie = (folderId: string, movieId: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id === folderId) {
          return {
            ...f,
            items: f.items.filter((item) => item.id !== movieId),
          };
        }
        return f;
      })
    );

    addLog('تم إزالة الفيلم من المستودع بنجاح.', 'warn');
  };

  const openEditCurrentItemModal = () => {
    const activeFolder = folders.find((f) => f.id === currentFolderId);
    const currentItem = activeFolder?.items[currentItemIndex] || null;
    if (!activeFolder || !currentItem) {
      addLog('لا يوجد عنصر حالي لتعديله.', 'warn');
      return;
    }

    setEditItemTitle(cleanItemTitle(currentItem.title) || '');
    setEditItemUrl(currentItem.url || '');
    setEditItemDesc(currentItem.description || '');
    setEditItemPoster(currentItem.posterUrl || '');
    setEditItemDuration(Math.max(1, Math.ceil(currentItem.duration / 60)));
    setEditItemActiveTab('edit');
    const otherFolders = folders.filter(f => f.id !== currentFolderId);
    setEditItemMoveTargetFolderId(otherFolders[0]?.id || '');
    setEditItemCopyTargetFolderId(otherFolders[0]?.id || '');
    setShowEditItemModal(true);
  };

  const openEditMovieModal = (folderId: string, movieId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    const item = folder?.items.find((i) => i.id === movieId);
    if (!folder || !item) {
      addLog('لم يتم العثور على العنصر لتعديله.', 'warn');
      return;
    }

    setEditItemTitle(cleanItemTitle(item.title) || '');
    setEditItemUrl(item.url || '');
    setEditItemDesc(item.description || '');
    setEditItemPoster(item.posterUrl || '');
    setEditItemDuration(Math.max(1, Math.ceil(item.duration / 60)));
    setEditItemActiveTab('edit');
    const otherFolders = folders.filter(f => f.id !== folderId);
    setEditItemMoveTargetFolderId(otherFolders[0]?.id || '');
    setEditItemCopyTargetFolderId(otherFolders[0]?.id || '');
    setEditMovieFolderId(folderId);
    setEditMovieId(movieId);
    setShowEditItemModal(true);
  };

  const handleSaveEditedCurrentItem = () => {
    const activeFolder = folders.find((f) => f.id === currentFolderId);
    const currentItem = activeFolder?.items[currentItemIndex] || null;
    if (!activeFolder || !currentItem) {
      addLog('لا يوجد عنصر حالي لتعديله.', 'warn');
      setShowEditItemModal(false);
      return;
    }

    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== activeFolder.id) return f;
        return {
          ...f,
          items: f.items.map((item, index) =>
            item.id === currentItem.id
              ? {
                  ...item,
                  title: editItemTitle.trim() || item.title,
                  url: editItemUrl.trim() || item.url,
                  embedUrl: getEmbedUrl(editItemUrl.trim() || item.url),
                  description: editItemDesc.trim() || undefined,
                  posterUrl: editItemPoster.trim() || undefined,
                  duration: Math.max(60, editItemDuration * 60),
                }
              : item
          ),
        };
      })
    );

    setShowEditItemModal(false);
    addLog(`تم تحديث بيانات العنصر: ${editItemTitle || currentItem.title}`, 'success');
  };

  const handleDeleteCurrentDisplayedItem = () => {
    const activeFolder = folders.find((f) => f.id === currentFolderId);
    const currentItem = activeFolder?.items[currentItemIndex] || null;
    if (!activeFolder || !currentItem) {
      addLog('لا يوجد عنصر حالي للحذف.', 'warn');
      setShowDeleteConfirmModal(false);
      return;
    }

    const remainingItems = activeFolder.items.filter((item) => item.id !== currentItem.id);
    const nextIndex = remainingItems.length === 0 ? 0 : Math.min(currentItemIndex, remainingItems.length - 1);

    setFolders((prev) =>
      prev.map((f) => {
        if (f.id === activeFolder.id) {
          return {
            ...f,
            items: remainingItems,
          };
        }
        return f;
      })
    );

    setCurrentItemIndex(nextIndex);
    setShowDeleteConfirmModal(false);
    setShowEditItemModal(false);
    addLog(`تم حذف العنصر الحالي: ${currentItem.title}`, 'warn');
  };

  // Move current item to another folder
  const handleMoveCurrentItem = () => {
    const activeFolder = folders.find((f) => f.id === currentFolderId);
    const currentItem = activeFolder?.items[currentItemIndex] || null;
    if (!activeFolder || !currentItem || !editItemMoveTargetFolderId) {
      addLog('لم يتم تحديد مستودع الوجهة.', 'warn');
      return;
    }
    if (editItemMoveTargetFolderId === currentFolderId) {
      addLog('المستودع المصدر والوجهة متطابقان.', 'warn');
      return;
    }
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id === activeFolder.id) {
          return { ...f, items: f.items.filter((i) => i.id !== currentItem.id) };
        }
        if (f.id === editItemMoveTargetFolderId) {
          return { ...f, items: [...f.items, currentItem] };
        }
        return f;
      })
    );
    const targetName = folders.find(f => f.id === editItemMoveTargetFolderId)?.name || '؟';
    setCurrentItemIndex(0);
    setShowEditItemModal(false);
    addLog(`تم نقل "${currentItem.title}" إلى مستودع "${targetName}" ✅`, 'success');
  };

  // Copy current item to another folder
  const handleCopyCurrentItem = () => {
    const activeFolder = folders.find((f) => f.id === currentFolderId);
    const currentItem = activeFolder?.items[currentItemIndex] || null;
    if (!activeFolder || !currentItem || !editItemCopyTargetFolderId) {
      addLog('لم يتم تحديد مستودع الوجهة.', 'warn');
      return;
    }
    const copiedItem = { ...currentItem, id: 'm_' + Math.random().toString(36).substr(2, 9), addedAt: new Date().toISOString() };
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id === editItemCopyTargetFolderId) {
          return { ...f, items: [...f.items, copiedItem] };
        }
        return f;
      })
    );
    const targetName = folders.find(f => f.id === editItemCopyTargetFolderId)?.name || '؟';
    setShowEditItemModal(false);
    addLog(`تم نسخ "${currentItem.title}" إلى مستودع "${targetName}" ✅`, 'success');
  };

  // Hide broken/non-working links
  const handleHideMovie = (folderId: string, movieId: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id === folderId) {
          return {
            ...f,
            items: f.items.map((item) => {
              if (item.id === movieId) {
                return {
                  ...item,
                  isHidden: !item.isHidden
                };
              }
              return item;
            })
          };
        }
        return f;
      })
    );

    const item = folders.find(f => f.id === folderId)?.items.find(i => i.id === movieId);
    const isHiding = !item?.isHidden;
    addLog(isHiding ? `تم إخفاء الرابط المعطوب: ${item?.title}` : `تم إظهار الرابط: ${item?.title}`, isHiding ? 'warn' : 'info');
  };

  // Mark link as broken
  const handleMarkBroken = (folderId: string, movieId: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id === folderId) {
          return {
            ...f,
            items: f.items.map((item) => {
              if (item.id === movieId) {
                return {
                  ...item,
                  isBroken: !item.isBroken
                };
              }
              return item;
            })
          };
        }
        return f;
      })
    );

    const item = folders.find(f => f.id === folderId)?.items.find(i => i.id === movieId);
    const isMarking = !item?.isBroken;
    addLog(isMarking ? `تم وضع علامة على الرابط كمعطوب: ${item?.title}` : `تم إزالة علامة الرابط المعطوب: ${item?.title}`, isMarking ? 'warn' : 'success');
  };

  // Sort folder by domain
  const handleSortFolderByDomain = (folderId: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id === folderId) {
          const sortedItems = [...f.items].sort((a, b) => {
            const domainA = extractDomain(a.url);
            const domainB = extractDomain(b.url);
            return domainA.localeCompare(domainB, 'ar');
          });
          return {
            ...f,
            items: sortedItems,
            sortBy: 'domain'
          };
        }
        return f;
      })
    );
    addLog('تم ترتيب الأفلام حسب المواقع (Domains) بنجاح', 'success');
  };

  // Sort folder by title
  const handleSortFolderByTitle = (folderId: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id === folderId) {
          const sortedItems = [...f.items].sort((a, b) => {
            return a.title.localeCompare(b.title, 'ar');
          });
          return {
            ...f,
            items: sortedItems,
            sortBy: 'title'
          };
        }
        return f;
      })
    );
    addLog('تم ترتيب الأفلام حسب العناوين بنجاح', 'success');
  };

  // Sort folder by date
  const handleSortFolderByDate = (folderId: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id === folderId) {
          const sortedItems = [...f.items].sort((a, b) => {
            return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
          });
          return {
            ...f,
            items: sortedItems,
            sortBy: 'date'
          };
        }
        return f;
      })
    );
    addLog('تم ترتيب الأفلام حسب تاريخ الإضافة (الأحدث أولاً) بنجاح', 'success');
  };

  // Delete all broken links from folder
  const handleDeleteBrokenLinks = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const brokenCount = folder.items.filter(item => item.isBroken).length;
    
    if (brokenCount === 0) {
      addLog('لا توجد روابط معطوبة في هذا المستودع.', 'info');
      return;
    }

    setFolders((prev) =>
      prev.map((f) => {
        if (f.id === folderId) {
          return {
            ...f,
            items: f.items.filter((item) => !item.isBroken)
          };
        }
        return f;
      })
    );

    addLog(`تم حذف ${brokenCount} روابط معطوبة من المستودع بنجاح`, 'warn');
  };

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results: Array<{ folderId: string; folderName: string; item: MovieItem }> = [];
    const lowerQuery = query.toLowerCase();

    folders.forEach((folder) => {
      folder.items.forEach((item) => {
        const titleMatch = item.title.toLowerCase().includes(lowerQuery);
        const descMatch = item.description?.toLowerCase().includes(lowerQuery);
        const categoryMatch = item.category?.toLowerCase().includes(lowerQuery);

        if (titleMatch || descMatch || categoryMatch) {
          results.push({
            folderId: folder.id,
            folderName: folder.name,
            item,
          });
        }
      });
    });

    setSearchResultAction(null);
    setSearchResults(results);
  };

  const closeSearchResultAction = () => {
    setSearchResultAction(null);
  };

  const handleCopySearchResultItem = (sourceFolderId: string, movieId: string) => {
    const availableFolders = folders.filter((f) => f.id !== sourceFolderId);
    setSearchResultAction({
      key: `${sourceFolderId}-${movieId}`,
      mode: 'copy',
      sourceFolderId,
      movieId,
      targetFolderId: availableFolders[0]?.id || '',
    });
  };

  const handleMoveSearchResultItem = (sourceFolderId: string, movieId: string) => {
    const availableFolders = folders.filter((f) => f.id !== sourceFolderId);
    setSearchResultAction({
      key: `${sourceFolderId}-${movieId}`,
      mode: 'move',
      sourceFolderId,
      movieId,
      targetFolderId: availableFolders[0]?.id || '',
    });
  };

  const handleChangeSearchResultTargetFolder = (targetFolderId: string) => {
    if (!searchResultAction) return;
    setSearchResultAction({ ...searchResultAction, targetFolderId });
  };

  const executeSearchResultTransfer = () => {
    if (!searchResultAction) return;

    const { sourceFolderId, movieId, targetFolderId } = searchResultAction;
    const sourceFolder = folders.find((f) => f.id === sourceFolderId);
    if (!sourceFolder) return;

    const item = sourceFolder.items.find((i) => i.id === movieId);
    if (!item) return;

    if (!targetFolderId || targetFolderId === sourceFolderId) {
      addLog(`اختر مستودعاً آخر لل${searchResultAction.mode}.`, 'warn');
      return;
    }

    if (searchResultAction.mode === 'copy') {
      const copiedItem: MovieItem = {
        ...item,
        id: 'm_' + Math.random().toString(36).substr(2, 9),
        addedAt: new Date().toISOString(),
      };

      setFolders((prev) =>
        prev.map((f) => {
          if (f.id === targetFolderId) {
            return { ...f, items: [copiedItem, ...f.items] };
          }
          return f;
        })
      );
      addLog('تم نسخ العنصر إلى المستودع المختار.', 'success');
    } else {
      setFolders((prev) =>
        prev.map((f) => {
          if (f.id === sourceFolderId) {
            return { ...f, items: f.items.filter((i) => i.id !== movieId) };
          }
          if (f.id === targetFolderId) {
            return { ...f, items: [item, ...f.items] };
          }
          return f;
        })
      );
      addLog('تم نقل العنصر إلى المستودع المختار.', 'success');
    }

    setSearchResultAction(null);
    handleSearch(searchQuery);
  };

  const handleSelectSearchResult = (folderId: string, itemIndex: number) => {
    setCurrentFolderId(folderId);
    setCurrentItemIndex(itemIndex);
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
    addLog('تم اختيار العنصر من نتائج البحث ✅', 'success');
  };

  // Playback configuration setters with persistence
  const handleSetPlayMode = (mode: PlayMode) => {
    setPlayMode(mode);
    safeLocalStorageSetItem(PLAYMODE_KEY, mode);
    addLog(`توجيه النظام لترتيب: ${mode === 'sequential' ? 'تسلسلي' : mode === 'shuffle' ? 'عشوائي' : 'تكرار'}`, 'info');
  };

  const handleSetDefaultFolder = (folderId: string) => {
    setDefaultFolderId(folderId);
    if (folderId) {
      safeLocalStorageSetItem(DEFAULT_FOLDER_KEY, folderId);
      const folder = folders.find(f => f.id === folderId);
      addLog(`تم تعيين "${folder?.name}" كمستودع افتراضي عند التشغيل.`, 'success');
    } else {
      localStorage.removeItem(DEFAULT_FOLDER_KEY);
      addLog('تم إلغاء المستودع الافتراضي.', 'info');
    }
  };

  const handleQuickTest = () => {
    if (!quickUrl.trim()) return;
    const useDirect = isDirectVideoLink(quickUrl);
    const testItem: MovieItem = {
      id: 'test-' + Date.now(),
      title: 'مشاهدة سريعة',
      url: quickUrl,
      embedUrl: getEmbedUrl(quickUrl),
      duration: 300, // 5 minutes default
      useDirectPlayer: useDirect,
      addedAt: new Date().toISOString(),
      vOffset: getDefaultVOffset(quickUrl),
    };

    if (!currentFolderId && folders.length > 0) {
      setCurrentFolderId(folders[0].id);
    }

    setQuickTestItem(testItem);
    setIsPlaying(true);
    addLog(`جاري تجربة الرابط: ${quickUrl}`, 'info');
  };

  const handleQuickAdd = () => {
    if (!quickUrl.trim()) return;
    const targetFolderId = currentFolderId || folders[0]?.id;
    if (!targetFolderId) {
      addLog("لا يوجد مستودع لإضافة الرابط إليه", "warn");
      return;
    }
    
    const useDirect = isDirectVideoLink(quickUrl);
    const newItem: MovieItem = {
      id: Date.now().toString(),
      title: 'رابط مضاف حديثاً',
      url: quickUrl,
      embedUrl: getEmbedUrl(quickUrl),
      duration: 300, // 5 minutes default
      useDirectPlayer: useDirect,
      addedAt: new Date().toISOString(),
      vOffset: getDefaultVOffset(quickUrl),
    };
    
    setFolders(prev => prev.map(f => {
      if (f.id === targetFolderId) {
        return { ...f, items: [newItem, ...f.items] };
      }
      return f;
    }));
    
    addLog(`تمت إضافة الرابط للمستودع بنجاح.`, 'success');
    setQuickUrl('');
  };

  const handleSetAutoAdvanceTrigger = (trigger: AutoAdvanceTrigger) => {
    setAutoAdvanceTrigger(trigger);
    safeLocalStorageSetItem(ADVANCE_KEY, trigger);
    addLog(`تغيير آلية الانتقال التلقائي التالي إلى: ${trigger === 'timer' ? 'المؤقت الذكي' : trigger === 'ended' ? 'نهاية الفيلم فوري' : 'يدوياً'}`, 'info');
  };

  const handleSetCustomTimerSeconds = (seconds: number) => {
    setCustomTimerSeconds(seconds);
    safeLocalStorageSetItem(TIMER_KEY, String(seconds));
  };

  const handleUpdateItemOffset = (itemId: string, offset: number) => {
    setFolders((prev) =>
      prev.map((folder) => ({
        ...folder,
        items: folder.items.map((item) =>
          item.id === itemId ? { ...item, vOffset: offset } : item
        ),
      }))
    );
  };

  // Fullscreen maximizes the active theater unit
  const handleToggleFullscreen = () => {
    setIsFullscreenTheater(!isFullscreenTheater);
    addLog(isFullscreenTheater ? 'إغلاق شاشة العرض الكاملة' : 'تكبير صورة مسرح العرض لملء الشاشة بالكامل تلقائياً 🎥', 'info');
  };

  // Import / Export JSON configs for convenient sharing
  const handleExportPlaylists = () => {
    const dataStr = JSON.stringify(folders, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'autocinema_playlists.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    addLog('تم تصدير مستودعات روابط الأفلام الحالية لملف خارجي بنجاح 🎉', 'success');
  };

  // Full backup: folders + settings, exported with the same filename the app reads
  // at startup so the user can drop it next to index.html on the host to replace the
  // previous copy and have the app load the updated data automatically.
  const handleExportFullBackup = () => {
    const backup = {
      app: 'autocinema',
      version: 1,
      exportedAt: new Date().toISOString(),
      folders,
      settings: {
        playMode,
        autoAdvanceTrigger,
        customTimerSeconds,
      },
    };
    const dataStr = JSON.stringify(backup, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const now = new Date();
    const fileNameDate = `${String(now.getDate()).padStart(2, '0')}-${now.getMonth() + 1}-${now.getFullYear()}`;
    const fileName = `${fileNameDate}-autocinema_data.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', fileName);
    linkElement.click();
    addLog(`تم تصدير ${fileName} — ارفعه داخل مجلد database_chunks على الاستضافة ليحلّ محل القديم ويُحمَّل تلقائياً عند فتح التطبيق 💾`, 'success');
  };

  const handleImportFullBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || parsed.app !== 'autocinema' || !Array.isArray(parsed.folders)) {
          addLog('ملف النسخة الاحتياطية غير صالح أو لا يخص هذا التطبيق.', 'warn');
          return;
        }
        const confirmRestore = window.confirm(
          'سيتم استبدال جميع المستودعات والإعدادات الحالية بمحتوى ملف النسخة الاحتياطية. هل تريد المتابعة؟'
        );
        if (!confirmRestore) return;

        setFolders(parsed.folders);
        setCurrentFolderId(parsed.folders[0]?.id || null);
        setCurrentItemIndex(0);

        const s = parsed.settings || {};
        if (s.playMode === 'sequential' || s.playMode === 'shuffle' || s.playMode === 'loop') {
          setPlayMode(s.playMode);
          safeLocalStorageSetItem(PLAYMODE_KEY, s.playMode);
        }
        if (s.autoAdvanceTrigger === 'timer' || s.autoAdvanceTrigger === 'ended' || s.autoAdvanceTrigger === 'manual') {
          setAutoAdvanceTrigger(s.autoAdvanceTrigger);
          safeLocalStorageSetItem(ADVANCE_KEY, s.autoAdvanceTrigger);
        }
        if (typeof s.customTimerSeconds === 'number' && s.customTimerSeconds >= 10) {
          setCustomTimerSeconds(s.customTimerSeconds);
          safeLocalStorageSetItem(TIMER_KEY, String(s.customTimerSeconds));
        }

        // Mirror the imported file's version so the auto-sync on next launch
        // does not override a manual restore with the bundled JSON contents.
        if (typeof parsed.exportedAt === 'string' && parsed.exportedAt) {
          safeLocalStorageSetItem(DATA_VERSION_KEY, parsed.exportedAt);
        }

        addLog(`تم استعادة النسخة الاحتياطية بنجاح (${parsed.folders.length} مستودع) ✅`, 'success');
      } catch (error) {
        addLog('خطأ في قراءة ملف النسخة الاحتياطية: بنية JSON غير سليمة.', 'warn');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const openFullBackupFileInput = () => {
    fullBackupInputRef.current?.click();
  };

  const normalizeJsonItem = (raw: any): MovieItem | null => {
    if (!raw || typeof raw !== 'object') return null;

    // Extract title - check common field names
    const title =
      raw.title ||
      raw.name ||
      raw.movies_name ||
      raw.series_name ||
      raw.movie_name ||
      raw.series_title ||
      'فيلم مستورد';

    // Extract URL - prioritize primary fields
    const url =
      raw.url ||
      raw.link ||
      raw.href ||
      raw.movies_href ||
      raw.series_href ||
      raw.movie_url ||
      raw.series_url ||
      raw.movies_alt_href ||
      raw.url2 ||
      '';

    if (!url || typeof url !== 'string') return null;

    // Extract poster image - prioritize bgImage for recent exports
    const posterUrl =
      raw.bgImage ||
      raw.imageUrl ||
      raw.posterUrl ||
      raw.image ||
      raw.movies_img ||
      raw.series_img ||
      raw.poster ||
      undefined;

    const description =
      raw.description ||
      raw.summary ||
      raw.movies_description ||
      raw.series_description ||
      undefined;

    const duration = Number(
      raw.duration ||
      raw.time ||
      raw.movies_duration ||
      raw.series_duration ||
      raw.length ||
      300
    );

    const category =
      raw.category ||
      raw.type ||
      raw.movies_category ||
      raw.series_category ||
      'مستورد JSON';

    return {
      id: raw.id || 'm_' + Math.random().toString(36).substr(2, 9),
      title: cleanItemTitle(String(title)) || String(title),
      url: String(url),
      embedUrl: getEmbedUrl(String(url)),
      duration: duration > 0 ? Math.floor(duration) : 300,
      useDirectPlayer: isDirectVideoLink(String(url)),
      description: description ? String(description) : undefined,
      posterUrl: posterUrl ? String(posterUrl) : undefined,
      category: String(category),
      addedAt: raw.addedAt || new Date().toISOString(),
      isHidden: raw.isHidden === true || raw.hidden === true || raw.movies_hidden === true,
      isBroken: raw.isBroken === true,
      vOffset: typeof raw.vOffset === 'number' ? raw.vOffset : getDefaultVOffset(String(url)),
    };
  };

  const extractMoviesFromJson = (parsed: any): MovieItem[] => {
    if (!parsed) return [];

    const ensureArray = (value: any) => (Array.isArray(value) ? value : []);
    
    // Find the first array with actual items
    const candidateArray = 
      ensureArray(parsed.movies_info).length > 0 ? ensureArray(parsed.movies_info) :
      ensureArray(parsed.series_info).length > 0 ? ensureArray(parsed.series_info) :
      ensureArray(parsed.movies).length > 0 ? ensureArray(parsed.movies) :
      ensureArray(parsed.series).length > 0 ? ensureArray(parsed.series) :
      ensureArray(parsed.items).length > 0 ? ensureArray(parsed.items) :
      [];

    if (candidateArray.length > 0) {
      return candidateArray.map(normalizeJsonItem).filter((item): item is MovieItem => item !== null);
    }

    if (Array.isArray(parsed)) {
      const folderLike = parsed.filter((item) => item && typeof item === 'object' && Array.isArray(item.items));
      if (folderLike.length === parsed.length) {
        return parsed
          .flatMap((folderItem: any) => ensureArray(folderItem.items))
          .map(normalizeJsonItem)
          .filter((item): item is MovieItem => item !== null);
      }

      return parsed.map(normalizeJsonItem).filter((item): item is MovieItem => item !== null);
    }

    if (typeof parsed === 'object' && parsed !== null) {
      if ('name' in parsed && Array.isArray(parsed.items)) {
        return parsed.items.map(normalizeJsonItem).filter((item): item is MovieItem => item !== null);
      }

      const single = normalizeJsonItem(parsed);
      return single ? [single] : [];
    }

    return [];
  };

  const prepareJsonImport = (parsed: any, sourceName?: string) => {
    const preparedItems = extractMoviesFromJson(parsed);
    if (preparedItems.length === 0) {
      addLog(
        'لا يوجد عناصر أفلام صالحة في ملف JSON. تحقق من أن الملف يحتوي على "items" مع حقول "url"، "name"، و"bgImage".',
        'warn'
      );
      return;
    }

    setImportedJsonMovies(preparedItems);
    setImportTargetFolderId(currentFolderId || folders[0]?.id || '');
    setImportNewFolderName('');
    setImportNewFolderDesc('');
    setImportFileName(sourceName || 'json-import');
    setShowJsonImportModal(true);
    addLog(`تم قراءة ${preparedItems.length} عنصراً من ملف JSON.`, 'info');
  };

  const handleImportPlaylists = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        prepareJsonImport(parsed, file.name);
      } catch (error) {
        addLog('خطأ في قراءة ملف التكوين: يرجى التحقق من بنية JSON.', 'warn');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = ''; // Reset input to allow re-selecting same file if needed
  };

  const openJsonImportFileInput = () => {
    jsonImportInputRef.current?.click();
  };

  const createImportFolder = (name: string, description?: string): Folder => ({
    id: 'f_' + Math.random().toString(36).substr(2, 9),
    name,
    description: description || '',
    items: [],
    color: ['#8b5cf6', '#ec4899', '#f43f5e', '#3b82f6', '#10b981', '#f59e0b'][Math.floor(Math.random() * 6)],
  });

  const handleConfirmJsonImport = () => {
    if (importedJsonMovies.length === 0) {
      addLog('لا يوجد عناصر ليتم استيرادها.', 'warn');
      return;
    }

    const createNewFolder = importNewFolderName.trim().length > 0;
    let targetFolderId = importTargetFolderId;
    let nextFolders = [...folders];

    if (!targetFolderId && !createNewFolder) {
      addLog('الرجاء تحديد مستودع موجود أو إنشاء مستودع جديد قبل الإضافة.', 'warn');
      return;
    }

    if (createNewFolder) {
      targetFolderId = 'f_' + Math.random().toString(36).substr(2, 9);
      const newFolder: Folder = {
        id: targetFolderId,
        name: importNewFolderName.trim(),
        description: importNewFolderDesc.trim(),
        items: [],
        color: ['#8b5cf6', '#ec4899', '#f43f5e', '#3b82f6', '#10b981', '#f59e0b'][Math.floor(Math.random() * 6)],
      };
      nextFolders = [...nextFolders, newFolder];
    }

    nextFolders = nextFolders.map((folder) => {
      if (folder.id === targetFolderId) {
        return {
          ...folder,
          items: [...folder.items, ...importedJsonMovies],
        };
      }
      return folder;
    });

    setFolders(nextFolders);
    setCurrentFolderId(targetFolderId);
    setCurrentItemIndex(0);
    setShowJsonImportModal(false);
    addLog(`تم إضافة ${importedJsonMovies.length} عناصر من ملف JSON إلى المستودع بنجاح.`, 'success');
  };

  const handleConfirmJsonImportGroupedByDomain = () => {
    if (importedJsonMovies.length === 0) {
      addLog('لا يوجد عناصر ليتم استيرادها.', 'warn');
      return;
    }

    const groupedByDomain = importedJsonMovies.reduce((acc: Record<string, MovieItem[]>, item) => {
      const domain = extractDomain(item.url) || 'موقع غير معروف';
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(item);
      return acc;
    }, {});

    let nextFolders = [...folders];
    const createdFolderIds: string[] = [];

    (Object.entries(groupedByDomain) as Array<[string, MovieItem[]]>).forEach(([domain, items]) => {
      const existingFolder = nextFolders.find((folder) => folder.name === domain);
      if (existingFolder) {
        existingFolder.items = [...existingFolder.items, ...items];
      } else {
        const newFolder = createImportFolder(domain, `مستودع مستورد تلقائياً من ${importFileName}`);
        newFolder.items = items;
        nextFolders.push(newFolder);
        createdFolderIds.push(newFolder.id);
      }
    });

    if (createdFolderIds.length === 0) {
      addLog('لم يتم إنشاء أي مستودعات جديدة لأن جميع المواقع موجودة بالفعل.', 'info');
    }

    setFolders(nextFolders);
    setCurrentFolderId(createdFolderIds[0] || currentFolderId || nextFolders[0]?.id || null);
    setCurrentItemIndex(0);
    setShowJsonImportModal(false);
    addLog(`تم إضافة ${importedJsonMovies.length} عنصرًا من JSON مقسمة حسب المواقع.`, 'success');
  };

  const handleCancelJsonImport = () => {
    setShowJsonImportModal(false);
    setImportedJsonMovies([]);
    setImportFileName('');
  };

  const handleSaveDroppedMovie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!droppedLinkUrl || !droppedLinkTitle.trim()) return;
    
    const targetFolderId = droppedFolderId || currentFolderId || folders[0]?.id;
    if (!targetFolderId) {
      addLog("تنبيه: الرجاء إنشاء مجلد أولاً لحفظ الفيلم.", "warn");
      return;
    }

    handleAddMovie(
      targetFolderId,
      droppedLinkTitle.trim(),
      droppedLinkUrl.trim(),
      droppedLinkDesc.trim(),
      5, // default
      droppedLinkPoster.trim() || undefined
    );

    setShowDropFormModal(false);
    setDroppedLinkUrl('');
    setDroppedLinkTitle('');
    setDroppedLinkPoster('');
    setDroppedLinkDesc('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    // Check for dropped JSON files
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/json" || file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target?.result as string);
            prepareJsonImport(parsed, file.name);
          } catch (err) {
            addLog("خطأ في قراءة ملف JSON المغسول", "warn");
          }
        };
        reader.readAsText(file);
        return;
      }
    }

    // Check for dragged link/URL text
    const textData = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (textData && textData.trim()) {
      const droppedUrl = textData.trim();
      if (droppedUrl.startsWith('http://') || droppedUrl.startsWith('https://')) {
        setDroppedLinkUrl(droppedUrl);
        setDroppedLinkTitle('');
        setDroppedLinkPoster('');
        setDroppedLinkDesc('');
        setDroppedFolderId(currentFolderId || folders[0]?.id || '');
        setShowDropFormModal(true);
        addLog(`تم التقاط رابط الفيديو بنجاح! يرجى كتابة التفاصيل.`, 'success');
      } else {
        addLog("العنصر الملقى ليس رابط انترنت صالح", "warn");
      }
    }
  };

    const activeFolder = folders.find((f) => f.id === currentFolderId) || null;
  const currentItem = quickTestItem || activeFolder?.items[currentItemIndex] || null;

  return (
    <div
      className="h-screen bg-neutral-950 text-white font-sans flex flex-col antialiased selection:bg-purple-600 selection:text-white relative overflow-hidden"
      dir="rtl"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Absolute Header (Only shown when not maximized screen) */}
      {!isFullscreenTheater && (
        <>
          <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-md sticky top-0 z-30 flex flex-col gap-2 px-3 py-2 sm:px-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 justify-between w-full sm:w-auto">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-lg text-white font-bold text-xs tracking-widest shadow-md">
                  <span>سينما 🎥</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-sm sm:text-base font-bold text-white tracking-wide">AutoCinema - مسرح البث التلقائي</h1>
                </div>
              </div>
              
              {/* Mobile-only button group */}
              <div className="flex items-center gap-1 sm:hidden">
                <button
                  onClick={handleNavigatePrevFolder}
                  disabled={folders.length === 0}
                  className="p-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded-lg transition-all border border-neutral-750 disabled:opacity-30"
                  title="المستودع السابق"
                >
                  <SkipBack className="w-3 h-3" />
                </button>
                <button
                  onClick={handleNavigatePrev}
                  disabled={!activeFolder || activeFolder.items.length === 0}
                  className="p-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded-lg transition-all border border-neutral-750 disabled:opacity-30"
                  title="العنصر السابق"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => {
                    setIsPlaying((prev) => !prev);
                    addLog(isPlaying ? 'إيقاف التشغيل المؤقت.' : 'تشغيل القائمة الحالية.', 'info');
                  }}
                  className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all border border-purple-700"
                  title={isPlaying ? 'إيقاف' : 'تشغيل'}
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>
                <button
                  onClick={handleNavigateNext}
                  disabled={!activeFolder || activeFolder.items.length === 0}
                  className="p-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded-lg transition-all border border-neutral-750 disabled:opacity-30"
                  title="العنصر التالي"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button
                  onClick={handleNavigateNextFolder}
                  disabled={folders.length === 0}
                  className="p-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded-lg transition-all border border-neutral-750 disabled:opacity-30"
                  title="المستودع التالي"
                >
                  <SkipForward className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Navigation Controls with Frames */}
            <div className="hidden sm:flex items-center gap-3 flex-1">
              {/* Locations (Folders) Frame */}
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-neutral-900/60 rounded-lg border border-cyan-500/30 backdrop-blur-sm">
                <span className="text-[8px] font-bold text-cyan-400 tracking-wider px-1">المواقع</span>
                <button
                  onClick={handleNavigatePrevFolder}
                  disabled={folders.length === 0}
                  className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-cyan-300 rounded-lg transition-all border border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="المستودع السابق"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNavigateNextFolder}
                  disabled={folders.length === 0}
                  className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-cyan-300 rounded-lg transition-all border border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="المستودع التالي"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick URL Input Field - Centered */}
              <div className="flex-1 flex items-center gap-1.5 bg-neutral-950/50 rounded-lg px-2 py-1 border border-neutral-800/50">
                <input
                  type="text"
                  value={quickUrl}
                  onChange={(e) => setQuickUrl(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="ضع رابط الفيديو هنا لتجربته..."
                  className="flex-1 bg-transparent text-[10px] text-neutral-300 placeholder-neutral-600 focus:outline-none"
                />
                <div className="flex items-center gap-1 border-r border-neutral-800 pr-1.5 mr-0.5">
                  <button
                    onClick={() => {
                      if (quickUrl.trim()) {
                        handleSearch(quickUrl);
                        setShowSearchModal(true);
                      }
                    }}
                    className="p-1 hover:bg-blue-600/20 text-blue-400 rounded transition-all disabled:opacity-30"
                    disabled={!quickUrl.trim()}
                    title="البحث عن عناصر في جميع المستودعات"
                  >
                    <Search className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleQuickTest}
                    disabled={!quickUrl.trim()}
                    className="p-1 hover:bg-purple-600/20 text-purple-400 rounded transition-all disabled:opacity-30"
                    title="تجربة تشغيل الرابط"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleQuickAdd}
                    disabled={!quickUrl.trim()}
                    className="p-1 hover:bg-emerald-600/20 text-emerald-400 rounded transition-all disabled:opacity-30"
                    title="إضافة للمستودع المختار"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Elements (Items) Frame */}
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-neutral-900/60 rounded-lg border border-emerald-500/30 backdrop-blur-sm">
                <span className="text-[8px] font-bold text-emerald-400 tracking-wider px-1">العناصر</span>
                <button
                  onClick={handleNavigatePrev}
                  disabled={!activeFolder || activeFolder.items.length === 0}
                  className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-emerald-300 rounded-lg transition-all border border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="العنصر السابق"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setIsPlaying((prev) => !prev);
                    addLog(isPlaying ? 'إيقاف التشغيل المؤقت.' : 'تشغيل القائمة الحالية.', 'info');
                  }}
                  className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all border border-purple-700"
                  title={isPlaying ? 'إيقاف' : 'تشغيل'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleNavigateNext}
                  disabled={!activeFolder || activeFolder.items.length === 0}
                  className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-emerald-300 rounded-lg transition-all border border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="العنصر التالي"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-start">
              {/* Edit current item button */}
              <button
                onClick={openEditCurrentItemModal}
                disabled={!currentItem}
                className="px-1.5 py-1 bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 hover:text-white text-[9px] font-bold rounded-lg transition-all flex items-center gap-0.5 border border-amber-700/60 disabled:opacity-30 disabled:cursor-not-allowed"
                title={currentItem ? `تعديل: ${currentItem.title}` : 'لا يوجد عنصر حالي'}
              >
                <Pencil className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">تعديل</span>
              </button>

              <button
                onClick={() => setShowFullFolderView(true)}
                disabled={!activeFolder}
                className="px-1.5 py-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white text-[9px] font-bold rounded-lg transition-all flex items-center gap-0.5 border border-neutral-750 disabled:opacity-40 disabled:cursor-not-allowed"
                title="عرض المستودع كاملاً"
              >
                <LayoutGrid className="w-2.5 h-2.5 text-emerald-300" />
                <span className="hidden sm:inline">المستودع</span>
              </button>
              <button
                onClick={() => setShowSidebar((prev) => !prev)}
                className="px-1.5 py-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white text-[9px] font-bold rounded-lg transition-all flex items-center gap-0.5 border border-neutral-750"
              >
                {showSidebar ? <EyeOff className="w-2.5 h-2.5 text-orange-300" /> : <Eye className="w-2.5 h-2.5 text-cyan-300" />}
                <span className="hidden sm:inline">{showSidebar ? 'إخفاء' : 'إظهار'}</span>
              </button>

              {/* Toggle Extra Buttons */}
              {showExtraButtons && (
                <>
                  <button
                    onClick={() => setShowSettingsModal(!showSettingsModal)}
                    className="px-1.5 py-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white text-[9px] font-bold rounded-lg transition-all flex items-center gap-0.5 border border-neutral-750"
                  >
                    <Info className="w-2.5 h-2.5 text-cyan-300" />
                    <span className="hidden sm:inline">الإعدادات</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleManualSyncFromFile}
                    disabled={isSyncing}
                    className="px-1.5 py-1 bg-emerald-900/40 hover:bg-emerald-900/70 text-emerald-200 hover:text-white text-[9px] font-bold rounded-lg transition-all flex items-center gap-0.5 border border-emerald-800 disabled:opacity-60 disabled:cursor-wait"
                    title={lastSyncStamp ? `مزامنة من database_chunks/autocinema_data.json (آخر مزامنة: ${lastSyncStamp})` : 'مزامنة البيانات من database_chunks'}
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">تحديث</span>
                  </button>

                  <button
                    onClick={handleExportFullBackup}
                    className="p-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded-lg transition-all border border-neutral-750"
                    title="تصدير النسخة الاحتياطية بالتاريخ (dd-m-yyyy-autocinema_data.json)"
                  >
                    <Download className="w-2.5 h-2.5" />
                  </button>
                </>
              )}

              {/* Toggle Extra Buttons Button - at leftmost */}
              <button
                onClick={() => setShowExtraButtons((prev) => !prev)}
                className="px-1.5 py-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white text-[9px] font-bold rounded-lg transition-all flex items-center gap-0.5 border border-neutral-750"
                title={showExtraButtons ? 'إخفاء الأزرار الإضافية' : 'إظهار الأزرار الإضافية'}
              >
                {showExtraButtons ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
              </button>

              <input
                id="json-import-input"
                ref={jsonImportInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportPlaylists}
                className="hidden"
              />
              <input
                id="full-backup-input"
                ref={fullBackupInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFullBackup}
                className="hidden"
              />
            </div>
          </header>

          {showSettingsModal && (
            <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
              <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-3xl p-5 shadow-2xl text-sm">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-white">الإعدادات</h2>
                    <p className="text-xs text-neutral-400">تحكم في التشغيل، إدارة المستودعات، وإضافة روابط جديدة بسرعة.</p>
                  </div>
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="px-3 py-1 rounded-xl bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-700"
                  >
                    إغلاق
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-12">
                  <section className="space-y-3 rounded-3xl border border-neutral-800 bg-neutral-900 p-4 md:col-span-2">
                    <h3 className="text-sm font-semibold text-white">تشغيل الفيديو</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleSetPlayMode('sequential')}
                        className={`w-full text-left px-3 py-2 rounded-2xl border ${playMode === 'sequential' ? 'border-purple-500 bg-purple-950 text-white' : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'}`}
                      >تسلسلي</button>
                      <button
                        onClick={() => handleSetPlayMode('shuffle')}
                        className={`w-full text-left px-3 py-2 rounded-2xl border ${playMode === 'shuffle' ? 'border-purple-500 bg-purple-950 text-white' : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'}`}
                      >عشوائي</button>
                      <button
                        onClick={() => handleSetPlayMode('loop')}
                        className={`w-full text-left px-3 py-2 rounded-2xl border ${playMode === 'loop' ? 'border-purple-500 bg-purple-950 text-white' : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'}`}
                      >تكرار</button>
                    </div>
                    <h4 className="text-xs font-semibold text-neutral-400">الانتقال التلقائي</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleSetAutoAdvanceTrigger('timer')}
                        className={`w-full text-left px-3 py-2 rounded-2xl border ${autoAdvanceTrigger === 'timer' ? 'border-cyan-500 bg-cyan-950 text-white' : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'}`}
                      >بواسطة المؤقت</button>
                      <button
                        onClick={() => handleSetAutoAdvanceTrigger('ended')}
                        className={`w-full text-left px-3 py-2 rounded-2xl border ${autoAdvanceTrigger === 'ended' ? 'border-cyan-500 bg-cyan-950 text-white' : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'}`}
                      >بعد انتهاء الفيلم</button>
                      <button
                        onClick={() => handleSetAutoAdvanceTrigger('manual')}
                        className={`w-full text-left px-3 py-2 rounded-2xl border ${autoAdvanceTrigger === 'manual' ? 'border-cyan-500 bg-cyan-950 text-white' : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'}`}
                      >يدوياً</button>
                    </div>
                  </section>
                  <section className="space-y-3 rounded-3xl border border-neutral-800 bg-neutral-900 p-4 md:col-span-8">
                    <h3 className="text-sm font-semibold text-white">إدارة المستودعات</h3>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">المستودع الافتراضي عند التشغيل</label>
                      <select
                        value={defaultFolderId || ''}
                        onChange={(e) => handleSetDefaultFolder(e.target.value)}
                        className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-purple-500 outline-none"
                      >
                        <option value="">بدون (أول مستودع دائماً)</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-neutral-800">
                      <h4 className="text-xs font-semibold text-neutral-400">خيارات الترتيب</h4>
                      <button
                        onClick={() => activeFolder && handleSortFolderByTitle(activeFolder.id)}
                        className="w-full px-3 py-2 rounded-2xl border border-neutral-700 text-neutral-300 hover:border-neutral-500 text-left text-xs"
                      >ترتيب حسب العنوان</button>
                      <button
                        onClick={() => activeFolder && handleSortFolderByDate(activeFolder.id)}
                        className="w-full px-3 py-2 rounded-2xl border border-neutral-700 text-neutral-300 hover:border-neutral-500"
                      >ترتيب حسب تاريخ الإضافة</button>
                      <button
                        onClick={() => activeFolder && handleSortFolderByDomain(activeFolder.id)}
                        className="w-full px-3 py-2 rounded-2xl border border-neutral-700 text-neutral-300 hover:border-neutral-500"
                      >ترتيب حسب الموقع</button>
                      <button
                        onClick={() => activeFolder && handleDeleteBrokenLinks(activeFolder.id)}
                        className="w-full px-3 py-2 rounded-2xl border border-red-600 text-red-300 hover:bg-red-950"
                      >حذف الروابط المعطلة</button>
                    </div>
                    <div className="space-y-2 pt-3 border-t border-neutral-800">
                      <h4 className="text-xs font-semibold text-neutral-400">تعديل أسماء المستودعات</h4>
                      <ul className="space-y-1.5 pr-1">
                        {folders.map((folder, folderIndex) => (
                          <li key={folder.id} className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-neutral-500 font-mono w-4 text-center">{folderIndex + 1}</span>
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: folder.color || '#a855f7' }}
                            />
                            {editingFolderId === folder.id ? (
                              <>
                                <input
                                  type="text"
                                  value={editingFolderName}
                                  onChange={(e) => setEditingFolderName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameFolder(folder.id, editingFolderName);
                                    if (e.key === 'Escape') setEditingFolderId(null);
                                  }}
                                  className="flex-1 text-xs px-2 py-1 bg-neutral-950 border border-purple-700 rounded text-white focus:outline-none focus:border-purple-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleRenameFolder(folder.id, editingFolderName)}
                                  className="px-2 py-1 text-[10px] rounded bg-purple-600 hover:bg-purple-500 text-white"
                                  title="حفظ الاسم الجديد"
                                >حفظ</button>
                                <button
                                  onClick={() => setEditingFolderId(null)}
                                  className="px-2 py-1 text-[10px] rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                                  title="إلغاء التعديل"
                                >إلغاء</button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 text-xs text-neutral-200 truncate" title={folder.name}>{folder.name}</span>
                                <span className="text-[10px] text-purple-400 font-bold">{folder.items.length}</span>
                                <button
                                  onClick={() => handleMoveFolderUp(folder.id)}
                                  disabled={folderIndex === 0}
                                  className="p-1 rounded text-neutral-400 hover:text-emerald-300 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="تحريك لأعلى"
                                >
                                  <ChevronUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleMoveFolderDown(folder.id)}
                                  disabled={folderIndex === folders.length - 1}
                                  className="p-1 rounded text-neutral-400 hover:text-cyan-300 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="تحريك للأسفل"
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingFolderId(folder.id);
                                    setEditingFolderName(folder.name);
                                  }}
                                  className="p-1 rounded text-neutral-400 hover:text-purple-300 hover:bg-neutral-800"
                                  title="تعديل اسم المستودع"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`هل أنت متأكد من حذف المستودع "${folder.name}" بالكامل؟`)) {
                                      handleDeleteFolder(folder.id);
                                    }
                                  }}
                                  className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-neutral-800"
                                  title="حذف المستودع"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                  <section className="space-y-3 rounded-3xl border border-neutral-800 bg-neutral-900 p-4 md:col-span-2">
                    <h3 className="text-sm font-semibold text-white">روابط جديدة وسريعة</h3>
                    <p className="text-xs text-neutral-400">أضف رابطاً جديداً أو استورد ملف JSON ثم اختر المكان المناسب.</p>
                    <button
                      onClick={() => {
                        setShowDropFormModal(true);
                        setShowSettingsModal(false);
                      }}
                      className="w-full px-3 py-2 rounded-2xl border border-neutral-700 text-neutral-300 hover:border-neutral-500"
                    >إضافة رابط جديد</button>
                    <button
                      onClick={() => {
                        setShowSettingsModal(false);
                        openJsonImportFileInput();
                      }}
                      className="w-full px-3 py-2 rounded-2xl border border-neutral-700 text-neutral-300 hover:border-neutral-500"
                    >استيراد JSON</button>
                  </section>
                </div>
                <section className="mt-4 space-y-3 rounded-3xl border border-neutral-800 bg-neutral-900 p-4">
                  <div className="flex items-center gap-2">
                    <Save className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">النسخ الاحتياطي لبيانات التطبيق</h3>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    يتم التصدير باسم <span className="font-mono text-emerald-300">dd-m-yyyy-autocinema_data.json</span>. ارفع الملف داخل مجلد <span className="font-mono text-amber-300">database_chunks/</span> على الاستضافة ليحلّ محل القديم ويُحمَّل تلقائياً عند فتح التطبيق. يشمل: المستودعات، الأفلام، نظام الترتيب، آلية الانتقال، ومدة المؤقت.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={handleExportFullBackup}
                      className="px-3 py-2 rounded-2xl border border-emerald-700 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 flex items-center justify-center gap-2"
                      title="تصدير النسخة الاحتياطية بالتاريخ"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تصدير النسخة الاحتياطية بالتاريخ</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowSettingsModal(false);
                        openFullBackupFileInput();
                      }}
                      className="px-3 py-2 rounded-2xl border border-amber-700 bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 flex items-center justify-center gap-2"
                      title="استعادة المستودعات والإعدادات من ملف محلي"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>استيراد ملف محلي</span>
                    </button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {showJsonImportModal && (
            <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
              <div className="w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-3xl p-5 shadow-2xl text-sm">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-white">استيراد JSON</h2>
                    <p className="text-xs text-neutral-400">اختر المستودع أو أنشئ مستودعاً جديداً قبل إدراج العناصر.</p>
                  </div>
                  <button
                    onClick={handleCancelJsonImport}
                    className="px-3 py-1 rounded-xl bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-700"
                  >
                    إلغاء
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="text-xs text-neutral-400">ملف: {importFileName} · عناصر: {importedJsonMovies.length}</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <label className="block text-xs font-semibold text-neutral-400">المستودع المستهدف</label>
                      <select
                        value={importTargetFolderId}
                        onChange={(e) => setImportTargetFolderId(e.target.value)}
                        className="w-full rounded-2xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
                      >
                        {folders.map((folder) => (
                          <option key={folder.id} value={folder.id}>
                            {folder.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-neutral-500">يتم استخدام هذا المستودع إذا لم تدخل اسم مستودع جديد.</p>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-xs font-semibold text-neutral-400">مستودع جديد (اختياري)</label>
                      <input
                        type="text"
                        value={importNewFolderName}
                        onChange={(e) => setImportNewFolderName(e.target.value)}
                        placeholder="اسم المستودع الجديد"
                        className="w-full rounded-2xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
                      />
                      <input
                        type="text"
                        value={importNewFolderDesc}
                        onChange={(e) => setImportNewFolderDesc(e.target.value)}
                        placeholder="وصف المستودع الجديد"
                        className="w-full rounded-2xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>
                  <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-4 max-h-56 overflow-y-auto">
                    <h3 className="text-sm font-semibold text-white mb-3">معاينة العناصر</h3>
                    <ul className="space-y-2 text-neutral-300 text-xs">
                      {importedJsonMovies.slice(0, 12).map((item) => (
                        <li key={item.id} className="rounded-2xl bg-neutral-950/80 px-3 py-2 border border-neutral-800">
                          <div className="font-semibold text-white">{item.title}</div>
                          <div className="truncate text-[11px] text-neutral-500">{item.url}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:items-center">
                    <button
                      onClick={handleConfirmJsonImportGroupedByDomain}
                      className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-cyan-600 text-white hover:bg-cyan-500"
                    >
                      إضافة تلقائياً حسب الموقع
                    </button>
                    <button
                      onClick={handleConfirmJsonImport}
                      className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-purple-600 text-white hover:bg-purple-500"
                    >
                      إضافة إلى مستودع واحد
                    </button>
                    <button
                      onClick={handleCancelJsonImport}
                      className="w-full sm:w-auto px-4 py-2 rounded-2xl border border-neutral-700 text-neutral-300 hover:bg-neutral-900"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showEditItemModal && (() => {
            const otherFolders = folders.filter(f => f.id !== currentFolderId);
            return (
            <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4">
              <div className="w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl text-right overflow-hidden">
                {/* Modal Header */}
                <div className="flex justify-between items-center gap-4 px-6 py-4 border-b border-neutral-800 bg-neutral-900/60">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Pencil className="w-4 h-4 text-amber-400" />
                      إدارة العنصر الحالي
                    </h2>
                    <p className="text-[11px] text-neutral-500 mt-0.5 truncate max-w-xs">{editItemTitle || 'عنصر غير معنون'}</p>
                  </div>
                  <button
                    onClick={() => setShowEditItemModal(false)}
                    className="px-3 py-1 rounded-xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white border border-neutral-700 text-xs"
                  >
                    إغلاق
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-neutral-800">
                  {(['edit', 'move', 'copy'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setEditItemActiveTab(tab)}
                      className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        editItemActiveTab === tab
                          ? tab === 'edit' ? 'bg-amber-900/30 text-amber-300 border-b-2 border-amber-400'
                          : tab === 'move' ? 'bg-blue-900/30 text-blue-300 border-b-2 border-blue-400'
                          : 'bg-emerald-900/30 text-emerald-300 border-b-2 border-emerald-400'
                          : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'
                      }`}
                    >
                      {tab === 'edit' && <><Pencil className="w-3 h-3" />تعديل البيانات</>}
                      {tab === 'move' && <><ArrowRightLeft className="w-3 h-3" />نقل إلى مستودع</>}
                      {tab === 'copy' && <><Copy className="w-3 h-3" />نسخ إلى مستودع</>}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="p-5">
                  {/* Edit Tab */}
                  {editItemActiveTab === 'edit' && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 block font-medium">عنوان العنصر</label>
                        <input
                          value={editItemTitle}
                          onChange={(e) => setEditItemTitle(e.target.value)}
                          className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 block font-medium">رابط العرض</label>
                        <input
                          value={editItemUrl}
                          onChange={(e) => setEditItemUrl(e.target.value)}
                          className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white font-mono focus:border-amber-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 block font-medium">الوصف</label>
                        <textarea
                          value={editItemDesc}
                          onChange={(e) => setEditItemDesc(e.target.value)}
                          rows={2}
                          className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-amber-500 outline-none resize-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[11px] text-neutral-400 block font-medium">رابط البوستر</label>
                          <input
                            value={editItemPoster}
                            onChange={(e) => setEditItemPoster(e.target.value)}
                            className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] text-neutral-400 block font-medium">المدة (دقيقة)</label>
                          <input
                            type="number"
                            min={1}
                            value={editItemDuration}
                            onChange={(e) => setEditItemDuration(Number(e.target.value))}
                            className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleDeleteCurrentDisplayedItem}
                          className="px-3 py-2 rounded-xl bg-red-900/50 border border-red-700 text-red-300 hover:bg-red-800/60 text-xs font-bold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />حذف نهائي
                        </button>
                        <div className="flex gap-2 flex-1 justify-end">
                          <button
                            onClick={() => setShowEditItemModal(false)}
                            className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-900 text-xs"
                          >
                            إلغاء
                          </button>
                          <button
                            onClick={handleSaveEditedCurrentItem}
                            className="px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-500 text-xs font-bold"
                          >
                            حفظ التعديلات
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Move Tab */}
                  {editItemActiveTab === 'move' && (
                    <div className="space-y-4">
                      <p className="text-xs text-neutral-400 leading-relaxed">سيتم نقل العنصر من المستودع الحالي إلى المستودع المختار وحذفه من مكانه الأصلي.</p>
                      {otherFolders.length === 0 ? (
                        <div className="text-center py-6 text-neutral-500 text-sm">لا توجد مستودعات أخرى. أنشئ مستودعاً جديداً أولاً.</div>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-[11px] text-neutral-400 block font-medium">المستودع الهدف</label>
                            <select
                              value={editItemMoveTargetFolderId}
                              onChange={(e) => setEditItemMoveTargetFolderId(e.target.value)}
                              className="w-full rounded-xl border border-blue-700/50 bg-neutral-900 px-3 py-2.5 text-sm text-white focus:border-blue-400 outline-none"
                            >
                              {otherFolders.map(f => (
                                <option key={f.id} value={f.id}>{f.name} ({f.items.length} عنصر)</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowEditItemModal(false)} className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-900 text-xs">إلغاء</button>
                            <button
                              onClick={handleMoveCurrentItem}
                              disabled={!editItemMoveTargetFolderId}
                              className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
                            >
                              <ArrowRightLeft className="w-3 h-3" />نقل العنصر
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Copy Tab */}
                  {editItemActiveTab === 'copy' && (
                    <div className="space-y-4">
                      <p className="text-xs text-neutral-400 leading-relaxed">سيتم إضافة نسخة من العنصر إلى المستودع المختار مع الإبقاء على النسخة الأصلية.</p>
                      {otherFolders.length === 0 ? (
                        <div className="text-center py-6 text-neutral-500 text-sm">لا توجد مستودعات أخرى. أنشئ مستودعاً جديداً أولاً.</div>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-[11px] text-neutral-400 block font-medium">المستودع الهدف</label>
                            <select
                              value={editItemCopyTargetFolderId}
                              onChange={(e) => setEditItemCopyTargetFolderId(e.target.value)}
                              className="w-full rounded-xl border border-emerald-700/50 bg-neutral-900 px-3 py-2.5 text-sm text-white focus:border-emerald-400 outline-none"
                            >
                              {otherFolders.map(f => (
                                <option key={f.id} value={f.id}>{f.name} ({f.items.length} عنصر)</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowEditItemModal(false)} className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-900 text-xs">إلغاء</button>
                            <button
                              onClick={handleCopyCurrentItem}
                              disabled={!editItemCopyTargetFolderId}
                              className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
                            >
                              <Copy className="w-3 h-3" />نسخ العنصر
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            );
          })()}
        </>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-xl shadow-blue-950/20 text-right" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-neutral-800">
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-400" />
                  نتائج البحث
                </h2>
                {searchQuery && (
                  <p className="text-[11px] text-neutral-400 font-medium mt-1">
                    البحث عن: <strong className="text-blue-400">"{searchQuery}"</strong> - {searchResults.length} نتيجة
                  </p>
                )}
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-neutral-500 text-sm">لم يتم العثور على نتائج لـ: <strong className="text-neutral-300">"{searchQuery}"</strong></p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2 bg-neutral-950/50 rounded-xl p-3 border border-neutral-800/50">
                {searchResults.map((result, index) => {
                    const folder = folders.find(f => f.id === result.folderId);
                    const itemIndexInFolder = folder?.items.findIndex(i => i.id === result.item.id) ?? 0;
                    const availableFolders = folders.filter((f) => f.id !== result.folderId);

                    return (
                      <div
                        key={`${result.folderId}-${result.item.id}-${index}`}
                        className="w-full rounded-3xl bg-neutral-900 border border-neutral-800 shadow-sm shadow-black/20 overflow-hidden"
                      >
                        <div className="flex flex-col gap-3 p-3">
                          <div className="flex items-start gap-3">
                            {result.item.posterUrl ? (
                              <img
                                src={result.item.posterUrl}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-12 h-14 object-cover rounded-xl border border-neutral-800 flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-14 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-500 text-[10px]">صورة</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs font-bold text-white truncate">{cleanItemTitle(result.item.title)}</h3>
                              <p className="text-[10px] text-blue-400 font-medium mt-1">{result.folderName}</p>
                              {result.item.description && (
                                <p className="text-[10px] text-neutral-400 mt-2 truncate">{result.item.description}</p>
                              )}
                              {result.item.category && (
                                <p className="text-[9px] text-neutral-500 font-medium mt-1">{result.item.category}</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-center">
                            <div className="grid grid-cols-1 gap-2">
                              {availableFolders.length === 0 ? (
                                <div className="text-[10px] text-neutral-500 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2">
                                  لا توجد مستودعات أخرى متاحة
                                </div>
                              ) : null}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleCopySearchResultItem(result.folderId, result.item.id)}
                                disabled={availableFolders.length === 0}
                                className="px-3 py-2 rounded-2xl bg-green-600 text-white text-[10px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                نسخ
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveSearchResultItem(result.folderId, result.item.id)}
                                disabled={availableFolders.length === 0}
                                className="px-3 py-2 rounded-2xl bg-amber-500 text-black text-[10px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                نقل
                              </button>
                            </div>
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleSelectSearchResult(result.folderId, itemIndexInFolder)}
                              className="text-[10px] px-3 py-2 rounded-2xl border border-neutral-700 text-neutral-200 hover:border-blue-500 hover:text-white bg-neutral-950"
                            >
                              فتح العنصر
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {searchResultAction && (
              <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl text-right" dir="rtl">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white">{searchResultAction.mode === 'copy' ? 'نسخ العنصر' : 'نقل العنصر'}</h3>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        اختر المستودع الهدف لتنفيذ عملية {searchResultAction.mode} للعنصر.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeSearchResultAction}
                      className="px-3 py-2 rounded-xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                    >
                      إغلاق
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] text-neutral-400 font-medium">المستودع الهدف</label>
                      <select
                        value={searchResultAction.targetFolderId}
                        onChange={(e) => handleChangeSearchResultTargetFolder(e.target.value)}
                        className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                      >
                        {folders
                          .filter((folder) => folder.id !== searchResultAction.sourceFolderId)
                          .map((folder) => (
                            <option key={folder.id} value={folder.id}>
                              {folder.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="text-[11px] text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-2xl p-3">
                      <p>سوف يتم {searchResultAction.mode === 'copy' ? 'نسخ' : 'نقل'} العنصر من المستودع الحالي إلى المستودع الذي تختاره هنا.</p>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        type="button"
                        onClick={closeSearchResultAction}
                        className="px-4 py-2 rounded-2xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={executeSearchResultTransfer}
                        className="px-4 py-2 rounded-2xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
                        disabled={!searchResultAction.targetFolderId}
                      >
                        تأكيد {searchResultAction.mode === 'copy' ? 'النسخ' : 'النقل'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-all text-sm font-medium"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container Layout */}
      <div className={`flex-1 flex flex-col ${showSidebar && !isFullscreenTheater ? 'lg:flex-row' : ''} relative`}>
        
        {/* Help guide accordion drawer */}
        {!isFullscreenTheater && showGuide && (
          <div className="w-full bg-neutral-900 border-b border-neutral-800 p-6 space-y-4">
            <div className="max-w-4xl mx-auto space-y-3">
              <h2 className="text-sm font-bold text-purple-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>دليل السطوة على تشغيل أفلام EgyBest و MovizHome بأتمتة كاملة:</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-300 leading-relaxed pt-1">
                <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-850 space-y-2">
                  <h3 className="font-bold text-white text-[13px] border-b border-purple-900/30 pb-1">1. تنظيم المجلدات</h3>
                  <p>
                    قم بإنشاء مستودعات مخصصة في الجانب (مثلاً: مجلد "أفلام الأسبوع"). ثم أضف رابط المشاهدة الذي ترغب به من EgyBest أو MovizHome بسهولة.
                  </p>
                </div>
                <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-850 space-y-2">
                  <h3 className="font-bold text-white text-[13px] border-b border-purple-900/30 pb-1">2. التكبير لملء الشاشة</h3>
                  <p>
                    عند تشغيل أي فيلم، يتيح لك زر <strong>"ملء الشاشة 🎬"</strong> توسيع وتكبير المشغل ومسرح العرض ليمتد بالكامل على كل المساحة تلقائياً مما يمنحك شعور التليفزيون المنزلي.
                  </p>
                </div>
                <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-850 space-y-2">
                  <h3 className="font-bold text-white text-[13px] border-b border-purple-900/30 pb-1">3. البث المستمر والتلقائي</h3>
                  <p>
                    يدعم النظام <strong>"المؤقت الذكي للتبديل"</strong>. ستقوم المسرح بالتنقل التلقائي للفيلم التالي بمجرد انتهاء المهلة كبث متواصل، بدون تدخل منك وبحجم شاشة ممتد كامل!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Cinema Room */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-black">
          <CinemaTheater
            currentFolder={activeFolder}
            currentItemIndex={currentItemIndex}
            item={currentItem}
            isPlaying={isPlaying}
            playMode={playMode}
            autoAdvanceTrigger={autoAdvanceTrigger}
            customTimerSeconds={customTimerSeconds}
            isFullscreenTheater={isFullscreenTheater}
            onNavigateNext={handleNavigateNext}
            onNavigatePrev={handleNavigatePrev}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onToggleFullscreen={handleToggleFullscreen}
            onUpdateItemOffset={handleUpdateItemOffset}
          />
        </div>

        {/* Settings and Link Directory Sideboard */}
        {!isFullscreenTheater && showSidebar && (
          <Sidebar
            folders={folders}
            currentFolderId={currentFolderId}
            currentItemIndex={currentItemIndex}
            playMode={playMode}
            autoAdvanceTrigger={autoAdvanceTrigger}
            customTimerSeconds={customTimerSeconds}
            onSelectFolder={handleSelectFolder}
            onSelectItem={handleSelectItem}
            onSetPlayMode={handleSetPlayMode}
            onSetAutoAdvanceTrigger={handleSetAutoAdvanceTrigger}
            onSetCustomTimerSeconds={handleSetCustomTimerSeconds}
            onAddFolder={handleAddFolder}
            onAddMovie={handleAddMovie}
            onDeleteFolder={handleDeleteFolder}
            onDeleteMovie={handleDeleteMovie}
            onHideMovie={handleHideMovie}
            onMarkBroken={handleMarkBroken}
            onSortByDomain={handleSortFolderByDomain}
            onSortByTitle={handleSortFolderByTitle}
            onSortByDate={handleSortFolderByDate}
            onDeleteBrokenLinks={handleDeleteBrokenLinks}
          />
        )}
      </div>

      {showFullFolderView && activeFolder && (
        <FolderFullView
          folder={activeFolder}
          folders={folders}
          currentItemIndex={currentItemIndex}
          onClose={() => setShowFullFolderView(false)}
          onSelectItem={(index) => {
            handleSelectItem(index);
            setShowFullFolderView(false);
          }}
          onSwitchFolder={(folderId) => {
            handleSelectFolder(folderId);
          }}
          onHideMovie={handleHideMovie}
          onEditMovie={openEditMovieModal}
          onDeleteMovie={handleDeleteMovie}
        />
      )}

      {/* Dynamic event broadcast logger - (Only shown when not in full display mode) */}
      {!isFullscreenTheater && (
        <footer className="bg-neutral-950 border-t border-neutral-800 px-4 py-1 text-[9px] text-neutral-500 flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 select-none font-mono">
            <span>حقوق الأتمتة مكفولة 2026</span>
            <span className="text-neutral-600">|</span>
            <span className="text-neutral-400">موجز عمليات الأتمتة:</span>
            {logs.length > 0 && (
              <span className={`transition-all ${
                logs[0].type === 'success' ? 'text-emerald-400' : logs[0].type === 'warn' ? 'text-amber-400' : 'text-neutral-300'
              }`}>
                ● {logs[0].msg}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 select-none">
            <span>طُوّر خصيصاً لتشغيل روابط</span>
            <a href="https://www.egybest.co.in" target="_blank" rel="noreferrer" className="text-purple-400 hover:text-purple-300">EgyBest</a>
            <span>و</span>
            <a href="https://movizhome.click" target="_blank" rel="noreferrer" className="text-pink-400 hover:text-pink-300">MovizHome</a>
            <span>ببث دوري مستقر</span>
          </div>
        </footer>
      )}

      {/* Fullscreen Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 bg-neutral-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 border-4 border-dashed border-purple-500 rounded-2xl m-4 transition-all animate-pulse pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 mb-6 border border-purple-500/30">
            <Radio className="w-10 h-10 animate-spin" />
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">أفلت الرابط أو مِلَفّ الـ JSON هنا! 🎬</h2>
          <p className="text-sm text-purple-300 max-w-md text-center">
            تَمَّ تفعيل كاشف البث الملتقط تلقائياً. يمكنك إفلات أي رَابِط مباشر من EgyBest أو MovizHome، أو إفلات مِلَفّ تكوين JSON كامل للمستودعات.
          </p>
        </div>
      )}

      {/* Drop Link Metadata Form modal */}
      {showDropFormModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl shadow-purple-950/20 text-right" dir="rtl">
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-900/40 flex items-center justify-center text-purple-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">إدراج وتأكيد الرابط الساقط تلقائياً</h3>
                <p className="text-[11px] text-neutral-400">يرجى تأكيد اسم وعنوان غلاف الفيلم تمهيداً لبدء المحاكاة</p>
              </div>
            </div>

            <form onSubmit={handleSaveDroppedMovie} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 block font-sans">رابط الفيلم الملتقط:</label>
                <input
                  type="text"
                  value={droppedLinkUrl}
                  disabled
                  className="w-full text-xs px-3 py-2 bg-neutral-950 border border-neutral-850 rounded-lg text-neutral-500 font-mono focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-300 block font-medium">اسم الرابط أو عنوان الفيلم <span className="text-red-500">*</span>:</label>
                <input
                  type="text"
                  placeholder="مثال: فيلم السهرة السينمائي المتقاطع..."
                  value={droppedLinkTitle}
                  onChange={(e) => setDroppedLinkTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-300 block font-medium">رابط صورة أو بوستر الفيلم (اختياري):</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... أو رابط البوستر"
                  value={droppedLinkPoster}
                  onChange={(e) => setDroppedLinkPoster(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-300 block font-medium">التصنيف والوصف:</label>
                  <input
                    type="text"
                    placeholder="رعب، خيال علمي، وثائقي"
                    value={droppedLinkDesc}
                    onChange={(e) => setDroppedLinkDesc(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-neutral-300 block font-medium">المستودع المستهدف:</label>
                  <select
                    value={droppedFolderId}
                    onChange={(e) => setDroppedFolderId(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                    required
                  >
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-850">
                <button
                  type="button"
                  onClick={() => setShowDropFormModal(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white rounded-lg text-xs font-bold font-sans"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg text-xs font-bold hover:from-purple-500 hover:to-pink-400 shadow-lg shadow-purple-950/40"
                >
                  حفظ وتأكيد الإدراج ☑
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
