import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  setDoc,
  getDoc,
  getDocs,
  collectionGroup,
  deleteDoc,
  serverTimestamp,
  increment,
  getDocFromServer,
  where,
  writeBatch,
  limit,
  arrayUnion
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  logout,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signInAnonymously
} from './lib/firebase';
import { Scene, Comment, OperationType, FirestoreErrorInfo, Profile, Report, AdminMessage, Chat, Message, Announcement } from './types';
import { cn } from './lib/utils';
import { calculateFossilInfo } from './utils/fossilUtils';
import { FossilizedContent, FossilOverlay } from './components/FossilizedContent';
import FossilChipStation from './components/FossilChipStation';
import JimiPlazaView from './components/JimiPlazaView';
import { JseView } from './components/JseView';
import KairanbanView from './components/KairanbanView';
import TermsView from './components/TermsView';
import PrivacyView from './components/PrivacyView';
import GuidelinesView from './components/GuidelinesView';
import { JimiLandingPage } from './components/JimiLandingPage';
import WidgetView from './components/WidgetView';
import { 
  MessageSquare, 
  ThumbsUp, 
  Plus, 
  LogOut, 
  User as UserIcon, 
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  X,
  ArrowLeft,
  Settings,
  Edit2,
  Flag,
  Trash2,
  Shield,
  Ban,
  MessageCircle,
  Bell,
  Image as ImageIcon,
  UserPlus,
  UserMinus,
  Camera,
  Mail,
  Lock,
  AtSign,
  Chrome,
  Volume2,
  ImagePlus,
  Search,
  TrendingUp,
  Hash,
  Activity,
  Users,
  Award,
  Flame,
  Zap,
  Trophy,
  Target,
  Crown,
  Bookmark,
  Coins,
  Key,
  Globe,
  Briefcase,
  GraduationCap,
  Heart,
  Gift,
  Smile,
  Menu
} from 'lucide-react';
import { useLanguage } from './lib/LanguageContext';
import BadgeDisplay from './components/BadgeDisplay';
import { 
  calculateUserStats, 
  BADGES, 
  TITLES,
  registerCustomBadge,
  registerCustomTitlePrefix,
  registerCustomTitleSuffix,
  getBadgeRarityStyle
} from './lib/badgeUtils';
import { 
  registerPrefixRarity, 
  registerSuffixRarity 
} from './lib/titleRarityUtils';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import BadgeCustomizeModal from './components/BadgeCustomizeModal';
import TitleCustomizeModal from './components/TitleCustomizeModal';
import UnlocksCelebration from './components/UnlocksCelebration';
import RarityTitle from './components/RarityTitle';
import JimiGachaModal from './components/JimiGachaModal';
import LoginBonusModal from './components/LoginBonusModal';
import StickerSelector from './components/StickerSelector';
import { TutorialModal } from './components/TutorialModal';
import { RankingView } from './components/RankingView';
import { getRangesForPeriod } from './utils/rankingDates';
import { 
  getGachaState, 
  awardGachaCoins, 
  earnFromPost, 
  earnFromUpvoteSent, 
  earnFromUpvoteReceived, 
  handleDailyLoginReward,
  awardGachaItem,
  registerDynamicGachaItem,
  setProfileSynced
} from './lib/gachaStore';

export interface Sticker {
  id: string;
  name: string;
  nameEn: string;
  url: string;
  category: 'popular' | 'reaction';
}

export const STICKERS: Sticker[] = [
  {
    id: 'sticker_naru',
    name: 'なるほど',
    nameEn: 'I see',
    url: 'https://files.catbox.moe/ixiru0.png',
    category: 'popular'
  },
  {
    id: 'sticker_waka',
    name: 'わかる',
    nameEn: 'Relatable',
    url: 'https://files.catbox.moe/yi7btt.png',
    category: 'popular'
  },
  {
    id: 'sticker_jimi',
    name: '地味',
    nameEn: 'Subtle',
    url: 'https://files.catbox.moe/9zctoh.png',
    category: 'reaction'
  },
  {
    id: 'sticker_kusa',
    name: '草',
    nameEn: 'Lmao',
    url: 'https://files.catbox.moe/jlbvbf.png',
    category: 'reaction'
  }
];

// --- Error Handling ---
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isQuota = errMsg.toLowerCase().includes('quota') || 
                  errMsg.toLowerCase().includes('exhausted') || 
                  errMsg.toLowerCase().includes('permission') || 
                  errMsg.toLowerCase().includes('unavailable') ||
                  errMsg.toLowerCase().includes('limit');

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));

  if (isQuota) {
    try {
      localStorage.setItem('jimicchi_db_quota_exceeded', 'true');
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('jimicchi_quota_change'));
    } catch (_) {}
    console.warn(`[Quota Fallback Mode] Firestore operation failed due to database limits. Operating in local mode for: ${path}`);
    return; // Return gracefully instead of raising a fatal app exception!
  }

  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const { language, setLanguage, t } = useLanguage();

  // Widget mode check
  const urlParams = new URLSearchParams(window.location.search);
  const isWidgetMode = urlParams.get('widget') === '1';
  const widgetUid = urlParams.get('uid');

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [displayLimit, setDisplayLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitContent, setSubmitContent] = useState('');
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [showRanking, setShowRanking] = useState(false);

  const [allScenes, setAllScenes] = useState<Scene[]>([]);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(() => {
    try {
      return localStorage.getItem('jimicchi_db_quota_exceeded') === 'true';
    } catch (_) {
      return false;
    }
  });

  const [botLogs, setBotLogs] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    const handleQuotaChange = () => {
      try {
        setIsQuotaExceeded(localStorage.getItem('jimicchi_db_quota_exceeded') === 'true');
      } catch (_) {}
    };
    window.addEventListener('storage', handleQuotaChange);
    // Listen for custom trigger in same tab
    window.addEventListener('jimicchi_quota_change', handleQuotaChange);
    return () => {
      window.removeEventListener('storage', handleQuotaChange);
      window.removeEventListener('jimicchi_quota_change', handleQuotaChange);
    };
  }, []);
  
  const viewedScenesRef = useRef<Set<string>>(new Set());
  const isFirstMessageLoadRef = useRef(true);

  const handleSceneViewed = async (sceneId: string) => {
    if (viewedScenesRef.current.has(sceneId)) return;
    viewedScenesRef.current.add(sceneId);
    try {
      const sceneRef = doc(db, 'scenes', sceneId);
      await updateDoc(sceneRef, {
        views: increment(1)
      });
    } catch (error) {
      console.error('Failed to increment view count on display:', error);
    }
  };

  const handleSelectScene = async (scene: Scene) => {
    setSelectedScene(scene);
    if (window.location.pathname !== `/post/${scene.id}`) {
      window.history.pushState({ sceneId: scene.id }, '', `/post/${scene.id}`);
    }
    try {
      const sceneRef = doc(db, 'scenes', scene.id);
      await updateDoc(sceneRef, {
        views: increment(1)
      });
    } catch (error) {
      console.error('Failed to increment view count:', error);
    }
  };

  const handleDismissTutorial = async () => {
    setShowTutorial(false);
    if (user) {
      try {
        const profileRef = doc(db, 'profiles', user.uid);
        await updateDoc(profileRef, {
          hasSeenTutorial: true
        });
        setUserProfile(prev => prev ? { ...prev, hasSeenTutorial: true } : null);
      } catch (err) {
        console.error("Failed to update hasSeenTutorial:", err);
      }
    }
  };
  const [aiLoading, setAiLoading] = useState(false);
  const [view, setView] = useState<'feed' | 'profile' | 'plaza' | 'terms' | 'privacy' | 'guidelines' | 'about' | 'jse'>(() => {
    const path = window.location.pathname;
    if (path === '/terms') return 'terms';
    if (path === '/privacy') return 'privacy';
    if (path === '/guidelines') return 'guidelines';
    if (path === '/plaza') return 'plaza';
    if (path === '/jse') return 'jse';
    if (path === '/about' || path === '/welcome' || path === '/landing') return 'about';
    if (path === '/profile' || path.startsWith('/profile')) return 'profile';
    return 'feed';
  });

  const handleViewChange = (newView: 'feed' | 'profile' | 'plaza' | 'terms' | 'privacy' | 'guidelines' | 'about' | 'jse', profileId?: string | null) => {
    let path = '/';
    if (newView === 'terms') path = '/terms';
    else if (newView === 'privacy') path = '/privacy';
    else if (newView === 'guidelines') path = '/guidelines';
    else if (newView === 'plaza') path = '/plaza';
    else if (newView === 'jse') path = '/jse';
    else if (newView === 'about') path = '/about';
    else if (newView === 'profile') {
      path = profileId ? `/profile?uid=${profileId}` : '/profile';
    }

    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setView(newView);
    if (newView === 'profile' && profileId) {
      setViewedProfileId(profileId);
    }
    setSelectedScene(null);
    setShowRanking(false);
    setShowMobileMenu(false);
  };

  // Initial load watcher for post URLs (/post/:id)
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/post/')) {
      const postId = path.split('/post/')[1];
      if (postId) {
        getDoc(doc(db, 'scenes', postId)).then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setSelectedScene({
              id: docSnap.id,
              ...data
            } as Scene);
          }
        }).catch((err) => {
          console.error("Failed to load post by URL on mount:", err);
        });
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/post/')) {
        const postId = path.split('/post/')[1];
        if (postId) {
          getDoc(doc(db, 'scenes', postId)).then((docSnap) => {
            if (docSnap.exists()) {
              setSelectedScene({
                id: docSnap.id,
                ...docSnap.data()
              } as Scene);
            }
          }).catch(err => console.error("Error on popstate post load:", err));
        }
        setView('feed');
      } else if (path === '/terms') {
        setView('terms');
        setSelectedScene(null);
      } else if (path === '/privacy') {
        setView('privacy');
        setSelectedScene(null);
      } else if (path === '/guidelines') {
        setView('guidelines');
        setSelectedScene(null);
      } else if (path === '/about' || path === '/welcome' || path === '/landing') {
        setView('about');
        setSelectedScene(null);
      } else if (path === '/plaza') {
        setView('plaza');
        setSelectedScene(null);
      } else if (path.startsWith('/profile')) {
        setView('profile');
        setSelectedScene(null);
        const params = new URLSearchParams(window.location.search);
        const uid = params.get('uid');
        if (uid) setViewedProfileId(uid);
      } else {
        setView('feed');
        setSelectedScene(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const titleBase = " | 地味っち (Jimicchi)";
    const metaDesc = document.querySelector('meta[name="description"]');
    
    // Ensure keywords meta tag exists
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    
    // Dynamic OGP helper
    const updateOGTag = (property: string, content: string) => {
      let el = document.head.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Dynamic Twitter Cards helper
    const updateTwitterTag = (name: string, content: string) => {
      let el = document.head.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    let titleText = "地味っち - 地味に共感するSNS | ささやかな日常を愛するあるあるSNS";
    let descText = "日々の地味な出来事、小さなこだわり、どうでもいい日常を投稿して『地味な共感』を分かち合う、最高に優しいコミュニティSNS。高校生が開発した地味っち（Jimicchi）。";
    let typeText = "website";
    let urlText = window.location.origin;
    let schemaJson: any = null;

    if (selectedScene) {
      titleText = `「${selectedScene.title}」 ささやかなあるある投稿${titleBase}`;
      descText = `「${selectedScene.title}」 共感数: ${selectedScene.upvotes || 0} | 地味に共感できる日常のあるある投稿です。地味っちでゆったり共感しよう。`;
      typeText = "article";
      urlText = `${window.location.origin}/?sceneId=${selectedScene.id}`;
      
      schemaJson = {
        "@context": "https://schema.org",
        "@type": "SocialMediaPosting",
        "headline": selectedScene.title,
        "datePublished": selectedScene.createdAt ? new Date(selectedScene.createdAt.toMillis()).toISOString() : new Date().toISOString(),
        "author": {
          "@type": "Person",
          "name": selectedScene.authorName || "地味っちユーザー"
        },
        "description": descText,
        "url": urlText,
        "interactionStatistic": {
          "@type": "InteractionCounter",
          "interactionType": "https://schema.org/LikeAction",
          "userInteractionCount": selectedScene.upvotes || 0
        }
      };
    } else if (view === 'terms') {
      titleText = "利用規約" + titleBase;
      descText = "地味っちの利用規約です。当サービスをご利用いただくにあたっての条件について詳しく説明しています。";
    } else if (view === 'privacy') {
      titleText = "プライバシーポリシー" + titleBase;
      descText = "地味っちのプライバシーポリシーです。Googleログイン、Firebase Authentication、Cloud Firestore、GCPなどの個人情報の安全な取り扱いについて説明しています。";
    } else if (view === 'guidelines') {
      titleText = "コミュニティガイドライン" + titleBase;
      descText = "地味っちのコミュニティガイドラインです。地味っちをみんなで気持ちよく、柔らかく楽しむためのマナーや考え方について説明しています。";
    } else if (view === 'about') {
      titleText = "地味っちについて (About Jimicchi)" + titleBase;
      descText = "高校生が開発した『地味に共感するSNS』地味っち（Jimicchi）の紹介サイト・公式ホームページ。詳しい使い方、特徴や魅力を紹介。";
    } else if (view === 'plaza') {
      titleText = "地味ひろば - イベント・ハイク・川柳・ダジャレ" + titleBase;
      descText = "地味っち達が集まるイベント広場！様々なテーマの地味話、地味俳句、ダジャレ、地味電子書籍をお楽しみください。";
    } else if (view === 'profile') {
      titleText = "プロフィール" + titleBase;
      descText = "地味っちユーザーのプロフィールと、これまでに投稿された地味な日常一覧。";
    }

    document.title = titleText;
    if (metaDesc) metaDesc.setAttribute('content', descText);
    metaKeywords.setAttribute('content', "地味っち, Jimicchi, SNS, あるある, 共感, 高校生開発, 個人開発, クリエイター支援, 投げ銭, ブログパーツ, はてなブログ, WordPress, SEO, 被リンク");

    // Dynamic OGP
    updateOGTag('og:title', titleText);
    updateOGTag('og:description', descText);
    updateOGTag('og:type', typeText);
    updateOGTag('og:url', urlText);
    updateOGTag('og:site_name', '地味っち');
    updateOGTag('og:image', 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=jimicchi_seo_og_v3');
    
    // Twitter Card
    updateTwitterTag('twitter:card', 'summary_large_image');
    updateTwitterTag('twitter:title', titleText);
    updateTwitterTag('twitter:description', descText);
    updateTwitterTag('twitter:image', 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=jimicchi_seo_og_v3');

    // JSON-LD Structured Data
    if (!schemaJson) {
      schemaJson = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "地味っち",
        "alternateName": "Jimicchi",
        "url": window.location.origin,
        "description": descText,
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${window.location.origin}/?search={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      };
    }

    let ldScript = document.getElementById('jimicchi-seo-jsonld') as HTMLScriptElement;
    if (!ldScript) {
      ldScript = document.createElement('script');
      ldScript.id = 'jimicchi-seo-jsonld';
      ldScript.type = 'application/ld+json';
      document.head.appendChild(ldScript);
    }
    ldScript.textContent = JSON.stringify(schemaJson);

  }, [view, selectedScene]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [copyToastVisible, setCopyToastVisible] = useState(false);

  const handleCopyToClipboard = (text: string) => {
    let success = false;

    // Create a temporary textarea element
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Position styling to prevent scrolling and hide the element
    textArea.style.fontSize = '12pt';
    textArea.style.border = '0';
    textArea.style.padding = '0';
    textArea.style.margin = '0';
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = (window.pageYOffset || document.documentElement.scrollTop) + 'px';
    textArea.setAttribute('readonly', '');
    
    document.body.appendChild(textArea);
    
    // iOS and Safari selection handling
    const isIOS = navigator.userAgent.match(/ipad|iphone/i);
    if (isIOS) {
      const range = document.createRange();
      range.selectNodeContents(textArea);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      textArea.setSelectionRange(0, 999999);
    } else {
      textArea.focus();
      textArea.select();
    }

    try {
      success = document.execCommand('copy');
      if (success) {
        setCopyToastVisible(true);
      }
    } catch (err) {
      console.error('execCommand copy failed:', err);
    }
    
    document.body.removeChild(textArea);

    // If synchronous copy failed, try the asynchronous wrapper as a backup
    if (!success && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopyToastVisible(true);
      }).catch((err) => {
        console.error('navigator.clipboard copy failed too:', err);
      });
    }
  };

  const handleCopyPost = (scene: Scene) => {
    let body = '';
    if (scene.title && scene.content) {
      if (scene.title.trim() === scene.content.trim()) {
        body = scene.title.trim();
      } else {
        body = `${scene.title.trim()}\n\n${scene.content.trim()}`;
      }
    } else {
      body = (scene.title || scene.content || '').trim();
    }
    const copyText = `${body}\n\n#ジミっち`;
    handleCopyToClipboard(copyText);
  };

  useEffect(() => {
    if (copyToastVisible) {
      const timer = setTimeout(() => {
        setCopyToastVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copyToastVisible]);

  useEffect(() => {
    const q = collection(db, 'profiles');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mapping: Record<string, Profile> = {};
      snapshot.forEach(doc => {
        mapping[doc.id] = { uid: doc.id, ...doc.data() } as Profile;
      });
      setProfiles(mapping);
    }, (error) => {
      console.warn("Profiles snapshot listener failed:", error.message);
    });
    return () => unsubscribe();
  }, []);

  // Sync custom titles and badges
  useEffect(() => {
    const unsubBadges = onSnapshot(collection(db, 'customBadges'), (snapshot) => {
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const badgeObj = {
          id: docSnap.id,
          name: data.name,
          description: data.description || 'キャンペーン配布限定バッジ',
          iconName: data.iconName || 'Award',
          emoji: data.emoji || '🎁',
          color: data.color || 'text-orange-600',
          bgColor: data.bgColor || 'bg-orange-50',
          borderColor: data.borderColor || 'border-orange-200',
          conditionText: data.conditionText || 'キャンペーン報酬',
          type: 'custom',
          threshold: 999999,
          category: 'unique',
          rarity: data.rarity || 'common'
        } as any;
        registerCustomBadge(badgeObj);

        // Dynamically add to Gacha Store's GACHA_POOL list
        registerDynamicGachaItem({
          id: docSnap.id,
          name: data.name,
          emoji: data.emoji || '🎁',
          type: 'badge',
          rarity: data.rarity || 'common'
        });

        // Administrator automatically gets the custom badges
        if (isAdmin && user) {
          const state = getGachaState(user.uid);
          if (!state.unlockedBadgeIds.includes(docSnap.id)) {
            awardGachaItem(user.uid, 'special_badge', docSnap.id);
          }
        }
      });
      setGachaRevision(prev => prev + 1);
    }, (error) => {
      console.warn("customBadges snapshot listener failed:", error.message);
    });

    const unsubTitleParts = onSnapshot(collection(db, 'customTitleParts'), (snapshot) => {
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const partObj = {
          id: docSnap.id,
          text: data.text,
          conditionText: data.conditionText || 'キャンペーン配布',
          type: 'custom',
          threshold: 999999,
          rarity: data.rarity || 'common'
        } as any;

        if (data.position === 'prefix') {
          registerCustomTitlePrefix(partObj);
          registerPrefixRarity(data.text, data.rarity || 'common');
        } else {
          registerCustomTitleSuffix(partObj);
          registerSuffixRarity(data.text, data.rarity || 'common');
        }

        // Dynamically add to Gacha Store's GACHA_POOL list
        registerDynamicGachaItem({
          id: docSnap.id,
          name: data.text,
          type: data.position === 'prefix' ? 'prefix' : 'suffix',
          rarity: data.rarity || 'common'
        });

        // Administrator automatically gets the custom title parts
        if (isAdmin && user) {
          const state = getGachaState(user.uid);
          const isPrefix = data.position === 'prefix';
          const listToCheck = isPrefix ? state.unlockedPrefixIds : state.unlockedSuffixIds;
          if (!listToCheck.includes(docSnap.id)) {
            awardGachaItem(user.uid, 'special_title', docSnap.id);
          }
        }
      });
      setGachaRevision(prev => prev + 1);
    }, (error) => {
      console.warn("customTitleParts snapshot listener failed:", error.message);
    });

    return () => {
      unsubBadges();
      unsubTitleParts();
    };
  }, [isAdmin, user]);

  const [viewedProfileId, setViewedProfileId] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [activeCampaignRewards, setActiveCampaignRewards] = useState<{ title: string; msg: string }[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [myScenes, setMyScenes] = useState<Scene[]>([]);

  useEffect(() => {
    if (!user) {
      setMyScenes([]);
      return;
    }
    const q = query(collection(db, 'scenes'), where('authorId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Scene[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Scene);
      });
      setMyScenes(data);
    }, (error) => {
      console.error("Failed to load user's own scenes:", error);
    });
    return () => unsubscribe();
  }, [user]);

  const myProfile = user ? profiles[user.uid] : null;

  const myStats = useMemo(() => {
    if (!user) return null;
    return calculateUserStats(myScenes, myProfile);
  }, [myScenes, myProfile, user]);
  const [upvotedScenes, setUpvotedScenes] = useState<Set<string>>(new Set());
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [followerCounts, setFollowerCounts] = useState<Record<string, number>>({});
  const [followingCounts, setFollowingCounts] = useState<Record<string, number>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [showChatList, setShowChatList] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncementPopup, setShowAnnouncementPopup] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  const [showAnnouncementHistory, setShowAnnouncementHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortMode, setSortMode] = useState<'latest' | 'popular'>('latest');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<Profile[]>([]);
  const [stats, setStats] = useState<{ totalUsers: number, activeUsers24h: number, totalScenes: number } | null>(null);
  const [showUserSearch, setShowUserSearch] = useState(false);

  const [showGachaModal, setShowGachaModal] = useState(false);
  const [showSupportLinkModal, setShowSupportLinkModal] = useState(false);
  const [showGeneralSashiireModal, setShowGeneralSashiireModal] = useState(false);
  const [supportLinkInput, setSupportLinkInput] = useState('');
  const [supportLinkLoading, setSupportLinkLoading] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [gachaRevision, setGachaRevision] = useState(0);
  const [loginRewardDetails, setLoginRewardDetails] = useState<null | { streak: number; coins: number; milestone: boolean }>(null);
  const [activeLoginBonusBoard, setActiveLoginBonusBoard] = useState<any>(null);
  const [userLoginBonusClaim, setUserLoginBonusClaim] = useState<any>(null);
  const [showLoginBonusModal, setShowLoginBonusModal] = useState(false);

  const [currentTodayStr, setCurrentTodayStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Keep currentTodayStr in sync with local clock (handles midnight rollover)
  useEffect(() => {
    const updateTodayStr = () => {
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setCurrentTodayStr(prev => {
        if (prev !== todayStr) {
          console.log("Midnight rollover detected or date changed! New date:", todayStr);
          return todayStr;
        }
        return prev;
      });
    };

    updateTodayStr(); // run initially
    const interval = setInterval(updateTodayStr, 10000); // Check every 10 seconds
    window.addEventListener('focus', updateTodayStr); // Check on focus

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', updateTodayStr);
    };
  }, []);

  // Deep Link handler for user profile redirection from widgets or referral links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetUid = params.get('uid') || params.get('from_widget') || params.get('profile') || params.get('ref');
    if (targetUid) {
      setViewedProfileId(targetUid);
      setView('profile');
      try {
        sessionStorage.setItem('jimicchi_referred_by_uid', targetUid);
      } catch (_) {}
    }
  }, []);

  // Automated BOT simulation loop - now staggered and slowed down per bot persona to look realistic and lower API stress
  useEffect(() => {
    if (!isAdmin || !user) return;

    const botUids = ["bot_tanaka", "bot_yuka", "bot_satoshy", "bot_jimi_taro", "bot_sleepy_mimi"];
    
    const activeTimeouts: NodeJS.Timeout[] = [];
    const activeIntervals: NodeJS.Timeout[] = [];

    botUids.forEach((botId, index) => {
      // 1. Initial staggered delays so bots start at completely different moments
      // Tanaka: 15s, Yuka: 50s, Satoshy: 85s, JimiTaro: 120s, Mimi: 155s
      const offsetDelay = 15000 + index * 35000;

      const triggerThisBot = async () => {
        try {
          await triggerBotSimulation(botId);
        } catch (err) {
          console.error(`Automated background active trigger for ${botId} failed:`, err);
        }
      };

      const delayTimeout = setTimeout(() => {
        triggerThisBot();

        // 2. Set individual slow-paced intervals: each bot operates every 180s to 320s (approx 3 to 5.3 minutes)
        // Add random dispersion so their periods are coprime / staggered permanently
        const slowPeriod = 180000 + (index * 25000) + Math.floor(Math.random() * 20000);
        
        const botInterval = setInterval(triggerThisBot, slowPeriod);
        activeIntervals.push(botInterval);

      }, offsetDelay);

      activeTimeouts.push(delayTimeout);
    });

    return () => {
      activeTimeouts.forEach(clearTimeout);
      activeIntervals.forEach(clearInterval);
    };
  }, [isAdmin, user]);

  // Sync Support Link input with user profile
  useEffect(() => {
    if (userProfile) {
      setSupportLinkInput(userProfile.supportLink || '');
    }
  }, [userProfile]);

  const handleGlobalUpdateSupportLink = async (newLink: string) => {
    if (!user) return;
    setSupportLinkLoading(true);
    try {
      const myProfileRef = doc(db, 'profiles', user.uid);
      await updateDoc(myProfileRef, {
        supportLink: newLink.trim() || null
      });

      setUserProfile(prev => prev ? {
        ...prev,
        supportLink: newLink.trim() || undefined
      } : null);

      alert(t('おやつの差し入れ先（支援URL）を更新しました！🎁', 'Your support/tip link has been updated successfully!🎁'));
      setShowSupportLinkModal(false);
    } catch (err: any) {
      console.error("Failed to update support link globally:", err);
      alert(t('おやつ差し入れ先の更新に失敗しました: ', 'Failed to update support link: ') + err.message);
    } finally {
      setSupportLinkLoading(false);
    }
  };

  // Reactive transitions for interactive tutorial
  useEffect(() => {
    if (tutorialStep === null) return;

    if (tutorialStep === 2 && showSubmit) {
      setTutorialStep(3);
    }
    if (tutorialStep === 3 && !showSubmit) {
      setTutorialStep(2);
    }
    if (tutorialStep === 4 && showGachaModal) {
      setTutorialStep(5);
    }
    if (tutorialStep === 5 && !showGachaModal) {
      setTutorialStep(4);
    }
    if (tutorialStep === 6 && view === 'profile' && viewedProfileId === user?.uid) {
      setTutorialStep(7);
    }
  }, [showSubmit, showGachaModal, view, viewedProfileId, tutorialStep, user]);

  useEffect(() => {
    if (tutorialStep === 7 && view === 'plaza') {
      setTutorialStep(8);
    }
  }, [view, tutorialStep]);

  // Track coordinates of tutorial's spotlight targets dynamically
  useEffect(() => {
    if (tutorialStep === null || tutorialStep <= 0 || tutorialStep > 8) {
      setSpotlightRect(null);
      return;
    }

    let selector = '';
    if (tutorialStep === 1) selector = '.btn-upvote-action';
    else if (tutorialStep === 2) selector = '#btn-inline-post';
    else if (tutorialStep === 3) {
      if (!submitTitle.trim()) {
        selector = '#tour-input-title';
      } else if (!submitContent.trim()) {
        selector = '#tour-input-content';
      } else {
        selector = '#btn-submit-post';
      }
    }
    else if (tutorialStep === 4) selector = '#btn-desktop-gacha, #btn-mobile-gacha';
    else if (tutorialStep === 5) selector = '#btn-draw-gacha';
    else if (tutorialStep === 6) selector = '#btn-desktop-profile, #btn-mobile-profile';
    else if (tutorialStep === 7) selector = '#btn-desktop-plaza';
    else if (tutorialStep === 8) selector = '#btn-claim-tutorial-reward';

    if (!selector) {
      setSpotlightRect(null);
      return;
    }

    const updateRect = () => {
      const element = document.querySelector(selector);
      if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setSpotlightRect(rect);
        }
      } else {
        setSpotlightRect(null);
      }
    };

    // Scroll the target element into view on step transitions
    const element = document.querySelector(selector);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    updateRect();

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, { passive: true });
    
    // Check frequently to follow modal state transitions or lazy loads
    const timer = setInterval(updateRect, 250);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
      clearInterval(timer);
    };
  }, [tutorialStep, showSubmit, showGachaModal, view, viewedProfileId, submitTitle, submitContent]);

  const userGachaState = useMemo(() => {
    if (!user) return null;
    return getGachaState(user.uid);
  }, [user, gachaRevision]);

  useEffect(() => {
    if (!user || !myStats) return;
    const key = `claimed_badge_coins_${user.uid}`;
    const previousBadgeCountVal = localStorage.getItem(key);
    const prevCount = previousBadgeCountVal ? parseInt(previousBadgeCountVal, 10) : 0;
    const currentCount = myStats.earnedBadges.length;
    if (currentCount > prevCount) {
      if (prevCount > 0) {
        const added = currentCount - prevCount;
        awardGachaCoins(user.uid, added * 50, '実績バッジ解放');
      } else {
        // Welcoming starter bonus
        awardGachaCoins(user.uid, 100, '初期バッジ歓迎ボーナス');
      }
      localStorage.setItem(key, String(currentCount));
      setGachaRevision(prev => prev + 1);
    }
  }, [myStats?.earnedBadges.length, user?.uid]);

  // Handle Stripe callback parameter for real coin payments
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const stripeSessionId = params.get('stripe_session_id');
    if (!stripeSessionId) return;

    const processedSessionsKey = `processed_stripe_sessions_${user.uid}`;
    let processed: string[] = [];
    try {
      processed = JSON.parse(localStorage.getItem(processedSessionsKey) || '[]');
    } catch (e) {}

    if (processed.includes(stripeSessionId)) {
      // Clean url param immediately if already processed
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', newUrl);
      return;
    }

    const verifySession = async () => {
      try {
        const res = await fetch('/api/stripe/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: stripeSessionId })
        });
        if (!res.ok) throw new Error('サーバー決済検証に失敗しました。');
        
        const data = await res.json();
        if (data.success && data.coins) {
          awardGachaCoins(user.uid, data.coins, 'Stripeチャージ');
          
          processed.push(stripeSessionId);
          localStorage.setItem(processedSessionsKey, JSON.stringify(processed));
          
          setGachaRevision(prev => prev + 1);
          alert(`🎉 決済が完了しました！\nStripeの本物決済セッション (${stripeSessionId.substring(0, 12)}...) を安全承認し、+${data.coins} GCを追加しました！`);
        } else {
          alert(`⚠️ 決済検証エラー: ${data.message || 'お支払いが完了していません。'}`);
        }
      } catch (err: any) {
        console.error('Verify Stripe Error:', err);
        alert(`❌ Stripe決済の処理中にエラーが発生しました: ${err.message}`);
      } finally {
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, '', newUrl);
      }
    };

    verifySession();
  }, [user, gachaRevision]);

// Initialize Auth & Test Connection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setShowLoginModal(false);
      setLoading(false);
    });

    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, []);

  // Manage user profile, admin status, and upvotes list
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setUpvotedScenes(new Set());
      setIsAdmin(false);
      setAdminMessages([]);
      return;
    }

    // Bootstrap admin if this is the specific user
    const bootstrapAdmin = async () => {
      if (user.email === 'kuailitengben@gmail.com') {
        const adminRef = doc(db, 'admins', user.uid);
        const adminSnap = await getDoc(adminRef);
        if (!adminSnap.exists()) {
          await setDoc(adminRef, { email: user.email, name: 'Poco[管理者]' });
        }
      } else if (user.email === 'nakashi198006130423@gmail.com') {
        // Check if adminRevoked is true in profile before auto-promoting
        const profileRef = doc(db, 'profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          if (profileSnap.data()?.adminRevoked === true) {
            // Already explicitly revoked by primary admin
            return;
          }
        }
        const adminRef = doc(db, 'admins', user.uid);
        const adminSnap = await getDoc(adminRef);
        if (!adminSnap.exists()) {
          await setDoc(adminRef, { email: user.email, name: 'poco' });
        }
      }
    };
    bootstrapAdmin();

    // Check admin status
    const adminRef = doc(db, 'admins', user.uid);
    const unsubscribeAdmin = onSnapshot(adminRef, (snap) => {
      setIsAdmin(snap.exists() || user.email === 'kuailitengben@gmail.com');
    }, (error) => {
      // Don't throw for the admin check doc listener as it's common to not be an admin
      console.warn('Admin status check failed (likely not an admin):', error.message);
      if (user.email === 'kuailitengben@gmail.com') {
        setIsAdmin(true);
      }
    });

    let unsubscribeProfile: (() => void) | null = null;

    // Fetch profile
    const fetchProfile = async () => {
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      const now = serverTimestamp();
      let finalProfileData: any = {};

      if (profileSnap.exists()) {
        const data = profileSnap.data();
        const updateData: any = { lastActiveAt: now };

        // Ensure JSE data exists / migrate from offline storage
        if (data.jCoins === undefined) {
          const key = `jse_jcoins_v1_${user.uid}`;
          const saved = localStorage.getItem(key);
          updateData.jCoins = saved ? parseInt(saved, 10) : 5000;
        }
        if (data.jseHoldings === undefined) {
          const key = `jse_holdings_v1_${user.uid}`;
          const saved = localStorage.getItem(key);
          if (saved) {
            try {
              updateData.jseHoldings = JSON.parse(saved);
            } catch (e) {
              console.warn("Failed to parse JSE holdings for migration:", e);
            }
          }
        }
        if (data.jseRealizedPnL === undefined) {
          const key = `jse_realized_v1_${user.uid}`;
          const saved = localStorage.getItem(key);
          if (saved) {
            updateData.jseRealizedPnL = parseFloat(saved) || 0;
          }
        }
        if (data.jseUnlockedAchievements === undefined) {
          const key = `jse_unlocked_achievements_v1_${user.uid}`;
          const saved = localStorage.getItem(key);
          if (saved) {
            try {
              updateData.jseUnlockedAchievements = JSON.parse(saved);
            } catch (e) {
              console.warn("Failed to parse JSE achievements for migration:", e);
            }
          }
        }

        // If profile exists but name is '名無しさん' and user has a displayName, update it
        if (data.displayName === '名無しさん' && user.displayName) {
          updateData.displayName = user.displayName;
        }
        await updateDoc(profileRef, updateData);
        finalProfileData = { uid: user.uid, ...data, ...updateData };

        // Auto trigger tutorial if they haven't seen it yet
        if (data.hasSeenTutorial === false) {
          setShowTutorial(true);
        }
      } else {
        const keyCoins = `jse_jcoins_v1_${user.uid}`;
        const savedCoins = localStorage.getItem(keyCoins);
        const startJCoinsRaw = savedCoins ? parseInt(savedCoins, 10) : 5000;

        const keyHoldings = `jse_holdings_v1_${user.uid}`;
        const savedHoldings = localStorage.getItem(keyHoldings);
        let startHoldings = {};
        if (savedHoldings) {
          try { startHoldings = JSON.parse(savedHoldings); } catch(_) {}
        }

        const keyRealized = `jse_realized_v1_${user.uid}`;
        const savedRealized = localStorage.getItem(keyRealized);
        const startRealized = savedRealized ? parseFloat(savedRealized) : 0;

        const keyAch = `jse_unlocked_achievements_v1_${user.uid}`;
        const savedAch = localStorage.getItem(keyAch);
        let startAch = [];
        if (savedAch) {
          try { startAch = JSON.parse(savedAch); } catch(_) {}
        }

        let startJCoins = startJCoinsRaw;
        let referralCodeUsed: string | undefined = undefined;
        let referredBy = '';
        try {
          referredBy = sessionStorage.getItem('jimicchi_referred_by_uid') || '';
        } catch (_) {}

        if (referredBy && referredBy !== user.uid) {
          try {
            startJCoins = startJCoinsRaw + 3000;
            referralCodeUsed = referredBy;
            
            // Queue reward for friend
            await addDoc(collection(db, 'admin_messages'), {
              recipientId: referredBy,
              senderId: user.uid,
              senderName: user.displayName || 'お友達 (Your friend)',
              content: `REFERRAL_BONUS_3000`,
              type: 'referral_claim',
              createdAt: serverTimestamp(),
              read: false
            });
          } catch(err) {
            console.error("Failed to add initial referral message:", err);
          }
        }

        const newProfile: any = {
          displayName: user.displayName || '名無しさん',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
          bio: 'よろしくお願いします。',
          updatedAt: now,
          lastActiveAt: now,
          hasSeenTutorial: false,
          unlockedPrefixIds: [],
          unlockedSuffixIds: [],
          unlockedBadgeIds: [],
          celebratedBadgeIds: [],
          celebratedPrefixIds: [],
          celebratedSuffixIds: [],
          coins: 500,
          shards: 0,
          jCoins: startJCoins,
          jseHoldings: startHoldings,
          jseRealizedPnL: startRealized,
          jseUnlockedAchievements: startAch
        };
        if (referralCodeUsed) {
          newProfile.referralCodeUsed = referralCodeUsed;
        }

        await setDoc(profileRef, newProfile);
        finalProfileData = { uid: user.uid, ...newProfile };
        setShowTutorial(true);

        if (referralCodeUsed) {
          setTimeout(() => {
            alert(`🎉 地味っちへようこそ！お友達から招待されました！\nお祝いに【3,000 J-Coin】プレゼントが追加で適用され、合計 ${startJCoins} コインでスタートしました！🎰\nさっそく地味ガチャを引いてみましょう！`);
          }, 1500);
        }
      }

      // Sync and restore Gacha & celebrated states from Firestore to local storage
      try {
        const lsKey = `jimicchi_gacha_v3_${user.uid}`;
        let localState: any = {};
        const raw = localStorage.getItem(lsKey);
        if (raw) {
          try {
            localState = JSON.parse(raw) || {};
          } catch (e) {
            console.warn("Local state parsing error:", e);
          }
        }

        // Merge arrays securely
        const unlockedPrefixIds = Array.from(new Set([
          ...(localState.unlockedPrefixIds || []),
          ...(finalProfileData.unlockedPrefixIds || [])
        ]));
        const unlockedSuffixIds = Array.from(new Set([
          ...(localState.unlockedSuffixIds || []),
          ...(finalProfileData.unlockedSuffixIds || [])
        ]));
        const unlockedBadgeIds = Array.from(new Set([
          ...(localState.unlockedBadgeIds || []),
          ...(finalProfileData.unlockedBadgeIds || [])
        ]));

        // Coins and shards synchronization
        let coins = finalProfileData.coins !== undefined ? finalProfileData.coins : (localState.coins !== undefined ? localState.coins : 500);
        let shards = finalProfileData.shards !== undefined ? finalProfileData.shards : (localState.shards !== undefined ? localState.shards : 0);
        
        if (localState.coins !== undefined && localState.coins > coins) {
          coins = localState.coins;
        }
        if (localState.shards !== undefined && localState.shards > shards) {
          shards = localState.shards;
        }

        const mergedState = {
          ...localState,
          coins,
          shards,
          pityCount: localState.pityCount || 0,
          unlockedPrefixIds,
          unlockedSuffixIds,
          unlockedBadgeIds,
          lastActionDate: finalProfileData.lastLoginDate || localState.lastActionDate || '',
          lastLoginDate: finalProfileData.lastLoginDate || localState.lastActionDate || '',
          loginStreak: finalProfileData.loginStreak !== undefined ? finalProfileData.loginStreak : (localState.loginStreak || 0)
        };
        localStorage.setItem(lsKey, JSON.stringify(mergedState));

        // Restore celebrated lists with robust try/catch
        const celebratedBadgesKey = `jimicchi_celebrated_badges_${user.uid}`;
        const celebratedPrefixesKey = `jimicchi_celebrated_prefixes_${user.uid}`;
        const celebratedSuffixesKey = `jimicchi_celebrated_suffixes_${user.uid}`;

        let localB: string[] = [];
        const rawB = localStorage.getItem(celebratedBadgesKey);
        if (rawB) {
          try { localB = JSON.parse(rawB) || []; } catch(_) {}
        }
        const mergedB = Array.from(new Set([...localB, ...(finalProfileData.celebratedBadgeIds || [])]));
        localStorage.setItem(celebratedBadgesKey, JSON.stringify(mergedB));

        let localP: string[] = [];
        const rawP = localStorage.getItem(celebratedPrefixesKey);
        if (rawP) {
          try { localP = JSON.parse(rawP) || []; } catch(_) {}
        }
        const mergedP = Array.from(new Set([...localP, ...(finalProfileData.celebratedPrefixIds || [])]));
        localStorage.setItem(celebratedPrefixesKey, JSON.stringify(mergedP));

        let localS: string[] = [];
        const rawS = localStorage.getItem(celebratedSuffixesKey);
        if (rawS) {
          try { localS = JSON.parse(rawS) || []; } catch(_) {}
        }
        const mergedS = Array.from(new Set([...localS, ...(finalProfileData.celebratedSuffixIds || [])]));
        localStorage.setItem(celebratedSuffixesKey, JSON.stringify(mergedS));

        // Save unified master data back to Firestore profile so both are 100% in sync
        await updateDoc(profileRef, {
          unlockedPrefixIds,
          unlockedSuffixIds,
          unlockedBadgeIds,
          celebratedBadgeIds: mergedB,
          celebratedPrefixIds: mergedP,
          celebratedSuffixIds: mergedS,
          coins,
          shards
        });

        // Mark profile as fully synchronized to enable future Firestore writes from saveGachaState
        setProfileSynced(user.uid, true);

        // Set up real-time listener on the current user's profile doc so edits on badges, titles, coins, names etc. sync instantly
        unsubscribeProfile = onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            const freshData = snap.data() as Profile;
            setUserProfile({ uid: user.uid, ...freshData });
          }
        }, (error) => {
          console.warn("Real-time profile listener failed:", error);
        });

        setGachaRevision(prev => prev + 1);
      } catch (err) {
        console.error("Gacha state restore error in fetchProfile:", err);
        // Fallback: unlock Firestore writes is also marked here
        setProfileSynced(user.uid, true);
        // Fallback or backup real-time listener if synchronization steps fail
        unsubscribeProfile = onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            const freshData = snap.data() as Profile;
            setUserProfile({ uid: user.uid, ...freshData });
          }
        }, (error) => {
          console.warn("Real-time profile fallback listener failed:", error);
        });
      }
    };

    // Listen to user's upvotes
    const qUpvotes = query(
      collection(db, 'upvotes'), 
      where('userId', '==', user.uid)
    );
    const unsubscribeUpvotes = onSnapshot(qUpvotes, (snapshot) => {
      const upvoted = new Set<string>();
      snapshot.forEach(doc => {
        const data = doc.data();
        upvoted.add(data.sceneId);
      });
      setUpvotedScenes(upvoted);
    }, (error) => {
      // Only throw if it's still missing permissions while logged in
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'upvotes');
      }
    });

    fetchProfile();
    return () => {
      unsubscribeUpvotes();
      unsubscribeAdmin();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, [user]);

  // Daily login reward streak check & Campaign reward activation checks (reacts to midnight rollover clock)
  useEffect(() => {
    if (!user || user.isAnonymous) return;

    const checkLoginReward = () => {
      const reward = handleDailyLoginReward(user.uid);
      if (reward.awarded) {
        setLoginRewardDetails({
          streak: reward.streak,
          coins: reward.coinsGained,
          milestone: reward.milestoneReached
        });
        setGachaRevision(prev => prev + 1);
      }
    };
    checkLoginReward();

    const checkCampaignRewards = async () => {
      try {
        const campaignsQuery = query(
          collection(db, 'campaigns'),
          where('active', '==', true)
        );
        const campaignsSnap = await getDocs(campaignsQuery);
        const rewardsToAlert: { title: string; msg: string }[] = [];

        for (const docSnap of campaignsSnap.docs) {
          const campaign = { id: docSnap.id, ...docSnap.data() } as any;
          if (campaign.startDate && campaign.startDate > currentTodayStr) continue;
          if (campaign.endDate && campaign.endDate < currentTodayStr) continue;

          const claimRef = doc(db, 'campaignClaims', `${user.uid}_${campaign.id}`);
          const claimSnap = await getDoc(claimRef);
          if (!claimSnap.exists()) {
            await setDoc(claimRef, {
              userId: user.uid,
              campaignId: campaign.id,
              claimedAt: serverTimestamp()
            });

            const res = awardGachaItem(user.uid, campaign.itemType, campaign.itemValue);
            if (res.success) {
              rewardsToAlert.push({
                title: campaign.title,
                msg: res.msg
              });
            }
          }
        }

        if (rewardsToAlert.length > 0) {
          setActiveCampaignRewards(rewardsToAlert);
          setGachaRevision(prev => prev + 1);
        }
      } catch (err) {
        console.error('Campaign verification failed:', err);
      }
    };
    checkCampaignRewards();
  }, [user, currentTodayStr]);

  // Active Login Bonus and claims checking
  useEffect(() => {
    if (!user || user.isAnonymous) {
      setActiveLoginBonusBoard(null);
      setUserLoginBonusClaim(null);
      setShowLoginBonusModal(false);
      return;
    }

    const q = query(collection(db, 'login_bonuses'), where('active', '==', true), limit(1));
    const unsubActiveBoard = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setActiveLoginBonusBoard(null);
        setUserLoginBonusClaim(null);
        setShowLoginBonusModal(false);
        return;
      }

      const boardDoc = snapshot.docs[0];
      const board = { id: boardDoc.id, ...boardDoc.data() } as any;
      setActiveLoginBonusBoard(board);

      // Listen to the user's claim document for this board
      const claimRef = doc(db, 'login_claims', `${user.uid}_${board.id}`);
      const unsubClaim = onSnapshot(claimRef, (claimSnap) => {
        const todayStr = currentTodayStr;
        const localClaimKey = `jimicchi_local_login_claims_${user.uid}_${board.id}`;
        
        let mergedClaimData = null;
        try {
          const localSavedDataStr = localStorage.getItem(localClaimKey);
          if (localSavedDataStr) {
            mergedClaimData = JSON.parse(localSavedDataStr);
          }
        } catch (_) {}

        if (claimSnap.exists()) {
          const remoteData = claimSnap.data() as any;
          // If local is newer or has more days, merge them, otherwise prefer remote
          if (mergedClaimData && (mergedClaimData.claimedDays?.length || 0) > (remoteData.claimedDays?.length || 0)) {
            mergedClaimData = {
              ...remoteData,
              ...mergedClaimData,
              claimedDays: Array.from(new Set([...(remoteData.claimedDays || []), ...(mergedClaimData.claimedDays || [])]))
            };
          } else {
            mergedClaimData = remoteData;
          }
        }

        if (mergedClaimData) {
          setUserLoginBonusClaim(mergedClaimData);
          const claimedList = mergedClaimData.claimedDays || [];
          if (mergedClaimData.lastClaimDate !== todayStr && claimedList.length < board.daysCount) {
            setShowLoginBonusModal(true);
          } else {
            setShowLoginBonusModal(false);
          }
        } else {
          setUserLoginBonusClaim(null);
          setShowLoginBonusModal(true);
        }
      }, (error) => {
        console.warn("Login claims subscription failed, reading local fallback:", error.message);
        
        const todayStr = currentTodayStr;
        const localClaimKey = `jimicchi_local_login_claims_${user.uid}_${board.id}`;
        try {
          const localSavedDataStr = localStorage.getItem(localClaimKey);
          if (localSavedDataStr) {
            const mergedClaimData = JSON.parse(localSavedDataStr);
            setUserLoginBonusClaim(mergedClaimData);
            const claimedList = mergedClaimData.claimedDays || [];
            if (mergedClaimData.lastClaimDate !== todayStr && claimedList.length < board.daysCount) {
              setShowLoginBonusModal(true);
            } else {
              setShowLoginBonusModal(false);
            }
            return;
          }
        } catch (_) {}

        setUserLoginBonusClaim(null);
        setShowLoginBonusModal(true);
      });

      return () => unsubClaim();
    }, (err) => {
      console.warn("Login bonus board subscription failed:", err.message);
    });

    return () => unsubActiveBoard();
  }, [user, currentTodayStr]);

  // Fetch Scenes
  useEffect(() => {
    setDisplayLimit(25);
    let q = query(collection(db, 'scenes'), orderBy(sortMode === 'latest' ? 'createdAt' : 'upvotes', 'desc'));
    
    // Firestore only supports one array-contains per query.
    // If we want search AND tags AND sorting, it gets complex.
    // We'll fetch all and filter client-side for keywords, but use tags for server-side.
    if (selectedTag) {
      q = query(collection(db, 'scenes'), where('hashtags', 'array-contains', selectedTag), orderBy(sortMode === 'latest' ? 'createdAt' : 'upvotes', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let sceneData: Scene[] = [];
      snapshot.forEach((doc) => {
        sceneData.push({ id: doc.id, ...doc.data() } as Scene);
      });

      // Client-side category filtering
      if (selectedCategory && selectedCategory !== 'all') {
        sceneData = sceneData.filter(s => {
          const cat = s.category || 'Everyday';
          return cat.toLowerCase() === selectedCategory.toLowerCase();
        });
      }

      // Client-side keyword search
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        sceneData = sceneData.filter(s => 
          s.title.toLowerCase().includes(lowerQuery) || 
          s.content.toLowerCase().includes(lowerQuery) ||
          s.authorName.toLowerCase().includes(lowerQuery)
        );
      }

      setScenes(sceneData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'scenes');
    });

    return () => unsubscribe();
  }, [sortMode, selectedTag, searchQuery, selectedCategory]);

  // Fetch allScenes database collection in real-time for dynamic Leaderboard Rankings
  useEffect(() => {
    const q = query(collection(db, 'scenes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Scene[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Scene);
      });
      setAllScenes(data);
    }, (error) => {
      console.error("Failed to fetch all scenes for rankings:", error);
    });
    return () => unsubscribe();
  }, []);

  // Leaderboard high performance scan and notification dispatch trigger
  useEffect(() => {
    if (!user || allScenes.length === 0) return;
    
    // Only query once per session to maintain top speed
    const sessionKey = `ranking_chk_v3_${user.uid}`;
    if (sessionStorage.getItem(sessionKey)) return;

    const runRankingCheck = async () => {
      const now = new Date();

      // Fetch ranking rewards configurations
      let rewardConfig = {
        rank1Coins: 1000,
        rank2Coins: 500,
        rank3Coins: 300,
        rank4to5Coins: 100,
        endDate: '2026-12-31'
      };
      try {
        const settingSnap = await getDoc(doc(db, 'settings', 'rankingRewards'));
        if (settingSnap.exists()) {
          const sData = settingSnap.data();
          if (sData.rank1Coins !== undefined) rewardConfig.rank1Coins = Number(sData.rank1Coins);
          if (sData.rank2Coins !== undefined) rewardConfig.rank2Coins = Number(sData.rank2Coins);
          if (sData.rank3Coins !== undefined) rewardConfig.rank3Coins = Number(sData.rank3Coins);
          if (sData.rank4to5Coins !== undefined) rewardConfig.rank4to5Coins = Number(sData.rank4to5Coins);
          if (sData.endDate !== undefined) rewardConfig.endDate = String(sData.endDate);
        }
      } catch (e) {
        console.error("Failed to fetch ranking rewards config:", e);
      }

      const todayStr = now.toISOString().split('T')[0];
      const isRewardActive = todayStr <= rewardConfig.endDate;

      // Calculate scores
      const scored = allScenes.map(scene => {
        const upvotes = scene.upvotes || 0;
        const commentCount = scene.commentCount || 0;
        const profileVisits = scene.profileVisits || 0;
        const views = scene.views || 0;
        const score = upvotes * 10 + commentCount * 15 + profileVisits * 20 + views * 1;
        return { ...scene, score };
      });

      const periods: ('daily' | 'weekly' | 'monthly')[] = ['daily', 'weekly', 'monthly'];
      
      for (const p of periods) {
        // Fetch finalized range of previous completed period (e.g. yesterday for daily, last week for weekly, last month for monthly)
        const ranges = getRangesForPeriod(p, now);
        const finalizedRange = ranges.finalized;

        // Generate unique period key to ensure we only reward once per completed period per scene
        let periodId = '';
        if (p === 'daily') {
          periodId = finalizedRange.start.toISOString().split('T')[0];
        } else if (p === 'weekly') {
          periodId = finalizedRange.end.toISOString().split('T')[0];
        } else {
          periodId = `${finalizedRange.start.getFullYear()}-${String(finalizedRange.start.getMonth() + 1).padStart(2, '0')}`;
        }

        const filtered = scored.filter(scene => {
          if (!scene.createdAt) return false;
          const dt = scene.createdAt.toDate ? scene.createdAt.toDate() : new Date(scene.createdAt);
          return dt >= finalizedRange.start && dt <= finalizedRange.end;
        }).sort((a, b) => b.score - a.score);

        // Find user's posts in top 5 of the officially finalized/announced rankings
        filtered.forEach(async (scene, rankIdx) => {
          if (scene.authorId === user.uid && rankIdx < 5) {
            const rank = rankIdx + 1;
            const periodLabel = p === 'daily' ? '日間' : p === 'weekly' ? '週間' : '月間';
            
            let finalCoins = 0;
            if (isRewardActive) {
              if (rank === 1) finalCoins = rewardConfig.rank1Coins;
              else if (rank === 2) finalCoins = rewardConfig.rank2Coins;
              else if (rank === 3) finalCoins = rewardConfig.rank3Coins;
              else if (rank === 4 || rank === 5) finalCoins = rewardConfig.rank4to5Coins;
            }

            const announcementTitle = p === 'daily'
              ? `${periodId}付 日間確定ランキング`
              : p === 'weekly'
                ? `${periodId}締 週間確定ランキング`
                : `${periodId}度 月間確定ランキング`;

            let notificationContent = `👑 🎉【 ${periodLabel}確定ランキング公表】おめでとうございます！あなたの投稿「${scene.title}」が、${announcementTitle}にて【第 ${rank} 位】になりました！(確定シンクロ度: ${scene.score})`;
            if (isRewardActive && finalCoins > 0) {
              notificationContent += `。ランキング報酬期間にともない、公式特別報酬として【${finalCoins} Gacha Coins】を獲得しました！🎉 (有効期限: ${rewardConfig.endDate})`;
            }
            
            // Deduplicate against localStorage with a calendar-specific periodId key
            const sentStorageKey = `rank_notify_sent_${scene.id}_${p}_${periodId}_rank_${rank}`;
            if (!localStorage.getItem(sentStorageKey)) {
              localStorage.setItem(sentStorageKey, 'true');
              
              if (isRewardActive && finalCoins > 0) {
                awardGachaCoins(user.uid, finalCoins, `${periodLabel}確定ランキング 第${rank}位`);
                setGachaRevision(prev => prev + 1); // trigger state update to show modified coins
              }

              try {
                await addDoc(collection(db, 'admin_messages'), {
                  recipientId: user.uid,
                  senderId: 'system_ranking',
                  content: notificationContent,
                  createdAt: serverTimestamp(),
                  read: false
                });
              } catch (e) {
                console.error("Failed to write ranking notification:", e);
              }
            }
          }
        });
      }
      
      sessionStorage.setItem(sessionKey, 'true');
    };

    runRankingCheck();
  }, [allScenes, user]);

  // Handle User Search
  useEffect(() => {
    if (!userSearchQuery) {
      setUserSearchResults([]);
      return;
    }
    const q = query(
      collection(db, 'profiles'), 
      where('displayName', '>=', userSearchQuery),
      where('displayName', '<=', userSearchQuery + '\uf8ff'),
      limit(10)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: Profile[] = [];
      snapshot.forEach(doc => {
        results.push({ uid: doc.id, ...doc.data() } as Profile);
      });
      setUserSearchResults(results);
    });
    return () => unsubscribe();
  }, [userSearchQuery]);

  // Fetch Admin Stats
  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchStats = async () => {
      try {
        const profilesSnap = await getDocs(collection(db, 'profiles'));
        const scenesSnap = await getDocs(collection(db, 'scenes'));
        
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const activeUsers = profilesSnap.docs.filter(d => {
          const lastActive = d.data().lastActiveAt?.toDate();
          return lastActive && lastActive > oneDayAgo;
        }).length;

        setStats({
          totalUsers: profilesSnap.size,
          activeUsers24h: activeUsers,
          totalScenes: scenesSnap.size
        });
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Fetch Admin Data
  useEffect(() => {
    if (!isAdmin || !user) {
      setReports([]);
      return;
    }

    const qReports = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribeReports = onSnapshot(qReports, (snapshot) => {
      const reportData: Report[] = [];
      snapshot.forEach(doc => {
        reportData.push({ id: doc.id, ...doc.data() } as Report);
      });
      setReports(reportData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports');
    });

    return () => unsubscribeReports();
  }, [isAdmin, user]);

  // Fetch Messages for current user and dispatch device-level Web Push-style notifications
  useEffect(() => {
    if (!user) return;
    const qMessages = query(
      collection(db, 'admin_messages'), 
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
      const msgData: AdminMessage[] = [];
      snapshot.forEach(doc => {
        msgData.push({ id: doc.id, ...doc.data() } as AdminMessage);
      });

      // 招待コード（Referral Code）によるアトミック加算セルフ受け取り処理（初回起動時・追加時の双方で動作）
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data && !data.read && data.type === 'referral_claim') {
            const claimReferral = async () => {
              try {
                const myProfileRef = doc(db, 'profiles', user.uid);
                await updateDoc(myProfileRef, {
                  jCoins: increment(3000)
                });
                await updateDoc(doc(db, 'admin_messages', change.doc.id), {
                  read: true
                });
                const senderName = data.senderName || t('お友達', 'Your friend');
                alert(t(`🎉 おめでとうございます！\n${senderName}さんがあなたの招待コード（ユーザーID）を使ってくれました！\nお二人にお祝いの【3,000 J-Coin】がプレゼントされました！🎰\n地味ガチャに挑戦してみましょう！`, `🎉 Congratulations!\n${senderName} used your referral code (User ID)!\nYou both received 【3,000 J-Coins】!🎰\nLet's try Jimi Gacha!`));
              } catch (err) {
                console.error("Failed to process referral claim reward:", err);
              }
            };
            claimReferral();
          } else if (data && !data.read && data.type === 'kairanban_reward') {
            const claimKairanban = async () => {
              try {
                const rewardCoins = data.rewardCoins || 10;
                const myProfileRef = doc(db, 'profiles', user.uid);
                await updateDoc(myProfileRef, {
                  jCoins: increment(rewardCoins),
                  coins: increment(rewardCoins)
                });
                await updateDoc(doc(db, 'admin_messages', change.doc.id), {
                  read: true
                });
                console.log(`[KAIRANBAN CLAIM] Successfully processed reward of +${rewardCoins}J for user ${user.uid}`);
              } catch (err) {
                console.error("Failed to process kairanban claim reward:", err);
              }
            };
            claimKairanban();
          }
        }
      });

      // If it is not the first load (to avoid alerts for history on page refresh), intercept added unreads
      if (!isFirstMessageLoadRef.current) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data && !data.read) {
              const content = data.content || '新しい通知があります。';
              // Check browser Native Notification capability & standard permissions
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification('地味っち 🔔', {
                    body: content,
                    icon: 'https://api.dicebear.com/7.x/bottts/svg?seed=jimicchi'
                  });
                } catch (err) {
                  console.warn("Standard browser Notification dispatch blocked or failed:", err);
                }
              }
            }
          }
        });
      } else {
        isFirstMessageLoadRef.current = false;
      }

      setAdminMessages(msgData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'admin_messages');
    });
    return () => unsubscribeMessages();
  }, [user]);

  // Fetch following list and counts
  useEffect(() => {
    if (!user) {
      setFollowing([]);
      return;
    }
    const qFollowing = query(collection(db, 'follows'), where('followerId', '==', user.uid));
    const unsubscribeFollowing = onSnapshot(qFollowing, (snapshot) => {
      const followingIds: string[] = [];
      snapshot.forEach(doc => {
        followingIds.push(doc.data().followingId);
      });
      setFollowing(followingIds);
    }, (error) => {
      console.warn("Following load failed:", error.message);
    });
    return () => unsubscribeFollowing();
  }, [user]);

  // Fetch Announcements
  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Announcement[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Announcement);
      });
      setAnnouncements(data);

      if (data.length > 0) {
        const latest = data[0];
        const lastSeen = localStorage.getItem('last_seen_announcement_id');
        if (lastSeen !== latest.id) {
          setCurrentAnnouncement(latest);
          setShowAnnouncementPopup(true);
        }
      }
    }, (error) => {
      console.warn('Fetch announcements failed:', error.message);
    });

    return () => unsubscribe();
  }, []);

  // Handle follow counts for viewed profile
  useEffect(() => {
    if (!viewedProfileId) return;

    const qFollowers = query(collection(db, 'follows'), where('followingId', '==', viewedProfileId));
    const unsubscribeFollowers = onSnapshot(qFollowers, (snapshot) => {
      setFollowerCounts(prev => ({ ...prev, [viewedProfileId]: snapshot.size }));
    }, (error) => {
      console.warn("Followers count count load failed:", error.message);
    });

    const qFollowingCount = query(collection(db, 'follows'), where('followerId', '==', viewedProfileId));
    const unsubscribeFollowingCount = onSnapshot(qFollowingCount, (snapshot) => {
      setFollowingCounts(prev => ({ ...prev, [viewedProfileId]: snapshot.size }));
    }, (error) => {
      console.warn("Following count load failed:", error.message);
    });

    return () => {
      unsubscribeFollowers();
      unsubscribeFollowingCount();
    };
  }, [viewedProfileId]);

  const handleFollow = async (targetUid: string) => {
    if (!user) {
      console.log('Follow failed: No user');
      handleLogin();
      return;
    }
    if (user.uid === targetUid) {
      console.log('Follow failed: Self follow');
      return;
    }
    console.log('Attempting follow:', { follower: user.uid, following: targetUid });
    try {
      await addDoc(collection(db, 'follows'), {
        followerId: user.uid,
        followingId: targetUid,
        createdAt: serverTimestamp()
      });
      console.log('Follow success');

      // Create interactive notification message for follow target
      await addDoc(collection(db, 'admin_messages'), {
        recipientId: targetUid,
        senderId: user.uid,
        content: `👤 ${userProfile?.displayName || user.displayName || '誰か'}さんがあなたをフォローしました。`,
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (error: any) {
      console.error('Follow error details:', error);
      alert(`フォローに失敗しました: ${error?.message || '不明なエラー'}`);
      handleFirestoreError(error, OperationType.CREATE, 'follows');
    }
  };

  const handleUnfollow = async (targetUid: string) => {
    if (!user) {
      handleLogin();
      return;
    }
    console.log('Attempting unfollow:', { follower: user.uid, following: targetUid });
    try {
      const q = query(collection(db, 'follows'), where('followerId', '==', user.uid), where('followingId', '==', targetUid));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      console.log('Unfollow success');
    } catch (error) {
      console.error('Unfollow error:', error);
      alert('フォロー解除に失敗しました。');
      handleFirestoreError(error, OperationType.DELETE, 'follows');
    }
  };

  const handleStartChat = async (targetUid: string) => {
    if (!user) {
      console.log('Chat failed: No user');
      handleLogin();
      return;
    }
    if (user.uid === targetUid) {
      console.log('Chat failed: Self chat');
      return;
    }
    console.log('Attempting start chat:', { from: user.uid, to: targetUid });
    try {
      // Find existing chat
      const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
      const snap = await getDocs(q);
      let existingChatId = null;
      snap.forEach(doc => {
        const data = doc.data();
        if (data.participants && data.participants.includes(targetUid)) {
          existingChatId = doc.id;
        }
      });

      if (existingChatId) {
        console.log('Found existing chat:', existingChatId);
        setActiveChatId(existingChatId);
      } else {
        console.log('Creating new chat...');
        const newChat = await addDoc(collection(db, 'chats'), {
          participants: [user.uid, targetUid].sort(),
          updatedAt: serverTimestamp()
        });
        console.log('New chat success:', newChat.id);
        setActiveChatId(newChat.id);
      }
    } catch (error: any) {
      console.error('Start chat error details:', error);
      alert(`メッセージの開始に失敗しました: ${error?.message || '不明なエラー'}`);
      handleFirestoreError(error, OperationType.CREATE, 'chats');
    }
  };

  const handleLogin = () => {
    setShowLoginModal(true);
  };

  const handleCloseAnnouncement = () => {
    if (currentAnnouncement) {
      localStorage.setItem('last_seen_announcement_id', currentAnnouncement.id);
      if (user) {
        updateDoc(doc(db, 'profiles', user.uid), {
          lastReadAnnouncementId: currentAnnouncement.id
        }).catch(err => console.error("Failed to sync read status:", err));
      }
    }
    setShowAnnouncementPopup(false);
  };

  const handleCreateAnnouncement = async (title: string, content: string, imageUrl?: string) => {
    if (!isAdmin || !user) return;
    try {
      await addDoc(collection(db, 'announcements'), {
        title,
        content,
        imageUrl: imageUrl || null,
        createdAt: serverTimestamp(),
        authorId: user.uid
      });

      // Send a system announcement notification to EVERY registered profile in the DB
      try {
        const querySnap = await getDocs(collection(db, 'profiles'));
        querySnap.forEach(async (pDoc) => {
          const profileId = pDoc.id;
          if (profileId) {
            await addDoc(collection(db, 'admin_messages'), {
              recipientId: profileId,
              senderId: 'system_announcement',
              content: `🎉 イベント/お知らせが新しく開催されました!「${title}」`,
              createdAt: serverTimestamp(),
              read: false,
              type: 'announcement'
            });
          }
        });
      } catch (pError) {
        console.error("Failed to broadcast announcement notice:", pError);
      }

      alert('お知らせを配信しました。');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'announcements');
    }
  };

  const handleUpvote = async (sceneId: string) => {
    if (!user) {
      handleLogin();
      return;
    }
    
    const upvoteId = `${sceneId}_${user.uid}`;
    const upvoteRef = doc(db, 'upvotes', upvoteId);
    
    const upvoteSnap = await getDocFromServer(upvoteRef);
    const sceneRef = doc(db, 'scenes', sceneId);

    try {
      if (upvoteSnap.exists()) {
        // Toggle off
        try {
          await deleteDoc(upvoteRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `upvotes/${upvoteId}`);
        }
        
        try {
          await updateDoc(sceneRef, {
            upvotes: increment(-1)
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `scenes/${sceneId}`);
        }
      } else {
        // Toggle on
        try {
          await setDoc(upvoteRef, {
            sceneId,
            userId: user.uid,
            createdAt: serverTimestamp()
          });
          earnFromUpvoteSent(user.uid);
          const relatedScene = scenes.find(s => s.id === sceneId);
          if (relatedScene && relatedScene.authorId && relatedScene.authorId !== user.uid) {
            earnFromUpvoteReceived(relatedScene.authorId);

            // Get sender profile display name
            const profileRef = doc(db, 'profiles', user.uid);
            const profileSnap = await getDoc(profileRef).catch(() => null);
            const profileData = profileSnap?.exists() ? profileSnap.data() : null;
            const senderName = profileData?.displayName || user.displayName || '誰か';

            await addDoc(collection(db, 'admin_messages'), {
              recipientId: relatedScene.authorId,
              senderId: user.uid,
              content: `👍 ${senderName}さんがあなたの地味話「${relatedScene.title}」に「地味に共感！」しました。`,
              createdAt: serverTimestamp(),
              read: false,
              sceneId,
              type: 'upvote'
            });
          }
          setGachaRevision(p => p + 1);
          if (tutorialStep === 1) {
            setTutorialStep(2);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `upvotes/${upvoteId}`);
        }
        
        try {
          await updateDoc(sceneRef, {
            upvotes: increment(1)
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `scenes/${sceneId}`);
        }
      }
    } catch (error) {
      // Re-throw handled errors or catch unexpected ones
      if (error instanceof Error && error.message.startsWith('{')) throw error;
      handleFirestoreError(error, OperationType.WRITE, `upvotes_flow/${sceneId}`);
    }
  };

  const handleToggleSceneSticker = async (sceneId: string, stickerId: string) => {
    if (!user) {
      handleLogin();
      return;
    }
    try {
      const sceneRef = doc(db, 'scenes', sceneId);
      const sceneSnap = await getDoc(sceneRef);
      if (!sceneSnap.exists()) return;
      const sceneData = sceneSnap.data() as Scene;
      const stickers = { ...(sceneData.stickers || {}) };
      const uids = stickers[stickerId] ? [...stickers[stickerId]] : [];
      const index = uids.indexOf(user.uid);
      if (index > -1) {
        uids.splice(index, 1);
      } else {
        uids.push(user.uid);

        // Notify the author of the scene
        if (sceneData.authorId && sceneData.authorId !== user.uid) {
          const profileRef = doc(db, 'profiles', user.uid);
          const profileSnap = await getDoc(profileRef).catch(() => null);
          const profileData = profileSnap?.exists() ? profileSnap.data() : null;
          const senderName = profileData?.displayName || user.displayName || '誰か';

          const stickerEmoji = stickerId.startsWith('st_') ? '✨' : stickerId;

          await addDoc(collection(db, 'admin_messages'), {
            recipientId: sceneData.authorId,
            senderId: user.uid,
            content: `✨ ${senderName}さんがあなたの地味話「${sceneData.title}」にスタンプ [${stickerEmoji}] を送りました。`,
            createdAt: serverTimestamp(),
            read: false,
            sceneId,
            type: 'sticker'
          });
        }
      }
      if (uids.length === 0) {
        delete stickers[stickerId];
      } else {
        stickers[stickerId] = uids;
      }
      await updateDoc(sceneRef, { stickers });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `scenes/${sceneId}/stickers`);
    }
  };

  const handleToggleCommentSticker = async (sceneId: string, commentId: string, stickerId: string) => {
    if (!user) {
      handleLogin();
      return;
    }
    try {
      const commentRef = doc(db, 'scenes', sceneId, 'comments', commentId);
      const commentSnap = await getDoc(commentRef);
      if (!commentSnap.exists()) return;
      const commentData = commentSnap.data();
      const stickers = { ...(commentData.stickers || {}) };
      const uids = stickers[stickerId] ? [...stickers[stickerId]] : [];
      const index = uids.indexOf(user.uid);
      if (index > -1) {
        uids.splice(index, 1);
      } else {
        uids.push(user.uid);
      }
      if (uids.length === 0) {
        delete stickers[stickerId];
      } else {
        stickers[stickerId] = uids;
      }
      await updateDoc(commentRef, { stickers });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `scenes/${sceneId}/comments/${commentId}/stickers`);
    }
  };

  const handleOpenProfile = async (uid: string, sceneId?: string) => {
    setViewedProfileId(uid);
    setView('profile');
    setSelectedScene(null);
    setShowRanking(false);

    if (sceneId) {
      try {
        const sceneRef = doc(db, 'scenes', sceneId);
        await updateDoc(sceneRef, {
          profileVisits: increment(1)
        });
      } catch (e) {
        console.error("Failed to increment profileVisits:", e);
      }
    }
  };

  const handleDeleteScene = async (sceneId: string) => {
    if (!isAdmin) return;
    if (!confirm('本当にこの投稿を削除しますか？')) return;
    
    try {
      await deleteDoc(doc(db, 'scenes', sceneId));
      setSelectedScene(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `scenes/${sceneId}`);
    }
  };

  const handleReport = async (targetId: string, targetType: 'scene' | 'profile', reason: string) => {
    if (!user) {
      handleLogin();
      return;
    }
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: user.uid,
        targetId,
        targetType,
        reason,
        createdAt: serverTimestamp()
      });
      alert('通報ありがとうございます。管理者が確認いたします。');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
    }
  };

  const handleBanUser = async (uid: string, banStatus: boolean) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'profiles', uid), {
        isBanned: banStatus
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `profiles/${uid}`);
    }
  };

  const handleSendMessage = async (recipientId: string, content: string) => {
    if (!isAdmin || !user) return;
    try {
      await addDoc(collection(db, 'admin_messages'), {
        recipientId,
        senderId: user.uid,
        content,
        createdAt: serverTimestamp(),
        read: false
      });
      alert('メッセージを送信しました。');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'admin_messages');
    }
  };

  const handleTransferAdmin = async (uid: string, adminStatus: boolean) => {
    if (!isAdmin) return;
    try {
      if (adminStatus) {
        let cleanEmail = 'unknown@example.com';
        let cleanName = '管理者';
        const profSnap = await getDoc(doc(db, 'profiles', uid));
        if (profSnap.exists()) {
          const profData = profSnap.data();
          cleanName = profData.displayName || cleanName;
          cleanEmail = profData.email || cleanEmail;
        }
        await setDoc(doc(db, 'admins', uid), { email: cleanEmail, name: cleanName });
      } else {
        await deleteDoc(doc(db, 'admins', uid));
      }
      alert('権限を変更しました。');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `admins/${uid}`);
    }
  };

  const triggerBotSimulation = async (botId?: string) => {
    setIsSimulating(true);
    try {
      // 1. Fetch recent scenes and surveys from client-side Firestore safely
      const scenesSnap = await getDocs(query(collection(db, "scenes"), orderBy("createdAt", "desc"), limit(80)));
      const recentScenes = scenesSnap.docs.map(d => {
        const dData = d.data() as any;
        return {
          id: d.id,
          title: dData.title || "",
          content: dData.content || "",
          authorId: dData.authorId || ""
        };
      });

      const surveysSnap = await getDocs(query(collection(db, "plaza_surveys"), orderBy("createdAt", "desc"), limit(10)));
      const recentSurveys = surveysSnap.docs.map(d => {
        const dData = d.data() as any;
        return {
          id: d.id,
          question: dData.question || ""
        };
      });

      // 2. Fetch bot action proposal dynamically from backend
      const response = await fetch("/api/admin/trigger-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recentScenes, recentSurveys, botId })
      });
      const resData = await response.json();

      if (!resData.success) {
        setBotLogs(prev => [
          `[${new Date().toLocaleTimeString()}] エラー: ${resData.reason || "シミュレーション案の生成に失敗しました。"}`,
          ...prev
        ]);
        return;
      }

      const { actionType, bot, data, targetSceneId, targetSceneTitle, targetSurveyId, targetSurveyQuestion } = resData;

      // 3. Auto Seed/Ensure Bot Profile exists locally before performing activity
      const botProfileRef = doc(db, "profiles", bot.uid);
      const botProfileSnap = await getDoc(botProfileRef);
      if (!botProfileSnap.exists()) {
        await setDoc(botProfileRef, {
          displayName: bot.displayName,
          photoURL: bot.photoURL,
          bio: bot.bio,
          coins: bot.coins || 5000,
          shards: 10,
          equippedBadges: bot.equippedBadges || [],
          unlockedBadgeIds: bot.equippedBadges || [],
          registeredAt: serverTimestamp(),
          isBot: true
        });
        setBotLogs(prev => [`[${new Date().toLocaleTimeString()}] [SEED] ${bot.displayName}のボットプロフィールを新規登録しました。`, ...prev]);
      }

      // 4. Securely process client-side operations mapped by role rules
      if (actionType === "scene") {
        const sceneId = "scene_bot_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
        
        await setDoc(doc(db, "scenes", sceneId), {
          title: data.title,
          content: data.content,
          category: data.category || "Everyday",
          hashtags: data.hashtags || [],
          authorId: bot.uid,
          authorName: bot.displayName,
          authorPhoto: bot.photoURL,
          createdAt: serverTimestamp(),
          upvotes: 0,
          views: 0,
          commentCount: 0,
          profileVisits: 0,
          isBot: true
        });

        if (data.matchedStockId) {
          await addDoc(collection(db, "jse_reports"), {
            stockId: data.matchedStockId,
            explanation: data.explanation || `「${data.title}」の投稿が検知されました。`,
            postId: sceneId,
            postTitle: data.title,
            authorName: bot.displayName,
            createdAt: serverTimestamp()
          });
        }

        setBotLogs(prev => [
          `[${new Date().toLocaleTimeString()}] 📝 【${bot.displayName}】が新着地味話を投稿: 「${data.title}」${data.matchedStockId ? ` (JSE連動: ${data.matchedStockId})` : ""}`,
          ...prev
        ]);

      } else if (actionType === "comment") {
        await addDoc(collection(doc(db, "scenes", targetSceneId), "comments"), {
          sceneId: targetSceneId,
          authorId: bot.uid,
          authorName: bot.displayName,
          authorPhoto: bot.photoURL,
          content: data.content,
          createdAt: serverTimestamp()
        });

        await updateDoc(doc(db, "scenes", targetSceneId), {
          commentCount: increment(1)
        });

        setBotLogs(prev => [
          `[${new Date().toLocaleTimeString()}] 💬 【${bot.displayName}】がコメント: 「${data.content}」 -> 対象:「${targetSceneTitle}」`,
          ...prev
        ]);

      } else if (actionType === "jse_trade") {
        await addDoc(collection(db, "jse_global_trades"), {
          stockId: data.stockId,
          qty: data.qty,
          type: data.type,
          userId: bot.uid,
          createdAt: serverTimestamp()
        });

        const coinDelta = data.type === "buy" ? -(data.qty * 10) : (data.qty * 10);
        await updateDoc(botProfileRef, {
          coins: increment(coinDelta)
        });

        setBotLogs(prev => [
          `[${new Date().toLocaleTimeString()}] 📈 【${bot.displayName}】が株式売買: ${data.type === "buy" ? "買い" : "売り"} ${data.qty}株 [${data.stockId}]`,
          ...prev
        ]);

      } else if (actionType === "upvote") {
        const key = `${bot.uid}_${targetSceneId}`;
        const voteRef = doc(db, "upvotes", key);
        const voteSnap = await getDoc(voteRef);

        if (!voteSnap.exists()) {
          await setDoc(voteRef, {
            userId: bot.uid,
            sceneId: targetSceneId,
            createdAt: serverTimestamp()
          });

          await updateDoc(doc(db, "scenes", targetSceneId), {
            upvotes: increment(1)
          });

          setBotLogs(prev => [
            `[${new Date().toLocaleTimeString()}] ❤️ 【${bot.displayName}】が「${targetSceneTitle}」に『地味に共感！』しました。`,
            ...prev
          ]);
        } else {
          setBotLogs(prev => [
            `[${new Date().toLocaleTimeString()}] ⚠️ 【${bot.displayName}】はすでに「${targetSceneTitle}」に共感済みです。`,
            ...prev
          ]);
        }

      } else if (actionType === "kairanban") {
        const sceneRef = doc(db, "scenes", targetSceneId);
        const sceneSnap = await getDoc(sceneRef);
        if (sceneSnap.exists()) {
          const sceneData = sceneSnap.data();
          const currentKairanUsers = sceneData?.kairanUsers || [];
          if (!currentKairanUsers.includes(bot.uid)) {
            const coinsSpent = data.coinsSpent || 20;
            const rewardCoins = Math.floor(coinsSpent * 0.5);

            await updateDoc(botProfileRef, {
              jCoins: increment(-coinsSpent),
              coins: increment(-coinsSpent)
            });

            await updateDoc(sceneRef, {
              kairanAmount: increment(coinsSpent),
              kairanCount: increment(1),
              kairanUsers: arrayUnion(bot.uid)
            });

            await addDoc(collection(db, "admin_messages"), {
              recipientId: sceneData.authorId,
              senderId: "system_kairanban",
              senderName: "回覧板システム",
              content: `誰かがあなたの投稿「${sceneData.title || '（無題）'}」を回覧板に回しました 📌 +${rewardCoins}コイン`,
              type: "kairanban_reward",
              rewardCoins: rewardCoins,
              createdAt: serverTimestamp(),
              read: false
            });

            setBotLogs(prev => [
              `[${new Date().toLocaleTimeString()}] 📌 【${bot.displayName}】が「${targetSceneTitle}」を回覧板に回しました（消費: ${coinsSpent}コイン、投稿主獲得: +${rewardCoins}コイン）。`,
              ...prev
            ]);
          } else {
            setBotLogs(prev => [
              `[${new Date().toLocaleTimeString()}] ⚠️ 【${bot.displayName}】はすでに「${targetSceneTitle}」を回覧板に回しています。`,
              ...prev
            ]);
          }
        }

      } else if (actionType === "plaza_vote") {
        const voteRef = doc(collection(doc(db, "plaza_surveys", targetSurveyId), "votes"), bot.uid);
        const voteSnap = await getDoc(voteRef);

        if (!voteSnap.exists()) {
          await setDoc(voteRef, {
            choice: data.choice,
            votedAt: serverTimestamp()
          });

          await updateDoc(doc(db, "plaza_surveys", targetSurveyId), {
            [data.choice === "yes" ? "yesVotes" : "noVotes"]: increment(1)
          });

          setBotLogs(prev => [
            `[${new Date().toLocaleTimeString()}] 🗳️ 【${bot.displayName}】が広場アンケート「${targetSurveyQuestion}」に【${data.choice === "yes" ? "あるある(はい)" : "ないない(いいえ)"}】で投票しました。`,
            ...prev
          ]);
        } else {
          setBotLogs(prev => [
            `[${new Date().toLocaleTimeString()}] ⚠️ 【${bot.displayName}】はすでに「${targetSurveyQuestion}」に回答済みです。`,
            ...prev
          ]);
        }

      } else if (actionType === "plaza_survey") {
        await addDoc(collection(db, "plaza_surveys"), {
          question: data.question,
          authorId: bot.uid,
          authorName: bot.displayName,
          authorPhoto: bot.photoURL,
          yesVotes: 0,
          noVotes: 0,
          createdAt: serverTimestamp()
        });

        setBotLogs(prev => [
          `[${new Date().toLocaleTimeString()}] 📊 【${bot.displayName}】が新しい広場お題アンケートを作成しました: 「${data.question}」`,
          ...prev
        ]);
      }

    } catch (e: any) {
      console.error("Bot action execution failed:", e);
      setBotLogs(prev => [`[${new Date().toLocaleTimeString()}] エラー: ${e.message}`, ...prev]);
    } finally {
      setIsSimulating(false);
    }
  };

  const unreadCount = adminMessages.filter(m => !m.read).length;

  // Blog Parts (Widget) Mode Router - Outputs single widget component styled beautifully for blogging sidebar
  if (isWidgetMode) {
    return <WidgetView uid={widgetUid} />;
  }

  if (view === 'kairan') {
    return (
      <KairanbanView
        user={user}
        profile={userProfile}
        allScenes={allScenes}
        onBack={() => handleViewChange('feed')}
        onProfileClick={(uid) => {
          setViewedProfileId(uid);
          handleViewChange('profile');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-orange-100 selection:text-orange-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-orange-100 px-4 py-3 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-orange-500 p-1.5 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="text-xl font-bold tracking-tight font-display text-orange-900">Jimicchi <span className="font-normal text-orange-500 font-sans text-sm ml-1 opacity-80">(地味っち)</span></div>
        </div>
        
        {/* Desktop Header items (hidden on mobile, visible on md+ screens) */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center bg-orange-50 rounded-full px-4 py-1.5 border border-orange-100">
            <Search className="w-4 h-4 text-orange-300 mr-2" />
            <input 
              type="text" 
              placeholder={t("キーワード検索...", "Search keywords...")} 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs outline-none text-orange-900 w-40 placeholder:text-orange-200"
            />
          </div>

          {/* Language Switch Button */}
          <button
            onClick={() => setLanguage(language === 'ja' ? 'en' : 'ja')}
            className="px-2.5 py-1.5 hover:bg-orange-50 rounded-xl text-orange-600 border border-orange-200/60 font-black text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            title={language === 'ja' ? 'Englishに切り替え' : '日本語に切り替え'}
          >
            <Globe className="w-3.5 h-3.5 text-orange-400" />
            <span>{language === 'ja' ? 'EN' : 'JA'}</span>
          </button>

          <button 
            onClick={() => setShowUserSearch(true)}
            className="p-2 hover:bg-orange-50 rounded-full text-orange-400 border border-orange-50"
            title={t("ユーザーを探す", "Search Users")}
          >
            <Users className="w-5 h-5" />
          </button>

          <button 
            id="btn-desktop-ranking"
            onClick={() => { setShowRanking(true); setView('feed'); }}
            className="p-2 hover:bg-orange-50 rounded-full text-[#b45309] border border-orange-50 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer bg-white"
            title={t("地味共感ランキング", "Sympathy Ranking")}
          >
            <Trophy className="w-5 h-5 text-amber-500" />
          </button>

          <button 
            id="btn-desktop-kairan"
            onClick={() => { setView('kairan'); setShowRanking(false); }}
            className={cn(
              "p-2 rounded-full border flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer",
              view === 'kairan' ? "bg-red-800 border-red-800 text-white animate-pulse-subtle" : "text-[#b45309] border-orange-50 bg-white hover:bg-orange-50"
            )}
            title="地味っち回覧板"
          >
            <span className="text-sm font-bold flex items-center gap-1 px-1">📌 {t("回覧板", "Kairanban")}</span>
          </button>

          <button 
            id="btn-desktop-plaza"
            onClick={() => { setView('plaza'); setShowRanking(false); }}
            className={cn(
              "p-2 rounded-full border flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer",
              view === 'plaza' ? "bg-amber-600 border-amber-600 text-white animate-pulse-subtle" : "text-[#b45309] border-orange-50 bg-white hover:bg-orange-50"
            )}
            title="地味ひろば (Jimichi Plaza)"
          >
            <span className="text-sm font-bold flex items-center gap-1 px-1">🎪 {t("地味ひろば", "Plaza")}</span>
          </button>

          <button 
            id="btn-desktop-jse"
            onClick={() => { setView('jse'); setShowRanking(false); }}
            className={cn(
              "p-2 rounded-full border flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer",
              view === 'jse' ? "bg-orange-600 border-orange-600 text-white animate-pulse-subtle" : "text-[#b45309] border-orange-50 bg-white hover:bg-orange-50"
            )}
            title="地味っち株式市場 (Jimichi Stock Exchange)"
          >
            <span className="text-sm font-bold flex items-center gap-1 px-1">📈 {t("地味株 (JSE)", "Stocks")}</span>
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 mr-2 bg-orange-50 rounded-full px-2 py-1">
                <button onClick={() => setShowAnnouncementHistory(true)} className="p-1.5 hover:bg-orange-100 rounded-full transition-colors relative" title={t("お知らせ", "Announcements")}>
                  <Volume2 className="w-4 h-4 text-orange-600" />
                </button>
                <button 
                  onClick={() => setShowGeneralSashiireModal(true)} 
                  className="p-1.5 hover:bg-orange-100 rounded-full transition-colors relative"
                  title={t("差し入れ（おやつ応援）", "Send / Setup Tipping")}
                >
                  <Gift className="w-4 h-4 text-orange-655" />
                </button>
                {!user?.isAnonymous && (
                  <button onClick={() => setShowChatList(true)} className="p-1.5 hover:bg-orange-100 rounded-full transition-colors relative" title={t("チャット", "Chats")}>
                    <MessageSquare className="w-4 h-4 text-orange-600" />
                  </button>
                )}
                <button onClick={() => setShowMessages(true)} className="relative p-1.5 hover:bg-orange-100 rounded-full transition-colors" title={t("通知", "Notifications")}>
                  <Bell className="w-4 h-4 text-orange-600" />
                  {unreadCount > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />}
                </button>
                {isAdmin && (
                  <button onClick={() => setShowAdminPanel(true)} className="p-1.5 hover:bg-orange-100 rounded-full transition-colors" title={t("管理者", "Admin")}>
                    <Shield className="w-4 h-4 text-orange-600" />
                  </button>
                )}
                {!user?.isAnonymous && (
                  <button 
                    onClick={() => setShowGachaModal(true)} 
                    className="p-1.5 hover:bg-orange-100 rounded-full transition-colors relative text-amber-600"
                    title={t("地味ガチャ", "Jimi Gacha")}
                  >
                    <Coins className="w-4 h-4 text-amber-600" />
                  </button>
                )}
              </div>
              {userGachaState && !user?.isAnonymous && (
                <div 
                  id="btn-desktop-gacha"
                  onClick={() => setShowGachaModal(true)}
                  className="hidden sm:flex items-center gap-1.5 cursor-pointer hover:scale-105 transition duration-200 active:scale-95 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-200/50 text-amber-900 font-black text-xs px-3.5 py-1.5 rounded-full select-none shadow-sm shadow-amber-900/5"
                  title={t("クリックして地味ガチャを引く", "Click to draw Jimi Gacha")}
                >
                  <Coins className="w-3.5 h-3.5 text-amber-600 animate-spin-pulse" style={{ animationDuration: '3s' }} />
                  <span>{userGachaState.coins} <span className="text-[9px] text-amber-700/80 font-bold">GC</span></span>
                </div>
              )}
              <div className="hidden sm:block text-right">
                <p className="text-xs font-medium text-orange-900">{userProfile?.displayName || user.displayName}</p>
                <div className="flex gap-2 justify-end">
                  <button 
                    id="btn-desktop-profile"
                    onClick={() => handleOpenProfile(user.uid)} 
                    className="text-[10px] text-orange-400 hover:text-orange-600 transition-colors underline"
                  >
                    {t("マイページ", "My Page")}
                  </button>
                  <button onClick={logout} className="text-[10px] text-orange-200 hover:text-orange-600 transition-colors">{t("ログアウト", "Logout")}</button>
                </div>
              </div>
              <button onClick={() => handleOpenProfile(user.uid)}>
                <img src={userProfile?.photoURL || user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-orange-100 ring-2 ring-transparent hover:ring-orange-200 transition-all" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-all shadow-sm shadow-orange-200"
            >
              {t("ログイン", "Login")}
            </button>
          )}
        </div>

        {/* Mobile Header items (visible on mobile, hidden on desktop) */}
        <div className="flex md:hidden items-center gap-2">
          {user && userGachaState && !user?.isAnonymous && (
            <div 
              id="btn-mobile-gacha"
              onClick={() => setShowGachaModal(true)}
              className="flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-200/40 text-amber-900 font-black text-[10px] px-2.5 py-1 rounded-full select-none"
              title={t("クリックして地味ガチャを引く", "Click to draw Jimi Gacha")}
            >
              <Coins className="w-3 h-3 text-amber-600" />
              <span>{userGachaState.coins} <span className="text-[8px] text-amber-700 font-bold">GC</span></span>
            </div>
          )}

          {user ? (
            <button 
              id="btn-mobile-profile"
              onClick={() => handleOpenProfile(user.uid)}
              className="active:scale-95 transition-transform shrink-0"
              title={t("マイページ", "My Page")}
            >
              <img src={userProfile?.photoURL || user.photoURL || ''} alt="" className="w-7 h-7 rounded-full border border-orange-100" />
            </button>
          ) : (
            <button 
              onClick={handleLogin}
              className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-medium transition-all shadow-sm shadow-orange-100 mr-1"
            >
              {t("ログイン", "Login")}
            </button>
          )}

          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-1.5 rounded-xl bg-orange-50/70 hover:bg-orange-105 border border-orange-200/50 text-orange-950 flex items-center justify-center transition-all active:scale-90 cursor-pointer shrink-0"
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5 text-orange-700" />
          </button>
        </div>
      </header>

      {isQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 md:py-2.5 text-center text-xs text-amber-800 select-none flex items-center justify-center gap-2 font-bold font-sans animate-fade-in">
          <span>⚠️ 現在、無料デモデータベースの書き込み上限（Quota）に達しているため、一時的に「ローカル体験モード（ブラウザ内保存）」で全機能が安全に動作しています。ご不便をおかけしますが、日付が変わると自動的にオンラインに復旧します。アプリの全機能はそのままお試しいただけます！</span>
          <button 
            onClick={() => {
              try {
                localStorage.removeItem('jimicchi_db_quota_exceeded');
                setIsQuotaExceeded(false);
              } catch (_) {}
            }}
            className="ml-2 hover:bg-amber-100 px-1.5 py-0.5 rounded text-[10px] text-amber-700 font-sans border border-amber-300 bg-white transition hover:scale-[1.03] active:scale-95 cursor-pointer"
          >
            閉じる
          </button>
        </div>
      )}

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {showRanking ? (
          <RankingView 
            allScenes={allScenes}
            onUpvote={handleUpvote}
            onClick={handleSelectScene}
            onProfileClick={handleOpenProfile}
            isUpvoted={(id) => upvotedScenes.has(id)}
            isAdmin={isAdmin}
            onDelete={handleDeleteScene}
            profiles={profiles}
            onCopy={handleCopyPost}
            onBack={() => setShowRanking(false)}
            userId={user?.uid}
          />
        ) : view === 'plaza' ? (
          <JimiPlazaView 
            user={user} 
            profile={userProfile} 
            onBack={() => handleViewChange('feed')} 
            onGachaStateChange={() => setGachaRevision(prev => prev + 1)}
          />
        ) : view === 'jse' ? (
          <JseView 
            user={user}
            profile={userProfile}
            onBack={() => handleViewChange('feed')}
            onGachaStateChange={() => setGachaRevision(prev => prev + 1)}
            allScenes={allScenes}
          />
        ) : view === 'terms' ? (
          <TermsView onBack={() => handleViewChange('feed')} isAdmin={isAdmin} />
        ) : view === 'privacy' ? (
          <PrivacyView onBack={() => handleViewChange('feed')} isAdmin={isAdmin} />
        ) : view === 'guidelines' ? (
          <GuidelinesView onBack={() => handleViewChange('feed')} isAdmin={isAdmin} />
        ) : view === 'about' ? (
          <JimiLandingPage onBack={() => handleViewChange('feed')} onGoToApp={() => handleViewChange('feed')} user={user} />
        ) : view === 'feed' ? (
          <>
            <section className="mb-12 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-orange-900 mb-4 leading-tight italic font-serif">
                {t("「それ、わかる」という", "The simple joy of")}
                <br />
                {t("地味な幸せ。", "saying 'I totally get that'.")}
              </h2>
              <p className="text-orange-800/60 max-w-lg mx-auto text-sm sm:text-base">
                {t(
                  "日常の些細な瞬間、自分だけじゃなかったと気付いた時のあの安心感。そんな地味に共感できるシーンを共有しましょう。",
                  "The relief of realizing you're not the only one in life's quiet moments. Let's share and celebrate understatement together."
                )}
              </p>
            </section>

            {/* Action Bar */}
            <div className="flex justify-center mb-8">
              <button 
                id="btn-inline-post"
                onClick={() => user ? setShowSubmit(true) : handleLogin()}
                className="group flex items-center gap-2 bg-orange-900 text-white px-6 py-3 rounded-2xl hover:bg-orange-800 transition-all shadow-lg shadow-orange-900/10 active:scale-95 animate-pulse-subtle"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">{t("シーンを投稿する", "Post a Scene")}</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-1 bg-orange-50/50 p-1 rounded-2xl border border-orange-100/50">
                <button 
                  onClick={() => setSortMode('latest')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                    sortMode === 'latest' ? "bg-white text-orange-900 shadow-sm" : "text-orange-300 hover:bg-white/50"
                  )}
                >
                  <Activity className="w-3.5 h-3.5" />
                  {t("最新", "Latest")}
                </button>
                <button 
                  onClick={() => setSortMode('popular')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                    sortMode === 'popular' ? "bg-white text-orange-900 shadow-sm" : "text-orange-300 hover:bg-white/50"
                  )}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  {t("人気", "Popular")}
                </button>
              </div>

              {selectedTag && (
                <div className="flex items-center gap-2 bg-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                  <Hash className="w-3 h-3" />
                  {selectedTag}
                  <button onClick={() => setSelectedTag(null)} className="ml-1 hover:bg-white/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                </div>
              )}

              <div className="flex md:hidden items-center bg-orange-50 rounded-full px-4 py-2 border border-orange-100 w-full">
                <Search className="w-4 h-4 text-orange-300 mr-2" />
                <input 
                  type="text" 
                  placeholder={t("キーワード検索...", "Search keywords...")} 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-xs outline-none text-orange-900 w-full placeholder:text-orange-200"
                />
              </div>
            </div>

            {/* Category Filter Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
              {[
                { id: 'all', jaName: 'すべて', enName: 'All', icon: Sparkles },
                { id: 'everyday', jaName: '日常', enName: 'Everyday', icon: Sparkles },
                { id: 'work', jaName: '仕事', enName: 'Work', icon: Briefcase },
                { id: 'school', jaName: '学校', enName: 'School', icon: GraduationCap },
                { id: 'relationship', jaName: '人間関係', enName: 'Relationship', icon: Heart },
              ].map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 border",
                      isActive 
                        ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10 scale-[1.02]" 
                        : "bg-white border-orange-100 text-orange-900/70 hover:bg-orange-50/50 hover:text-orange-950"
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5", isActive ? "text-orange-100" : "text-orange-400")} />
                    <span>{t(cat.jaName, cat.enName)}</span>
                  </button>
                );
              })}
            </div>

            {/* Scene Feed */}
            <div className="space-y-6">
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 text-orange-200 animate-spin" />
                </div>
              ) : scenes.length === 0 ? (
                <div className="text-center py-20 bg-orange-50/50 rounded-3xl border-2 border-dashed border-orange-100">
                  <p className="text-orange-400">{t("まだ投稿がありません。最初のシーンを投稿してみませんか？", "No scenes posted yet. Why not post the very first one?")}</p>
                </div>
              ) : (
                <>
                  {scenes.slice(0, displayLimit).map((scene) => (
                    <SceneCard 
                      key={scene.id} 
                      scene={scene} 
                      onUpvote={() => { handleUpvote(scene.id); }}
                      onClick={() => handleSelectScene(scene)}
                      onProfileClick={handleOpenProfile}
                      onTagClick={setSelectedTag}
                      isUpvoted={upvotedScenes.has(scene.id)}
                      isAdmin={isAdmin}
                      onDelete={() => handleDeleteScene(scene.id)}
                      authorProfile={profiles[scene.authorId]}
                      currentUserProfile={myProfile}
                      onCopy={handleCopyPost}
                      onToggleSticker={handleToggleSceneSticker}
                    />
                  ))}

                  {scenes.length > displayLimit && (
                    <div className="flex justify-center pt-4">
                      <button
                        onClick={() => setDisplayLimit(prev => prev + 25)}
                        className="px-6 py-3.5 bg-orange-50 text-orange-700 hover:bg-orange-100 font-extrabold text-xs tracking-widest uppercase rounded-2xl border border-orange-100 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md"
                      >
                        <ChevronDown className="w-4 h-4" />
                        さらに投稿を読み込む ({scenes.length - displayLimit}件の未表示)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Visual SEO Landing Categories Cards */}
            <div className="mt-16 bg-white border-2 border-orange-100 p-8 rounded-3xl text-center shadow-sm sm:max-w-2xl mx-auto">
              <h1 className="text-2xl font-black text-orange-950 mb-2">地味っち</h1>
              <h2 className="text-sm font-bold text-orange-800/80 mb-6">地味に共感できる投稿を集めたSNS</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                  <h2 className="text-sm font-bold text-orange-950 mb-1">日常あるある</h2>
                  <p className="text-[11px] text-orange-800/70">「冷蔵庫の前で立ち尽くす」など、誰もがやってしまう日常の地味な共感シーンを一覧できます。</p>
                </div>
                <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                  <h2 className="text-sm font-bold text-orange-950 mb-1">学校あるある</h2>
                  <p className="text-[11px] text-orange-800/70">「プリントの端を折る」「授業が終わる5分前」など、静かでどこかノスタルジックな学生生活のあるある投稿。</p>
                </div>
                <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                  <h2 className="text-sm font-bold text-orange-950 mb-1">高校生あるある</h2>
                  <p className="text-[11px] text-orange-800/70">「放課後の何気ない時間」「チャイムと同時にダッシュする」など、いつまでも色褪せない学校生活の地味エピソード。</p>
                </div>
              </div>

              <div className="mt-8 border-t border-orange-100/60 pt-6 text-center">
                <button
                  type="button"
                  onClick={() => handleViewChange('about')}
                  className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-6 py-3 rounded-2xl transition cursor-pointer shadow-md shadow-amber-600/10 active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                  <span>{t("地味っち公式ホームページ・詳しい使い方はこちら ↗", "Official Jimicchi Homepage & User Guide ↗")}</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <ProfileView 
            uid={viewedProfileId!} 
            onBack={() => setView('feed')} 
            onEdit={() => setShowEditProfile(true)}
            isOwnProfile={user?.uid === viewedProfileId}
            onUpvote={handleUpvote}
            onSceneClick={handleSelectScene}
            onProfileClick={handleOpenProfile}
            isUpvoted={(id) => upvotedScenes.has(id)}
            isAdmin={isAdmin}
            onBanUser={handleBanUser}
            onSendMessage={handleSendMessage}
            onTransferAdmin={handleTransferAdmin}
            onDeleteScene={handleDeleteScene}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
            isFollowing={following.includes(viewedProfileId!)}
            onStartChat={handleStartChat}
            onTagClick={(tag) => {
              setSelectedTag(tag);
              setView('feed');
            }}
            followerCount={followerCounts[viewedProfileId!] || 0}
            followingCount={followingCounts[viewedProfileId!] || 0}
            profiles={profiles}
            onOpenGacha={() => setShowGachaModal(true)}
            gachaRevision={gachaRevision}
            onCopy={handleCopyPost}
            onToggleSticker={handleToggleSceneSticker}
          />
        )}
      </main>

      {/* Announcement Popup */}
      <AnimatePresence>
        {showAnnouncementPopup && currentAnnouncement && (
          <AnnouncementModal 
            announcement={currentAnnouncement} 
            onClose={handleCloseAnnouncement} 
          />
        )}
      </AnimatePresence>

      {/* Announcement History */}
      <AnimatePresence>
        {showAnnouncementHistory && (
          <AnnouncementHistoryModal 
            announcements={announcements} 
            onClose={() => setShowAnnouncementHistory(false)} 
          />
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <AuthModal 
            onClose={() => setShowLoginModal(false)} 
            onViewChange={handleViewChange}
          />
        )}
      </AnimatePresence>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              className="fixed inset-0 bg-orange-950/20 backdrop-blur-sm z-[999]"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 w-[280px] sm:w-[320px] bg-[#FDFCFB] border-l border-orange-100 shadow-2xl z-[1000] flex flex-col overflow-y-auto"
            >
              {/* Header inside drawer */}
              <div className="p-4 flex items-center justify-between border-b border-orange-50 bg-orange-50/20 shrink-0">
                <span className="font-bold text-orange-950 text-sm">{t("メニュー", "Menu")}</span>
                <button 
                  onClick={() => setShowMobileMenu(false)}
                  className="p-1.5 hover:bg-orange-100/50 rounded-full transition-colors text-orange-900 cursor-pointer text-xs bg-transparent border-0 font-bold"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Profile Card inside drawer */}
              <div className="p-6 border-b border-orange-50 bg-gradient-to-b from-orange-50/25 to-transparent shrink-0">
                {user ? (
                  <div className="flex flex-col items-center text-center">
                    <img 
                      src={userProfile?.photoURL || user.photoURL || ''} 
                      alt="" 
                      className="w-16 h-16 rounded-full border-2 border-orange-100 shadow-md mb-3"
                    />
                    <h4 className="font-bold text-orange-950 text-base mb-1">{userProfile?.displayName || user.displayName}</h4>
                    
                    {/* GC Coins */}
                    {userGachaState && !user?.isAnonymous && (
                      <div 
                        onClick={() => { setShowGachaModal(true); setShowMobileMenu(false); }}
                        className="flex items-center gap-1.5 mt-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 text-amber-900 font-black text-xs px-3.5 py-1.5 rounded-full select-none cursor-pointer hover:scale-105 active:scale-95 transition"
                      >
                        <Coins className="w-3.5 h-3.5 text-amber-600 animate-spin-pulse" style={{ animationDuration: '3s' }} />
                        <span>{userGachaState.coins} <span className="text-[9px] text-amber-700/80 font-bold">GC</span></span>
                      </div>
                    )}

                    <div className="flex gap-4 mt-4 w-full">
                      <button 
                        onClick={() => { handleOpenProfile(user.uid); setShowMobileMenu(false); }}
                        className="flex-1 py-1.5 rounded-xl border border-orange-200 text-orange-600 font-extrabold text-xs bg-white hover:bg-orange-50/50 active:scale-95 transition-all cursor-pointer"
                      >
                        {t("マイページ", "My Page")}
                      </button>
                      <button 
                        onClick={() => { logout(); setShowMobileMenu(false); }}
                        className="flex-1 py-1.5 rounded-xl border border-orange-100 text-orange-400 font-bold text-xs bg-white hover:bg-orange-50/20 active:scale-95 transition-all cursor-pointer"
                      >
                        {t("ログアウト", "Logout")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-orange-500 mb-3">{t("ログインして地味っちをフルに楽しもう！", "Login to enjoy Jimicchi to the fullest!")}</p>
                    <button 
                      onClick={() => { handleLogin(); setShowMobileMenu(false); }}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-full text-xs font-bold transition-all shadow-sm shadow-orange-200 cursor-pointer border-0"
                    >
                      {t("ログイン", "Login")}
                    </button>
                  </div>
                )}
              </div>

              {/* Navigation Items list */}
              <div className="p-4 flex-1 space-y-1">
                {/* 🌈 地味っち インタラクティブチュートリアル 🎯 */}
                <button 
                  onClick={() => { 
                    setShowTutorial(true); 
                    setShowMobileMenu(false); 
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-200/50 text-left transition text-orange-950 group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl text-white group-hover:scale-105 transition-all">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-xs font-black block text-amber-955">{t("地味っち体験ツアー！", "Interactive Guided Tour")}</span>
                      <span className="text-[10px] text-amber-700/85 font-bold">{t("実際に操作して機能をマスターする", "Learn Jimicchi by playing")}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {user && (
                  <>
                    {/* Coins / Gacha */}
                    {!user?.isAnonymous && (
                      <button 
                        onClick={() => { setShowGachaModal(true); setShowMobileMenu(false); }}
                        className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-orange-50/60 text-left transition text-orange-900 group cursor-pointer border-0 bg-transparent"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-50 rounded-xl text-amber-600 group-hover:bg-amber-100 transition">
                            <Coins className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-black block text-orange-950">{t("地味ガチャ", "Jimi Gacha")}</span>
                            <span className="text-[10px] text-orange-400 font-medium">{t("二つ名やバッジをGETする", "Get titles & badges")}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-orange-300 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}

                    {/* 🎁 差し入れ（おやつ応援） */}
                    <button 
                      onClick={() => { 
                        setShowGeneralSashiireModal(true); 
                        setShowMobileMenu(false); 
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-200/50 text-left transition text-orange-955 group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-orange-400 to-rose-400 rounded-xl text-white group-hover:scale-105 transition-all">
                          🎁
                        </div>
                        <div>
                          <span className="text-xs font-black block text-orange-950">{t("差し入れ（おやつ応援）", "Snack Gift (Support)")}</span>
                          <span className="text-[10px] text-orange-700/80 font-bold">{t("PayPayなどで差し入れを送る・設定する", "Send or set up tips via PayPay/etc.")}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-orange-600 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* おやつ応援/支援の設定 */}
                    {!user?.isAnonymous && (
                      <button 
                        onClick={() => { 
                          setShowSupportLinkModal(true); 
                          setShowMobileMenu(false); 
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-2xl bg-rose-50/40 hover:bg-rose-50 hover:border-rose-200 border border-rose-100/40 text-left transition text-rose-955 group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-rose-400 to-pink-500 rounded-xl text-white group-hover:scale-105 transition-all">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-black block text-rose-955">{t("差し入れ・支援リンク設定", "Setup Tip Link")}</span>
                            <span className="text-[10px] text-rose-600 font-semibold">{t("PayPayやKyashの受け取りURLを設定", "Register PayPay / Kyash URL for receiving tips")}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}

                    {/* Announcement History */}
                    <button 
                      onClick={() => { setShowAnnouncementHistory(true); setShowMobileMenu(false); }}
                      className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-orange-50/60 text-left transition text-orange-900 group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 rounded-xl text-orange-600 group-hover:bg-orange-100 transition">
                          <Volume2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black block text-orange-950">{t("運営からのお知らせ", "Announcements")}</span>
                          <span className="text-[10px] text-orange-400 font-medium">{t("過去のお知らせを確認する", "View past announcements")}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-orange-300 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* 地味っち回覧板 (Kairanban) */}
                    <button 
                      onClick={() => { setView('kairan'); setShowRanking(false); setShowMobileMenu(false); }}
                      className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-orange-50/60 text-left transition text-orange-900 group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-xl text-red-600 group-hover:bg-red-100 transition">
                          <span className="text-base leading-none">📌</span>
                        </div>
                        <div>
                          <span className="text-xs font-black block text-orange-950">{t("地味っち回覧板", "Jimichi Kairanban")}</span>
                          <span className="text-[10px] text-orange-400 font-medium">{t("全画面スワイプで回覧板を回し読み", "Browse and circulate posts full-screen")}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-orange-300 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* Event Plaza */}
                    <button 
                      onClick={() => { setView('plaza'); setShowRanking(false); setShowMobileMenu(false); }}
                      className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-orange-50/60 text-left transition text-orange-900 group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 rounded-xl text-amber-600 group-hover:bg-amber-100 transition">
                          <span className="text-base leading-none">🎪</span>
                        </div>
                        <div>
                          <span className="text-xs font-black block text-orange-950">{t("地味ひろば", "Event Plaza")}</span>
                          <span className="text-[10px] text-orange-400 font-medium">{t("地味俳句・ダジャレ・地味書籍", "Haiku, Dajare, Books")}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-orange-300 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* Jimi Stock Exchange (JSE) */}
                    <button 
                      onClick={() => { setView('jse'); setShowRanking(false); setShowMobileMenu(false); }}
                      className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-orange-50/60 text-left transition text-orange-900 group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 rounded-xl text-orange-600 group-hover:bg-orange-100 transition">
                          <span className="text-base leading-none">📈</span>
                        </div>
                        <div>
                          <span className="text-xs font-black block text-orange-950">{t("地味っち株式市場 (JSE)", "Stock Exchange (JSE)")}</span>
                          <span className="text-[10px] text-orange-400 font-medium">{t("現象そのものに投資する株式市場", "Invest in phenomena directly")}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-orange-300 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* Sympathy Ranking */}
                    <button 
                      onClick={() => { setShowRanking(true); setShowMobileMenu(false); setView('feed'); }}
                      className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-orange-50/60 text-left transition text-orange-900 group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 rounded-xl text-amber-600 group-hover:bg-amber-100 transition">
                          <Trophy className="w-4 h-4 text-amber-550" />
                        </div>
                        <div>
                          <span className="text-xs font-black block text-orange-950">{t("地味共感ランキング", "Sympathy Ranking")}</span>
                          <span className="text-[10px] text-orange-400 font-medium">{t("日間・週間・月間の人気投稿", "Daily, Weekly, Monthly top posts")}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-orange-300 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* Notifications (Personal Messages) */}
                    <button 
                      onClick={() => { setShowMessages(true); setShowMobileMenu(false); }}
                      className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-orange-50/60 text-left transition text-orange-900 group cursor-pointer animate-fade-in"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 rounded-xl text-orange-600 group-hover:bg-orange-100 transition relative">
                          <Bell className="w-4 h-4" />
                          {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />}
                        </div>
                        <div>
                          <span className="text-xs font-black block text-orange-950">{t("あなたへの通知", "Notifications")}</span>
                          <span className="text-[10px] text-orange-400 font-medium">
                            {unreadCount > 0 ? t(`${unreadCount}件の未読があります`, `${unreadCount} unread notices`) : t("通知はありません", "No new notifications")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-orange-300 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>

                    {/* Direct Messages (DM) */}
                    {!user?.isAnonymous && (
                      <button 
                        onClick={() => { setShowChatList(true); setShowMobileMenu(false); }}
                        className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-orange-50/60 text-left transition text-orange-900 group cursor-pointer animate-fade-in"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-50 rounded-xl text-orange-600 group-hover:bg-orange-100 transition">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-black block text-orange-950">{t("内緒話 (DM)", "Direct Messages")}</span>
                            <span className="text-[10px] text-orange-400 font-medium">{t("他のユーザーと個別にやり取りする", "Chat privately with others")}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-orange-300 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}

                    {/* User Search */}
                    <button 
                      onClick={() => { setShowUserSearch(true); setShowMobileMenu(false); }}
                      className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-orange-50/60 text-left transition text-orange-900 group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 rounded-xl text-orange-600 group-hover:bg-orange-100 transition">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black block text-orange-950">{t("ユーザーを探す", "Find Users")}</span>
                          <span className="text-[10px] text-orange-400 font-medium">{t("Jimicchiコミュニティ検索", "Search community profiles")}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-orange-300 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* Admin Panel (Conditional) */}
                    {isAdmin && (
                      <button 
                        onClick={() => { setShowAdminPanel(true); setShowMobileMenu(false); }}
                        className="w-full flex items-center justify-between p-3 rounded-2xl bg-orange-50/40 hover:bg-orange-100/40 text-left transition text-orange-900 group border border-dashed border-orange-200 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-500 rounded-xl text-white">
                            <Shield className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-black block text-orange-950">{t("管理者コントロール", "Admin Panel")}</span>
                            <span className="text-[10px] text-orange-500 font-medium">{t("コンテンツ・ユーザー管理", "Manage posts & users")}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-orange-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                  </>
                )}

                {/* 地味っちリーガルリンク */}
                <div className="pt-4 mt-3 border-t border-orange-100 dark:border-zinc-800 text-xs">
                  <p className="text-[10px] font-black text-orange-400 dark:text-zinc-500 mb-2 pl-2 tracking-wider uppercase">{t("リンク", "Links")}</p>
                  
                  <button 
                    onClick={() => { handleViewChange('terms'); setShowMobileMenu(false); }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-orange-50/60 dark:hover:bg-zinc-800/40 text-left transition text-orange-950 dark:text-zinc-300 group cursor-pointer border-0 bg-transparent focus:outline-none"
                  >
                    <span className="text-xs font-bold pl-1">{t("利用規約", "Terms of Service")}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-orange-300 dark:text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button 
                    onClick={() => { handleViewChange('privacy'); setShowMobileMenu(false); }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-orange-50/60 dark:hover:bg-zinc-800/40 text-left transition text-orange-950 dark:text-zinc-300 group cursor-pointer border-0 bg-transparent focus:outline-none"
                  >
                    <span className="text-xs font-bold pl-1">{t("プライバシーポリシー", "Privacy Policy")}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-orange-300 dark:text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button 
                    onClick={() => { handleViewChange('guidelines'); setShowMobileMenu(false); }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-orange-50/60 dark:hover:bg-zinc-800/40 text-left transition text-orange-950 dark:text-zinc-300 group cursor-pointer border-0 bg-transparent focus:outline-none"
                  >
                    <span className="text-xs font-bold pl-1">{t("コミュニティガイドライン", "Community Guidelines")}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-orange-300 dark:text-zinc-650 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Bottom Utility (Language Switcher) in Mobile Drawer */}
              <div className="p-4 border-t border-orange-55 bg-orange-50/10 flex items-center justify-between shrink-0">
                <span className="text-[10px] font-black text-orange-400 tracking-wider uppercase">{t("言語設定", "LANGUAGE SETTINGS")}</span>
                <button
                  onClick={() => setLanguage(language === 'ja' ? 'en' : 'ja')}
                  className="px-3 py-1.5 hover:bg-orange-100/50 rounded-xl text-orange-750 border border-orange-200 font-black text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer bg-white"
                >
                  <Globe className="w-3.5 h-3.5 text-orange-400" />
                  <span>{language === 'ja' ? 'English (EN)' : '日本語 (JA)'}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Profile Edit Modal */}
      <AnimatePresence>
        {showEditProfile && userProfile && (
          <EditProfileModal 
            profile={userProfile} 
            onClose={() => setShowEditProfile(false)} 
            onSave={(updated) => {
              setUserProfile(updated);
              setShowEditProfile(false);
            }} 
          />
        )}
      </AnimatePresence>

      {/* Submit Modal */}
      <AnimatePresence>
        {showSubmit && (
          <SubmitModal 
            onClose={() => {
              setShowSubmit(false);
              setSubmitTitle('');
              setSubmitContent('');
            }} 
            user={user}
            setAiLoading={setAiLoading}
            aiLoading={aiLoading}
            onTitleContentChange={(title, content) => {
              setSubmitTitle(title);
              setSubmitContent(content);
            }}
            onPostSuccess={() => {
              if (tutorialStep === 3) {
                setTutorialStep(4);
              }
              setSubmitTitle('');
              setSubmitContent('');
            }}
          />
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedScene && (
          <DetailModal 
            scene={selectedScene} 
            onClose={() => {
              setSelectedScene(null);
              window.history.pushState({}, '', '/');
            }} 
            user={user}
            onUpvote={() => handleUpvote(selectedScene.id)}
            onLogin={handleLogin}
            isUpvoted={upvotedScenes.has(selectedScene.id)}
            isAdmin={isAdmin}
            onDelete={() => handleDeleteScene(selectedScene.id)}
            onReport={(reason) => handleReport(selectedScene.id, 'scene', reason)}
            onTagClick={(tag) => {
              setSelectedTag(tag);
              setSelectedScene(null);
              setView('feed');
              window.history.pushState({}, '', '/');
            }}
            authorProfile={profiles[selectedScene.authorId]}
            currentUserProfile={myProfile}
            profiles={profiles}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUserSearch && (
          <UserSearchModal 
            onClose={() => setShowUserSearch(false)}
            onSelectUser={(uid) => {
              handleOpenProfile(uid);
              setShowUserSearch(false);
            }}
            query={userSearchQuery}
            setQuery={setUserSearchQuery}
            results={userSearchResults}
          />
        )}
      </AnimatePresence>

      {/* Admin Panel */}
      <AnimatePresence>
        {showAdminPanel && isAdmin && (
          <AdminPanel 
            reports={reports} 
            onClose={() => setShowAdminPanel(false)}
            onDeleteScene={handleDeleteScene}
            onBanUser={handleBanUser}
            onCreateAnnouncement={handleCreateAnnouncement}
            stats={stats}
            botLogs={botLogs}
            setBotLogs={setBotLogs}
            isSimulating={isSimulating}
            triggerBotSimulation={triggerBotSimulation}
          />
        )}
      </AnimatePresence>

      {/* Messages Modal */}
      <AnimatePresence>
        {showMessages && (
          <AdminMessagesModal 
            messages={adminMessages} 
            onClose={() => setShowMessages(false)}
          />
        )}
      </AnimatePresence>

      {/* Chat List Modal */}
      <AnimatePresence>
        {showChatList && user && (
          <ChatListModal 
            user={user}
            onClose={() => setShowChatList(false)}
            onSelectChat={(id) => {
              setActiveChatId(id);
              setShowChatList(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Chat Dialog */}
      <AnimatePresence>
        {activeChatId && user && (
          <ChatDialog 
            chatId={activeChatId}
            user={user}
            userProfile={userProfile}
            onClose={() => setActiveChatId(null)}
          />
        )}
      </AnimatePresence>

      {/* Onboarding / Tutorial Modal */}
      <AnimatePresence>
        {showTutorial && (
          <TutorialModal
            isOpen={showTutorial}
            onClose={() => setShowTutorial(false)}
            onStartInteractive={() => {
              setTutorialStep(1);
            }}
          />
        )}
      </AnimatePresence>

      {/* Jimi Gacha Modal */}
      <AnimatePresence>
        {showGachaModal && user && (
          <JimiGachaModal
            userId={user.uid}
            isAdmin={isAdmin}
            onClose={() => {
              setShowGachaModal(false);
              setGachaRevision(prev => prev + 1);
            }}
            onItemUnlocked={() => {
              if (tutorialStep === 5) {
                setTutorialStep(6);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Dynamic Support/Tip Link Setup Modal */}
      <AnimatePresence>
        {showSupportLinkModal && user && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSupportLinkModal(false)}
              className="fixed inset-0 bg-orange-950/45 backdrop-blur-sm"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.25 }}
              className="relative w-full max-w-md bg-white rounded-3xl border border-orange-100 shadow-2xl p-6 z-[1101] overflow-hidden"
              id="support-link-modal"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-orange-50">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎁</span>
                  <h3 className="font-black text-orange-950 text-base">{t("おやつ応援（支援URL）設定", "Configure Snack Tip URL")}</h3>
                </div>
                <button
                  onClick={() => setShowSupportLinkModal(false)}
                  className="p-1 text-orange-700 hover:bg-orange-50 rounded-full transition cursor-pointer border-0 bg-transparent animate-fade-in"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-orange-800 leading-relaxed font-semibold">
                  {t("地味っちでは、「ささやかな共感」を生み出してくれた投稿主（クリエイター）へ応援の気持ちを込めておやつ代やコーヒー代を差し入れ（投げ銭）することができます！☕️", "On Jimicchi, you can configure your custom support URL so users can send you snack or coffee tips for your posts!")}
                </p>

                <div className="bg-orange-50/50 border border-orange-100/40 rounded-2xl p-3.5 space-y-2 text-[11px] text-orange-900 leading-relaxed font-medium mb-3">
                  <div className="font-bold text-orange-950 flex items-center gap-1">
                    <span>💡</span>
                    <span>{t("登録できるURLの例:", "Examples of Tip Links:")}</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>PayPay（マイパターンの送金・受取URL / QRリンク）</li>
                    <li>Kyashの送金リンク (kyash.me/...)</li>
                    <li>Amazon ほしい物リスト</li>
                    <li>Buy Me a Coffee / Ko-fi / OFUSE等</li>
                  </ul>
                  <p className="text-[10px] text-rose-500 font-bold mt-1">※PayPayの個人間送金リンクもそのまま利用可能です！個人情報の公開範囲には十分ご注意ください。</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-orange-500 mb-1.5 uppercase tracking-wider">{t("支援URL / 送金用リンク (PayPay/Kyash等)", "Tipping Link URL (PayPay/Kyash/etc)")}</label>
                  <input
                    type="url"
                    placeholder="https://paypay.ne.jp/qr/... や https://kyash.me/share/..."
                    value={supportLinkInput}
                    onChange={(e) => setSupportLinkInput(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-orange-50/20 border border-orange-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 font-mono transition"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleGlobalUpdateSupportLink('')}
                    disabled={supportLinkLoading}
                    className="flex-shrink-0 px-3 py-2.5 rounded-xl border border-orange-100 text-orange-400 text-xs font-bold bg-white hover:bg-red-50 hover:text-red-500 transition disabled:opacity-40 cursor-pointer"
                  >
                    {t("クリア", "Clear")}
                  </button>
                  <button
                    onClick={() => handleGlobalUpdateSupportLink(supportLinkInput)}
                    disabled={supportLinkLoading}
                    className="flex-1 py-2.5 bg-gradient-to-r from-orange-400 to-rose-400 hover:from-orange-500 hover:to-rose-500 text-white font-black text-xs rounded-xl shadow-md cursor-pointer hover:shadow-orange-100/50 transition-all border-0 disabled:opacity-50"
                  >
                    {supportLinkLoading ? t("保存中...", "Saving...") : t("設定を保存する", "Save TIP settings")}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🎁 central Sashiire (Tip/Gift) Plaza Modal */}
      <AnimatePresence>
        {showGeneralSashiireModal && user && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGeneralSashiireModal(false)}
              className="fixed inset-0 bg-orange-950/45 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.25 }}
              className="relative w-full max-w-md bg-white rounded-3xl border border-orange-100 shadow-2xl p-6 z-[1101] overflow-hidden max-h-[85vh] flex flex-col"
              id="general-sashiire-modal"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-orange-50 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎁</span>
                  <h3 className="font-black text-orange-950 text-base">{t("差し入れ（おやつ応援）広場", "Snack Gift & Tip Hub")}</h3>
                </div>
                <button
                  onClick={() => setShowGeneralSashiireModal(false)}
                  className="p-1 text-orange-700 hover:bg-orange-50 rounded-full transition cursor-pointer border-0 bg-transparent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                {/* 1. Target Tipping (Sends to currently viewed profile or selected scene author) */}
                {(() => {
                  let targetUid: string | null = null;
                  let targetName = "";
                  let targetLink = "";
                  let contextLabel = "";

                  // Priority A: Profile view
                  if (view === 'profile' && viewedProfileId && viewedProfileId !== user.uid) {
                    const p = profiles[viewedProfileId];
                    if (p) {
                      targetUid = viewedProfileId;
                      targetName = p.displayName || "地味っちユーザー";
                      targetLink = p.supportLink || "";
                      contextLabel = t("プロフィール閲覧中のユーザー", "User whose profile you are viewing");
                    }
                  }
                  // Priority B: Selected Scene author
                  else if (selectedScene && selectedScene.authorId && selectedScene.authorId !== user.uid) {
                    targetUid = selectedScene.authorId;
                    targetName = selectedScene.authorName || "地味っちユーザー";
                    const p = profiles[selectedScene.authorId];
                    targetLink = p?.supportLink || selectedScene.supportLink || "";
                    contextLabel = t("閲覧中の地味話の投稿主", "Author of the scene you are reading");
                  }

                  if (targetUid) {
                    return (
                      <div className="bg-amber-50/70 border border-amber-200/50 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-black text-[10px]">
                            {contextLabel}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-orange-950">
                            {targetName} さんにおやつを届ける
                          </h4>
                          <p className="text-[10px] text-orange-700 font-bold mt-1 leading-normal">
                            「あるある！」「共感した！」の感謝を込めて、おいしいお菓子やコーヒー代の気持ち（送金やギフト）を直接届けましょう。
                          </p>
                        </div>

                        {targetLink ? (
                          <button
                            onClick={async () => {
                              try {
                                // Increment Counter in database
                                const profileRef = doc(db, 'profiles', targetUid!);
                                await updateDoc(profileRef, {
                                  sashiireCount: increment(1)
                                });
                                
                                // Send Notification
                                const senderName = userProfile?.displayName || user.displayName || '誰か';
                                await addDoc(collection(db, 'admin_messages'), {
                                  recipientId: targetUid!,
                                  senderId: user.uid,
                                  content: `☕️ ${senderName}さんから「差し入れ（おやつ応援）」が届きました！温かい応援ありがとうございます！`,
                                  createdAt: serverTimestamp(),
                                  read: false,
                                  type: 'sashiire'
                                });

                                alert(t('差し入れ窓口へジャンプします！美味しいおやつを届けて盛り上げましょう！🎁☕️', 'Launching support URL! Send them yummy snacks and power up their creation!🎁☕️'));
                                window.open(targetLink, '_blank', 'noopener,noreferrer');
                              } catch (e) {
                                console.error(e);
                                window.open(targetLink, '_blank', 'noopener,noreferrer');
                              }
                            }}
                            className="w-full py-2.5 bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1 border-0 cursor-pointer"
                          >
                            <span>🎁 {targetName} さんに差し入れを送る</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <div className="p-3 bg-stone-50 border border-stone-200/50 rounded-xl">
                            <p className="text-[10px] text-stone-500 font-bold leading-normal">
                              ⚠️ {targetName} さんはまだおやつの受け取り用（PayPay・Kyash等）の支援URLを登録していません。
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="bg-orange-50/40 border border-orange-100/50 rounded-2xl p-4 text-center space-y-2">
                      <span className="text-2xl block animate-bounce">☕️</span>
                      <p className="text-xs text-orange-955 font-black">
                        みんなにおやつを届けよう
                      </p>
                      <p className="text-[10px] text-orange-700/90 font-bold leading-relaxed max-w-xs mx-auto">
                        地味なお話でおもしろい共感を生み出してくれた人に、美味しいコーヒーやお菓子を「差し入れ（投げ銭・電子マネー送金）」して応援できます！<br/>
                        お話の詳細画面や気になる人のプロフィールから差し入れを送ることができます。
                      </p>
                    </div>
                  );
                })()}

                {/* 2. Admin/Management support */}
                <div className="bg-orange-50/70 border border-orange-100/60 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs bg-orange-100 bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full font-black text-[10px]">
                      地味っち運営
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-orange-950 leading-snug">
                      地味っちの運営（サーバー代・管理チーム）を応援する
                    </h4>
                    <p className="text-[10px] text-orange-700 font-bold mt-1 leading-normal">
                      「このままりした居場所を作ってくれてありがとう！」という温かい気持ちを、運営に届けることができます。（仮想コーヒーや、実際の応援窓口を利用可能です）
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        alert(t('☕️ 運営チームに温かいコーヒー（仮想）を差し入れしました！「めちゃめちゃうまい！開発の元気が 100 倍にアップしました！ありがとう！✨」', 'You gave virtual coffee to the Admin team! "Tastes amazing! Our development motivation has boosted 100x! Thank you! " ✨'));
                      }}
                      className="py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-black text-[10.5px] rounded-xl transition border border-amber-200/50 cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>☕️ コーヒーを贈る (仮想)</span>
                    </button>
                    <button
                      onClick={() => {
                        alert(t('運営の差し入れ受付（のんびり応援用ページ）へジャンプします！ありがとうございます！🎁', 'Heading to App developers support page! Thank you for backing us!🎁'));
                        window.open('https://ofuse.me', '_blank', 'noopener,noreferrer');
                      }}
                      className="py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-black text-[10.5px] rounded-xl transition-all shadow-md select-none border-0 cursor-pointer"
                    >
                      <span>🎁 開発者に差し入れする</span>
                    </button>
                  </div>
                </div>

                {/* 3. Setup your own support link */}
                <div className="bg-stone-50 border border-stone-200/50 rounded-2xl p-4 space-y-2">
                  <h4 className="text-xs font-black text-stone-800 flex items-center gap-1">
                    <span>⚙️</span>
                    <span>あなた自身のおやつ（PayPay送金等）受け取り設定</span>
                  </h4>
                  <p className="text-[10px] text-stone-500 leading-relaxed font-bold">
                    あなたもPayPayの送金URL、Kyashの送金用リンク、またはOFUSEやAmazonほしい物リストを登録して、他のユーザーからおやつ（直接の投げ銭応援）を受け取ってみませんか？
                  </p>
                  <button
                    onClick={() => {
                      setShowGeneralSashiireModal(false);
                      setShowSupportLinkModal(true);
                    }}
                    className="w-full mt-1.5 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs rounded-xl transition cursor-pointer border-0"
                  >
                    おやつ（領収・送金リンク）を設定・変更する
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Login Bonus Bingo Modal */}
      <AnimatePresence>
        {showLoginBonusModal && user && activeLoginBonusBoard && (
          <LoginBonusModal
            userId={user.uid}
            activeBoard={activeLoginBonusBoard}
            claimData={userLoginBonusClaim}
            onClose={() => setShowLoginBonusModal(false)}
            onClaimSuccess={() => {
              setGachaRevision(prev => prev + 1);
            }}
          />
        )}
      </AnimatePresence>

      {/* Login Streak Reward Toast */}
      <AnimatePresence>
        {loginRewardDetails && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="fixed bottom-6 left-6 z-[999] bg-white border-2 border-amber-200/95 shadow-2xl rounded-3xl p-5 max-w-sm flex items-center gap-4 cursor-pointer select-none"
            onClick={() => setLoginRewardDetails(null)}
          >
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <div>
              <h5 className="text-xs font-black text-amber-950 uppercase tracking-widest">ログインボーナス！</h5>
              <p className="text-[10px] text-amber-800 leading-relaxed font-bold mt-1">
                {loginRewardDetails.milestone 
                  ? `🎉 連続ログイン ${loginRewardDetails.streak} 日達成！ 特別記念ボーナスを含め +${loginRewardDetails.coins} GC を獲得！`
                  : `今日も地味っちをお楽しみください！ +${loginRewardDetails.coins} GC 獲得！ （連続 ${loginRewardDetails.streak} 日目）`
                }
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Campaign Reward Toast */}
      <AnimatePresence mode="popLayout">
        {activeCampaignRewards.length > 0 && (() => {
          const currentReward = activeCampaignRewards[0];
          return (
            <motion.div 
              key={currentReward.title + "_" + currentReward.msg}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.9 }}
              className="fixed bottom-6 right-6 z-[999] bg-white border-2 border-orange-200 shadow-2xl rounded-3xl p-5 max-w-sm flex items-center gap-4 cursor-pointer select-none"
              onClick={() => setActiveCampaignRewards(prev => prev.slice(1))}
            >
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5 text-orange-600 animate-bounce" />
              </div>
              <div>
                <h5 className="text-xs font-black text-orange-950 uppercase tracking-widest">キャンペーン配布プレゼント！</h5>
                <div className="mt-1 leading-normal">
                  <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold">{currentReward.title}</span>
                  <p className="text-[10px] text-orange-900 leading-relaxed font-black mt-1">{currentReward.msg}</p>
                </div>
                <span className="text-[8px] text-orange-300 block mt-2 text-right">
                  タップして次へ ({activeCampaignRewards.length}個中の1個表示中)
                </span>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <footer className="mt-20 py-12 border-t border-orange-100 text-center">
        <p className="text-orange-200 text-sm">© 2024 Jimicchi (地味っち)</p>
      </footer>

      {/* 称号・実績のアンロックセレブレーション */}
      {user && myStats && (
        <UnlocksCelebration 
          myBadges={myStats.earnedBadges} 
          myTitles={myStats.availableTitles} 
          myPrefixes={myStats.availablePrefixes}
          mySuffixes={myStats.availableSuffixes}
          userId={user.uid}
          isProfileLoaded={!!userProfile}
          isGachaActive={showGachaModal}
        />
      )}



      {/* Target Spotlight Overlay & Guide Indicator */}
      {spotlightRect && (
        <>
          {/* Animated Glowing Ring over target (with negative coordinates safety and border offset) */}
          <div 
            className="fixed border-[4px] border-amber-500 rounded-2xl animate-pulse-glow z-[850] pointer-events-none transition-all duration-300"
            style={{
              left: Math.max(0, spotlightRect.left - 4),
              top: Math.max(0, spotlightRect.top - 4),
              width: spotlightRect.width + 8,
              height: spotlightRect.height + 8,
            }}
          />
          {/* Animated Guidance Pointer Finger */}
          <div 
            className="fixed z-[860] flex flex-col items-center pointer-events-none transition-all duration-300"
            style={{
              left: Math.max(0, spotlightRect.left + spotlightRect.width / 2 - 12),
              top: Math.max(0, spotlightRect.top - 40),
            }}
          >
            <span className="text-xl animate-bounce drop-shadow" style={{ animationDuration: '0.8s' }}>👇</span>
          </div>
        </>
      )}

      {/* 実践体験型インタラクティブチュートリアル */}
      <AnimatePresence>
        {tutorialStep !== null && tutorialStep > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[360px] bg-white border border-orange-200/80 rounded-2xl shadow-xl z-[900] overflow-hidden backdrop-blur-md flex flex-col"
          >
            {/* Tiny top progress bar */}
            {tutorialStep > 0 && tutorialStep <= 7 && (
              <div className="w-full bg-orange-100 h-0.5">
                <div 
                  className="bg-amber-500 h-0.5 transition-all duration-300" 
                  style={{ width: `${(tutorialStep / 7) * 100}%` }} 
                />
              </div>
            )}

            <div className="p-3 flex items-center justify-between gap-3 text-left">
              {/* Thumbnail / Avatar */}
              <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center text-lg select-none shrink-0 border border-orange-150 font-bold">
                {tutorialStep === 1 ? "✨" :
                 tutorialStep === 2 ? "➕" :
                 tutorialStep === 3 ? "📝" :
                 tutorialStep === 4 ? "🪙" :
                 tutorialStep === 5 ? "🎰" :
                 tutorialStep === 6 ? "👤" :
                 tutorialStep === 7 ? "🎪" : "🏆"}
              </div>

              {/* Text Area */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5 justify-between">
                  <span className="text-[9px] font-black tracking-wider text-orange-400 uppercase select-none font-display leading-none">
                    Mission {tutorialStep === 8 ? "Clear" : `${tutorialStep}/7`}
                  </span>
                  {/* Skip indicator */}
                  {tutorialStep < 8 && (
                    <button
                      onClick={() => setTutorialStep(tutorialStep + 1)}
                      className="text-[9px] font-bold text-orange-500/80 hover:text-orange-600 hover:underline cursor-pointer bg-transparent border-none p-0 outline-none active:scale-95 transition-transform"
                    >
                      {t("スキップ ➔", "Skip ➔")}
                    </button>
                  )}
                </div>
                <p className="text-[11px] font-semibold text-slate-800 leading-snug mt-0.5 select-none">
                  {tutorialStep === 1 && t("「共感（👍）」ボタンをタップして、誰かの地味な瞬間に共感してみましょう！", "Tap the Sympathy (👍) button to express relative resonance!")}
                  {tutorialStep === 2 && t("「シーンを投稿する（➕）」ボタンをタップして投稿フォームを開いてください。", "Tap the 'Post a Scene (➕)' button to launch the posting modal.")}
                  {tutorialStep === 3 && (
                    !submitTitle.trim() ? t("まずは「タイトル」をひと言で入力してみましょう！（例: コンビニの袋の音）", "Let's start by entering a short Title! (e.g. Convenience store bag crinkling)") :
                    !submitContent.trim() ? t("次に、その「詳しい内容」を書いてみましょう！", "Next, please type in the detailed context or plain moment!") :
                    t("完璧です！最後に「投稿する」ボタンをタップして投稿しましょう！", "Perfect! Now tap the 'Submit / Post' button to publish your plain moment!")
                  )}
                  {tutorialStep === 4 && t("ヘッダーかメニューの「コイン残高（🪙）」または「地味ガチャ」をタップします。", "Find and tap 'Coins (🪙)' or 'Jimi Gacha' in the header/menu.")}
                  {tutorialStep === 5 && t("ガチャ画面で「ガチャを引く / 1回引く（100GC）」をタップして回してみましょう！", "Inside Gacha, click 'Draw' / 'Single roll' (100 GC) to win titles or badges.")}
                  {tutorialStep === 6 && t("装備しましょう！「自分のアイコン（👤）」またはメニューの「マイページ」をタップします。", "Time to set it up. Open 'My Page' from the avatar or sidebar menu.")}
                  {tutorialStep === 7 && t("最後に、他のみんなが作った書籍が集う「地味ひろば（🎪）」をのぞいてみましょう！", "Almost there! Click our community collection 'Plaza (🎪)' to complete instructions.")}
                  {tutorialStep === 8 && t("素晴らしいお仕事です！すべてクリアしました！クリア報酬のコインを受け取りましょう！", "Outstanding tour completion! Tap below to claim your 500 GC Coins bonus!")}
                </p>
              </div>

              {/* Action Area / Close Panel */}
              <div className="shrink-0 flex items-center gap-1.5">
                {tutorialStep === 8 ? (
                  <button
                    id="btn-claim-tutorial-reward"
                    onClick={async () => {
                      if (user) {
                        try {
                          await awardGachaCoins(user.uid, 500, '体験チュートリアル完了特典');
                          setGachaRevision(p => p + 1);
                          const profileRef = doc(db, 'profiles', user.uid);
                          await updateDoc(profileRef, {
                            hasSeenTutorial: true
                          });
                          setUserProfile(prev => prev ? { ...prev, hasSeenTutorial: true } : null);
                        } catch (err) {
                          console.error("Giving reward failed:", err);
                        }
                      }
                      setTutorialStep(null);
                      alert(t("🎁 チュートリアルお祝いとして「500 GC コイン」を受け取りました！ガチャやマイページ装備をお楽しみください！", "🎁 500 Gacha Coins claimed! Have fun with titles!"));
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-[10px] shadow-sm cursor-pointer active:scale-95 transition-all text-center flex items-center gap-1"
                  >
                    <span>🎁 報酬GET!</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (confirm(t('チュートリアルを終了しますか？', 'Are you sure you want to end the tutorial?'))) {
                        setTutorialStep(null);
                      }
                    }}
                    className="w-6 h-6 rounded-full hover:bg-slate-100/80 active:bg-slate-200/80 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-600 text-xs font-black cursor-pointer border-0"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 投稿コピーのトースト */}
      <AnimatePresence>
        {copyToastVisible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-[#FCF9F2] border-2 border-[#EADDC4] shadow-lg rounded-2xl px-6 py-3.5 flex items-center justify-center gap-2 select-none"
          >
            <span className="text-[#845E35] text-sm">📋</span>
            <span className="text-xs font-bold text-[#5C3E21]">コピーしました</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 共通フッター */}
      <footer className="w-full bg-white dark:bg-zinc-900 border-t border-orange-100 dark:border-zinc-800/80 py-8 px-4 mt-auto shrink-0 z-10 transition-colors duration-200">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs select-none">
          <p className="text-orange-900/60 dark:text-zinc-500 font-bold text-center md:text-left leading-relaxed">
            &copy; 2026 Jimicchi (地味っち) / Poco. All Rights Reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-orange-950 dark:text-zinc-300 font-extrabold text-[11px]">
            <button 
              onClick={() => handleViewChange('terms')} 
              className="hover:text-orange-600 dark:hover:text-[#f97316] hover:underline cursor-pointer transition font-bold bg-transparent border-none py-1 px-1.5 focus:outline-none"
            >
              利用規約
            </button>
            <span className="text-orange-200 dark:text-zinc-800">|</span>
            <button 
              onClick={() => handleViewChange('privacy')} 
              className="hover:text-orange-600 dark:hover:text-[#f97316] hover:underline cursor-pointer transition font-bold bg-transparent border-none py-1 px-1.5 focus:outline-none"
            >
              プライバシーポリシー
            </button>
            <span className="text-orange-200 dark:text-zinc-800">|</span>
            <button 
              onClick={() => handleViewChange('guidelines')} 
              className="hover:text-orange-600 dark:hover:text-[#f97316] hover:underline cursor-pointer transition font-bold bg-transparent border-none py-1 px-1.5 focus:outline-none"
            >
              コミュニティガイドライン
            </button>
            <span className="text-orange-200 dark:text-zinc-800">|</span>
            <button 
              onClick={() => handleViewChange('about')} 
              className="hover:text-orange-600 dark:hover:text-[#f97316] hover:underline cursor-pointer transition font-bold bg-transparent border-none py-1 px-1.5 focus:outline-none text-orange-700 dark:text-orange-400"
            >
              {t("地味っちとは？ (紹介)", "What is Jimicchi? (Info)")}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

const SceneCard: React.FC<{ 
  scene: Scene, 
  onUpvote: () => void, 
  onClick: () => void,
  onProfileClick: (uid: string, sceneId?: string) => void,
  isUpvoted?: boolean,
  isAdmin?: boolean,
  onDelete?: () => void,
  authorProfile?: Profile,
  currentUserProfile?: Profile | null,
  onCopy?: (scene: Scene) => void,
  onViewed?: () => void,
  onToggleSticker?: (sceneId: string, stickerId: string) => void
}> = ({ scene, onUpvote, onClick, onProfileClick, isUpvoted, isAdmin, onDelete, authorProfile, currentUserProfile, onCopy, onViewed, onToggleSticker }) => {
  const { language, t } = useLanguage();
  const [showStickerSelector, setShowStickerSelector] = useState(false);
  const authorName = scene.isAnonymousPost ? t('匿名ユーザー', 'Anonymous User') : (authorProfile?.displayName || scene.authorName);
  const authorPhoto = scene.isAnonymousPost ? 'https://api.dicebear.com/7.x/bottts/svg?seed=anonymous' : (authorProfile?.photoURL || scene.authorPhoto);
  const authorTitle = scene.isAnonymousPost ? '' : (authorProfile?.selectedTitle || '');

  const equippedBadgesList = scene.isAnonymousPost ? [] : (authorProfile?.equippedBadges || [])
    .map(id => BADGES.find(b => b.id === id))
    .filter((b): b is NonNullable<typeof b> => b !== undefined);

  const views = scene.views || 0;
  const upvotes = scene.upvotes || 0;
  
  const myOffset = currentUserProfile?.excavatedScenery?.[scene.id] || 0;

  const fossilInfo = useMemo(() => {
    return calculateFossilInfo(
      scene.createdAt,
      scene.upvotes || 0,
      scene.commentCount || 0,
      scene.sashiireCount || 0,
      scene.kairanAmount || 0,
      scene.excavationsCount || 0,
      myOffset
    );
  }, [scene, myOffset]);

  const hasConfidence = scene.confidence !== undefined && scene.confidence !== null;
  const isOwnPost = auth.currentUser?.uid === scene.authorId;
  const showConfidenceSection = hasConfidence && (isOwnPost || isAdmin);
  
  const isAnalyzable = views >= 5;
  const actualRate = views > 0 ? Math.round((upvotes / views) * 100) : 0;
  const errorMargin = Math.abs((scene.confidence || 0) - actualRate);
  const isSuccess = isAnalyzable && errorMargin <= 10;

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardRef.current || !onViewed) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        onViewed();
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [onViewed]);

  return (
    <motion.div 
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="relative bg-white border-2 border-orange-100 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-orange-900/5 transition-all cursor-pointer group overflow-hidden"
      onClick={onClick}
    >
      {/* 3D Geological Fossil Overlay covering the entire Post Card Box */}
      <FossilOverlay percentage={fossilInfo.percentage} sceneId={scene.id} />

      <div className="flex items-center gap-3 mb-4">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (scene.isAnonymousPost) {
              return; // Do nothing or silently block
            }
            onProfileClick(scene.authorId, scene.id);
          }}
          disabled={scene.isAnonymousPost}
          className={cn("flex items-center gap-2 group/author", scene.isAnonymousPost ? "cursor-default" : "cursor-pointer")}
        >
          <img src={authorPhoto} alt="" className="w-6 h-6 rounded-full grayscale opacity-60 group-hover/author:grayscale-0 group-hover/author:opacity-100 transition-all" />
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold tracking-widest text-orange-300 uppercase group-hover/author:text-orange-500 transition-colors flex items-center gap-1">
              {authorName}
            </span>
          </div>
        </button>
        {scene.category && (
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border select-none transition-colors",
            scene.category === 'Work' && "bg-blue-50/70 text-blue-600 border-blue-100 group-hover:bg-blue-55 group-hover:border-blue-200",
            scene.category === 'School' && "bg-emerald-50/70 text-emerald-600 border-emerald-100 group-hover:bg-emerald-55 group-hover:border-emerald-200",
            scene.category === 'Relationship' && "bg-rose-50/70 text-rose-600 border-rose-100 group-hover:bg-rose-55 group-hover:border-rose-200",
            (scene.category === 'Everyday' || scene.category === 'everyday') && "bg-amber-50/70 text-amber-600 border-amber-100 group-hover:bg-amber-55 group-hover:border-amber-200"
          )}>
            {scene.category === 'Work' && <Briefcase className="w-2.5 h-2.5" />}
            {scene.category === 'School' && <GraduationCap className="w-2.5 h-2.5" />}
            {scene.category === 'Relationship' && <Heart className="w-2.5 h-2.5" />}
            {(scene.category === 'Everyday' || scene.category === 'everyday') && <Sparkles className="w-2.5 h-2.5 fill-amber-300 text-amber-500" />}
            <span>{t(
              scene.category === 'Work' ? '仕事' : scene.category === 'School' ? '学校' : scene.category === 'Relationship' ? '人間関係' : '日常',
              scene.category
            )}</span>
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {fossilInfo && fossilInfo.tier !== 'fresh' && (
            <span className="text-[9px] font-heavy text-stone-500 bg-stone-100 border border-stone-200/60 px-2 py-0.5 rounded-full select-none flex items-center gap-0.5" title={`この投稿は ${fossilInfo.label} (${fossilInfo.percentage}%) です`}>
              <span>{fossilInfo.emoji}</span>
              <span className="hidden sm:inline">{fossilInfo.label}</span>
              <span>{fossilInfo.percentage}%</span>
            </span>
          )}
          <span className="text-[10px] text-orange-200">
            {scene.createdAt ? formatDistanceToNow(scene.createdAt.toDate(), { addSuffix: true, locale: language === 'ja' ? ja : undefined }) : t('たった今', 'Just now')}
          </span>
        </div>
      </div>
      
      {/* 2つ名 (Title) & Badges Row */}
      {(authorTitle || equippedBadgesList.length > 0) && (
        <div className="flex items-center gap-2 mb-3.5 flex-wrap">
          {authorTitle && (
            <RarityTitle 
              title={authorTitle} 
              equippedBadges={authorProfile?.equippedBadges || []} 
              isProfileView={false} 
            />
          )}
          {equippedBadgesList.length > 0 && (
            <span className="flex items-center gap-0.5 select-none animate-in fade-in duration-200">
              {equippedBadgesList.map((badge) => (
                <BadgeDisplay 
                  key={badge.id} 
                  badge={badge} 
                  size="sm" 
                />
              ))}
            </span>
          )}
        </div>
      )}
      
      <h3 className="text-xl font-bold text-orange-950 mb-3 group-hover:text-orange-500 transition-colors line-clamp-2 leading-snug">
        <a href={`/post/${scene.id}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }} className="hover:underline">
          <FossilizedContent text={scene.title} percentage={fossilInfo.percentage} sceneId={scene.id} isTitle={true} />
        </a>
      </h3>
      
      {scene.imageUrl && (
        <div className="mb-4 rounded-2xl overflow-hidden aspect-video bg-orange-50">
          <img src={scene.imageUrl} alt={scene.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      )}

      {scene.hashtags && scene.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {scene.hashtags.map(tag => (
            <span key={tag} className="text-[10px] font-bold text-orange-400 bg-orange-50 px-2 py-1 rounded-full hover:bg-orange-100 transition-colors">
              #{tag}
            </span>
          ))}
        </div>
      )}
      
      <p className="text-orange-800/80 text-sm leading-relaxed line-clamp-3 mb-6 font-medium">
        <FossilizedContent text={scene.content} percentage={fossilInfo.percentage} sceneId={scene.id} isTitle={false} />
      </p>

      {/* Sent Stickers display */}
      {scene.stickers && Object.keys(scene.stickers).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 bg-orange-50/35 p-2 rounded-2xl border border-orange-100/50">
          {Object.entries(scene.stickers).map(([stickerId, uids]) => {
            const sticker = STICKERS.find(s => s.id === stickerId);
            if (!sticker) return null;
            const stickerName = language === 'en' ? sticker.nameEn : sticker.name;
            const uidsList = Array.isArray(uids) ? uids : [];
            const hasUserReacted = auth.currentUser ? uidsList.includes(auth.currentUser.uid) : false;
            return (
              <button
                key={stickerId}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSticker?.(scene.id, stickerId);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all active:scale-95 cursor-pointer",
                  hasUserReacted
                    ? "bg-orange-500/10 border-orange-500 text-orange-950 hover:bg-orange-500/20"
                    : "bg-white border-orange-100 text-orange-600 hover:bg-orange-50"
                )}
                title={stickerName}
              >
                <img src={sticker.url} alt={stickerName} className="w-4 h-4 object-contain inline shrink-0" referrerPolicy="no-referrer" />
                <span className="text-[10px] sm:text-xs">{stickerName}</span>
                <span className="text-[9px] sm:text-xs text-orange-400 font-extrabold">×{uidsList.length}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Confidence Goal & Relatability Ratio Gauge Container */}
      {showConfidenceSection && (
        <div className="mb-5 bg-orange-100/30 rounded-2xl p-4 border border-orange-100/50 text-xs text-orange-950 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-orange-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-orange-500 fill-orange-200 animate-pulse" />
              予想共感度: {scene.confidence}%
            </span>
            <span className="bg-orange-50 text-[10px] px-2 py-0.5 rounded-full border border-orange-100">
              閲覧数: {views}
            </span>
          </div>

          {!isAnalyzable ? (
            <div className="flex items-center justify-between text-[10px] font-bold text-orange-500 bg-orange-50 border border-orange-100 px-3 py-2 rounded-xl">
              <span>📊 データ集計中 (最低5閲覧で判定)</span>
              <span className="text-orange-600 font-black animate-pulse">あと {5 - views} 閲覧</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-orange-400">実際の共感度 (いいね/閲覧)</span>
                <span className="font-extrabold text-orange-600 font-mono">
                  {actualRate}%
                </span>
              </div>
              
              {/* Progress Gauges */}
              <div className="relative w-full h-2.5 bg-orange-100/50 rounded-full overflow-hidden border border-orange-100">
                <div 
                  className="absolute left-0 top-0 h-full bg-orange-200/60"
                  style={{ width: `${scene.confidence}%` }}
                />
                <div 
                  className={cn(
                    "absolute left-0 top-0 h-full rounded-full transition-all duration-500",
                    isSuccess 
                      ? "bg-gradient-to-r from-emerald-400 to-teal-500 shadow-sm" 
                      : "bg-orange-400"
                  )}
                  style={{ width: `${actualRate}%` }}
                />
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between pt-1">
                {isSuccess ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-sm">
                    🎯 シンクロ成功！ (誤差 {errorMargin}%以内)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-orange-500 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200/30">
                    📊 予測誤差 {errorMargin}%
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-orange-50 pt-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-orange-400">
          <div className="flex items-center gap-1.5 hover:text-orange-600 transition-colors">
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs font-bold">
              {t('コメント', 'Comments')}
              {scene.commentCount !== undefined && scene.commentCount > 0 ? ` (${scene.commentCount})` : ` (0)`}
            </span>
          </div>
          
          {/* Sticker Button */}
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowStickerSelector(!showStickerSelector);
              }}
              className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-600 transition-all active:scale-90 duration-100 cursor-pointer focus:outline-none"
            >
              <Smile className="w-4 h-4" />
              <span className="font-bold">{t('ステッカー', 'Sticker')}</span>
            </button>
            
            {showStickerSelector && (
              <div className="absolute bottom-8 left-0 z-50 animate-in fade-in zoom-in-95 duration-100" onClick={(e) => e.stopPropagation()}>
                <StickerSelector 
                  onSelect={(stickerId) => {
                    onToggleSticker?.(scene.id, stickerId);
                    setShowStickerSelector(false);
                  }}
                  onClose={() => setShowStickerSelector(false)}
                />
              </div>
            )}
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); onCopy?.(scene); }}
            className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-600 transition-all active:scale-90 duration-100 cursor-pointer focus:outline-none"
            title={t("コピー", "Copy")}
          >
            <span className="select-none">📋</span>
            <span className="font-bold">{t('コピー', 'Copy')}</span>
          </button>
          
          {isAdmin && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              className="flex items-center gap-1.5 text-red-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <button 
          id={`btn-upvote-${scene.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onUpvote();
          }}
          className={cn(
            "btn-upvote-action flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-90",
            isUpvoted 
              ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" 
              : "bg-orange-50 hover:bg-orange-100 text-orange-600"
          )}
        >
          <ThumbsUp className={cn("w-3.5 h-3.5", isUpvoted && "fill-current")} />
          <span className="text-xs font-bold">{scene.upvotes}</span>
        </button>
      </div>
    </motion.div>
  );
}

function SubmitModal({ 
  onClose, 
  user, 
  setAiLoading, 
  aiLoading, 
  onPostSuccess,
  onTitleContentChange
}: { 
  onClose: () => void, 
  user: User | null, 
  setAiLoading: (v: boolean) => void, 
  aiLoading: boolean, 
  onPostSuccess?: () => void,
  onTitleContentChange?: (title: string, content: string) => void
}) {
  const { language, t } = useLanguage();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    onTitleContentChange?.(title, content);
  }, [title, content, onTitleContentChange]);
  const [category, setCategory] = useState('Everyday');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [confidence, setConfidence] = useState(50);
  const [isAnonymousPost, setIsAnonymousPost] = useState(user?.isAnonymous || false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max 1200px width/height to keep it under 1MB even as Base64
        const MAX_SIZE = 1200;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // JPEG with 0.7 quality usually stays well under 500KB
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setImageUrl(dataUrl);
        setUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !content) return;

    try {
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      const profileData = profileSnap.data();

      const hashtags = (title + ' ' + content).match(/#[a-z0-9_]+/gi)?.map(t => t.slice(1).toLowerCase()) || [];

      await addDoc(collection(db, 'scenes'), {
        title,
        content,
        imageUrl: imageUrl || null,
        authorId: user.uid,
        authorName: isAnonymousPost ? '匿名ユーザー' : (profileData?.displayName || user.displayName || '名無しさん'),
        authorPhoto: isAnonymousPost ? 'https://api.dicebear.com/7.x/bottts/svg?seed=anonymous' : (profileData?.photoURL || user.photoURL),
        isAnonymousPost: !!isAnonymousPost,
        createdAt: serverTimestamp(),
        upvotes: 0,
        category,
        hashtags,
        confidence: Number(confidence),
        views: 0
      });
      if (!user.isAnonymous) {
        earnFromPost(user.uid);
      }

      // Query followers of current user and dispatch notifications
      try {
        const qFollowers = query(collection(db, 'follows'), where('followingId', '==', user.uid));
        const followersSnap = await getDocs(qFollowers);
        const displayName = isAnonymousPost ? '匿名ユーザー' : (profileData?.displayName || user.displayName || '名無しさん');
        
        followersSnap.forEach(async (fDoc) => {
          const followerId = fDoc.data().followerId;
          if (followerId) {
            await addDoc(collection(db, 'admin_messages'), {
              recipientId: followerId,
              senderId: user.uid,
              content: `📢 あなたのフォローしている「${displayName}」さんが新しく地味話を投稿しました! 「${title.slice(0, 20)}${title.length > 20 ? '...' : ''}」`,
              createdAt: serverTimestamp(),
              read: false,
              type: 'post'
            });
          }
        });
      } catch (fError) {
        console.error("Failed to notify followers:", fError);
      }

      // Analyze post content for JSE stock matching asynchronously
      try {
        fetch('/api/analyze-post-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content })
        })
        .then(res => res.json())
        .then(async (data) => {
          if (data && data.matchedStockId) {
            const authorDisplayName = isAnonymousPost ? '匿名ユーザー' : (profileData?.displayName || user.displayName || '名無しさん');
            await addDoc(collection(db, 'jse_reports'), {
              stockId: data.matchedStockId,
              explanation: data.explanation || `「${title}」の投稿が検知されました。`,
              postId: 'new_scene_post',
              postTitle: title,
              authorName: authorDisplayName,
              createdAt: serverTimestamp()
            });
            console.log("JSE Stock Match reported:", data.matchedStockId);
          }
        })
        .catch(err => {
          console.error("Error matching post stock alignment:", err);
        });
      } catch (analyzeErr) {
        console.error("Failed to trigger JSE analyst:", analyzeErr);
      }

      onClose();
      if (onPostSuccess) onPostSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'scenes');
    }
  };

  const generateAiIdeas = async () => {
    if (!prompt) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/generate-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      setAiSuggestions(data.scenes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-orange-950/20 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white w-full max-w-xl max-h-[90vh] rounded-[40px] shadow-2xl shadow-orange-900/20 overflow-hidden flex flex-col"
      >
        <div className="p-8 sm:p-10 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-orange-900">新しく投稿する</h2>
            <button onClick={onClose} className="p-2 hover:bg-orange-50 rounded-full transition-colors">
              <X className="w-6 h-6 text-orange-300" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-orange-300 uppercase tracking-widest mb-2">タイトル (ひと言で)</label>
              <input 
                id="tour-input-title"
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                placeholder="例: コンビニの袋の音"
                className="w-full bg-orange-50 border-none rounded-2xl p-4 text-orange-950 placeholder:text-orange-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                required
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-orange-300 uppercase tracking-widest mb-2">シーンの詳しい内容</label>
              <textarea 
                id="tour-input-content"
                value={content} 
                onChange={e => setContent(e.target.value)}
                placeholder="どんな時に「あ、わかる」と思いますか？"
                rows={4}
                className="w-full bg-orange-50 border-none rounded-2xl p-4 text-orange-1000 placeholder:text-orange-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-orange-300 uppercase tracking-widest mb-2.5">
                {t("カテゴリー", "Category")}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'Everyday', ja: '日常', en: 'Everyday', icon: Sparkles, color: 'text-amber-500 border-amber-200 bg-amber-50/10' },
                  { id: 'Work', ja: '仕事', en: 'Work', icon: Briefcase, color: 'text-blue-500 border-blue-200 bg-blue-50/10' },
                  { id: 'School', ja: '学校', en: 'School', icon: GraduationCap, color: 'text-emerald-500 border-emerald-200 bg-emerald-50/10' },
                  { id: 'Relationship', ja: '人間関係', en: 'Relationship', icon: Heart, color: 'text-rose-500 border-rose-200 bg-rose-50/10' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = category === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCategory(item.id)}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all cursor-pointer group hover:scale-[1.02] active:scale-95",
                        isSelected 
                          ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10" 
                          : "border-orange-50 bg-orange-50/10 text-orange-900/60 hover:text-orange-900"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 mb-1", isSelected ? "text-white" : item.color.split(' ')[0])} />
                      <span className="text-[11px] font-bold leading-none">{t(item.ja, item.en)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1 flex justify-between">
                <span>みんなが共感する自信：予測共感度 ({confidence}%)</span>
                <span className="text-orange-600 font-extrabold">{confidence >= 80 ? '🔥 超自信あり' : confidence >= 50 ? '👍 半分は共感するはず' : '🤔 密かなこだわり'}</span>
              </label>
              <div className="bg-orange-50 p-4 rounded-2xl space-y-3">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="5"
                  value={confidence} 
                  onChange={e => setConfidence(Number(e.target.value))}
                  className="w-full accent-orange-500 h-2 bg-orange-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-bold text-orange-300">
                  <span>0% (自分だけかも)</span>
                  <span>50% (半々)</span>
                  <span>100% (地球全員が共感)</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-orange-300 uppercase tracking-widest mb-2">画像 (任意)</label>
              <div className="space-y-4">
                {imageUrl && (
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-orange-50 border border-orange-100">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-orange-50 rounded-2xl border-2 border-dashed border-orange-100 text-orange-400 hover:bg-orange-100 transition-all group"
                  >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                    <span className="text-[10px] font-bold">写真を選択</span>
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.setAttribute('capture', 'environment');
                        fileInputRef.current.click();
                      }
                    }}
                    disabled={uploading}
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-orange-50 rounded-2xl border-2 border-dashed border-orange-100 text-orange-400 hover:bg-orange-100 transition-all group"
                  >
                    <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold">写真を撮る</span>
                  </button>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-orange-50/50 p-4 rounded-2xl border border-orange-100/50">
              <input
                type="checkbox"
                id="isAnonymousPost"
                checked={isAnonymousPost}
                disabled={!!user?.isAnonymous}
                onChange={e => setIsAnonymousPost(e.target.checked)}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-orange-200 cursor-pointer"
              />
              <label htmlFor="isAnonymousPost" className="text-xs font-bold text-orange-850 cursor-pointer select-none">
                {t("匿名ユーザーとして投稿する", "Post as Anonymous User")}
                {user?.isAnonymous && <span className="text-[10px] text-orange-400 font-medium ml-1">({t("匿名ログイン中のため必須", "Required for anonymous accounts")})</span>}
              </label>
            </div>

            <button 
              id="btn-submit-post"
              type="submit"
              className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
            >
              投稿する
            </button>
          </form>

          <div className="mt-10 border-t border-orange-50 pt-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold text-orange-400">AIにアイデアをもらう</span>
            </div>
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="テーマを入力 (例: 通勤、雨の日)" 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="flex-1 text-xs bg-white border border-orange-100 rounded-xl px-4 py-2 focus:ring-1 focus:ring-orange-500 outline-none"
              />
              <button 
                onClick={generateAiIdeas} 
                disabled={aiLoading}
                className="bg-orange-100 text-orange-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-200 transition-all disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '提案'}
              </button>
            </div>

            <div className="space-y-2">
              {aiSuggestions.map((s, i) => (
                <button 
                  key={i}
                  onClick={() => setContent(s)}
                  className="w-full text-left p-3 text-xs text-orange-800 bg-white hover:bg-orange-50 border border-orange-50 rounded-xl transition-all flex items-center justify-between group"
                >
                  <span className="line-clamp-1">{s}</span>
                  <ChevronRight className="w-3 h-3 text-orange-200 group-hover:text-orange-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DetailModal({ 
  scene, 
  onClose, 
  user, 
  onUpvote, 
  onLogin,
  isUpvoted,
  isAdmin,
  onDelete,
  onReport,
  onTagClick,
  authorProfile,
  currentUserProfile,
  profiles,
  onCopy,
  onToggleSticker,
  onToggleCommentSticker
}: { 
  scene: Scene, 
  onClose: () => void, 
  user: User | null, 
  onUpvote: () => void, 
  onLogin: () => void,
  isUpvoted?: boolean,
  isAdmin?: boolean,
  onDelete?: () => void,
  onReport?: (reason: string) => void,
  onTagClick?: (tag: string) => void,
  authorProfile?: Profile,
  currentUserProfile?: Profile | null,
  profiles?: Record<string, Profile>,
  onCopy?: (scene: Scene) => void,
  onToggleSticker?: (sceneId: string, stickerId: string) => void,
  onToggleCommentSticker?: (sceneId: string, commentId: string, stickerId: string) => void
}) {
  const { language, t } = useLanguage();
  const [liveScene, setLiveScene] = useState<Scene>(scene);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [showReportInput, setShowReportInput] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [activeCommentReactId, setActiveCommentReactId] = useState<string | null>(null);
  const [showCommentFormSticker, setShowCommentFormSticker] = useState(false);
  const [showPostStickerSelector, setShowPostStickerSelector] = useState(false);

  const [capturing, setCapturing] = useState(false);
  const screenshotRef = useRef<HTMLDivElement>(null);

  const myOffset = currentUserProfile?.excavatedScenery?.[liveScene.id] || 0;

  const fossilInfo = useMemo(() => {
    return calculateFossilInfo(
      liveScene.createdAt,
      liveScene.upvotes || 0,
      liveScene.commentCount || 0,
      liveScene.sashiireCount || 0,
      liveScene.kairanAmount || 0,
      liveScene.excavationsCount || 0,
      myOffset
    );
  }, [liveScene, myOffset]);

  useEffect(() => {
    const docRef = doc(db, 'scenes', scene.id);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setLiveScene({ id: snap.id, ...snap.data() } as Scene);
      }
    });
    return () => unsubscribe();
  }, [scene.id]);

  const handleScreenshot = async () => {
    return;
  };

  const dummyHelper = async () => {
    /*
    const html2canvas = (a: any, b: any): any => ({ toDataURL: () => '' });
    const canvas = { toDataURL: () => '' } as any; // mocked
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#FDFCFB',
        scale: 2.5,
        logging: false,
        onclone: (clonedDoc) => {
          const parseOklchAndConvert = (oklchStr: string): string => {
            const match = oklchStr.match(/oklch\(\s*([\d.%+-]+)\s+([\d.%+-]+)\s+([\d.%+-]+(?:deg|rad|grad|turn)?)(?:\s*\/\s*([\d.%+-]+))?\s*\)/i);
            if (!match) return oklchStr;
            try {
              let L = parseFloat(match[1]);
              if (match[1].endsWith('%')) L /= 100;
              let C = parseFloat(match[2]);
              if (match[2].endsWith('%')) C /= 100;
              let hVal = match[3];
              let H = parseFloat(hVal);
              if (hVal.endsWith('rad')) {
                H = H * (180 / Math.PI);
              } else if (hVal.endsWith('turn')) {
                H = H * 360;
              } else if (hVal.endsWith('grad')) {
                H = H * 0.9;
              }
              let hRad = H * Math.PI / 180;
              let AStr = match[4];
              let A = 1;
              if (AStr) {
                if (AStr.endsWith('%')) {
                  A = parseFloat(AStr) / 100;
                } else {
                  A = parseFloat(AStr);
                }
              }
              let a = C * Math.cos(hRad);
              let b = C * Math.sin(hRad);
              let l_ = L + 0.3963377774 * a + 0.2158037573 * b;
              let m_ = L - 0.1055613458 * a - 0.0638541728 * b;
              let s_ = L - 0.0894841775 * a - 1.2914855480 * b;
              let l = Math.pow(Math.max(0, l_), 3);
              let m = Math.pow(Math.max(0, m_), 3);
              let s = Math.pow(Math.max(0, s_), 3);
              let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
              let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
              let b_val = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
              const clp = (x: number) => {
                return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
              };
              let R = Math.round(Math.max(0, Math.min(1, clp(r))) * 255);
              let G = Math.round(Math.max(0, Math.min(1, clp(g))) * 255);
              let B = Math.round(Math.max(0, Math.min(1, clp(b_val))) * 255);
              return A === 1 ? `rgb(${R}, ${G}, ${B})` : `rgba(${R}, ${G}, ${B}, ${A})`;
            } catch (e) {
              return 'rgb(249, 115, 22)';
            }
          };

          const parseOklabAndConvert = (oklabStr: string): string => {
            const match = oklabStr.match(/oklab\(\s*([\d.%+-]+)\s+([\d.%+-]+)\s+([\d.%+-]+)(?:\s*\/\s*([\d.%+-]+))?\s*\)/i);
            if (!match) return oklabStr;
            try {
              let L = parseFloat(match[1]);
              if (match[1].endsWith('%')) L /= 100;
              let a = parseFloat(match[2]);
              if (match[2].endsWith('%')) a /= 100;
              let b = parseFloat(match[3]);
              if (match[3].endsWith('%')) b /= 100;
              let AStr = match[4];
              let A = 1;
              if (AStr) {
                if (AStr.endsWith('%')) {
                  A = parseFloat(AStr) / 100;
                } else {
                  A = parseFloat(AStr);
                }
              }
              let l_ = L + 0.3963377774 * a + 0.2158037573 * b;
              let m_ = L - 0.1055613458 * a - 0.0638541728 * b;
              let s_ = L - 0.0894841775 * a - 1.2914855480 * b;
              let l = Math.pow(Math.max(0, l_), 3);
              let m = Math.pow(Math.max(0, m_), 3);
              let s = Math.pow(Math.max(0, s_), 3);
              let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
              let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
              let b_val = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
              const clp = (x: number) => {
                return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
              };
              let R = Math.round(Math.max(0, Math.min(1, clp(r))) * 255);
              let G = Math.round(Math.max(0, Math.min(1, clp(g))) * 255);
              let B = Math.round(Math.max(0, Math.min(1, clp(b_val))) * 255);
              return A === 1 ? `rgb(${R}, ${G}, ${B})` : `rgba(${R}, ${G}, ${B}, ${A})`;
            } catch (e) {
              return 'rgb(249, 115, 22)';
            }
          };

          const styles = clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styles.length; i++) {
            const style = styles[i];
            let cssText = style.textContent || '';
            let modified = false;
            
            if (cssText.includes('oklch') || cssText.includes('OKLCH')) {
              cssText = cssText.replace(/oklch\([^)]+\)/gi, (match) => {
                try {
                  return parseOklchAndConvert(match);
                } catch {
                  return 'rgb(249, 115, 22)';
                }
              });
              modified = true;
            }
            
            if (cssText.includes('oklab') || cssText.includes('OKLAB')) {
              cssText = cssText.replace(/oklab\([^)]+\)/gi, (match) => {
                try {
                  return parseOklabAndConvert(match);
                } catch {
                  return 'rgb(249, 115, 22)';
                }
              });
              modified = true;
            }
            
            if (modified) {
              style.textContent = cssText;
            }
          }
        }
      });
      const dataUrl = '';
      const link = document.createElement('a');
      const safeTitle = (scene.title || 'post').replace(/[^a-zA-Z0-9ぁ-んァ-ン一-龠]/g, '_').substring(0, 20);
      link.download = `jimicchi_${safeTitle}.png`;
      link.href = dataUrl;
    } catch (err) {
      console.error('Failed to capture screenshot:', err);
    } finally {
      setCapturing(false);
    }
    */
  };

  useEffect(() => {
    const q = query(collection(db, 'scenes', scene.id, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentData: Comment[] = [];
      snapshot.forEach((doc) => {
        commentData.push({ id: doc.id, ...doc.data() } as Comment);
      });
      setComments(commentData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `scenes/${scene.id}/comments`);
    });
    return () => unsubscribe();
  }, [scene.id]);

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment) return;
    setCommentLoading(true);

    try {
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      const profileData = profileSnap.data();

      await addDoc(collection(db, 'scenes', scene.id, 'comments'), {
        sceneId: scene.id,
        authorId: user.uid,
        authorName: profileData?.displayName || user.displayName,
        authorPhoto: profileData?.photoURL || user.photoURL,
        content: newComment,
        createdAt: serverTimestamp()
      });

      // Update scene comments counter
      const sceneRef = doc(db, 'scenes', scene.id);
      await updateDoc(sceneRef, {
        commentCount: increment(1)
      });

      // Send Notification to post author (only if commenting on someone else's post)
      if (scene.authorId && scene.authorId !== user.uid) {
        await addDoc(collection(db, 'admin_messages'), {
          recipientId: scene.authorId,
          senderId: user.uid,
          content: `💬 ${profileData?.displayName || user.displayName || '誰か'}さんから新しいコメント: 「${newComment.slice(0, 30)}${newComment.length > 30 ? '...' : ''}」`,
          createdAt: serverTimestamp(),
          read: false,
          sceneId: scene.id,
          type: 'comment'
        });
      }

      setNewComment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `scenes/${scene.id}/comments`);
    } finally {
      setCommentLoading(false);
    }
  };

  const equippedBadgesList = scene.isAnonymousPost ? [] : (authorProfile?.equippedBadges || [])
    .map(id => BADGES.find(b => b.id === id))
    .filter((b): b is NonNullable<typeof b> => b !== undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-orange-950/20 backdrop-blur-sm" />
      <motion.div 
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        className="relative bg-white w-full max-w-2xl h-full max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="p-4 flex items-center justify-between border-b border-orange-50">
          <button onClick={onClose} className="p-2 hover:bg-orange-50 rounded-full transition-colors">
            <X className="w-5 h-5 text-orange-300" />
          </button>
          <span className="text-[10px] font-bold text-orange-200 tracking-widest uppercase">詳細を見る</span>
          <button 
            onClick={() => onCopy?.(scene)} 
            className="w-10 h-10 flex items-center justify-center hover:bg-orange-50 hover:text-orange-600 text-orange-400 rounded-full transition-all active:scale-90 cursor-pointer"
            title="投稿内容をコピー"
          >
            <span className="text-base select-none">📋</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-10">
          <div className="mb-10">
            <div className="relative p-6 sm:p-8 bg-white border-2 border-orange-100/40 shadow-sm rounded-[2.5rem] overflow-hidden mb-6">
              {/* 3D Geological Fossil Overlay covering the entire Detailed Post box */}
              <FossilOverlay percentage={fossilInfo.percentage} sceneId={scene.id} />

              <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-3">
                <img src={scene.isAnonymousPost ? 'https://api.dicebear.com/7.x/bottts/svg?seed=anonymous' : (authorProfile?.photoURL || scene.authorPhoto)} alt="" className="w-8 h-8 rounded-full border border-orange-100" />
                <div className="text-left">
                  <div className="text-xs font-bold text-orange-900 flex items-center gap-2 flex-wrap">
                    {scene.isAnonymousPost ? t('匿名ユーザー', 'Anonymous User') : (authorProfile?.displayName || scene.authorName)}
                    {!scene.isAnonymousPost && authorProfile?.selectedTitle && (
                      <RarityTitle 
                        title={authorProfile.selectedTitle} 
                        equippedBadges={authorProfile.equippedBadges || []} 
                        isProfileView={false} 
                      />
                    )}
                    {!scene.isAnonymousPost && equippedBadgesList.length > 0 && (
                      <span className="flex items-center gap-0.5 select-none animate-in fade-in duration-200">
                        {equippedBadgesList.map((badge) => (
                          <BadgeDisplay 
                            key={badge.id} 
                            badge={badge} 
                            size="sm" 
                          />
                        ))}
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-orange-300">
                    {scene.createdAt ? formatDistanceToNow(scene.createdAt.toDate(), { addSuffix: true, locale: language === 'ja' ? ja : undefined }) : t('たった今', 'Just now')}
                  </p>
                </div>
              </div>
              <button 
                onClick={onUpvote}
                className={cn(
                  "ml-auto flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-lg transition-all active:scale-95",
                  isUpvoted 
                    ? "bg-orange-500 text-white shadow-orange-500/20" 
                    : "bg-orange-50 text-orange-600 shadow-orange-900/5 hover:bg-orange-100"
                )}
              >
                <ThumbsUp className={cn("w-4 h-4", isUpvoted && "fill-current")} />
                <span>{scene.upvotes}</span>
              </button>
              
              <div className="flex items-center gap-1 ml-2">
                <button 
                  onClick={() => setShowReportInput(!showReportInput)}
                  className="p-2 text-orange-200 hover:text-orange-400 transition-colors"
                  title="通報する"
                >
                  <Flag className="w-4 h-4" />
                </button>
                {isAdmin && (
                  <button 
                    onClick={onDelete}
                    className="p-2 text-red-200 hover:text-red-400 transition-colors"
                    title="削除する"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {showReportInput && (
              <div className="mb-6 bg-red-50 p-4 rounded-2xl flex gap-2 animate-in fade-in slide-in-from-top-2">
                <input 
                  type="text" 
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  placeholder="通報の理由を入力してください..."
                  className="flex-1 bg-white border border-red-100 rounded-xl px-4 py-2 text-xs outline-none"
                />
                <button 
                  onClick={() => {
                    if (reportReason) {
                      onReport?.(reportReason);
                      setReportReason('');
                      setShowReportInput(false);
                    }
                  }}
                  className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold"
                >
                  送信
                </button>
              </div>
            )}

            <h2 className="text-2xl sm:text-3xl font-bold text-orange-900 mb-4 leading-tight">
              <FossilizedContent text={scene.title} percentage={fossilInfo.percentage} sceneId={scene.id} isTitle={true} />
            </h2>
            
            {scene.imageUrl && (
              <div className="mb-6 rounded-[32px] overflow-hidden bg-orange-50 border border-orange-100">
                <img src={scene.imageUrl} alt={scene.title} className="w-full h-auto" />
              </div>
            )}

            {scene.hashtags && scene.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {scene.hashtags.map(tag => (
                  <span 
                    key={tag} 
                    onClick={() => onTagClick?.(tag)}
                    className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-full text-xs font-bold transition-all hover:scale-105 cursor-pointer hover:bg-orange-500 hover:text-white"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            
            <div className="text-orange-850 leading-relaxed text-lg italic whitespace-pre-wrap py-2 border-l-4 border-orange-200/50 pl-4 bg-orange-50/15 rounded-r-2xl">
              <FossilizedContent text={liveScene.content} percentage={fossilInfo.percentage} sceneId={scene.id} isTitle={false} />
            </div>
          </div>

          {/* Interactive incremental stone-chipping station */}
          <FossilChipStation scene={liveScene} currentUserProfile={currentUserProfile} onChipped={() => {}} />

            {/* Sent Stickers display inside DetailModal for the post itself */}
            {liveScene.stickers && Object.keys(liveScene.stickers).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 bg-orange-50/30 p-2.5 rounded-2xl border border-orange-100/50">
                {Object.entries(liveScene.stickers).map(([stickerId, uids]) => {
                  const sticker = STICKERS.find(s => s.id === stickerId);
                  if (!sticker) return null;
                  const stickerName = language === 'en' ? sticker.nameEn : sticker.name;
                  const uidsList = Array.isArray(uids) ? uids : [];
                  const hasUserReacted = user ? uidsList.includes(user.uid) : false;
                  return (
                    <button
                      key={stickerId}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSticker?.(liveScene.id, stickerId);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all active:scale-95 cursor-pointer",
                        hasUserReacted
                          ? "bg-orange-500/10 border-orange-500 text-orange-950 hover:bg-orange-500/20"
                          : "bg-white border-orange-100 text-orange-600 hover:bg-orange-50"
                      )}
                      title={stickerName}
                    >
                      <img src={sticker.url} alt={stickerName} className="w-4 h-4 object-contain inline shrink-0" referrerPolicy="no-referrer" />
                      <span className="text-[10px] sm:text-xs">{stickerName}</span>
                      <span className="text-[9px] sm:text-xs text-orange-400 font-extrabold">×{uidsList.length}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              {/* Sticker addition button for the post */}
              <div className="relative">
                <button 
                  onClick={() => setShowPostStickerSelector(!showPostStickerSelector)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-2xl text-xs font-bold transition-all active:scale-90 duration-100 cursor-pointer shadow-sm border border-orange-100 focus:outline-none animate-in fade-in"
                >
                  <Smile className="w-4 h-4" />
                  <span>{t('ステッカー', 'Sticker')}</span>
                </button>
                {showPostStickerSelector && (
                  <div className="absolute right-0 bottom-10 z-50 animate-in fade-in zoom-in-95 duration-100" onClick={(e) => e.stopPropagation()}>
                    <StickerSelector 
                      onSelect={(stickerId) => {
                        onToggleSticker?.(liveScene.id, stickerId);
                        setShowPostStickerSelector(false);
                      }}
                      onClose={() => setShowPostStickerSelector(false)}
                    />
                  </div>
                )}
              </div>

              <button 
                onClick={() => onCopy?.(liveScene)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-2xl text-xs font-bold transition-all active:scale-90 duration-100 cursor-pointer shadow-sm border border-orange-100"
              >
                <span>📋</span>
                <span>{t('コピー', 'Copy')}</span>
              </button>
            </div>

            {(() => {
              const isOwnPost = user?.uid === scene.authorId;
              const showConfidenceSection = scene.confidence !== undefined && scene.confidence !== null && (isOwnPost || isAdmin);
              return showConfidenceSection && (
                <div className="mt-8 bg-orange-50/50 rounded-3xl p-6 border border-orange-100 text-sm text-orange-950 space-y-4">
                  <div className="flex items-center justify-between font-bold text-orange-400">
                    <span className="flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-4 h-4 text-orange-500 fill-orange-200 animate-pulse" />
                      このシーンの予測共感度: {scene.confidence}%
                    </span>
                    <span className="text-xs bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
                      現在の閲覧数: {scene.views || 0}
                    </span>
                  </div>

                  {(scene.views || 0) < 5 ? (
                    <div className="flex flex-col gap-2 p-4 bg-orange-50/80 border border-orange-100 rounded-2xl">
                      <div className="flex justify-between items-center text-xs font-bold text-orange-500">
                        <span>📊 データ集計中 (最低5回の閲覧で判定可能になります)</span>
                        <span className="text-orange-600 font-black animate-bounce">あと {5 - (scene.views || 0)} 閲覧</span>
                      </div>
                      <div className="w-full bg-orange-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-orange-500 h-full transition-all" style={{ width: `${((scene.views || 0) / 5) * 100}%` }} />
                      </div>
                      <p className="text-[10px] text-orange-300">
                        誰かがこの投稿の詳細を開くたびに閲覧数が＋1加算されます。
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-orange-400">{t("実際の共感度 (いいね数 / 閲覧数)", "Actual Empathy Ratio (Likes / Views)")}</span>
                        <span className="font-black text-lg text-orange-600 font-mono">
                          {Math.round((scene.upvotes / (scene.views || 1)) * 100)}%
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center justify-between pt-2">
                        {Math.abs(scene.confidence - Math.round((scene.upvotes / (scene.views || 1)) * 100)) <= 10 ? (
                          <div className="w-full flex flex-col gap-1 bg-gradient-to-r from-emerald-50 to-teal-50/50 p-4 rounded-2xl border border-emerald-200 shadow-sm text-left">
                            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-600">
                              🎯 シンクロ成功！ (誤差 {Math.abs(scene.confidence - Math.round((scene.upvotes / (scene.views || 1)) * 100))}%以内)
                            </span>
                            <p className="text-[10px] text-emerald-600/80">
                              素晴らしい人間心理への洞察力です！人々の心のツボをぴったり予測できています。実績バッジの進捗にカウントされます。
                            </p>
                          </div>
                        ) : (
                          <div className="w-full flex flex-col gap-1 bg-orange-50 p-4 rounded-2xl border border-orange-100 text-orange-600 text-left">
                            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold">
                              📊 予測誤差 {Math.abs(scene.confidence - Math.round((scene.upvotes / (scene.views || 1)) * 100))}%
                            </span>
                            <p className="text-[10px] text-orange-500/80">
                              設定した予想共感度と実際の計測データに誤差があります。誤差10%以内をクリアすることで特別なバッジがもらえます！
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-bold text-orange-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {t("共感の声", "Echoes of Empathy")} <span className="bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full text-[10px]">{comments.length}</span>
            </h3>
            
            <div className="space-y-4">
              {comments.map((comment) => {
                const commentAuthor = profiles?.[comment.authorId];
                const isCommentAnon = comment.authorName === '匿名ユーザー' || commentAuthor?.isAnonymous;
                const commentAuthorName = isCommentAnon ? t('匿名ユーザー', 'Anonymous User') : comment.authorName;
                const commentAuthorPhoto = isCommentAnon ? 'https://api.dicebear.com/7.x/bottts/svg?seed=anonymous' : comment.authorPhoto;
                const commentAuthorTitle = isCommentAnon ? '' : (commentAuthor?.selectedTitle || '');

                return (
                  <div key={comment.id} className="flex gap-3">
                    <img src={commentAuthorPhoto} alt="" className="w-6 h-6 rounded-full grayscale opacity-60 flex-shrink-0 mt-1" />
                    <div className="bg-orange-50 p-4 rounded-2xl rounded-tl-none flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 justify-start mb-2 flex-wrap text-left">
                        <div className="flex items-center justify-between flex-1 w-full sm:w-auto">
                          <span className="text-[10px] font-bold text-orange-900">{commentAuthorName}</span>
                          <span className="text-[9px] text-orange-200 sm:hidden">
                            {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: language === 'ja' ? ja : undefined }) : '...'}
                          </span>
                        </div>
                        {!isCommentAnon && commentAuthorTitle && (
                          <RarityTitle 
                            title={commentAuthorTitle} 
                            equippedBadges={commentAuthor?.equippedBadges || []} 
                            isProfileView={false} 
                          />
                        )}
                        <span className="hidden sm:inline text-[9px] text-orange-200 ml-auto">
                          {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: language === 'ja' ? ja : undefined }) : '...'}
                        </span>
                      </div>
                      <p className="text-xs text-orange-805 leading-relaxed text-left">{comment.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 bg-orange-50/50 border-t border-orange-50">
          {user ? (
            <form onSubmit={postComment} className="relative">
              <input 
                type="text" 
                placeholder={t("共感を伝えるコメントを書く...", "Write a comment of empathy...")}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                className="w-full bg-white border border-orange-100 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all pr-12"
              />
              <button 
                type="submit" 
                disabled={commentLoading || !newComment}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-orange-500 hover:text-orange-700 transition-colors disabled:opacity-30"
              >
                {commentLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          ) : (
            <button onClick={onLogin} className="w-full bg-white border-2 border-orange-100 py-4 rounded-2xl text-xs font-bold text-orange-400 hover:bg-orange-50 transition-all">
              ログインしてコメントを投稿する
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ProfileView({ 
  uid, 
  onBack, 
  onEdit, 
  isOwnProfile,
  onUpvote,
  onSceneClick,
  onProfileClick,
  isUpvoted,
  isAdmin,
  onBanUser,
  onSendMessage,
  onTransferAdmin,
  onDeleteScene,
  onFollow,
  onUnfollow,
  isFollowing,
  onStartChat,
  onTagClick,
  followerCount,
  followingCount,
  profiles,
  onOpenGacha,
  gachaRevision,
  onCopy,
  onToggleSticker
}: { 
  uid: string, 
  onBack: () => void, 
  onEdit: () => void,
  isOwnProfile: boolean,
  onUpvote: (id: string) => void,
  onSceneClick: (scene: Scene) => void,
  onProfileClick: (uid: string) => void,
  isUpvoted: (id: string) => boolean,
  isAdmin?: boolean,
  onBanUser?: (uid: string, status: boolean) => void,
  onSendMessage?: (uid: string, content: string) => void,
  onTransferAdmin?: (uid: string, status: boolean) => void,
  onDeleteScene?: (id: string) => void,
  onFollow?: (uid: string) => void,
  onUnfollow?: (uid: string) => void,
  isFollowing?: boolean,
  onStartChat?: (uid: string) => void,
  onTagClick?: (tag: string) => void,
  followerCount?: number,
  followingCount?: number,
  profiles?: Record<string, Profile>,
  onOpenGacha?: () => void,
  gachaRevision?: number,
  onCopy?: (scene: Scene) => void,
  onToggleSticker?: (sceneId: string, stickerId: string) => void
}) {
  const { language, t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgContent, setMsgContent] = useState('');
  const [showMsgInput, setShowMsgInput] = useState(false);
  const [otherAdmin, setOtherAdmin] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);

  const [activeFollowsModal, setActiveFollowsModal] = useState<'followers' | 'following' | null>(null);
  const [followsUserIds, setFollowsUserIds] = useState<string[]>([]);
  const [followsListLoading, setFollowsListLoading] = useState(false);

  // 招待コード・応援おやつ決済先管理の実装
  const [refCodeInput, setRefCodeInput] = useState('');
  const [refLoading, setRefLoading] = useState(false);
  const [supportLinkInput, setSupportLinkInput] = useState(profile?.supportLink || '');
  const [supportLinkEditing, setSupportLinkEditing] = useState(false);
  const [supportLinkLoading, setSupportLinkLoading] = useState(false);

  // Sync support link state when profile loads initially
  useEffect(() => {
    if (profile) {
      setSupportLinkInput(profile.supportLink || '');
    }
  }, [profile]);

  const handleApplyReferralCode = async () => {
    if (!refCodeInput.trim()) return;
    if (refCodeInput.trim() === uid) {
      alert(t('自分自身のユーザーIDは招待コードに登録できません。', 'You cannot enter your own User ID as a referral code.'));
      return;
    }
    setRefLoading(true);
    try {
      // 対象のお友達IDが存在するか照合
      const targetUserRef = doc(db, 'profiles', refCodeInput.trim());
      const targetSnap = await getDoc(targetUserRef);
      if (!targetSnap.exists()) {
        alert(t('指定されたお友達のユーザーIDは見つかりませんでした。入力内容を確認してください。', 'The specified User ID was not found. Please double-check.'));
        setRefLoading(false);
        return;
      }

      // 1. 自分側の更新
      const myProfileRef = doc(db, 'profiles', uid);
      await updateDoc(myProfileRef, {
        referralCodeUsed: refCodeInput.trim(),
        jCoins: increment(3000)
      });

      // 2. 相手側に届く通知メッセージ（セルフドロー式）
      await addDoc(collection(db, 'admin_messages'), {
        recipientId: refCodeInput.trim(),
        senderId: uid,
        senderName: profile?.displayName || t('お友達', 'Your friend'),
        content: `REFERRAL_BONUS_3000`,
        type: 'referral_claim',
        createdAt: serverTimestamp(),
        read: false
      });

      // 3. ローカルステート更新
      if (profile) {
        setProfile({
          ...profile,
          referralCodeUsed: refCodeInput.trim(),
          jCoins: (profile.jCoins || 0) + 3000
        });
      }

      alert(t('🎉 招待特典が適用されました！あなたに【3,000 J-Coin】がプレセントされました！お友達が次回ログインした際に、お友達にも3,000コインが届きます。', '🎉 referral_claim bonus applied! You received 【3,000 J-Coins】! Your friend will receive their 3,000 coins on their next login.'));
    } catch (err: any) {
      console.error("Referral process failed:", err);
      alert(t('登録中にエラーが発生しました: ', 'Error occured: ') + err.message);
    } finally {
      setRefLoading(false);
    }
  };

  const handleUpdateSupportLink = async () => {
    setSupportLinkLoading(true);
    try {
      const myProfileRef = doc(db, 'profiles', uid);
      await updateDoc(myProfileRef, {
        supportLink: supportLinkInput.trim() || null
      });

      if (profile) {
        setProfile({
          ...profile,
          supportLink: supportLinkInput.trim() || undefined
        });
      }
      setSupportLinkEditing(false);
      alert(t('おやつの差し入れ先を更新しました！☕️', 'Snack gifting link successfully modified!☕️'));
    } catch (err: any) {
      console.error("Failed to update supportLink:", err);
      alert(t('更新に失敗しました: ', 'Failed to update: ') + err.message);
    } finally {
      setSupportLinkLoading(false);
    }
  };

  const openFollowsModal = async (type: 'followers' | 'following') => {
    setActiveFollowsModal(type);
    setFollowsListLoading(true);
    setFollowsUserIds([]);
    try {
      const qCol = collection(db, 'follows');
      const qField = type === 'followers' ? 'followingId' : 'followerId';
      const q = query(qCol, where(qField, '==', uid));
      const snap = await getDocs(q);
      const uids: string[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        const targetId = type === 'followers' ? data.followerId : data.followingId;
        if (targetId && typeof targetId === 'string' && !uids.includes(targetId)) {
          uids.push(targetId);
        }
      });
      setFollowsUserIds(uids);
    } catch (err: any) {
      console.error("Failed to fetch follows list:", err);
    } finally {
      setFollowsListLoading(false);
    }
  };

  // 予測ゲーム実績の計算
  const stats = calculateUserStats(scenes, profile);

  // 装備中バッジの引き当て
  const equippedBadgesList = (profile?.equippedBadges || [])
    .map(badgeId => BADGES.find(b => b.id === badgeId))
    .filter((b): b is NonNullable<typeof b> => b !== undefined);

  const handleSaveBadges = async (newBadges: string[]) => {
    try {
      const userRef = doc(db, 'profiles', uid);
      await updateDoc(userRef, {
        equippedBadges: newBadges
      });
      if (profile) {
        setProfile({
          ...profile,
          equippedBadges: newBadges
        });
      }
    } catch (e) {
      console.error("Failed to save equipped badges:", e);
      throw e;
    }
  };

  const handleSaveTitle = async (newTitle: string) => {
    try {
      const userRef = doc(db, 'profiles', uid);
      await updateDoc(userRef, {
        selectedTitle: newTitle || null
      });
      if (profile) {
        setProfile({
          ...profile,
          selectedTitle: newTitle
        });
      }
    } catch (e) {
      console.error("Failed to save selected title:", e);
      throw e;
    }
  };

  const [titleUpdating, setTitleUpdating] = useState(false);

  const handleSelectTitle = async (titleName: string) => {
    if (!isOwnProfile || titleUpdating) return;
    setTitleUpdating(true);
    try {
      const userRef = doc(db, 'profiles', uid);
      await updateDoc(userRef, {
        selectedTitle: titleName || null
      });
      if (profile) {
        setProfile({
          ...profile,
          selectedTitle: titleName
        });
      }
    } catch (e) {
      console.error("Failed to update selected title:", e);
    } finally {
      setTitleUpdating(false);
    }
  };

  useEffect(() => {
    const unsubscribeProfile = onSnapshot(doc(db, 'profiles', uid), (snap) => {
      if (snap.exists()) {
        setProfile({ uid, ...snap.data() } as Profile);
      }
    }, (error) => {
      console.warn("Failed to listen to profile updates:", error);
    });

    const checkAdmin = async () => {
      const snap = await getDoc(doc(db, 'admins', uid));
      setOtherAdmin(snap.exists());
    };

    const q = query(collection(db, 'scenes'), orderBy('createdAt', 'desc'));
    const unsubscribeScenes = onSnapshot(q, (snapshot) => {
      const sceneData: Scene[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Scene;
        if (data.authorId === uid) {
          sceneData.push({ id: doc.id, ...data } as Scene);
        }
      });
      setScenes(sceneData);
      setLoading(false);
    }, (error) => {
       handleFirestoreError(error, OperationType.LIST, `profile_scenes/${uid}`);
    });

    if (isAdmin) checkAdmin();
    return () => {
      unsubscribeProfile();
      unsubscribeScenes();
    };
  }, [uid, isAdmin, gachaRevision]);

  const handleFollowClick = async () => {
    if (!onFollow || !onUnfollow) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await onUnfollow(uid);
      } else {
        await onFollow(uid);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const handleChatClick = async () => {
    if (!onStartChat) return;
    setChatLoading(true);
    try {
      await onStartChat(uid);
    } finally {
      setChatLoading(false);
    }
  };

  if (!profile && loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-orange-400 hover:text-orange-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">{t('フィードに戻る', 'Back to Feed')}</span>
        </button>
        {profile?.isBanned && (
          <span className="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-bold animate-pulse">{t('BAN中', 'Banned')}</span>
        )}
      </div>

      <div className="bg-white border-2 border-orange-100 rounded-[40px] p-8 sm:p-12 shadow-xl shadow-orange-900/5">
        <div className="flex flex-col sm:flex-row items-center gap-8 mb-8">
          <img src={profile?.photoURL} alt="" className="w-32 h-32 rounded-full border-4 border-orange-50 shadow-lg shadow-orange-900/10" />
          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h2 className="text-3xl font-bold text-orange-950 flex flex-col sm:flex-row sm:items-center gap-2">
                  <span>{profile?.displayName}</span>
                  {profile?.selectedTitle && (
                    <RarityTitle 
                      title={profile.selectedTitle} 
                      equippedBadges={profile.equippedBadges || []} 
                      isProfileView={true} 
                    />
                  )}
                </h2>
                {otherAdmin && <Shield className="w-5 h-5 text-orange-500" />}
              </div>
              <div className="flex gap-2 justify-center sm:justify-start">
                {isOwnProfile ? (
                  <div className="flex gap-2.5 flex-wrap justify-center sm:justify-start">
                    <button onClick={onEdit} className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-100 transition-all flex items-center gap-2">
                      <Edit2 className="w-3 h-3" />
                      {t('プロフ編集', 'Edit Profile')}
                    </button>
                    {!auth.currentUser?.isAnonymous && (
                      <>
                        <button 
                          onClick={() => setShowBadgeModal(true)} 
                          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-orange-500/10"
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          {t('バッジ変更', 'Change Badge')}
                        </button>
                        <button 
                          onClick={() => setShowTitleModal(true)} 
                          className="bg-orange-100 text-orange-600 border border-orange-200/50 hover:bg-orange-200 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <Bookmark className="w-3.5 h-3.5 text-orange-500" />
                          {t('2つ名変更', 'Change Title')}
                        </button>
                        {onOpenGacha && (
                          <button 
                            onClick={onOpenGacha}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/20 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <Coins className="w-3.5 h-3.5 text-amber-100" />
                            {t('地味ガチャ', 'Jimi Gacha')} 🎰
                          </button>
                        )}
                      </>
                    )}
                    {auth.currentUser?.isAnonymous && (
                      <div className="bg-orange-50/70 border border-orange-100/80 p-3.5 rounded-2xl text-[11px] font-bold text-orange-800 leading-relaxed max-w-sm mt-1 sm:mt-0 text-left">
                        <span className="block mb-0.5 text-orange-600 font-extrabold flex items-center gap-1">💡 {t('💡 地味っちアカウント（匿名）でログイン中', '💡 Logged in with Jimicchi Anonymous Account')}</span>
                        {t('ガチャを引いたり、2つ名・バッジを装備・DM機能を利用するには、一度ログアウトしGoogleアカウントで再ログインまたは本登録を行ってください。', 'To roll the gacha, equip titles/badges, or send messages, please log out and sign in with a Google account or register.')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      onClick={handleFollowClick}
                      disabled={followLoading}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50",
                        isFollowing ? "bg-orange-100 text-orange-600 hover:bg-orange-200" : "bg-orange-500 text-white hover:bg-orange-600"
                      )}
                    >
                      {followLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : isFollowing ? <UserMinus className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                      {isFollowing ? t('フォロー解除', 'Unfollow') : t('フォロー', 'Follow')}
                    </button>
                    {!(auth.currentUser?.isAnonymous || profile?.isAnonymous) && (
                      <button 
                        onClick={handleChatClick}
                        disabled={chatLoading}
                        className="bg-white border border-orange-100 text-orange-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-50 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        {chatLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        {t('メッセージ', 'Message')}
                      </button>
                    )}
                    {profile?.supportLink && (
                      <a 
                        href={profile.supportLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-rose-500/10 active:scale-95"
                        title={t('このユーザーにおやつ（電子マネーやギフト）を差し入れする', 'Gift this user some snacks (E-Money/Gift)')}
                      >
                        <span>🎁 {t('差し入れ', 'Gift')}</span>
                      </a>
                    )}
                  </div>
                )}
                {isAdmin && !isOwnProfile && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onBanUser?.(uid, !profile?.isBanned)} 
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                        profile?.isBanned ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-red-50 text-red-600 hover:bg-red-100"
                      )}
                    >
                      <Ban className="w-3 h-3" />
                      {profile?.isBanned ? t('非BAN', 'Unban') : t('BAN', 'Ban')}
                    </button>
                    {auth.currentUser?.email === 'kuailitengben@gmail.com' && (
                      <button 
                        onClick={async () => {
                          if (!onTransferAdmin) return;
                          const confirmed = window.confirm(
                            otherAdmin 
                              ? t('このユーザーの管理者権限を解除しますか？', `Are you sure you want to revoke admin permissions from ${profile?.displayName || 'this user'}?`)
                              : t('このユーザーに管理者権限を付与しますか？', `Are you sure you want to grant admin permissions to ${profile?.displayName || 'this user'}?`)
                          );
                          if (!confirmed) return;
                          
                          try {
                            const profileRef = doc(db, 'profiles', uid);
                            await updateDoc(profileRef, {
                              adminRevoked: otherAdmin ? true : false
                            });
                            await onTransferAdmin(uid, !otherAdmin);
                            setOtherAdmin(!otherAdmin);
                          } catch (err: any) {
                            alert(t('更新に失敗しました: ', 'Failed to update: ') + err.message);
                          }
                        }} 
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                          otherAdmin ? "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200" : "bg-orange-500 text-white hover:bg-orange-600"
                        )}
                      >
                        <Shield className="w-3 h-3" />
                        {otherAdmin ? t('管理者権限解除', 'Revoke Admin') : t('管理者にする', 'Make Admin')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="text-orange-800/70 text-sm leading-relaxed max-w-md whitespace-pre-wrap mb-4">{profile?.bio}</p>

            {/* 装備中のバッジ表示 */}
            {equippedBadgesList.length > 0 && (
              <div className="flex flex-wrap gap-2.5 mb-5 justify-center sm:justify-start items-center bg-orange-50/40 p-4 rounded-3xl border border-orange-100/60 max-w-md shadow-inner select-none">
                <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest mr-1 block">{t('装備中バッジ', 'Equipped Badges')}</span>
                <div className="flex gap-1.5 flex-wrap animate-in fade-in duration-200">
                  {equippedBadgesList.map((badge) => (
                    <BadgeDisplay 
                      key={badge.id} 
                      badge={badge} 
                      size="lg" 
                    />
                  ))}
                </div>
              </div>
            )}

            
            <div className="flex gap-4 mb-4 justify-center sm:justify-start">
              <button 
                onClick={() => openFollowsModal('following')}
                className="text-center sm:text-left cursor-pointer hover:bg-orange-50/70 hover:scale-[1.03] active:scale-95 transition-all px-3.5 py-2 rounded-2xl border border-orange-100/50 flex items-center gap-1.5 focus:outline-none"
              >
                <span className="text-base font-bold text-orange-950">{followingCount}</span>
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">{t('フォロー中', 'Following')}</span>
              </button>
              <button 
                onClick={() => openFollowsModal('followers')}
                className="text-center sm:text-left cursor-pointer hover:bg-orange-50/70 hover:scale-[1.03] active:scale-95 transition-all px-3.5 py-2 rounded-2xl border border-orange-100/50 flex items-center gap-1.5 focus:outline-none"
              >
                <span className="text-base font-bold text-orange-950">{followerCount}</span>
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">{t('フォロワー', 'Followers')}</span>
              </button>
            </div>
            
            {showMsgInput && (
              <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                <input 
                  type="text" 
                  value={msgContent}
                  onChange={e => setMsgContent(e.target.value)}
                  placeholder={t('管理者からのメッセージ...', 'Message from administrator...')}
                  className="flex-1 bg-orange-50 rounded-xl px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button 
                  onClick={() => {
                    if (msgContent) {
                      onSendMessage?.(uid, msgContent);
                      setMsgContent('');
                      setShowMsgInput(false);
                    }
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold"
                >
                  {t('送る', 'Send')}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-8 border-t border-orange-50 pt-8">
          <div>
            <p className="text-[10px] font-bold text-orange-300 uppercase tracking-widest mb-1">{t('投稿数', 'Posts')}</p>
            <p className="text-2xl font-bold text-orange-900">{scenes.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-orange-300 uppercase tracking-widest mb-1">{t('総獲得👍', 'Total Likes 👍')}</p>
            <p className="text-2xl font-bold text-orange-900">{scenes.reduce((acc, s) => acc + s.upvotes, 0)}</p>
          </div>
        </div>

        {/* Prediction Game Board - Badge and Title section */}
        <div className="mt-10 border-t-2 border-orange-100/50 pt-8 space-y-8">
          <div>
            <h3 className="text-sm font-bold text-orange-950 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500" />
              {t('共感予測ゲーム 実績ボード', 'Empathy Prediction Achievement Board')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-orange-50/55 p-4 rounded-2xl border border-orange-100/50 text-center">
                <span className="text-[10px] font-black text-orange-400 block uppercase tracking-widest mb-1">{t('判定数', 'Analyzed')}</span>
                <span className="text-xl font-extrabold text-orange-900 font-mono">{stats.totalAnalyzed}</span>
                <span className="text-[9px] text-orange-300 block">{t('（閲覧5回以上の投稿）', '(Posts with 5+ Views)')}</span>
              </div>
              <div className="bg-orange-50/55 p-4 rounded-2xl border border-orange-100/50 text-center">
                <span className="text-[10px] font-black text-orange-400 block uppercase tracking-widest mb-1">{t('保留中', 'Pending')}</span>
                <span className="text-xl font-extrabold text-orange-700 font-mono">{stats.totalPending}</span>
                <span className="text-[9px] text-orange-300 block">{t('（データ集計中）', '(Calculating...)')}</span>
              </div>
              <div className="bg-orange-50/55 p-4 rounded-2xl border border-orange-100/50 text-center">
                <span className="text-[10px] font-black text-orange-400 block uppercase tracking-widest mb-1">{t('予測一致', 'Matched Accuracy')}</span>
                <span className="text-xl font-extrabold text-emerald-600 font-mono flex items-center justify-center gap-1">
                  <Target className="w-4 h-4" />
                  {language === 'en' ? `${stats.totalSuccess} times` : `${stats.totalSuccess}回`}
                </span>
                <span className="text-[9px] text-emerald-600 block font-semibold">{t('誤差10%以内クリア', 'Within 10% Error')}</span>
              </div>
              <div className="bg-orange-50/55 p-4 rounded-2xl border border-orange-100/50 text-center">
                <span className="text-[10px] font-black text-orange-400 block uppercase tracking-widest mb-1">{t('最大/現在の連鎖', 'Max / Current Streak')}</span>
                <span className="text-xl font-extrabold text-orange-600 font-mono flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4" />
                  {stats.maxStreak} / {stats.currentStreak}
                </span>
                <span className="text-[9px] text-orange-300 block">{t('連続クリア記録', 'Consecutive streak')}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Promotion, Referral & Support Section (招待コード・ブログパーツ・おやつ応援) - Visible to owner */}
        {isOwnProfile && (
          <div className="mt-10 border-t-2 border-orange-100/50 pt-8 space-y-8 animate-in fade-in">
            <div>
              <h3 className="text-sm font-bold text-orange-950 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span>🚀 {t('地味っちを爆速で広めよう！ ＆ お小遣いを稼ごう！', 'Promote Jimicchi & Earn Coins!')}</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. お友達招待でお互いに3,000コイン */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 p-6 rounded-[32px] border border-orange-100/60 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black text-orange-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span>👥 {t('友達を招待してガチャを回す', 'Refer Friends')}</span>
                    </h4>
                    <p className="text-[11px] font-bold text-orange-750/90 leading-relaxed mb-4">
                      {t('あなた自身のユーザーID（招待コード）をお友達に教えましょう。お友達が登録するとお互いに3,000 J-Coinがプレゼントされます！', 'Share your User ID with friends. When they apply it, both will receive 3,000 J-Coins!')}
                    </p>
                    <div className="space-y-2.5 mb-4">
                      <div>
                        <span className="text-[9px] font-black text-orange-400 block mb-1">あなたの招待コード (UID)</span>
                        <div className="flex">
                          <input 
                            type="text" 
                            readOnly 
                            value={uid}
                            className="bg-white border border-orange-200 rounded-l-xl px-2.5 py-1.5 text-[9px] font-mono text-orange-900 flex-1 outline-none truncate"
                          />
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(uid);
                              alert(t('招待コードをコピーしました！', 'Referral code copied!'));
                            }}
                            className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-3 py-1.5 rounded-r-xl text-[9px] font-bold transition-all"
                          >
                            {t('コピー', 'Copy')}
                          </button>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          const text = encodeURIComponent(t(
                            `日々の地味〜な日常でゆるくつながる優しいSNS『地味っち』をはじめました！\n今なら招待コード【${uid}】を入力すると、アバターガチャに使える【3,000 J-Coin】がもらえます！一緒に地味あるあるしよう☕️\n#地味っち `, 
                            `I joined Jimicchi, the cozy SNS for sharing subtle daily life moments! Apply referral code 【${uid}】 to receive 【3,000 J-Coins】! `
                          ));
                          const url = encodeURIComponent(window.location.origin);
                          window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
                        }}
                        className="w-full bg-[#1DA1F2] hover:bg-[#1a91da] active:scale-95 text-white py-2 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 shadow-sm"
                      >
                        <span>🐦 {t('X(Twitter)で招待を投稿', 'Post invite on X')}</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-orange-100/60">
                    <span className="text-[9px] font-black text-orange-400 block mb-1">{t('紹介コードを入力する', 'Apply Referral Code')}</span>
                    {profile?.referralCodeUsed ? (
                      <div className="bg-orange-100/50 border border-orange-200/40 text-orange-700 rounded-xl px-3 py-2 text-[10px] font-bold truncate">
                        ✓ {t('適用済み。お友達ID:', 'Code applied. Friend ID:')} <span className="font-mono text-[9px]">{profile.referralCodeUsed}</span>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <input 
                          type="text" 
                          placeholder={t('お友達のUIDを入力...', 'Enter friend UID...')}
                          value={refCodeInput}
                          onChange={e => setRefCodeInput(e.target.value)}
                          className="bg-white border border-orange-200 rounded-xl px-2.5 py-1.5 text-[9px] font-mono text-orange-950 flex-1 outline-none"
                        />
                        <button 
                          onClick={handleApplyReferralCode}
                          disabled={refLoading || !refCodeInput.trim()}
                          className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl text-[9px] font-bold transition-all whitespace-nowrap"
                        >
                          {refLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : t('適用', 'Apply')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. ブログパーツ (ブログウィジェット) */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 p-6 rounded-[32px] border border-orange-100/60 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black text-orange-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span>🖼️ {t('ブログに貼るだけでSEO（被リンク）', 'Blog Widgets')}</span>
                    </h4>
                    <p className="text-[11px] font-bold text-orange-750/90 leading-relaxed mb-4">
                      {t('ご自身のブログ（WordPress/はてなブログ等）に「地味っち紹介ウィジェット」を貼り付けましょう。何気ない紹介が強力な被リンク（SEO）となり、Google検索エンジンにこのアプリが爆速で表示されるようになります！サーチコンソールは不要です。', 'Embed the Jimicchi Widget on your WordPress or blogging platform. It drives natural SEO backlinks allowing Googlebot to index Jimicchi instantly!')}
                    </p>
                  </div>

                  <div>
                    <span className="text-[9px] font-black text-orange-400 block mb-1">{t('書き出しiframeコード', 'Embed iframe Code')}</span>
                    <div className="flex">
                      <textarea 
                        readOnly 
                        rows={2}
                        value={`<iframe src="${window.location.origin}/?widget=1&uid=${uid}" width="100%" height="420" style="border: 2px solid #fed7aa; border-radius: 28px; max-width: 320px;" frameborder="0"></iframe>`}
                        className="bg-white border border-orange-200 rounded-l-xl px-2.5 py-1.5 text-[8.5px] font-mono text-orange-900 flex-1 outline-none resize-none"
                      />
                      <button 
                        onClick={() => {
                          const code = `<iframe src="${window.location.origin}/?widget=1&uid=${uid}" width="100%" height="420" style="border: 2px solid #fed7aa; border-radius: 28px; max-width: 320px;" frameborder="0"></iframe>`;
                          navigator.clipboard.writeText(code);
                          alert(t('ブログパーツの埋め込みコードをコピーしました！WordPress等にカスタムHTMLとして貼り付けてください。', 'Iframe code successfully copied! Paste it in WordPress custom HTML block.'));
                        }}
                        className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-3 py-1.5 rounded-r-xl text-[9px] font-bold transition-all flex flex-col justify-center items-center gap-1"
                      >
                        <span>{t('コピー', 'Copy')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. おやつの差し入れ (投げ銭リンク) の設定 */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 p-6 rounded-[32px] border border-orange-100/60 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black text-orange-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span>☕️ {t('おやつ応援（PayPayやKyash等の投げ銭リンク）', 'Setup Snack Gifts (PayPay, Kyash, etc.)')}</span>
                    </h4>
                    <p className="text-[11px] font-bold text-orange-750/90 leading-relaxed mb-4">
                      {t('銀行口座が作れなくても大丈夫！PayPayの送金受け取りURLや、Kyash（コンビニ等で本人確認すれば送金リンクで受取・交換がすぐ可能）、OFUSE、gifteeなどの受け取りURLを設定できます。設定するとプロフに可愛い差し入れボタンが付き、サポーターからおやつ（受取金・電子マネー）を直接受け取れるようになります。', 'No bank account needed! Provide your PayPay receiving link, Kyash remittance ID, OFUSE, or Amazon Gift list links. We add a cozy "Snack Gift" button so visitors can send tips/remittance directly to you.')}
                    </p>
                  </div>

                  <div>
                    <span className="text-[9px] font-black text-orange-400 block mb-1">{t('設定する決済・送金リンク(PayPay/Kyash等)', 'Tip / Snack link URL')}</span>
                    {supportLinkEditing ? (
                      <div className="space-y-1.5">
                        <input 
                          type="url" 
                          placeholder="https://paypay.ne.jp/qr/... または https://kyash.me/share/..."
                          value={supportLinkInput}
                          onChange={e => setSupportLinkInput(e.target.value)}
                          className="bg-white border border-orange-200 rounded-xl px-2.5 py-1.5 text-[9px] font-mono text-orange-950 w-full outline-none"
                        />
                        <div className="flex gap-1">
                          <button 
                            onClick={handleUpdateSupportLink}
                            disabled={supportLinkLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-[9px] font-bold transition-all flex-1"
                          >
                            {supportLinkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : t('保存', 'Save')}
                          </button>
                          <button 
                            onClick={() => { setSupportLinkInput(profile?.supportLink || ''); setSupportLinkEditing(false); }}
                            className="bg-stone-200 hover:bg-stone-300 text-stone-700 px-3 py-1.5 rounded-xl text-[9px] font-bold transition-all"
                          >
                            {t('キャンセル', 'Cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2 bg-white border border-orange-100 rounded-xl">
                        <span className="text-[8.5px] text-orange-600 font-semibold truncate flex-1 pr-2">
                          {profile?.supportLink || t('設定されていません', 'Not configured')}
                        </span>
                        <button 
                          onClick={() => setSupportLinkEditing(true)}
                          className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-2.5 py-1 rounded-lg text-[9px] font-black transition-all"
                        >
                          {t('編集', 'Edit')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-orange-900 uppercase tracking-widest">{t('投稿したシーン', 'Posted Scenes')}</h3>
        {scenes.map((scene) => (
          <SceneCard 
            key={scene.id} 
            scene={scene} 
            onUpvote={() => onUpvote(scene.id)} 
            onClick={() => onSceneClick(scene)} 
            onProfileClick={onProfileClick}
            onTagClick={onTagClick}
            isUpvoted={isUpvoted(scene.id)}
            isAdmin={isAdmin}
            onDelete={() => onDeleteScene?.(scene.id)}
            authorProfile={profiles?.[scene.authorId]}
            currentUserProfile={profile}
            onCopy={onCopy}
            onToggleSticker={onToggleSticker}
          />
        ))}
        {scenes.length === 0 && (
          <p className="text-center py-20 text-orange-200">{t('まだ投稿がありません。', 'No posts yet.')}</p>
        )}
      </div>

      <AnimatePresence>
        {showBadgeModal && profile && (
          <BadgeCustomizeModal 
            profile={profile}
            scenes={scenes}
            onClose={() => setShowBadgeModal(false)}
            onSave={handleSaveBadges}
          />
        )}
        {showTitleModal && profile && (
          <TitleCustomizeModal 
            profile={profile}
            scenes={scenes}
            onClose={() => setShowTitleModal(false)}
            onSave={handleSaveTitle}
          />
        )}
        {activeFollowsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setActiveFollowsModal(null)} 
              className="absolute inset-0 bg-orange-950/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-md max-h-[70vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border-2 border-orange-50"
            >
              <div className="p-6 border-b border-orange-50 flex items-center justify-between bg-orange-50/20">
                <h3 className="text-lg font-bold text-orange-950 flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  {activeFollowsModal === 'followers' ? t('フォロワー一覧', 'Followers') : t('フォロー中一覧', 'Following')}
                </h3>
                <button 
                  onClick={() => setActiveFollowsModal(null)} 
                  className="p-2 hover:bg-orange-50 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-orange-300" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {followsListLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
                  </div>
                ) : followsUserIds.length === 0 ? (
                  <div className="text-center py-10 text-orange-300 text-xs italic">
                    {activeFollowsModal === 'followers' ? t('フォロワーはまだいません。', 'No followers yet.') : t('フォローしているユーザーはいません。', 'Not following anyone yet.')}
                  </div>
                ) : (
                  followsUserIds.map(otherUid => {
                    const otherProfileObj = profiles?.[otherUid];
                    return (
                      <button
                        key={otherUid}
                        onClick={() => {
                          onProfileClick(otherUid);
                          setActiveFollowsModal(null);
                        }}
                        className="w-full flex items-center gap-3.5 p-3 hover:bg-orange-50/70 rounded-2xl transition-all border border-orange-50/30 text-left active:scale-[0.98]"
                      >
                        <img 
                          src={otherProfileObj?.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=fallback'} 
                          alt="" 
                          className="w-10 h-10 rounded-full border border-orange-100 object-cover bg-orange-50" 
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-orange-950 text-sm truncate flex items-center gap-1.5">
                            <span>{otherProfileObj?.displayName || t('地味っちユーザー', 'Jimicchi User')}</span>
                          </p>
                          <p className="text-xs text-orange-400/80 truncate">
                            {otherProfileObj?.bio || t('地味を楽しんでいます ☕', 'Enjoying subtlety ☕')}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-orange-200" />
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>

  );
}

function EditProfileModal({ profile, onClose, onSave }: { profile: Profile, onClose: () => void, onSave: (p: Profile) => void }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [photoURL, setPhotoURL] = useState(profile.photoURL);
  const [saving, setSaving] = useState(false);

  // States for Dicebear avatar generator
  const [avatarStyle, setAvatarStyle] = useState('fun-emoji');
  const [avatarSeed, setAvatarSeed] = useState(Math.random().toString(36).substring(7));
  const [pickerMode, setPickerMode] = useState<'dicebear' | 'custom' | 'upload'>(() => {
    if (!profile.photoURL) return 'upload';
    if (profile.photoURL.startsWith('data:')) return 'upload';
    if (profile.photoURL.includes('dicebear.com')) return 'dicebear';
    return 'custom';
  });
  const fileInputRefForProfile = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const applyDicebearAvatar = () => {
    const dicebearUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(avatarSeed)}`;
    setPhotoURL(dicebearUrl);
  };

  const handleRandomSeed = () => {
    const newSeed = Math.random().toString(36).substring(7);
    setAvatarSeed(newSeed);
    const dicebearUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(newSeed)}`;
    setPhotoURL(dicebearUrl);
  };

  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const style = e.target.value;
    setAvatarStyle(style);
    const dicebearUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(avatarSeed)}`;
    setPhotoURL(dicebearUrl);
  };

  const handleProfileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max 1000px width/height to keep the base64 URL compact and light
        const MAX_SIZE = 1000;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setPhotoURL(dataUrl);
        setUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedProfile = {
        displayName,
        bio,
        photoURL,
        updatedAt: serverTimestamp()
      };
      
      // 1. Update profile document itself (must succeed)
      const profileRef = doc(db, 'profiles', profile.uid);
      await updateDoc(profileRef, updatedProfile);
      
      // Notify parent to close modal and update UI immediately
      onSave({ ...profile, ...updatedProfile } as any);
      
      // 2. Perform denormalized updates for scenes background-safely to protect anonymous posts and handle potential query errors
      try {
        const qScenes = query(collection(db, 'scenes'), where('authorId', '==', profile.uid));
        const scenesSnap = await getDocs(qScenes);
        const sceneBatch = writeBatch(db);
        let hasSceneUpdates = false;

        scenesSnap.forEach((sceneDoc) => {
          const sceneData = sceneDoc.data();
          // Protect anonymous posts from name/photo leakage
          if (sceneData?.isAnonymousPost) return;

          sceneBatch.update(sceneDoc.ref, {
            authorName: displayName,
            authorPhoto: photoURL
          });
          hasSceneUpdates = true;
        });

        if (hasSceneUpdates) {
          await sceneBatch.commit();
        }
      } catch (sceneErr) {
        console.warn('Background update of scenes failed:', sceneErr);
      }
      
      // 3. Perform denormalized updates for comments background-safely to protect anonymous comments and handle index or rule exclusions
      try {
        const qComments = query(collectionGroup(db, 'comments'), where('authorId', '==', profile.uid));
        const commentsSnap = await getDocs(qComments);
        const commentBatch = writeBatch(db);
        let hasCommentUpdates = false;

        commentsSnap.forEach((commentDoc) => {
          const commentData = commentDoc.data();
          // Protect anonymous comments from name/photo leakage
          if (commentData?.authorName === '匿名ユーザー') return;

          commentBatch.update(commentDoc.ref, {
            authorName: displayName,
            authorPhoto: photoURL
          });
          hasCommentUpdates = true;
        });

        if (hasCommentUpdates) {
          await commentBatch.commit();
        }
      } catch (commentErr) {
        console.warn('Background update of comments failed (potentially due to lack of collection group permissions or index):', commentErr);
      }
      
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `profiles/${profile.uid}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-orange-950/20 backdrop-blur-sm" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-8 sm:p-10 overflow-y-auto max-h-[90vh] text-left"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-orange-950 flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-orange-500" />
            プロフィールの編集
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-orange-50 rounded-full transition-colors"><X className="w-5 h-5 text-orange-200" /></button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar Preview & Selection */}
          <div className="flex flex-col items-center gap-4 bg-orange-50/50 p-6 rounded-3xl border border-orange-100/50">
            <div 
              className="relative cursor-pointer group"
              onClick={() => {
                setPickerMode('upload');
                setTimeout(() => {
                  fileInputRefForProfile.current?.click();
                }, 100);
              }}
              title="タップして写真を変更"
            >
              <img 
                src={photoURL || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${profile.uid}`} 
                alt="Avatar Preview" 
                className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-white object-cover group-hover:brightness-95 transition-all"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/25 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>

            <div className="flex gap-2 w-full justify-center flex-wrap">
              <button
                type="button"
                onClick={() => setPickerMode('upload')}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all",
                  pickerMode === 'upload' 
                    ? "bg-orange-600 text-white shadow-sm" 
                    : "bg-orange-150 text-orange-600 hover:bg-orange-200"
                )}
              >
                写真アップロード 📷
              </button>
              <button
                type="button"
                onClick={() => setPickerMode('dicebear')}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all",
                  pickerMode === 'dicebear' 
                    ? "bg-orange-600 text-white shadow-sm" 
                    : "bg-orange-150 text-orange-600 hover:bg-orange-200"
                )}
              >
                アバター自動生成 🎲
              </button>
              <button
                type="button"
                onClick={() => setPickerMode('custom')}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all",
                  pickerMode === 'custom' 
                    ? "bg-orange-600 text-white shadow-sm" 
                    : "bg-orange-150 text-orange-600 hover:bg-orange-200"
                )}
              >
                カスタムURL設定 🌐
              </button>
            </div>

            {pickerMode === 'upload' && (
              <div className="w-full space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => fileInputRefForProfile.current?.click()}
                    disabled={uploading}
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-2xl border-2 border-dashed border-orange-150 text-orange-500 hover:bg-orange-100/50 transition-all group"
                  >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                    <span className="text-[10px] font-bold">写真を選択</span>
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => {
                      if (fileInputRefForProfile.current) {
                        fileInputRefForProfile.current.setAttribute('capture', 'environment');
                        fileInputRefForProfile.current.click();
                      }
                    }}
                    disabled={uploading}
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-2xl border-2 border-dashed border-orange-150 text-orange-500 hover:bg-orange-100/50 transition-all group"
                  >
                    <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold">写真を撮る</span>
                  </button>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRefForProfile}
                  onChange={handleProfileFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            )}

            {pickerMode === 'dicebear' && (
              <div className="w-full space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black text-orange-400 uppercase mb-1 ml-1 font-bold">スタイル</label>
                    <select
                      value={avatarStyle}
                      onChange={handleStyleChange}
                      className="w-full bg-white border border-orange-150 rounded-xl px-3 py-2 text-xs font-bold text-orange-950 outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      <option value="fun-emoji">ユニーク絵文字 😁</option>
                      <option value="adventurer">手書き風の冒険者 🎒</option>
                      <option value="bottts">サイバーロボット 🤖</option>
                      <option value="lorelei">手書きイラスト 🌸</option>
                      <option value="pixel-art">ドット絵アート 👾</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-orange-400 uppercase mb-1 ml-1 font-bold">シードネーム</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={avatarSeed}
                        onChange={e => {
                          setAvatarSeed(e.target.value);
                          const dicebearUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(e.target.value)}`;
                          setPhotoURL(dicebearUrl);
                        }}
                        className="w-full bg-white border border-orange-150 rounded-xl px-3 py-2 text-xs font-bold text-orange-950 outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                        placeholder="自由な文字列"
                      />
                      <button
                        type="button"
                        onClick={handleRandomSeed}
                        className="p-2 bg-orange-100 hover:bg-orange-200 text-orange-600 rounded-xl transition-all"
                        title="ランダム生成"
                      >
                        <Sparkles className="w-4 h-4 text-orange-600 animate-pulse" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {pickerMode === 'custom' && (
              <div className="w-full pt-2">
                <label className="block text-[9px] font-black text-orange-400 uppercase mb-1 ml-1 font-bold">画像URL直接指定</label>
                <input 
                  type="url" 
                  value={photoURL} 
                  onChange={e => setPhotoURL(e.target.value)}
                  className="w-full bg-white border border-orange-150 rounded-xl px-3 py-2 text-xs text-orange-950 outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                  placeholder="https://example.com/my-avatar.png"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-orange-300 uppercase tracking-widest mb-2 ml-1">お名前</label>
            <input 
              type="text" 
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-orange-50 rounded-2xl p-4 text-orange-950 font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all font-sans"
              placeholder="お名前を入力してください"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-orange-300 uppercase tracking-widest mb-2 ml-1">自己紹介（パーソナルバイオ）</label>
            <textarea 
              value={bio} 
              onChange={e => setBio(e.target.value)}
              rows={3} 
              className="w-full bg-orange-50 rounded-2xl p-4 text-orange-950 font-medium leading-relaxed outline-none focus:ring-2 focus:ring-orange-500 transition-all resize-none"
              placeholder="自己紹介を書いてみましょう。みんなと共感で繋がれます！"
            />
          </div>

          <button 
            type="submit" 
            disabled={saving}
            className="w-full bg-orange-950 text-white py-4 rounded-2xl font-black hover:bg-orange-900 transition-all flex justify-center items-center gap-2 shadow-lg hover:shadow-orange-950/10 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                変更内容を保存する
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function AdminPanel({ 
  reports, 
  onClose, 
  onDeleteScene, 
  onBanUser, 
  onCreateAnnouncement, 
  stats,
  botLogs,
  setBotLogs,
  isSimulating,
  triggerBotSimulation
}: { 
  reports: Report[], 
  onClose: () => void, 
  onDeleteScene: (id: string) => void, 
  onBanUser: (uid: string, s: boolean) => void, 
  onCreateAnnouncement: (t: string, c: string, i?: string) => void, 
  stats: { totalUsers: number, activeUsers24h: number, totalScenes: number } | null,
  botLogs: string[],
  setBotLogs: React.Dispatch<React.SetStateAction<string[]>>,
  isSimulating: boolean,
  triggerBotSimulation: (botId?: string) => Promise<void>
}) {
  const { language, t } = useLanguage();
  const [tab, setTab] = useState<'reports' | 'announcement' | 'stats' | 'campaigns' | 'admins' | 'ranking_rewards' | 'gift_codes' | 'bot_sim' | 'jse_creations'>('reports');

  // Admin Gift Code management states
  const [adminGiftCodes, setAdminGiftCodes] = useState<any[]>([]);
  const [adminNewCode, setAdminNewCode] = useState('');
  const [adminRewardGc, setAdminRewardGc] = useState(500);
  const [adminMaxUses, setAdminMaxUses] = useState(100);
  const [adminCampaignName, setAdminCampaignName] = useState('');
  const [adminTargetUid, setAdminTargetUid] = useState('');
  const [adminSelectedCodeId, setAdminSelectedCodeId] = useState<string | null>(null);
  const [adminCodeRedemptions, setAdminCodeRedemptions] = useState<any[]>([]);

  // JSE Creations state and handlers
  const [jseRequests, setJseRequests] = useState<any[]>([]);

  // Load creations
  useEffect(() => {
    if (tab !== 'jse_creations') return;
    const q = query(collection(db, 'jse_creation_requests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJseRequests(list);
    }, (err) => {
      console.error("Failed to load JSE creation requests under admin:", err);
    });
    return () => unsub();
  }, [tab]);

  const handleApproveJseRequest = async (request: any) => {
    try {
      const confirmApprove = window.confirm(`本当に「${request.stockName}」の上場を承認しますか？`);
      if (!confirmApprove) return;

      // Generate a unique stock ID from request name
      const cleanNameEn = (request.stockNameEn || request.stockName)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/__+/g, '_') || 'custom_stock_' + Date.now().toString(36);
      const stockId = `cust_${cleanNameEn}_${Math.floor(Math.random() * 1000)}`;

      // Create the custom stock entry
      const cleanKeywords = [
        request.stockName,
        request.category,
        'カスタム株'
      ].filter(Boolean);

      await setDoc(doc(db, 'jse_custom_stocks', stockId), {
        id: stockId,
        emoji: request.emoji || '📈',
        name: request.stockName,
        nameEn: request.stockNameEn || request.stockName,
        keywords: cleanKeywords,
        basePrice: 100, // Starts at 100J base price
        category: request.category || 'Other',
        descriptionJa: request.descJa || '',
        descriptionEn: request.descEn || '',
        founderId: request.founderId,
        founderName: request.founderName,
        createdAt: new Date().toISOString()
      });

      // Update request status
      await updateDoc(doc(db, 'jse_creation_requests', request.id), {
        status: 'approved',
        rejectionReason: '',
        approvedStockId: stockId
      });

      // Grant founder badge to the founder's profile (append to unlockedBadgeIds)
      const founderProfileRef = doc(db, 'profiles', request.founderId);
      const founderSnap = await getDoc(founderProfileRef);
      if (founderSnap.exists()) {
        const founderData = founderSnap.data();
        const unlockedBadgeIds = founderData.unlockedBadgeIds || [];
        const targetBadgeId = `badge_founder_${stockId}`;
        if (!unlockedBadgeIds.includes(targetBadgeId)) {
          unlockedBadgeIds.push(targetBadgeId);
          await updateDoc(founderProfileRef, { unlockedBadgeIds });
        }
      }

      // Send notification message
      await addDoc(collection(db, 'admin_messages'), {
        recipientId: request.founderId,
        senderId: 'admin_user',
        content: `🎉 祝！あなたが申請した現象株「${request.stockName}」が、運営より正式に【承認】されJSE（地味ストック取引所）に上場しました！「ゴールド創設者バッジ」がマイページに付与されました。さっそく装備して、みんなにアピールしましょう！`,
        createdAt: new Date().toISOString(),
        read: false,
        type: 'jse_approval'
      });

      alert(`🎉 現象株「${request.stockName}」が承認・上場されました！バッジとメッセージが創設者に送信されました。`);
    } catch (err: any) {
      console.error("Failed to approve JSE request:", err);
      alert('⚠️ 承認処理に失敗しました: ' + err.message);
    }
  };

  const handleRejectJseRequest = async (request: any) => {
    try {
      const reason = window.prompt(`「${request.stockName}」の上場申請を却下する理由を入力してください：`);
      if (reason === null) return; // Cancelled
      const cleanReason = reason.trim() || '不適切な表現、または実在の個人・学校・政治的発言・誹謗中傷が含まれるため却下されました。';

      // Update request status
      await updateDoc(doc(db, 'jse_creation_requests', request.id), {
        status: 'rejected',
        rejectionReason: cleanReason
      });

      // Refund spent coins to developer's profile standard coins!
      const founderProfileRef = doc(db, 'profiles', request.founderId);
      const founderSnap = await getDoc(founderProfileRef);
      if (founderSnap.exists()) {
        const founderData = founderSnap.data();
        const curCoins = founderData.coins || 0;
        await updateDoc(founderProfileRef, {
          coins: curCoins + request.coinsSpent
        });
      }

      // Send notification explanation
      await addDoc(collection(db, 'admin_messages'), {
        recipientId: request.founderId,
        senderId: 'admin_user',
        content: `⚠️ 【JSE上場却下通知】申請された現象株「${request.stockName}」は、審査ガイドラインに基づき非承認となりました。理由：${cleanReason}\n※申請時にデポジットされた経費 ${request.coinsSpent}枚 はウォレットへ全額払い戻されました。`,
        createdAt: new Date().toISOString(),
        read: false,
        type: 'jse_rejection'
      });

      alert(`⚠️ 申請を却下し、創設者に ${request.coinsSpent} コインを払い戻しました。`);
    } catch (err: any) {
      console.error("Failed to reject JSE request:", err);
      alert('⚠️ 却下処理に失敗しました: ' + err.message);
    }
  };

  // Load all gift codes
  useEffect(() => {
    if (tab !== 'gift_codes') return;
    const q = query(collection(db, 'gift_codes'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAdminGiftCodes(list);
    }, (err) => {
      console.error("Failed to load gift codes under administrator:", err);
    });
    return () => unsub();
  }, [tab]);

  // Load redemptions when a code is selected in admin panel
  useEffect(() => {
    if (tab !== 'gift_codes' || !adminSelectedCodeId) {
      setAdminCodeRedemptions([]);
      return;
    }
    const q = query(
      collection(db, 'gift_redemptions'),
      where('code', '==', adminSelectedCodeId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAdminCodeRedemptions(list);
    }, (err) => {
      console.error("Failed to load users claimed logs under admin:", err);
    });
    return () => unsub();
  }, [tab, adminSelectedCodeId]);

  const handleAdminCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const codeStr = adminNewCode.trim() 
        ? adminNewCode.trim().toUpperCase() 
        : Array.from({ length: 3 }, () => Array.from({ length: 4 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('')).join('-');

      const codeDocRef = doc(db, 'gift_codes', codeStr);
      
      const snap = await getDoc(codeDocRef);
      if (snap.exists()) {
        alert('⚠️ そのコードはすでに存在しています。別のコードを指定してください。');
        return;
      }

      await setDoc(codeDocRef, {
        code: codeStr,
        creator_uid: auth.currentUser?.uid || 'admin_user',
        creator_name: '運営 / ADMIN',
        reward_gc: adminRewardGc,
        created_at: new Date().toISOString(),
        expire_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days expiry
        max_uses: adminMaxUses,
        used_count: 0,
        active: true,
        target_uid: adminTargetUid.trim() || null,
        campaign_name: adminCampaignName.trim() || '運営イベント'
      });

      setAdminNewCode('');
      setAdminCampaignName('');
      setAdminTargetUid('');
      alert(`🎉 配布コード「${codeStr}」を発行しました！`);
    } catch (err: any) {
      console.error("Failed to create admin gift code:", err);
      alert('⚠️ 作成に失敗しました: ' + err.message);
    }
  };

  // Ranking Rewards Config states
  const [rank1Coins, setRank1Coins] = useState(1000);
  const [rank2Coins, setRank2Coins] = useState(500);
  const [rank3Coins, setRank3Coins] = useState(300);
  const [rank4to5Coins, setRank4to5Coins] = useState(100);
  const [rankRewardEndDate, setRankRewardEndDate] = useState('2026-12-31');
  const [savingRewards, setSavingRewards] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annImage, setAnnImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Admin management states
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [newAdminUid, setNewAdminUid] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');

  // Campaign management states
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campTitle, setCampTitle] = useState('');
  const [campItemType, setCampItemType] = useState<'coins' | 'shards' | 'special_title' | 'special_badge'>('coins');
  const [campItemValue, setCampItemValue] = useState('');
  const [campStartDate, setCampStartDate] = useState('');
  const [campEndDate, setCampEndDate] = useState('');
  const [campActive, setCampActive] = useState(true);

  // Login Bonus Board Form & List states
  const [loginBonusBoards, setLoginBonusBoards] = useState<any[]>([]);
  const [lbBoardName, setLbBoardName] = useState('');
  const [lbGridType, setLbGridType] = useState<'3x3' | '5x5' | 'custom'>('custom');
  const [lbDaysCount, setLbDaysCount] = useState<number>(7);
  const [lbActive, setLbActive] = useState(true);
  const [lbSelectedCellDay, setLbSelectedCellDay] = useState<number | null>(1);
  const [lbCellRewardType, setLbCellRewardType] = useState<'coins' | 'shards' | 'special_title' | 'special_badge'>('coins');
  const [lbCellRewardValue, setLbCellRewardValue] = useState('100');
  const [lbCellRewardName, setLbCellRewardName] = useState('100 Gacha Coins');
  const [lbRewardsMap, setLbRewardsMap] = useState<{ [day: number]: { rewardType: 'coins' | 'shards' | 'special_title' | 'special_badge', rewardValue: string, rewardName: string } }>({});

  // Login Bonus Exclusive Creator States
  const [lbActiveCreator, setLbActiveCreator] = useState<'none' | 'title' | 'badge'>('none');
  const [lbTitleText, setLbTitleText] = useState('');
  const [lbTitlePosition, setLbTitlePosition] = useState<'prefix' | 'suffix'>('prefix');
  const [lbTitleRarity, setLbTitleRarity] = useState<'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'>('epic');

  const [lbBadgeCreatorId, setLbBadgeCreatorId] = useState('');
  const [lbBadgeCreatorName, setLbBadgeCreatorName] = useState('');
  const [lbBadgeCreatorDesc, setLbBadgeCreatorDesc] = useState('');
  const [lbBadgeCreatorEmoji, setLbBadgeCreatorEmoji] = useState('🏆');
  const [lbBadgeCreatorTheme, setLbBadgeCreatorTheme] = useState('purple');
  const [lbBadgeCreatorRarity, setLbBadgeCreatorRarity] = useState<'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'>('epic');

  // Dynamic badge and title customization states
  const [adminCampSubTab, setAdminCampSubTab] = useState<'campaigns' | 'titles' | 'badges' | 'gachas' | 'login_bonuses'>('campaigns');
  
  // Custom Title Parts form states
  const [newTitleText, setNewTitleText] = useState('');
  const [newTitlePosition, setNewTitlePosition] = useState<'prefix' | 'suffix'>('prefix');
  const [newTitleRarity, setNewTitleRarity] = useState<any>('common');
  const [customTitleParts, setCustomTitleParts] = useState<any[]>([]);

  // Custom Badges form states
  const [newBadgeId, setNewBadgeId] = useState('');
  const [newBadgeName, setNewBadgeName] = useState('');
  const [newBadgeDesc, setNewBadgeDesc] = useState('');
  const [newBadgeIcon, setNewBadgeIcon] = useState('Award');
  const [newBadgeEmoji, setNewBadgeEmoji] = useState('🎁');
  const [newBadgeTheme, setNewBadgeTheme] = useState('gold'); // gold, green, blue, purple, crimson, slate, yellow
  const [newBadgeRarity, setNewBadgeRarity] = useState<any>('common');
  const [customBadges, setCustomBadges] = useState<any[]>([]);

  // Custom Gacha pools states
  const [gachaPools, setGachaPools] = useState<any[]>([]);
  const [newGachaName, setNewGachaName] = useState('');
  const [newGachaDesc, setNewGachaDesc] = useState('');
  const [newGachaCost1, setNewGachaCost1] = useState(100);
  const [newGachaCost10, setNewGachaCost10] = useState(900);
  const [newGachaActive, setNewGachaActive] = useState(true);

  // Custom Gacha rates
  const [rateCommon, setRateCommon] = useState(55);
  const [rateUncommon, setRateUncommon] = useState(25);
  const [rateRare, setRateRare] = useState(13);
  const [rateEpic, setRateEpic] = useState(5);
  const [rateLegendary, setRateLegendary] = useState(1.8);
  const [rateMythic, setRateMythic] = useState(0.2);

  // Custom pity configuration
  const [pity50Rarity, setPity50Rarity] = useState<'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'>('rare');
  const [pity200Rarity, setPity200Rarity] = useState<'legendary' | 'mythic'>('legendary');

  // Selected items to include in custom pool
  const [gachaSelectedItems, setGachaSelectedItems] = useState<string[]>([]);

  // In-gacha custom creation states
  const [inGachaActiveCreator, setInGachaActiveCreator] = useState<'none' | 'title' | 'badge'>('none');
  
  // In-gacha Title states
  const [igTitleText, setIgTitleText] = useState('');
  const [igTitlePosition, setIgTitlePosition] = useState<'prefix' | 'suffix'>('prefix');
  const [igTitleRarity, setIgTitleRarity] = useState<any>('common');

  // In-gacha Badge states
  const [igBadgeId, setIgBadgeId] = useState('');
  const [igBadgeName, setIgBadgeName] = useState('');
  const [igBadgeDesc, setIgBadgeDesc] = useState('');
  const [igBadgeEmoji, setIgBadgeEmoji] = useState('🌟');
  const [igBadgeIcon, setIgBadgeIcon] = useState('Award');
  const [igBadgeTheme, setIgBadgeTheme] = useState('gold');
  const [igBadgeRarity, setIgBadgeRarity] = useState<any>('epic');

  // Load campaigns, titles, badges, custom gacha pools and login bonuses
  useEffect(() => {
    if (tab !== 'campaigns') return;
    const q = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCampaigns(list);
    });

    const unsubTitles = onSnapshot(collection(db, 'customTitleParts'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomTitleParts(list);
    });

    const unsubBadges = onSnapshot(collection(db, 'customBadges'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomBadges(list);
    });

    const unsubGachas = onSnapshot(collection(db, 'gacha_pools'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGachaPools(list);
    });

    const unsubLoginBonuses = onSnapshot(collection(db, 'login_bonuses'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLoginBonusBoards(list);
    });

    return () => {
      unsubscribe();
      unsubTitles();
      unsubBadges();
      unsubGachas();
      unsubLoginBonuses();
    };
  }, [tab]);

  // Handle auto-population and preservation of login bonus grid on lbDaysCount change
  useEffect(() => {
    setLbRewardsMap(prev => {
      const updated = { ...prev };
      // Delete extra days beyond new daysCount
      Object.keys(updated).forEach(dayKey => {
        const dNum = Number(dayKey);
        if (dNum > lbDaysCount) {
          delete updated[dNum];
        }
      });
      // Add missing days
      for (let day = 1; day <= lbDaysCount; day++) {
        if (!updated[day]) {
          if (day === lbDaysCount) {
            updated[day] = { rewardType: 'coins', rewardValue: '2000', rewardName: 'コンプリート大ボーナス!' };
          } else if (day === Math.floor(lbDaysCount / 2) + 1) {
            updated[day] = { rewardType: 'coins', rewardValue: '500', rewardName: `🪙 500 Gacha Coins (中間ボーナス!)` };
          } else {
            updated[day] = { rewardType: 'coins', rewardValue: '100', rewardName: `🪙 ${day * 100} Gacha Coins` };
          }
        }
      }
      return updated;
    });
    setLbSelectedCellDay(1);
    
    // Safety populate active form settings
    setLbCellRewardType('coins');
    setLbCellRewardValue('100');
    setLbCellRewardName('100 Gacha Coins');
  }, [lbDaysCount]);

  // Load ranking rewards configuration when tab is active
  useEffect(() => {
    if (tab !== 'ranking_rewards') return;
    const fetchRankingRewardsSetting = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'rankingRewards'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.rank1Coins !== undefined) setRank1Coins(Number(data.rank1Coins));
          if (data.rank2Coins !== undefined) setRank2Coins(Number(data.rank2Coins));
          if (data.rank3Coins !== undefined) setRank3Coins(Number(data.rank3Coins));
          if (data.rank4to5Coins !== undefined) setRank4to5Coins(Number(data.rank4to5Coins));
          if (data.endDate !== undefined) setRankRewardEndDate(String(data.endDate));
        }
      } catch (err) {
        console.error("Failed to fetch ranking rewards config in administrator panel:", err);
      }
    };
    fetchRankingRewardsSetting();
  }, [tab]);

  // Save ranking rewards setting
  const handleSaveRankingRewards = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRewards(true);
    try {
      await setDoc(doc(db, 'settings', 'rankingRewards'), {
        rank1Coins: Number(rank1Coins),
        rank2Coins: Number(rank2Coins),
        rank3Coins: Number(rank3Coins),
        rank4to5Coins: Number(rank4to5Coins),
        endDate: rankRewardEndDate
      });
      alert('ランキング報酬設定を保存しました！');
    } catch (err: any) {
      alert('設定の保存に失敗しました: ' + err.message);
    } finally {
      setSavingRewards(false);
    }
  };

  // Load admins list
  useEffect(() => {
    if (tab !== 'admins') return;
    const q = query(collection(db, 'admins'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAdminsList(list);
    });
    return () => unsubscribe();
  }, [tab]);

  // Add Admin Handler
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUid || !newAdminEmail || !newAdminName) return;
    try {
      const uidClean = newAdminUid.trim();
      const emailClean = newAdminEmail.trim();
      const nameClean = newAdminName.trim();
      
      // Update profile to mark adminRevoked: false
      const profileRef = doc(db, 'profiles', uidClean);
      try {
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          await updateDoc(profileRef, {
            adminRevoked: false
          });
        }
      } catch (profileErr) {
        console.warn("Could not update profile (user might not have logged in first):", profileErr);
      }

      await setDoc(doc(db, 'admins', uidClean), {
        email: emailClean,
        name: nameClean
      });

      setNewAdminUid('');
      setNewAdminEmail('');
      setNewAdminName('');
      alert('管理者を登録、または権限を付与しました！');
    } catch (err: any) {
      alert('登録に失敗しました: ' + err.message);
    }
  };

  // Remove Admin Handler
  const handleRemoveAdmin = async (adminId: string, adminEmail: string, adminName: string) => {
    if (adminEmail === 'kuailitengben@gmail.com') {
      alert('メイン管理者の権限は解除できません。');
      return;
    }
    const confirmed = window.confirm(`管理者「${adminName} (${adminEmail})」の権限を解除してもよろしいですか？`);
    if (!confirmed) return;
    try {
      // Mark administrative revocation in profiles
      const profileRef = doc(db, 'profiles', adminId);
      try {
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          await updateDoc(profileRef, {
            adminRevoked: true
          });
        }
      } catch (profileErr) {
        console.warn("Could not update profile dynamic status:", profileErr);
      }
      
      await deleteDoc(doc(db, 'admins', adminId));
      alert('管理者の権限を解除しました。');
    } catch (err: any) {
      alert('解除に失敗しました: ' + err.message);
    }
  };

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campTitle || !campItemValue || !campStartDate || !campEndDate) return;
    
    // Check Gacha & Login Bonus exclusivity restrictions
    if (campItemType === 'special_title') {
      const parts = customTitleParts.find(t => t.id === campItemValue);
      if (parts && parts.isGachaExclusive === true) {
        alert('この2つ名パーツはガチャ限定(Gacha Exclusive)に指定されているため、通常イベント・キャンペーン報酬に設定できません！');
        return;
      }
      if (parts && parts.isLoginBonusExclusive === true) {
        alert('この2つ名パーツはログインボーナス限定(Login Bonus Exclusive)に指定されているため、通常イベント・キャンペーン報酬に設定できません！');
        return;
      }
    } else if (campItemType === 'special_badge') {
      const b = customBadges.find(badge => badge.id === campItemValue);
      if (b && b.isGachaExclusive === true) {
        alert('このバッジはガチャ限定(Gacha Exclusive)に指定されているため、通常イベント・キャンペーン報酬に設定できません！');
        return;
      }
      if (b && b.isLoginBonusExclusive === true) {
        alert('このバッジはログインボーナス限定(Login Bonus Exclusive)に指定されているため、通常イベント・キャンペーン報酬に設定できません！');
        return;
      }
    }

    try {
      await addDoc(collection(db, 'campaigns'), {
        title: campTitle,
        itemType: campItemType,
        itemValue: campItemValue,
        startDate: campStartDate,
        endDate: campEndDate,
        active: campActive,
        createdAt: serverTimestamp()
      });
      // Clear inputs
      setCampTitle('');
      setCampItemValue('');
      setCampStartDate('');
      setCampEndDate('');
      setCampActive(true);
    } catch (err: any) {
      alert('キャンペーンの作成に失敗しました: ' + err.message);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm('このキャンペーンを削除してもよろしいですか？')) return;
    try {
      await deleteDoc(doc(db, 'campaigns', id));
    } catch (err: any) {
      alert('キャンペーンの削除に失敗しました: ' + err.message);
    }
  };

  const handleAddCustomTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleText) return;
    const cleanText = newTitleText.trim();
    const generatedId = `custom_t_${newTitlePosition}_${Date.now()}`;
    try {
      await setDoc(doc(db, 'customTitleParts', generatedId), {
        text: cleanText,
        position: newTitlePosition,
        rarity: newTitleRarity,
        conditionText: 'キャンペーン配布限定',
        createdAt: serverTimestamp()
      });
      setNewTitleText('');
      alert('限定2つ名パーツを作成しました！');
    } catch (err: any) {
      alert('作成に失敗しました: ' + err.message);
    }
  };

  const handleDeleteCustomTitle = async (id: string, text: string) => {
    if (!window.confirm(`「${text}」を削除してもよろしいですか？`)) return;
    try {
      await deleteDoc(doc(db, 'customTitleParts', id));
    } catch (err: any) {
      alert('削除に失敗しました: ' + err.message);
    }
  };

  const handleAddCustomBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBadgeId || !newBadgeName) return;
    const cleanId = newBadgeId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanId) {
      alert('無効なバッジIDです。小文字英語・数字・アンダースコアのみ使用可能です。');
      return;
    }
    
    // Convert theme preset to custom styles
    let color = 'text-amber-600';
    let bgColor = 'bg-amber-50';
    let borderColor = 'border-amber-200';
    if (newBadgeTheme === 'green') {
      color = 'text-emerald-600';
      bgColor = 'bg-emerald-50';
      borderColor = 'border-emerald-200';
    } else if (newBadgeTheme === 'blue') {
      color = 'text-sky-600';
      bgColor = 'bg-sky-50';
      borderColor = 'border-sky-200';
    } else if (newBadgeTheme === 'purple') {
      color = 'text-purple-600';
      bgColor = 'bg-purple-50';
      borderColor = 'border-purple-200';
    } else if (newBadgeTheme === 'crimson') {
      color = 'text-rose-600';
      bgColor = 'bg-rose-50';
      borderColor = 'border-rose-200';
    } else if (newBadgeTheme === 'slate') {
      color = 'text-slate-800';
      bgColor = 'bg-slate-100/60';
      borderColor = 'border-slate-250';
    } else if (newBadgeTheme === 'yellow') {
      color = 'text-yellow-600';
      bgColor = 'bg-yellow-50';
      borderColor = 'border-yellow-250';
    }

    try {
      await setDoc(doc(db, 'customBadges', `badge_${cleanId}`), {
        name: newBadgeName.trim(),
        description: newBadgeDesc.trim() || 'キャンペーン配布限定バッジ',
        iconName: newBadgeIcon,
        emoji: newBadgeEmoji,
        color,
        bgColor,
        borderColor,
        rarity: newBadgeRarity,
        themePreset: newBadgeTheme,
        conditionText: 'キャンペーン限定バッジ',
        createdAt: serverTimestamp()
      });
      setNewBadgeId('');
      setNewBadgeName('');
      setNewBadgeDesc('');
      alert('限定バッジを作成しました！');
    } catch (err: any) {
      alert('作成に失敗しました: ' + err.message);
    }
  };

  const handleDeleteCustomBadge = async (id: string, name: string) => {
    if (!window.confirm(`バッジ「${name}」を削除してもよろしいですか？`)) return;
    try {
      await deleteDoc(doc(db, 'customBadges', id));
    } catch (err: any) {
      alert('削除に失敗しました: ' + err.message);
    }
  };

  const handleAddGachaPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGachaName) return;
    const generatedId = `g_pool_${Date.now()}`;
    try {
      await setDoc(doc(db, 'gacha_pools', generatedId), {
        name: newGachaName.trim(),
        description: newGachaDesc.trim(),
        cost1: Number(newGachaCost1),
        cost10: Number(newGachaCost10),
        active: newGachaActive,
        rates: {
          common: Number(rateCommon),
          uncommon: Number(rateUncommon),
          rare: Number(rateRare),
          epic: Number(rateEpic),
          legendary: Number(rateLegendary),
          mythic: Number(rateMythic)
        },
        pityLimit50: pity50Rarity,
        pityLimit200: pity200Rarity,
        selectedItemIds: gachaSelectedItems,
        createdAt: serverTimestamp()
      });
      setNewGachaName('');
      setNewGachaDesc('');
      setNewGachaCost1(100);
      setNewGachaCost10(900);
      setGachaSelectedItems([]);
      alert('限定ガチャプールを作成しました！');
    } catch (err: any) {
      alert('ガチャプールの作成に失敗しました: ' + err.message);
    }
  };

  const handleDeleteGachaPool = async (id: string, name: string) => {
    if (!window.confirm(`ガチャプール「${name}」を削除してもよろしいですか？`)) return;
    try {
      await deleteDoc(doc(db, 'gacha_pools', id));
    } catch (err: any) {
      alert('削除に失敗しました: ' + err.message);
    }
  };

  const handleToggleGachaPoolActive = async (id: string, currentStatus: boolean) => {
    try {
      await setDoc(doc(db, 'gacha_pools', id), { active: !currentStatus }, { merge: true });
    } catch (err: any) {
      alert('切替に失敗しました: ' + err.message);
    }
  };

  const handleUpdateSelectedCell = (field: 'rewardType' | 'rewardValue' | 'rewardName', val: any) => {
    if (lbSelectedCellDay === null) return;
    setLbRewardsMap(prev => {
      const updatedCell = {
        ...prev[lbSelectedCellDay],
        [field]: val
      };
      
      if (field === 'rewardType') {
        updatedCell.rewardType = val;
        if (val === 'coins') {
          updatedCell.rewardValue = '100';
          updatedCell.rewardName = '100 Gacha Coins';
        } else if (val === 'shards') {
          updatedCell.rewardValue = '10';
          updatedCell.rewardName = '欠片 10個';
        } else if (val === 'special_title') {
          updatedCell.rewardValue = '';
          updatedCell.rewardName = '限定2つ名パーツ';
        } else if (val === 'special_badge') {
          updatedCell.rewardValue = '';
          updatedCell.rewardName = '限定バッジ';
        }
      }
      if (field === 'rewardValue') {
        updatedCell.rewardValue = val;
        if (updatedCell.rewardType === 'coins') {
          updatedCell.rewardName = `${val} Gacha Coins`;
        } else if (updatedCell.rewardType === 'shards') {
          updatedCell.rewardName = `欠片 ${val}個`;
        }
      }
      
      if (field === 'rewardType') setLbCellRewardType(updatedCell.rewardType);
      if (field === 'rewardValue') setLbCellRewardValue(updatedCell.rewardValue);
      if (field === 'rewardName') setLbCellRewardName(updatedCell.rewardName);

      return {
        ...prev,
        [lbSelectedCellDay]: updatedCell
      };
    });
  };

  const handleCreateLoginBonusBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lbBoardName.trim()) return;
    
    try {
      const daysCount = lbDaysCount;
      const rewardsArray = [];
      for (let day = 1; day <= daysCount; day++) {
        const cell = lbRewardsMap[day];
        if (!cell || !cell.rewardValue || !cell.rewardValue.trim()) {
          alert(`Day ${day} の報酬設定が未完了、もしくは値が空欄です！`);
          return;
        }
        rewardsArray.push({
          day,
          rewardType: cell.rewardType,
          rewardValue: cell.rewardValue.trim(),
          rewardName: cell.rewardName.trim()
        });
      }

      if (lbActive) {
        const activeBoardsQuery = query(collection(db, 'login_bonuses'), where('active', '==', true));
        const activeBoardsSnap = await getDocs(activeBoardsQuery);
        for (const docSnap of activeBoardsSnap.docs) {
          await setDoc(docSnap.ref, { active: false }, { merge: true });
        }
      }

      await addDoc(collection(db, 'login_bonuses'), {
        name: lbBoardName.trim(),
        gridType: 'custom',
        daysCount,
        active: lbActive,
        rewards: rewardsArray,
        createdAt: serverTimestamp()
      });

      setLbBoardName('');
      alert('新しいログインボーナスボードを作成しました！');
    } catch (err: any) {
      alert('作成に失敗しました: ' + err.message);
    }
  };

  const handleLbAddTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lbTitleText.trim()) return;
    const cleanText = lbTitleText.trim();
    const generatedId = `custom_t_${lbTitlePosition}_lb_${Date.now()}`;
    try {
      await setDoc(doc(db, 'customTitleParts', generatedId), {
        text: cleanText,
        position: lbTitlePosition,
        rarity: lbTitleRarity,
        conditionText: 'ログインボーナス報酬限定',
        isLoginBonusExclusive: true,
        createdAt: serverTimestamp()
      });
      setLbTitleText('');
      setLbActiveCreator('none');
      alert(`ログインボーナス限定2つ名パーツ「${cleanText}」を作成しました！`);
    } catch (err: any) {
      alert('作成に失敗しました: ' + err.message);
    }
  };

  const handleLbAddBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lbBadgeCreatorId.trim() || !lbBadgeCreatorName.trim()) return;
    const cleanId = lbBadgeCreatorId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanId) {
      alert('無効なバッジIDです。小文字英語・数字・アンダースコアのみ使用可能です。');
      return;
    }
    const fullBadgeId = `badge_lb_${cleanId}`;

    // Convert theme preset to custom styles
    let color = 'text-amber-600';
    let bgColor = 'bg-amber-50';
    let borderColor = 'border-amber-200';
    if (lbBadgeCreatorTheme === 'green') {
      color = 'text-emerald-600';
      bgColor = 'bg-emerald-50';
      borderColor = 'border-emerald-200';
    } else if (lbBadgeCreatorTheme === 'blue') {
      color = 'text-sky-600';
      bgColor = 'bg-sky-50';
      borderColor = 'border-sky-200';
    } else if (lbBadgeCreatorTheme === 'purple') {
      color = 'text-purple-600';
      bgColor = 'bg-purple-50';
      borderColor = 'border-purple-200';
    } else if (lbBadgeCreatorTheme === 'crimson') {
      color = 'text-rose-600';
      bgColor = 'bg-rose-50';
      borderColor = 'border-rose-200';
    } else if (lbBadgeCreatorTheme === 'slate') {
      color = 'text-slate-800';
      bgColor = 'bg-slate-100/60';
      borderColor = 'border-slate-250';
    } else if (lbBadgeCreatorTheme === 'yellow') {
      color = 'text-yellow-600';
      bgColor = 'bg-yellow-50';
      borderColor = 'border-yellow-250';
    }

    try {
      await setDoc(doc(db, 'customBadges', fullBadgeId), {
        name: lbBadgeCreatorName.trim(),
        description: lbBadgeCreatorDesc.trim() || 'ログインボーナスコンプリート配布限定バッジ',
        emoji: lbBadgeCreatorEmoji,
        color,
        bgColor,
        borderColor,
        rarity: lbBadgeCreatorRarity,
        themePreset: lbBadgeCreatorTheme,
        conditionText: 'ログインボーナス限定バッジ',
        isLoginBonusExclusive: true,
        createdAt: serverTimestamp()
      });
      setLbBadgeCreatorId('');
      setLbBadgeCreatorName('');
      setLbBadgeCreatorDesc('');
      setLbActiveCreator('none');
      alert(`ログインボーナス限定バッジ「${lbBadgeCreatorName.trim()}」を作成しました！`);
    } catch (err: any) {
      alert('作成に失敗しました: ' + err.message);
    }
  };

  const handleToggleLoginBonusActive = async (id: string, currentActive: boolean) => {
    try {
      if (!currentActive) {
        const q = query(collection(db, 'login_bonuses'), where('active', '==', true));
        const snap = await getDocs(q);
        for (const docSnap of snap.docs) {
          await setDoc(docSnap.ref, { active: false }, { merge: true });
        }
      }
      await setDoc(doc(db, 'login_bonuses', id), { active: !currentActive }, { merge: true });
      alert(currentActive ? 'ログインボーナスを無効化しました' : 'ログインボーナスを有効化しました！');
    } catch (err: any) {
      alert('ステータスの更新に失敗しました: ' + err.message);
    }
  };

  const handleDeleteLoginBonusBoard = async (id: string, name: string) => {
    if (!window.confirm(`ログインボーナス「${name}」を削除してもよろしいですか？`)) return;
    try {
      await deleteDoc(doc(db, 'login_bonuses', id));
      alert('ボードを削除しました。');
    } catch (err: any) {
      alert('削除に失敗しました: ' + err.message);
    }
  };

  const handleInGachaAddTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!igTitleText) return;
    const cleanText = igTitleText.trim();
    const generatedId = `custom_t_${igTitlePosition}_${Date.now()}`;
    try {
      await setDoc(doc(db, 'customTitleParts', generatedId), {
        text: cleanText,
        position: igTitlePosition,
        rarity: igTitleRarity,
        conditionText: '限定ガチャ排出オリジナル2つ名',
        isGachaExclusive: true,
        createdAt: serverTimestamp()
      });
      
      // Auto-check this item in the Gacha selection
      setGachaSelectedItems(prev => {
        if (!prev.includes(generatedId)) {
          return [...prev, generatedId];
        }
        return prev;
      });

      setIgTitleText('');
      setInGachaActiveCreator('none');
      alert(`オリジナル2つ名「${cleanText}」を作成＆封入リストに選択追加しました！`);
    } catch (err: any) {
      alert('作成に失敗しました: ' + err.message);
    }
  };

  const handleInGachaAddBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!igBadgeId || !igBadgeName) return;
    const cleanId = igBadgeId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanId) {
      alert('無効なバッジIDです。小文字英語・数字・アンダースコアのみ使用可能です。');
      return;
    }
    const fullBadgeId = `badge_${cleanId}`;

    let color = 'text-amber-600';
    let bgColor = 'bg-amber-50';
    let borderColor = 'border-amber-200';
    if (igBadgeTheme === 'green') {
      color = 'text-emerald-600';
      bgColor = 'bg-emerald-50';
      borderColor = 'border-emerald-200';
    } else if (igBadgeTheme === 'blue') {
      color = 'text-sky-600';
      bgColor = 'bg-sky-50';
      borderColor = 'border-sky-200';
    } else if (igBadgeTheme === 'purple') {
      color = 'text-purple-600';
      bgColor = 'bg-purple-50';
      borderColor = 'border-purple-200';
    } else if (igBadgeTheme === 'crimson') {
      color = 'text-rose-600';
      bgColor = 'bg-rose-50';
      borderColor = 'border-rose-200';
    } else if (igBadgeTheme === 'slate') {
      color = 'text-slate-800';
      bgColor = 'bg-slate-100/60';
      borderColor = 'border-slate-250';
    } else if (igBadgeTheme === 'yellow') {
      color = 'text-yellow-600';
      bgColor = 'bg-yellow-50';
      borderColor = 'border-yellow-250';
    }

    try {
      await setDoc(doc(db, 'customBadges', fullBadgeId), {
        name: igBadgeName.trim(),
        description: igBadgeDesc.trim() || '限定ガチャ排出オリジナルバッジ',
        iconName: igBadgeIcon,
        emoji: igBadgeEmoji,
        color,
        bgColor,
        borderColor,
        rarity: igBadgeRarity,
        themePreset: igBadgeTheme,
        conditionText: '限定ガチャ排出バッジ',
        isGachaExclusive: true,
        createdAt: serverTimestamp()
      });

      // Auto-check this item in the Gacha selection
      setGachaSelectedItems(prev => {
        if (!prev.includes(fullBadgeId)) {
          return [...prev, fullBadgeId];
        }
        return prev;
      });

      setIgBadgeId('');
      setIgBadgeName('');
      setIgBadgeDesc('');
      setInGachaActiveCreator('none');
      alert(`オリジナルバッジ「${igBadgeName}」を作成＆封入リストに選択追加しました！`);
    } catch (err: any) {
      alert('作成に失敗しました: ' + err.message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1200;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setAnnImage(canvas.toDataURL('image/jpeg', 0.8));
        setUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div 
        initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
        className="relative bg-white w-full max-w-3xl h-[80vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-orange-50 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-orange-950">
              <Shield className="w-5 h-5" />
              管理者パネル
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setTab('reports')}
                className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", tab === 'reports' ? "bg-orange-500 text-white" : "text-orange-300 hover:bg-orange-50")}
              >
                通報管理
              </button>
              <button 
                onClick={() => setTab('announcement')}
                className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", tab === 'announcement' ? "bg-orange-500 text-white" : "text-orange-300 hover:bg-orange-50")}
              >
                お知らせ配信
              </button>
              <button 
                onClick={() => setTab('stats')}
                className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", tab === 'stats' ? "bg-orange-500 text-white" : "text-orange-300 hover:bg-orange-50")}
              >
                統計データ
              </button>
              <button 
                onClick={() => setTab('campaigns')}
                className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", tab === 'campaigns' ? "bg-orange-500 text-white" : "text-orange-300 hover:bg-orange-50")}
              >
                キャンペーン管理 🎁
              </button>
              <button 
                onClick={() => setTab('gift_codes')}
                className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", tab === 'gift_codes' ? "bg-orange-500 text-white" : "text-orange-300 hover:bg-orange-50")}
              >
                配布コード管理 🎟️
              </button>
              <button 
                onClick={() => setTab('ranking_rewards')}
                className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", tab === 'ranking_rewards' ? "bg-orange-500 text-white" : "text-orange-300 hover:bg-orange-50")}
              >
                ランキング報酬 🏆
              </button>
              <button 
                onClick={() => setTab('bot_sim')}
                className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", tab === 'bot_sim' ? "bg-orange-500 text-white" : "text-orange-300 hover:bg-orange-50")}
              >
                ボット管理 🤖
              </button>
              <button 
                onClick={() => setTab('jse_creations')}
                className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", tab === 'jse_creations' ? "bg-orange-500 text-white" : "text-orange-300 hover:bg-orange-50")}
              >
                JSE上場審査 📈
              </button>
              {auth.currentUser?.email === 'kuailitengben@gmail.com' && (
                <button 
                  onClick={() => setTab('admins')}
                  className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", tab === 'admins' ? "bg-orange-500 text-white" : "text-orange-300 hover:bg-orange-50")}
                >
                  管理者管理 👑
                </button>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-orange-50 rounded-full"><X className="w-5 h-5 text-orange-300" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'reports' ? (
            <>
              <h3 className="text-sm font-bold text-orange-300 uppercase tracking-widest mb-6">未対応の通報 ({reports.length})</h3>
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="bg-orange-50 rounded-2xl p-6 border border-orange-100">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">TYPE: {report.targetType.toUpperCase()}</span>
                      <span className="text-[10px] text-orange-300">{formatDistanceToNow(report.createdAt.toDate(), { locale: language === 'ja' ? ja : undefined, addSuffix: true })}</span>
                    </div>
                    <p className="text-sm mb-4 font-bold text-orange-900">理由: {report.reason}</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          if (report.targetType === 'scene') onDeleteScene(report.targetId);
                          else onBanUser(report.targetId, true);
                          deleteDoc(doc(db, 'reports', report.id));
                        }}
                        className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-600 transition-all"
                      >
                        処置して通報を削除
                      </button>
                      <button 
                        onClick={() => deleteDoc(doc(db, 'reports', report.id))}
                        className="bg-white border border-orange-100 text-orange-400 px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-100 transition-all"
                      >
                        内容に問題なし
                      </button>
                    </div>
                  </div>
                ))}
                {reports.length === 0 && <p className="text-center py-20 text-orange-200">通報はありません。</p>}
              </div>
            </>
          ) : tab === 'announcement' ? (
            <div className="max-w-md mx-auto space-y-6">
              <h3 className="text-sm font-bold text-orange-300 uppercase tracking-widest text-center">お知らせを作成・送信</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-orange-300 uppercase tracking-widest mb-1 block ml-1">タイトル</label>
                  <input 
                    type="text" 
                    value={annTitle}
                    onChange={e => setAnnTitle(e.target.value)}
                    placeholder="重要なお知らせ"
                    className="w-full bg-orange-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-orange-300 uppercase tracking-widest mb-1 block ml-1">内容</label>
                  <textarea 
                    value={annContent}
                    onChange={e => setAnnContent(e.target.value)}
                    placeholder="お知らせの内容を入力してください..."
                    rows={6}
                    className="w-full bg-orange-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-orange-300 uppercase tracking-widest mb-1 block ml-1">画像 (任意)</label>
                  <div className="space-y-4">
                    {annImage ? (
                      <div className="relative group rounded-2xl overflow-hidden aspect-video bg-orange-50 border border-orange-100">
                        <img src={annImage} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setAnnImage('')}
                          className="absolute top-2 right-2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          type="button"
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.removeAttribute('capture');
                              fileInputRef.current.click();
                            }
                          }}
                          disabled={uploading}
                          className="flex flex-col items-center justify-center gap-2 h-32 bg-orange-50 rounded-2xl border-2 border-dashed border-orange-100 text-orange-400 hover:bg-orange-100 transition-all group"
                        >
                          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                          <span className="text-[10px] font-bold">写真を選択</span>
                        </button>
                        
                        <button 
                          type="button"
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.setAttribute('capture', 'environment');
                              fileInputRef.current.click();
                            }
                          }}
                          disabled={uploading}
                          className="flex flex-col items-center justify-center gap-2 h-32 bg-orange-50 rounded-2xl border-2 border-dashed border-orange-100 text-orange-400 hover:bg-orange-100 transition-all group"
                        >
                          <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-bold">写真を撮る</span>
                        </button>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => {
                    onCreateAnnouncement(annTitle, annContent, annImage);
                    setAnnTitle('');
                    setAnnContent('');
                    setAnnImage('');
                  }}
                  disabled={!annTitle || !annContent}
                  className="w-full bg-orange-950 text-white py-4 rounded-2xl font-bold hover:bg-orange-800 transition-all shadow-lg text-sm disabled:opacity-30"
                >
                  全員に配信
                </button>
              </div>
            </div>
          ) : tab === 'campaigns' ? (
            <div className="flex flex-col h-full overflow-hidden text-left w-full">
               {/* Subtabs for Campaigns, Titles, Badges */}
              <div className="flex gap-2 mb-6 border-b border-orange-100 pb-3 overflow-x-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setAdminCampSubTab('campaigns')}
                  className={`px-4 py-2 text-xs font-black rounded-2xl transition-all whitespace-nowrap ${adminCampSubTab === 'campaigns' ? 'bg-orange-500 text-white shadow-sm' : 'bg-orange-50 text-orange-800 hover:bg-orange-100'}`}
                >
                  🎁 キャンペーン配布設定
                </button>
                <button
                  type="button"
                  onClick={() => setAdminCampSubTab('titles')}
                  className={`px-4 py-2 text-xs font-black rounded-2xl transition-all whitespace-nowrap ${adminCampSubTab === 'titles' ? 'bg-orange-500 text-white shadow-sm' : 'bg-orange-50 text-orange-800 hover:bg-orange-100'}`}
                >
                  🎖️ 限定2つ名(称号)作成
                </button>
                <button
                  type="button"
                  onClick={() => setAdminCampSubTab('badges')}
                  className={`px-4 py-2 text-xs font-black rounded-2xl transition-all whitespace-nowrap ${adminCampSubTab === 'badges' ? 'bg-orange-500 text-white shadow-sm' : 'bg-orange-50 text-orange-800 hover:bg-orange-100'}`}
                >
                  👑 限定バッジ作成
                </button>
                <button
                  type="button"
                  onClick={() => setAdminCampSubTab('gachas')}
                  className={`px-4 py-2 text-xs font-black rounded-2xl transition-all whitespace-nowrap ${adminCampSubTab === 'gachas' ? 'bg-orange-500 text-white shadow-sm' : 'bg-orange-50 text-orange-850 hover:bg-orange-100'}`}
                >
                  🎰 限定ガチャプール設定
                </button>
                <button
                  type="button"
                  onClick={() => setAdminCampSubTab('login_bonuses')}
                  className={`px-4 py-2 text-xs font-black rounded-2xl transition-all whitespace-nowrap ${adminCampSubTab === 'login_bonuses' ? 'bg-orange-500 text-white shadow-sm' : 'bg-orange-50 text-orange-850 hover:bg-orange-100'}`}
                >
                  🎯 ログインボーナス設定
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 pb-6 w-full">
                {adminCampSubTab === 'campaigns' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Add Campaign Form */}
                    <div className="bg-orange-50/55 p-6 rounded-3xl border border-orange-100 flex flex-col justify-between h-fit">
                      <form onSubmit={handleAddCampaign} className="space-y-4 text-left">
                        <h3 className="text-xs font-black text-orange-950 uppercase tracking-widest border-b border-orange-100/50 pb-2">
                          新規キャンペーン設定
                        </h3>
                        <div>
                          <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">キャンペーン名</label>
                          <input 
                            type="text" 
                            value={campTitle}
                            onChange={e => setCampTitle(e.target.value)}
                            placeholder="例: リリース1周年記念！"
                            className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">配布アイテム</label>
                            <select 
                              value={campItemType}
                              onChange={e => setCampItemType(e.target.value as any)}
                              className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                            >
                              <option value="coins">Gacha Coins (コイン)</option>
                              <option value="shards">欠片 (シャード)</option>
                              <option value="special_title">限定2つ名パーツ</option>
                              <option value="special_badge">限定バッジ名</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">数量 / パーツ / バッジ名</label>
                            <input 
                              type="text" 
                              value={campItemValue}
                              onChange={e => setCampItemValue(e.target.value)}
                              placeholder={campItemType === 'special_title' ? '例: custom_t_prefix_xxx' : campItemType === 'special_badge' ? '例: badge_xxx' : '例: 500'}
                              className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                              required
                            />
                          </div>
                        </div>

                        {/* Quick Reference Helper for Dynamic IDs */}
                        {(campItemType === 'special_title' || campItemType === 'special_badge') && (
                          <div className="bg-orange-100/40 p-3 rounded-2xl border border-orange-200/50 text-[10px]">
                            <span className="font-extrabold text-orange-850 block mb-1">作成済み限定アイテムのID (クリックで入力):</span>
                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                              {campItemType === 'special_title' ? (
                                customTitleParts.filter(item => !item.isGachaExclusive && !item.isLoginBonusExclusive).length > 0 ? (
                                  customTitleParts.filter(item => !item.isGachaExclusive && !item.isLoginBonusExclusive).map(item => (
                                    <button
                                      type="button"
                                      key={item.id}
                                      onClick={() => setCampItemValue(item.id)}
                                      className="bg-white hover:bg-orange-100 text-orange-950 px-1.5 py-0.5 rounded border border-orange-200"
                                      title={item.text}
                                    >
                                      {item.text} ({item.position === 'prefix' ? '前' : '後'})
                                    </button>
                                  ))
                                ) : (
                                  <span className="text-orange-400 font-medium">作成済みの通常配布2つ名パーツはありません</span>
                                )
                              ) : (
                                customBadges.filter(item => !item.isGachaExclusive && !item.isLoginBonusExclusive).length > 0 ? (
                                  customBadges.filter(item => !item.isGachaExclusive && !item.isLoginBonusExclusive).map(item => (
                                    <button
                                      type="button"
                                      key={item.id}
                                      onClick={() => setCampItemValue(item.id)}
                                      className="bg-white hover:bg-orange-100 text-orange-950 px-1.5 py-0.5 rounded border border-orange-200"
                                      title={item.name}
                                    >
                                      {item.emoji} {item.name}
                                    </button>
                                  ))
                                ) : (
                                  <span className="text-orange-400 font-medium">作成済みの通常配布バッジはありません</span>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">配信開始（含む）</label>
                            <input 
                              type="date" 
                              value={campStartDate}
                              onChange={e => setCampStartDate(e.target.value)}
                              className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">配信終了（含む）</label>
                            <input 
                              type="date" 
                              value={campEndDate}
                              onChange={e => setCampEndDate(e.target.value)}
                              className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <input 
                            type="checkbox" 
                            id="campActive"
                            checked={campActive}
                            onChange={e => setCampActive(e.target.checked)}
                            className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-orange-200 cursor-pointer"
                          />
                          <label htmlFor="campActive" className="text-xs font-bold text-orange-850 cursor-pointer select-none">
                            キャンペーンを直ちに有効化する
                          </label>
                        </div>

                        <button 
                          type="submit"
                          className="w-full bg-orange-500 text-white hover:bg-orange-600 py-3 rounded-2xl font-bold transition-all shadow-md text-xs mt-4"
                        >
                          作成＆有効化 🎁
                        </button>
                      </form>
                    </div>

                    {/* View Campaigns List */}
                    <div className="space-y-4 text-left">
                      <h3 className="text-xs font-black text-orange-300 uppercase tracking-widest pl-1">
                        キャンペーン一覧 ({campaigns.length})
                      </h3>
                      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                        {campaigns.map((camp) => (
                          <div key={camp.id} className="bg-white border-2 border-orange-50 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className="font-bold text-xs text-orange-950">{camp.title}</span>
                                {camp.active ? (
                                  <span className="bg-green-50 border border-green-100 text-green-600 font-extrabold text-[8px] px-2 py-0.5 rounded-full uppercase">配布中</span>
                                ) : (
                                  <span className="bg-orange-50 border border-orange-100 text-orange-300 font-extrabold text-[8px] px-2 py-0.5 rounded-full uppercase">停止中</span>
                                )}
                              </div>
                              <div className="text-[10px] text-orange-400 space-y-1">
                                <p className="flex items-center gap-1.5">
                                  <span className="bg-orange-50 text-orange-500 px-1.5 py-0.5 rounded font-black text-[8px] tracking-wide">配布物</span> 
                                  <strong className="text-orange-900">{camp.itemType === 'coins' ? 'Coins' : camp.itemType === 'shards' ? '欠片' : camp.itemType === 'special_title' ? '2つ名' : '限定バッジ'} ({camp.itemValue})</strong>
                                </p>
                                <p className="flex items-center gap-1.5">
                                  <span className="bg-orange-50 text-orange-500 px-1.5 py-0.5 rounded font-black text-[8px] tracking-wide">期間</span> 
                                  <span className="text-orange-950 font-bold">{camp.startDate} 〜 {camp.endDate}</span>
                                </p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteCampaign(camp.id)}
                              className="text-orange-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-xl transition-all"
                              title="削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {campaigns.length === 0 && (
                          <p className="text-center py-10 text-xs text-orange-300">キャンペーンは設定されていません。</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : adminCampSubTab === 'titles' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                    {/* Add Title Part Form */}
                    <div className="bg-orange-50/55 p-6 rounded-3xl border border-orange-100 h-fit">
                      <form onSubmit={handleAddCustomTitle} className="space-y-4">
                        <h3 className="text-xs font-black text-orange-950 uppercase tracking-widest border-b border-orange-100/50 pb-2">
                          新規限定2つ名パーツの作成
                        </h3>
                        <div>
                          <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">パーツの位置</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setNewTitlePosition('prefix')}
                              className={`py-2 text-xs font-bold rounded-xl border transition-all ${newTitlePosition === 'prefix' ? 'bg-orange-500 text-white border-orange-655' : 'bg-white text-orange-950 border-orange-200'}`}
                            >
                              前部 (例: 静かなる〜)
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewTitlePosition('suffix')}
                              className={`py-2 text-xs font-bold rounded-xl border transition-all ${newTitlePosition === 'suffix' ? 'bg-orange-500 text-white border-orange-655' : 'bg-white text-orange-950 border-orange-200'}`}
                            >
                              後部 (例: 〜観測者)
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">2つ名テキスト</label>
                          <input 
                            type="text" 
                            value={newTitleText}
                            onChange={e => setNewTitleText(e.target.value)}
                            placeholder="例: 地味共感の神, 達人"
                            className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">レア度 (デザイン連動)</label>
                          <select 
                            value={newTitleRarity}
                            onChange={e => setNewTitleRarity(e.target.value as any)}
                            className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                          >
                            <option value="common">コモン (通常)</option>
                            <option value="uncommon">アンコモン (爽やかな呼吸微動)</option>
                            <option value="rare">レア (ブルースイープ反射)</option>
                            <option value="epic">エピック (微光紫グラデーション)</option>
                            <option value="legendary">レジェンダリー (黄金のメタル反射・きらめき)</option>
                            <option value="mythic">ミシック (終焉の超絶振動・虹波枠)</option>
                          </select>
                        </div>

                        <button 
                          type="submit"
                          className="w-full bg-orange-500 text-white hover:bg-orange-600 py-3 rounded-2xl font-bold transition-all shadow-md text-xs mt-4"
                        >
                          2つ名パーツを作成 🎖️
                        </button>
                      </form>
                    </div>

                    {/* View Custom Title Parts */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-orange-300 uppercase tracking-widest pl-1">
                        作成済み限定2つ名パーツ ({customTitleParts.length})
                      </h3>
                      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                        {customTitleParts.map((part) => (
                          <div key={part.id} className="bg-white border-2 border-orange-50 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-4 font-bold">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                <span className="font-extrabold text-xs text-orange-950 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                                  {part.position === 'prefix' ? '前部' : '後部'}
                                </span>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                  part.rarity === 'mythic' ? 'bg-zinc-900 text-red-400 border-zinc-950 animate-pulse' :
                                  part.rarity === 'legendary' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                  part.rarity === 'epic' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                  part.rarity === 'rare' ? 'bg-sky-50 text-sky-600 border-sky-200' :
                                  part.rarity === 'uncommon' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                  'bg-slate-50 text-slate-500 border-slate-200'
                                }`}>
                                  {part.rarity || 'common'}
                                </span>
                              </div>
                              <p className="text-xs font-extrabold text-orange-950 mt-1">「 {part.text} 」</p>
                              <code className="text-[9px] text-slate-400 block mt-1 font-mono select-all">ID: {part.id}</code>
                            </div>
                            <button 
                              type="button"
                              onClick={() => handleDeleteCustomTitle(part.id, part.text)}
                              className="text-orange-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-xl transition-all pointer-events-auto"
                              title="削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {customTitleParts.length === 0 && (
                          <p className="text-center py-10 text-xs text-orange-300">限定2つ名は設定されていません。</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : adminCampSubTab === 'badges' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                    {/* Add Custom Badge Form */}
                    <div className="bg-orange-50/55 p-6 rounded-3xl border border-orange-100 h-fit overflow-y-auto">
                      <form onSubmit={handleAddCustomBadge} className="space-y-4">
                        <h3 className="text-xs font-black text-orange-950 uppercase tracking-widest border-b border-orange-100/50 pb-2">
                          新規限定バッジの作成
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">バッジの略称ID</label>
                            <input 
                              type="text" 
                              value={newBadgeId}
                              onChange={e => setNewBadgeId(e.target.value)}
                              placeholder="例: premium_gold (英語)"
                              className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                              required
                            />
                            <span className="text-[8px] text-slate-400 mt-1 block">※自動で「badge_」から始まるIDになります</span>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">バッジの名称</label>
                            <input 
                              type="text" 
                              value={newBadgeName}
                              onChange={e => setNewBadgeName(e.target.value)}
                              placeholder="例: 地味共感覇者"
                              className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">バッジの説明</label>
                          <textarea 
                            value={newBadgeDesc}
                            onChange={e => setNewBadgeDesc(e.target.value)}
                            placeholder="例: 新たな神話を打ち立てた不屈の証"
                            className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                            rows={2}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">シンボル絵文字</label>
                            <input 
                              type="text" 
                              value={newBadgeEmoji}
                              onChange={e => setNewBadgeEmoji(e.target.value)}
                              placeholder="🎁"
                              className="w-full bg-white text-center border border-orange-100 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                              required
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">予備アイコン (Lucide)</label>
                            <select 
                              value={newBadgeIcon}
                              onChange={e => setNewBadgeIcon(e.target.value)}
                              className="w-full bg-white border border-orange-150 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                            >
                              <option value="Award">Award (メダル)</option>
                              <option value="Trophy">Trophy (金杯)</option>
                              <option value="Crown">Crown (王冠)</option>
                              <option value="Flame">Flame (情熱の炎)</option>
                              <option value="Zap">Zap (電気電撃)</option>
                              <option value="Sparkles">Sparkles (星々きらきら)</option>
                              <option value="Target">Target (狙い撃ち)</option>
                              <option value="Star">Star (一等星)</option>
                              <option value="Gift">Gift (ギフト)</option>
                              <option value="Heart">Heart (共感のハート)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">デザインテーマ</label>
                            <select 
                              value={newBadgeTheme}
                              onChange={e => setNewBadgeTheme(e.target.value)}
                              className="w-full bg-white border border-orange-110 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                            >
                              <option value="gold">Amber Gold (琥珀ゴールド)</option>
                              <option value="green">Emerald Mint (エメラルド)</option>
                              <option value="blue">Cobalt Sky (コバルトブルー)</option>
                              <option value="purple">Electric Violet (バイオレット)</option>
                              <option value="crimson">Crimson Rose (クリムゾン)</option>
                              <option value="slate">Cool Carbon (炭黒スレート)</option>
                              <option value="yellow">Sunshine Yellow (イエロー)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">レア度設定</label>
                            <select 
                              value={newBadgeRarity}
                              onChange={e => setNewBadgeRarity(e.target.value as any)}
                              className="w-full bg-white border border-orange-120 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                            >
                              <option value="common">コモン</option>
                              <option value="uncommon">アンコモン</option>
                              <option value="rare">レア</option>
                              <option value="epic">エピック</option>
                              <option value="legendary">レジェンダリー</option>
                              <option value="mythic">ミシック</option>
                            </select>
                          </div>
                        </div>

                        {/* Visual Badge Preview */}
                        <div className="bg-orange-50 p-4 border border-orange-200/40 rounded-2xl flex flex-col items-center">
                          <span className="text-[9px] font-black text-orange-400 uppercase tracking-wider block mb-2 text-center font-bold">バッジの見た目プレビュー</span>
                          <div className={`p-3 rounded-2xl border flex items-center gap-3 w-full border-orange-200 bg-orange-50 text-orange-600 font-bold`}>
                            <div className="w-10 h-10 rounded-xl border flex items-center justify-center text-xl bg-white border-orange-100/30">
                              <span>{newBadgeEmoji}</span>
                            </div>
                            <div>
                              <p className="text-xs font-black tracking-tight">{newBadgeName || '名無しのバッジ'}</p>
                              <p className="text-[9px] opacity-75">{newBadgeDesc || '未入力の説明文'}</p>
                            </div>
                          </div>
                        </div>

                        <button 
                          type="submit"
                          className="w-full bg-orange-500 text-white hover:bg-orange-600 py-3 rounded-2xl font-bold transition-all shadow-md text-xs mt-4"
                        >
                          限定バッジを作成 👑
                        </button>
                      </form>
                    </div>

                    {/* View Custom Badges */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-orange-300 uppercase tracking-widest pl-1">
                        作成済み限定バッジ ({customBadges.length})
                      </h3>
                      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                        {customBadges.map((badge) => {
                          const rStyle = getBadgeRarityStyle(badge.rarity);
                          return (
                            <div key={badge.id} className="bg-white border-2 border-orange-50 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-4 font-bold">
                              <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center border shrink-0 ${rStyle.bg} ${rStyle.border}`}>
                                  {badge.emoji}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-extrabold text-xs text-orange-950">{badge.name}</span>
                                    <span className="bg-orange-50 text-[8px] font-black border border-orange-200 text-orange-500 px-1.5 py-0.5 rounded-full uppercase">
                                      {badge.rarity || 'common'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-orange-600 font-bold mt-1 leading-relaxed">{badge.description}</p>
                                  <code className="text-[8px] text-slate-400 block mt-1 font-mono select-all font-bold">ID: {badge.id}</code>
                                </div>
                              </div>
                              <button 
                                type="button"
                                onClick={() => handleDeleteCustomBadge(badge.id, badge.name)}
                                className="text-orange-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-xl transition-all shrink-0 pointer-events-auto"
                                title="削除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                        {customBadges.length === 0 && (
                          <p className="text-center py-10 text-xs text-orange-300">限定バッジは設定されていません。</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : adminCampSubTab === 'gachas' ? (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 text-left">
                    {/* Add Gacha Pool Form */}
                    <div className="bg-orange-50/55 p-6 rounded-3xl border border-orange-100 xl:col-span-5 h-fit flex flex-col justify-between">
                      <form onSubmit={handleAddGachaPool} className="space-y-4">
                        <h3 className="text-xs font-black text-orange-950 uppercase tracking-widest border-b border-orange-100/50 pb-2">
                          新規限定ガチャプールの作成 🎰
                        </h3>
                        <div>
                          <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">ガチャキャンペーン名</label>
                          <input 
                            type="text" 
                            value={newGachaName}
                            onChange={e => setNewGachaName(e.target.value)}
                            placeholder="例: リリース1週間記念 特別ガチャ!"
                            className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">簡単な説明 / イントロ</label>
                          <textarea 
                            value={newGachaDesc}
                            onChange={e => setNewGachaDesc(e.target.value)}
                            placeholder="例: レジェンダリー＆エピックの排出率が大幅に上昇している、1週間限定の特別なガチャです！"
                            className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none min-h-[60px]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">1回引くコスト (GC)</label>
                            <input 
                              type="number" 
                              value={newGachaCost1}
                              onChange={e => setNewGachaCost1(Number(e.target.value))}
                              className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">10連引くコスト (GC)</label>
                            <input 
                              type="number" 
                              value={newGachaCost10}
                              onChange={e => setNewGachaCost10(Number(e.target.value))}
                              className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                              required
                            />
                          </div>
                        </div>

                        {/* Probability weight configuration */}
                        <div className="space-y-3 bg-white p-4 rounded-2xl border border-orange-100">
                          <span className="text-[10px] font-black text-orange-950 uppercase tracking-wider block border-b border-orange-100/50 pb-1.5">
                            排出割合の設定 (% または 相対値)
                          </span>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-slate-500 block">Common</label>
                              <input type="number" step="any" value={rateCommon} onChange={e => setRateCommon(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded p-1.5 text-xs text-center" />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-emerald-650 block">Uncommon</label>
                              <input type="number" step="any" value={rateUncommon} onChange={e => setRateUncommon(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded p-1.5 text-xs text-center" />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-sky-650 block">Rare</label>
                              <input type="number" step="any" value={rateRare} onChange={e => setRateRare(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded p-1.5 text-xs text-center" />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-purple-650 block">Epic</label>
                              <input type="number" step="any" value={rateEpic} onChange={e => setRateEpic(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded p-1.5 text-xs text-center" />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-amber-650 block">Legendary</label>
                              <input type="number" step="any" value={rateLegendary} onChange={e => setRateLegendary(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded p-1.5 text-xs text-center" />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-rose-650 block animate-pulse">Mythic</label>
                              <input type="number" step="any" value={rateMythic} onChange={e => setRateMythic(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded p-1.5 text-xs text-center" />
                            </div>
                          </div>
                          <div className="text-[9px] text-slate-400 text-right">
                            合計比重: <strong className="text-orange-900">{(rateCommon + rateUncommon + rateRare + rateEpic + rateLegendary + rateMythic).toFixed(2)}</strong>
                          </div>
                        </div>

                        {/* Pity adjustments */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">50連天井確定レア度</label>
                            <select value={pity50Rarity} onChange={e => setPity50Rarity(e.target.value as any)} className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs outline-none">
                              <option value="common">コモン以上</option>
                              <option value="uncommon">アンコモン以上</option>
                              <option value="rare">レア以上 (デフォルト)</option>
                              <option value="epic">エピック以上</option>
                              <option value="legendary">レジェンダリー以上</option>
                              <option value="mythic">ミシック</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">200連天井確定レア度</label>
                            <select value={pity200Rarity} onChange={e => setPity200Rarity(e.target.value as any)} className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs outline-none">
                              <option value="legendary">レジェンダリー以上 (デフォルト)</option>
                              <option value="mythic">ミシックのみ</option>
                            </select>
                          </div>
                        </div>

                        {/* Contents Filter Selection */}
                        <div className="bg-white p-4 rounded-2xl border border-orange-100 space-y-3">
                          <div className="flex justify-between items-center border-b border-orange-50 pb-1.5">
                            <span className="text-[10px] font-black text-orange-950 uppercase tracking-wider block font-bold">
                              封入対象アイテムの絞り込み
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (gachaSelectedItems.length > 0) {
                                  setGachaSelectedItems([]);
                                } else {
                                  // Selected all standard
                                  const seenIds = new Set<string>();
                                  customBadges.forEach(b => { if (b && b.id && !b.isLoginBonusExclusive) seenIds.add(b.id); });
                                  BADGES.forEach(b => { if (b && b.id) seenIds.add(b.id); });
                                  const all = [
                                    ...Array.from(seenIds),
                                    ...customTitleParts.filter(t => !t.isLoginBonusExclusive).map(t => t.id)
                                  ];
                                  setGachaSelectedItems(all);
                                }
                              }}
                              className="text-[9px] font-bold text-orange-500 hover:underline font-bold"
                            >
                              {gachaSelectedItems.length > 0 ? '全選択解除' : '全アイテム選択'}
                            </button>
                          </div>
                          
                          <p className="text-[9px] text-slate-400 leading-tight">
                            ※ 一つもチェックしない場合は、自動的に【全アイテム封入】（通常ガチャと同様）の扱いになります。
                          </p>

                          {/* Quick original item creation menu */}
                          <div className="bg-orange-50/40 p-3 rounded-2xl border border-orange-100/50 space-y-2 mt-1">
                            <p className="text-[10px] font-black text-orange-950 flex items-center gap-1 font-bold">
                              🪄 限定オリジナルアイテムの特注・その場で作成
                            </p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setInGachaActiveCreator(prev => prev === 'title' ? 'none' : 'title')}
                                className={cn(
                                  "flex-1 text-[10px] font-bold py-1.5 px-3 rounded-xl border transition-all text-center",
                                  inGachaActiveCreator === 'title'
                                    ? "bg-orange-500 border-orange-500 text-white shadow-sm font-bold"
                                    : "bg-white border-orange-100 hover:bg-orange-100/30 text-orange-950 font-bold"
                                )}
                              >
                                ✍️ オリジナル2つ名を作る
                              </button>
                              <button
                                type="button"
                                onClick={() => setInGachaActiveCreator(prev => prev === 'badge' ? 'none' : 'badge')}
                                className={cn(
                                  "flex-1 text-[10px] font-bold py-1.5 px-3 rounded-xl border transition-all text-center",
                                  inGachaActiveCreator === 'badge'
                                    ? "bg-orange-500 border-orange-500 text-white shadow-sm font-bold"
                                    : "bg-white border-orange-100 hover:bg-orange-100/30 text-orange-950 font-bold"
                                )}
                              >
                                🏅 オリジナルバッジを作る
                              </button>
                            </div>

                            {/* In-Gacha Title Creator Form */}
                            {inGachaActiveCreator === 'title' && (
                              <div className="bg-white p-3.5 rounded-xl border border-orange-200 shadow-sm space-y-3 mt-2 text-left animate-fade-in font-bold">
                                <p className="text-[10px] font-black text-orange-950 border-b border-orange-50 pb-1 flex items-center justify-between font-bold">
                                  <span>🔮 新オリジナル2つ名の作成</span>
                                  <button type="button" onClick={() => setInGachaActiveCreator('none')} className="text-slate-400 hover:text-slate-650">✕</button>
                                </p>
                                <div className="space-y-2.5">
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5">2つ名文字（例: 「地味」「限界」など）</label>
                                    <input 
                                      type="text" 
                                      value={igTitleText}
                                      onChange={e => setIgTitleText(e.target.value)}
                                      placeholder="例: 地味っち愛好家"
                                      className="w-full bg-slate-50 border border-slate-150 rounded-lg p-2 text-xs focus:bg-white outline-none font-medium text-stone-900"
                                      required
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-500 block mb-0.5">前後位置</label>
                                      <select 
                                        value={igTitlePosition} 
                                        onChange={e => setIgTitlePosition(e.target.value as any)}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-lg p-2 text-[11px] outline-none font-bold text-stone-900"
                                      >
                                        <option value="prefix">前パーツ (Prefix)</option>
                                        <option value="suffix">後パーツ (Suffix)</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-500 block mb-0.5">レア度設定</label>
                                      <select 
                                        value={igTitleRarity} 
                                        onChange={e => setIgTitleRarity(e.target.value as any)}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-lg p-2 text-[11px] outline-none font-bold text-stone-900"
                                      >
                                        <option value="common">Common (コモン)</option>
                                        <option value="uncommon">Uncommon (アンコモン)</option>
                                        <option value="rare">Rare (レア)</option>
                                        <option value="epic">Epic (エピック)</option>
                                        <option value="legendary">Legendary (レジェンダリー)</option>
                                        <option value="mythic">Mythic (ミシック)</option>
                                      </select>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleInGachaAddTitle}
                                    className="w-full bg-orange-600 text-white rounded-lg py-2 text-xs font-black hover:bg-orange-700 transition font-bold"
                                  >
                                    作成してガチャの封入にチェック追加する!
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* In-Gacha Badge Creator Form */}
                            {inGachaActiveCreator === 'badge' && (
                              <div className="bg-white p-3.5 rounded-xl border border-orange-200 shadow-sm space-y-3 mt-2 text-left animate-fade-in font-bold">
                                <p className="text-[10px] font-black text-orange-950 border-b border-orange-50 pb-1 flex items-center justify-between font-bold">
                                  <span>🔮 新オリジナルバッジの作成</span>
                                  <button type="button" onClick={() => setInGachaActiveCreator('none')} className="text-slate-400 hover:text-slate-650">✕</button>
                                </p>
                                <div className="space-y-2.5">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-500 block mb-0.5">一意のバッジID (英小文字・英数字)</label>
                                      <input 
                                        type="text" 
                                        value={igBadgeId}
                                        onChange={e => setIgBadgeId(e.target.value)}
                                        placeholder="例: gacha_exclusive_01"
                                        className="w-full bg-slate-50 border border-slate-150 rounded-lg p-2 text-xs focus:bg-white outline-none font-medium text-stone-900"
                                        required
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-500 block mb-0.5">バッジ表示名</label>
                                      <input 
                                        type="text" 
                                        value={igBadgeName}
                                        onChange={e => setIgBadgeName(e.target.value)}
                                        placeholder="例: 激レアガチャ守護神"
                                        className="w-full bg-slate-50 border border-slate-150 rounded-lg p-2 text-xs focus:bg-white outline-none font-medium text-stone-900"
                                        required
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5">バッジの説明テキスト</label>
                                    <textarea 
                                      value={igBadgeDesc}
                                      onChange={e => setIgBadgeDesc(e.target.value)}
                                      placeholder="例: ガチャ最高レアを当てた最強オリジナルバッジ！"
                                      className="w-full bg-slate-50 border border-slate-155 rounded-lg p-2 text-xs focus:bg-white outline-none min-h-[45px] font-medium text-stone-900"
                                    />
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-500 block mb-0.5">絵文字 (Emoji)</label>
                                      <input 
                                        type="text" 
                                        value={igBadgeEmoji}
                                        onChange={e => setIgBadgeEmoji(e.target.value)}
                                        placeholder="🏅"
                                        className="w-full bg-slate-50 border border-slate-150 rounded-lg p-2 text-xs text-center focus:bg-white outline-none font-bold text-stone-900"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-500 block mb-0.5">テーマ色</label>
                                      <select 
                                        value={igBadgeTheme} 
                                        onChange={e => setIgBadgeTheme(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-lg p-2 text-[10px] outline-none font-bold text-stone-900"
                                      >
                                        <option value="gold">Gold (ゴールド)</option>
                                        <option value="green">Green (グリーン)</option>
                                        <option value="blue">Blue (ブルー)</option>
                                        <option value="purple">Purple (パープル)</option>
                                        <option value="crimson">Crimson (ローズ)</option>
                                        <option value="slate">Slate (スレート)</option>
                                        <option value="yellow">Yellow (イエロー)</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-500 block mb-0.5">レア度設定</label>
                                      <select 
                                        value={igBadgeRarity} 
                                        onChange={e => setIgBadgeRarity(e.target.value as any)}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-lg p-2 text-[10px] outline-none font-bold text-stone-900"
                                      >
                                        <option value="common">Common</option>
                                        <option value="uncommon">Uncommon</option>
                                        <option value="rare">Rare</option>
                                        <option value="epic">Epic</option>
                                        <option value="legendary">Legendary</option>
                                        <option value="mythic">Mythic</option>
                                      </select>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleInGachaAddBadge}
                                    className="w-full bg-orange-600 text-white rounded-lg py-2 text-xs font-black hover:bg-orange-700 transition font-bold"
                                  >
                                    作成してガチャの封入にチェック追加する!
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="max-h-40 overflow-y-auto pr-1 space-y-3 pt-1">
                            {/* Group 1: Custom/Classic Badges */}
                            {(() => {
                              const seenIds = new Set<string>();
                              const uniqueBadgesList: any[] = [];
                              customBadges.forEach(b => {
                                if (b && b.id && !b.isLoginBonusExclusive && !seenIds.has(b.id)) {
                                  seenIds.add(b.id);
                                  uniqueBadgesList.push(b);
                                }
                              });
                              BADGES.forEach(b => {
                                if (b && b.id && !seenIds.has(b.id)) {
                                  seenIds.add(b.id);
                                  uniqueBadgesList.push(b);
                                }
                              });

                              return (
                                <div>
                                  <p className="text-[9px] font-extrabold text-orange-450 uppercase mb-1 font-bold">👑 バッジ（全種類 ({uniqueBadgesList.length})）</p>
                                  <div className="flex flex-col gap-1.5 pl-1.5">
                                    {uniqueBadgesList.map(b => {
                                      const isSelected = gachaSelectedItems.includes(b.id);
                                      return (
                                        <label key={b.id} className="flex items-center gap-2 text-[10px] text-slate-700 cursor-pointer select-none font-bold">
                                          <input 
                                            type="checkbox" 
                                            checked={isSelected}
                                            onChange={() => {
                                              if (isSelected) {
                                                setGachaSelectedItems(prev => prev.filter(x => x !== b.id));
                                              } else {
                                                setGachaSelectedItems(prev => [...prev, b.id]);
                                              }
                                            }}
                                            className="w-3.5 h-3.5 text-orange-500 rounded border-slate-350 cursor-pointer"
                                          />
                                          <span className="font-bold">{b.emoji ?? '🎖️'} {b.name}</span>
                                          <span className="text-[7px] text-slate-400 capitalize bg-slate-50 px-1 py-0.2 rounded border border-slate-100">{b.rarity}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Group 2: Custom/Classic Titles parts */}
                            <div>
                              <p className="text-[9px] font-extrabold text-orange-450 uppercase mb-1 font-bold">🎖️ 2つ名（カスタム & 限定作成物）</p>
                              {customTitleParts.filter(t => !t.isLoginBonusExclusive).length > 0 ? (
                                <div className="flex flex-col gap-1.5 pl-1.5">
                                  {customTitleParts.filter(t => !t.isLoginBonusExclusive).map(t => {
                                    const isSelected = gachaSelectedItems.includes(t.id);
                                    return (
                                      <label key={t.id} className="flex items-center gap-2 text-[10px] text-slate-700 cursor-pointer select-none font-bold">
                                        <input 
                                          type="checkbox" 
                                          checked={isSelected}
                                          onChange={() => {
                                            if (isSelected) {
                                              setGachaSelectedItems(prev => prev.filter(x => x !== t.id));
                                            } else {
                                              setGachaSelectedItems(prev => [...prev, t.id]);
                                            }
                                          }}
                                          className="w-3.5 h-3.5 text-orange-500 rounded border-slate-350 cursor-pointer"
                                        />
                                        <span className="font-bold">「{t.text}」 ({t.position === 'prefix' ? '前' : '後'})</span>
                                        <span className="text-[7px] text-slate-405 capitalize bg-slate-50 px-1 py-0.2 rounded border border-slate-100">{t.rarity}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-[9px] text-slate-355 pl-2">※ 作成済みのカスタム2つ名はありません</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1 font-bold">
                          <input 
                            type="checkbox" 
                            id="gachaActive"
                            checked={newGachaActive}
                            onChange={e => setNewGachaActive(e.target.checked)}
                            className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-orange-200 cursor-pointer"
                          />
                          <label htmlFor="gachaActive" className="text-xs text-orange-850 cursor-pointer select-none">
                            このガチャを直ちに有効化する
                          </label>
                        </div>

                        <button 
                          type="submit"
                          className="w-full bg-orange-500 text-white hover:bg-orange-600 py-3 rounded-2xl font-black transition-all shadow-md text-xs mt-4"
                        >
                          限定ガチャプールを作成 🎰
                        </button>
                      </form>
                    </div>

                    {/* View Custom Gacha Pools List */}
                    <div className="space-y-4 xl:col-span-7">
                      <h3 className="text-xs font-black text-orange-300 uppercase tracking-widest pl-1">
                        限定ガチャキャンペーン一覧 ({gachaPools.length})
                      </h3>
                      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                        {gachaPools.map((pool) => (
                          <div key={pool.id} className="bg-white border-2 border-orange-50 rounded-3xl p-5 shadow-sm space-y-3 font-semibold relative overflow-hidden">
                            {pool.active && (
                              <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full m-4 animate-ping" />
                            )}
                            
                            <div className="flex items-start justify-between gap-4 border-b border-orange-50 pb-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="font-extrabold text-xs text-orange-950">{pool.name}</span>
                                  {pool.active ? (
                                    <span className="bg-green-50 border border-green-100 text-green-600 font-extrabold text-[8px] px-2 py-0.5 rounded-full uppercase">開催中 (Active)</span>
                                  ) : (
                                    <span className="bg-slate-50 border border-slate-100 text-slate-400 font-extrabold text-[8px] px-2 py-0.5 rounded-full uppercase">一時停止</span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 lines-clamp-2">{pool.description || '説明文はありません'}</p>
                              </div>
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => handleToggleGachaPoolActive(pool.id, pool.active)}
                                  className={`px-2 py-1 rounded-xl text-[9px] font-black border transition-all ${
                                    pool.active ? 'bg-orange-50 border-orange-100 text-orange-600 hover:bg-orange-100' : 'bg-green-50 border-green-100 text-green-600 hover:bg-green-100'
                                  }`}
                                  title={pool.active ? '停止' : '再開'}
                                >
                                  {pool.active ? '停止' : '稼働'}
                                </button>
                                <button 
                                  onClick={() => handleDeleteGachaPool(pool.id, pool.name)}
                                  className="text-orange-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all"
                                  title="削除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="text-[10px] text-slate-600 space-y-1.5">
                              <p className="flex items-center gap-2">
                                <span className="bg-orange-50 text-orange-655 px-1.5 py-0.5 rounded font-black text-[8px]">価格設定</span> 
                                <span className="text-orange-950 font-bold">1回: {pool.cost1 ?? 100} GC &nbsp;/&nbsp; 10連: {pool.cost10 ?? 900} GC</span>
                              </p>
                              <p className="flex items-start gap-2">
                                <span className="bg-orange-50 text-orange-655 px-1.5 py-0.5 rounded font-black text-[8px] shrink-0">排出割合</span> 
                                <span className="text-slate-700 leading-relaxed font-bold">
                                  コモン: {pool.rates?.common ?? 55} / 
                                  アンコモン: {pool.rates?.uncommon ?? 25} / 
                                  レア: {pool.rates?.rare ?? 13} / 
                                  エピック: {pool.rates?.epic ?? 5} / 
                                  伝説: {pool.rates?.legendary ?? 1.8} / 
                                  神話: {pool.rates?.mythic ?? 0.2}
                                </span>
                              </p>
                              <p className="flex items-center gap-2">
                                <span className="bg-orange-50 text-orange-655 px-1.5 py-0.5 rounded font-black text-[8px]">天井設定</span> 
                                <span className="text-slate-700 font-bold">50連時: {pool.pityLimit50 ?? 'rare'}以上 &nbsp;/&nbsp; 200連時: {pool.pityLimit200 ?? 'legendary'}以上</span>
                              </p>
                              <p className="flex items-start gap-2">
                                <span className="bg-orange-50 text-orange-655 px-1.5 py-0.5 rounded font-black text-[8px] shrink-0">封入中身</span> 
                                <span className="text-slate-750 font-bold leading-normal">
                                  {pool.selectedItemIds && pool.selectedItemIds.length > 0 ? (
                                    <>絞り込み ({pool.selectedItemIds.length} 個): <code className="text-[9px] text-orange-600 block max-h-12 overflow-y-auto select-all mt-0.5 font-mono leading-tight">{pool.selectedItemIds.join(', ')}</code></>
                                  ) : (
                                    '全コンテンツ封入（標準ガチャと同じ）'
                                  )}
                                </span>
                              </p>
                            </div>
                            <div className="text-[8px] text-slate-400 font-mono select-none">ID: {pool.id}</div>
                          </div>
                        ))}
                        {gachaPools.length === 0 && (
                          <div className="bg-white border-2 border-orange-50 rounded-3xl p-10 text-center text-xs text-orange-300">
                            現在作成済みの限定ガチャプールはありません。
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 text-left">
                    {/* Add Login Bonus Board Form */}
                    <div className="bg-orange-50/55 p-6 rounded-3xl border border-orange-100 xl:col-span-5 h-fit flex flex-col justify-between">
                      <form onSubmit={handleCreateLoginBonusBoard} className="space-y-4">
                        <h3 className="text-xs font-black text-orange-950 uppercase tracking-widest border-b border-orange-100/50 pb-2 flex items-center gap-1.5">
                          新規ログインボーナスボードの作成 🎯
                        </h3>
                        <div>
                          <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">ログインボーナスボード名</label>
                          <input 
                            type="text" 
                            value={lbBoardName}
                            onChange={e => setLbBoardName(e.target.value)}
                            placeholder="例: サマーログインボーナス 2026"
                            className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide">ログイン日数設定 (マスの数)</label>
                            <div className="space-y-1.5">
                              <select 
                                value={lbDaysCount === 9 ? '3x3' : lbDaysCount === 25 ? '5x5' : lbDaysCount === 7 ? 'weekly' : 'custom'}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val === '3x3') { setLbDaysCount(9); setLbGridType('3x3'); }
                                  else if (val === '5x5') { setLbDaysCount(25); setLbGridType('5x5'); }
                                  else if (val === 'weekly') { setLbDaysCount(7); setLbGridType('custom'); }
                                  else { setLbGridType('custom'); }
                                }}
                                className="w-full bg-white border border-orange-100 rounded-xl p-2 text-[11px] focus:ring-2 focus:ring-orange-500 outline-none font-bold text-orange-950"
                              >
                                <option value="weekly">7日間 (1週間)</option>
                                <option value="3x3">3x3 (9個のマス / 短期型)</option>
                                <option value="5x5">5x5 (25個のマス / 長期型)</option>
                                <option value="custom">カスタム日数</option>
                              </select>
                              
                              {/* Custom numeric range input */}
                              <div className="flex items-center gap-1.5">
                                <input 
                                  type="range"
                                  min="1"
                                  max="30"
                                  value={lbDaysCount}
                                  onChange={e => { setLbDaysCount(Number(e.target.value)); setLbGridType('custom'); }}
                                  className="w-full h-1 bg-orange-100 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-[10px] bg-orange-50 px-1.5 py-0.5 border border-orange-100 rounded font-mono font-bold text-orange-950 shrink-0">
                                  {lbDaysCount}日
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-5 font-bold pl-1">
                            <input 
                              type="checkbox" 
                              id="lbActiveCheck"
                              checked={lbActive}
                              onChange={e => setLbActive(e.target.checked)}
                              className="w-4 h-4 rounded text-orange-655 focus:ring-orange-500 border-orange-200 cursor-pointer"
                            />
                            <label htmlFor="lbActiveCheck" className="text-xs text-orange-850 cursor-pointer select-none">
                              直ちに本番配信
                            </label>
                          </div>
                        </div>

                        {/* Custom Login Bonus Exclusive Asset Creation Box */}
                        <div className="bg-orange-100/25 p-4 rounded-2xl border border-orange-200/40 space-y-3">
                          <p className="text-[10px] font-black text-orange-950 flex items-center gap-1.5 font-bold">
                            🔒 ログインボーナス専用オリジナルアイテムの特注・作製
                          </p>
                          <p className="text-[9px] text-slate-500 leading-tight">
                            ※ ここで作製した「限定2つ名」や「限定バッジ」は、これ以外の通常キャンペーンやガチャの封入リストからは自動的に除外され、絶対にログインボーナス以外では入手不可能になります！
                          </p>
                          
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setLbActiveCreator(prev => prev === 'title' ? 'none' : 'title')}
                              className={`flex-1 text-[10px] font-bold py-1.5 px-3 rounded-xl border transition-all text-center ${
                                lbActiveCreator === 'title'
                                  ? "bg-orange-500 border-orange-500 text-white shadow-sm font-bold"
                                  : "bg-white border-orange-100 hover:bg-orange-100/35 text-orange-950 font-bold"
                              }`}
                            >
                              ✍️ 専用2つ名を作る
                            </button>
                            <button
                              type="button"
                              onClick={() => setLbActiveCreator(prev => prev === 'badge' ? 'none' : 'badge')}
                              className={`flex-1 text-[10px] font-bold py-1.5 px-3 rounded-xl border transition-all text-center ${
                                lbActiveCreator === 'badge'
                                  ? "bg-orange-500 border-orange-500 text-white shadow-sm font-bold"
                                  : "bg-white border-orange-100 hover:bg-orange-100/35 text-orange-950 font-bold"
                              }`}
                            >
                              🏅 専用バッジを作る
                            </button>
                          </div>

                          {/* Login Bonus Exclusive Title Creator Form */}
                          {lbActiveCreator === 'title' && (
                            <div className="bg-white p-3.5 rounded-xl border border-orange-200 shadow-sm space-y-3 mt-2 text-left font-bold">
                              <p className="text-[10px] font-black text-orange-950 border-b border-orange-50 pb-1 flex items-center justify-between font-bold">
                                <span>🔮 ログインボーナス専用・新規オリジナル2つ名</span>
                                <button type="button" onClick={() => setLbActiveCreator('none')} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
                              </p>
                              <div className="space-y-2.5">
                                <div>
                                  <label className="text-[9px] font-bold text-slate-500 block mb-0.5">2つ名文字（例: 「精霊」「ログインの鬼」など）</label>
                                  <input 
                                    type="text" 
                                    value={lbTitleText}
                                    onChange={e => setLbTitleText(e.target.value)}
                                    placeholder="例: 早起き皆勤賞"
                                    className="w-full bg-slate-50 border border-slate-150 rounded-lg p-2 text-xs focus:bg-white outline-none font-medium text-stone-900"
                                    required
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5">前後位置</label>
                                    <select 
                                      value={lbTitlePosition} 
                                      onChange={e => setLbTitlePosition(e.target.value as any)}
                                      className="w-full bg-slate-50 border border-slate-150 rounded-lg p-2 text-[11px] outline-none font-bold text-stone-900"
                                    >
                                      <option value="prefix">前パーツ (Prefix)</option>
                                      <option value="suffix">後パーツ (Suffix)</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5 font-bold">レア度</label>
                                    <select 
                                      value={lbTitleRarity} 
                                      onChange={e => setLbTitleRarity(e.target.value as any)}
                                      className="w-full bg-slate-50 border border-slate-150 rounded-lg p-2 text-[11px] outline-none font-bold text-stone-900"
                                    >
                                      <option value="common">Common (コモン)</option>
                                      <option value="uncommon">Uncommon (アンコモン)</option>
                                      <option value="rare">Rare (レア)</option>
                                      <option value="epic">Epic (エピック)</option>
                                      <option value="legendary">Legendary (レジェンダリー)</option>
                                      <option value="mythic">Mythic (ミシック)</option>
                                    </select>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleLbAddTitle}
                                  className="w-full bg-amber-600 text-white rounded-lg py-2 text-xs font-black hover:bg-amber-700 transition font-bold"
                                >
                                  ログインボーナス限定として作成・登録する!
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Login Bonus Exclusive Badge Creator Form */}
                          {lbActiveCreator === 'badge' && (
                            <div className="bg-white p-3.5 rounded-xl border border-orange-200 shadow-sm space-y-3 mt-2 text-left font-bold">
                              <p className="text-[10px] font-black text-orange-950 border-b border-orange-50 pb-1 flex items-center justify-between font-bold">
                                <span>🔮 ログインボーナス専用・新規オリジナルバッジ</span>
                                <button type="button" onClick={() => setLbActiveCreator('none')} className="text-slate-400 hover:text-slate-655 font-bold">✕</button>
                              </p>
                              <div className="space-y-2.5">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5">一意のバッジID (英小文字・数字)</label>
                                    <input 
                                      type="text" 
                                      value={lbBadgeCreatorId}
                                      onChange={e => setLbBadgeCreatorId(e.target.value)}
                                      placeholder="例: bonus_claim_hero"
                                      className="w-full bg-slate-50 border border-slate-155 rounded-lg p-2 text-xs focus:bg-white outline-none font-medium text-stone-900"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5 font-bold">バッジ表示名</label>
                                    <input 
                                      type="text" 
                                      value={lbBadgeCreatorName}
                                      onChange={e => setLbBadgeCreatorName(e.target.value)}
                                      placeholder="例: 常連トップガン"
                                      className="w-full bg-slate-50 border border-slate-155 rounded-lg p-2 text-xs focus:bg-white outline-none font-medium text-stone-900"
                                      required
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-slate-500 block mb-0.5">バッジの説明テキスト</label>
                                  <textarea 
                                    value={lbBadgeCreatorDesc}
                                    onChange={e => setLbBadgeCreatorDesc(e.target.value)}
                                    placeholder="例: この限定ログインボーナスを完全制覇した証！"
                                    className="w-full bg-slate-50 border border-slate-155 rounded-lg p-2 text-xs focus:bg-white outline-none min-h-[45px] font-medium text-stone-900"
                                  />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5 font-bold">絵文字 (Emoji)</label>
                                    <input 
                                      type="text" 
                                      value={lbBadgeCreatorEmoji}
                                      onChange={e => setLbBadgeCreatorEmoji(e.target.value)}
                                      placeholder="🏆"
                                      className="w-full bg-slate-50 border border-slate-155 rounded-lg p-2 text-xs text-center focus:bg-white outline-none font-bold text-stone-900"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5 font-bold">テーマ色</label>
                                    <select 
                                      value={lbBadgeCreatorTheme} 
                                      onChange={e => setLbBadgeCreatorTheme(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-155 rounded-lg p-2 text-[10px] outline-none font-bold text-stone-900"
                                    >
                                      <option value="gold">Gold (ゴールド)</option>
                                      <option value="green">Green (グリーン)</option>
                                      <option value="blue">Blue (ブルー)</option>
                                      <option value="purple">Purple (パープル)</option>
                                      <option value="crimson">Crimson (ローズ)</option>
                                      <option value="slate">Slate (スレート)</option>
                                      <option value="yellow">Yellow (イエロー)</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5 font-bold">レア度</label>
                                    <select 
                                      value={lbBadgeCreatorRarity} 
                                      onChange={e => setLbBadgeCreatorRarity(e.target.value as any)}
                                      className="w-full bg-slate-55 border border-slate-155 rounded-lg p-2 text-[10px] outline-none font-bold text-stone-900"
                                    >
                                      <option value="common">Common</option>
                                      <option value="uncommon">Uncommon</option>
                                      <option value="rare">Rare</option>
                                      <option value="epic">Epic</option>
                                      <option value="legendary">Legendary</option>
                                      <option value="mythic">Mythic</option>
                                    </select>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleLbAddBadge}
                                  className="w-full bg-amber-600 text-white rounded-lg py-2 text-xs font-black hover:bg-amber-700 transition font-bold"
                                >
                                  ログインボーナス限定として作成・登録する!
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Interactive Board Preview & Cell Selector */}
                        <div className="border border-orange-200/50 bg-white/70 p-4 rounded-2xl shadow-inner">
                          <span className="text-[10px] font-bold text-orange-800 block mb-2 uppercase tracking-wider text-center">
                            マスの報酬設定（任意のマスを選択して下のフォームで編集）
                          </span>
                          
                          <div className={`grid gap-2 mx-auto p-1.5 bg-orange-50/50 rounded-2xl border border-orange-100/50 ${
                            lbDaysCount <= 3 ? 'grid-cols-3' :
                            lbDaysCount === 4 ? 'grid-cols-4' :
                            lbDaysCount === 7 || lbDaysCount === 14 || lbDaysCount === 21 || lbDaysCount === 28 ? 'grid-cols-7' :
                            lbDaysCount <= 9 ? 'grid-cols-3' :
                            lbDaysCount <= 16 ? 'grid-cols-4' :
                            lbDaysCount <= 25 ? 'grid-cols-5' :
                            'grid-cols-6'
                          }`}>
                            {Array.from({ length: lbDaysCount }).map((_, i) => {
                              const dayNum = i + 1;
                              const isSelected = lbSelectedCellDay === dayNum;
                              const cellData = lbRewardsMap[dayNum] || { rewardType: 'coins', rewardValue: '100', rewardName: '100' };
                              
                              let emoji = '🪙';
                              if (cellData.rewardType === 'shards') emoji = '💎';
                              if (cellData.rewardType === 'special_title') emoji = '🏷️';
                              if (cellData.rewardType === 'special_badge') emoji = '🏆';

                              return (
                                <button
                                  type="button"
                                  key={dayNum}
                                  onClick={() => {
                                    setLbSelectedCellDay(dayNum);
                                    setLbCellRewardType(cellData.rewardType);
                                    setLbCellRewardValue(cellData.rewardValue);
                                    setLbCellRewardName(cellData.rewardName);
                                  }}
                                  className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-1.5 text-center relative font-semibold transition-all ${
                                    isSelected 
                                      ? 'ring-4 ring-orange-400 border-orange-355 scale-105 bg-orange-55 z-10' 
                                      : 'bg-white border-orange-105 hover:bg-orange-50/20 text-orange-950'
                                  }`}
                                >
                                  <span className="text-[7px] text-stone-400 font-extrabold leading-none pb-0.5">Day{dayNum}</span>
                                  <span className="text-xs mt-0.5">{emoji}</span>
                                  <span className="text-[6px] text-orange-950 font-black truncate max-w-full block leading-none pt-0.5">
                                    {cellData.rewardValue || '設定中'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Selected Cell Editing Form */}
                          {lbSelectedCellDay !== null && (
                            <div className="bg-orange-50/70 p-3.5 border border-orange-200/40 rounded-xl mt-4 space-y-3.5 text-left font-semibold text-orange-900">
                              <p className="text-[10px] text-orange-950 font-black border-b border-orange-100 pb-1.5 flex items-center gap-1">
                                <span className="bg-orange-500 text-white rounded-full w-5 h-5 inline-flex items-center justify-center text-[10px] font-black">{lbSelectedCellDay}</span>
                                マスの報酬編集
                              </p>

                              <div className="grid grid-cols-2 gap-3.5">
                                <div>
                                  <label className="text-[9px] font-bold text-orange-400 block mb-1">報酬種別</label>
                                  <select
                                    value={lbCellRewardType}
                                    onChange={e => handleUpdateSelectedCell('rewardType', e.target.value as any)}
                                    className="w-full bg-white border border-orange-105 rounded-xl p-2 text-xs focus:ring-1 focus:ring-orange-500 outline-none font-bold text-orange-950"
                                  >
                                    <option value="coins">Gacha Coins (コイン)</option>
                                    <option value="shards">欠片 (シャード)</option>
                                    <option value="special_title">限定2つ名パーツ</option>
                                    <option value="special_badge">限定バッジ名</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-orange-400 block mb-1">
                                    {lbCellRewardType === 'coins' ? '獲得コイン数' : lbCellRewardType === 'shards' ? '欠片の個数' : '割り当てID'}
                                  </label>
                                  <input 
                                    type="text"
                                    value={lbCellRewardValue}
                                    onChange={e => handleUpdateSelectedCell('rewardValue', e.target.value)}
                                    placeholder={lbCellRewardType === 'special_title' ? '例: custom_t_prefix_xxx' : lbCellRewardType === 'special_badge' ? '例: badge_xxx' : '例: 100'}
                                    className="w-full bg-white border border-orange-105 rounded-xl p-2 text-xs focus:ring-1 focus:ring-orange-500 outline-none font-bold text-orange-950"
                                    required
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-[9px] font-bold text-orange-400 block mb-1">表示名 / 特典表記</label>
                                <input 
                                  type="text"
                                  value={lbCellRewardName}
                                  onChange={e => handleUpdateSelectedCell('rewardName', e.target.value)}
                                  placeholder="例: 特製サマーバッジ獲得！"
                                  className="w-full bg-white border border-orange-105 rounded-xl p-2 text-xs focus:ring-1 focus:ring-orange-500 outline-none font-bold text-orange-950"
                                  required
                                />
                              </div>

                              {/* Special asset copy indicators */}
                              {(lbCellRewardType === 'special_badge' || lbCellRewardType === 'special_title') && (
                                <div className="p-2.5 bg-orange-100/35 border border-orange-200/20 rounded-xl text-[8px] max-h-24 overflow-y-auto">
                                  <span className="font-extrabold text-orange-950 block mb-1">【クリックでIDをコピー・入力】</span>
                                  <div className="flex flex-wrap gap-1">
                                    {lbCellRewardType === 'special_badge' ? (
                                      customBadges.map(item => (
                                        <button
                                          type="button"
                                          key={item.id}
                                          onClick={() => handleUpdateSelectedCell('rewardValue', item.id)}
                                          className="bg-white hover:bg-orange-100 text-orange-950 px-1 py-0.5 rounded border border-orange-200 font-bold tracking-tight text-[8px]"
                                          title={item.name}
                                        >
                                          {item.emoji} {item.name}
                                        </button>
                                      ))
                                    ) : (
                                      customTitleParts.map(item => (
                                        <button
                                          type="button"
                                          key={item.id}
                                          onClick={() => handleUpdateSelectedCell('rewardValue', item.id)}
                                          className="bg-white hover:bg-orange-100 text-orange-950 px-1 py-0.5 rounded border border-orange-200 font-bold tracking-tight text-[8px]"
                                          title={item.text}
                                        >
                                          {item.text} ({item.position === 'prefix' ? '前' : '後'})
                                        </button>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <button 
                          type="submit"
                          className="w-full bg-orange-500 text-white hover:bg-orange-600 py-3 rounded-2xl font-black transition-all shadow-md text-xs mt-4"
                        >
                          限定ログインボーナスを保存 🎯
                        </button>
                      </form>
                    </div>

                    {/* View Login Bonus Boards List */}
                    <div className="space-y-4 xl:col-span-7">
                      <h3 className="text-xs font-black text-orange-300 uppercase tracking-widest pl-1 font-bold">
                        作成済みログインボーナス一覧 ({loginBonusBoards.length})
                      </h3>
                      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                        {loginBonusBoards.map((board) => (
                          <div key={board.id} className="bg-white border-2 border-orange-50 rounded-3xl p-5 shadow-sm space-y-3 font-semibold relative overflow-hidden text-left">
                            {board.active && (
                              <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full m-4 animate-ping" />
                            )}
                            
                            <div className="flex items-start justify-between gap-4 border-b border-orange-50 pb-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="font-extrabold text-xs text-orange-950 font-bold">{board.name}</span>
                                  {board.active ? (
                                    <span className="bg-green-50 border border-green-100 text-green-600 font-extrabold text-[8px] px-2 py-0.5 rounded-full uppercase">開催中 (Active)</span>
                                  ) : (
                                    <span className="bg-slate-50 border border-slate-100 text-slate-400 font-extrabold text-[8px] px-2 py-0.5 rounded-full uppercase">停止</span>
                                  )}
                                </div>
                                <p className="text-[9px] text-slate-550 mt-0.5 font-bold">グリッド型: {board.gridType} ({board.daysCount}日間分)</p>
                              </div>
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => handleToggleLoginBonusActive(board.id, board.active)}
                                  className={`px-2 py-1 rounded-xl text-[9px] font-black border transition-all ${
                                    board.active ? 'bg-orange-50 border-orange-100 text-orange-600 hover:bg-orange-100' : 'bg-green-50 border-green-100 text-green-600 hover:bg-green-100'
                                  }`}
                                  title={board.active ? '停止' : '有効化'}
                                >
                                  {board.active ? '停止' : '稼働'}
                                </button>
                                <button 
                                  onClick={() => handleDeleteLoginBonusBoard(board.id, board.name)}
                                  className="text-orange-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all"
                                  title="削除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Rewards Preview List */}
                            <div className="bg-stone-50/50 p-3 rounded-2xl border border-stone-200/10">
                              <p className="text-[8px] font-bold text-stone-400 uppercase tracking-wide mb-1.5 font-bold">🎁 報酬スケジュール</p>
                              <div className="grid grid-cols-5 gap-1.5 max-h-24 overflow-y-auto pr-1">
                                {board.rewards?.map((reward: any) => {
                                  let emoji = '🪙';
                                  if (reward.rewardType === 'shards') emoji = '💎';
                                  if (reward.rewardType === 'special_title') emoji = '🏷️';
                                  if (reward.rewardType === 'special_badge') emoji = '🏆';

                                  return (
                                    <div key={reward.day} className="bg-white border rounded-lg p-1 text-center scale-95 select-all">
                                      <p className="text-[6px] text-stone-500 leading-none">Day{reward.day}</p>
                                      <p className="text-[10px] mt-0.5 leading-none">{emoji}</p>
                                      <p className="text-[6px] font-black text-rose-600 truncate max-w-full block leading-none pt-0.5">{reward.rewardValue}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="text-[8px] text-slate-400 font-mono select-none">ID: {board.id}</div>
                          </div>
                        ))}
                        {loginBonusBoards.length === 0 && (
                          <div className="bg-white border-2 border-orange-50 rounded-3xl p-10 text-center text-xs text-orange-300 font-bold">
                            現在作成済みの限定ログインボーナスボードはありません。
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : tab === 'admins' ? (
            <div className="flex flex-col h-full overflow-hidden text-left w-full animate-in fade-in duration-300">
              <h3 className="text-sm font-extrabold text-orange-850 uppercase tracking-widest pl-1 mb-4 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-orange-600" />
                管理者管理
              </h3>
              <p className="text-[11px] text-orange-600/80 mb-6 font-bold leading-relaxed">
                メイン管理者（kuailitengben@gmail.com）専用の管理機能です。<br />
                他アカウントの管理者権限の付与、ならびに解除が可能です。デフォルトで管理者権限を持つ「poco （nakashi198006130423@gmail.com）」も、本画面よりいつでも解除・再付与が行えます。
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Add Admin Form */}
                <div className="bg-orange-50/50 border border-orange-100 rounded-3xl p-6 shadow-sm">
                  <h4 className="text-xs font-black text-orange-950 uppercase tracking-widest mb-4 font-bold">新規管理者登録 / 権限付与</h4>
                  <form onSubmit={handleAddAdmin} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-orange-500 block mb-1 uppercase tracking-wide">対象ユーザーの UID</label>
                      <input 
                        type="text" 
                        value={newAdminUid}
                        onChange={e => setNewAdminUid(e.target.value)}
                        placeholder="例: zX9yW2... (対象者のプロフィール等からコピー)"
                        className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none font-bold text-orange-950"
                        required
                      />
                      <span className="text-[8.5px] text-slate-400 mt-1.5 block leading-relaxed">
                        ※対象ユーザーのUIDを入力してください。プロフィール等からご確認いただけます。
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-orange-500 block mb-1 uppercase tracking-wide">メールアドレス</label>
                      <input 
                        type="email" 
                        value={newAdminEmail}
                        onChange={e => setNewAdminEmail(e.target.value)}
                        placeholder="例: sub-admin@gmail.com"
                        className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none font-bold text-orange-950"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-orange-500 block mb-1 uppercase tracking-wide">管理者名 (ニックネーム)</label>
                      <input 
                        type="text" 
                        value={newAdminName}
                        onChange={e => setNewAdminName(e.target.value)}
                        placeholder="例: poco"
                        className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none font-bold text-orange-950"
                        required
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-2xl font-bold transition-all shadow-md text-xs mt-2"
                    >
                      管理者を追加 / 権限を付与 👑
                    </button>
                  </form>
                </div>

                {/* List Admins */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-orange-950 uppercase tracking-widest pl-1 font-bold">現在の管理者一覧 ({adminsList.length})</h4>
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                    {adminsList.map((admin) => (
                      <div key={admin.id} className="bg-white border-2 border-orange-50 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4 font-bold">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                            <Shield className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-xs text-orange-950">{admin.name}</span>
                              {admin.email === 'kuailitengben@gmail.com' && (
                                <span className="bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase scale-90">
                                  Main Admin
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-orange-600 font-bold mt-1 leading-relaxed font-mono">{admin.email}</p>
                            <code className="text-[8.5px] text-slate-400 block font-mono select-all font-bold mt-0.5">UID: {admin.id}</code>
                          </div>
                        </div>
                        {admin.email !== 'kuailitengben@gmail.com' && (
                          <button 
                            type="button"
                            onClick={() => handleRemoveAdmin(admin.id, admin.email, admin.name)}
                            className="text-orange-355 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-xl transition-all shrink-0 pointer-events-auto text-xs flex items-center gap-1 font-extrabold"
                            title="権限解除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>解除</span>
                          </button>
                        )}
                      </div>
                    ))}
                    {adminsList.length === 0 && (
                      <p className="text-center py-10 text-xs text-orange-300">管理者が登録されていません。</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : tab === 'ranking_rewards' ? (
            <div className="max-w-md mx-auto space-y-6 text-left">
              <h3 className="text-sm font-bold text-orange-300 uppercase tracking-widest text-center">ランキング報酬設定 👑</h3>
              <p className="text-xs text-orange-850 leading-relaxed font-bold bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                ユーザーが日間・週間・月間ランキング（上位5名）にランクインした際に自動付与される Gacha Coins の枚数と、その報酬付与の有効期限を設定できます。期限を過ぎると、自動付与は休止されます。
              </p>
              
              <form onSubmit={handleSaveRankingRewards} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide ml-1">第 1 位の報酬 (Coins)</label>
                    <input 
                      type="number" 
                      value={rank1Coins}
                      onChange={e => setRank1Coins(Number(e.target.value))}
                      className="w-full bg-orange-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all font-mono font-bold"
                      min={0}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide ml-1">第 2 位の報酬 (Coins)</label>
                    <input 
                      type="number" 
                      value={rank2Coins}
                      onChange={e => setRank2Coins(Number(e.target.value))}
                      className="w-full bg-orange-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all font-mono font-bold"
                      min={0}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide ml-1">第 3 位の報酬 (Coins)</label>
                    <input 
                      type="number" 
                      value={rank3Coins}
                      onChange={e => setRank3Coins(Number(e.target.value))}
                      className="w-full bg-orange-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all font-mono font-bold"
                      min={0}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide ml-1">第 4〜5 位の報酬 (Coins)</label>
                    <input 
                      type="number" 
                      value={rank4to5Coins}
                      onChange={e => setRank4to5Coins(Number(e.target.value))}
                      className="w-full bg-orange-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all font-mono font-bold"
                      min={0}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-orange-400 block mb-1 uppercase tracking-wide ml-1 font-bold">報酬付与の有効期限 (いつまで配布するか)</label>
                  <input 
                    type="date" 
                    value={rankRewardEndDate}
                    onChange={e => setRankRewardEndDate(e.target.value)}
                    className="w-full bg-orange-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all font-mono font-bold"
                    required
                  />
                  <p className="text-[9px] text-orange-400 mt-1 ml-1 font-bold">※ この日付が「今日」以降であれば報酬付与は有効です（対象日を含む）。</p>
                </div>

                <button 
                  type="submit"
                  disabled={savingRewards}
                  className="w-full bg-orange-950 text-white hover:bg-orange-900 py-4 rounded-2xl font-black transition-all flex justify-center items-center gap-2 shadow-lg disabled:opacity-50 mt-6"
                >
                  {savingRewards ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse fill-yellow-250" />
                      報酬設定を保存する
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : tab === 'gift_codes' ? (
            <div className="space-y-6 text-left">
              <div className="flex items-center gap-2 justify-between">
                <div>
                  <h3 className="text-sm font-bold text-orange-300 uppercase tracking-widest">配布プレゼントコード管理 🎟️</h3>
                  <p className="text-[11px] text-orange-400 font-bold mt-1">運営からユーザーへのコイン(GC)配布やギフト企画を一括管理・発行・追跡します</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Issue Gacha Coins (Admin spec) */}
                <form onSubmit={handleAdminCreateCode} className="lg:col-span-5 bg-white border border-orange-100 p-5 rounded-[28px] space-y-4 shadow-sm text-orange-950 font-sans">
                  <h4 className="text-xs font-black text-orange-900 border-b pb-2 flex items-center gap-1.5">
                    <span className="text-sm">✉️</span>
                    <span>配布コードの新規作成 (無償)</span>
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-orange-400 block ml-1 uppercase">コード（空欄でランダム生成）</label>
                    <input 
                      type="text"
                      placeholder="例: INVITATION-2026"
                      value={adminNewCode}
                      onChange={e => setAdminNewCode(e.target.value.toUpperCase())}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-orange-500 font-mono font-bold uppercase tracking-wide"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-orange-400 block ml-1 uppercase">配布コイン額 (GC / 人)</label>
                      <input 
                        type="number"
                        min={1}
                        value={adminRewardGc}
                        onChange={e => setAdminRewardGc(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-orange-500 font-bold text-right"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-orange-400 block ml-1 uppercase">最大使用数 (定員)</label>
                      <input 
                        type="number"
                        min={1}
                        value={adminMaxUses}
                        onChange={e => setAdminMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-orange-500 font-bold text-right"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-orange-400 block ml-1 uppercase">キャンペーン名 / 備考 (任意)</label>
                    <input 
                      type="text"
                      placeholder="例: 新規登録キャンペーン"
                      value={adminCampaignName}
                      onChange={e => setAdminCampaignName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-orange-500 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-orange-400 block ml-1 uppercase">対象UID（特定ユーザーのみに制限・任意）</label>
                    <input 
                      type="text"
                      placeholder="UID (空欄で全ユーザー対象)"
                      value={adminTargetUid}
                      onChange={e => setAdminTargetUid(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-orange-500 font-mono font-bold"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3 bg-orange-950 hover:bg-orange-900 text-white font-black text-xs rounded-xl shadow-md transition active:scale-95 text-center cursor-pointer"
                  >
                    配布コードを作成・有効化する
                  </button>
                </form>

                {/* Gift Codes List */}
                <div className="lg:col-span-7 bg-white/5 border border-orange-200/20 p-5 rounded-[28px] space-y-4">
                  <h4 className="text-xs font-bold text-orange-300 border-b border-orange-200/10 pb-2 flex items-center justify-between">
                    <span>🎟️ 配布中のコード一覧 ({adminGiftCodes.length})</span>
                    <span className="text-[9px] text-orange-400">リアルタイム同期</span>
                  </h4>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {adminGiftCodes.map((gc) => {
                      const isExpired = new Date(gc.expire_at) < new Date();
                      const isComplete = (gc.used_count || 0) >= (gc.max_uses || 1);
                      const isSelected = adminSelectedCodeId === gc.code;

                      return (
                        <div 
                          key={gc.code} 
                          className={cn(
                            "bg-orange-950/20 rounded-2xl p-4 border transition font-sans text-xs space-y-2.5",
                            isSelected ? "border-amber-400" : "border-orange-500/15"
                          )}
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <span className="bg-orange-500 text-white font-mono font-black py-0.5 px-2 rounded-lg text-[11px] block text-center tracking-wider max-w-fit select-all">
                                {gc.code}
                              </span>
                              <p className="text-[9.5px] text-orange-200/80 mt-0.5">
                                配布量: <span className="text-amber-300 font-bold">{gc.reward_gc} GC</span> | 限度: <span className="font-bold text-orange-200">{gc.used_count}/{gc.max_uses}回</span>
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className={cn(
                                "px-2 py-0.5 text-[8px] font-black rounded-lg select-none",
                                gc.active && !isExpired && !isComplete ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-zinc-800 text-zinc-400"
                              )}>
                                {isComplete ? '上限終了' : isExpired ? '期限切れ' : gc.active ? '稼働中' : '停止中'}
                              </span>
                              <span className="text-[8.5px] text-orange-400">BY {gc.creator_name || 'ADMIN'}</span>
                            </div>
                          </div>

                          <div className="text-[10px] text-orange-200/70 space-y-0.5 bg-orange-950/10 p-2.5 rounded-xl border border-orange-500/5">
                            <p className="truncate">🎯 企画名: <span className="font-bold text-orange-100">{gc.campaign_name || 'なし'}</span></p>
                            {gc.target_uid && <p className="truncate text-amber-200">🔒 対象者限定 (UID: {gc.target_uid})</p>}
                            <p className="text-[9px] text-orange-400">📅 作成: {new Date(gc.created_at).toLocaleString()} | 終了: {new Date(gc.expire_at).toLocaleDateString()}</p>
                          </div>

                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              onClick={async () => {
                                try {
                                  await updateDoc(doc(db, 'gift_codes', gc.code), {
                                    active: !gc.active
                                  });
                                } catch (err) {
                                  console.error("Failed to toggle activate in admin:", err);
                                }
                              }}
                              className="px-2.5 py-1 bg-orange-950 hover:bg-orange-900 border border-orange-500/20 text-orange-200 text-[9px] rounded-lg transition font-bold cursor-pointer"
                            >
                              {gc.active ? '一時停止' : '再開'}
                            </button>
                            <button
                              onClick={() => {
                                if (isSelected) {
                                  setAdminSelectedCodeId(null);
                                } else {
                                  setAdminSelectedCodeId(gc.code);
                                }
                              }}
                              className={cn(
                                "px-2.5 py-1 border text-[9px] rounded-lg transition font-bold cursor-pointer",
                                isSelected ? "bg-amber-500 text-orange-950 border-amber-400" : "bg-orange-500/20 text-amber-200 border-orange-500/30"
                              )}
                            >
                              {isSelected ? 'ログを閉じる' : '使用ログ追跡 📊'}
                            </button>
                            <button
                              onClick={async () => {
                                const confirmed = window.confirm(`警告：本当に配布コード「${gc.code}」を強制抹消しますか？`);
                                if (!confirmed) return;
                                try {
                                  await deleteDoc(doc(db, 'gift_codes', gc.code));
                                  if (isSelected) setAdminSelectedCodeId(null);
                                } catch (err) {
                                  console.error("Failed to delete code in admin:", err);
                                }
                              }}
                              className="px-2.5 py-1 bg-red-650 hover:bg-red-700/80 border border-red-550/20 text-rose-200 text-[9px] rounded-lg transition font-bold cursor-pointer"
                            >
                              完全削除
                            </button>
                          </div>

                          {/* Selected Code Redemptions log display */}
                          {isSelected && (
                            <div className="bg-black/40 border border-amber-500/30 rounded-xl p-3 space-y-2 text-[10px] animate-in slide-in-from-top-2 duration-120">
                              <p className="font-extrabold text-amber-300">📊 「{gc.code}」の使用済みログ ({adminCodeRedemptions.length}名)</p>
                              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                {adminCodeRedemptions.map((red) => (
                                  <div key={red.id} className="flex justify-between border-b border-orange-500/5 pb-1 font-mono text-orange-200">
                                    <span className="truncate max-w-[120px] select-all font-bold" title={red.user_uid}>👤 {red.user_uid}</span>
                                    <span className="text-orange-400">{new Date(red.redeemed_at).toLocaleString()}</span>
                                  </div>
                                ))}
                                {adminCodeRedemptions.length === 0 && (
                                  <p className="text-[9.5px] text-orange-355 italic py-2">このコードはまだ誰にも使用されていません。</p>
                                )}
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })}

                    {adminGiftCodes.length === 0 && (
                      <p className="text-center py-12 text-[10.5px] text-slate-400">現在発行された配布コードはありません。左フォームより発行してください。</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ) : tab === 'bot_sim' ? (
            <BotSimTab
              botLogs={botLogs}
              setBotLogs={setBotLogs}
              isSimulating={isSimulating}
              triggerBotSimulation={triggerBotSimulation}
            />
          ) : tab === 'jse_creations' ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-orange-950/20 p-4.5 rounded-[22px] border border-orange-500/15">
                <div>
                  <h3 className="text-sm font-extrabold text-amber-300">JSE 地味株・新規現象上場審査</h3>
                  <p className="text-[10px] text-orange-200 mt-1">
                    ユーザーが一定量のコイン（デポジット）をかけて申請した自作の日常現象です。誹謗中傷、人名、代表的企業ブランド、学校名、差別表現が無いか審査してください。
                  </p>
                </div>
                <div className="bg-orange-500 text-white font-extrabold text-[10px] px-3 py-1 rounded-full">
                  未処理件数: {jseRequests.filter(r => r.status === 'pending').length}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {jseRequests.map((req) => {
                  const isPending = req.status === 'pending';
                  const isApproved = req.status === 'approved';
                  return (
                    <div 
                      key={req.id} 
                      className={cn(
                        "p-5 rounded-3xl border transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-orange-950/10",
                        isPending ? "border-amber-450 bg-amber-500/5 animate-pulse-slow" : isApproved ? "border-emerald-500/30 bg-emerald-550/5" : "border-stone-800 bg-stone-900/40"
                      )}
                    >
                      <div className="space-y-2 flex-grow">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl p-2 bg-black/20 rounded-xl">{req.emoji || '📈'}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-amber-200">{req.stockName}</h4>
                              <span className="text-[8.5px] uppercase font-mono tracking-widest bg-orange-400 text-orange-950 px-2 py-0.5 rounded-md font-bold">
                                {req.category || '未分類'}
                              </span>
                            </div>
                            <p className="text-[10px] text-orange-200/80 mt-0.5 font-mono">{req.stockNameEn}</p>
                          </div>
                        </div>

                        <div className="text-[10.5px] text-stone-200 bg-black/15 p-3 rounded-2xl border border-white/5 space-y-1">
                          <p className="font-bold text-amber-200/90">💡 現象・商品説明文:</p>
                          <p className="leading-relaxed whitespace-pre-wrap">{req.descJa || '説明文がありません。'}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9.5px] font-bold text-orange-300">
                          <span>👤 申請者: <strong className="text-white select-all">{req.founderName || '匿名'}</strong></span>
                          <span>🆔 申請者ID: <code className="text-stone-400 select-all">{req.founderId}</code></span>
                          <span>💰 かけたコイン額: <span className="text-amber-300 font-extrabold">{req.coinsSpent} コイン</span></span>
                          <span>📅 申請日時: <span className="text-stone-400">{req.createdAt ? new Date(req.createdAt).toLocaleString() : '不明'}</span></span>
                        </div>

                        {req.rejectionReason && (
                          <div className="text-[10px] text-red-400 font-bold mt-2 bg-red-500/15 p-2 rounded-xl border border-red-500/25 max-w-xl">
                            ❌ 却下理由: {req.rejectionReason}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleApproveJseRequest(req)}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-[10.5px] font-black rounded-xl transition shadow-lg shadow-emerald-500/10 cursor-pointer"
                            >
                              上場承認 ✅
                            </button>
                            <button
                              onClick={() => handleRejectJseRequest(req)}
                              className="px-4 py-2 bg-red-650 hover:bg-red-700 active:scale-95 text-white text-[10.5px] font-black rounded-xl transition shadow-lg shadow-red-500/10 cursor-pointer"
                            >
                              却下・返金 ❌
                            </button>
                          </>
                        ) : (
                          <span className={cn(
                            "px-3 py-1 text-[10px] font-black rounded-full select-none",
                            isApproved ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20" : "bg-zinc-850 text-zinc-450"
                          )}>
                            {isApproved ? '承認・上場済み' : '非承認・返金済み'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {jseRequests.length === 0 && (
                  <div className="text-center py-16 text-slate-450 space-y-2">
                    <span className="text-4xl">🏜️</span>
                    <p className="text-xs font-bold font-mono">現在、新しい上場申請はありません。</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-orange-300 uppercase tracking-widest text-center">サービス統計</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex flex-col items-center justify-center text-center">
                  <Users className="w-8 h-8 text-orange-400 mb-2" />
                  <span className="text-2xl font-bold text-orange-950">{stats?.totalUsers || 0}</span>
                  <span className="text-[10px] font-bold text-orange-300 uppercase">登録ユーザー</span>
                </div>
                <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex flex-col items-center justify-center text-center">
                  <Activity className="w-8 h-8 text-orange-400 mb-2" />
                  <span className="text-2xl font-bold text-orange-950">{stats?.activeUsers24h || 0}</span>
                  <span className="text-[10px] font-bold text-orange-300 uppercase">アクティブ(24h)</span>
                </div>
                <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex flex-col items-center justify-center text-center">
                  <ImageIcon className="w-8 h-8 text-orange-400 mb-2" />
                  <span className="text-2xl font-bold text-orange-950">{stats?.totalScenes || 0}</span>
                  <span className="text-[10px] font-bold text-orange-300 uppercase">合計シーン数</span>
                </div>
              </div>
              <p className="text-center text-[10px] text-orange-200 pt-10">※ 1分ごとに自動更新されます</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function AdminMessagesModal({ messages, onClose }: { messages: AdminMessage[], onClose: () => void }) {
  const { language, t } = useLanguage();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Mark as read when opened
    messages.forEach(msg => {
      if (!msg.read) {
        updateDoc(doc(db, 'admin_messages', msg.id), { read: true });
      }
    });

    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, [messages]);

  const handleRequestPermission = () => {
    const showMockSuccess = () => {
      setPermissionStatus('granted');
      alert(t('🔔 通知許可を設定しました！\n（プレビュー環境の制限を考慮し、擬似的に通知オンにしました。フォローされた時やDMの受信時にリアルタイムに通知されます）', '🔔 Notifications enabled!\n(Simulated for preview environment)'));
    };

    if ('Notification' in window) {
      try {
        Notification.requestPermission().then((status) => {
          setPermissionStatus(status);
          if (status === 'granted') {
            try {
              new Notification('地味っち', {
                body: '通知が有効になりました！🎉',
                icon: 'https://api.dicebear.com/7.x/bottts/svg?seed=jimicchi'
              });
            } catch (e) {
              console.warn("Notification construct fail:", e);
            }
          } else {
            showMockSuccess();
          }
        }).catch((err) => {
          console.warn("Notification request failed:", err);
          showMockSuccess();
        });
      } catch (err) {
        console.warn("Notification exception:", err);
        showMockSuccess();
      }
    } else {
      showMockSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="relative bg-white w-full max-w-lg max-h-[70vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-orange-50 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2 text-orange-950">
            <Bell className="w-5 h-5" />
            お知らせ
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-orange-50 rounded-full"><X className="w-5 h-5 text-orange-300" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {permissionStatus === 'default' && (
            <div className="bg-orange-50/70 border border-orange-100 p-4 rounded-3xl text-center shadow-sm select-none animate-in fade-in duration-300">
              <p className="text-xs text-orange-950 font-extrabold mb-1.5 flex items-center justify-center gap-1">
                <span>🔔</span> スマホ・ブラウザに直接通知を受け取りますか？
              </p>
              <p className="text-[10px] text-orange-400 mb-2.5 font-medium leading-relaxed">
                フォローされた時、フォロー中ユーザーの新規投稿、イベント開催時、DM受信時にリアルタイムにお知らせします。
              </p>
              <button 
                onClick={handleRequestPermission}
                className="bg-orange-500 hover:bg-orange-600 hover:scale-105 active:scale-95 text-white text-[11px] font-black px-4 py-2.5 rounded-2xl transition-all shadow-md shadow-orange-500/10 cursor-pointer"
              >
                通知を許可する
              </button>
            </div>
          )}

          {permissionStatus === 'granted' && (
            <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl text-center shadow-sm text-emerald-800 font-bold select-none animate-in fade-in duration-300">
              <p className="text-xs font-extrabold mb-1 flex items-center justify-center gap-1">
                <span>🟢</span> 通知設定：ON
              </p>
              <p className="text-[10px] text-emerald-600/85 font-medium">
                フォロー等のお知らせや、新着DMがリアルタイムに通知されます。
              </p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={cn("p-4 rounded-2xl border transition-all", msg.read ? "bg-white border-orange-50" : "bg-orange-50 border-orange-100 shadow-sm")}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-orange-900 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  管理者 Poco
                </span>
                <span className="text-[9px] text-orange-300">{formatDistanceToNow(msg.createdAt.toDate(), { locale: language === 'ja' ? ja : undefined, addSuffix: true })}</span>
              </div>
              <p className="text-xs text-orange-800 leading-relaxed font-medium">{msg.content}</p>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center py-10">
              <p className="text-orange-200">新しいお知らせはありません。</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ChatListModal({ onClose, onSelectChat, user }: { onClose: () => void, onSelectChat: (id: string) => void, user: User }) {
  const [chats, setChats] = useState<(Chat & { otherProfile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, async (snap) => {
      try {
        const chatData: any[] = [];
        for (const d of snap.docs) {
          const data = d.data() as Chat;
          const otherUid = data.participants.find(p => p !== user.uid);
          if (otherUid) {
            try {
              const profileSnap = await getDoc(doc(db, 'profiles', otherUid));
              chatData.push({ 
                id: d.id, 
                ...data, 
                otherProfile: profileSnap.exists() ? { uid: otherUid, ...profileSnap.data() } : { uid: otherUid, displayName: '不明なユーザー', photoURL: '' }
              });
            } catch (pError) {
              console.error('Profile fetch error for chat:', otherUid, pError);
              chatData.push({ id: d.id, ...data });
            }
          }
        }
        
        const getTime = (val: any) => {
          if (!val) return 0;
          if (typeof val.toMillis === 'function') return val.toMillis();
          if (val instanceof Date) return val.getTime();
          return Number(val) || 0;
        };

        chatData.sort((a: any, b: any) => getTime(b.updatedAt) - getTime(a.updatedAt));
        setChats(chatData);
        setLoading(false);
      } catch (error) {
        console.error('Chat update process error:', error);
        setLoading(false);
      }
    }, (error) => {
      console.error('Chat list onSnapshot error:', error);
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="relative bg-white w-full max-w-lg max-h-[70vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-orange-50 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2 text-orange-950">
            <MessageSquare className="w-5 h-5 text-orange-500" />
            メッセージ
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-orange-50 rounded-full"><X className="w-5 h-5 text-orange-300" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-200" /></div>
          ) : chats.length === 0 ? (
            <div className="text-center py-10 text-orange-200 text-sm italic">まだメッセージがありません。</div>
          ) : (
            chats.map(chat => (
              <button 
                key={chat.id} 
                onClick={() => onSelectChat(chat.id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-orange-50 rounded-2xl transition-all border border-transparent hover:border-orange-100 group"
              >
                <img src={chat.otherProfile?.photoURL} alt="" className="w-12 h-12 rounded-full border border-orange-50 group-hover:scale-105 transition-transform" />
                <div className="text-left flex-1 min-w-0">
                  <p className="font-bold text-orange-950 text-sm truncate">{chat.otherProfile?.displayName}</p>
                  <p className="text-xs text-orange-400 truncate">{chat.lastMessage || 'メッセージを送りましょう'}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-orange-200 group-hover:text-orange-400" />
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ChatDialog({ chatId, onClose, user, userProfile }: { chatId: string, onClose: () => void, user: User, userProfile?: Profile | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { language } = useLanguage();

  useEffect(() => {
    const fetchChat = async () => {
      const snap = await getDoc(doc(db, 'chats', chatId));
      if (snap.exists()) {
        const otherUid = (snap.data().participants as string[]).find(p => p !== user.uid);
        if (otherUid) {
          const profileSnap = await getDoc(doc(db, 'profiles', otherUid));
          if (profileSnap.exists()) setOtherProfile({ uid: otherUid, ...profileSnap.data() } as Profile);
        }
      }
    };
    fetchChat();

    const q = query(collection(db, 'chats', chatId, 'messages'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs: Message[] = [];
      snap.forEach(d => {
        const data = d.data() as Message;
        const msgId = d.id;
        msgs.push({ id: msgId, ...data } as Message);

        // Mark incoming messages as read when viewed
        if (data.senderId !== user.uid && !data.read) {
          updateDoc(doc(db, 'chats', chatId, 'messages', msgId), { read: true }).catch(err => {
            console.error("Failed to mark message as read:", err);
          });
        }
      });
      
      const getTime = (val: any) => {
        if (!val) return Date.now();
        if (typeof val.toMillis === 'function') return val.toMillis();
        if (val instanceof Date) return val.getTime();
        return Number(val) || Date.now();
      };

      // Sort client-side
      msgs.sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt));
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
      console.error('Message fetch error:', error);
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });
    return () => unsubscribe();
  }, [chatId, user.uid]);

  const sendMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    const content = newMsg;
    setNewMsg('');
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        chatId,
        senderId: user.uid,
        content,
        createdAt: serverTimestamp(),
        read: false
      });
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: content,
        updatedAt: serverTimestamp()
      });

      // Send live DM notification inside admin_messages to candidate
      if (otherProfile?.uid) {
        await addDoc(collection(db, 'admin_messages'), {
          recipientId: otherProfile.uid,
          senderId: user.uid,
          content: `💬 ${userProfile?.displayName || user.displayName || '誰か'}さんから新しい内緒話(DM): 「${content.slice(0, 20)}${content.length > 20 ? '...' : ''}」`,
          createdAt: serverTimestamp(),
          read: false,
          type: 'dm'
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div 
        initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
        className="relative bg-white w-full max-w-lg h-[80vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-orange-50"
      >
        <div className="p-4 border-b border-orange-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-orange-50 rounded-full"><ArrowLeft className="w-4 h-4 text-orange-300" /></button>
            <img src={otherProfile?.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=fallback'} alt="" className="w-8 h-8 rounded-full border border-orange-50" />
            <p className="font-bold text-orange-950 text-sm">{otherProfile?.displayName}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={cn("flex flex-col mb-2", msg.senderId === user.uid ? "items-end" : "items-start")}>
              <div className="flex items-end gap-2 max-w-[85%]">
                {msg.senderId === user.uid && (
                  <span className="text-[10px] text-orange-300 font-bold select-none mb-1">
                    {msg.read ? '既読' : '未読'}
                  </span>
                )}
                <div className={cn(
                  "p-4 rounded-3xl text-sm font-medium leading-relaxed shadow-sm break-all",
                  msg.senderId === user.uid ? "bg-orange-500 text-white rounded-tr-none" : "bg-orange-50 text-orange-950 rounded-tl-none border border-orange-100"
                )}>
                  {msg.content}
                </div>
              </div>
              <span className="text-[9px] text-orange-300 mt-1 px-1">
                {msg.createdAt && typeof msg.createdAt.toDate === 'function' ? formatDistanceToNow(msg.createdAt.toDate(), { locale: language === 'ja' ? ja : undefined, addSuffix: true }) : ''}
              </span>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>

        <form onSubmit={sendMsg} className="p-6 border-t border-orange-50 bg-orange-50/20">
          <div className="relative">
            <input 
              type="text" 
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              placeholder="メッセージを入力..."
              className="w-full bg-white border border-orange-100 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all pr-12 text-orange-950 placeholder:text-orange-200"
            />
            <button 
              type="submit"
              disabled={!newMsg.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-orange-500 disabled:opacity-30 hover:scale-110 transition-transform"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function AnnouncementModal({ announcement, onClose }: { announcement: Announcement, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-orange-950/40 backdrop-blur-md" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 50 }}
        className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden"
      >
        <div className="absolute top-4 right-4 z-10">
          <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {announcement.imageUrl && (
          <div className="aspect-video bg-orange-50 overflow-hidden">
            <img src={announcement.imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-8 sm:p-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-orange-100 p-3 rounded-full text-orange-600">
              <Volume2 className="w-6 h-6" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-orange-950 mb-4">{announcement.title}</h2>
          <p className="text-orange-800 leading-relaxed font-medium mb-8 whitespace-pre-wrap">
            {announcement.content}
          </p>
          <button 
            onClick={onClose}
            className="w-full bg-orange-950 text-white py-4 rounded-2xl font-bold hover:bg-orange-850 transition-all shadow-lg"
          >
            確認しました
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AnnouncementHistoryModal({ announcements, onClose }: { announcements: Announcement[], onClose: () => void }) {
  const { language, t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div 
        initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }}
        className="relative bg-white w-full max-w-lg h-[80vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-orange-50 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2 text-orange-950">
            <Volume2 className="w-5 h-5" />
            お知らせ一覧
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-orange-50 rounded-full"><X className="w-5 h-5 text-orange-300" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {announcements.map((ann) => (
            <div key={ann.id} className="space-y-4 pb-6 border-b border-orange-50 last:border-0 last:pb-0">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-orange-900">{ann.title}</h3>
                <span className="text-[10px] text-orange-300">
                  {formatDistanceToNow(ann.createdAt.toDate(), { locale: language === 'ja' ? ja : undefined, addSuffix: true })}
                </span>
              </div>
              {ann.imageUrl && (
                <div className="rounded-2xl overflow-hidden aspect-video bg-orange-50">
                  <img src={ann.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <p className="text-xs text-orange-800 leading-relaxed whitespace-pre-wrap font-medium">
                {ann.content}
              </p>
            </div>
          ))}
          {announcements.length === 0 && (
            <div className="text-center py-20">
              <p className="text-orange-200">お知らせはありません。</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function AuthModal({ onClose, onViewChange }: { onClose: () => void; onViewChange: (view: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(0);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Googleログインに失敗しました。');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInAnonymously(auth);
      onClose();
    } catch (err: any) {
      console.error('Anonymous sign-in error:', err);
      setError(`匿名ログインに失敗しました（エラーコード: ${err.code || err.message}）。Firebaseコンソールの「Authentication > Sign-in method」にて匿名（Anonymous）サインインが有効になっているかご確認ください。有効でない場合は、Googleログインをご利用いただくか、管理者へお問い合わせください。`);
    } finally {
      setLoading(false);
    }
  };

  const guideSteps = [
    {
      title: "1. 作成ページを開こう！",
      description: "まずは、Googleのアカウント作成用ページを開きます。この画面を開いたまま、下のボタンを押して別タブで操作を並行して進めるのがおすすめです！",
      hint: "「自分用」を選択して進んでください。",
      action: (
        <a 
          href="https://accounts.google.com/signup" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-orange-100 hover:bg-orange-200 text-orange-950 text-xs font-bold rounded-xl transition-all"
        >
          <span>Googleアカウント作成ページを開く</span>
          <Chrome className="w-4 h-4 text-orange-600 animate-pulse" />
        </a>
      )
    },
    {
      title: "2. お名前と基本情報の入力",
      description: "「姓（名字）」と「名（お名前）」を入力します。次の画面で生年月日と性別の入力が求められますので、画面の指示に従って優しく入力してください。",
      hint: "基本情報の入力は、本人確認やパスワードを忘れたときの復旧に役立ちます。"
    },
    {
      title: "3. メールアドレスを決めよう",
      description: "新しくGmailアドレスを作成するか、普段お使いの別のメールアドレスをそのまま利用するか選べます。新しく作る場合は、お好きな英数字で希望のメールアドレス（ユーザー名）を決定します。",
      hint: "すでに使われている文字は登録できないため、数字を組み合わせるなどして調整してみてください！"
    },
    {
      title: "4. 安全なパスワードの設定",
      description: "アカウントを守るためのパスワード（8文字以上の半角英数字や記号の組み合わせ）を入力します。確認用と合わせて2箇所に同じ文字を入力してください。",
      hint: "パスワードを忘れないよう、紙の手帳や安全な場所にメモしておくのをお忘れなく！"
    },
    {
      title: "5. 電話番号登録と規約の同意",
      description: "セキュリティ向上のため、携帯電話の番号を入力してSMS（ショートメール）での認証を行います。次にGoogleのセキュリティと利用規約が表示されるので、下までスクロールして「同意する」を押します。",
      hint: "これで、あなたの新しいGoogleアカウントの完成です！"
    },
    {
      title: "6. 地味っちに戻ってログイン！",
      description: "アカウントの作成、大変お疲れ様でした！作成が終わったらこの画面（地味っち）に戻り、ログインボタンを押すだけで簡単に使い始めることができます。",
      hint: "さっそく戻って、世界中のお友達とまったりおしゃべり体験を楽しみましょう！",
      action: (
        <button 
          onClick={() => setShowGuide(false)}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all shadow-md"
        >
          <span>ログイン画面に戻る</span>
        </button>
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-orange-950/20 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={cn(
          "relative bg-white w-full rounded-[40px] shadow-2xl shadow-orange-900/20 overflow-hidden transition-all duration-300",
          showGuide ? "max-w-md" : "max-w-sm"
        )}
      >
        <div className="p-8 sm:p-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="bg-orange-500 p-1.5 rounded-lg text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-orange-900">
                {showGuide ? "Googleアカウントの作り方" : "ログイン / 登録"}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-orange-50 rounded-full transition-colors">
              <X className="w-5 h-5 text-orange-200" />
            </button>
          </div>

          {!showGuide ? (
            <div className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100">
                  {error}
                </div>
              )}

              <div className="space-y-6 text-center">
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4 text-left flex gap-3 cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-950/40 transition-colors" onClick={() => { onViewChange('about'); onClose(); }}>
                  <span className="text-xl shrink-0">🌟</span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-amber-950 dark:text-amber-300">地味っちを初めて利用する方へ</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">詳しい使い方、ゲーム要素、高校生Pocoが開発した想いなどをまとめた「公式紹介ホームページ」を見る ↗</p>
                  </div>
                </div>

                <p className="text-sm font-medium text-orange-850 dark:text-zinc-300 leading-relaxed text-left">
                  地味っちでは、Googleアカウントによる簡単ログインを採用しています。面倒なパスワード管理や複雑な個人情報の入力は一切不要です。<br />
                  <span className="text-xs text-orange-400">※ボタンをクリックするだけで、セキュアにログインおよび自動登録が行われます。</span>
                </p>

                <button 
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-orange-900 text-white hover:bg-orange-850 py-4 rounded-2xl font-bold transition-all flex justify-center items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Chrome className="w-5 h-5" />
                      Googleアカウントでログイン
                    </>
                  )}
                </button>

                <button 
                  type="button"
                  onClick={handleAnonymousLogin}
                  disabled={loading}
                  className="w-full bg-orange-100 text-orange-950 hover:bg-orange-200 py-3.5 rounded-2xl font-bold transition-all flex justify-center items-center gap-2 border border-orange-200 shadow-sm disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <UserIcon className="w-5 h-5 text-orange-600" />
                      匿名ユーザー（ゲスト）としてログイン
                    </>
                  )}
                </button>

                <div className="pt-2 border-t border-orange-50">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowGuide(true);
                      setGuideStep(0);
                    }}
                    className="text-xs font-bold text-orange-500 hover:text-orange-700 hover:underline transition-colors py-2 flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <span>Googleアカウントをお持ちでない方へ</span>
                    <span className="px-1.5 py-0.5 bg-orange-50 text-[10px] text-orange-400 rounded-md border border-orange-100">超かんたん手順</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Progress dots */}
              <div className="flex justify-between items-center bg-orange-50/50 p-2 rounded-2xl border border-orange-50/20">
                <div className="flex gap-1.5 pl-1">
                  {guideSteps.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        idx === guideStep ? "w-6 bg-orange-500" : "w-1.5 bg-orange-200"
                      )}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-orange-400 pr-1">
                  STEP {guideStep + 1} / {guideSteps.length}
                </span>
              </div>

              {/* Step info cards */}
              <div className="bg-orange-50/30 rounded-3xl p-6 border border-orange-100/50 min-h-[220px] flex flex-col justify-between">
                <div className="space-y-3">
                  <h3 className="text-sm font-extrabold text-orange-950 flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[10px]">
                      {guideStep + 1}
                    </span>
                    {guideSteps[guideStep].title}
                  </h3>
                  <p className="text-xs text-orange-850 leading-relaxed font-semibold">
                    {guideSteps[guideStep].description}
                  </p>
                  <p className="text-[10px] text-orange-400 italic bg-white/70 p-2.5 rounded-xl border border-orange-50/30">
                    💡 ワンポイント: {guideSteps[guideStep].hint}
                  </p>
                </div>

                {guideSteps[guideStep].action && (
                  <div className="pt-4 flex justify-center">
                    {guideSteps[guideStep].action}
                  </div>
                )}
              </div>

              {/* Stepper controls */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (guideStep > 0) {
                      setGuideStep(guideStep - 1);
                    } else {
                      setShowGuide(false);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-4 py-2 text-xs font-bold text-orange-400 hover:text-orange-600 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{guideStep === 0 ? "ログインへ" : "戻る"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (guideStep < guideSteps.length - 1) {
                      setGuideStep(guideStep + 1);
                    } else {
                      setShowGuide(false);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-6 py-2 bg-orange-900 hover:bg-orange-850 text-white text-xs font-bold rounded-2xl transition-all shadow-md"
                >
                  <span>{guideStep === guideSteps.length - 1 ? "理解した！始める" : "次へ進む"}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}



interface BotSimTabProps {
  botLogs: string[];
  setBotLogs: React.Dispatch<React.SetStateAction<string[]>>;
  isSimulating: boolean;
  triggerBotSimulation: (botId?: string) => Promise<void>;
}

function BotSimTab({ botLogs, setBotLogs, isSimulating, triggerBotSimulation }: BotSimTabProps) {
  const STATIC_BOTS = [
    { name: "田中@年中布団コアラ", bio: "布団から這い出ることが生きがい、のはずが毎日這い出せなくなっているコアラ。", uid: "bot_tanaka", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=tanaka" },
    { name: "ゆかちん@充電1%勝負", bio: "スマホ充電を1%でどれだけ長く稼働させられるかに命を燃やすスリルジャンキー。", uid: "bot_yuka", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=yuka" },
    { name: "サトシ@風呂お断り", bio: "夜の入浴タイミングを最大限サボる方法を研究中。「めんどい」が世界を救う。", uid: "bot_satoshy", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=satoshy" },
    { name: "じみ太郎@宿題先延ばし", bio: "今できることを絶対に明日以降に回すプロフェッショナル。", uid: "bot_jimi_taro", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=jimi_taro" },
    { name: "みみ@夜更かしプリンセス", bio: "特にすることもないのに深夜2時に虚無スマホしている住人。", uid: "bot_sleepy_mimi", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=mimi" },
  ];

  return (
    <div className="space-y-6 text-orange-950">
      <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100">
        <h3 className="text-base font-black text-orange-950 mb-2 flex items-center gap-2">
          <span>🤖 地味っちAIボット・シミュレーター</span>
        </h3>
        <p className="text-xs font-bold text-orange-850 mb-4 leading-relaxed">
          地味っちのアクティビティを増やすため、5名の自律AIボットが自動投稿・投票などのアクションを計画します。
          安全にシミュレーションを行うため、承認済みの管理者セッションを利用して直接クライアントからFirestoreへアクションがコミットされます（エラーを完全に防ぎます）。
        </p>

        <button
          onClick={() => triggerBotSimulation()}
          disabled={isSimulating}
          className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm rounded-2xl shadow-md transition active:scale-95 disabled:opacity-50 text-center flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSimulating ? (
            <span>シミュレーション進行中(AI生成&確認)... ⚙️</span>
          ) : (
            <span>⚡ 即座にランダムなボットの動きをトリガーする</span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bots List */}
        <div className="bg-white border border-orange-100 p-5 rounded-3xl space-y-4 font-sans text-stone-900">
          <h4 className="text-xs font-bold text-orange-900 border-b border-orange-100 pb-2">
            👥 稼働中のメンバー一覧 (5名)
          </h4>
          <div className="space-y-3">
            {STATIC_BOTS.map(b => (
              <div key={b.uid} className="flex gap-3 items-start bg-orange-50/40 p-3 rounded-2xl border border-orange-100/50 text-stone-900">
                <img src={b.avatar} alt={b.name} className="w-10 h-10 rounded-xl bg-orange-100 p-1 border border-orange-200" referrerPolicy="no-referrer" />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-orange-950">{b.name}</span>
                    <span className="text-[8px] bg-emerald-100 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded-full">ACTIVE</span>
                  </div>
                  <p className="text-[10px] text-orange-700 font-bold leading-tight">{b.bio}</p>
                  <p className="text-[9px] font-mono text-orange-400">UID: {b.uid}</p>
                  <div className="pt-1">
                    <button
                      onClick={() => triggerBotSimulation(b.uid)}
                      disabled={isSimulating}
                      className="text-[9px] bg-orange-700 hover:bg-orange-850 disabled:opacity-40 text-white font-black px-2 py-0.5 rounded border border-orange-800 transition shadow-inner active:scale-95 cursor-pointer"
                    >
                      ⚡ このボットを今すぐ行動させる
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Admin Manual Log */}
        <div className="bg-slate-950 text-emerald-300 p-5 rounded-3xl font-mono text-xs space-y-3 border-2 border-slate-900 h-[360px] flex flex-col overflow-hidden">
          <div className="flex justify-between items-center border-b border-slate-950/60 pb-2 text-[10px] text-emerald-500 font-black shrink-0 animate-pulse">
            <span>CONSOLE LOGS</span>
            <span className="text-emerald-400 font-black">● LIVE</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-bold scrollbar-thin">
            {botLogs.map((log, index) => (
              <p key={index} className="leading-relaxed">{log}</p>
            ))}
            {botLogs.length === 0 && (
              <p className="text-slate-500 italic text-[11px] py-10 text-center">
                上記のボタンを押すと、こちらに実行ログが最新順に表示されます。
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserSearchModal({ onClose, onSelectUser, query, setQuery, results }: { onClose: () => void, onSelectUser: (uid: string) => void, query: string, setQuery: (q: string) => void, results: Profile[] }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-orange-950/20 backdrop-blur-sm" />
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="p-6 border-b border-orange-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-orange-950 flex items-center gap-2">
              <Users className="w-5 h-5" />
              ユーザーを探す
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-orange-50 rounded-full transition-colors"><X className="w-5 h-5 text-orange-200" /></button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-300" />
            <input 
              type="text" 
              placeholder="ユーザー名で検索..." 
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              className="w-full bg-orange-50 rounded-2xl p-4 pl-12 text-sm text-orange-950 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 pb-6">
          {results.map((profile) => (
            <button 
              key={profile.uid}
              onClick={() => onSelectUser(profile.uid)}
              className="w-full flex items-center gap-3 p-4 hover:bg-orange-50 rounded-2xl transition-all group"
            >
              <img src={profile.photoURL} alt="" className="w-10 h-10 rounded-full border border-orange-100 group-hover:scale-105 transition-transform" />
              <div className="text-left">
                <p className="text-sm font-bold text-orange-900">{profile.displayName}</p>
                <p className="text-[10px] text-orange-300 line-clamp-1">{profile.bio}</p>
              </div>
              <ChevronRight className="ml-auto w-4 h-4 text-orange-200 group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
          {query && results.length === 0 && (
            <div className="py-20 text-center text-orange-200 text-sm">
              ユーザーが見つかりませんでした。
            </div>
          )}
          {!query && (
            <div className="py-20 text-center text-orange-200 text-sm flex flex-col items-center gap-2">
               <Search className="w-8 h-8 opacity-20" />
               ユーザー名を入力して検索
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
