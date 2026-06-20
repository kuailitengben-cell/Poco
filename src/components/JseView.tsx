import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Layers, 
  Activity, 
  Award, 
  Newspaper, 
  Briefcase, 
  BarChart2, 
  CornerDownRight, 
  ArrowRightLeft, 
  Flame, 
  Calendar, 
  Sparkles, 
  HelpCircle, 
  X, 
  Check, 
  Info,
  ChevronDown,
  User,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Scene, Profile } from '../types';
import { getGachaState, saveGachaState } from '../lib/gachaStore';
import { BADGES, Badge, registerCustomBadge } from '../lib/badgeUtils';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, setDoc, getDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

// Definition of JSE Stocks (銘柄)
export interface JseStock {
  id: string;
  emoji: string;
  name: string;
  nameEn: string;
  keywords: string[];
  basePrice: number;
  relatedBadgeId?: string;
  relatedTitle?: string;
  descriptionEn: string;
  descriptionJa: string;
  founderId?: string;
  founderName?: string;
  coinsSpent?: number;
}

export const JSE_STOCKS: JseStock[] = [
  {
    id: 'furo_mendoi',
    emoji: '🛁',
    name: '風呂めんどい',
    nameEn: 'Bath Procrastination',
    keywords: ['風呂', 'めんどい', 'お風呂', '入浴', '湯船', 'シャワー', 'めんどくさ'],
    basePrice: 145,
    relatedBadgeId: 'badge_gacha_sofa',
    relatedTitle: '地味投資家',
    descriptionJa: '入浴にかかる膨大なエネルギーに対して人類が感じる不合理を象徴する、JSE最大規模の超大型株。夜間に取引が活発化する。',
    descriptionEn: 'The massive representative stock representing humanity\'s universal dread of bathing. Trading spikes sharply in late hours.'
  },
  {
    id: 'homework_pro',
    emoji: '📝',
    name: '宿題先延ばし',
    nameEn: 'Homework Postponing',
    keywords: ['宿題', '先延ばし', 'レポート', '課題', '自主学習', 'テスト勉強', '提出物'],
    basePrice: 110,
    relatedBadgeId: 'badge_hanbun_fusen',
    relatedTitle: '共感トレーダー',
    descriptionJa: '「明日やろうは馬鹿野郎」と理解しつつ、Youtubeの誘惑に屈し続ける高校生〜労働者共通の行動バイアス。夏休み終盤に天文学的に急騰する。',
    descriptionEn: 'A universal habit of succumbing to streaming platforms instead of studying. Surges exponentially during late summer and test season.'
  },
  {
    id: 'futon_escape',
    emoji: '❄️',
    name: '布団から出られない',
    nameEn: 'Futon Gravity Trap',
    keywords: ['布団', '寒い', '起きられない', '冬', 'ベッド', '毛布', '二度寝'],
    basePrice: 130,
    relatedBadgeId: 'badge_gacha_yofukashi_nintei',
    relatedTitle: '忘れ物ファンドマネージャー',
    descriptionJa: '冬の早朝における布団の重力増大現象。気温に反比例して価格が上昇するディフェンシブ優良株。',
    descriptionEn: 'The physical phenomena of increased gravity inside blankets on cold mornings. A highly robust defensive blue-chip asset.'
  },
  {
    id: 'charge_1percent',
    emoji: '🔌',
    name: '充電1%チャレンジ',
    nameEn: '1% Battery Roulette',
    keywords: ['充電', '1%', 'バッテリー', '充電器', '1パーセント', '電池切れ', 'スマホ消えた'],
    basePrice: 95,
    relatedBadgeId: 'badge_gacha_antenna',
    descriptionJa: '「1%になってからが本当の勝負」という現代特有のスリル株。ボラティリティが非常に高く、急落も激しい。',
    descriptionEn: 'The modernized adrenaline rush of staying on 1% battery. High volatility and wild speculative value.'
  },
  {
    id: 'socks_lost',
    emoji: '🧦',
    name: '靴下片方消失',
    nameEn: 'The Lost Sock Anomaly',
    keywords: ['靴下', '片方', 'ソックス', '失くした', '消えた', '洗濯機', '片耳'],
    basePrice: 85,
    relatedBadgeId: 'badge_gacha_socks',
    descriptionJa: '洗濯機の中で確実に時空の裂け目に飲み込まれる衣服のアノマリー。常に一定の損失を出すことから安定銘柄。',
    descriptionEn: 'The domestic anomaly of socks vanishing into quantum wormholes inside dryers. A reliably stable structural value.'
  },
  {
    id: 'refrigerator_forget',
    emoji: '🍉',
    name: '冷蔵庫忘却',
    nameEn: 'The Fridge Void',
    keywords: ['冷蔵庫', '忘却', '忘れた', '賞味期限', 'カビ', 'プリン', '買い忘れ'],
    basePrice: 90,
    relatedBadgeId: 'badge_gacha_kori_nokori',
    descriptionJa: '冷蔵庫の奥地で文明を築き上げる発酵物（主に野菜・プリン）の現象株。賞味期限の限界に挑む。',
    descriptionEn: 'Forgetting items in the back of the fridge until they sprout dynamic microbial civilizations. High risk, high yield.'
  },
  {
    id: 'yofukashi_late',
    emoji: '🌙',
    name: 'なんとなく夜更かし',
    nameEn: 'Mindless Late-Night Loop',
    keywords: ['夜更かし', '深夜', '寝落ち', '3時', '4時', '5時', '朝方', '起きてる'],
    basePrice: 120,
    relatedBadgeId: 'badge_gacha_owl',
    relatedTitle: 'JSEの魔術師',
    descriptionJa: '特にやることが無いのにSNSと動画を無限往復する、自己嫌悪と至高の時間をトレードするプレミアム株式。',
    descriptionEn: 'Endlessly looping socials and streams despite having to wake up early. Exchanging self-esteem for sacred quiet hours.'
  },
  {
    id: 'test_panic',
    emoji: '📖',
    name: 'テスト前焦り',
    nameEn: 'Pre-Exam Panic',
    keywords: ['テスト', '赤点', '試験', '勉強', '一夜漬け', '暗記', '数Ⅲ', '現代文', '古文'],
    basePrice: 105,
    relatedBadgeId: 'badge_hanbun_fusen',
    relatedTitle: '人類市場アナリスト',
    descriptionJa: 'テスト前日の異常な部屋掃除欲求や、なぜか世界史の用語が1秒も頭に入らない焦燥株。テスト週間に10倍高になる。',
    descriptionEn: 'The sudden compulsion to deep-clean your room instead of studying the night before midterms. Cyclical growth pattern.'
  },
  {
    id: 'key_disappear',
    emoji: '🔑',
    name: '鍵どこだっけ',
    nameEn: 'Keys Hide-and-Seek',
    keywords: ['鍵', '失くした', 'どこ', 'キー', '見つからない', 'パスケース', '遅刻する'],
    basePrice: 75,
    descriptionJa: '出かける5分前にのみ発現するステルス鍵。慌てるスピードに比例して認知の死角へと沈みこむ。',
    descriptionEn: 'A stealth anomaly in keys that activates exactly 5 minutes before leaving home. Driven by panic indexes.'
  },
  {
    id: 'single_earbud',
    emoji: '🎧',
    name: '片耳イヤホン',
    nameEn: 'One-Earbud Ambient',
    keywords: ['イヤホン', '片耳', 'シャッフル', 'リピート', '音飛び', '断線', 'Bluetooth'],
    basePrice: 80,
    relatedBadgeId: 'badge_gacha_katamimi_earphone',
    descriptionJa: '外の音も聞きつつ、世界から適度に距離を置くための思春期～通勤者の自衛手段。BGM需要に伴い底堅い値動き。',
    descriptionEn: 'Listening to soundtracks in one ear to maintain polite distance from society. Strongly resistant to retail sell-offs.'
  },
  {
    id: 'late_dash',
    emoji: '⏳',
    name: '遅刻ギリギリダッシュ',
    nameEn: 'Late Chime Dash',
    keywords: ['遅刻', '走る', 'チャイム', 'ギリギリ', '校門', '始業', 'セーフ'],
    basePrice: 100,
    relatedBadgeId: 'badge_gacha_nurui_coffee',
    descriptionJa: '「食パンを咥えて走る」少女漫画的憧れとは乖離した、大量の汗と呼吸困難を伴う現実的IPO銘柄。',
    descriptionEn: 'Tachycardia-inducing high-stakes runs towards main gates before the bell rings. High physical trading volume.'
  }
];

// JSE Event definitions
export interface JseEvent {
  id: string;
  title: string;
  description: string;
  affectedStocks: Record<string, number>; // multipliers: e.g. 'homework_pro': 1.6 berarti +60%
  type: 'summer' | 'winter' | 'exam' | 'house_cleaning' | 'none';
  durationDesc: string;
}

export const JSE_EVENTS: JseEvent[] = [
  {
    id: 'summer_vacation',
    title: '☀️ 夏休み最後の3日間シチュエーション',
    description: '全国の生徒・学生が「宿題先延ばし」「冷蔵庫忘却（宿題探してて発覚）」株に殺到！勉強系及び自堕落銘柄の価格がカオスに急上昇しています！',
    affectedStocks: {
      'homework_pro': 1.8,
      'refrigerator_forget': 1.3,
      'yofukashi_late': 1.5,
      'test_panic': 0.7
    },
    type: 'summer',
    durationDesc: '残り 1週間で解消'
  },
  {
    id: 'winter_deep',
    title: '❄️ 極寒の寒波到来・万有引最大化',
    description: '早朝の気温低下により「布団から出られない」重力場がシミュレータ限界に到達。「遅刻ギリギリダッシュ」株も追って高騰。',
    affectedStocks: {
      'futon_escape': 2.1,
      'late_dash': 1.6,
      'furo_mendoi': 1.4,
      'charge_1percent': 0.8
    },
    type: 'winter',
    durationDesc: '気象状況により継続'
  },
  {
    id: 'exam_week',
    title: '✍️ 全国同時期テストパニック襲来',
    description: '「テスト前焦り」「なんとなく夜更かし」が暴騰！ 逆に「充電1%チャレンジ」や「風呂めんどい」は時間の限界により微減しています。',
    affectedStocks: {
      'test_panic': 1.9,
      'yofukashi_late': 1.4,
      'homework_pro': 1.3,
      'furo_mendoi': 0.8
    },
    type: 'exam',
    durationDesc: 'テスト最終日まで爆熱'
  },
  {
    id: 'cleanup_mega',
    title: '🧹 年末大掃除＆遺失物オルタナティブ',
    description: 'タンスの裏や乾燥機下からの「靴下片方消失」「鍵どこだっけ」が「回収・発見」されたことで、市場に一時的な供給過多が生じ株価が乱高下！',
    affectedStocks: {
      'socks_lost': 0.6,
      'key_disappear': 0.5,
      'refrigerator_forget': 1.4,
      'single_earbud': 1.2
    },
    type: 'house_cleaning',
    durationDesc: '新年度クリアに向け進行中'
  }
];

// Bot descriptions
export const JSE_BOTS = [
  { name: '共感銀行 (Sympathy Bank)', logo: '🏦', desc: '圧倒的な『わかる』のエネルギーを源泉に、人気抜群の超大型株を好んで買い支えるJSEの機関投資家。' },
  { name: '人類年金機構 (Humanity Pension)', logo: '👴', desc: '人類に普遍的に存在する現象（靴下消失や片耳イヤホンなど）を淡々と買い、インカムゲインを狙う超巨大な安定BOT。' },
  { name: '忘れ物投資信託 (Lost Fund)', logo: '📦', desc: '鍵、靴下、冷蔵庫の食品を常にどこかに置き忘れたポートフォリオ。紛失系銘柄の上昇局面に抜群の嗅覚を持つ。' },
  { name: '地味ファンド (Jimi Momentum)', logo: '⚡', desc: 'トレンド（新規投稿や急騰）を感知して高速売買を行うAI主導ファンド。相場のうねりを生み出すイナゴBOT。' },
  { name: '先延ばし証券 (Procrastinate)', logo: '🕒', desc: '「本当に締め切りギリギリまで何もしない」ボラティリティ重視の投機BOT。夜更かし株とテスト焦り株の価格を攪乱。' }
];

interface LogEntry {
  botName: string;
  stockEmoji: string;
  stockName: string;
  type: 'buy' | 'sell';
  price: number;
  qty: number;
  time: string;
}

interface JseViewProps {
  user: any;
  profile: Profile | null;
  onBack: () => void;
  onGachaStateChange: () => void;
  allScenes: Scene[];
}

