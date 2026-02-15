/**
 * Internationalization (i18n) framework
 * Supports: English, Spanish, French, German, Japanese, Arabic (RTL)
 */

export type Locale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'ar';

export interface I18nConfig {
  locale: Locale;
  fallbackLocale: Locale;
  messages: Record<string, string>;
}

const DEFAULT_LOCALE: Locale = 'en';
const RTL_LOCALES: Locale[] = ['ar'];

// Translation keys
export type TranslationKey = keyof typeof translations.en;

// All translations
export const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.search': 'Search',
    'nav.library': 'Library',
    'nav.live': 'Live TV',
    'nav.podcasts': 'Podcasts',
    'nav.games': 'Games',
    'nav.settings': 'Settings',
    'nav.admin': 'Admin',

    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.retry': 'Retry',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',

    // Media
    'media.play': 'Play',
    'media.pause': 'Pause',
    'media.stop': 'Stop',
    'media.resume': 'Resume',
    'media.watchLater': 'Watch Later',
    'media.addToPlaylist': 'Add to Playlist',
    'media.removeFromPlaylist': 'Remove from Playlist',
    'media.download': 'Download',
    'media.share': 'Share',
    'media.rating': 'Rating',
    'media.duration': 'Duration',
    'media.releaseDate': 'Release Date',
    'media.genres': 'Genres',
    'media.director': 'Director',
    'media.cast': 'Cast',

    // Player
    'player.quality': 'Quality',
    'player.subtitles': 'Subtitles',
    'player.audio': 'Audio',
    'player.speed': 'Speed',
    'player.fullscreen': 'Fullscreen',
    'player.pip': 'Picture in Picture',
    'player.volume': 'Volume',
    'player.mute': 'Mute',
    'player.unmute': 'Unmute',

    // Auth
    'auth.signIn': 'Sign In',
    'auth.signOut': 'Sign Out',
    'auth.signUp': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.rememberMe': 'Remember Me',
    'auth.createAccount': 'Create Account',
    'auth.alreadyHaveAccount': 'Already have an account?',

    // Settings
    'settings.profile': 'Profile',
    'settings.account': 'Account',
    'settings.preferences': 'Preferences',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.notifications': 'Notifications',
    'settings.privacy': 'Privacy',
    'settings.parental': 'Parental Controls',

    // Podcasts
    'podcasts.subscribe': 'Subscribe',
    'podcasts.unsubscribe': 'Unsubscribe',
    'podcasts.episodes': 'Episodes',
    'podcasts.showNotes': 'Show Notes',
    'podcasts.chapters': 'Chapters',

    // Games
    'games.play': 'Play',
    'games.saves': 'Save States',
    'games.controls': 'Controls',
    'games.fullscreen': 'Fullscreen',
    'games.createSave': 'Create Save',
    'games.loadSave': 'Load Save',
    'games.deleteSave': 'Delete Save',

    // Admin
    'admin.dashboard': 'Dashboard',
    'admin.users': 'Users',
    'admin.media': 'Media Management',
    'admin.stats': 'Statistics',
    'admin.logs': 'Logs',
  },

  es: {
    // Navigation
    'nav.home': 'Inicio',
    'nav.search': 'Buscar',
    'nav.library': 'Biblioteca',
    'nav.live': 'TV en Vivo',
    'nav.podcasts': 'Podcasts',
    'nav.games': 'Juegos',
    'nav.settings': 'Configuración',
    'nav.admin': 'Admin',

    // Common
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.retry': 'Reintentar',
    'common.cancel': 'Cancelar',
    'common.save': 'Guardar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.close': 'Cerrar',
    'common.back': 'Atrás',
    'common.next': 'Siguiente',
    'common.previous': 'Anterior',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.sort': 'Ordenar',

    // Media
    'media.play': 'Reproducir',
    'media.pause': 'Pausar',
    'media.stop': 'Detener',
    'media.resume': 'Continuar',
    'media.watchLater': 'Ver Más Tarde',
    'media.addToPlaylist': 'Añadir a Lista',
    'media.removeFromPlaylist': 'Quitar de Lista',
    'media.download': 'Descargar',
    'media.share': 'Compartir',
    'media.rating': 'Calificación',
    'media.duration': 'Duración',
    'media.releaseDate': 'Fecha de Estreno',
    'media.genres': 'Géneros',
    'media.director': 'Director',
    'media.cast': 'Reparto',

    // Player
    'player.quality': 'Calidad',
    'player.subtitles': 'Subtítulos',
    'player.audio': 'Audio',
    'player.speed': 'Velocidad',
    'player.fullscreen': 'Pantalla Completa',
    'player.pip': 'Imagen en Imagen',
    'player.volume': 'Volumen',
    'player.mute': 'Silenciar',
    'player.unmute': 'Activar Sonido',

    // Auth
    'auth.signIn': 'Iniciar Sesión',
    'auth.signOut': 'Cerrar Sesión',
    'auth.signUp': 'Registrarse',
    'auth.email': 'Correo Electrónico',
    'auth.password': 'Contraseña',
    'auth.forgotPassword': '¿Olvidaste tu Contraseña?',
    'auth.rememberMe': 'Recuérdame',
    'auth.createAccount': 'Crear Cuenta',
    'auth.alreadyHaveAccount': '¿Ya tienes una cuenta?',

    // Settings
    'settings.profile': 'Perfil',
    'settings.account': 'Cuenta',
    'settings.preferences': 'Preferencias',
    'settings.language': 'Idioma',
    'settings.theme': 'Tema',
    'settings.notifications': 'Notificaciones',
    'settings.privacy': 'Privacidad',
    'settings.parental': 'Control Parental',

    // Podcasts
    'podcasts.subscribe': 'Suscribirse',
    'podcasts.unsubscribe': 'Desuscribirse',
    'podcasts.episodes': 'Episodios',
    'podcasts.showNotes': 'Notas del Programa',
    'podcasts.chapters': 'Capítulos',

    // Games
    'games.play': 'Jugar',
    'games.saves': 'Estados de Guardado',
    'games.controls': 'Controles',
    'games.fullscreen': 'Pantalla Completa',
    'games.createSave': 'Crear Guardado',
    'games.loadSave': 'Cargar Guardado',
    'games.deleteSave': 'Eliminar Guardado',

    // Admin
    'admin.dashboard': 'Panel de Control',
    'admin.users': 'Usuarios',
    'admin.media': 'Gestión de Medios',
    'admin.stats': 'Estadísticas',
    'admin.logs': 'Registros',
  },

  fr: {
    // Navigation
    'nav.home': 'Accueil',
    'nav.search': 'Rechercher',
    'nav.library': 'Bibliothèque',
    'nav.live': 'TV en Direct',
    'nav.podcasts': 'Podcasts',
    'nav.games': 'Jeux',
    'nav.settings': 'Paramètres',
    'nav.admin': 'Admin',

    // Common
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.retry': 'Réessayer',
    'common.cancel': 'Annuler',
    'common.save': 'Enregistrer',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.close': 'Fermer',
    'common.back': 'Retour',
    'common.next': 'Suivant',
    'common.previous': 'Précédent',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'common.sort': 'Trier',

    // Media
    'media.play': 'Lire',
    'media.pause': 'Pause',
    'media.stop': 'Arrêter',
    'media.resume': 'Reprendre',
    'media.watchLater': 'Regarder Plus Tard',
    'media.addToPlaylist': 'Ajouter à la Liste',
    'media.removeFromPlaylist': 'Retirer de la Liste',
    'media.download': 'Télécharger',
    'media.share': 'Partager',
    'media.rating': 'Note',
    'media.duration': 'Durée',
    'media.releaseDate': 'Date de Sortie',
    'media.genres': 'Genres',
    'media.director': 'Réalisateur',
    'media.cast': 'Distribution',

    // Player
    'player.quality': 'Qualité',
    'player.subtitles': 'Sous-titres',
    'player.audio': 'Audio',
    'player.speed': 'Vitesse',
    'player.fullscreen': 'Plein Écran',
    'player.pip': 'Image dans l\'Image',
    'player.volume': 'Volume',
    'player.mute': 'Muet',
    'player.unmute': 'Activer le Son',

    // Auth
    'auth.signIn': 'Se Connecter',
    'auth.signOut': 'Se Déconnecter',
    'auth.signUp': 'S\'inscrire',
    'auth.email': 'Email',
    'auth.password': 'Mot de Passe',
    'auth.forgotPassword': 'Mot de Passe Oublié?',
    'auth.rememberMe': 'Se Souvenir de Moi',
    'auth.createAccount': 'Créer un Compte',
    'auth.alreadyHaveAccount': 'Vous avez déjà un compte?',

    // Settings
    'settings.profile': 'Profil',
    'settings.account': 'Compte',
    'settings.preferences': 'Préférences',
    'settings.language': 'Langue',
    'settings.theme': 'Thème',
    'settings.notifications': 'Notifications',
    'settings.privacy': 'Confidentialité',
    'settings.parental': 'Contrôle Parental',

    // Podcasts
    'podcasts.subscribe': 'S\'abonner',
    'podcasts.unsubscribe': 'Se Désabonner',
    'podcasts.episodes': 'Épisodes',
    'podcasts.showNotes': 'Notes de l\'Émission',
    'podcasts.chapters': 'Chapitres',

    // Games
    'games.play': 'Jouer',
    'games.saves': 'États de Sauvegarde',
    'games.controls': 'Contrôles',
    'games.fullscreen': 'Plein Écran',
    'games.createSave': 'Créer une Sauvegarde',
    'games.loadSave': 'Charger une Sauvegarde',
    'games.deleteSave': 'Supprimer une Sauvegarde',

    // Admin
    'admin.dashboard': 'Tableau de Bord',
    'admin.users': 'Utilisateurs',
    'admin.media': 'Gestion des Médias',
    'admin.stats': 'Statistiques',
    'admin.logs': 'Journaux',
  },

  de: {
    // Navigation
    'nav.home': 'Startseite',
    'nav.search': 'Suchen',
    'nav.library': 'Bibliothek',
    'nav.live': 'Live-TV',
    'nav.podcasts': 'Podcasts',
    'nav.games': 'Spiele',
    'nav.settings': 'Einstellungen',
    'nav.admin': 'Admin',

    // Common
    'common.loading': 'Laden...',
    'common.error': 'Fehler',
    'common.retry': 'Wiederholen',
    'common.cancel': 'Abbrechen',
    'common.save': 'Speichern',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.close': 'Schließen',
    'common.back': 'Zurück',
    'common.next': 'Weiter',
    'common.previous': 'Zurück',
    'common.search': 'Suchen',
    'common.filter': 'Filtern',
    'common.sort': 'Sortieren',

    // Media
    'media.play': 'Abspielen',
    'media.pause': 'Pausieren',
    'media.stop': 'Stoppen',
    'media.resume': 'Fortsetzen',
    'media.watchLater': 'Später Ansehen',
    'media.addToPlaylist': 'Zur Playlist Hinzufügen',
    'media.removeFromPlaylist': 'Von Playlist Entfernen',
    'media.download': 'Herunterladen',
    'media.share': 'Teilen',
    'media.rating': 'Bewertung',
    'media.duration': 'Dauer',
    'media.releaseDate': 'Erscheinungsdatum',
    'media.genres': 'Genres',
    'media.director': 'Regisseur',
    'media.cast': 'Besetzung',

    // Player
    'player.quality': 'Qualität',
    'player.subtitles': 'Untertitel',
    'player.audio': 'Audio',
    'player.speed': 'Geschwindigkeit',
    'player.fullscreen': 'Vollbild',
    'player.pip': 'Bild-in-Bild',
    'player.volume': 'Lautstärke',
    'player.mute': 'Stummschalten',
    'player.unmute': 'Ton Aktivieren',

    // Auth
    'auth.signIn': 'Anmelden',
    'auth.signOut': 'Abmelden',
    'auth.signUp': 'Registrieren',
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    'auth.forgotPassword': 'Passwort Vergessen?',
    'auth.rememberMe': 'Angemeldet Bleiben',
    'auth.createAccount': 'Konto Erstellen',
    'auth.alreadyHaveAccount': 'Bereits ein Konto?',

    // Settings
    'settings.profile': 'Profil',
    'settings.account': 'Konto',
    'settings.preferences': 'Einstellungen',
    'settings.language': 'Sprache',
    'settings.theme': 'Design',
    'settings.notifications': 'Benachrichtigungen',
    'settings.privacy': 'Datenschutz',
    'settings.parental': 'Jugendschutz',

    // Podcasts
    'podcasts.subscribe': 'Abonnieren',
    'podcasts.unsubscribe': 'Abbestellen',
    'podcasts.episodes': 'Episoden',
    'podcasts.showNotes': 'Shownotes',
    'podcasts.chapters': 'Kapitel',

    // Games
    'games.play': 'Spielen',
    'games.saves': 'Speicherstände',
    'games.controls': 'Steuerung',
    'games.fullscreen': 'Vollbild',
    'games.createSave': 'Speicherstand Erstellen',
    'games.loadSave': 'Speicherstand Laden',
    'games.deleteSave': 'Speicherstand Löschen',

    // Admin
    'admin.dashboard': 'Dashboard',
    'admin.users': 'Benutzer',
    'admin.media': 'Medienverwaltung',
    'admin.stats': 'Statistiken',
    'admin.logs': 'Protokolle',
  },

  ja: {
    // Navigation
    'nav.home': 'ホーム',
    'nav.search': '検索',
    'nav.library': 'ライブラリ',
    'nav.live': 'ライブTV',
    'nav.podcasts': 'ポッドキャスト',
    'nav.games': 'ゲーム',
    'nav.settings': '設定',
    'nav.admin': '管理',

    // Common
    'common.loading': '読み込み中...',
    'common.error': 'エラー',
    'common.retry': '再試行',
    'common.cancel': 'キャンセル',
    'common.save': '保存',
    'common.delete': '削除',
    'common.edit': '編集',
    'common.close': '閉じる',
    'common.back': '戻る',
    'common.next': '次へ',
    'common.previous': '前へ',
    'common.search': '検索',
    'common.filter': 'フィルター',
    'common.sort': '並び替え',

    // Media
    'media.play': '再生',
    'media.pause': '一時停止',
    'media.stop': '停止',
    'media.resume': '続きから再生',
    'media.watchLater': '後で見る',
    'media.addToPlaylist': 'プレイリストに追加',
    'media.removeFromPlaylist': 'プレイリストから削除',
    'media.download': 'ダウンロード',
    'media.share': '共有',
    'media.rating': '評価',
    'media.duration': '再生時間',
    'media.releaseDate': '公開日',
    'media.genres': 'ジャンル',
    'media.director': '監督',
    'media.cast': 'キャスト',

    // Player
    'player.quality': '画質',
    'player.subtitles': '字幕',
    'player.audio': '音声',
    'player.speed': '再生速度',
    'player.fullscreen': 'フルスクリーン',
    'player.pip': 'ピクチャ・イン・ピクチャ',
    'player.volume': '音量',
    'player.mute': 'ミュート',
    'player.unmute': 'ミュート解除',

    // Auth
    'auth.signIn': 'ログイン',
    'auth.signOut': 'ログアウト',
    'auth.signUp': '新規登録',
    'auth.email': 'メールアドレス',
    'auth.password': 'パスワード',
    'auth.forgotPassword': 'パスワードをお忘れですか？',
    'auth.rememberMe': 'ログイン状態を保持',
    'auth.createAccount': 'アカウント作成',
    'auth.alreadyHaveAccount': '既にアカウントをお持ちですか？',

    // Settings
    'settings.profile': 'プロフィール',
    'settings.account': 'アカウント',
    'settings.preferences': '環境設定',
    'settings.language': '言語',
    'settings.theme': 'テーマ',
    'settings.notifications': '通知',
    'settings.privacy': 'プライバシー',
    'settings.parental': 'ペアレンタルコントロール',

    // Podcasts
    'podcasts.subscribe': '登録',
    'podcasts.unsubscribe': '登録解除',
    'podcasts.episodes': 'エピソード',
    'podcasts.showNotes': '番組ノート',
    'podcasts.chapters': 'チャプター',

    // Games
    'games.play': 'プレイ',
    'games.saves': 'セーブステート',
    'games.controls': '操作方法',
    'games.fullscreen': 'フルスクリーン',
    'games.createSave': 'セーブ作成',
    'games.loadSave': 'セーブ読込',
    'games.deleteSave': 'セーブ削除',

    // Admin
    'admin.dashboard': 'ダッシュボード',
    'admin.users': 'ユーザー',
    'admin.media': 'メディア管理',
    'admin.stats': '統計',
    'admin.logs': 'ログ',
  },

  ar: {
    // Navigation
    'nav.home': 'الرئيسية',
    'nav.search': 'بحث',
    'nav.library': 'المكتبة',
    'nav.live': 'بث مباشر',
    'nav.podcasts': 'بودكاست',
    'nav.games': 'ألعاب',
    'nav.settings': 'إعدادات',
    'nav.admin': 'الإدارة',

    // Common
    'common.loading': 'جار التحميل...',
    'common.error': 'خطأ',
    'common.retry': 'إعادة المحاولة',
    'common.cancel': 'إلغاء',
    'common.save': 'حفظ',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.close': 'إغلاق',
    'common.back': 'رجوع',
    'common.next': 'التالي',
    'common.previous': 'السابق',
    'common.search': 'بحث',
    'common.filter': 'تصفية',
    'common.sort': 'ترتيب',

    // Media
    'media.play': 'تشغيل',
    'media.pause': 'إيقاف مؤقت',
    'media.stop': 'إيقاف',
    'media.resume': 'متابعة',
    'media.watchLater': 'مشاهدة لاحقاً',
    'media.addToPlaylist': 'إضافة إلى قائمة التشغيل',
    'media.removeFromPlaylist': 'إزالة من قائمة التشغيل',
    'media.download': 'تحميل',
    'media.share': 'مشاركة',
    'media.rating': 'التقييم',
    'media.duration': 'المدة',
    'media.releaseDate': 'تاريخ الإصدار',
    'media.genres': 'الأنواع',
    'media.director': 'المخرج',
    'media.cast': 'طاقم التمثيل',

    // Player
    'player.quality': 'الجودة',
    'player.subtitles': 'الترجمة',
    'player.audio': 'الصوت',
    'player.speed': 'السرعة',
    'player.fullscreen': 'ملء الشاشة',
    'player.pip': 'صورة ضمن صورة',
    'player.volume': 'مستوى الصوت',
    'player.mute': 'كتم الصوت',
    'player.unmute': 'إلغاء كتم الصوت',

    // Auth
    'auth.signIn': 'تسجيل الدخول',
    'auth.signOut': 'تسجيل الخروج',
    'auth.signUp': 'إنشاء حساب',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.forgotPassword': 'نسيت كلمة المرور؟',
    'auth.rememberMe': 'تذكرني',
    'auth.createAccount': 'إنشاء حساب',
    'auth.alreadyHaveAccount': 'لديك حساب بالفعل؟',

    // Settings
    'settings.profile': 'الملف الشخصي',
    'settings.account': 'الحساب',
    'settings.preferences': 'التفضيلات',
    'settings.language': 'اللغة',
    'settings.theme': 'المظهر',
    'settings.notifications': 'الإشعارات',
    'settings.privacy': 'الخصوصية',
    'settings.parental': 'الرقابة الأبوية',

    // Podcasts
    'podcasts.subscribe': 'اشتراك',
    'podcasts.unsubscribe': 'إلغاء الاشتراك',
    'podcasts.episodes': 'الحلقات',
    'podcasts.showNotes': 'ملاحظات البرنامج',
    'podcasts.chapters': 'الفصول',

    // Games
    'games.play': 'العب',
    'games.saves': 'حالات الحفظ',
    'games.controls': 'التحكم',
    'games.fullscreen': 'ملء الشاشة',
    'games.createSave': 'إنشاء حفظ',
    'games.loadSave': 'تحميل حفظ',
    'games.deleteSave': 'حذف حفظ',

    // Admin
    'admin.dashboard': 'لوحة التحكم',
    'admin.users': 'المستخدمون',
    'admin.media': 'إدارة الوسائط',
    'admin.stats': 'الإحصائيات',
    'admin.logs': 'السجلات',
  },
};

