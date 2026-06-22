import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  setDoc,
  Timestamp, 
  orderBy, 
  limit, 
  increment, 
  arrayUnion, 
  arrayRemove,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { PlazaSubmission, PlazaVote, PlazaBook, Profile, PlazaSurvey, PlazaSurveyVote, OperationType, FirestoreErrorInfo } from '../types';
import { 
  Trophy, 
  BookOpen, 
  Sparkles, 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  Heart, 
  User, 
  Award, 
  X, 
  Coins, 
  Calendar, 
  Flame, 
  Check, 
  Book, 
  Edit3, 
  ThumbsUp,
  TrendingUp,
  Inbox,
  Scale,
  HelpCircle,
  Send,
  PieChart,
  Users,
  Tv
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { awardGachaItem, getGachaState, saveGachaState } from '../lib/gachaStore';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
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
  console.warn('Recoverable non-blocking Firestore Exception:', errMsg);
}

// Language helper (mock fallback or prop)
interface JimiPlazaViewProps {
  user: any;
  profile: Profile | null;
  onBack: () => void;
  onGachaStateChange?: () => void;
}

export default function JimiPlazaView({ user, profile, onBack, onGachaStateChange }: JimiPlazaViewProps) {
  // Tabs: 'haiku' | 'dajare' | 'shoseki' | 'survey'
  const [activeTab, setActiveTab] = useState<'haiku' | 'dajare' | 'shoseki' | 'survey'>('haiku');
  
  // Subtabs for Haiku & Dajare: 'post' | 'vote' | 'results'
  const [plazaSubTab, setPlazaSubTab] = useState<'post' | 'vote' | 'results'>('post');
  
  // Subtabs for Shoseki: 'read' | 'write'
  const [shosekiSubTab, setShosekiSubTab] = useState<'read' | 'write'>('read');
  const [shosekiFilter, setShosekiFilter] = useState<'new' | 'popular'>('new');

  // Input States
  const [haikuContent, setHaikuContent] = useState('');
  const [dajareContent, setDajareContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ text: '', isError: false });

  // Yesterday Data & Matchups for Voting
  const [yesterdaySubs, setYesterdaySubs] = useState<PlazaSubmission[]>([]);
  const [userVotes, setUserVotes] = useState<Record<number, string>>({}); // matchIndex -> submissionId
  const [loadingVoting, setLoadingVoting] = useState(false);

  // Shoseki Data
  const [books, setBooks] = useState<PlazaBook[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [selectedBook, setSelectedBook] = useState<PlazaBook | null>(null);

  // New Book Input
  const [bookTitle, setBookTitle] = useState('');
  const [bookDesc, setBookDesc] = useState('');
  const [bookContent, setBookContent] = useState('');

  // Celebration Modal for Tournament Wins
  const [showCelebration, setShowCelebration] = useState<{
    show: boolean;
    type: 'haiku' | 'dajare';
    rank: 1 | 2 | 4;
    rewardCoins: number;
    titleName: string;
    badgeName?: string;
    badgeId?: string;
    date: string;
  } | null>(null);

  // --- 人類に聞いてみた (Ask Humanity) States ---
  const [surveySubTab, setSurveySubTab] = useState<'play' | 'create' | 'history'>('play');
  const [surveys, setSurveys] = useState<PlazaSurvey[]>([]);
  const [userSurveyVotes, setUserSurveyVotes] = useState<Record<string, 'yes' | 'no'>>({});
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [surveyCreating, setSurveyCreating] = useState(false);
  const [newSurveyQuestion, setNewSurveyQuestion] = useState('');
  const [introAnimationStep, setIntroAnimationStep] = useState<0 | 1 | 2 | null>(null);
  const [surveyAwardCoins, setSurveyAwardCoins] = useState<number | null>(null);

  // Dates Helper (Local YYYY-MM-DD format)
  const getFormattedDate = (dateObj: Date) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getFormattedDate(new Date());
  const yesterdayStr = getFormattedDate(new Date(Date.now() - 86400000));
  const dayBeforeYesterdayStr = getFormattedDate(new Date(Date.now() - 172800000));

  // 1. Check Submissions for Today
  const [alreadySubmittedHaiku, setAlreadySubmittedHaiku] = useState(false);
  const [alreadySubmittedDajare, setAlreadySubmittedDajare] = useState(false);

  useEffect(() => {
    if (!user) return;
    checkTodaySubmissions();
  }, [user, activeTab]);

  const checkTodaySubmissions = async () => {
    try {
      const qH = query(
        collection(db, 'plaza_submissions'),
        where('userId', '==', user.uid),
        where('date', '==', todayStr),
        where('type', '==', 'haiku')
      );
      const snapH = await getDocs(qH);
      setAlreadySubmittedHaiku(!snapH.empty);

      const qD = query(
        collection(db, 'plaza_submissions'),
        where('userId', '==', user.uid),
        where('date', '==', todayStr),
        where('type', '==', 'dajare')
      );
      const snapD = await getDocs(qD);
      setAlreadySubmittedDajare(!snapD.empty);
    } catch (e) {
      console.error(e);
    }
  };

  // 2. Fetch Yesterday's Matchups & Votes
  useEffect(() => {
    if (!user || activeTab === 'shoseki') return;
    loadVotingData();
  }, [user, activeTab, plazaSubTab]);

  const loadVotingData = async () => {
    if (plazaSubTab !== 'vote') return;
    setLoadingVoting(true);
    try {
      const q = query(
        collection(db, 'plaza_submissions'),
        where('date', '==', yesterdayStr),
        where('type', '==', activeTab)
      );
      const snap = await getDocs(q);
      const list: PlazaSubmission[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as PlazaSubmission);
      });
      // Deterministic sort by id or seed
      list.sort((a, b) => a.id.localeCompare(b.id));
      setYesterdaySubs(list);

      // Fetch user's votes for yesterday's matches
      const votesMap: Record<number, string> = {};
      try {
        const qV = query(
          collection(db, 'plaza_votes'),
          where('userId', '==', user.uid),
          where('date', '==', yesterdayStr),
          where('type', '==', activeTab)
        );
        const snapV = await getDocs(qV);
        snapV.forEach(docSnap => {
          const data = docSnap.data() as PlazaVote;
          votesMap[data.matchIndex] = data.submissionId;
        });
      } catch (e) {
        console.warn("Plaza votes remote fetch failed, using local only:", e);
      }

      // Merge local votes to support quota fallback
      try {
        const localVotesObj = JSON.parse(localStorage.getItem('jimicchi_local_votes') || '{}');
        Object.entries(localVotesObj).forEach(([vKey, subId]) => {
          const parts = vKey.split('_');
          if (parts.length >= 4) {
            const uId = parts[0];
            const dStr = parts[1];
            const typeStr = parts[2];
            const mIdx = parseInt(parts[parts.length - 1]);
            if (uId === user.uid && dStr === yesterdayStr && typeStr === activeTab && !isNaN(mIdx)) {
              votesMap[mIdx] = subId as string;
            }
          }
        });
      } catch (localErr) {
        console.warn("Failed to load local votes", localErr);
      }

      setUserVotes(votesMap);
    } catch (e) {
      console.error("Voting load error:", e);
    } finally {
      setLoadingVoting(false);
    }
  };

  // 3. Results and Prizes Check
  useEffect(() => {
    if (!user || activeTab === 'shoseki' || plazaSubTab !== 'results') return;
    checkForRewards();
  }, [user, activeTab, plazaSubTab]);

  const checkForRewards = async () => {
    try {
      // We look at yesterday's submissions to see if there was a tournament and user placed
      const q = query(
        collection(db, 'plaza_submissions'),
        where('date', '==', yesterdayStr),
        where('type', '==', activeTab)
      );
      const snap = await getDocs(q);
      const list: PlazaSubmission[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as PlazaSubmission);
      });

      if (list.length < 2) return; // No tournament held

      // Sort deterministically to construct match tree
      list.sort((a, b) => a.id.localeCompare(b.id));

      // Resolve tournament brackets
      // First, get final list of winners in bracket levels
      // Let's create an elegant result list
      const matchesCount = Math.floor(list.length / 2);
      const round1Winners: PlazaSubmission[] = [];
      const round1Losers: PlazaSubmission[] = [];

      for (let m = 0; m < matchesCount; m++) {
        const subA = list[2 * m];
        const subB = list[2 * m + 1];
        const votesA = subA.votesCount || 0;
        const votesB = subB.votesCount || 0;

        if (votesA >= votesB) {
          round1Winners.push(subA);
          round1Losers.push(subB);
        } else {
          round1Winners.push(subB);
          round1Losers.push(subA);
        }
      }

      // If odd number, last element advances
      if (list.length % 2 !== 0) {
        round1Winners.push(list[list.length - 1]);
      }

      // Round 2 (Semifinals or Final)
      let finalWinner: PlazaSubmission | null = null;
      let runnerUp: PlazaSubmission | null = null;
      let best4: PlazaSubmission[] = [];

      if (round1Winners.length >= 2) {
        // Simple final of top 2
        const wA = round1Winners[0];
        const wB = round1Winners[1];
        const vA = wA.votesCount || 0;
        const vB = wB.votesCount || 0;

        if (vA >= vB) {
          finalWinner = wA;
          runnerUp = wB;
        } else {
          finalWinner = wB;
          runnerUp = wA;
        }

        if (round1Winners.length > 2) {
          best4 = round1Winners.slice(2);
        }
        best4 = [...best4, ...round1Losers.slice(0, 2)];
      } else if (round1Winners.length === 1) {
        finalWinner = round1Winners[0];
        if (round1Losers.length > 0) runnerUp = round1Losers[0];
      }

      // Check current user UID against winners
      if (finalWinner && finalWinner.userId === user.uid) {
        checkAndOpenCelebration(yesterdayStr, activeTab, 1);
      } else if (runnerUp && runnerUp.userId === user.uid) {
        checkAndOpenCelebration(yesterdayStr, activeTab, 2);
      } else if (best4.some(b => b.userId === user.uid)) {
        checkAndOpenCelebration(yesterdayStr, activeTab, 4);
      }
    } catch (e) {
      console.error("Rewards verification error", e);
    }
  };

  const checkAndOpenCelebration = (date: string, type: 'haiku' | 'dajare', rank: 1 | 2 | 4) => {
    const claimKey = `plaza_reward_claimed_${user.uid}_${date}_${type}`;
    const alreadyClaimed = localStorage.getItem(claimKey);
    if (alreadyClaimed) return;

    let coins = 0;
    let title = '';
    let badge = '';
    let badgeId = '';

    if (rank === 1) {
      coins = 50;
      title = type === 'haiku' ? '《地味の創造神》' : '《笑撃の一撃》';
      badge = type === 'haiku' ? '地味俳句王' : 'ダジャレ王';
      badgeId = type === 'haiku' ? 'badge_haiku_king' : 'badge_dajare_king';
    } else if (rank === 2) {
      coins = 20;
      title = '《準優勝コレクター》';
      badge = '準優勝コレクター';
      badgeId = 'badge_runnerup_collector';
    } else {
      coins = 10;
      title = '《一文字入魂》';
    }

    setShowCelebration({
      show: true,
      type,
      rank,
      rewardCoins: coins,
      titleName: title,
      badgeName: badge || undefined,
      badgeId: badgeId || undefined,
      date
    });
  };

  // Claim Event Rewards Programmatic Integration
  const handleClaimReward = () => {
    if (!showCelebration || !user) return;
    const { type, rank, rewardCoins, badgeId, date } = showCelebration;

    // Save reward claim to localStorage to lock
    const claimKey = `plaza_reward_claimed_${user.uid}_${date}_${type}`;
    localStorage.setItem(claimKey, 'true');

    // 1. Award coins
    awardGachaItem(user.uid, 'coins', String(rewardCoins));

    // 2. Award badges if won
    if (badgeId) {
      awardGachaItem(user.uid, 'special_badge', badgeId);
    }

    // 3. Award title parts based on category
    if (rank === 1) {
      // Award consecutive champion if they already won another category in the past
      const hasOtherHaikuWin = localStorage.getItem(`plaza_reward_claimed_${user.uid}_${yesterdayStr}_haiku`) === 'true';
      const hasOtherDajareWin = localStorage.getItem(`plaza_reward_claimed_${user.uid}_${yesterdayStr}_dajare`) === 'true';
      if ((type === 'haiku' && hasOtherDajareWin) || (type === 'dajare' && hasOtherHaikuWin)) {
        awardGachaItem(user.uid, 'special_badge', 'badge_consecutive_champion');
      }
      
      // Award corresponding custom prefixes/suffixes
      if (type === 'haiku') {
        awardGachaItem(user.uid, 'special_title', 'p_plaza_jimi_haiku_poet');
        awardGachaItem(user.uid, 'special_title', 's_plaza_jimi_haiku_poet');
        awardGachaItem(user.uid, 'special_title', 'p_plaza_silence_words');
        awardGachaItem(user.uid, 'special_title', 's_plaza_ringing_words');
      } else {
        awardGachaItem(user.uid, 'special_title', 'p_plaza_wordplay');
        awardGachaItem(user.uid, 'special_title', 's_plaza_wordplay_master');
        awardGachaItem(user.uid, 'special_title', 'p_plaza_laugh_impact');
        awardGachaItem(user.uid, 'special_title', 's_plaza_one_hit_laugh');
      }
    } else if (rank === 2) {
      awardGachaItem(user.uid, 'special_title', 'p_plaza_wordplay');
      awardGachaItem(user.uid, 'special_title', 's_plaza_wordplay_master');
    } else {
      awardGachaItem(user.uid, 'special_title', 'p_plaza_one_char_soul');
      awardGachaItem(user.uid, 'special_title', 's_plaza_one_char_soul');
    }

    setShowCelebration(null);
    alert(`おめでとうございます！ ${rewardCoins}枚のコインと限定アイテムが解放されました！プロフィールの「二つ名」「バッジ」一覧をチェックしてください。`);
  };

  // 4. Shoseki (Bookshelf) Loading & Logic
  useEffect(() => {
    if (activeTab !== 'shoseki') return;
    loadBooks();
  }, [activeTab, shosekiFilter, shosekiSubTab]);

  const loadBooks = async () => {
    if (shosekiSubTab !== 'read') return;
    setLoadingBooks(true);
    try {
      let q = query(
        collection(db, 'plaza_books'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      if (shosekiFilter === 'popular') {
        // Since orderBy multiple fields require complex indices, we can sort in memory for robust flawless operation
        q = query(collection(db, 'plaza_books'), limit(100));
      }

      const snap = await getDocs(q);
      const list: PlazaBook[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as PlazaBook);
      });

      if (shosekiFilter === 'popular') {
        list.sort((a, b) => {
          const popularityA = (a.likesCount || 0) + (a.empathiesCount || 0);
          const popularityB = (b.likesCount || 0) + (b.empathiesCount || 0);
          return popularityB - popularityA;
        });
      }

      setBooks(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBooks(false);
    }
  };

  // --- 人類に聞いてみた (Ask Humanity) Logic ---
  const SEED_SURVEYS = [
    "お風呂に入る直前、毎回ものすごくめんどくさい気力ゼロ状態になる？",
    "トイレットペーパーの最後の一巻きを、次に使う誰かのために替えるのをサボったことがある？",
    "自動ドアの前で無反応のまま立ってしまい、地味に気まずいステップを踏んだことがある？",
    "美容室で「シャンプー中、痒いところありませんか」と聞かれて、本当は痒いのに「大丈夫です」と条件反射で言ってしまう？",
    "昔「あの時貸した100円」をいつまでも地味に忘れていない？",
    "お菓子の袋が手で開かなくて力一杯引いた瞬間、中身を大放出させてこの世の終わりを感じたことがある？",
    "エレベーターの「閉じる」ボタンを、乗った瞬間に光速で連打してしまう？",
    "靴下を立って履こうとしてグラついて、結局壁に激突するか手をついて敗北したことがある？",
    "傘をしっかり持って出かけた日に限って、1滴の雨も降らない？"
  ];

  useEffect(() => {
    if (activeTab !== 'survey') return;
    loadSurveys();
  }, [activeTab]);

  const loadSurveys = async (forceNoAnim = false) => {
    setSurveyLoading(true);
    try {
      let snap;
      try {
        const q = query(collection(db, 'plaza_surveys'), orderBy('createdAt', 'desc'));
        snap = await getDocs(q);
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'plaza_surveys');
        return;
      }
      
      let list: PlazaSurvey[] = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as PlazaSurvey);
      });

      // If database is empty, seed defaults globally to the database
      if (list.length === 0) {
        for (let i = 0; i < SEED_SURVEYS.length; i++) {
          const qText = SEED_SURVEYS[i];
          const yesVotes = Math.floor(Math.random() * 80) + 20;
          const noVotes = Math.floor(Math.random() * 80) + 20;
          const newDoc = {
            question: qText,
            authorId: 'system',
            authorName: '地味っち人類調査班',
            yesVotes,
            noVotes,
            createdAt: Timestamp.now()
          };
          try {
            await addDoc(collection(db, 'plaza_surveys'), newDoc);
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, 'plaza_surveys');
          }
        }
        try {
          const q = query(collection(db, 'plaza_surveys'), orderBy('createdAt', 'desc'));
          const reSnap = await getDocs(q);
          list = [];
          reSnap.forEach(docSnap => {
            list.push({ id: docSnap.id, ...docSnap.data() } as PlazaSurvey);
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.LIST, 'plaza_surveys');
        }
      }

      setSurveys(list);

      if (user) {
        const voteChecks = list.map(async (srv) => {
          try {
            const voteDoc = await getDoc(doc(db, 'plaza_surveys', srv.id, 'votes', user.uid));
            if (voteDoc.exists()) {
              return { id: srv.id, voted: true, choice: voteDoc.data().choice as 'yes' | 'no' };
            }
          } catch (e) {
            handleFirestoreError(e, OperationType.GET, `plaza_surveys/${srv.id}/votes/${user.uid}`);
          }
          return { id: srv.id, voted: false, choice: null };
        });
        const voteResults = await Promise.all(voteChecks);
        const votesMap: Record<string, 'yes' | 'no'> = {};
        voteResults.forEach(r => {
          if (r.voted && r.choice) {
            votesMap[r.id] = r.choice;
          }
        });
        setUserSurveyVotes(votesMap);
      }

      if (!forceNoAnim) {
        triggerTvIntroAnimation();
      }

    } catch (e) {
      console.error(e);
    } finally {
      setSurveyLoading(false);
    }
  };

  const triggerTvIntroAnimation = () => {
    setIntroAnimationStep(0);
    setTimeout(() => {
      setIntroAnimationStep(1);
      setTimeout(() => {
        setIntroAnimationStep(2);
        setTimeout(() => {
          setIntroAnimationStep(null);
        }, 2550);
      }, 1900);
    }, 1900);
  };

  const handleVoteSurvey = async (surveyId: string, choice: 'yes' | 'no') => {
    if (!user) {
      alert('投票するにはログインが必要です。');
      return;
    }
    if (userSurveyVotes[surveyId]) {
      alert('この調査にはすでに投票済みです。');
      return;
    }

    try {
      const voteRef = doc(db, 'plaza_surveys', surveyId, 'votes', user.uid);
      try {
        await setDoc(voteRef, {
          userId: user.uid,
          surveyId,
          choice,
          createdAt: Timestamp.now()
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `plaza_surveys/${surveyId}/votes/${user.uid}`);
      }

      const surveyRef = doc(db, 'plaza_surveys', surveyId);
      try {
        await updateDoc(surveyRef, {
          yesVotes: choice === 'yes' ? increment(1) : increment(0),
          noVotes: choice === 'no' ? increment(1) : increment(0)
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `plaza_surveys/${surveyId}`);
      }

      awardGachaItem(user.uid, 'coins', '3');
      if (onGachaStateChange) {
        onGachaStateChange();
      }

      setUserSurveyVotes(prev => ({ ...prev, [surveyId]: choice }));
      setSurveys(prev => prev.map(s => {
        if (s.id === surveyId) {
          return {
            ...s,
            yesVotes: choice === 'yes' ? s.yesVotes + 1 : s.yesVotes,
            noVotes: choice === 'no' ? s.noVotes + 1 : s.noVotes
          };
        }
        return s;
      }));

      setSurveyAwardCoins(3);
    } catch (e) {
      console.error(e);
      alert('投票処理中にエラーが発生しました。');
    }
  };

  const handleCreateSurvey = async () => {
    const questionText = newSurveyQuestion.trim();
    if (!questionText) {
      alert('質問内容を入力してください。');
      return;
    }
    if (questionText.length > 80) {
      alert('質問は80文字以内で入力してください。');
      return;
    }
    if (!user) {
      alert('アンケートを作成するにはログインが必要です。');
      return;
    }

    setSurveyCreating(true);
    try {
      const newSurvey = {
        question: questionText,
        authorId: user.uid,
        authorName: profile?.displayName || user.displayName || '名無しの地味っち',
        authorPhoto: profile?.photoURL || user.photoURL || '',
        yesVotes: 0,
        noVotes: 0,
        createdAt: Timestamp.now()
      };

      try {
        await addDoc(collection(db, 'plaza_surveys'), newSurvey);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, 'plaza_surveys');
      }
      setNewSurveyQuestion('');
      alert('新しいアンケートを投稿しました！「回答する」からチェックしてみましょう。');
      setSurveySubTab('play');
      loadSurveys(true);
    } catch (e) {
      console.error(e);
      alert('アンケートの作成に失敗しました。');
    } finally {
      setSurveyCreating(false);
    }
  };

  // 5. Submit Haiku/Dajare
  const handleSubmitSubmission = async (type: 'haiku' | 'dajare') => {
    const content = type === 'haiku' ? haikuContent.trim() : dajareContent.trim();
    if (!content) {
      setSubmitMessage({ text: '内容を入力してください。', isError: true });
      return;
    }

    if (type === 'haiku' && content.length > 50) {
      setSubmitMessage({ text: '俳句は50文字以内に収めてください。', isError: true });
      return;
    }

    if (type === 'dajare' && content.length > 60) {
      setSubmitMessage({ text: 'ダジャレは60文字以内に収めてください。', isError: true });
      return;
    }

    setSubmitting(true);
    setSubmitMessage({ text: '', isError: false });

    try {
      // Excluded double posting today
      const localSubKey = `jimicchi_local_sub_${user.uid}_${todayStr}_${type}`;
      if (localStorage.getItem(localSubKey) === 'true') {
        setSubmitMessage({ text: '本日はすでにこのカテゴリに投稿済みです。', isError: true });
        setSubmitting(false);
        return;
      }

      const q = query(
        collection(db, 'plaza_submissions'),
        where('userId', '==', user.uid),
        where('date', '==', todayStr),
        where('type', '==', type)
      );
      try {
        const existingSnap = await getDocs(q);
        if (!existingSnap.empty) {
          setSubmitMessage({ text: '本日はすでにこのカテゴリに投稿済みです。', isError: true });
          setSubmitting(false);
          return;
        }
      } catch (getErr) {
        console.warn("Could not check duplicate post remotely, checking local duplicates only.");
      }

      await addDoc(collection(db, 'plaza_submissions'), {
        userId: user.uid,
        userName: profile?.displayName || user.displayName || '名無しの地味っち',
        userPhoto: profile?.photoURL || user.photoURL || '',
        type,
        content,
        date: todayStr,
        createdAt: Timestamp.now(),
        votesCount: 0
      });

      setSubmitMessage({ text: '投稿が完了しました！明日の投票をお楽しみに！', isError: false });
      if (type === 'haiku') {
        setHaikuContent('');
        setAlreadySubmittedHaiku(true);
      } else {
        setDajareContent('');
        setAlreadySubmittedDajare(true);
      }

      // Award a mini 3 coins participation bonus!
      awardGachaItem(user.uid, 'coins', '3');

    } catch (e: any) {
      console.error(e);
      const isQuota = e.message?.toLowerCase().includes('quota') || 
                      e.message?.toLowerCase().includes('exhausted') || 
                      e.message?.toLowerCase().includes('permission') || 
                      e.message?.toLowerCase().includes('unavailable') ||
                      e.message?.toLowerCase().includes('limit');
      if (isQuota) {
        console.warn("Plaza submission Firestore error (quota). Simulating success locally.");
        
        const localSubKey = `jimicchi_local_sub_${user.uid}_${todayStr}_${type}`;
        localStorage.setItem(localSubKey, 'true');

        const localPostsKey = `jimicchi_local_plaza_submissions`;
        try {
          const localPosts = JSON.parse(localStorage.getItem(localPostsKey) || '[]');
          localPosts.push({
            id: `local_sub_${Date.now()}`,
            userId: user.uid,
            userName: profile?.displayName || user.displayName || '名無しの地味っち',
            userPhoto: profile?.photoURL || user.photoURL || '',
            type,
            content,
            date: todayStr,
            createdAt: new Date().toISOString(),
            votesCount: 0
          });
          localStorage.setItem(localPostsKey, JSON.stringify(localPosts));
        } catch (_) {}

        setSubmitMessage({ text: '投稿が完了しました！明日の投票をお楽しみに！(ローカル体験保存)', isError: false });
        if (type === 'haiku') {
          setHaikuContent('');
          setAlreadySubmittedHaiku(true);
        } else {
          setDajareContent('');
          setAlreadySubmittedDajare(true);
        }

        awardGachaItem(user.uid, 'coins', '3');

        try {
          localStorage.setItem('jimicchi_db_quota_exceeded', 'true');
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('jimicchi_quota_change'));
        } catch (_) {}
      } else {
        setSubmitMessage({ text: '送信中にエラーが発生しました。', isError: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Voting handler
  const handleVote = async (matchIndex: number, sub: PlazaSubmission) => {
    if (userVotes[matchIndex]) return; // Already voted on this Matchup

    const voteDocId = `${user.uid}_${yesterdayStr}_${activeTab}_${matchIndex}`;

    try {
      // Update submission votes Count
      const subRef = doc(db, 'plaza_submissions', sub.id);
      await updateDoc(subRef, {
        votesCount: increment(1)
      });

      // Writes vote document
      const voteRef = doc(db, 'plaza_votes', voteDocId);
      await addDoc(collection(db, 'plaza_votes'), {
        id: voteDocId,
        userId: user.uid,
        submissionId: sub.id,
        date: yesterdayStr,
        type: activeTab,
        matchIndex,
        createdAt: Timestamp.now()
      });

      // Update state
      setUserVotes(prev => ({
        ...prev,
        [matchIndex]: sub.id
      }));

      // Increment other option to display properly
      setYesterdaySubs(prev => prev.map(item => {
        if (item.id === sub.id) {
          return { ...item, votesCount: (item.votesCount || 0) + 1 };
        }
        return item;
      }));

    } catch (e: any) {
      console.error("Voting error", e);
      const isQuota = e.message?.toLowerCase().includes('quota') || 
                      e.message?.toLowerCase().includes('exhausted') || 
                      e.message?.toLowerCase().includes('permission') || 
                      e.message?.toLowerCase().includes('unavailable') ||
                      e.message?.toLowerCase().includes('limit');
      if (isQuota) {
        console.warn("Voting Firestore error (quota). Simulating vote success locally.");
        try {
          const localVotesObj = JSON.parse(localStorage.getItem('jimicchi_local_votes') || '{}');
          localVotesObj[voteDocId] = sub.id;
          localStorage.setItem('jimicchi_local_votes', JSON.stringify(localVotesObj));
          
          localStorage.setItem('jimicchi_db_quota_exceeded', 'true');
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('jimicchi_quota_change'));
        } catch (_) {}
      }
      
      // Update state regardless of writing failure, so user experience remains flawless!
      setUserVotes(prev => ({
        ...prev,
        [matchIndex]: sub.id
      }));

      setYesterdaySubs(prev => prev.map(item => {
        if (item.id === sub.id) {
          return { ...item, votesCount: (item.votesCount || 0) + 1 };
        }
        return item;
      }));
    }
  };

  // 7. Shoseki Likes / Empathies and unlocked badges
  const handleReactToBook = async (book: PlazaBook, reactionType: 'like' | 'empathy') => {
    if (!user) return;
    const isLiked = book.likedBy?.includes(user.uid);
    const isEmpathized = book.empathizedBy?.includes(user.uid);

    const bookRef = doc(db, 'plaza_books', book.id);
    let updates: any = {};

    if (reactionType === 'like') {
      if (isLiked) {
        updates.likedBy = arrayRemove(user.uid);
        updates.likesCount = increment(-1);
      } else {
        updates.likedBy = arrayUnion(user.uid);
        updates.likesCount = increment(1);
      }
    } else {
      if (isEmpathized) {
        updates.empathizedBy = arrayRemove(user.uid);
        updates.empathiesCount = increment(-1);
      } else {
        updates.empathizedBy = arrayUnion(user.uid);
        updates.empathiesCount = increment(1);
      }
    }

    try {
      await updateDoc(bookRef, updates);
      
      // Update selected book and local books state
      const updateList = (prev: PlazaBook[]) => prev.map(b => {
        if (b.id === book.id) {
          const lBy = reactionType === 'like' 
            ? (isLiked ? b.likedBy.filter(id => id !== user.uid) : [...(b.likedBy || []), user.uid])
            : b.likedBy;
          const eBy = reactionType === 'empathy'
            ? (isEmpathized ? b.empathizedBy.filter(id => id !== user.uid) : [...(b.empathizedBy || []), user.uid])
            : b.empathizedBy;
          
          return {
            ...b,
            likesCount: reactionType === 'like' ? b.likesCount + (isLiked ? -1 : 1) : b.likesCount,
            empathiesCount: reactionType === 'empathy' ? b.empathiesCount + (isEmpathized ? -1 : 1) : b.empathiesCount,
            likedBy: lBy,
            empathizedBy: eBy
          };
        }
        return b;
      });

      setBooks(updateList);
      if (selectedBook && selectedBook.id === book.id) {
        setSelectedBook(prev => {
          if (!prev) return null;
          const lBy = reactionType === 'like' 
            ? (isLiked ? prev.likedBy.filter(id => id !== user.uid) : [...(prev.likedBy || []), user.uid])
            : prev.likedBy;
          const eBy = reactionType === 'empathy'
            ? (isEmpathized ? prev.empathizedBy.filter(id => id !== user.uid) : [...(prev.empathizedBy || []), user.uid])
            : prev.empathizedBy;
          
          return {
            ...prev,
            likesCount: reactionType === 'like' ? prev.likesCount + (isLiked ? -1 : 1) : prev.likesCount,
            empathiesCount: reactionType === 'empathy' ? prev.empathiesCount + (isEmpathized ? -1 : 1) : prev.empathiesCount,
            likedBy: lBy,
            empathizedBy: eBy
          };
        });
      }

    } catch (e) {
      console.error(e);
    }
  };

  // 8. Publish Book
  const handlePublishBook = async () => {
    if (!bookTitle.trim()) {
      alert('本タイトルを入力してください。');
      return;
    }
    if (!bookDesc.trim()) {
      alert('短縮あらすじを入力してください。');
      return;
    }
    if (!bookContent.trim()) {
      alert('本文を入力してください。');
      return;
    }
    if (bookContent.length > 1200) {
      alert('本文は1200文字以下にしてください。');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'plaza_books'), {
        title: bookTitle.trim(),
        description: bookDesc.trim(),
        content: bookContent.trim(),
        authorId: user.uid,
        authorName: profile?.displayName || user.displayName || '旅する作家',
        authorPhoto: profile?.photoURL || user.photoURL || '',
        createdAt: Timestamp.now(),
        likesCount: 0,
        empathiesCount: 0,
        likedBy: [],
        empathizedBy: []
      });

      // Clear draft
      setBookTitle('');
      setBookDesc('');
      setBookContent('');

      // Unlock "本棚の住人" award if first book
      const booksQuery = query(collection(db, 'plaza_books'), where('authorId', '==', user.uid));
      const userBooksSnap = await getDocs(booksQuery);
      const booksCount = userBooksSnap.size;

      if (booksCount === 1) {
        awardGachaItem(user.uid, 'special_badge', 'badge_bookshelf_resident');
        awardGachaItem(user.uid, 'special_title', 'p_plaza_books');
        awardGachaItem(user.uid, 'special_title', 's_plaza_books_guardian');
        alert('【バッジ獲得】初めて本棚に本を投稿しました！バッジ『本棚の住人』・二つ名《本棚の守護者》を解放！');
      } else if (booksCount === 3) {
        awardGachaItem(user.uid, 'special_badge', 'badge_text_addict');
        awardGachaItem(user.uid, 'special_title', 'p_plaza_midnight_writer');
        awardGachaItem(user.uid, 'special_title', 's_plaza_midnight_novelist');
        alert('【バッジ獲得】素晴らしい！本棚に3作品目を記述しました！バッジ『活字中毒』・二つ名《深夜の文豪》が解放されました！');
      } else {
        alert('投稿が完了しました！地味書籍にあなたの作品が並びました。');
      }

      setShosekiSubTab('read');
    } catch (e) {
      console.error(e);
      alert('書籍の作成中にエラーが発生しました。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 md:py-10 bg-amber-50/20 min-h-screen font-sans">
      {/* Header and Back Button */}
      <div className="flex items-center justify-between mb-8 border-b border-amber-200/60 pb-5">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">🎪</span>
          <div>
            <h1 className="text-2xl font-bold text-stone-800 tracking-tight">地味ひろば</h1>
            <p className="text-xs text-stone-500 font-mono">Jimichi Event Plaza</p>
          </div>
        </div>
        <button 
          onClick={onBack}
          className="px-4 py-2 text-stone-600 hover:text-stone-900 border border-stone-200 bg-white rounded-xl shadow-sm transition-all hover:bg-stone-50 text-sm flex items-center space-x-2"
        >
          <ChevronLeft size={16} />
          <span>通常投稿へ戻る</span>
        </button>
      </div>

      {/* Main Tab Controller */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1 bg-stone-100 rounded-2xl mb-8">
        <button
          onClick={() => { setActiveTab('haiku'); setPlazaSubTab('post'); }}
          className={`py-3 rounded-xl font-medium text-xs md:text-sm flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'haiku' 
              ? 'bg-amber-600 text-white shadow-md' 
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <span>🎑</span>
          <span>地味俳句</span>
        </button>
        <button
          onClick={() => { setActiveTab('dajare'); setPlazaSubTab('post'); }}
          className={`py-3 rounded-xl font-medium text-xs md:text-sm flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'dajare' 
              ? 'bg-amber-600 text-white shadow-md' 
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <span>💡</span>
          <span>地味ダジャレ</span>
        </button>
        <button
          onClick={() => { setActiveTab('shoseki'); setShosekiSubTab('read'); }}
          className={`py-3 rounded-xl font-medium text-xs md:text-sm flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'shoseki' 
              ? 'bg-amber-600 text-white shadow-md' 
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <span>📚</span>
          <span>地味書籍</span>
        </button>
        <button
          onClick={() => { setActiveTab('survey'); setSurveySubTab('play'); }}
          className={`py-3 rounded-xl font-medium text-xs md:text-sm flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'survey' 
              ? 'bg-amber-600 text-white shadow-md' 
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <span>👥</span>
          <span>人類調査</span>
        </button>
      </div>

      {/* Sub Menu / Section Headers */}
      {activeTab !== 'shoseki' && activeTab !== 'survey' ? (
        <div className="flex border-b border-stone-200 mb-6 gap-6 text-sm">
          <button
            onClick={() => setPlazaSubTab('post')}
            className={`pb-3 font-semibold transition-all border-b-2 hover:text-stone-900 inline-flex items-center gap-1.5 ${
              plazaSubTab === 'post' 
                ? 'border-amber-600 text-amber-600' 
                : 'border-transparent text-stone-500'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>投稿する</span>
          </button>
          <button
            onClick={() => setPlazaSubTab('vote')}
            className={`pb-3 font-semibold transition-all border-b-2 hover:text-stone-900 inline-flex items-center gap-1.5 ${
              plazaSubTab === 'vote' 
                ? 'border-amber-600 text-amber-600' 
                : 'border-transparent text-stone-500'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>審査する</span>
          </button>
          <button
            onClick={() => setPlazaSubTab('results')}
            className={`pb-3 font-semibold transition-all border-b-2 hover:text-stone-900 inline-flex items-center gap-1.5 ${
              plazaSubTab === 'results' 
                ? 'border-amber-600 text-amber-600' 
                : 'border-transparent text-stone-500'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>結果発表</span>
          </button>
        </div>
      ) : (
        <div className="flex border-b border-stone-200 mb-6 gap-6 text-sm">
          <button
            onClick={() => setShosekiSubTab('read')}
            className={`pb-3 font-semibold transition-all border-b-2 hover:text-stone-900 inline-flex items-center gap-1.5 ${
              shosekiSubTab === 'read' 
                ? 'border-amber-600 text-amber-600' 
                : 'border-transparent text-stone-500'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>読む</span>
          </button>
          <button
            onClick={() => setShosekiSubTab('write')}
            className={`pb-3 font-semibold transition-all border-b-2 hover:text-stone-900 inline-flex items-center gap-1.5 ${
              shosekiSubTab === 'write' 
                ? 'border-amber-600 text-amber-600' 
                : 'border-transparent text-stone-500'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>書く</span>
          </button>
        </div>
      )}

      {/* CELEBRATION MODAL OVERLAY */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-amber-200 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-400 via-rose-400 to-amber-500" />
              <button 
                onClick={() => setShowCelebration(null)}
                className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100"
              >
                <X size={18} />
              </button>

              <span className="inline-block text-5xl mb-4 animate-bounce">🎉</span>
              <h3 className="text-xl font-bold text-stone-800 mb-1">
                審査結果発表！
              </h3>
              <p className="text-sm font-semibold text-rose-600 mb-4 font-mono">
                {showCelebration.date} 開催分「地味{showCelebration.type === 'haiku' ? '俳句' : 'ダジャレ'}」
              </p>

              <div className="bg-amber-50/75 rounded-2xl p-4 mb-5 border border-amber-100">
                <span className="text-xs uppercase tracking-wider font-mono text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full font-bold mb-2 inline-block">
                  {showCelebration.rank === 1 ? '🥇 優勝 🏆' : showCelebration.rank === 2 ? '🥈 準優勝 🏅' : '🥉 ベスト4 🌸'}
                </span>
                <p className="text-stone-700 text-sm mt-1">
                  あなたの日常センスがコミュニティの圧倒的な共感を呼び寄せました！
                </p>
              </div>

              <div className="space-y-3 text-left bg-stone-50 rounded-2xl p-4 border border-stone-200 mb-6 text-sm">
                <span className="font-bold text-xs text-stone-500 block">🎁 今回の獲得リワード:</span>
                <div className="flex items-center space-x-2 font-semibold text-stone-700">
                  <Coins className="text-amber-500" size={16} />
                  <span>+{showCelebration.rewardCoins} Gacha Coins</span>
                </div>
                <div className="flex items-center space-x-2 font-semibold text-stone-700">
                  <Award className="text-blue-500" size={16} />
                  <span>称号解放: {showCelebration.titleName}</span>
                </div>
                {showCelebration.badgeName && (
                  <div className="flex items-center space-x-2 font-semibold text-stone-700">
                    <Trophy className="text-rose-500" size={16} />
                    <span>バッジ解放: 【{showCelebration.badgeName}】</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleClaimReward}
                className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-rose-600 text-white rounded-2xl font-bold text-sm shadow-lg hover:from-amber-700 hover:to-rose-700 transition-all hover:scale-[1.02] active:scale-95"
              >
                リワードを受け取る！
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TAB CONTENT: HAIKU */}
      {activeTab === 'haiku' && (
        <div className="space-y-6">
          {/* POST HAIKU */}
          {plazaSubTab === 'post' && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/30 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-xl">🎑</span>
                <h3 className="text-lg font-bold text-stone-800">地味俳句を作る</h3>
              </div>
              <p className="text-sm text-stone-500 mb-5 leading-relaxed">
                日常のちょっとした哀愁、ささやかな喜び、細かすぎる「あるある」を五・七・五（にこだわらなくてもOK）で表現しましょう！毎日1回投稿可能です。
              </p>

              {alreadySubmittedHaiku ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                  <span className="text-2xl block mb-2">✅</span>
                  <p className="text-sm font-semibold text-emerald-800 mb-1">
                    本日（{todayStr}）分の地味俳句はすでに投稿されています！
                  </p>
                  <p className="text-xs text-stone-500">
                    明日の審査(Yesterday's Matchup)をお楽しみに。
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">
                      俳句作品（最大50字）
                    </label>
                    <input
                      type="text"
                      value={haikuContent}
                      onChange={e => setHaikuContent(e.target.value)}
                      placeholder="例）すれ違い 目が合いそうで 合わぬ午後"
                      maxLength={50}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm text-stone-800"
                    />
                    <div className="flex justify-between mt-1.5 text-xs text-stone-400">
                      <span>※細かすぎる日常ネタ歓迎</span>
                      <span className="font-mono">{haikuContent.length} / 50</span>
                    </div>
                  </div>

                  {submitMessage.text && (
                    <div className={`p-3 rounded-lg text-xs leading-relaxed ${submitMessage.isError ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                      {submitMessage.text}
                    </div>
                  )}

                  <button
                    onClick={() => handleSubmitSubmission('haiku')}
                    disabled={submitting}
                    className="w-full py-3.5 bg-stone-800 hover:bg-stone-900 text-white font-semibold text-sm rounded-xl transition-all shadow-md active:scale-95 disabled:bg-stone-300"
                  >
                    {submitting ? '送信中...' : '地味俳句を登録する (参加賞 +3 Coins)'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* JUDGE HAIKU (VOTING) */}
          {plazaSubTab === 'vote' && (
            <div className="space-y-6">
              <div className="bg-amber-50/60 rounded-2xl p-5 border border-amber-200 text-stone-700 text-sm leading-relaxed">
                <span className="font-bold text-amber-800 flex items-center gap-1.5 mb-1">
                  <Scale className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>審査ひろばの仕組み</span>
                </span>
                昨日（{yesterdayStr}分）投稿されたすべての地味俳句を、1対1の格闘マッチ（トーナメント）形式で並べています。あなたがより「クスッときた」「心に沁みた」と思う方をタップしてください。
              </div>

              {loadingVoting ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-stone-500 text-sm font-mono">対戦テーブルを構築中...</p>
                </div>
              ) : yesterdaySubs.length < 2 ? (
                <div className="bg-white rounded-3xl p-10 border border-stone-200 text-center text-stone-500">
                  <Inbox className="mx-auto text-stone-300 mb-3" size={36} />
                  <p className="text-sm font-semibold">昨日は十分な量の地味俳句が投稿されませんでした。</p>
                  <p className="text-xs text-stone-400 mt-1">本日あなたの力作を含め、たくさん投稿しましょう！</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-stone-500 uppercase tracking-widest border-l-4 border-amber-600 pl-3">
                    昨日 ({yesterdayStr}) の全マッチ ({Math.floor(yesterdaySubs.length / 2)}対戦)
                  </h4>
                  
                  {Array.from({ length: Math.floor(yesterdaySubs.length / 2) }).map((_, mIdx) => {
                    const subA = yesterdaySubs[2 * mIdx];
                    const subB = yesterdaySubs[2 * mIdx + 1];
                    const chosenId = userVotes[mIdx];
                    const totalVotes = (subA.votesCount || 0) + (subB.votesCount || 0);

                    const rateA = totalVotes > 0 ? Math.round(((subA.votesCount || 0) / totalVotes) * 100) : 50;
                    const rateB = totalVotes > 0 ? 100 - rateA : 50;

                    return (
                      <div key={mIdx} className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm">
                        <div className="text-xs font-bold text-stone-400 font-mono mb-3 uppercase tracking-wider block border-b pb-2">
                          Match #{mIdx + 1}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Sub A */}
                          <button
                            disabled={!!chosenId}
                            onClick={() => handleVote(mIdx, subA)}
                            className={`p-5 rounded-2xl text-left border relative transition-all flex flex-col justify-between min-h-[140px] group ${
                              chosenId === subA.id 
                                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20' 
                                : chosenId && chosenId !== subA.id
                                ? 'bg-stone-50/50 border-stone-200 opacity-60'
                                : 'border-stone-200 bg-stone-50/30 hover:bg-stone-50 hover:border-amber-400'
                            }`}
                          >
                            <span className="text-base font-bold text-stone-800 tracking-wide line-clamp-3">
                              {subA.content}
                            </span>
                            <div className="flex items-center justify-between mt-4 border-t pt-3 w-full">
                              <span className="text-xs text-stone-500 flex items-center space-x-2">
                                <User size={12} className="text-stone-400" />
                                <span className="font-medium">{subA.userName}</span>
                              </span>
                              {chosenId && (
                                <span className="text-sm font-bold font-mono text-amber-700">
                                  {rateA}%
                                </span>
                              )}
                            </div>
                            {chosenId === subA.id && (
                              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow">
                                <Check size={14} className="stroke-[3]" />
                              </div>
                            )}
                          </button>

                          {/* Sub B */}
                          <button
                            disabled={!!chosenId}
                            onClick={() => handleVote(mIdx, subB)}
                            className={`p-5 rounded-2xl text-left border relative transition-all flex flex-col justify-between min-h-[140px] group ${
                              chosenId === subB.id 
                                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20' 
                                : chosenId && chosenId !== subB.id
                                ? 'bg-stone-50/50 border-stone-200 opacity-60'
                                : 'border-stone-200 bg-stone-50/30 hover:bg-stone-50 hover:border-amber-400'
                            }`}
                          >
                            <span className="text-base font-bold text-stone-800 tracking-wide line-clamp-3">
                              {subB.content}
                            </span>
                            <div className="flex items-center justify-between mt-4 border-t pt-3 w-full">
                              <span className="text-xs text-stone-500 flex items-center space-x-2">
                                <User size={12} className="text-stone-400" />
                                <span className="font-medium">{subB.userName}</span>
                              </span>
                              {chosenId && (
                                <span className="text-sm font-bold font-mono text-amber-700">
                                  {rateB}%
                                </span>
                              )}
                            </div>
                            {chosenId === subB.id && (
                              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow">
                                <Check size={14} className="stroke-[3]" />
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* RESULTS HAIKU */}
          {plazaSubTab === 'results' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm text-center">
                <Trophy className="text-amber-500 mx-auto mb-3 animate-pulse" size={40} />
                <h4 className="text-lg font-bold text-stone-800">昨日（{yesterdayStr}分）の最終結果発表</h4>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  昨日の地味俳句ファイトを勝ち上がった、みんなのベスト日常詩！
                </p>
              </div>

              {yesterdaySubs.length < 2 ? (
                <div className="bg-white rounded-3xl p-10 border border-stone-200 text-center text-stone-500">
                  <Inbox className="mx-auto text-stone-300 mb-3" size={32} />
                  <p className="text-sm font-semibold">該当する日程の結果集計がありません。</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Find Winner */}
                  {(() => {
                    const sorted = [...yesterdaySubs].sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
                    const champ = sorted[0];
                    const second = sorted[1];
                    const nextList = sorted.slice(2, 6);

                    return (
                      <div className="space-y-6">
                        {/* 1st Place Card */}
                        {champ && (
                          <div className="bg-gradient-to-r from-amber-50 via-warm-gray-50 to-amber-50/70 border border-amber-300 rounded-3xl p-6 relative overflow-hidden shadow-md">
                            <div className="absolute top-0 right-0 py-2 px-6 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold font-mono tracking-wider shadow uppercase rounded-bl-2xl">
                              CHAMPION 🥇 優勝
                            </div>
                            <div className="flex items-start space-x-4">
                              <div className="text-3xl">🏆</div>
                              <div>
                                <p className="text-sm text-stone-500 mt-0.5">作：{champ.userName}</p>
                                <p className="text-xl font-bold text-stone-900 mt-3 leading-relaxed tracking-wider quote">
                                  「{champ.content}」
                                </p>
                                <span className="inline-block mt-4 text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg">
                                  総得票数 {champ.votesCount || 0} 票
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Runner-up */}
                        {second && (
                          <div className="bg-stone-50/60 border border-stone-200/95 rounded-2xl p-5 relative">
                            <div className="absolute top-0 right-0 py-1.5 px-4 bg-stone-400 text-white text-xs font-bold rounded-bl-xl">
                              2nd 🥈 準優勝
                            </div>
                            <p className="text-xs text-stone-500">作：{second.userName}</p>
                            <p className="text-base font-bold text-stone-800 mt-2">
                              「{second.content}」
                            </p>
                          </div>
                        )}

                        {/* Best 4 etc */}
                        {nextList.length > 0 && (
                          <div className="bg-white rounded-2xl p-5 border border-stone-200">
                            <span className="text-xs font-bold text-stone-400 block mb-3 uppercase tracking-wider">
                              ベスト4 / 上位優秀作品
                            </span>
                            <div className="divide-y divide-stone-100">
                              {nextList.map((item, idx) => (
                                <div key={idx} className="py-3 flex justify-between items-center text-sm gap-4">
                                  <span className="text-stone-700 font-medium">「{item.content}」</span>
                                  <span className="text-xs text-stone-400 whitespace-nowrap">by {item.userName}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: DAJARE */}
      {activeTab === 'dajare' && (
        <div className="space-y-6">
          {/* POST DAJARE */}
          {plazaSubTab === 'post' && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/30 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-xl">💡</span>
                <h3 className="text-lg font-bold text-stone-800">地味ダジャレを贈る</h3>
              </div>
              <p className="text-sm text-stone-500 mb-5 leading-relaxed">
                寒すぎてもいい、洗練されていなくてもいい。ちょっとした言葉のすれ違い、ささやかな語呂遊びを披露してみましょう。
              </p>

              {alreadySubmittedDajare ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                  <span className="text-2xl block mb-2">✅</span>
                  <p className="text-sm font-semibold text-emerald-800 mb-1">
                    本日（{todayStr}）分の地味ダジャレは投稿されています！
                  </p>
                  <p className="text-xs text-stone-500">
                    明日のマッチ審査(Yesterday's Matchup)でお会いしましょう。
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">
                      渾身の地味ダジャレ（最大60字）
                    </label>
                    <input
                      type="text"
                      value={dajareContent}
                      onChange={e => setDajareContent(e.target.value)}
                      placeholder="例）ココアはここあ！と言い張る喫茶店"
                      maxLength={60}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm text-stone-800"
                    />
                    <div className="flex justify-between mt-1.5 text-xs text-stone-400">
                      <span>※ほっこりする軽口歓迎</span>
                      <span className="font-mono">{dajareContent.length} / 60</span>
                    </div>
                  </div>

                  {submitMessage.text && (
                    <div className={`p-3 rounded-lg text-xs leading-relaxed ${submitMessage.isError ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                      {submitMessage.text}
                    </div>
                  )}

                  <button
                    onClick={() => handleSubmitSubmission('dajare')}
                    disabled={submitting}
                    className="w-full py-3.5 bg-stone-800 hover:bg-stone-900 text-white font-semibold text-sm rounded-xl transition-all shadow-md active:scale-95 disabled:bg-stone-300"
                  >
                    {submitting ? '送信中...' : '地味ダジャレを登録する (参加賞 +3 Coins)'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* JUDGE DAJARE (VOTING) */}
          {plazaSubTab === 'vote' && (
            <div className="space-y-6">
              <div className="bg-amber-50/60 rounded-2xl p-5 border border-amber-200 text-stone-700 text-sm leading-relaxed">
                <span className="font-bold text-amber-800 flex items-center gap-1.5 mb-1">
                  <Scale className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>ダジャレッスルマッチ</span>
                </span>
                昨日（{yesterdayStr}分）のすべてのダジャレが1対1で衝突しています。よりセンスや親和性が高いと思う作品に清き一票をお願いします！
              </div>

              {loadingVoting ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-stone-500 text-sm font-mono">対戦状況を集計中...</p>
                </div>
              ) : yesterdaySubs.length < 2 ? (
                <div className="bg-white rounded-3xl p-10 border border-stone-200 text-center text-stone-500">
                  <Inbox className="mx-auto text-stone-300 mb-3" size={36} />
                  <p className="text-sm font-semibold">昨日は十分な量のダジャレが投稿されませんでした。</p>
                  <p className="text-xs text-stone-400 mt-1">言葉遊びの輪を広げるために、本日1作残しましょう！</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-stone-500 uppercase tracking-widest border-l-4 border-amber-600 pl-3">
                    昨日 ({yesterdayStr}) の全マッチ ({Math.floor(yesterdaySubs.length / 2)}対戦)
                  </h4>
                  
                  {Array.from({ length: Math.floor(yesterdaySubs.length / 2) }).map((_, mIdx) => {
                    const subA = yesterdaySubs[2 * mIdx];
                    const subB = yesterdaySubs[2 * mIdx + 1];
                    const chosenId = userVotes[mIdx];
                    const totalVotes = (subA.votesCount || 0) + (subB.votesCount || 0);

                    const rateA = totalVotes > 0 ? Math.round(((subA.votesCount || 0) / totalVotes) * 100) : 50;
                    const rateB = totalVotes > 0 ? 100 - rateA : 50;

                    return (
                      <div key={mIdx} className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm">
                        <div className="text-xs font-bold text-stone-400 font-mono mb-3 uppercase tracking-wider block border-b pb-2">
                          Match #{mIdx + 1}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <button
                            disabled={!!chosenId}
                            onClick={() => handleVote(mIdx, subA)}
                            className={`p-5 rounded-2xl text-left border relative transition-all flex flex-col justify-between min-h-[140px] group ${
                              chosenId === subA.id 
                                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20' 
                                : chosenId && chosenId !== subA.id
                                ? 'bg-stone-50/50 border-stone-200 opacity-60'
                                : 'border-stone-200 bg-stone-50/30 hover:bg-stone-50 hover:border-amber-400'
                            }`}
                          >
                            <span className="text-base font-bold text-stone-800 tracking-wide line-clamp-3">
                              {subA.content}
                            </span>
                            <div className="flex items-center justify-between mt-4 border-t pt-3 w-full">
                              <span className="text-xs text-stone-500 flex items-center space-x-2">
                                <User size={12} className="text-stone-400" />
                                <span className="font-medium">{subA.userName}</span>
                              </span>
                              {chosenId && (
                                <span className="text-sm font-bold font-mono text-amber-700">
                                  {rateA}%
                                </span>
                              )}
                            </div>
                            {chosenId === subA.id && (
                              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow">
                                <Check size={14} className="stroke-[3]" />
                              </div>
                            )}
                          </button>

                          <button
                            disabled={!!chosenId}
                            onClick={() => handleVote(mIdx, subB)}
                            className={`p-5 rounded-2xl text-left border relative transition-all flex flex-col justify-between min-h-[140px] group ${
                              chosenId === subB.id 
                                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20' 
                                : chosenId && chosenId !== subB.id
                                ? 'bg-stone-50/50 border-stone-200 opacity-60'
                                : 'border-stone-200 bg-stone-50/30 hover:bg-stone-50 hover:border-amber-400'
                            }`}
                          >
                            <span className="text-base font-bold text-stone-800 tracking-wide line-clamp-3">
                              {subB.content}
                            </span>
                            <div className="flex items-center justify-between mt-4 border-t pt-3 w-full">
                              <span className="text-xs text-stone-500 flex items-center space-x-2">
                                <User size={12} className="text-stone-400" />
                                <span className="font-medium">{subB.userName}</span>
                              </span>
                              {chosenId && (
                                <span className="text-sm font-bold font-mono text-amber-700">
                                  {rateB}%
                                </span>
                              )}
                            </div>
                            {chosenId === subB.id && (
                              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow">
                                <Check size={14} className="stroke-[3]" />
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* RESULTS DAJARE */}
          {plazaSubTab === 'results' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm text-center">
                <Trophy className="text-amber-500 mx-auto mb-3 animate-pulse" size={40} />
                <h4 className="text-lg font-bold text-stone-800">昨日（{yesterdayStr}分）のダジャレ栄えある結果</h4>
                <p className="text-xs text-stone-500 mt-1">クスッとさせる達人たちがこちらです！</p>
              </div>

              {yesterdaySubs.length < 2 ? (
                <div className="bg-white rounded-3xl p-10 border border-stone-200 text-center text-stone-500">
                  <Inbox className="mx-auto text-stone-300 mb-3" size={32} />
                  <p className="text-sm font-semibold">結果発表日程のアクティビティがありませんでした。</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const sorted = [...yesterdaySubs].sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
                    const champ = sorted[0];
                    const second = sorted[1];
                    const nextList = sorted.slice(2, 6);

                    return (
                      <div className="space-y-6">
                        {/* Champ */}
                        {champ && (
                          <div className="bg-gradient-to-r from-amber-50 via-warm-gray-50 to-amber-50/70 border border-amber-300 rounded-3xl p-6 relative overflow-hidden shadow-md">
                            <div className="absolute top-0 right-0 py-2 px-6 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold font-mono tracking-wider shadow uppercase rounded-bl-2xl">
                              CHAMPION 🥇 ダジャレ王
                            </div>
                            <div className="flex items-start space-x-4">
                              <span className="text-3xl">🤣</span>
                              <div>
                                <p className="text-sm text-stone-500">作：{champ.userName}</p>
                                <p className="text-xl font-bold text-stone-900 mt-3 leading-relaxed tracking-wider">
                                  「{champ.content}」
                                </p>
                                <span className="inline-block mt-4 text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg">
                                  共感得票数 {champ.votesCount || 0} 票
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 2nd */}
                        {second && (
                          <div className="bg-stone-50/60 border border-stone-200/95 rounded-2xl p-5 relative">
                            <div className="absolute top-0 right-0 py-1.5 px-4 bg-stone-400 text-white text-xs font-bold rounded-bl-xl">
                              2nd 🥈 優秀言葉遊び
                            </div>
                            <p className="text-xs text-stone-500">作：{second.userName}</p>
                            <p className="text-base font-bold text-stone-800 mt-2">
                              「{second.content}」
                            </p>
                          </div>
                        )}

                        {/* Best 4 */}
                        {nextList.length > 0 && (
                          <div className="bg-white rounded-2xl p-5 border border-stone-200">
                            <span className="text-xs font-bold text-stone-400 block mb-3 uppercase tracking-wider">
                              その他の人気言葉遊び
                            </span>
                            <div className="divide-y divide-stone-100">
                              {nextList.map((item, idx) => (
                                <div key={idx} className="py-3 flex justify-between items-center text-sm gap-4">
                                  <span className="text-stone-700 font-medium">「{item.content}」</span>
                                  <span className="text-xs text-stone-400 whitespace-nowrap">by {item.userName}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SHOSEKI (BOOKS) */}
      {activeTab === 'shoseki' && (
        <div className="space-y-6">
          {/* READ BOOKS */}
          {shosekiSubTab === 'read' && (
            <div className="space-y-6">
              {/* Filter Switcher */}
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <span className="text-sm font-bold text-stone-500 flex items-center space-x-2">
                  <BookOpen size={16} />
                  <span>作品を読む</span>
                </span>
                <div className="flex space-x-1.5 p-0.5 bg-stone-100 rounded-lg text-xs">
                  <button
                    onClick={() => setShosekiFilter('new')}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      shosekiFilter === 'new' ? 'bg-white shadow text-amber-600' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    🆕 新着
                  </button>
                  <button
                    onClick={() => setShosekiFilter('popular')}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      shosekiFilter === 'popular' ? 'bg-white shadow text-amber-600' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    🔥 人気
                  </button>
                </div>
              </div>

              {loadingBooks ? (
                <div className="text-center py-16">
                  <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-stone-500 text-sm font-mono">本棚から読み込み中...</p>
                </div>
              ) : books.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border text-stone-400">
                  <BookOpen className="mx-auto text-stone-300 mb-3" size={36} />
                  <p className="text-sm font-semibold">本棚にはまだ本が並んでいません。</p>
                  <p className="text-xs text-stone-400 mt-1">「書く」タブから、初の1章を執筆してみませんか？</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {books.map(book => {
                    const isLikedByMe = book.likedBy?.includes(user?.uid);
                    const isEmpathizedByMe = book.empathizedBy?.includes(user?.uid);

                    return (
                      <div 
                        key={book.id}
                        className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group"
                      >
                        <div>
                          {/* Book Header / Title */}
                          <div 
                            onClick={() => setSelectedBook(book)}
                            className="cursor-pointer"
                          >
                            <h5 className="text-lg font-bold text-stone-800 select-all group-hover:text-amber-600 transition-colors font-sans mb-1 leading-snug">
                              {book.title}
                            </h5>
                            <span className="text-xs text-stone-400 font-mono flex items-center space-x-1.5 mb-3">
                              <User size={11} />
                              <span>{book.authorName}</span>
                            </span>
                            <p className="text-sm text-stone-600 leading-relaxed max-h-[80px] overflow-hidden text-ellipsis line-clamp-3 mb-4">
                              {book.description}
                            </p>
                          </div>
                        </div>

                        {/* Interactive Reaction & Reader triggers */}
                        <div className="border-t pt-4 flex items-center justify-between">
                          <button
                            onClick={() => setSelectedBook(book)}
                            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center space-x-1 pr-4"
                          >
                            <span>本文をすべて読む</span>
                            <ChevronRight size={14} />
                          </button>

                          <div className="flex items-center space-x-3 text-xs text-stone-400 font-semibold">
                            {/* Likes */}
                            <button
                              onClick={() => handleReactToBook(book, 'like')}
                              className={`flex items-center space-x-1 py-1.5 px-2.5 rounded-lg transition-all ${
                                isLikedByMe 
                                  ? 'bg-rose-50 text-rose-600 border border-rose-200/60' 
                                  : 'hover:bg-stone-50 border border-transparent'
                              }`}
                            >
                              <ThumbsUp size={13} className={isLikedByMe ? 'fill-rose-500 stroke-rose-500' : ''} />
                              <span>{book.likesCount || 0}</span>
                            </button>

                            {/* Empathies */}
                            <button
                              onClick={() => handleReactToBook(book, 'empathy')}
                              className={`flex items-center space-x-1 py-1.5 px-2.5 rounded-lg transition-all ${
                                isEmpathizedByMe 
                                  ? 'bg-amber-50 text-amber-600 border border-amber-200/60' 
                                  : 'hover:bg-stone-50 border border-transparent'
                              }`}
                            >
                              <Sparkles size={13} className={isEmpathizedByMe ? 'fill-amber-500 stroke-amber-500' : ''} />
                              <span>{book.empathiesCount || 0}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* WRITE BOOK */}
          {shosekiSubTab === 'write' && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-5">
              <div className="flex items-center space-x-2 border-b pb-3.5 mb-2">
                <Edit3 className="text-amber-600" size={18} />
                <h4 className="font-bold text-stone-800 text-base">地味書籍を書きおろす</h4>
              </div>

              <div className="space-y-4">
                {/* Book Title */}
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wider">
                    書籍タイトル（最大40文字）
                  </label>
                  <input
                    type="text"
                    value={bookTitle}
                    onChange={e => setBookTitle(e.target.value)}
                    placeholder="見過ごされがちな午後の出来事について"
                    maxLength={40}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm text-stone-800"
                  />
                </div>

                {/* Book Description / Synopsis */}
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wider">
                    解説・あらすじ（最大150文字）
                  </label>
                  <textarea
                    rows={2}
                    value={bookDesc}
                    onChange={e => setBookDesc(e.target.value)}
                    placeholder="この作品は、日々の中で通り過ぎていく『すれ違い』と、それに対する淡い妄想を描きためた掌篇小説です。"
                    maxLength={150}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm text-stone-800 resize-none"
                  />
                  <div className="text-right text-xs text-stone-400 font-mono mt-0.5">
                    {bookDesc.length} / 150
                  </div>
                </div>

                {/* Book Content Body */}
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wider">
                    作品本文（最大1200文字完結）
                  </label>
                  <textarea
                    rows={8}
                    value={bookContent}
                    onChange={e => setBookContent(e.target.value)}
                    placeholder="ここに心温まる（あるいはクスッと地味に面白い）エッセイ、日記、ショートストーリーを綴ってください..."
                    maxLength={1200}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm text-stone-800 font-sans leading-relaxed"
                  />
                  <div className="flex justify-between text-xs text-stone-400 mt-0.5 font-mono">
                    <span>1作品1ストーリーで完結必須です。</span>
                    <span className={bookContent.length > 1200 ? 'text-rose-600 font-bold' : ''}>
                      {bookContent.length} / 1200 文字
                    </span>
                  </div>
                </div>

                {/* Publish actions */}
                <button
                  disabled={submitting}
                  onClick={handlePublishBook}
                  className="w-full py-3.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl font-semibold text-sm shadow-md transition-all active:scale-[0.98] disabled:bg-stone-300"
                >
                  {submitting ? '保存・出版中...' : '本を出版する (バッジ解放対象)'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: HUMAN SURVEY (人類に聞いてみた) */}
      {activeTab === 'survey' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Sub menu inside Survey */}
          <div className="flex border-b border-stone-200 mb-6 gap-6 text-sm overflow-x-auto whitespace-nowrap scrollbar-none">
            <button
              onClick={() => setSurveySubTab('play')}
              className={`pb-3 font-semibold transition-all border-b-2 hover:text-stone-900 inline-flex items-center gap-1.5 ${
                surveySubTab === 'play' 
                  ? 'border-amber-600 text-amber-600' 
                  : 'border-transparent text-stone-500'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>回答する</span>
            </button>
            <button
              onClick={() => setSurveySubTab('create')}
              className={`pb-3 font-semibold transition-all border-b-2 hover:text-stone-900 inline-flex items-center gap-1.5 ${
                surveySubTab === 'create' 
                  ? 'border-amber-600 text-amber-600' 
                  : 'border-transparent text-stone-500'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>アンケートを作る</span>
            </button>
            <button
              onClick={() => setSurveySubTab('history')}
              className={`pb-3 font-semibold transition-all border-b-2 hover:text-stone-900 inline-flex items-center gap-1.5 ${
                surveySubTab === 'history' 
                  ? 'border-amber-600 text-amber-600' 
                  : 'border-transparent text-stone-500'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>みんなの回答結果</span>
            </button>
          </div>

          {/* INTRO TV SHOW ANIMATION OVERLAY */}
          {introAnimationStep !== null ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-3xl p-8 py-16 text-center border-4 border-amber-400 shadow-xl flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-stone-50 opacity-30 pointer-events-none" />
              
              <AnimatePresence mode="wait">
                {introAnimationStep === 0 && (
                  <motion.div
                    key="step0"
                    initial={{ scale: 0.3, rotate: -15, opacity: 0 }}
                    animate={{ 
                      scale: [0.3, 1.2, 1.0], 
                      rotate: [-15, 5, 0], 
                      opacity: 1,
                      x: [0, -5, 5, -5, 5, 0]
                    }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="space-y-4"
                  >
                    <div className="inline-block px-4 py-1.5 bg-red-600 text-white font-black text-xs md:text-sm tracking-wider uppercase rounded-full shadow-md animate-pulse">
                      📺 独占スクープ
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-rose-600 tracking-wider bg-yellow-105 rounded-2xl px-6 py-4 border-4 border-rose-500 shadow-lg inline-block select-none">
                      人類に聞いてみた！
                    </h2>
                    <p className="text-xs text-stone-400 font-mono tracking-widest mt-2 animate-bounce">
                      * ✨ EFFECT SOUND: DO-DON! ✨ *
                    </p>
                  </motion.div>
                )}

                {introAnimationStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ opacity: 0, y: -30 }}
                    className="space-y-4"
                  >
                    <span className="text-5xl md:text-6xl animate-spin inline-block">🎤</span>
                    <h3 className="text-2xl md:text-4xl font-extrabold text-stone-800 tracking-widest mb-1">
                      本 日 の 調 査
                    </h3>
                    <div className="w-12 h-1.5 bg-amber-500 rounded-full mx-auto" />
                  </motion.div>
                )}

                {introAnimationStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6 max-w-md w-full"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-full animate-ping" />
                      <div className="w-3 h-3 bg-amber-600 rounded-full animate-ping delay-100" />
                      <div className="w-3 h-3 bg-amber-700 rounded-full animate-ping delay-200" />
                    </div>
                    <p className="text-base font-bold text-stone-700 tracking-wide">
                      📊 全国の回答を集計しています...
                    </p>
                    <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden border border-stone-200">
                      <motion.div 
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2.3, ease: 'easeInOut' }}
                        className="bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 h-full rounded-full"
                      />
                    </div>
                    <p className="text-xs text-stone-400 font-mono">
                      Real-time analysis in progress
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div>
              {/* PLAY TAB (ANSWERING SURVEYS) */}
              {surveySubTab === 'play' && (
                <div className="space-y-6">
                  {surveyLoading ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-stone-100 shadow-xs">
                      <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-stone-500 text-sm font-mono">アンケートデータを取得しています...</p>
                    </div>
                  ) : (() => {
                    const unvotedSurvey = surveys.find(s => !userSurveyVotes[s.id]);

                    if (!unvotedSurvey) {
                      return (
                        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-sm space-y-6">
                          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-4xl">
                            🎉
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-xl font-bold text-stone-850">すべての調査に回答しました！</h3>
                            <p className="text-sm text-stone-500 max-w-sm mx-auto">
                              現在回答できる新しいアンケートがありません。
                              新しいアンケートを自分で作ってみませんか？
                            </p>
                          </div>
                          <div className="flex justify-center pt-2">
                            <button
                              onClick={() => setSurveySubTab('create')}
                              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold shadow-md transition-all flex items-center space-x-2 text-sm"
                            >
                              <Plus size={16} />
                              <span>アンケートを作成する</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl border-4 border-amber-400 shadow-xl overflow-hidden"
                      >
                        {/* Header Banner */}
                        <div className="bg-amber-400 px-6 py-4 flex items-center justify-between border-b-2 border-stone-800">
                          <div className="flex items-center space-x-2">
                            <span className="text-xl">🎤</span>
                            <span className="text-sm font-black text-amber-955 uppercase tracking-widest font-mono">
                              街頭アンケート調査中
                            </span>
                          </div>
                          <div className="px-3 py-1 bg-amber-950 text-amber-300 text-xs font-black rounded-full shadow-inner flex items-center space-x-1 select-none">
                            <Coins size={12} className="fill-amber-300" />
                            <span>回答で 3 GC</span>
                          </div>
                        </div>

                        {/* Question Content */}
                        <div className="p-8 md:p-12 text-center space-y-8 bg-stone-50/50">
                          <div className="space-y-3">
                            <div className="inline-block bg-rose-100 text-rose-700 rounded-lg px-3 py-1 text-xs font-bold font-mono">
                              Q. 人類に聞いてみた質問
                            </div>
                            <h1 className="text-xl md:text-3xl font-black text-stone-800 leading-relaxed md:leading-loose">
                              「 {unvotedSurvey.question} 」
                            </h1>
                          </div>

                          <p className="text-xs text-stone-400 font-serif">
                            ※ 基本的にはい・いいえでお答えください
                          </p>

                          {/* Action Answering buttons */}
                          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-4">
                            <button
                              onClick={() => handleVoteSurvey(unvotedSurvey.id, 'yes')}
                              className="py-6 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-extrabold text-lg md:text-xl shadow-lg border-b-4 border-rose-700 transition-all active:translate-y-1 active:border-b-0 flex flex-col items-center justify-center space-y-2"
                            >
                              <span className="text-3xl">🙆‍♂️</span>
                              <span>はい</span>
                            </button>
                            <button
                              onClick={() => handleVoteSurvey(unvotedSurvey.id, 'no')}
                              className="py-6 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-extrabold text-lg md:text-xl shadow-lg border-b-4 border-sky-700 transition-all active:translate-y-1 active:border-b-0 flex flex-col items-center justify-center space-y-2"
                            >
                              <span className="text-3xl">🙅‍♀️</span>
                              <span>いいえ</span>
                            </button>
                          </div>

                          {/* Skip option */}
                          <div className="pt-2">
                            <button
                              onClick={() => {
                                const otherSurveys = surveys.filter(s => s.id !== unvotedSurvey.id);
                                if (otherSurveys.length > 0) {
                                  triggerTvIntroAnimation();
                                  setSurveys(prev => {
                                    const shuffled = [...prev];
                                    const idx = shuffled.indexOf(unvotedSurvey);
                                    if (idx > -1) {
                                      shuffled.splice(idx, 1);
                                      shuffled.push(unvotedSurvey);
                                    }
                                    return shuffled;
                                  });
                                } else {
                                  alert('他の回答可能なアンケートがありません。');
                                }
                              }}
                              className="text-stone-400 hover:text-stone-600 text-xs font-semibold underline underline-offset-4 transition-colors"
                            >
                              この調査を一旦パスして、次の質問を見る ＞
                            </button>
                          </div>
                        </div>

                        {/* Info Footer */}
                        <div className="bg-stone-100 border-t border-stone-200 px-6 py-3 flex items-center justify-between text-xs text-stone-500">
                          <span>出題者: {unvotedSurvey.authorName}</span>
                          <span className="font-mono text-stone-400">
                            {unvotedSurvey.createdAt?.toDate ? unvotedSurvey.createdAt.toDate().toLocaleDateString('ja-JP') : ''}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })()}
                </div>
              )}

              {/* CREATE TAB */}
              {surveySubTab === 'create' && (
                <div className="bg-white rounded-3xl p-6 md:p-10 border border-stone-200 shadow-sm max-w-xl mx-auto space-y-6">
                  <div className="space-y-2 text-center pb-2 border-b border-stone-100">
                    <span className="text-4xl">🎤</span>
                    <h2 className="text-xl md:text-2xl font-bold text-stone-855">
                      「人類に聞いてみた」アンケート作成
                    </h2>
                    <p className="text-xs text-stone-500">
                      あなたが常識だと思っている地味な真実を、全人類に問うてみましょう。
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5 font-sans">
                      <label className="text-xs font-black text-stone-500 block uppercase tracking-wider">
                        質問内容 (はい / いいえで答える質問)
                      </label>
                      <textarea
                        value={newSurveyQuestion}
                        onChange={(e) => setNewSurveyQuestion(e.target.value)}
                        placeholder="例：お風呂に入る直前、毎回ものすごくめんどくさい気持ちになる？"
                        rows={3}
                        maxLength={80}
                        className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-200"
                      />
                      <div className="flex justify-between items-center text-[11px] text-stone-400 px-1 font-mono">
                        <span>※ 「〜だと思う？」「〜になる？」などの質問がオススメです</span>
                        <span>{newSurveyQuestion.length} / 80 文字</span>
                      </div>
                    </div>

                    <button
                      disabled={surveyCreating || !newSurveyQuestion.trim()}
                      onClick={handleCreateSurvey}
                      className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 active:scale-[0.98]"
                    >
                      <span>{surveyCreating ? '送信中...' : '🎉 このアンケートを全人類に問う'}</span>
                    </button>
                  </div>

                  <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/60 divide-y divide-stone-200/80 space-y-3">
                    <span className="text-xs font-bold text-stone-500 block uppercase tracking-wider">
                      💡 作成のヒント：
                    </span>
                    <div className="pt-2 text-xs text-stone-500 leading-relaxed space-y-1">
                      <p>• <strong>日々の地味な共感ポイント：</strong> 誰もが一度は経験しているけれど口にしないような地味な葛藤が人気です。</p>
                      <p>• <strong>はい、いいえで答えられる形に：</strong> スムーズに回答できるよう「〜だと思う？」などの切り口が最適です。</p>
                    </div>
                  </div>
                </div>
              )}

              {/* HISTORY RESULTS TAB */}
              {surveySubTab === 'history' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-3 border-stone-200">
                    <span className="text-sm font-bold text-stone-500 flex items-center space-x-2">
                      <Users size={16} />
                      <span>全人類の集計履歴 ({surveys.length}件)</span>
                    </span>
                  </div>

                  {surveyLoading ? (
                    <div className="text-center py-16">
                      <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-stone-500 text-sm font-mono">集計履歴をロードしています...</p>
                    </div>
                  ) : surveys.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border text-stone-400">
                      <span className="block text-4xl mb-2">📊</span>
                      <p className="text-sm font-semibold">アンケートがまだ投稿されていません。</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {surveys.map(item => {
                        const totalVotes = (item.yesVotes || 0) + (item.noVotes || 0);
                        const yesPct = totalVotes > 0 ? Math.round((item.yesVotes / totalVotes) * 100) : 50;
                        const noPct = totalVotes > 0 ? Math.round((item.noVotes / totalVotes) * 100) : 50;
                        const userChoice = userSurveyVotes[item.id];

                        return (
                          <div 
                            key={item.id}
                            className="bg-white rounded-3xl p-6 border-2 border-stone-200/80 shadow-sm flex flex-col justify-between hover:border-amber-400 hover:shadow-md transition-all"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-stone-400 font-mono">
                                  {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('ja-JP') : ''}
                                </span>
                                {userChoice && (
                                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border uppercase tracking-wider ${
                                    userChoice === 'yes' 
                                      ? 'bg-rose-50 text-rose-600 border-rose-200' 
                                      : 'bg-sky-50 text-sky-600 border-sky-200'
                                  }`}>
                                    あなた: {userChoice === 'yes' ? 'はい' : 'いいえ'}
                                  </span>
                                )}
                              </div>

                              <p className="text-base font-bold text-stone-850 leading-snug">
                                「 {item.question} 」
                              </p>
                            </div>

                            <div className="mt-5 space-y-3">
                              <div className="flex justify-between items-center text-xs font-semibold text-stone-500 px-1">
                                <span className="text-rose-600 flex items-center space-x-1">
                                  <span>🙆‍♂️ はい :</span>
                                  <strong className="text-sm">{yesPct}%</strong>
                                  <span className="text-[10px] font-normal font-mono text-stone-400">({item.yesVotes || 0}票)</span>
                                </span>
                                <span className="text-sky-600 flex items-center space-x-1">
                                  <span>🙅‍♀️ いいえ :</span>
                                  <strong className="text-sm">{noPct}%</strong>
                                  <span className="text-[10px] font-normal font-mono text-stone-400">({item.noVotes || 0}票)</span>
                                </span>
                              </div>

                              <div className="w-full bg-stone-100 rounded-full h-4 overflow-hidden flex border border-stone-200">
                                {totalVotes > 0 ? (
                                  <>
                                    <div 
                                      className="bg-rose-500 h-full flex items-center justify-center text-[9px] text-white font-bold transition-all duration-500" 
                                      style={{ width: `${yesPct}%` }}
                                    >
                                      {yesPct >= 15 && `はい`}
                                    </div>
                                    <div 
                                      className="bg-sky-500 h-full flex items-center justify-center text-[9px] text-white font-bold transition-all duration-500" 
                                      style={{ width: `${noPct}%` }}
                                    >
                                      {noPct >= 15 && `いいえ`}
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full text-stone-400 h-full flex items-center justify-center text-[10px]">
                                    データなし
                                  </div>
                                )}
                              </div>

                              <p className="text-[10px] text-stone-400 text-right font-mono">
                                総投票数: {totalVotes} 票 • 投稿者: {item.authorName}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* COINS AWARD POPUP FOR SURVEY */}
      <AnimatePresence>
        {surveyAwardCoins !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full text-center border-4 border-amber-400 shadow-2xl relative overflow-hidden space-y-4"
            >
              <div className="absolute -top-12 -left-12 w-28 h-28 bg-yellow-400/20 rounded-full blur-xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />

              <div className="w-16 h-16 bg-gradient-to-tr from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mx-auto text-3xl shadow-md animate-bounce">
                🪙
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-amber-955">街頭アンケート調査完了！</h3>
                <p className="text-xs font-semibold text-stone-500 font-sans">回答にご協力いただきありがとうございます！</p>
              </div>

              <div className="bg-amber-100 rounded-2xl p-4 border border-amber-300 inline-block w-full">
                <p className="text-xs text-amber-800 font-bold font-sans">人類調査謝礼として</p>
                <p className="text-2xl font-black text-amber-955 mt-1 flex items-center justify-center space-x-1.5 font-mono">
                  <span>+3 GC</span>
                  <span className="text-stone-500 text-xs font-normal">獲得！</span>
                </p>
              </div>

              <button
                onClick={() => setSurveyAwardCoins(null)}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all font-sans"
              >
                了解！
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL BOOK POPUP READER */}
      <AnimatePresence>
        {selectedBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs"
          >
            <motion.div
              initial={{ y: 30, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 30, scale: 0.95 }}
              className="bg-stone-50 w-full max-w-2xl h-[85vh] rounded-3xl border border-amber-200/40 shadow-2xl flex flex-col justify-between overflow-hidden"
            >
              {/* Paper Top bar */}
              <div className="bg-stone-100 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <BookOpen className="text-amber-800" size={18} />
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-widest font-mono">
                    地味文庫 (Jimi Book)
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedBook(null)}
                  className="text-stone-400 hover:text-stone-700 w-8 h-8 rounded-full hover:bg-stone-200/60 flex items-center justify-center transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Story Content Paper Panel */}
              <div className="flex-1 overflow-y-auto px-6 md:px-12 py-10 space-y-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold font-sans text-stone-800 leading-tight mb-2 select-all">
                    {selectedBook.title}
                  </h2>
                  <div className="flex items-center space-x-2 text-sm text-stone-500">
                    <span className="font-semibold">{selectedBook.authorName} 著</span>
                    <span className="text-stone-300">•</span>
                    <span className="font-mono text-xs">
                      {selectedBook?.createdAt?.toDate ? selectedBook.createdAt.toDate().toLocaleDateString('ja-JP') : ''}
                    </span>
                  </div>
                </div>

                <div className="border-t border-stone-200/80 pt-6">
                  {/* Real, gorgeous multi-paragraph serif printing layout */}
                  <div className="text-stone-700 leading-8 text-base tracking-wide align-middle select-all whitespace-pre-wrap font-sans">
                    {selectedBook.content}
                  </div>
                </div>
              </div>

              {/* Reader bottom toolbar */}
              <div className="bg-stone-100 border-t border-stone-200 px-6 py-4 flex items-center justify-between">
                <span className="text-[11px] text-stone-400 font-mono">
                  読了目安: 約 {Math.ceil(selectedBook.content.length / 400)} 分
                </span>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleReactToBook(selectedBook, 'like')}
                    className={`flex items-center space-x-1.5 py-2 px-3 rounded-xl border text-xs font-semibold select-none transition-all ${
                      selectedBook.likedBy?.includes(user?.uid)
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <ThumbsUp size={13} className={selectedBook.likedBy?.includes(user?.uid) ? 'fill-rose-500 stroke-rose-500' : ''} />
                    <span>いいね({selectedBook.likesCount || 0})</span>
                  </button>

                  <button
                    onClick={() => handleReactToBook(selectedBook, 'empathy')}
                    className={`flex items-center space-x-1.5 py-2 px-3 rounded-xl border text-xs font-semibold select-none transition-all ${
                      selectedBook.empathizedBy?.includes(user?.uid)
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <Sparkles size={13} className={selectedBook.empathizedBy?.includes(user?.uid) ? 'fill-amber-500 stroke-amber-500' : ''} />
                    <span>共感({selectedBook.empathiesCount || 0})</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