export function JseView({ user, profile, onBack, onGachaStateChange, allScenes = [] }: JseViewProps) {
  // --- JSE CURRENCY & TRADING POSITIONS (Stored in Firestore / LocalStorage) ---
  const [jCoins, setJCoins] = useState(() => {
    if (profile?.jCoins !== undefined) {
      return profile.jCoins;
    }
    const key = `jse_jcoins_v1_${user?.uid || 'guest'}`;
    const saved = localStorage.getItem(key);
    return saved ? parseInt(saved, 10) : 5000; // Starter JSET Pack
  });

  const [holdings, setHoldings] = useState<Record<string, { qty: number; avgPrice: number }>>(() => {
    if (profile?.jseHoldings !== undefined) {
      return profile.jseHoldings;
    }
    const key = `jse_holdings_v1_${user?.uid || 'guest'}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  });

  const [realizedPnL, setRealizedPnL] = useState(() => {
    if (profile?.jseRealizedPnL !== undefined) {
      return profile.jseRealizedPnL;
    }
    const key = `jse_realized_v1_${user?.uid || 'guest'}`;
    const saved = localStorage.getItem(key);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(() => {
    if (profile?.jseUnlockedAchievements !== undefined) {
      return profile.jseUnlockedAchievements;
    }
    const key = `jse_unlocked_achievements_v1_${user?.uid || 'guest'}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  });

  // Sync state from profile's Firestore snapshot updates
  useEffect(() => {
    if (profile?.jCoins !== undefined && profile.jCoins !== jCoins) {
      setJCoins(profile.jCoins);
    }
  }, [profile?.jCoins]);

  useEffect(() => {
    if (profile?.jseHoldings !== undefined && JSON.stringify(profile.jseHoldings) !== JSON.stringify(holdings)) {
      setHoldings(profile.jseHoldings);
    }
  }, [profile?.jseHoldings]);

  useEffect(() => {
    if (profile?.jseRealizedPnL !== undefined && profile.jseRealizedPnL !== realizedPnL) {
      setRealizedPnL(profile.jseRealizedPnL);
    }
  }, [profile?.jseRealizedPnL]);

  useEffect(() => {
    if (profile?.jseUnlockedAchievements !== undefined && JSON.stringify(profile.jseUnlockedAchievements) !== JSON.stringify(unlockedAchievements)) {
      setUnlockedAchievements(profile.jseUnlockedAchievements);
    }
  }, [profile?.jseUnlockedAchievements]);

  // --- MARKET REALTIME STATE ---
  const [activeEventId, setActiveEventId] = useState<string>('none');
  const [selectedStockId, setSelectedStockId] = useState<string>('furo_mendoi');
  const [gachaCoins, setGachaCoins] = useState(0);
  
  // --- GC SAVINGS STATE (GC 価値爆上げ特別優待利回り金庫) ---
  const [gcSavings, setGcSavings] = useState<number>(() => {
    const uidKey = user?.uid || 'guest';
    const saved = localStorage.getItem(`jse_gc_savings_v1_${uidKey}`);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [savingActionAmount, setSavingActionAmount] = useState<number>(10);

  const [chartPeriod, setChartPeriod] = useState<'1D' | '1W' | '1M' | '3M' | 'ALL'>('1D');
  const [chartType, setChartType] = useState<'price' | 'volume' | 'posts'>('price');
  
  // Custom interactive trade modal quantities
  const [tradeQty, setTradeQty] = useState<number>(10);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [exchangeAmount, setExchangeAmount] = useState<number>(100); // converting coins is easy
  const [newsTicker, setNewsTicker] = useState<string[]>([]);
  const [botLogs, setBotLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'market' | 'portfolio' | 'profile' | 'etf' | 'about' | 'trust'>('market');
  const [confetti, setConfetti] = useState(false);
  const [popupMsg, setPopupMsg] = useState<{ text: string; icon?: string } | null>(null);

  // --- JSE CUSTOM STOCKS LIVE SYNC ---
  const [customStocks, setCustomStocks] = useState<JseStock[]>([]);

  // Creation form states
  const [newStockName, setNewStockName] = useState('');
  const [newStockNameEn, setNewStockNameEn] = useState('');
  const [newStockDesc, setNewStockDesc] = useState('');
  const [newStockEmoji, setNewStockEmoji] = useState('💡');
  const [newStockCategory, setNewStockCategory] = useState('日常ストレス');
  const [newStockCoins, setNewStockCoins] = useState(500);
  const [isSubmittingCreation, setIsSubmittingCreation] = useState(false);
  const [creationMessage, setCreationMessage] = useState('');

  const [claimedRewards, setClaimedRewards] = useState<Record<string, boolean>>(() => {
    const key = `jse_claimed_rewards_${user?.uid || 'guest'}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  });

  const handleCreateStockRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStockName.trim()) {
      alert('銘柄名を入力してください。');
      return;
    }
    if (newStockName.length > 10) {
      alert('銘柄名は10文字以内で、短く、わかりやすいあるある名にしてください。');
      return;
    }
    if (newStockCoins < 500) {
      alert('最小デポジットは500J-Coinです。かけるコインが多いほど承認レートが高まります。');
      return;
    }

    if (jCoins < newStockCoins) {
      alert('J-Coin残高が不足しています。JSE市場で増やすか、GCから両替してください。');
      return;
    }

    // Check prohibitions
    const prohibitedWords = ['学校', '中学校', '高校', '大学', '会社', '株式会社', '人名', '政治', '差別', 'スパム', '死', '殺', '馬鹿', 'ばか', 'アホ', 'ちんこ', 'まんこ', 'うんこ'];
    const lowerContent = (newStockName + ' ' + newStockDesc).toLowerCase();
    const isProhibited = prohibitedWords.some(w => lowerContent.includes(w));
    if (isProhibited) {
      alert('禁止用語（学校名、実在の企業ブランド、著名人名、不適切な表現、または誹謗中傷など）が含まれています。再検討してください。');
      return;
    }

    setIsSubmittingCreation(true);
    setCreationMessage('');

    try {
      // Create request in collection jse_creation_requests
      const reqData = {
        stockName: newStockName.trim(),
        stockNameEn: newStockNameEn.trim() || 'Phenomenon Item',
        descJa: newStockDesc.trim(),
        emoji: newStockEmoji,
        category: newStockCategory,
        coinsSpent: newStockCoins,
        founderId: user?.uid || 'guest',
        founderName: profile?.displayName || '地味な投資家',
        status: 'pending',
        createdAt: Date.now(),
        rejectionReason: ''
      };

      await addDoc(collection(db, 'jse_creation_requests'), reqData);

      // Spend coins
      setJCoins(prev => Math.max(0, prev - newStockCoins));

      setCreationMessage('申請を受け付けました！運営（管理パネル）の審査ステータスをお待ちください（およそ数時間で審査が完了します）。もし承認されれば上場＋創設バッジが即取得、却下された場合は全額返金されます。');
      triggerPopup('設立株上場申請を送信しました！', '✨');
      setConfetti(true);

      // Clear fields
      setNewStockName('');
      setNewStockNameEn('');
      setNewStockDesc('');
      setNewStockCoins(500);
      setTimeout(() => setConfetti(false), 2000);
    } catch(err) {
      console.error(err);
      alert('送信に失敗しました。時間をおいてもう一度お試しください。');
    } finally {
      setIsSubmittingCreation(false);
    }
  };

  const handleClaimReward = (stockId: string, rewardAmt: number) => {
    if (claimedRewards[stockId]) return;

    setJCoins(prev => prev + rewardAmt);
    const updated = { ...claimedRewards, [stockId]: true };
    setClaimedRewards(updated);
    localStorage.setItem(`jse_claimed_rewards_${user?.uid || 'guest'}`, JSON.stringify(updated));

    triggerPopup(`創設報酬 ${rewardAmt} J-Coins の獲得おめでとうございます！`, '👑');
    setConfetti(true);
    setTimeout(() => setConfetti(false), 2500);
  };

  useEffect(() => {
    const q = query(collection(db, 'jse_custom_stocks'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          emoji: data.emoji || '📈',
          name: data.name || data.stockName || '',
          nameEn: data.nameEn || '',
          keywords: data.keywords || [],
          basePrice: data.basePrice || 100,
          descriptionJa: data.descriptionJa || data.descJa || '',
          descriptionEn: data.descriptionEn || '',
          founderId: data.founderId || '',
          founderName: data.founderName || '',
          coinsSpent: data.coinsSpent || 500
        } as JseStock;
      });

      // Register founder badges dynamically in real-time
      list.forEach((stock) => {
        registerCustomBadge({
          id: `badge_founder_${stock.id}`,
          name: `🏅${stock.name}株 創設者`,
          description: `日常現象「${stock.name}」を設立した偉大な創設者であることを示す、この世界に唯一の永久称号バッジ。`,
          category: 'unique',
          rarity: 'mythic',
          conditionText: `日常現象「${stock.name}」をJSE創設制度より上陸・設立する`,
          iconName: 'Crown',
          emoji: '🏅',
          color: 'text-amber-700',
          bgColor: 'bg-amber-55',
          borderColor: 'border-amber-250',
          type: 'custom',
          threshold: 1
        });
      });

      setCustomStocks(list);
    }, (err) => {
      console.error("Failed to load JSE custom stocks:", err);
    });
    return () => unsub();
  }, []);

  const allStocks = useMemo(() => {
    return [...JSE_STOCKS, ...customStocks];
  }, [customStocks]);

  // --- Real-time AI Post Stock Match Analysis ---
  const [reportedMatches, setReportedMatches] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'jse_reports'),
      orderBy('createdAt', 'desc'),
      limit(25)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setReportedMatches(list);
    }, (err) => {
      console.warn("Error receiving snapshot for JSE reports:", err);
    });
    return () => unsubscribe();
  }, []);

  const aiMatchOffsets = useMemo(() => {
    const offsets: Record<string, number> = {};
    reportedMatches.forEach(report => {
      if (report.stockId) {
        offsets[report.stockId] = (offsets[report.stockId] || 0) + 25;
      }
    });
    return offsets;
  }, [reportedMatches]);

  // --- Real-global persistent user trades tracking (Worldwide synchronized market shifts!) ---
  const [globalTrades, setGlobalTrades] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'jse_global_trades'),
      orderBy('createdAt', 'desc'),
      limit(150)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setGlobalTrades(list);
    }, (err) => {
      console.warn("Error receiving snapshot for JSE global trades:", err);
    });
    return () => unsubscribe();
  }, []);

  const globalTradeOffsets = useMemo(() => {
    const offsets: Record<string, number> = {};
    globalTrades.forEach(trade => {
      if (trade.stockId && typeof trade.qty === 'number') {
        const factor = trade.type === 'buy' ? 1.5 : -1.5;
        offsets[trade.stockId] = (offsets[trade.stockId] || 0) + (trade.qty * factor);
      }
    });
    return offsets;
  }, [globalTrades]);

  // --- User Manual Buy/Sell Price Link Offsets ---
  const [tradeOffsets, setTradeOffsets] = useState<Record<string, number>>(() => {
    const uidKey = user?.uid || 'guest';
    const saved = localStorage.getItem(`jse_trade_offsets_v2_${uidKey}`);
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    const uidKey = user?.uid || 'guest';
    localStorage.setItem(`jse_trade_offsets_v2_${uidKey}`, JSON.stringify(tradeOffsets));
  }, [tradeOffsets, user?.uid]);

  // --- REAL-TIME DETAILED STOCK PRICE HISTORY (FOR HIGH-FIDELITY CUSTOM SVG GRAPHS) ---
  const [priceHistories, setPriceHistories] = useState<Record<string, number[]>>({});

  // --- AI INVESTMENT TRUSTS STATE ---
  const [aiFundDeposits, setAiFundDeposits] = useState<Record<string, { balance: number; shares: number }>>(() => {
    const uidKey = user?.uid || 'guest';
    const saved = localStorage.getItem(`jse_ai_trust_deposits_v2_${uidKey}`);
    return saved ? JSON.parse(saved) : {
      stable_index: { balance: 0, shares: 0 },
      aggressive_momentum: { balance: 0, shares: 0 },
      speculative_lev: { balance: 0, shares: 0 },
    };
  });

  useEffect(() => {
    const uidKey = user?.uid || 'guest';
    localStorage.setItem(`jse_ai_trust_deposits_v2_${uidKey}`, JSON.stringify(aiFundDeposits));
  }, [aiFundDeposits, user?.uid]);

  // Fluctuations & Simulated Market Ticks
  const [tick, setTick] = useState(0);
  const [stockPrices, setStockPrices] = useState<Record<string, { price: number; lastPrice: number; change24h: number }>>({});
  const [ipoQueue, setIpoQueue] = useState<string[]>([]);

  // Calculate actual post statistics from allScenes
  const scenesTextStats = useMemo(() => {
    const stats: Record<string, { posts: number; upvotes: number; comments: number }> = {};
    allStocks.forEach(stock => {
      let posts = 0;
      let upvotes = 0;
      let comments = 0;

      allScenes.forEach(scene => {
        const matches = stock.keywords.some(kw => 
          scene.title.includes(kw) || 
          scene.content.includes(kw) ||
          (scene.category && scene.category.includes(kw)) ||
          (scene.hashtags && scene.hashtags.some(h => h.includes(kw)))
        );
        if (matches) {
          posts += 1;
          upvotes += scene.upvotes || 0;
          comments += scene.commentCount || 0;
        }
      });
      // Give some natural organic baseline to make UI look amazing if app has few posts
      stats[stock.id] = {
        posts: posts + Math.floor((stock.basePrice % 17) + 5),
        upvotes: upvotes + Math.floor((stock.basePrice % 23) * 3),
        comments: comments + Math.floor((stock.basePrice % 8) + 2)
      };
    });
    return stats;
  }, [allScenes, allStocks]);

  // Synchronize dynamic stock prices based on real activity, bot state and simulated events
  useEffect(() => {
    const event = JSE_EVENTS.find(e => e.id === activeEventId);
    const newPrices: Record<string, { price: number; lastPrice: number; change24h: number }> = {};

    allStocks.forEach(stock => {
      const stats = scenesTextStats[stock.id] || { posts: 10, upvotes: 20, comments: 2 };
      // Base calculation
      const popularityIndex = (stats.posts * 4.5) + (stats.upvotes * 0.8) + (stats.comments * 2.2);
      
      // Stock specific multipliers
      let eventMultiplier = 1.0;
      if (event && event.affectedStocks[stock.id] !== undefined) {
        eventMultiplier = event.affectedStocks[stock.id];
      }

      // Add a bit of random natural jitter (to make charts wiggly)
      const randomNoiseSeed = 1.0 + (Math.sin(tick * (stock.basePrice / 100)) * 0.04) + (Math.cos(tick + stock.basePrice) * 0.02);
      
      // Integrate AI reports detection offset + global sync trades + user local trades
      const reportOffset = aiMatchOffsets[stock.id] || 0;
      const globalOffset = globalTradeOffsets[stock.id] || 0;
      const userTradeOffset = tradeOffsets[stock.id] || 0;

      const calculatedBase = stock.basePrice + popularityIndex + reportOffset + globalOffset + userTradeOffset;
      const finalPrice = Math.max(10, Math.floor(calculatedBase * eventMultiplier * randomNoiseSeed));

      const oldState = stockPrices[stock.id];
      const lastPrice = oldState?.price || (finalPrice - Math.floor(Math.random() * 5));
      const change24h = oldState 
        ? parseFloat((((finalPrice - stock.basePrice) / stock.basePrice) * 100).toFixed(1))
        : parseFloat((((finalPrice - lastPrice) / lastPrice) * 100).toFixed(1));

      newPrices[stock.id] = {
        price: finalPrice,
        lastPrice: lastPrice,
        change24h: change24h
      };
    });

    setStockPrices(newPrices);
  }, [tick, scenesTextStats, activeEventId, aiMatchOffsets, tradeOffsets, globalTradeOffsets, allStocks]);

  // Update chronological histories with backwards random walk on initialization + incremental updates
  useEffect(() => {
    if (Object.keys(stockPrices).length === 0) return;

    setPriceHistories((prev) => {
      const copy = { ...prev };
      let changed = false;

      Object.keys(stockPrices).forEach((stockId) => {
        const currentPrice = stockPrices[stockId]?.price;
        if (currentPrice === undefined) return;

        const stock = allStocks.find((s) => s.id === stockId);
        const basePrice = stock ? stock.basePrice : 100;
        const currentArr = copy[stockId] ? [...copy[stockId]] : [];

        if (currentArr.length === 0) {
          // Initialize with a beautiful backwards random walk from the actual live price
          let currentVal = currentPrice;
          const arr: number[] = [];
          for (let i = 0; i < 50; i++) {
            arr.unshift(currentVal);
            // Step backwards organically
            const seed = stockId.charCodeAt(0) + i;
            const randomStep = (Math.sin(seed * 0.7) * 4) + (Math.cos(seed * 1.3) * 2) + (Math.sin(i / 4.0) * 2.5);
            const drift = (basePrice - currentVal) * 0.055;
            currentVal = Math.max(10, Math.floor(currentVal + randomStep + drift));
          }
          copy[stockId] = arr;
          changed = true;
        } else {
          // Process ongoing price fluctuations
          const lastPrice = currentArr[currentArr.length - 1];
          if (lastPrice !== currentPrice) {
            currentArr.push(currentPrice);
            if (currentArr.length > 50) {
              currentArr.shift();
            }
            copy[stockId] = currentArr;
            changed = true;
          }
        }
      });

      return changed ? copy : prev;
    });
  }, [stockPrices, allStocks]);

  // Save assets on change
  useEffect(() => {
    localStorage.setItem(`jse_jcoins_v1_${user?.uid || 'guest'}`, String(jCoins));
    if (user?.uid && profile && profile.jCoins !== jCoins) {
      const profileRef = doc(db, 'profiles', user.uid);
      updateDoc(profileRef, { jCoins }).catch(err => {
        console.warn("Failed to sync J-Coins to Firestore profile:", err);
      });
    }
  }, [jCoins, user?.uid]);

  useEffect(() => {
    localStorage.setItem(`jse_holdings_v1_${user?.uid || 'guest'}`, JSON.stringify(holdings));
    if (user?.uid && profile && JSON.stringify(profile.jseHoldings) !== JSON.stringify(holdings)) {
      const profileRef = doc(db, 'profiles', user.uid);
      updateDoc(profileRef, { jseHoldings: holdings }).catch(err => {
        console.warn("Failed to sync JSE holdings to Firestore profile:", err);
      });
    }
  }, [holdings, user?.uid]);

  useEffect(() => {
    localStorage.setItem(`jse_realized_v1_${user?.uid || 'guest'}`, String(realizedPnL));
    if (user?.uid && profile && profile.jseRealizedPnL !== realizedPnL) {
      const profileRef = doc(db, 'profiles', user.uid);
      updateDoc(profileRef, { jseRealizedPnL: realizedPnL }).catch(err => {
        console.warn("Failed to sync JSE realized PnL to Firestore profile:", err);
      });
    }
  }, [realizedPnL, user?.uid]);

  useEffect(() => {
    localStorage.setItem(`jse_unlocked_achievements_v1_${user?.uid || 'guest'}`, JSON.stringify(unlockedAchievements));
    if (user?.uid && profile && JSON.stringify(profile.jseUnlockedAchievements) !== JSON.stringify(unlockedAchievements)) {
      const profileRef = doc(db, 'profiles', user.uid);
      updateDoc(profileRef, { jseUnlockedAchievements: unlockedAchievements }).catch(err => {
        console.warn("Failed to sync JSE achievements to Firestore profile:", err);
      });
    }
  }, [unlockedAchievements, user?.uid]);

  // Read Gacha coins for exchange
  const updateGachaCoins = () => {
    if (user?.uid) {
      const gState = getGachaState(user.uid);
      setGachaCoins(gState.coins);
    }
  };

  useEffect(() => {
    updateGachaCoins();
  }, [user?.uid]);

  // Generate automated ticker/news and bot transactions on ticks
  useEffect(() => {
    // Ticker generator
    const timer = setInterval(() => {
      setTick(prev => prev + 1);

      // Random bot transaction
      if (Math.random() > 0.4) {
        const bot = JSE_BOTS[Math.floor(Math.random() * JSE_BOTS.length)];
        const stock = allStocks[Math.floor(Math.random() * allStocks.length)];
        const currentData = stockPrices[stock.id] || { price: stock.basePrice };
        const actionType = Math.random() > 0.45 ? 'buy' : 'sell';
        const qty = Math.floor(Math.random() * 45) + 5;
        
        const log: LogEntry = {
          botName: bot.name,
          stockEmoji: stock.emoji,
          stockName: stock.name,
          type: actionType,
          price: currentData.price,
          qty: qty,
          time: 'Just now'
        };

        setBotLogs(prev => [log, ...prev.slice(0, 39)]);

        // Occasional JSE news trigger
        if (Math.random() > 0.82) {
          const upSymbols = ['🔥急騰', '📈強気', '🌟注目'];
          const downSymbols = ['⚠️急落', '📉弱気', '💼警戒'];
          const newsPrefix = actionType === 'buy' ? upSymbols[Math.floor(Math.random() * upSymbols.length)] : downSymbols[Math.floor(Math.random() * downSymbols.length)];
          const news = `${newsPrefix}: ${bot.name} が 「${stock.emoji} ${stock.name}」 株を大量${actionType === 'buy' ? '買い付け' : '手放す'}！ 市場価格は ${currentData.price}J に到達。`;
          setNewsTicker(prev => [news, ...prev.slice(0, 11)]);
        }
      }

      // Event probability shifts (randomly trigger event cycles occasionally)
      if (Math.random() > 0.985 && activeEventId === 'none') {
        const randomEvent = JSE_EVENTS[Math.floor(Math.random() * JSE_EVENTS.length)];
        setActiveEventId(randomEvent.id);
        const alertMsg = `📢 臨時特別ニュース：『${randomEvent.title}』が発生中！市場の株価が急変動しています。`;
        setNewsTicker(prev => [alertMsg, ...prev]);
        triggerPopup(randomEvent.title, '⚡');
      } else if (Math.random() > 0.94 && activeEventId !== 'none') {
        // Event clears
        setActiveEventId('none');
        setNewsTicker(prev => [`🌤️ イベント終了：特別変動が収まり、市場が平常運転に復帰しました。`, ...prev]);
      }

    }, 4500);

    return () => clearInterval(timer);
  }, [stockPrices, activeEventId, tick]);

  // Seed preliminary news ticker on mount
  useEffect(() => {
    setNewsTicker([
      '📰 【今日の地味市場】週初めの相場は「風呂めんどい」が取引高首位。全体指数も底堅く推移。',
      '💬 投機BOT先延ばし証券：「明日やれば問題ない」と布団株への傾斜発言。',
      '🪙 コイン両替機が完全稼働中！Gacha Coin (GC) 1枚を 10J に瞬時両替。',
      '📈 新規上場(IPO)審査部：最近の投稿から「充電1%チャレンジ」株が上場審査を通過。'
    ]);
  }, []);

  // Check achievements on state change
  useEffect(() => {
    const triggerAchievement = (id: string, name: string) => {
      if (!unlockedAchievements.includes(id)) {
        setUnlockedAchievements(prev => [...prev, id]);
        triggerPopup(`実績解除: ${name}`, '🏆');
        
        // Sync to Main Gacha list if matches gacha store badges sync
        if (user?.uid) {
          try {
            const gState = getGachaState(user.uid);
            
            // JSE specific profiles badges addition mapped to the physical badges list
            let sysBadgeId = 'badge_gacha_starry'; 
            if (id === 'first_trade') sysBadgeId = 'badge_gacha_nazo_coin';
            if (id === 'wealth_100k') sysBadgeId = 'badge_gacha_anaaki_kinka';
            if (id === 'pnl_profit') sysBadgeId = 'badge_gacha_chisana_yusho';

            if (!gState.unlockedBadgeIds.includes(sysBadgeId)) {
              gState.unlockedBadgeIds.push(sysBadgeId);
              saveGachaState(user.uid, gState);
              onGachaStateChange();
            }
          } catch (e) {
            console.warn(e);
          }
        }
      }
    };

    // Calculate sum of active trades
    const holdingItems = Object.values(holdings);
    const totalBought = holdingItems.length;
    if (totalBought > 0) {
      triggerAchievement('first_trade', '📈初取引');
    }
    if (realizedPnL > 0) {
      triggerAchievement('first_profit', '📈初利益');
    }
    if (jCoins >= 100000) {
      triggerAchievement('wealth_100k', '📈資産10万J');
    }
    if (jCoins >= 1000000) {
      triggerAchievement('wealth_1m', '📈資産100万J');
    }
  }, [holdings, jCoins, realizedPnL, unlockedAchievements, user?.uid, onGachaStateChange]);


  const triggerPopup = (text: string, icon = '🌟') => {
    setPopupMsg({ text, icon });
    setTimeout(() => {
      setPopupMsg(null);
    }, 4500);
  };

  // Portfolio aggregates
  const portfolioAssets = useMemo(() => {
    let stockVal = 0;
    let buyCost = 0;

    Object.entries(holdings as Record<string, { qty: number; avgPrice: number }>).forEach(([id, hold]) => {
      const liveData = stockPrices[id];
      if (liveData && hold.qty > 0) {
        stockVal += hold.qty * liveData.price;
        buyCost += hold.qty * hold.avgPrice;
      }
    });

    const totalVal = jCoins + stockVal;
    const unrealized = stockVal - buyCost;

    return {
      stockValue: stockVal,
      totalNetWorth: totalVal,
      unrealizedPnL: unrealized,
      pnlRate: buyCost > 0 ? parseFloat(((unrealized / buyCost) * 100).toFixed(1)) : 0
    };
  }, [holdings, stockPrices, jCoins]);

  // --- ACTIONS ---
  
  // Calculate and apply savings interest periodically (Yield accrued on tick time gaps)
  useEffect(() => {
    if (!user) return;
    const uidKey = user.uid;
    
    // Check and calculate accrued interest since last check
    const lastCheckKey = `jse_gc_savings_last_v1_${uidKey}`;
    const lastCheck = localStorage.getItem(lastCheckKey);
    const now = Date.now();
    
    if (lastCheck && gcSavings > 0) {
      const elapsedMs = now - parseInt(lastCheck, 10);
      // Premium J-Savings Interest: 1.2% per day (Compounded daily, massive incentive to hold GC)
      // 1 day = 86,400,000 ms
      // yield rate per ms = 0.012 / 86,400,000
      const accrued = gcSavings * (0.0125 * elapsedMs / 86400000); 
      if (accrued > 0.0001) {
        const preciseSavingsKey = `jse_gc_precise_savings_v1_${uidKey}`;
        const savedPrecise = localStorage.getItem(preciseSavingsKey);
        const preciseVal = savedPrecise ? parseFloat(savedPrecise) : gcSavings;
        const newVal = preciseVal + accrued;
        
        localStorage.setItem(preciseSavingsKey, String(newVal));
        const roundedNew = Math.floor(newVal);
        if (roundedNew > gcSavings) {
          setGcSavings(roundedNew);
          localStorage.setItem(`jse_gc_savings_v1_${uidKey}`, String(roundedNew));
          
          triggerPopup(`金庫ボーナス: 預入れ中のGCにボーナス金利おやつが発生！ +${roundedNew - gcSavings} GC獲得!`, '📈');
        }
      }
    }
    localStorage.setItem(lastCheckKey, String(now));
  }, [tick, gcSavings, user?.uid]);

  // Saving deposit executing
  const handleDepositSavings = (amount: number) => {
    if (!user) {
      alert('金庫機能の利用にはログインが必要です。');
      return;
    }
    if (amount <= 0) return;
    
    const gState = getGachaState(user.uid);
    if (gState.coins < amount) {
      alert(`手持ちGCが不足しています。手元残高: ${gState.coins} GC`);
      return;
    }

    // Deduct from regular hot wallet coins
    gState.coins -= amount;
    saveGachaState(user.uid, gState);

    // Add to savings
    const uidKey = user.uid;
    const preciseSavingsKey = `jse_gc_precise_savings_v1_${uidKey}`;
    const prevPrecise = parseFloat(localStorage.getItem(preciseSavingsKey) || '0') || gcSavings;
    const newValPrecise = prevPrecise + amount;
    
    localStorage.setItem(preciseSavingsKey, String(newValPrecise));
    const rounded = Math.floor(newValPrecise);
    setGcSavings(rounded);
    localStorage.setItem(`jse_gc_savings_v1_${uidKey}`, String(rounded));

    updateGachaCoins();
    onGachaStateChange();
    triggerPopup(`金庫預入：J-金庫へ ${amount} GCを預け入れました。`, '🔐');
  };

  // Saving withdraw executing
  const handleWithdrawSavings = (amount: number) => {
    if (!user) return;
    if (amount <= 0) return;
    
    const preciseKey = `jse_gc_precise_savings_v1_${user.uid}`;
    const preciseVal = parseFloat(localStorage.getItem(preciseKey) || '0') || gcSavings;
    
    if (preciseVal < amount) {
      alert(`金庫の預入れ高を超えています。預入れ高: ${gcSavings} GC`);
      return;
    }

    const newValPrecise = preciseVal - amount;
    localStorage.setItem(preciseKey, String(newValPrecise));
    
    const rounded = Math.floor(newValPrecise);
    setGcSavings(rounded);
    localStorage.setItem(`jse_gc_savings_v1_${user.uid}`, String(rounded));

    // Refund manual GC
    const gState = getGachaState(user.uid);
    gState.coins += amount;
    saveGachaState(user.uid, gState);

    updateGachaCoins();
    onGachaStateChange();
    triggerPopup(`金庫引出：J-金庫から手財布へ ${amount} GC引き出しました。`, '🔓');
  };

  // Exchange GC (Gacha Coins) to J-Coins or vice-versa
  // 1 Gacha Coin = 10 J Coins (With large transaction bonus multipliers for GC!)
  // 100 GC -> 1200 J-Coins (12x value, +20% bonus)
  // 500 GC -> 7500 J-Coins (15x value, +50% HUGE surge!)
  const handleExchange = (direction: 'gc_to_j' | 'j_to_gc') => {
    if (!user) {
      alert('両替機能を利用するにはログインが必要です。');
      return;
    }

    if (direction === 'gc_to_j') {
      const gState = getGachaState(user.uid);
      if (gState.coins < exchangeAmount) {
        alert(`Gacha Coin (GC) が不足しています。現在の残高: ${gState.coins} GC`);
        return;
      }

      // Calculate dynamic bonus rate
      let rate = 10;
      let bonusText = '';
      if (exchangeAmount >= 500) {
        rate = 15;
        bonusText = ' (+50% 特盛大口ボーナス適用！)';
      } else if (exchangeAmount >= 100) {
        rate = 12;
        bonusText = ' (+20% 大口ボーナス適用！)';
      }

      const receivedJ = exchangeAmount * rate;

      // Deduct GC
      gState.coins -= exchangeAmount;
      saveGachaState(user.uid, gState);
      
      // Earn J
      setJCoins(prev => prev + receivedJ);
      updateGachaCoins();
      onGachaStateChange();
      triggerPopup(`両替完了: +${receivedJ.toLocaleString()} J-Coinを獲得!${bonusText}`, '🪙');
      setConfetti(true);
      setTimeout(() => setConfetti(false), 2000);
    } else {
      const requiredJ = exchangeAmount * 10;
      if (jCoins < requiredJ) {
        alert(`J-Coinが不足しています。現在の残高: ${jCoins} J`);
        return;
      }
      // Deduct J
      setJCoins(prev => prev - requiredJ);

      // Earn GC
      const gState = getGachaState(user.uid);
      gState.coins += exchangeAmount;
      saveGachaState(user.uid, gState);
      
      updateGachaCoins();
      onGachaStateChange();
      triggerPopup(`両替完了: +${exchangeAmount} GCを獲得!`, '🪙');
    }
  };

  // Buy Stocks
  const handleBuy = (stockId: string, qty: number) => {
    if (qty <= 0) return;
    const currentPrice = stockPrices[stockId]?.price || 0;
    const totalCost = currentPrice * qty;

    if (jCoins < totalCost) {
      alert(`J-コイン残高が足りません。必要金額: ${totalCost}J, 残高: ${jCoins}J`);
      return;
    }

    setJCoins(prev => prev - totalCost);
    setTradeOffsets(prev => ({
      ...prev,
      [stockId]: (prev[stockId] || 0) + qty * 1.5
    }));

    // Post to global trades Firestore so all other users immediately see the impact!
    addDoc(collection(db, 'jse_global_trades'), {
      stockId: stockId,
      qty: qty,
      type: 'buy',
      userId: user?.uid || 'guest',
      createdAt: serverTimestamp()
    }).catch((e) => {
      console.warn("Global JSE trade sync failed asynchronously:", e);
    });

    setHoldings(prev => {
      const current = prev[stockId] || { qty: 0, avgPrice: 0 };
      const newQty = current.qty + qty;
      const newAvgPrice = Math.floor(((current.qty * current.avgPrice) + (qty * currentPrice)) / newQty);

      return {
        ...prev,
        [stockId]: {
          qty: newQty,
          avgPrice: newAvgPrice
        }
      };
    });

    triggerPopup(`購入完了：${qty}株を ${totalCost}J で買い付けました！`, '📈');
    setConfetti(true);
    setTimeout(() => {
      setConfetti(false);
    }, 2000);
  };

  // Sell Stocks
  const handleSell = (stockId: string, qty: number) => {
    const current = holdings[stockId];
    if (!current || current.qty < qty || qty <= 0) {
      alert('売却可能な保有数量を超えています。');
      return;
    }

    const currentPrice = stockPrices[stockId]?.price || 0;
    const grossSale = currentPrice * qty;
    const profit = grossSale - (current.avgPrice * qty);

    setJCoins(prev => prev + grossSale);
    setRealizedPnL(prev => prev + profit);
    setTradeOffsets(prev => ({
      ...prev,
      [stockId]: (prev[stockId] || 0) - qty * 1.5
    }));

    // Post to global trades Firestore so all other users immediately see the impact!
    addDoc(collection(db, 'jse_global_trades'), {
      stockId: stockId,
      qty: qty,
      type: 'sell',
      userId: user?.uid || 'guest',
      createdAt: serverTimestamp()
    }).catch((e) => {
      console.warn("Global JSE trade sync failed asynchronously:", e);
    });

    setHoldings(prev => {
      const currentItem = prev[stockId];
      if (currentItem.qty === qty) {
        const copy = { ...prev };
        delete copy[stockId];
        return copy;
      }
      return {
        ...prev,
        [stockId]: {
          qty: currentItem.qty - qty,
          avgPrice: currentItem.avgPrice
        }
      };
    });

    triggerPopup(`売却完了：${qty}株を ${grossSale}J で売却しました。損益: ${profit >= 0 ? '+' : ''}${profit}J`, '📉');
  };

  // --- AI INVESTMENT MUTUAL FUNDS SELECTORS & HANDLERS ---
  const aiFunds = useMemo(() => {
    // Dynamic Net Asset Value (NAV) of funds based on ticks and offsets
    const stableNav = Math.max(20, Math.floor(100 + (tick * 0.12) + (Math.sin(tick * 0.1) * 3)));
    const growthNav = Math.max(30, Math.floor(100 + (tick * 0.28) + (Math.sin(tick * 0.3) * 14) + (Math.cos(tick * 0.8) * 5)));
    const leverageNav = Math.max(10, Math.floor(100 + (tick * 0.45) + (Math.sin(tick * 0.5) * 35) + (Math.cos(tick * 0.2) * 15)));

    return [
      {
        id: 'stable_index',
        name: '安藤守の堅実あるあるディフェンシブ',
        nameEn: 'Mamoru Stable Index Fund',
        desc: '日常生活の根幹的な不便（風呂、靴下消失など）に特化した、超ディフェンシブな防衛戦略型インデックス。急な下落に非常に強い。',
        strategy: '安定優良株（風呂・靴下など）にほぼ100%均等分散投資',
        managerName: '安藤 守 (Mamoru Ando)',
        managerAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Mamoru',
        riskLevel: 'Low' as const,
        expectedReturn: '+3.5% 〜 +8.0%',
        currentNav: stableNav,
        advice: `「現在、検出されている地味話の傾向から見て、お風呂や靴下に関する日常ストレスは人類共通の普遍インフラです。一時的な市場ノイズに惑わされず、長期かつ堅実な積立をお勧めします。」`,
        holdingsDesc: '🛀 風呂めんどい (45%), 🧦 靴下片方消失 (35%), 🔑 鍵どこだっけ (20%)'
      },
      {
        id: 'aggressive_momentum',
        name: '速水駆のクォンタムあるあるアクティブ',
        nameEn: 'Kakeru Alpha Active Fund',
        desc: '世間の共感トレンドやAI検出レポートを最高速度で検出。夜更かしや布団 gravity など、ボラティリティの高い現象の波を乗りこなす。',
        strategy: 'ボラティリティ上位株、及び最新AIマッチ報告に関連するトレンド株に集中投資',
        managerName: '速水 駆 (Kakeru Hayami)',
        managerAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Kakeru',
        riskLevel: 'Medium' as const,
        expectedReturn: '+15.0% 〜 +32.0%',
        currentNav: growthNav,
        advice: `「先ほど入ったJSEレポートによれば、深夜帯にかけて『なんとなく夜更かし』『布団から出られない』に強い熱気と共感モメンタムが発生しています！今すぐ買い増すのが最善手。迷う時間はありませんよ！」`,
        holdingsDesc: '🌙 なんとなく夜更かし (40%), 🛌 布団から出られない (30%), 🔌 充電1% (30%)'
      },
      {
        id: 'speculative_lev',
        name: '明日野伸の先延ばしハイレバ時間差ファンド',
        nameEn: 'Asuno Limitless Procrastinator Leveraged',
        desc: '「今日できることは絶対に明日する」。宿題やテスト前焦りで発生するエネルギーをレバレッジ効果で極大化し、爆発的ハイリターンに賭ける。',
        strategy: '期限直前（宿題先延ばし・テスト前焦り等）の高確率アノマリー特化、3倍レバレッジ相当 of ボラティリティ。',
        managerName: '明日野 伸 (Shin Asuno)',
        managerAvatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Shin',
        riskLevel: 'High' as const,
        expectedReturn: '-50.0% 〜 +250.0%',
        currentNav: leverageNav,
        advice: `「テスト当日までの蓄積された焦りエネルギーは核爆弾並み。明日になればなんとかなります！だから今日はこのファンドに全力で預けて、ゆっくり漫画を読みましょう。」`,
        holdingsDesc: '✏️ 宿題先延ばし (50%), 📝 テスト前焦り (50%) [3x Leverage]'
      }
    ];
  }, [tick]);

  const handleTrustDeposit = (fundId: string, amount: number) => {
    if (amount <= 0) return;
    if (jCoins < amount) {
      alert(`J-コインが不足しています。必要金額: ${amount} J, 残高: ${jCoins} J`);
      return;
    }

    const fund = aiFunds.find(f => f.id === fundId);
    if (!fund) return;

    const nav = fund.currentNav;
    const sharesPurchased = amount / nav;

    setJCoins(prev => prev - amount);
    setAiFundDeposits(prev => {
      const current = prev[fundId] || { balance: 0, shares: 0 };
      const newShares = current.shares + sharesPurchased;
      return {
        ...prev,
        [fundId]: {
          shares: newShares,
          balance: Math.floor(newShares * nav)
        }
      };
    });

    triggerPopup(`AI投資信託に ${amount}J 預けました！マネージャー: ${fund.managerName}`, '🤖');
    setConfetti(true);
    setTimeout(() => setConfetti(false), 2000);
  };

  const handleTrustWithdraw = (fundId: string) => {
    const record = aiFundDeposits[fundId];
    if (!record || record.shares <= 0) {
      alert('投資残高がありません。');
      return;
    }

    const fund = aiFunds.find(f => f.id === fundId);
    if (!fund) return;

    const nav = fund.currentNav;
    const returnAmount = Math.floor(record.shares * nav);

    setJCoins(prev => prev + returnAmount);
    setAiFundDeposits(prev => ({
      ...prev,
      [fundId]: {
        shares: 0,
        balance: 0
      }
    }));

    triggerPopup(`AI投資信託を引き出しました。受取金額: ${returnAmount} J`, '💸');
  };

  // Phenomenon ETF purchases
  const handleBuyETF = (etfType: 'school' | 'winter' | 'lost') => {
    let basket: string[] = [];
    let name = '';
    if (etfType === 'school') {
      basket = ['homework_pro', 'test_panic', 'late_dash'];
      name = '🏫 学校満喫ETF';
    } else if (etfType === 'winter') {
      basket = ['futon_escape', 'furo_mendoi', 'yofukashi_late'];
      name = '❄️ 自堕落な冬ETF';
    } else {
      basket = ['key_disappear', 'socks_lost', 'refrigerator_forget'];
      name = '🧦 忘れ物ワンダーランドETF';
    }

    // Determine raw combined price of constituents
    let singleBasketPrice = 0;
    basket.forEach(sid => {
      singleBasketPrice += stockPrices[sid]?.price || allStocks.find(s => s.id === sid)?.basePrice || 100;
    });

    // 5% discount rate on packs
    const discountedPrice = Math.floor(singleBasketPrice * 0.95);
    const multiplier = 5; // purchases 5 shares of each
    const totalCost = discountedPrice * multiplier;

    if (jCoins < totalCost) {
      alert(`J-Coinが不足しています。必要金額: ${totalCost}J, 残高: ${jCoins}J`);
      return;
    }

    // Execute buys
    setJCoins(prev => prev - totalCost);
    setHoldings(prev => {
      const updated = { ...prev };
      basket.forEach(sid => {
        const itemPrice = stockPrices[sid]?.price || 100;
        const current = updated[sid] || { qty: 0, avgPrice: 0 };
        const newQty = current.qty + multiplier;
        const newAvg = Math.floor(((current.qty * current.avgPrice) + (multiplier * itemPrice)) / newQty);
        updated[sid] = { qty: newQty, avgPrice: newAvg };
      });
      return updated;
    });

    triggerPopup(`${name} 包パックを 5セット購入しました！ (-5% 割引適用)`, '📦');
  };

  // Sell ETF Basket
  const handleSellETF = (etfType: 'school' | 'winter' | 'lost') => {
    let basket: string[] = [];
    if (etfType === 'school') basket = ['homework_pro', 'test_panic', 'late_dash'];
    else if (etfType === 'winter') basket = ['futon_escape', 'furo_mendoi', 'yofukashi_late'];
    else basket = ['key_disappear', 'socks_lost', 'refrigerator_forget'];

    // Check if user has at least 5 shares of each basket component
    const hasEnough = basket.every(sid => (holdings[sid]?.qty || 0) >= 5);
    if (!hasEnough) {
      alert('ETFを分解して売却するには、バスケット内すべての構成銘柄をそれぞれ5株以上保有している必要があります。');
      return;
    }

    let combinedValue = 0;
    basket.forEach(sid => {
      const livePrice = stockPrices[sid]?.price || 100;
      combinedValue += livePrice * 5;
    });

    // Execute sells
    setJCoins(prev => prev + combinedValue);
    setHoldings(prev => {
      const updated = { ...prev };
      basket.forEach(sid => {
        const current = updated[sid];
        if (current.qty === 5) {
          delete updated[sid];
        } else {
          updated[sid] = {
            qty: current.qty - 5,
            avgPrice: current.avgPrice
          };
        }
      });
      return updated;
    });

    // Calculate total net profit
    triggerPopup(`ETF分解売却完了：構成株を分解し、合計 ${combinedValue}J を回収しました。`, '📉');
  };

  // --- D3-Equivalent SVG Chart Paths Generator ---
  const currentSelectedStock = allStocks.find(s => s.id === selectedStockId) || allStocks[0];
  const chartPoints = useMemo(() => {
    const stats = scenesTextStats[currentSelectedStock.id] || { posts: 10, upvotes: 20, comments: 2 };
    
    // Hash function to get localized deterministic key for stock variation
    const getStockSeed = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return Math.abs(hash);
    };

    const stockSeed = getStockSeed(currentSelectedStock.id);
    const history = priceHistories[currentSelectedStock.id] || [];

    // Fallback if price history isn't initialized yet
    if (history.length === 0) {
      return Array.from({ length: 30 }).map((_, i) => ({
        value: currentSelectedStock.basePrice,
        label: `${i}:00`
      }));
    }

    let rawValues = [...history];

    // Crop or filter the historical records based on chart periods requested
    let count = 24;
    if (chartPeriod === '1D') count = 12;
    else if (chartPeriod === '1W') count = 24;
    else if (chartPeriod === '1M') count = 35;
    else if (chartPeriod === '3M') count = 45;
    else count = rawValues.length;

    // slice the tail (most recent data elements)
    if (rawValues.length > count) {
      rawValues = rawValues.slice(rawValues.length - count);
    }

    const points: { value: number; label: string }[] = [];

    rawValues.forEach((val, i) => {
      let finalVal = val;
      if (chartType === 'volume') {
        const volAmp = 150 + (stockSeed % 200);
        finalVal = Math.max(10, Math.floor((volAmp + Math.sin(i / 2) * 20) * (0.9 + (i / rawValues.length) * 0.3)));
      } else if (chartType === 'posts') {
        finalVal = Math.max(1, Math.floor(stats.posts + Math.sin(i / 3) * (stats.posts * 0.12)));
      }

      // Generate localized time/date strings
      let label = `${i}:00`;
      if (chartPeriod === '1W') label = `Day ${i + 1}`;
      else if (chartPeriod === '1M') label = `Date ${i + 1}`;
      else if (chartPeriod === '3M') label = `Week ${Math.floor(i / 7) + 1}`;
      else if (chartPeriod === 'ALL') label = `Month ${Math.floor(i / 15) + 1}`;

      points.push({ value: Math.max(1, finalVal), label });
    });

    return points;
  }, [currentSelectedStock, chartPeriod, chartType, tick, scenesTextStats, priceHistories]);

  // Generate interactive SVG viewport layout
  const svgPath = useMemo(() => {
    if (chartPoints.length < 2) return '';
    const width = 600;
    const height = 180;
    const values = chartPoints.map(p => p.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const avgPrice = values.reduce((sum, v) => sum + v, 0) / (values.length || 1);
    
    // Ensure vertical range of chart is at least 15% of average price to prevent micro-fluctuations looking like wild peaks & crashes
    const minRange = Math.max(20, avgPrice * 0.15);
    let minVal = rawMin;
    let maxVal = rawMax;
    
    if (maxVal - minVal < minRange) {
      const mid = (minVal + maxVal) / 2;
      minVal = Math.max(1, mid - minRange / 2);
      maxVal = mid + minRange / 2;
    } else {
      const margin = (maxVal - minVal) * 0.05;
      minVal = Math.max(1, minVal - margin);
      maxVal = maxVal + margin;
    }
    const range = maxVal - minVal || 1;

    let pathD = '';
    chartPoints.forEach((p, idx) => {
      const x = (idx / (chartPoints.length - 1)) * width;
      const y = height - ((p.value - minVal) / range) * height;
      if (idx === 0) {
        pathD += `M ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
      }
    });

    // Close the loop to create transparent backdrop gradient path
    const fillD = `${pathD} L 600 180 L 0 180 Z`;

    return { stroke: pathD, fill: fillD, minVal, maxVal };
  }, [chartPoints]);

  const [showOpening, setShowOpening] = useState(() => {
    return sessionStorage.getItem(`seen_jse_opening_${user?.uid || 'guest'}`) !== 'true';
  });

  const handleSkipOpening = () => {
    sessionStorage.setItem(`seen_jse_opening_${user?.uid || 'guest'}`, 'true');
    setShowOpening(false);
  };

  return (
    <div id="jse-root" className="bg-[#FAF9F5] rounded-3xl border border-orange-100/70 p-4 sm:p-6 shadow-xl relative overflow-hidden select-none">
      
      {/* Immersive Welcome Opening Animation Overlay */}
      <AnimatePresence>
        {showOpening && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-[#0c0a09] z-50 flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <div className="max-w-md w-full space-y-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0, 1, 1, 1], scale: [0.9, 1, 1, 1] }}
                transition={{ duration: 4.5, times: [0, 0.2, 0.8, 1] }}
                className="space-y-4"
              >
                <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-3xl flex items-center justify-center text-3xl shadow-xl shadow-orange-500/10 border border-orange-500/20 animate-pulse">
                  📈
                </div>
                <h1 className="font-sans font-black text-2.5xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-amber-100 uppercase">
                  Jimi Stock Exchange
                </h1>
                <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-orange-500 font-bold">
                  Human Phenomenon Market Board
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 1.2 }}
                className="space-y-3"
              >
                <p className="text-sm font-black text-white leading-relaxed font-sans">
                  「人類の日常あるある現象」を、株にする。
                </p>
                <p className="text-[10.5px] font-bold text-orange-200/70 leading-relaxed max-w-xs mx-auto animate-pulse-slow">
                  お風呂をサボった瞬間、布団から出られない焦燥感。人々の共感と流行が、もう一つの市場価値を形作ります。
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8, duration: 1 }}
                className="pt-6"
              >
                <button
                  onClick={handleSkipOpening}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-orange-600/10 cursor-pointer transition flex items-center gap-2 mx-auto"
                >
                  <span>経済圏に参入する 🚀</span>
                </button>
              </motion.div>
            </div>

            <button
              onClick={handleSkipOpening}
              className="absolute bottom-6 right-6 text-[10px] font-black text-stone-600 hover:text-stone-400 font-mono tracking-widest uppercase cursor-pointer"
            >
              SKIP ≫
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Dynamic Popups for Achievements/Notices */}
      <AnimatePresence>
        {popupMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-4 left-4 right-4 z-50 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-4 shadow-lg border border-amber-300 flex items-center gap-3"
          >
            <span className="text-3xl animate-bounce">{popupMsg.icon}</span>
            <div>
              <p className="font-extrabold text-sm tracking-wide">地味っち経済新聞速報</p>
              <p className="text-xs text-orange-50 font-medium">{popupMsg.text}</p>
            </div>
            <button className="ml-auto p-1 text-white/80 hover:text-white" onClick={() => setPopupMsg(null)}><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen Confetti Trigger */}
      {confetti && (
        <div className="absolute inset-0 pointer-events-none z-40 bg-orange-500/5 mix-blend-color-burn animate-flash flex items-center justify-center">
          <p className="text-sm font-black text-orange-600 animate-bounce">📈 MARKET BUY APPROVED (JSE)</p>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-orange-100 pb-5 mb-5 gap-4">
        <div>
          <span className="text-2xl sm:text-3xl font-black flex items-center gap-2 text-orange-950 font-display">
            📈 JSE <span className="text-xs bg-orange-900 text-orange-50 font-black px-2 py-0.5 rounded-full uppercase tracking-widest leading-none">v1.0 SPEC</span>
          </span>
          <p className="text-xs font-bold text-orange-700/80 mt-1">Jimi Stock Exchange / 地味っちの「あるある」を上場した仮想株式市場</p>
        </div>

        {/* Assets Glance */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Main User Coins Reference and Exchange Switcher */}
          <div className="flex items-center gap-1.5 bg-white border border-orange-100 rounded-2xl px-3 py-2 shadow-sm">
            <Coins className="w-4 h-4 text-amber-500" />
            <div className="text-right">
              <p className="text-[9px] font-black uppercase text-amber-800 leading-none">MY J-COINS</p>
              <p className="text-sm font-black text-orange-950">{jCoins.toLocaleString()}<span className="text-[10px] text-orange-800 ml-0.5">J</span></p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-orange-100 rounded-2xl px-3 py-2 shadow-sm">
            <Coins className="w-4 h-4 text-orange-500" />
            <div className="text-right">
              <p className="text-[9px] font-black uppercase text-orange-400 leading-none">MY GC (GACHA)</p>
              <p className="text-sm font-black text-orange-950">{gachaCoins.toLocaleString()}<span className="text-[10px] text-orange-850 ml-0.5">GC</span></p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onBack}
            className="bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl px-4 py-3 text-xs font-black transition cursor-pointer active:scale-95"
          >
            ← 広場へ戻る
          </button>
        </div>
      </div>

      {/* Horizontal Scrolling live news ticker */}
      <div className="bg-orange-950 text-orange-200 py-2.5 px-4 rounded-xl text-xs font-medium mb-6 overflow-hidden flex items-center gap-2 border border-orange-900/60 shadow-inner">
        <span className="shrink-0 bg-red-600 font-extrabold text-[10px] text-white px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
          <Activity className="w-3 h-3 animate-pulse" /> LIVE
        </span>
        <div className="w-full relative overflow-hidden h-4">
          <div className="absolute inset-0 whitespace-nowrap animate-marquee flex items-center gap-20">
            {newsTicker.length > 0 ? newsTicker.join('   |   ') : '価格気配値センサー：市場は安定稼働しています。'}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 border-b border-orange-100 pb-3 mb-6 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('market')}
          className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-extrabold transition-all outline-none cursor-pointer ${activeTab === 'market' ? 'bg-orange-900 text-white shadow' : 'text-orange-800/60 hover:bg-orange-50'}`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>市場ボード (Board)</span>
        </button>

        <button 
          onClick={() => setActiveTab('portfolio')}
          className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-extrabold transition-all outline-none cursor-pointer ${activeTab === 'portfolio' ? 'bg-orange-900 text-white shadow' : 'text-orange-800/60 hover:bg-orange-50'}`}
        >
          <Briefcase className="w-4 h-4" />
          <span>マイポートフォリオ (Portfolio)</span>
          {Object.keys(holdings).length > 0 && (
            <span className="bg-orange-500 text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
              {Object.keys(holdings).length}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab('etf')}
          className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-extrabold transition-all outline-none cursor-pointer ${activeTab === 'etf' ? 'bg-orange-900 text-white shadow' : 'text-orange-850/60 hover:bg-orange-50'}`}
        >
          <Layers className="w-4 h-4" />
          <span>現象ETFパック (Baskets)</span>
        </button>

        <button 
          onClick={() => setActiveTab('trust')}
          className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-extrabold transition-all outline-none cursor-pointer ${activeTab === 'trust' ? 'bg-orange-900 text-white shadow' : 'text-orange-850/60 hover:bg-orange-50'}`}
        >
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>AI投資信託 (AI Mutual Funds)</span>
        </button>

        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-extrabold transition-all outline-none cursor-pointer ${activeTab === 'profile' ? 'bg-orange-900 text-white shadow' : 'text-orange-850/60 hover:bg-orange-50'}`}
        >
          <Award className="w-4 h-4 text-orange-600 animate-pulse-subtle" />
          <span>JSEマイプロフ・創設 👑</span>
        </button>

        <button 
          onClick={() => setActiveTab('about')}
          className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-extrabold transition-all outline-none cursor-pointer ${activeTab === 'about' ? 'bg-orange-900 text-white shadow' : 'text-orange-850/60 hover:bg-orange-50'}`}
        >
          <Info className="w-4 h-4" />
          <span>市場の仕組み (Guide)</span>
        </button>
      </div>

      {/* --- CONTENT LAYOUTS BASED ON TABS --- */}

      {activeTab === 'market' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left panel: Live Stocks board */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wide text-orange-900">上場銘柄リスト (Listed Phenomena)</span>
                <span className="text-[10px] text-orange-400 font-bold">自動更新中 (Tick: {tick})</span>
              </div>

              {/* JSE Table Header */}
              <div className="grid grid-cols-12 gap-1 text-[10px] font-black uppercase text-orange-800 border-b border-orange-50 pb-2 mb-2">
                <div className="col-span-5">銘柄名 / テーマ</div>
                <div className="col-span-3 text-right">現在価格</div>
                <div className="col-span-2 text-right">前日比</div>
                <div className="col-span-2 text-right">保有</div>
              </div>

              {/* Listed rows */}
              <div className="divide-y divide-orange-50 max-h-[380px] overflow-y-auto no-scrollbar pr-1">
                {allStocks.map(stock => {
                  const data = stockPrices[stock.id] || { price: stock.basePrice, change24h: 0 };
                  const myHold = holdings[stock.id]?.qty || 0;
                  const isUp = data.change24h >= 0;
                  const isSelected = stock.id === selectedStockId;
                  
                  return (
                    <div 
                      key={stock.id}
                      onClick={() => setSelectedStockId(stock.id)}
                      className={`grid grid-cols-12 gap-1 py-2.5 px-2 items-center cursor-pointer transition rounded-xl ${isSelected ? 'bg-orange-500/10 border border-orange-300' : 'hover:bg-orange-50/70 border border-transparent'}`}
                    >
                      <div className="col-span-5 flex items-center gap-2">
                        <span className="text-xl shrink-0">{stock.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-orange-950 truncate">{stock.name}</p>
                          <div className="flex flex-col">
                            <p className="text-[9px] text-orange-400 font-bold truncate">{stock.nameEn}</p>
                            {['furo_mendoi', 'futon_escape'].includes(stock.id) && (
                              <span className="bg-amber-100 text-amber-700 font-extrabold text-[8px] px-1 py-0.2 rounded-md max-w-max mt-0.5 scale-95 origin-left">
                                🔥 初心者おすすめ
                              </span>
                            )}
                            {stock.founderId && (
                              <span className="bg-orange-100 text-orange-850 font-extrabold text-[8px] px-1 py-0.2 rounded-md max-w-max mt-0.5 scale-95 origin-left">
                                👑 創設株: {stock.founderName || '匿名'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="col-span-3 text-right font-mono text-xs font-black">
                        {data.price}<span className="text-[9px] text-orange-800 font-bold ml-0.5">J</span>
                      </div>

                      <div className={`col-span-2 text-right font-mono text-[10px] font-bold flex items-center justify-end gap-0.5 ${isUp ? 'text-red-600' : 'text-blue-600'}`}>
                        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        <span>{isUp ? '+' : ''}{data.change24h}%</span>
                      </div>

                      <div className="col-span-2 text-right">
                        {myHold > 0 ? (
                          <span className="bg-orange-100 text-orange-900 font-bold text-[10px] px-2 py-0.5 rounded-full">
                            {myHold}株
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-300 font-bold">-</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Market Maker Ticker Feed */}
            <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wide text-orange-950 flex items-center gap-1">
                  🤖 AIマーケットメーカー取引履歴
                </span>
                <span className="text-[10px] text-orange-500 font-bold">24時間監視中</span>
              </div>

              <div className="space-y-2 max-h-[140px] overflow-y-auto no-scrollbar text-[10px] font-medium pr-1">
                {botLogs.map((log, i) => (
                  <div key={i} className="flex items-center justify-between bg-stone-50 p-2 rounded-xl border border-stone-100">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">🤖</span>
                      <strong className="text-orange-950">{log.botName}</strong>
                    </div>

                    <div className="flex items-center gap-1.5 text-center px-1">
                      <span className="bg-stone-200 text-stone-800 px-1 py-0.5 rounded text-[9px] font-extrabold">{log.stockEmoji} {log.stockName}</span>
                      <span className={`font-black uppercase px-1 rounded ${log.type === 'buy' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        {log.type === 'buy' ? 'BUY (買い)' : 'SELL (売り)'}
                      </span>
                    </div>

                    <div className="font-mono text-orange-950">
                      <strong>{log.qty}株</strong> @ {log.price}J
                    </div>
                  </div>
                ))}
                {botLogs.length === 0 && (
                  <p className="text-stone-400 text-center py-4">BOT投資家たちが気配値を見極めるためにスタンバイしています...</p>
                )}
              </div>
            </div>

            {/* AI Post Match Dynamic Reports Feed */}
            <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wide text-orange-950 flex items-center gap-1">
                  📰 AI地味投稿・上場株一致速報 (Realtime JSE Reports)
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              </div>

              <div className="space-y-2.5 max-h-[190px] overflow-y-auto no-scrollbar text-[11px] font-semibold pr-1">
                {reportedMatches.map((report, i) => {
                  const stock = allStocks.find(s => s.id === report.stockId);
                  return (
                    <div key={report.id || i} className="bg-orange-50/50 p-2.5 rounded-xl border border-orange-100/60 hover:bg-orange-50 transition">
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="bg-orange-900 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded leading-none shrink-0 uppercase">
                          {stock ? `${stock.emoji} ${stock.name}` : report.stockId}
                        </span>
                        <span className="text-[9px] font-bold text-orange-400 shrink-0">
                          {report.authorName} さんの投稿
                        </span>
                      </div>
                      <p className="text-orange-950 font-black leading-relaxed">
                        {report.explanation}
                      </p>
                      <p className="text-[9.5px] font-bold text-stone-400 mt-1 italic">
                        検出投稿: 「{report.postTitle}」 | 株価への影響: <span className="text-red-650 font-black">+25.0 J</span>
                      </p>
                    </div>
                  );
                })}
                {reportedMatches.length === 0 && (
                  <p className="text-stone-400 text-center py-6 text-xs font-bold leading-relaxed">
                    地味広場で日常あるあるを新しく投稿すると、AIがリアルタイムで検知・分析し、ここに自動的に上場株への影響レポート（+25J）が掲載されます。
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right panel: Active Stock interactives, details & interactive SVG chart graph */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm space-y-4">
              
              {/* Selected Stock header */}
              <div className="flex items-center gap-3">
                <span className="text-3xl bg-orange-50 border border-orange-100 p-2 rounded-2xl">{currentSelectedStock.emoji}</span>
                <div>
                  <h3 className="text-base font-black text-orange-950 flex items-center gap-1.5">
                    {currentSelectedStock.name}
                  </h3>
                  <p className="text-xs text-orange-400 font-bold uppercase tracking-wider">{currentSelectedStock.nameEn}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-[11px] leading-relaxed text-orange-900 bg-orange-50/40 p-3 rounded-xl border border-orange-100/50">
                {currentSelectedStock.descriptionJa}
              </p>

              {/* SVG Charts Area */}
              <div className="bg-stone-900 text-stone-100 rounded-2xl p-3 shadow-inner relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setChartType('price')}
                      className={`text-[9px] px-2 py-1 rounded font-black ${chartType === 'price' ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400'}`}
                    >
                      株価
                    </button>
                    <button 
                      onClick={() => setChartType('volume')}
                      className={`text-[9px] px-2 py-1 rounded font-black ${chartType === 'volume' ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400'}`}
                    >
                      売買数
                    </button>
                    <button 
                      onClick={() => setChartType('posts')}
                      className={`text-[9px] px-2 py-1 rounded font-black ${chartType === 'posts' ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400'}`}
                    >
                      投稿数
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {(['1D', '1W', '1M', '3M', 'ALL'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setChartPeriod(p)}
                        className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold ${chartPeriod === p ? 'bg-orange-600 text-white' : 'text-stone-400 hover:text-stone-100'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SVG path render */}
                <div className="h-[140px] w-full flex items-center justify-center relative bg-stone-950 rounded-xl overflow-hidden mt-1 border border-stone-800/80">
                  <svg className="w-full h-full" viewBox="0 0 600 180" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Horizontal grid guide lines */}
                    <line x1="0" y1="45" x2="600" y2="45" stroke="#2D3748" strokeWidth="0.5" strokeDasharray="3,3" />
                    <line x1="0" y1="90" x2="600" y2="90" stroke="#2D3748" strokeWidth="0.5" strokeDasharray="3,3" />
                    <line x1="0" y1="135" x2="600" y2="135" stroke="#2D3748" strokeWidth="0.5" strokeDasharray="3,3" />

                    {svgPath && (
                      <>
                        {/* Area gradient */}
                        <path d={svgPath.fill} fill="url(#chart-area-grad)" />
                        {/* Stroke path */}
                        <path d={svgPath.stroke} fill="none" stroke="#F59E0B" strokeWidth="2.5" />
                      </>
                    )}
                  </svg>

                  {/* Interactive indicators */}
                  <div className="absolute top-2 left-3 text-[10px] text-stone-500 font-mono">
                    MAX: {svgPath ? Math.floor(svgPath.maxVal) : 200} / MIN: {svgPath ? Math.floor(svgPath.minVal) : 50}
                  </div>
                  
                  {/* Current floating state annotation */}
                  <div className="absolute bottom-2 right-3 font-mono text-[9px] bg-stone-800 text-stone-200 px-2 py-0.5 rounded-md border border-stone-700">
                    現在の気配: {stockPrices[currentSelectedStock.id]?.price || currentSelectedStock.basePrice} J
                  </div>
                </div>
              </div>

              {/* Related Profile content connections (Unlocks) */}
              <div className="bg-stone-50 rounded-2xl p-3 border border-orange-100 flex items-center justify-between text-[11px] font-bold">
                <span className="text-orange-950">関連バッジ・称号</span>
                <div className="flex gap-1.5">
                  <span className="bg-white border border-orange-200 text-teal-700 px-2.5 py-1 rounded-xl shadow-xs">
                    🏷️ 称号: {currentSelectedStock.relatedTitle || 'JSE共感者'}
                  </span>
                  {currentSelectedStock.relatedBadgeId && (
                    <span className="bg-white border border-orange-200 text-rose-700 px-2.5 py-1 rounded-xl shadow-xs">
                      🏆 バッジ: 有
                    </span>
                  )}
                </div>
              </div>

              {/* BUY & SELL Interactive Dashboard */}
              <div className="border hover:border-orange-200 border-orange-100 rounded-2xl p-4 bg-orange-50/20 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-orange-900">取引を実行するカウンター</span>
                  <div className="flex items-center bg-white border border-orange-200 rounded-xl px-2 py-0.5">
                    <button onClick={() => setTradeQty(q => Math.max(1, q - 5))} className="font-extrabold text-[#7c2d12] px-1 bg-transparent">-</button>
                    <span className="font-bold text-xs px-2 text-stone-800">{tradeQty}株</span>
                    <button onClick={() => setTradeQty(q => q + 5)} className="font-extrabold text-[#7c2d12] px-1 bg-transparent">+</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button 
                    type="button"
                    onClick={() => handleBuy(currentSelectedStock.id, tradeQty)}
                    className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow transition cursor-pointer active:scale-95"
                  >
                    📈 買注文 (BUY)
                    <p className="text-[10px] text-white/80 font-mono mt-0.5">費: {((stockPrices[currentSelectedStock.id]?.price || currentSelectedStock.basePrice) * tradeQty).toLocaleString()} J</p>
                  </button>

                  <button 
                    type="button"
                    disabled={!holdings[currentSelectedStock.id] || holdings[currentSelectedStock.id].qty < tradeQty}
                    onClick={() => handleSell(currentSelectedStock.id, tradeQty)}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:pointer-events-none text-white font-extrabold text-xs py-3.5 rounded-2xl shadow transition cursor-pointer active:scale-95"
                  >
                    📉 売注文 (SELL)
                    <p className="text-[10px] text-white/80 font-mono mt-0.5">回: {((stockPrices[currentSelectedStock.id]?.price || currentSelectedStock.basePrice) * tradeQty).toLocaleString()} J</p>
                  </button>
                </div>
              </div>

            </div>

            {/* J-Coins 両替所 & GC特別金庫 (Currency Exchange & Savings panel) */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-orange-200/70 rounded-[32px] p-6 space-y-4 shadow-sm">
                <h4 className="text-xs font-black text-orange-950 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-orange-600 animate-bounce-subtle" />
                  GC (ガチャコイン) 価値爆上げ特別両替所
                </h4>
                <div className="text-[10.5px] text-orange-900 font-bold leading-relaxed space-y-2">
                  <p>
                    地味機密ガチャで獲得する貴重な <strong className="text-orange-950">GC (Gacha Coins)</strong> が、JSE市場を介して超強化！
                    今やGCは単なるガチャコインではなく、両替枚数に応じて驚異のボーナスおやつ（J-Coins）に変換できる特権アセットです。
                  </p>
                  <div className="bg-white/75 border border-orange-100 rounded-2xl p-3 space-y-1 font-mono text-[9px] text-orange-950">
                    <div className="flex justify-between border-b border-orange-50 pb-1">
                      <span>🎟️ 通常両替 (10 GC以上)</span>
                      <span>1 GC ＝ <strong>10 J-Coins</strong></span>
                    </div>
                    <div className="flex justify-between border-b border-orange-50 pb-1 text-emerald-800 font-black">
                      <span>🔥 大口中盛り (100 GC以上)</span>
                      <span>1 GC ＝ <strong>12 J-Coins (+20%増!)</strong></span>
                    </div>
                    <div className="flex justify-between font-black text-rose-850">
                      <span>👑 特盛設立祝 (500 GC以上)</span>
                      <span>1 GC ＝ <strong>15 J-Coins (+50%超特盛増!)</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white/90 p-2.5 rounded-2xl border border-orange-200 shadow-inner">
                  <input 
                    type="number" 
                    min="10"
                    step="10"
                    value={exchangeAmount} 
                    onChange={e => setExchangeAmount(Math.max(10, parseInt(e.target.value, 10)))}
                    className="bg-orange-50/30 text-xs font-black text-orange-950 outline-none w-20 px-2.5 py-1.5 rounded-xl border border-orange-200"
                  />
                  <div>
                    <span className="text-[9px] font-black text-orange-400 block -mb-0.5">両替数量入力</span>
                    <span className="text-[10px] font-black text-orange-850 uppercase">GC Coin</span>
                  </div>

                  <div className="flex gap-1.5 ml-auto">
                    <button 
                      onClick={() => handleExchange('gc_to_j')}
                      className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-[10px] font-black px-4 py-2.5 rounded-xl shadow-xs transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer animate-pulse-subtle"
                    >
                      大口GC → J
                    </button>
                    <button 
                      onClick={() => handleExchange('j_to_gc')}
                      className="bg-stone-850 hover:bg-stone-900 text-stone-200 text-[10px] font-black px-3 py-2.5 rounded-xl transition cursor-pointer"
                      title="10J-Coinsを1GCに両替します（※手数料なし等倍）"
                    >
                      J → GC
                    </button>
                  </div>
                </div>
              </div>

              {/* J-金庫 (GC Savings vault) */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50/70 border border-indigo-200/50 rounded-[32px] p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                    <span>🔐</span> JSE-金庫 (GC 高利回り定期預入システム)
                  </h4>
                  <span className="text-[9px] bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full font-black animate-pulse">
                    日歩 1.25% (超高金利)
                  </span>
                </div>
                
                <p className="text-[10px] text-indigo-800 font-bold leading-relaxed">
                  手元のGCを金庫にロックしておくだけで、地味に時間が過ぎるごとにおやつの気持ち利息が自動加算されます。
                  <span className="block mt-1 text-indigo-900 font-black">※ 年利換算 456% 相当！いつでもペナルティなしで手財布に引き出し可能です。</span>
                </p>

                <div className="bg-white/90 rounded-2xl p-3 border border-indigo-100 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[9.5px] font-bold text-indigo-400 block">金庫の中身 (GC Savings)</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-indigo-950 font-mono">
                        {gcSavings.toLocaleString()}
                      </span>
                      <span className="text-[9.5px] text-indigo-700 font-black">GC</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-indigo-400 block">現在の手元財布残高</span>
                    <span className="text-xs font-black text-indigo-950 font-mono">
                      {gachaCoins} <span className="text-[9px] font-bold text-indigo-700">GC</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 bg-white/70 p-2 rounded-xl border border-indigo-100">
                    <input 
                      type="number" 
                      min="5" 
                      step="5"
                      value={savingActionAmount}
                      onChange={e => setSavingActionAmount(Math.max(1, parseInt(e.target.value, 10)))}
                      className="bg-indigo-50/20 text-xs font-black text-indigo-950 outline-none w-14 p-1 rounded-lg border border-indigo-100"
                    />
                    <span className="text-[9px] font-extrabold text-indigo-700">GC アクション高</span>
                    <div className="flex gap-1 ml-auto flex-1 justify-end">
                      <button 
                        onClick={() => handleDepositSavings(savingActionAmount)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9.5px] font-black px-3 py-1.5 rounded-lg shadow-xs transition"
                      >
                        預入 📥
                      </button>
                      <button 
                        onClick={() => handleWithdrawSavings(savingActionAmount)}
                        className="bg-purple-800 hover:bg-purple-900 text-white text-[9.5px] font-black px-2.5 py-1.5 rounded-lg shadow-xs transition"
                      >
                        引出 🔓
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* PORTFOLIO ACCUMULATION VIEW */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Total Balance info card */}
            <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-orange-400">総資産価値 (Net Worth)</p>
              <h4 className="text-lg font-black text-orange-950 mt-1">{portfolioAssets.totalNetWorth.toLocaleString()}<span className="text-xs text-orange-700 ml-0.5">J</span></h4>
              <p className="text-[9px] text-stone-400 mt-0.5">保有J币 + 株評価額</p>
            </div>

            <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-orange-400">J-Coin残高 (Cash)</p>
              <h4 className="text-lg font-black text-orange-950 mt-1">{jCoins.toLocaleString()}<span className="text-xs text-orange-700 ml-0.5">J</span></h4>
              <p className="text-[9px] text-stone-400 mt-0.5">売買可能なキャッシュ残高</p>
            </div>

            <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-orange-400">評価損益 (Unrealized PnL)</p>
              <h4 className={`text-lg font-black mt-1 ${portfolioAssets.unrealizedPnL >= 0 ? 'text-red-650' : 'text-blue-650'}`}>
                {portfolioAssets.unrealizedPnL >= 0 ? '+' : ''}{portfolioAssets.unrealizedPnL.toLocaleString()}J
              </h4>
              <p className="text-[9px] text-stone-400 mt-0.5">率: {portfolioAssets.unrealizedPnL >= 0 ? '+' : ''}{portfolioAssets.pnlRate}%</p>
            </div>

            <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-orange-400">確定利益 (Realized Profit)</p>
              <h4 className={`text-lg font-black mt-1 ${realizedPnL >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                {realizedPnL >= 0 ? '+' : ''}{realizedPnL.toLocaleString()}J
              </h4>
              <p className="text-[9px] text-stone-400 mt-0.5">取引から確定したキャッシュ益</p>
            </div>

          </div>

          {/* Holdings grid list */}
          <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-black uppercase text-orange-950 mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-orange-900" />
              現在の銘柄保有証書 (Portfolio Constituents)
            </h3>

            {Object.keys(holdings).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(holdings as Record<string, { qty: number; avgPrice: number }>).map(([id, item]) => {
                  const stock = JSE_STOCKS.find(s => s.id === id) || JSE_STOCKS[0];
                  const livePrice = stockPrices[id]?.price || stock.basePrice;
                  const currentVal = item.qty * livePrice;
                  const costBasis = item.qty * item.avgPrice;
                  const pnl = currentVal - costBasis;
                  const rate = costBasis > 0 ? parseFloat(((pnl / costBasis) * 100).toFixed(1)) : 0;

                  return (
                    <div key={id} className="bg-stone-50 rounded-2xl p-4 border border-stone-200/60 shadow-xs flex justify-between items-center relative overflow-hidden">
                      <div className="space-y-1">
                        <span className="text-sm font-black text-stone-900 flex items-center gap-1.5">
                          <span>{stock.emoji}</span>
                          <span>{stock.name}</span>
                        </span>
                        <div className="text-[10px] font-medium text-stone-600 space-y-0.5">
                          <p>保有残高: <strong className="text-stone-950 font-black">{item.qty} 株</strong></p>
                          <p>平均取得：<strong>{item.avgPrice}J</strong></p>
                          <p>現在価格：<strong>{livePrice}J</strong></p>
                        </div>
                      </div>

                      <div className="text-right space-y-1 z-10">
                        <p className="text-[10px] uppercase font-bold text-stone-400">現在価値</p>
                        <p className="text-xs font-black text-stone-900">{currentVal.toLocaleString()} J</p>
                        <p className={`text-[10px] font-black ${pnl >= 0 ? 'text-red-650' : 'text-blue-650'}`}>
                          {pnl >= 0 ? '+' : ''}{pnl.toLocaleString()} J ({pnl >= 0 ? '+' : ''}{rate}%)
                        </p>
                      </div>

                      {/* Small inline sell action button */}
                      <button 
                        onClick={() => handleSell(id, item.qty)}
                        className="absolute bottom-2 left-[55%] font-black text-[9px] bg-stone-200 hover:bg-stone-300 text-stone-800 px-2 py-1 rounded transition cursor-pointer"
                      >
                        一括売却 ⚡
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-[#9ca3af] space-y-2">
                <span className="text-4xl">🌵</span>
                <p className="text-xs font-black">保有銘柄はありません。</p>
                <p className="text-[10px] font-bold text-stone-400">「市場ボード」から気になる私たちの「日常現象」を購入してみましょう！</p>
              </div>
            )}
          </div>

          {/* JSE Accomplishments tracker (Badges & Titles) */}
          <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-black uppercase text-orange-950 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-900" />
              JSE 株式相場実績解放カウンター
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[11px] font-bold">
              <div className={`p-3 rounded-2xl border ${unlockedAchievements.includes('first_trade') ? 'bg-amber-50/50 border-amber-200 text-amber-950' : 'bg-stone-50 border-stone-200 text-stone-400'}`}>
                🏅 <strong>初取引</strong>
                <p className="text-[9.5px] mt-1 font-medium">JSE内で初めて1株以上の決済に成功する</p>
                <span className="block mt-1 text-[9px] uppercase font-black">{unlockedAchievements.includes('first_trade') ? '✅ 解放済み' : '🔒 未解放'}</span>
              </div>

              <div className={`p-3 rounded-2xl border ${unlockedAchievements.includes('first_profit') ? 'bg-amber-50/50 border-amber-200 text-amber-950' : 'bg-stone-50 border-stone-200 text-stone-400'}`}>
                🏅 <strong>初利益</strong>
                <p className="text-[9.5px] mt-1 font-medium">株買い戻し売却の取引差額から利益を確定</p>
                <span className="block mt-1 text-[9px] uppercase font-black">{unlockedAchievements.includes('first_profit') ? '✅ 解放済み' : '🔒 未解放'}</span>
              </div>

              <div className={`p-3 rounded-2xl border ${unlockedAchievements.includes('wealth_100k') ? 'bg-amber-50/50 border-amber-200 text-amber-950' : 'bg-stone-50 border-stone-200 text-stone-400'}`}>
                🏅 <strong>資産10万J</strong>
                <p className="text-[9.5px] mt-1 font-medium">JSEにおけるポートフォリオ総評価額が10万超え</p>
                <span className="block mt-1 text-[9px] uppercase font-black">{unlockedAchievements.includes('wealth_100k') ? '✅ 解放済み' : '🔒 未解放'}</span>
              </div>

              <div className={`p-3 rounded-2xl border ${unlockedAchievements.includes('wealth_1m') ? 'bg-amber-50/50 border-amber-200 text-amber-950' : 'bg-stone-50 border-stone-200 text-stone-400'}`}>
                🏅 <strong>資産100万J</strong>
                <p className="text-[9.5px] mt-1 font-medium">JSEの相場伝説になり資産100万Jに到達</p>
                <span className="block mt-1 text-[9px] uppercase font-black">{unlockedAchievements.includes('wealth_1m') ? '✅ 解放済み' : '🔒 未解放'}</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* PHENOMENON ETF BASKET MODE */}
      {activeTab === 'etf' && (
        <div className="space-y-6">
          <p className="text-xs text-orange-850 font-bold leading-relaxed bg-orange-50 p-4 rounded-2xl border border-orange-100">
            📦 <strong>現象ETFとは？</strong> JSEがいくつかのテーマに適合する「あるある現象」を一つにまとめた便利パッケージファンドです。
            パッケージによる購入により、個別に買うよりも <strong>5% 安い市場優待割引価格</strong> 買い付けが行われます！(個別 constituent それぞれに 5株が付与されます)
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* School ETF */}
            <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm space-y-4">
              <span className="text-3xl bg-amber-50 border border-amber-100 p-2.5 rounded-2xl inline-block">🏫</span>
              <div>
                <h4 className="text-sm font-black text-orange-950">学校満喫ETF (School Pack)</h4>
                <p className="text-[10px] text-orange-400 font-bold uppercase mt-0.5">宿題 + テスト + 遅刻ダッシュ</p>
              </div>

              <div className="text-[11px] font-bold text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-100 space-y-1">
                <p className="text-stone-900 mb-1">■ 構成銘柄（各5株ずつ付与されます）</p>
                <p>・📝 宿題先延ばし (価格: {stockPrices['homework_pro']?.price || 100}J)</p>
                <p>・📖 テスト前焦り (価格: {stockPrices['test_panic']?.price || 100}J)</p>
                <p>・⏳ 遅刻ギリギリダッシュ (価格: {stockPrices['late_dash']?.price || 100}J)</p>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div>
                  <p className="text-[9px] uppercase font-bold text-stone-400">一括パック優待価格</p>
                  <p className="text-base font-black text-amber-700">
                    {Math.floor(( (stockPrices['homework_pro']?.price || 110) + (stockPrices['test_panic']?.price || 105) + (stockPrices['late_dash']?.price || 100) ) * 0.95 * 5)}J
                  </p>
                </div>

                <div className="flex gap-1.5">
                  <button 
                    onClick={() => handleBuyETF('school')}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] px-3.5 py-2 rounded-xl transition cursor-pointer"
                  >
                    購入
                  </button>
                  <button 
                    onClick={() => handleSellETF('school')}
                    className="bg-stone-200 hover:bg-stone-300 text-stone-700 font-black text-[11px] px-3.5 py-2 rounded-xl transition cursor-pointer"
                  >
                    売却
                  </button>
                </div>
              </div>
            </div>

            {/* Winter Procrastination ETF */}
            <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm space-y-4">
              <span className="text-3xl bg-blue-50 border border-blue-100 p-2.5 rounded-2xl inline-block">❄️</span>
              <div>
                <h4 className="text-sm font-black text-orange-950">自堕落な冬ETF (Lazy Winter Pack)</h4>
                <p className="text-[10px] text-orange-400 font-bold uppercase mt-0.5">布団から出られない + 風呂めんどい + 夜更かし</p>
              </div>

              <div className="text-[11px] font-bold text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-100 space-y-1">
                <p className="text-stone-900 mb-1">■ 構成銘柄（各5株ずつ付与されます）</p>
                <p>・❄️ 布団から出られない (価格: {stockPrices['futon_escape']?.price || 100}J)</p>
                <p>・🛁 風呂めんどい (価格: {stockPrices['furo_mendoi']?.price || 100}J)</p>
                <p>・🌙 なんとなく夜更かし (価格: {stockPrices['yofukashi_late']?.price || 100}J)</p>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div>
                  <p className="text-[9px] uppercase font-bold text-stone-400">一括パック優待価格</p>
                  <p className="text-base font-black text-amber-700">
                    {Math.floor(( (stockPrices['futon_escape']?.price || 130) + (stockPrices['furo_mendoi']?.price || 145) + (stockPrices['yofukashi_late']?.price || 120) ) * 0.95 * 5)}J
                  </p>
                </div>

                <div className="flex gap-1.5">
                  <button 
                    onClick={() => handleBuyETF('winter')}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] px-3.5 py-2 rounded-xl transition cursor-pointer"
                  >
                    購入
                  </button>
                  <button 
                    onClick={() => handleSellETF('winter')}
                    className="bg-stone-200 hover:bg-stone-300 text-stone-700 font-black text-[11px] px-3.5 py-2 rounded-xl transition cursor-pointer"
                  >
                    売却
                  </button>
                </div>
              </div>
            </div>

            {/* Lost & Found ETF */}
            <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm space-y-4">
              <span className="text-3xl bg-teal-50 border border-teal-100 p-2.5 rounded-2xl inline-block">🧦</span>
              <div>
                <h4 className="text-sm font-black text-orange-950">忘れ物ワンダーランドETF (Lost items)</h4>
                <p className="text-[10px] text-orange-400 font-bold uppercase mt-0.5">鍵消失 + 靴下失くした + 冷蔵庫忘却</p>
              </div>

              <div className="text-[11px] font-bold text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-100 space-y-1">
                <p className="text-stone-900 mb-1">■ 構成銘柄（各5株ずつ付与されます）</p>
                <p>・🔑 鍵どこだっけ (価格: {stockPrices['key_disappear']?.price || 100}J)</p>
                <p>・🧦 靴下片方消失 (価格: {stockPrices['socks_lost']?.price || 100}J)</p>
                <p>・🍉 冷蔵庫忘却 (価格: {stockPrices['refrigerator_forget']?.price || 100}J)</p>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div>
                  <p className="text-[9px] uppercase font-bold text-stone-400">一括パック優待価格</p>
                  <p className="text-base font-black text-amber-700">
                    {Math.floor(( (stockPrices['key_disappear']?.price || 75) + (stockPrices['socks_lost']?.price || 85) + (stockPrices['refrigerator_forget']?.price || 90) ) * 0.95 * 5)}J
                  </p>
                </div>

                <div className="flex gap-1.5">
                  <button 
                    onClick={() => handleBuyETF('lost')}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] px-3.5 py-2 rounded-xl transition cursor-pointer"
                  >
                    購入
                  </button>
                  <button 
                    onClick={() => handleSellETF('lost')}
                    className="bg-stone-200 hover:bg-stone-300 text-stone-700 font-black text-[11px] px-3.5 py-2 rounded-xl transition cursor-pointer"
                  >
                    売却
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* AI INVESTMENT TRUSTS TAB */}
      {activeTab === 'trust' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-orange-950 to-orange-900 border border-orange-900 rounded-3xl p-6 text-orange-50 shadow-md animate-fade-in animate-duration-300">
            <div className="flex items-center gap-3">
              <span className="p-3 bg-white/10 rounded-2xl text-2xl animate-pulse">🤖</span>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2 font-display">
                  JSE AI 投資信託 (Jimi AI Mutual Funds)
                </h3>
                <p className="text-xs text-orange-200/90 font-medium mt-1">
                  「自分でのトレードは難しい、お任せしたい。」そんな声に応え、個性派AIファンドマネージャーがあなたの代わりに24時間JSE市場で資金を運用する仕組みです。
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/10 pt-4 mt-5 text-[11px] font-semibold text-orange-200">
              <div className="flex items-center gap-2">
                <span className="text-white text-base">💎</span>
                <span>JJシステムを通じた全自動コインプール運用</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white text-base">📈</span>
                <span>市場指数（現象ETF / 上場現象）のトレンド自動検知</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white text-base">💸</span>
                <span>いつでも元金回収、完全手数料無料で即座に引き出し可能</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {aiFunds.map((fund) => {
              const deposit = aiFundDeposits[fund.id] || { balance: 0, shares: 0 };
              const currentValuation = Math.floor(deposit.shares * fund.currentNav);
              const pnl = currentValuation - deposit.balance;
              const pnlPercent = deposit.balance > 0 ? parseFloat(((pnl / deposit.balance) * 100).toFixed(1)) : 0;

              return (
                <div key={fund.id} className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                  {/* Fund Manager Header */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={fund.managerAvatar} 
                          alt={fund.managerName} 
                          className="w-10 h-10 rounded-full bg-slate-50 border border-orange-100 shrink-0" 
                        />
                        <div>
                          <p className="text-[10px] font-black uppercase text-orange-400 tracking-wider">FUND MANAGER</p>
                          <h4 className="text-xs font-black text-orange-950 leading-tight">{fund.managerName}</h4>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                          fund.riskLevel === 'Low' ? 'bg-green-100 text-green-700' :
                          fund.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-700 font-black' :
                          'bg-red-100 text-red-700 font-extrabold animate-pulse'
                        }`}>
                          {fund.riskLevel === 'Low' ? '低リスク' : fund.riskLevel === 'Medium' ? '中位リスク' : '高リスク(ハイレバ)'}
                        </span>
                        <p className="text-[9px] text-stone-400 font-bold mt-1">想定期待利回り: {fund.expectedReturn}</p>
                      </div>
                    </div>

                    <div className="bg-stone-50 border border-stone-200/40 rounded-2xl p-3 space-y-1.5">
                      <h4 className="text-xs font-black text-orange-950 flex items-center gap-1">
                        📦 {fund.name}
                      </h4>
                      <p className="text-[10.5px] font-medium text-stone-500 leading-relaxed">
                        {fund.desc}
                      </p>
                      <p className="text-[9.5px] font-bold text-orange-900/80 bg-orange-50 px-2 py-1 rounded-lg">
                        <strong>主要構成アセット:</strong> {fund.holdingsDesc}
                      </p>
                    </div>

                    {/* Live NAV price indicator */}
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3 mt-3">
                      <div>
                        <p className="text-[10px] font-extrabold text-stone-400 uppercase">基準価額(NAV/1口)</p>
                        <p className="text-xl font-black text-orange-950">{fund.currentNav} <span className="text-xs text-orange-800">J</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-extrabold text-stone-400 uppercase">運用資産総額</p>
                        <p className="text-xs font-black text-stone-700">{(fund.currentNav * 2530).toLocaleString()} J</p>
                      </div>
                    </div>

                    {/* Dynamic AI Advisor Quote Block */}
                    <div className="bg-orange-50/50 border-l-2 border-orange-500 rounded-r-2xl p-3 my-2 text-[#7c2d12]">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1">💬 AIマネージャー解説</p>
                      <p className="text-[10px] filter saturate-150 leading-relaxed italic font-semibold">
                        {fund.advice}
                      </p>
                    </div>
                  </div>

                  {/* Transaction Actions & Stats */}
                  <div className="mt-5 space-y-3.5 border-t border-stone-100 pt-4">
                    {/* User Deposit Stat */}
                    <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-3 flex items-center justify-between text-xs font-semibold">
                      <div>
                        <p className="text-[9px] font-black text-amber-800 uppercase">運用中のマイ資産価値</p>
                        <p className="text-sm font-black text-orange-950">
                          {currentValuation.toLocaleString()} <span className="text-[10px]">J-Coin</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-amber-800 uppercase">投資成果率 (損益)</p>
                        <p className={`text-xs font-black leading-none ${pnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {pnl >= 0 ? '▲' : '▼'} {pnlPercent}% 
                          <span className="text-[10px] block font-bold">
                            ({pnl >= 0 ? '+' : ''}{pnl.toLocaleString()} J)
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Deposit Actions */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-extrabold text-stone-400">コインを投じる (AI運用デポジット):</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button 
                          onClick={() => handleTrustDeposit(fund.id, 500)}
                          className="bg-orange-900 border border-orange-900 hover:bg-orange-950 text-white font-extrabold py-2 rounded-xl text-[10.5px] cursor-pointer transition active:scale-95"
                        >
                          +500 J
                        </button>
                        <button 
                          onClick={() => handleTrustDeposit(fund.id, 1000)}
                          className="bg-orange-900 border border-orange-900 hover:bg-orange-950 text-white font-extrabold py-2 rounded-xl text-[10.5px] cursor-pointer transition active:scale-95"
                        >
                          +1000 J
                        </button>
                        <button 
                          onClick={() => handleTrustDeposit(fund.id, 3000)}
                          className="bg-orange-900 border border-orange-900 hover:bg-orange-950 text-white font-extrabold py-2 rounded-xl text-[10.5px] cursor-pointer transition active:scale-95"
                        >
                          +3000 J
                        </button>
                      </div>
                    </div>

                    {/* Withdraw Actions */}
                    <button 
                      disabled={deposit.shares <= 0}
                      onClick={() => handleTrustWithdraw(fund.id)}
                      className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1 ${
                        deposit.shares > 0 
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm font-black' 
                          : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>預けたすべてのコインを引き出す (Cash Out)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* JSE USER PROFILE AND FOUNDER CENTER TAB */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          
          {/* Section 1: JSE Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100 rounded-3xl p-5 shadow-xs">
              <span className="text-xl">💰</span>
              <p className="text-[10px] font-bold text-stone-550 uppercase mt-1">J-Coin財布 (My Coins)</p>
              <h4 className="text-xl font-black text-stone-900 mt-1">{jCoins.toLocaleString()} <span className="text-xs text-orange-850">J</span></h4>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100 rounded-3xl p-5 shadow-xs">
              <span className="text-xl">💼</span>
              <p className="text-[10px] font-bold text-stone-550 uppercase mt-1">株評価額 (Holdings Value)</p>
              <h4 className="text-xl font-black text-stone-900 mt-1">
                {Object.entries(holdings).reduce((sum, [id, rawVal]) => {
                  const item = rawVal as { qty: number; avgPrice: number };
                  const stock = allStocks.find(s => s.id === id);
                  const price = stockPrices[id]?.price || stock?.basePrice || 100;
                  return sum + (item.qty * price);
                }, 0).toLocaleString()} <span className="text-xs text-orange-850">J</span>
              </h4>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100 rounded-3xl p-5 shadow-xs">
              <span className="text-xl">👑</span>
              <p className="text-[10px] font-bold text-stone-550 uppercase mt-1">設立した株数 (Founded Stocks)</p>
              <h4 className="text-xl font-black text-stone-900 mt-1">
                {customStocks.filter(s => s.founderId === user?.uid).length} 株
              </h4>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100 rounded-3xl p-5 shadow-xs">
              <span className="text-xl">🎖️</span>
              <p className="text-[10px] font-bold text-stone-550 uppercase mt-1">創設バッジ数 (Founder Badges)</p>
              <h4 className="text-xl font-black text-stone-900 mt-1">
                {customStocks.filter(s => s.founderId === user?.uid).length} 個
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Create Stock Form */}
            <div className="lg:col-span-7 bg-white border border-orange-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-black text-orange-950 flex items-center gap-1.5">
                  🏢 新規日常現象のブランド創設（会社設立）
                </h3>
                <p className="text-[10px] text-stone-500 font-bold mt-1">
                  あなたの日常あるある・イライラ現象を独自の株として上場申請できます。審査承認後、市場に自動追加されます！
                </p>
              </div>

              {creationMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-teal-800 text-[11px] font-bold rounded-2.5xl leading-relaxed animate-fade-in">
                  ✅ {creationMessage}
                </div>
              )}

              <form onSubmit={handleCreateStockRequest} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-extrabold text-stone-700">現象・銘柄名（和名10文字以内）</label>
                    <input 
                      type="text" 
                      required
                      placeholder="例：風呂めんどい、靴下神隠し"
                      value={newStockName}
                      onChange={e => setNewStockName(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 focus:border-orange-500 font-bold transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-extrabold text-stone-700">英語テーマ・シンボル名（En）</label>
                    <input 
                      type="text" 
                      required
                      placeholder="例：Bath Procrastination"
                      value={newStockNameEn}
                      onChange={e => setNewStockNameEn(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 focus:border-orange-500 font-bold transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-stone-700">現象の概要説明（あるあるの具体的なエピソード）</label>
                  <textarea 
                    required
                    rows={3}
                    placeholder="例：お風呂に入らなきゃいけないのに、スマホを見てしまいソファから何時間も立ち上がれなくなる、日本国民共通の不条理現象。"
                    value={newStockDesc}
                    onChange={e => setNewStockDesc(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-stone-900 focus:border-orange-500 font-bold transition leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-extrabold text-stone-700">銘柄アイコン (Emoji)</label>
                    <div className="flex bg-stone-50 border border-stone-200 rounded-xl items-center p-1.5 gap-2">
                      <span className="text-xl px-2.5 bg-white border border-stone-100 rounded-lg p-1">{newStockEmoji}</span>
                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        {['🛁', '🛌', '📲', '🍕', '🕰️', '🦥', '🤯', '😭', '💸', '🧠', '💼', '🔌'].map((emo, idx) => (
                          <button 
                            type="button" 
                            key={`${emo}-${idx}`} 
                            onClick={() => setNewStockEmoji(emo)}
                            className={`p-1 text-sm rounded ${newStockEmoji === emo ? 'bg-orange-500 text-white' : 'hover:bg-stone-200'}`}
                          >
                            {emo}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-extrabold text-stone-700">現象カテゴリー</label>
                    <select
                      value={newStockCategory}
                      onChange={e => setNewStockCategory(e.target.value)}
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-xl outline-none text-stone-900 focus:border-orange-500 font-bold transition"
                    >
                      <option value="日常ストレス">日常ストレス 🧠</option>
                      <option value="おサボり・怠惰">おサボり・怠惰 🦥</option>
                      <option value="時間焦燥">時間焦燥 🕰️</option>
                      <option value="人間関係">人間関係 👥</option>
                      <option value="デジタル依存">デジタル依存 📲</option>
                      <option value="その他">その他 💡</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1 bg-amber-50/40 p-4 rounded-2xl border border-amber-500/10">
                  <div className="flex justify-between items-center text-xs font-extrabold text-amber-950 mb-1">
                    <span>設立デポジット（投資額）</span>
                    <span className="text-orange-950">{newStockCoins} J-Coin</span>
                  </div>
                  <input 
                    type="range" 
                    min="500" 
                    max="10000" 
                    step="100"
                    value={newStockCoins} 
                    onChange={e => setNewStockCoins(parseInt(e.target.value, 10))}
                    className="w-full accent-orange-700 cursor-pointer"
                  />
                  <p className="text-[9.5px] text-orange-900/70 font-semibold mt-1">
                    ※最低500J必要です。投資額を多くかけるほど、上場審査の際の内部レート（承認確率や初期価格、初期設立ブースト）が高くなります。
                  </p>
                </div>

                <div className="bg-stone-550 border border-stone-200/50 p-3 rounded-xl text-[9px] font-semibold text-stone-500 bg-stone-50 leading-relaxed">
                  ⚠️ <strong className="text-stone-700">禁止上場ガイドライン：</strong> 有名人・実在の特定人物名、学校名、企業ブランド、不適切なワード、公序良俗に反する差別・政治・嫌がらせ表現は即時却下＆ペナルティ対象となりますのでご注意ください。
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingCreation}
                  className="w-full py-3 bg-orange-900 hover:bg-orange-950 disabled:bg-stone-200 text-white font-extrabold text-xs rounded-2xl tracking-widest shadow transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                >
                  {isSubmittingCreation ? '申請送信中...' : '日常現象の上場申請を送信する 🚀'}
                </button>
              </form>
            </div>

            {/* Right Column: Founded Stock List & Claim Rewards */}
            <div className="lg:col-span-5 bg-white border border-orange-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-black text-orange-950 flex items-center gap-1.5">
                  👑 あなたが創設した株式・日次活性化報酬
                </h3>
                <p className="text-[10px] text-stone-500 font-bold mt-1">
                  あなたが設立した日常株は、全国のSNS投稿や共感数に基づき、毎日24時間不労的なコイン報酬（市場活性度報酬）を獲得できます！
                </p>
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto no-scrollbar pr-1">
                {customStocks.filter(s => s.founderId === user?.uid).map((stock) => {
                  const hasClaimed = claimedRewards[stock.id] || false;
                  
                  // Compute dynamic organic rewards: postsCount matching keywords in this session
                  const postsCount = scenesTextStats[stock.id]?.posts || 0;
                  const upvotesCount = scenesTextStats[stock.id]?.upvotes || 0;
                  const commentCount = scenesTextStats[stock.id]?.comments || 0;

                  // Formula bounding from 50 to 1200
                  const rawFactor = (postsCount * 18) + (upvotesCount * 3.5) + (commentCount * 9) + ((stock.coinsSpent || 500) * 0.05);
                  const rewardAmt = Math.min(1200, Math.max(50, Math.floor(rawFactor)));

                  return (
                    <div key={stock.id} className="p-4 rounded-2xl bg-orange-50/20 border border-orange-100/60 text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-1.5 font-black text-orange-950">
                          <span className="text-xl">{stock.emoji}</span>
                          <div>
                            <p className="text-xs">{stock.name}</p>
                            <p className="text-[8px] text-stone-400 font-mono tracking-wide">{stock.nameEn}</p>
                          </div>
                        </span>
                        <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          創設デポジット: {stock.coinsSpent || 500}J
                        </span>
                      </div>

                      <div className="bg-white/60 p-2.5 rounded-xl border border-stone-200/40 text-[9.5px] font-bold text-stone-600 space-y-1 mb-2">
                        <p className="flex justify-between"><span>📊 地味っち投稿活動検知：</span><strong className="text-stone-900">{postsCount} シーン</strong></p>
                        <p className="flex justify-between"><span>💖 合計スタンプ数：</span><strong className="text-stone-900">{upvotesCount} 共感</strong></p>
                        <p className="flex justify-between"><span>💬 合計コメント共感：</span><strong className="text-stone-900">{commentCount} 反応</strong></p>
                        <div className="border-t border-dashed border-stone-200/50 pt-1 flex justify-between text-orange-950">
                          <span>📈 現在の本日の市場活性度：</span>
                          <strong className="font-extrabold text-amber-700 font-mono">報酬期待値: {rewardAmt} J</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => handleClaimReward(stock.id, rewardAmt)}
                        disabled={hasClaimed}
                        className={`w-full py-2 rounded-xl text-[10.5px] font-extrabold transition cursor-pointer flex items-center justify-center gap-1 leading-none shadow-sm ${
                          hasClaimed 
                            ? 'bg-stone-100 text-stone-400 cursor-not-allowed select-none' 
                            : 'bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white shadow-emerald-500/10 font-bold'
                        }`}
                      >
                        {hasClaimed ? '✅ 本日の活性化報酬獲得済み' : `💰 活性化報酬を獲得する (+${rewardAmt}J)`}
                      </button>
                    </div>
                  );
                })}

                {customStocks.filter(s => s.founderId === user?.uid).length === 0 && (
                  <div className="text-center py-16 text-slate-400 space-y-2">
                    <span className="text-3xl">🏜️</span>
                    <p className="text-xs font-bold leading-relaxed">
                      まだ新規日常現象株の創設をしていません。
                    </p>
                    <p className="text-[9.5px] font-bold text-stone-400 max-w-xs mx-auto">
                      左の設立フォームから申請してみましょう！承認されると、あなただけの永久・不労活性報酬が解放されます。
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* GENERAL CONCEPT GUIDE TAB */}
      {activeTab === 'about' && (
        <div className="space-y-6 bg-white border border-orange-100 rounded-3xl p-6 shadow-sm">
          <div>
            <h3 className="text-base font-black text-orange-950 flex items-center gap-1.5">
              💡 Jimi Stock Exchange (JSE) の基本概念・仕組み
            </h3>
            <p className="text-xs text-orange-800/85 font-semibold mt-1">「人類共通のあるある現象」に投資する、もう一つの地味経済圏。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-stone-750 font-medium leading-relaxed">
            <div className="space-y-3">
              <h4 className="font-extrabold text-[#7c2d12] flex items-center gap-1">📌 JSEが生まれた目的</h4>
              <p>
                従来のSNSは「インフルエンサー」や「発信者」個人をフォローします。
                一方、JSEでは<strong>個別の人物ではなく、人々が日々直面する「あるある、現象、悩み」そのものを株式市場として扱います。</strong>
              </p>
              <p>
                「お風呂がめんどくさい」「布団からどうしても出られない」「また靴下を片方なくした」
                といった日常の一幕。地味っちに投稿されたシーンを解析し、本当の共感が生まれれば生まれるほど、その「現象株」の現在価格（流行度）が高騰します。
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-extrabold text-[#7c2d12] flex items-center gap-1">📌 株価が変動する3大ルール</h4>
              <p>
                <strong>① 地味っち内の投稿・共感数：</strong>
                同じあるあるのシーンが新しく投稿されたり、スタンプ共感（Upvotes）やコメントが多いほど、その現象の人気指標が上昇します！
              </p>
              <p>
                <strong>② ユーザーの買注文・売注文：</strong>
                あなたを含む投資家が株を購入すれば価値は上昇、手放せば当然下落に寄与します。
              </p>
              <p>
                <strong>③ 自立稼働する5大AIマーケットメーカーBOT：</strong>
                「共感銀行」「人類年金機構」などの個性豊かな機関BOT投資家たちが、それぞれの判断軸で24時間常に取引を行っているため、市場が冷めることはありません。
              </p>
            </div>
          </div>

          {/* Institutional BOT info panel */}
          <div className="border-t border-orange-100 pt-5 mt-5">
            <h4 className="text-xs font-black text-orange-950 mb-3">🏢 JSEを盛り上げる5代BOT機関投資家の一覧</h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 text-[10.5px] font-bold">
              {JSE_BOTS.map((bot, i) => (
                <div key={i} className="bg-stone-50 border border-stone-200/50 rounded-2xl p-3 text-stone-800 space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-lg">{bot.logo}</span>
                    <strong className="text-orange-950">{bot.name.split(' ')[0]}</strong>
                  </div>
                  <p className="font-medium text-stone-500 leading-relaxed text-[9.5px]">{bot.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