// i18n instance
class I18n {
  private currentLocale: Locale = DEFAULT_LOCALE;
  private listeners: Array<(locale: Locale) => void> = [];

  constructor() {
    // Load saved locale from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('locale') as Locale;
      if (saved && translations[saved]) {
        this.currentLocale = saved;
      }
    }
  }

  getLocale(): Locale {
    return this.currentLocale;
  }

  setLocale(locale: Locale) {
    if (!translations[locale]) {
      console.warn(`Locale "${locale}" not supported, falling back to ${DEFAULT_LOCALE}`);
      locale = DEFAULT_LOCALE;
    }

    this.currentLocale = locale;

    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', locale);
      document.documentElement.lang = locale;
      document.documentElement.dir = RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';
    }

    this.listeners.forEach(listener => listener(locale));
  }

  t(key: TranslationKey, params?: Record<string, string>): string {
    let text = translations[this.currentLocale][key] || translations[DEFAULT_LOCALE][key] || key;

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        text = text.replace(`{${key}}`, value);
      });
    }

    return text;
  }

  isRTL(): boolean {
    return RTL_LOCALES.includes(this.currentLocale);
  }

  subscribe(listener: (locale: Locale) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

// Export singleton instance
export const i18n = new I18n();

// React hook
export function useI18n() {
  const [locale, setLocale] = React.useState<Locale>(i18n.getLocale());

  React.useEffect(() => {
    return i18n.subscribe(setLocale);
  }, []);

  return {
    locale,
    setLocale: (loc: Locale) => i18n.setLocale(loc),
    t: (key: TranslationKey, params?: Record<string, string>) => i18n.t(key, params),
    isRTL: () => i18n.isRTL(),
  };
}

// For React import
import * as React from 'react';
