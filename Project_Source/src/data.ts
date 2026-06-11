import { Folder } from './types';

export const PRESEEDED_FOLDERS: Folder[] = [
  {
    id: 'f1',
    name: 'مسرح سينما العجائب (تشغيل تلقائي حقيقي)',
    description: 'مجلد يحتوي على عروض سينمائية بجودة عالية وروابط مباشرة، تدعم التشغيل التلقائي والانتقال الفوري الذكي عند انتهاء المواد.',
    color: '#7c3aed', // Purple
    items: [
      {
        id: 'm1_bbb',
        title: 'أرنب بيغ باك (Big Buck Bunny)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        embedUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        duration: 596, // ~10 minutes
        useDirectPlayer: true,
        category: 'رسوم متحركة / كوميدي',
        description: 'فيلم رسوم متحركة كلاسيكي قصير ملائم لتجربة تكبير الشاشة والانتقال التلقائي المستمر عند النهاية.',
        addedAt: new Date(2026, 5, 8, 10, 0, 0).toISOString()
      },
      {
        id: 'm2_sintel',
        title: 'فيلم سينتل السينمائي (Sintel)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        embedUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        duration: 888, // ~14.8 minutes
        useDirectPlayer: true,
        category: 'خيال علمي / مغامرة',
        description: 'رحلة فتاة تبحث عن تنينها الصغير المفقود. إنتاج فني رائع ومناسب لتجربة جودة الصورة في وضع الشاشة الكاملة.',
        addedAt: new Date(2026, 5, 8, 10, 5, 0).toISOString()
      },
      {
        id: 'm3_tos',
        title: 'دموع من فولاذ (Tears of Steel)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        embedUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        duration: 734, // ~12 minutes
        useDirectPlayer: true,
        category: 'خيال علمي / أكشن',
        description: 'عرض تجريبي غني بالخيال العلمي وتأثيرات بصرية ممتازة مع روبوتات عملاقة وسط مدينة أمستردام المستقبلية.',
        addedAt: new Date(2026, 5, 8, 10, 10, 0).toISOString()
      }
    ]
  },
  {
    id: 'f2',
    name: 'مستودع أفلام إيجي بست وموفيز هوم',
    description: 'مستودع مخصص لروابط مواقع المشاهدة الخارجية مثل EgyBest و MovizHome مع تفعيل مؤقت الانتقال التلقائي الذكي.',
    color: '#ec4899', // Pink
    items: [
      {
        id: 'm4_egybest',
        title: 'فيلم إيجي بست الأول (مثال تجريبي)',
        url: 'https://www.egybest.co.in/watch/12963',
        embedUrl: 'https://www.egybest.co.in/watch/12963',
        duration: 60, // 1 minute demo countdown for auto-advance or custom value
        useDirectPlayer: false,
        category: 'إيجي بست / دراما',
        description: 'رابط مدخل من EgyBest. بما أن المواقع الخارجية تمنع أحياناً ميزة الكشف التلقائي عن نهاية الفيديو بداخل الإطار، سيقوم النظام بالانتقال للفيلم التالي باستخدام "المؤقت الذكي" للبث المستمر تلقائياً.',
        addedAt: new Date(2026, 5, 8, 10, 12, 0).toISOString()
      },
      {
        id: 'm5_movizhome',
        title: 'عرض موفيز هوم (مثال تجريبي)',
        url: 'https://movizhome.click/rape-1976/watch/',
        embedUrl: 'https://movizhome.click/rape-1976/watch/',
        duration: 45, // 45 seconds for rapid transition demo
        useDirectPlayer: false,
        category: 'موفيز هوم / كلاسيك',
        description: 'رابط مباشر من MovizHome. يتم تشغيله وتوجيهه للانتقال التلقائي المستمر والذكي كالبث الحي.',
        addedAt: new Date(2026, 5, 8, 10, 15, 0).toISOString()
      }
    ]
  }
];
