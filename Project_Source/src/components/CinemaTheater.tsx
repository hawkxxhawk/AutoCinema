import React, { useEffect, useRef, useState } from 'react';
import { Folder, MovieItem, PlayMode, AutoAdvanceTrigger } from '../types';
import { Maximize, Minimize, Play, Pause, SkipForward, SkipBack, Sparkles, Tv, Eye, VolumeX, Volume2, AlertCircle, RefreshCw, Layers, ChevronUp, ChevronDown, ExternalLink, ShieldAlert, Pencil, Trash2 } from 'lucide-react';
import { cleanItemTitle, isLikelyBlocked } from '../utils/urlHelper';

interface CinemaTheaterProps {
  currentFolder: Folder | null;
  currentItemIndex: number;
  item: MovieItem | null;
  isPlaying: boolean;
  playMode: PlayMode;
  autoAdvanceTrigger: AutoAdvanceTrigger;
  customTimerSeconds: number;
  isFullscreenTheater: boolean;
  onNavigateNext: () => void;
  onNavigatePrev: () => void;
  onTogglePlay: () => void;
  onToggleFullscreen: () => void;
  onUpdateItemOffset: (id: string, offset: number) => void;
  onEditItem?: () => void;
  onDeleteItem?: () => void;
}

export default function CinemaTheater({
  currentFolder,
  currentItemIndex,
  item,
  isPlaying,
  playMode,
  autoAdvanceTrigger,
  customTimerSeconds,
  isFullscreenTheater,
  onNavigateNext,
  onNavigatePrev,
  onTogglePlay,
  onToggleFullscreen,
  onUpdateItemOffset,
  onEditItem,
  onDeleteItem,
}: CinemaTheaterProps) {
  const [ambientLight, setAmbientLight] = useState(true);
  const [showChairs, setShowChairs] = useState(true);
  const [countdown, setCountdown] = useState(customTimerSeconds);
  const [isMuted, setIsMuted] = useState(false);
  const [browserAutoplayBlocked, setBrowserAutoplayBlocked] = useState(false);
  const [iframeRefreshes, setIframeRefreshes] = useState(0);
  const [localOffset, setLocalOffset] = useState(0);
  const [iframeLoadError, setIframeLoadError] = useState(false);
  const [showBrokenNotice, setShowBrokenNotice] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize countdown and offset when item changes
  useEffect(() => {
    setCountdown(customTimerSeconds);
    setBrowserAutoplayBlocked(false);
    setLocalOffset(item?.vOffset || 0);
    setIframeLoadError(false);
    setShowBrokenNotice(true);
  }, [item, customTimerSeconds]);

  const adjustOffset = (amount: number) => {
    if (!item) return;
    const newOffset = Math.max(0, localOffset + amount);
    setLocalOffset(newOffset);
    onUpdateItemOffset(item.id, newOffset);
  };

  // Handle the countdown timer for the 'timer' auto advance trigger
  useEffect(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    if (isPlaying && autoAdvanceTrigger === 'timer') {
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current!);
            // Trigger automatic transition to next video
            onNavigateNext();
            return customTimerSeconds;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isPlaying, autoAdvanceTrigger, item, customTimerSeconds, onNavigateNext]);

  // Handle HTML5 Video play/pause
  useEffect(() => {
    if (videoRef.current && item?.useDirectPlayer) {
      if (isPlaying) {
        videoRef.current
          .play()
          .then(() => {
            setBrowserAutoplayBlocked(false);
          })
          .catch((err) => {
            console.warn('Autoplay blocked by browser. Muting to bypass.');
            setIsMuted(true);
            // Retry muted
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().catch(() => {
                setBrowserAutoplayBlocked(true);
              });
            }
          });
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, item]);

  // Auto transition on direct HTML5 video ended
  const handleVideoEnded = () => {
    if (autoAdvanceTrigger === 'ended') {
      onNavigateNext();
    }
  };

  const handleManualAutoplayBypass = () => {
    setBrowserAutoplayBlocked(false);
    onTogglePlay();
    if (!isPlaying) {
      setTimeout(() => {
        onTogglePlay();
      }, 50);
    }
  };

  const formattedCountdown = () => {
    const mins = Math.floor(countdown / 60);
    const secs = countdown % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = () => {
    if (customTimerSeconds <= 0) return 0;
    return ((customTimerSeconds - countdown) / customTimerSeconds) * 105;
  };

  return (
    <div
      className={`flex-1 flex flex-col transition-all duration-500 ${
        isFullscreenTheater
          ? 'fixed inset-0 z-50 bg-black'
          : 'relative items-center justify-center p-0 bg-neutral-950 min-h-0'
      }`}
      id="cinema-theater-container"
    >
      {/* Background glow behind the cinema screen */}
      {ambientLight && (
        <div className={`absolute select-none pointer-events-none inset-0 flex items-center justify-center overflow-hidden z-0`}>
          <div className="w-[110%] h-[110%] bg-purple-900/10 blur-3xl rounded-full absolute -top-10 -left-10 opacity-60" />
          <div className="w-[85%] h-[85%] bg-pink-900/10 blur-3xl rounded-full absolute -bottom-10 -right-10 opacity-60" />
          {isPlaying && (
            <div className="w-[70%] h-[50%] bg-purple-600/5 blur-3xl rounded-full absolute top-[25%] transition-all duration-1000 animate-pulse" />
          )}
        </div>
      )}

      {/* Screen area container */}
      <div
        className={`z-10 flex flex-col h-full w-full ${isFullscreenTheater ? 'absolute inset-0' : ''}`}
      >

        {/* Top bar (Status / Folder tracking) - Now an absolute overlay to save space */}
        {!isFullscreenTheater && (
          <div className="absolute top-2 left-2 right-2 z-20 flex flex-wrap justify-between items-center gap-2 text-[9px] sm:text-[10px] font-semibold text-neutral-400 bg-neutral-900/60 p-1 px-2 sm:px-3 rounded-xl border border-neutral-800/50 backdrop-blur-md">
            <div className="flex items-center gap-1.5 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-white opacity-80">البث:</span>
              <span className="text-purple-400 truncate max-w-[80px] sm:max-w-none">
                {currentFolder ? currentFolder.name : '—'}
              </span>
              <span className="text-neutral-500">|</span>
              <span className="text-neutral-300">({currentItemIndex + 1}/{currentFolder?.items.length || 0})</span>
            </div>
            
            <div className="flex items-center gap-2">
              {item && (
                <a
                  href={item.url || item.embedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all text-[9px] sm:text-[10px] font-bold shadow-md shadow-purple-900/20"
                  title="فتح في المتصفح الخارجي"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>فتح في المتصفح</span>
                </a>
              )}
              {autoAdvanceTrigger === 'timer' && isPlaying && (
                <div className="flex items-center gap-1 border-l border-neutral-800 pl-2 select-none">
                  <span className="text-pink-400 font-mono">⏱ {formattedCountdown()}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* The screen frame */}
        <div
          className={`bg-black overflow-hidden flex-1 ${
            isFullscreenTheater
              ? 'absolute inset-0 w-full h-full'
              : 'relative shadow-2xl flex flex-col justify-center shadow-purple-950/20'
          }`}
          style={{
            boxShadow: ambientLight && isPlaying ? '0 0 50px 10px rgba(124, 58, 237, 0.15)' : '',
          }}
        >
          {item ? (
            <div className="relative w-full h-full group">
              {/* Blocked Content Notice Overlay */}
              {(() => {
                const blockedUrl = item.url || item.embedUrl;
                const blockedByDomain = isLikelyBlocked(blockedUrl);
                return (blockedByDomain || iframeLoadError) && (
                  <div className="absolute inset-0 z-30 bg-neutral-950/90 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                    <ShieldAlert className="w-12 h-12 text-amber-500 mb-4" />
                    <h3 className="text-lg font-bold text-white mb-2">
                      {iframeLoadError ? 'تعذر تحميل هذا الرابط داخل التطبيق' : 'عذراً، هذا الموقع يرفض التضمين المباشر'}
                    </h3>
                    <p className="text-sm text-neutral-400 max-w-md mb-6 leading-relaxed">
                      {iframeLoadError
                        ? 'حاول فتح هذا الرابط مباشرة في المتصفح الخارجي لأنه فشل التحميل داخل الإطار.'
                        : 'بعض المواقع ترفض تشغيل محتواها داخل تطبيقات أخرى لأسباب أمنية. يمكنك فتح الرابط في نافذة مستقلة أو استخدام إضافة المتصفح '}
                      <span className="text-purple-400 font-bold mx-1">Ignore X-Frame-Options</span>.
                    </p>
                    <div className="flex gap-3 flex-wrap justify-center">
                      <a
                        href={blockedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-900/20"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>فتح في المتصفح الخارجي</span>
                      </a>
                      <button
                        onClick={() => setIframeLoadError(false)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-neutral-700 hover:bg-neutral-600 text-white rounded-xl font-bold transition-all"
                      >
                        إغلاق</button>
                    </div>
                  </div>
                );
              })()}

              {item.isBroken && showBrokenNotice && (
                <div className="absolute inset-0 z-40 bg-neutral-950/95 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                  <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">هذا الرابط معطوب أو لا يعمل</h3>
                  <p className="text-sm text-neutral-400 max-w-md mb-4 leading-relaxed">
                    العنصر الحالي في المستودع تم تعيينه كمعطوب. يمكنك فتح الرابط في المتصفح الخارجي للتحقق أو تشغيله من هناك.
                  </p>
                  <div className="rounded-3xl border border-red-700 bg-neutral-900/80 p-4 mb-4 max-w-xl text-left text-xs text-neutral-300">
                    <div className="font-semibold text-white mb-2">{cleanItemTitle(item.title)}</div>
                    <div className="break-all text-emerald-300">{item.url || item.embedUrl}</div>
                  </div>
                  <div className="flex gap-3 flex-wrap justify-center">
                    <a
                      href={item.url || item.embedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-900/20"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>فتح في المتصفح الخارجي</span>
                    </a>
                    <button
                      onClick={() => setShowBrokenNotice(false)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-neutral-700 hover:bg-neutral-600 text-white rounded-xl font-bold transition-all"
                    >
                      إخفاء البطاقة
                    </button>
                  </div>
                </div>
              )}


              {/* Direct HTML5 Video Player */}
              {item.useDirectPlayer ? (
                <video
                  ref={videoRef}
                  src={item.embedUrl}
                  autoPlay={isPlaying}
                  controls
                  playsInline
                  muted={isMuted}
                  className="absolute inset-0 w-full h-full object-fill"
                  onEnded={handleVideoEnded}
                />
              ) : (
                /* External / Iframe Site Loader (EgyBest, YouTube, Vimeo, MovizHome) */
                <div className="absolute inset-0 w-full h-full overflow-hidden bg-black">
                  <iframe
                    key={`${item.id}-${iframeRefreshes}`}
                    src={item.embedUrl}
                    title={cleanItemTitle(item.title)}
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    referrerPolicy="no-referrer"
                    className="absolute w-full border-none bg-black object-fill transition-transform duration-300"
                    style={{
                      top: 0,
                      height: `calc(100% + ${localOffset}px)`,
                      transform: `translateY(-${localOffset}px)`,
                    }}
                    sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts"
                    onLoad={() => setIframeLoadError(false)}
                    onError={() => setIframeLoadError(true)}
                  />
                </div>
              )}

              {/* Autoplay blocker notification bypass or iframe details overlay */}
              {browserAutoplayBlocked && (
                <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                  <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-yellow-500 animate-bounce" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">يتطلب المتصفح تفاعلاً لبدء تشغيل الصوت تلقائياً</h3>
                  <p className="text-sm text-neutral-400 max-w-sm mb-6">
                    بسبب سياسات الأمان في المتصفح، يرجى النقر على تفعيل العرض بالأسفل لتمكين البث السينمائي والتشغيل التلقائي ذو الصوت المرتفع.
                  </p>
                  <button
                    onClick={handleManualAutoplayBypass}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-lg shadow-lg hover:brightness-110"
                  >
                    أطلق البث الفوري الآن 🎬
                  </button>
                </div>
              )}

              {/* Status banner in Fullscreen mode */}
              {isFullscreenTheater && (
                <div className="absolute top-4 right-4 left-4 flex justify-between items-center pointer-events-none select-none z-20">
                  <div className="px-4 py-2 bg-black/80 backdrop-blur-md border border-neutral-800 rounded-xl flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-white text-xs font-bold font-mono tracking-wider">مسرح البث المستمر تلقائياً</span>
                    <span className="text-neutral-500">|</span>
                    <span className="text-neutral-300 text-xs">{cleanItemTitle(item.title)}</span>
                  </div>
                  <div className="flex gap-2 pointer-events-auto items-center">
                    {item && (
                      <a
                        href={item.url || item.embedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-purple-900/20"
                        title="فتح في المتصفح الخارجي"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>فتح في المتصفح</span>
                      </a>
                    )}
                    {autoAdvanceTrigger === 'timer' && (
                      <div className="px-4 py-2.5 bg-black/80 backdrop-blur-md border border-neutral-800 rounded-xl flex items-center gap-2">
                        <span className="text-pink-400 font-mono text-xs">الانتقال التالي: {formattedCountdown()}</span>
                      </div>
                    )}
                    <button
                      onClick={onToggleFullscreen}
                      className="p-2.5 bg-black/80 hover:bg-black border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white rounded-xl transition-all"
                      title="تصغير شاشة العرض والعودة للمجلدات"
                    >
                      <Minimize className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-radial from-neutral-900 to-black select-none">
              <Tv className="w-16 h-16 text-neutral-700 mb-4 animate-pulse" />
              <h3 className="text-lg font-bold text-neutral-300">مسرح العرض شاغر الآن</h3>
              <p className="text-sm text-neutral-500 max-w-md mt-2">
                يرجى تحديد مجلد مفضل أو النقر على أحد الأفلام في القائمة الجانبية لتنشيط العرض المستمر المكبر وتجربة جودة العرض السينمائي.
              </p>
            </div>
          )}
        </div>

        {/* Cinematic seats (simulated chairs) container -> Removed for more space */}

        {/* Bottom controls panel - Now an absolute overlay */}
        {!isFullscreenTheater && (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-1 sm:p-1.5 bg-gradient-to-t from-black/90 to-transparent backdrop-blur-md flex flex-wrap gap-1 sm:gap-2 items-center justify-between z-10 select-none">
            {/* Playback Controls button */}
            <div className="flex items-center gap-1">
              <button
                onClick={onNavigatePrev}
                disabled={!item}
                className="p-1.5 sm:p-1 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg transition-all disabled:opacity-40"
                title="السابق"
              >
                <SkipBack className="w-4 h-4 sm:w-3 sm:h-3" />
              </button>

              <button
                onClick={onTogglePlay}
                disabled={!item}
                className={`p-1.5 px-3 sm:p-1 sm:px-3 rounded-lg font-bold transition-all disabled:opacity-40 flex items-center justify-center ${
                  isPlaying
                    ? 'bg-amber-500/80 hover:bg-amber-400 text-black'
                    : 'bg-purple-600/80 hover:bg-purple-500 text-white'
                }`}
                title={isPlaying ? 'إيقاف' : 'تشغيل'}
              >
                {isPlaying ? <Pause className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> : <Play className="w-4 h-4 sm:w-3.5 sm:h-3.5 fill-white" />}
              </button>

              <button
                onClick={onNavigateNext}
                disabled={!item}
                className="p-1.5 sm:p-1 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg transition-all disabled:opacity-40"
                title="التالي"
              >
                <SkipForward className="w-4 h-4 sm:w-3 sm:h-3" />
              </button>
            </div>

            {/* Active Info details */}
            <div className="flex items-center gap-2 text-right flex-grow px-1 font-sans max-w-[120px] sm:max-w-xs md:max-w-md lg:max-w-lg truncate order-3 sm:order-none w-full sm:w-auto justify-center sm:justify-start">
              {item ? (
                <div className="truncate text-center sm:text-right">
                  <h2 className="text-[10px] sm:text-[10px] font-bold text-white/90 truncate drop-shadow-md">{cleanItemTitle(item.title)}</h2>
                </div>
              ) : (
                <div className="text-[9px] text-neutral-400 font-sans">لم يتم اختيار فيلم</div>
              )}
            </div>

            {/* View options customization toggles */}
            <div className="flex items-center gap-0.5 sm:gap-1 pr-0 sm:pr-1">
              {item && !item.useDirectPlayer && (
                <div className="flex items-center bg-neutral-800/50 rounded-lg p-0.5 border border-neutral-700/30">
                  <button
                    onClick={() => adjustOffset(20)}
                    className="p-1 hover:text-white text-neutral-400 transition-colors"
                    title="تحريك لأعلى (تركيز)"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[7px] sm:text-[8px] font-mono text-neutral-500 px-0.5 select-none hidden sm:inline">FOCUS</span>
                  <button
                    onClick={() => adjustOffset(-20)}
                    className="p-1 hover:text-white text-neutral-400 transition-colors"
                    title="تحريك لأسفل"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {item && !item.useDirectPlayer && (
                <button
                  onClick={() => setIframeRefreshes((prev) => prev + 1)}
                  className="p-1.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg transition-all"
                  title="تحديث"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}

              {item && (
                <a
                  href={item.embedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg transition-all"
                  title="فتح في المتصفح الخارجي"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {item && onEditItem && (
                <button
                  onClick={onEditItem}
                  className="p-1.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg transition-all"
                  title="تعديل العنصر"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}

              {item && onDeleteItem && (
                <button
                  onClick={onDeleteItem}
                  className="p-1.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg transition-all"
                  title="حذف العنصر"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={onToggleFullscreen}
                className="p-1.5 px-2 bg-gradient-to-r from-purple-600/80 to-pink-500/80 hover:brightness-110 text-white rounded-lg transition-all shadow-md flex items-center gap-1 font-bold text-[9px]"
                title="ملء الشاشة"
              >
                <Maximize className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ملء الشاشة</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Helpful educational disclaimer */}
      {!isFullscreenTheater && (
        <div className="mt-2 w-full max-w-5xl bg-neutral-900/30 rounded-lg p-2 border border-neutral-800/60 text-[9px] text-neutral-400 select-none">
          <div className="flex items-start gap-2">
            <Sparkles className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-neutral-300">ملاحظة ذكية حول روابط السينما:</p>
              <p className="leading-tight">
                بعض المواقع ترفض التضمين. يمكنك تجاوز ذلك باستخدام إضافة المتصفح 
                <span className="text-purple-400 font-bold mx-1">Ignore X-Frame-Options</span> 
                أو استخدام زر "فتح في نافذة مستقلة" الظاهر على الشاشة.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
