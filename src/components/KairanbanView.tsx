import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  serverTimestamp, 
  increment, 
  arrayUnion,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Pin, 
  Heart, 
  Coffee, 
  MessageSquare, 
  X, 
  Send, 
  Trash2, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUp, 
  ArrowDown, 
  Smile, 
  CornerDownRight, 
  Check, 
  Coins 
} from 'lucide-react';
import { Scene, Comment, Profile } from '../types';
import { db } from '../lib/firebase';
import { calculateFossilInfo } from '../utils/fossilUtils';
import { FossilizedContent, FossilOverlay } from './FossilizedContent';
import FossilChipStation from './FossilChipStation';


interface KairanbanViewProps {
  user: any;
  profile: Profile | null;
  allScenes: Scene[];
  onBack: () => void;
  onProfileClick: (uid: string) => void;
  onOpenSashiire?: (targetData: { uid: string, displayName: string, isSelf: boolean, supportLink: string }) => void;
}

export default function KairanbanView({
  user,
  profile,
  allScenes,
  onBack,
  onProfileClick,
  onOpenSashiire
}: KairanbanViewProps) {
  // Sort scenes dynamically to rescue buried/quiet posts first ("埋もれた投稿の救済")
  const sortedScenes = useMemo(() => {
    return [...allScenes].sort((a, b) => {
      const aUpvotes = a.upvotes || 0;
      const aViews = a.views || 0;
      const aCreatedAt = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : Date.now();
      const aAgeHours = Math.max(0.1, (Date.now() - aCreatedAt) / (1000 * 60 * 60));

      const bUpvotes = b.upvotes || 0;
      const bViews = b.views || 0;
      const bCreatedAt = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : Date.now();
      const bAgeHours = Math.max(0.1, (Date.now() - bCreatedAt) / (1000 * 60 * 60));

      // Scoring formulas:
      // - Freshness boost so brand-new posts enter the loop nicely.
      // - Strict penalty for popular (high upvote/high view) posts to avoid viral bubbles.
      // - Massive bonus for extremely quiet/under-seen gems (upvotes < 5 gets a major boost).
      const aFreshnessBoost = 200 / Math.pow(aAgeHours, 0.4);
      const aRescueBonus = aUpvotes < 5 ? 150 : 0;
      const aUpvotePenalty = aUpvotes * 4.0;
      const aViewPenalty = aViews * 1.5;

      const bFreshnessBoost = 200 / Math.pow(bAgeHours, 0.4);
      const bRescueBonus = bUpvotes < 5 ? 150 : 0;
      const bUpvotePenalty = bUpvotes * 4.0;
      const bViewPenalty = bViews * 1.5;

      const aScore = aFreshnessBoost + aRescueBonus - (aUpvotePenalty + aViewPenalty);
      const bScore = bFreshnessBoost + bRescueBonus - (bUpvotePenalty + bViewPenalty);

      return bScore - aScore; // highest rescue priority on top
    });
  }, [allScenes]);

  const [kairanFilterMode, setKairanFilterMode] = useState<'all' | 'fossils'>('all');

  const filteredScenes = useMemo(() => {
    if (kairanFilterMode === 'all') {
      return sortedScenes;
    }
    return sortedScenes.filter(scene => {
      // Filter out only fossilized ones (percentage >= 15)
      const excavationsVal = scene.excavationsCount || 0;
      const upvotesVal = scene.upvotes || 0;
      const commentCountVal = scene.commentCount || 0;
      const sashiireValue = scene.sashiireCount || 0;
      const kairanValue = scene.kairanAmount || 0;
      
      const info = calculateFossilInfo(
        scene.createdAt,
        upvotesVal,
        commentCountVal,
        sashiireValue,
        kairanValue,
        excavationsVal
      );
      return info.tier !== 'fresh';
    });
  }, [sortedScenes, kairanFilterMode]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentScene = filteredScenes[currentIndex] || null;

  useEffect(() => {
    setCurrentIndex(0);
  }, [kairanFilterMode]);


  // Local state to track views reactively and immediately in the UI upon page turn
  const [localViewsMap, setLocalViewsMap] = useState<Record<string, number>>({});

  // Animation States representing clipboard interaction
  const [pinState, setPinState] = useState<'pinned' | 'unpinned'>('pinned');
  const [paperTranslate, setPaperTranslate] = useState({ x: 0, y: 0, scale: 1 });
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Modals / Interventions
  const [showKairanModal, setShowKairanModal] = useState(false);
  const [kairanCoins, setKairanCoins] = useState<string>('50');
  const [customCoins, setCustomCoins] = useState<string>('');
  const [isCirculating, setIsCirculating] = useState(false);

  // Comments / Sidebars
  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Report Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  // Administrative
  const isAdmin = useMemo(() => {
    if (!user) return false;
    const adminEmails = ['kuailitengben@gmail.com', 'nakashi198006130423@gmail.com'];
    return adminEmails.includes(user.email || '');
  }, [user]);

  // Load comments in real-time when comments panel opens or scene changes
  useEffect(() => {
    if (!currentScene || !showComments) return;

    const q = query(
      collection(db, 'scenes', currentScene.id, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Comment[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Comment);
      });
      setCommentsList(list);
    }, (err) => {
      console.error('Failed to stream comments:', err);
    });

    return () => unsubscribe();
  }, [currentScene?.id, showComments]);

  // Increment view count dynamically on scene transition
  useEffect(() => {
    if (!currentScene) return;

    // Fast responsive feedback: immediately increment in local UI state
    setLocalViewsMap(prev => {
      const currentVal = prev[currentScene.id] ?? (currentScene.views || 0);
      return {
        ...prev,
        [currentScene.id]: currentVal + 1
      };
    });

    const incrementView = async () => {
      try {
        const sceneRef = doc(db, 'scenes', currentScene.id);
        await updateDoc(sceneRef, {
          views: increment(1)
        });
      } catch (e) {
        console.error('Failed to increment scene view:', e);
      }
    };
    incrementView();
  }, [currentScene?.id]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showComments || showKairanModal || showReportModal) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        triggerPageTurn('prev');
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        triggerPageTurn('next');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, filteredScenes.length, showComments, showKairanModal, showReportModal]);

  // Safe Page Turn trigger with the drawing pin popout ("画鋲外し") and slide animations
  const triggerPageTurn = (direction: 'next' | 'prev') => {
    if (isTransitioning || filteredScenes.length <= 1) return;
    
    let targetIndex = currentIndex;
    if (direction === 'next') {
      targetIndex = (currentIndex + 1) % filteredScenes.length;
    } else {
      targetIndex = (currentIndex - 1 + filteredScenes.length) % filteredScenes.length;
    }

    setIsTransitioning(true);
    setPinState('unpinned'); // Drawing pin opens (画鋲が外れる)

    // Stage 1: Paper lifts up a tiny bit
    setTimeout(() => {
      setPaperTranslate(prev => ({ ...prev, scale: 1.025, y: -4 }));
    }, 120);

    // Stage 2: Slide off screen and load next
    setTimeout(() => {
      // Audio or tactile feedback effect simulated by visual speed
      setPaperTranslate({ x: direction === 'next' ? -500 : 500, y: 15, scale: 0.95 });
    }, 240);

    // Stage 3: Paste new paper down
    setTimeout(() => {
      setCurrentIndex(targetIndex);
      // Bring new paper from opposite side
      setPaperTranslate({ x: direction === 'next' ? 400 : -400, y: -10, scale: 0.95 });
    }, 380);

    // Stage 4: Align paper back to pin and pin down ("ペタッ")
    setTimeout(() => {
      setPaperTranslate({ x: 0, y: 0, scale: 1 });
      setPinState('pinned');
    }, 450);

    // Finish cycle
    setTimeout(() => {
      setIsTransitioning(false);
    }, 550);
  };

  // Drag Swiping detection
  const handleDragEnd = (event: any, info: any) => {
    if (isTransitioning) return;
    const threshold = 100;
    if (info.offset.y < -threshold) {
      // Swiped Up -> NEXT
      triggerPageTurn('next');
    } else if (info.offset.y > threshold) {
      // Swiped Down -> PREV
      triggerPageTurn('prev');
    }
  };

  // Upvote / Sympathy trigger
  const handleLike = async () => {
    if (!currentScene) return;
    if (isLocked) {
      alert('この地味話は現在、石化して化石になっています。「発掘調査」を行って石化を解いた後で、共感（いいね）を伝えることができます！');
      return;
    }
    try {
      const sceneRef = doc(db, 'scenes', currentScene.id);
      await updateDoc(sceneRef, {
        upvotes: increment(1)
      });

      if (user && currentScene.authorId && currentScene.authorId !== user.uid) {
        const senderName = profile?.displayName || user.displayName || '誰か';
        await addDoc(collection(db, 'admin_messages'), {
          recipientId: currentScene.authorId,
          senderId: user.uid,
          content: `👍 ${senderName}さんがあなたの地味話「${currentScene.title}」に「地味に共感！」しました。`,
          createdAt: serverTimestamp(),
          read: false,
          sceneId: currentScene.id,
          type: 'upvote'
        });
      }
    } catch (err) {
      console.error('Failed to register upvote:', err);
    }
  };

  // Sashiire (Tip / Snack / Coffee gesture)
  const handleSashiire = async () => {
    if (!currentScene) return;
    if (isLocked) {
      alert('この地味話は現在、石化して化石になっています。「発掘調査」を行って石化を解いた後で、差し入れを送ることができます！');
      return;
    }
    
    // Trigger parent J-Coin snack tipping modal directly
    if (onOpenSashiire) {
      onOpenSashiire({
        uid: currentScene.authorId,
        displayName: currentScene.authorName || '投稿主',
        isSelf: user ? currentScene.authorId === user.uid : false,
        supportLink: ''
      });
    } else {
      alert('差し入れ機能は現在利用できません。');
    }
  };

  // Modal Coins circulate execution (回覧板に回す)
  const handleCirculate = async () => {
    if (!currentScene || !user) {
      alert('回覧板を回すにはログインが必要です！');
      return;
    }

    if (!profile) {
      alert('プロフィール情報がありません。');
      return;
    }

    const currentKairanUsers = (currentScene as any).kairanUsers || [];
    if (currentKairanUsers.includes(user.uid)) {
      alert('この投稿はすでに回覧板に回しています。1投稿あたり1回のみ再投入不可となります。');
      return;
    }

    const coinsToSpend = kairanCoins === 'custom' ? parseInt(customCoins, 10) : parseInt(kairanCoins, 10);
    if (isNaN(coinsToSpend) || coinsToSpend <= 0) {
      alert('1以上の有効なコイン数を入力してください。');
      return;
    }

    const userWalletCoins = profile.jCoins || 0;
    if (userWalletCoins < coinsToSpend) {
      alert(`コインが不足しています！現在の保有コイン: ${userWalletCoins} J-コイン`);
      return;
    }

    setIsCirculating(true);

    try {
      const halfReward = Math.floor(coinsToSpend * 0.5);

      // 1. Deduct from sender wallet
      const senderRef = doc(db, 'profiles', user.uid);
      await updateDoc(senderRef, {
        jCoins: increment(-coinsToSpend)
      });

      // 2. Update scene metrics
      const sceneRef = doc(db, 'scenes', currentScene.id);
      await updateDoc(sceneRef, {
        kairanAmount: increment(coinsToSpend),
        kairanCount: increment(1),
        kairanUsers: arrayUnion(user.uid)
      });

      // 3. Send anonymous server notification to recipient containing the claimable reward
      await addDoc(collection(db, 'admin_messages'), {
        recipientId: currentScene.authorId,
        senderId: 'system_kairanban',
        senderName: '回覧板システム',
        content: `誰かがあなたの投稿「${currentScene.title}」を回覧板に回しました 📌 +${halfReward} コイン(J-コイン)を獲得！`,
        type: 'kairanban_reward',
        rewardCoins: halfReward,
        createdAt: serverTimestamp(),
        read: false
      });

      alert(`📌 回覧コインを ${coinsToSpend} 送りました！半額の ${halfReward}J-コイン が投稿主へ匿名で支給され、残りは経済健全化のために消滅しました。`);
      
      setShowKairanModal(false);
      setCustomCoins('');
    } catch (err: any) {
      console.error('Kairan submission error:', err);
      alert('回覧処理に失敗しました。');
    } finally {
      setIsCirculating(false);
    }
  };

  // Add Comment execution
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentScene || !user || !newCommentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const commentsCol = collection(db, 'scenes', currentScene.id, 'comments');
      await addDoc(commentsCol, {
        sceneId: currentScene.id,
        authorId: user.uid,
        authorName: profile?.displayName || user.displayName || '名無しさん',
        authorPhoto: profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
        content: newCommentText.trim(),
        createdAt: serverTimestamp()
      });

      // Update scene comments counter
      const sceneRef = doc(db, 'scenes', currentScene.id);
      await updateDoc(sceneRef, {
        commentCount: increment(1)
      });

      // Send notification to author
      if (currentScene.authorId && currentScene.authorId !== user.uid) {
        await addDoc(collection(db, 'admin_messages'), {
          recipientId: currentScene.authorId,
          senderId: user.uid,
          content: `💬 ${profile?.displayName || user.displayName || '誰か'}さんから新しいコメント: 「${newCommentText.trim().slice(0, 30)}${newCommentText.trim().length > 30 ? '...' : ''}」`,
          createdAt: serverTimestamp(),
          read: false,
          sceneId: currentScene.id,
          type: 'comment'
        });
      }

      setNewCommentText('');
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Delete scene (Admins only)
  const handleDeletePost = async () => {
    if (!currentScene || !isAdmin) return;
    if (!window.confirm('管理者権限：この地味投稿を本当に削除しますか？')) return;

    try {
      await deleteDoc(doc(db, 'scenes', currentScene.id));
      alert('投稿を削除しました。');
      // Slide to next post
      triggerPageTurn('next');
    } catch (err) {
      console.error('Admin delete failed:', err);
      alert('削除に失敗しました。');
    }
  };

  // Submit Report
  const handleReportPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentScene || !user || !reportReason.trim()) return;

    setIsReporting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: user.uid,
        targetId: currentScene.id,
        targetType: 'scene',
        reason: reportReason.trim(),
        createdAt: serverTimestamp()
      });
      alert('通報を受理しました。ご協力ありがとうございます。');
      setShowReportModal(false);
      setReportReason('');
    } catch (err) {
      console.error('Report submission failed:', err);
      alert('通報に失敗しました。');
    } finally {
      setIsReporting(false);
    }
  };

  // Calculate paper background and styling of the post
  const paperAgeHours = useMemo(() => {
    if (!currentScene) return 0;
    const itemDate = currentScene.createdAt?.toDate ? currentScene.createdAt.toDate().getTime() : Date.now();
    return (Date.now() - itemDate) / (1000 * 60 * 60);
  }, [currentScene]);

  // Visual decorators on paper
  const isYellowed = paperAgeHours > 48; // Older than 2 days -> Aged/Yellowed paper layout!
  const hasCirculationPin = (currentScene as any)?.kairanAmount > 100;
  const hasTeaPin = (currentScene as any)?.sashiireCount > 2;

  const myOffset = useMemo(() => {
    if (!currentScene || !profile) return 0;
    return profile.excavatedScenery?.[currentScene.id] || 0;
  }, [currentScene, profile]);

  const fossilInfo = useMemo(() => {
    if (!currentScene) return null;
    return calculateFossilInfo(
      currentScene.createdAt,
      currentScene.upvotes || 0,
      currentScene.commentCount || 0,
      currentScene.sashiireCount || 0,
      currentScene.kairanAmount || 0,
      currentScene.excavationsCount || 0,
      myOffset
    );
  }, [currentScene, myOffset]);

  const isLocked = false;


  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#241712] flex flex-col font-sans transition-colors duration-300">
      
      {/* Immersive cork board background layer */}
      <div className="absolute inset-0 z-0 bg-[#3d271d] opacity-90" style={{
        backgroundImage: `radial-gradient(circle at 10px 10px, #2a1a13 2px, transparent 0), radial-gradient(circle at 35px 35px, #1a100b 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }}></div>

      {/* Top Header Rail - Sticky/Fixed at the top with a background so it's always readable & accessible */}
      <div className="sticky top-0 z-30 w-full max-w-lg mx-auto flex items-center justify-between px-6 py-4 border-b border-orange-950/30 bg-[#241712] shadow-md shrink-0">
        <button 
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-black tracking-widest text-orange-200 bg-orange-950/40 hover:bg-orange-950/60 transition px-3.5 py-2 rounded-2xl cursor-pointer border border-orange-900/40 shadow-inner"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>掲示板を出る</span>
        </button>

        <div className="text-center font-sans">
          <h1 className="text-sm font-bold text-orange-50 tracking-wider">地味っち回覧板</h1>
          <p className="text-[10px] text-orange-300/70 font-mono">SCENE INDEX: {filteredScenes.length === 0 ? 0 : currentIndex + 1}/{filteredScenes.length}</p>
        </div>

        {/* Current wallet balance for convenience */}
        <div className="flex items-center gap-1.5 bg-orange-950/40 px-3 py-1.5 rounded-2xl border border-orange-900/40 text-xs text-orange-200">
          <Coins className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
          <span className="font-mono font-bold">{profile?.jCoins ?? 0}</span>
          <span className="text-[9px] text-orange-400 font-bold">J</span>
        </div>
      </div>

      {/* Main Scrollable Stage - Positioned cleanly below the header to allow scrolling and prevent any overlaps */}
      <div className="flex-1 w-full max-w-lg mx-auto relative flex flex-col justify-start items-center p-4 pt-6 pb-24 overflow-y-auto no-scrollbar min-h-0">
        {filteredScenes.length === 0 ? (
          <div className="text-center p-8 bg-[#2d1b13]/80 rounded-3xl border border-orange-900/40 backdrop-blur text-orange-200 z-10">
            <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
            <p className="text-sm font-bold">現在、回覧できる地味話がありませんでした。</p>
            <p className="text-xs text-orange-400 mt-2">新着の投稿をお持ちいただくか、フィードをお試しください。</p>
          </div>
        ) : (
          <div className="w-full h-full relative flex flex-col justify-center items-center">
            
            {/* The Floating Relatable Sheet of Paper */}
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              onDragEnd={handleDragEnd}
              animate={{ 
                x: paperTranslate.x, 
                y: paperTranslate.y, 
                scale: paperTranslate.scale,
                rotate: isTransitioning ? [0, 2, -2, 0] : 0
              }}
              transition={{
                x: { type: 'spring', stiffness: 220, damping: 24 },
                y: { type: 'spring', stiffness: 220, damping: 24 },
                scale: { type: 'spring', stiffness: 220, damping: 24 },
                rotate: { type: 'tween', duration: 0.3 }
              }}
              className={`relative z-20 w-full max-w-[465px] h-auto rounded-[32px] shadow-2xl flex flex-col p-5 sm:p-6 select-text cursor-grab active:cursor-grabbing border ${
                isYellowed 
                  ? 'bg-gradient-to-b from-[#f5ebd2] to-[#eedec0] text-amber-950 border-[#dfcaa1]' 
                  : 'bg-gradient-to-b from-[#faf9f6] to-[#f4f1ea] text-stone-900 border-stone-200/50'
              }`}
              style={{
                boxShadow: isYellowed 
                  ? '0 25px 50px -12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.45)' 
                  : '0 25px 50px -12px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.8)'
              }}
            >
              
              {/* Paper Visual State Stamps */}
              <div className="absolute top-3 right-3 flex gap-1.5 pointer-events-none">
                {isYellowed && (
                  <div className="bg-yellow-700/5 text-yellow-800/40 text-[8px] font-mono border border-yellow-700/10 px-1.5 py-0.5 rounded italic">
                    Nostalgic
                  </div>
                )}
              </div>
 
              {/* Author & Creator Metadata Card */}
              <div className="flex items-center gap-2 mb-3 border-b border-dashed border-stone-900/10 pb-2.5">
                <img 
                  src={currentScene.authorPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentScene.authorId}`}
                  alt={currentScene.authorName}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${currentScene.authorId}`;
                  }}
                  onClick={() => onProfileClick(currentScene.authorId)}
                  className="w-10 h-10 rounded-full border border-stone-200 shadow-xs cursor-pointer object-cover hover:scale-105 active:scale-95 transition"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span 
                      onClick={() => onProfileClick(currentScene.authorId)}
                      className="text-xs font-black tracking-tight hover:underline cursor-pointer truncate"
                    >
                      {currentScene.authorName}
                    </span>
                    {currentScene.isAnonymousPost && (
                      <span className="text-[9px] bg-sky-50 text-sky-600 px-1 border border-sky-100 rounded">匿名投稿</span>
                    )}
                  </div>
                  <p className="text-[9px] text-stone-500 font-mono flex items-center gap-2">
                    <span>{currentScene.createdAt?.toDate ? currentScene.createdAt.toDate().toLocaleDateString('ja-JP') : '昨日'}</span>
                  </p>
                </div>
              </div>

               {/* Huge Post Content Body - Simple focus-centric layout */}
              <div className="flex-1 flex flex-col py-1 shrink-0">
                <div className="relative p-5 bg-stone-100/40 border border-stone-250/30 rounded-[2rem] overflow-hidden mb-3">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-2.5 text-stone-900 font-sans leading-snug">
                    {currentScene.title}
                  </h2>
                  
                  <p className="text-sm sm:text-base font-bold leading-relaxed text-[#2d1b13] whitespace-pre-line font-serif mb-2.5">
                    {currentScene.content}
                  </p>

                  {currentScene.imageUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-stone-200 shadow-xs max-h-[120px] flex items-center justify-center">
                      <img src={currentScene.imageUrl} alt="attachment" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
              </div>

              {/* Quiet Sympathy Embedded Action button inside the card */}
              <div className="mt-4 shrink-0 pointer-events-auto flex flex-col gap-3">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike();
                  }}
                  className="w-full py-4 px-5 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-[96%] text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-rose-500/10 hover:shadow-rose-400/25 transition-all duration-150 cursor-pointer select-none border-none animate-in fade-in zoom-in-95"
                >
                  <Heart className="w-5 h-5 fill-current animate-pulse-subtle" />
                  <span>地味に共感！</span>
                </button>

                <div className="flex justify-between items-center px-1 text-[10px] text-stone-400 font-bold">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReportModal(true);
                    }}
                    className="hover:text-red-500 transition cursor-pointer"
                  >
                    通報する
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePost();
                      }}
                      className="text-red-600 hover:text-red-500 flex items-center gap-0.5 transition cursor-pointer font-extrabold"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>削除(管理者)</span>
                    </button>
                  )}
                </div>
              </div>

            </motion.div>

            {/* Quick Navigation Control Bar below the card */}
            <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-[465px] shrink-0 pointer-events-auto">
              <div className="flex items-center justify-between w-full px-2">
                <button 
                  onClick={() => triggerPageTurn('prev')}
                  className="flex items-center gap-1 text-xs font-black px-4 py-2.5 rounded-full bg-[#341d13] text-[#f5ebd2] border border-[#dfcaa1]/30 hover:bg-[#43271b] transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>前の地味話</span>
                </button>

                {/* Pagination indicator dots */}
                <div className="flex gap-1.5 items-center">
                  {filteredScenes.slice(Math.max(0, currentIndex - 3), Math.min(filteredScenes.length, currentIndex + 4)).map((it, idx) => {
                    const absoluteIndex = filteredScenes.indexOf(it);
                    const isActive = absoluteIndex === currentIndex;
                    return (
                      <button 
                        key={it.id} 
                        onClick={() => setCurrentIndex(absoluteIndex)}
                        className={`h-2 rounded-full transition-all duration-300 ${isActive ? 'w-4 bg-[#f5ebd2]' : 'w-2 bg-stone-500/50'}`}
                      />
                    );
                  })}
                </div>

                <button 
                  onClick={() => triggerPageTurn('next')}
                  className="flex items-center gap-1 text-xs font-black px-4 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white transition cursor-pointer shadow-md"
                >
                  <span>次の地味話</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* COIN CIRCULATION MODAL (📌 回覧板に回す) */}
      <AnimatePresence>
        {showKairanModal && currentScene && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowKairanModal(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#2d1b13] border border-orange-950/50 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl z-10 text-orange-200"
            >
              <button 
                onClick={() => setShowKairanModal(false)}
                className="absolute top-4 right-4 text-orange-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-md font-black tracking-wider text-orange-50 mb-1 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500 animate-pulse" />
                <span>回覧板を回して広める</span>
              </h2>
              <p className="text-[10px] text-orange-400/80 mb-4 leading-normal">
                「俺を見ろ」ではなく「この現象をもっと見てほしい」という温かい気持ちをコイン（J-コイン）に乗せて静かに広めます。
              </p>

              <div className="bg-[#1f120c] p-4.5 rounded-2.5xl border border-orange-950/40 mb-4 text-center">
                <p className="text-xs text-orange-400 mb-1">対象の地味話</p>
                <p className="text-sm font-extrabold text-orange-50 truncate mb-1">「{currentScene.title}」</p>
                <p className="text-[10.5px] text-orange-400/60 truncate">投稿主: {currentScene.authorName} さん</p>
              </div>

              {((currentScene as any).kairanUsers || []).includes(user?.uid) ? (
                <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold leading-normal">
                  ⚠️ あなたはすでにこの投稿を回覧完了しています。
                  <br />
                  1人のユーザーにつき1投稿1回のみの制限となります。
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-orange-300 block mb-2">投入するコイン数を選択してください</label>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {['20', '50', '100', '300'].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setKairanCoins(amt);
                            setCustomCoins('');
                          }}
                          className={`py-3 rounded-xl font-mono font-black text-xs transition border flex flex-col items-center justify-center gap-0.5 ${
                            kairanCoins === amt 
                              ? 'bg-amber-600 border-amber-500 text-orange-50 shadow-inner' 
                              : 'bg-[#1f120c] border-orange-950/40 hover:bg-[#281810]'
                          }`}
                        >
                          <span>{amt}</span>
                          <span className="text-[8px] text-orange-400/70 font-bold">J-Coin</span>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setKairanCoins('custom')}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition border mb-3 flex items-center justify-center gap-1 ${
                        kairanCoins === 'custom' 
                          ? 'bg-amber-600 border-amber-500 text-orange-50 shadow-inner' 
                          : 'bg-[#1f120c] border-orange-950/40 hover:bg-[#281810]'
                      }`}
                    >
                      <Smile className="w-3.5 h-3.5" />
                      <span>金額を自由に設定する (Custom)</span>
                    </button>

                    {kairanCoins === 'custom' && (
                      <div className="flex bg-[#1f120c] border border-orange-950/70 rounded-xl px-3.5 py-2 items-center">
                        <input
                          type="number"
                          placeholder="自由入力数値を記載..."
                          value={customCoins}
                          onChange={(e) => setCustomCoins(e.target.value)}
                          className="bg-transparent text-sm text-orange-50 font-mono font-bold flex-1 focus:outline-hidden"
                          min="1"
                        />
                        <span className="text-xs text-orange-400 font-bold">J-コイン</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-orange-950/30 p-3.5 rounded-xl border border-orange-900/20 text-[10px] text-orange-300/80 leading-relaxed block">
                    <p className="font-bold text-orange-200 mb-1">🏦 コイン流通の仕組み（インフレ・回収抑制）</p>
                    <ul className="list-disc pl-3.5 space-y-1">
                      <li>投入額の <span className="font-bold text-amber-400">50%</span> は投稿主の獲得として匿名で配布されます。</li>
                      <li>残りの <span className="font-bold text-amber-400">50%</span> は経済インフレを抑制するためシステムに消滅回収されます。</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleCirculate}
                    disabled={isCirculating}
                    className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-orange-50 font-black text-sm py-3.5 rounded-2xl shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isCirculating ? (
                      <span className="animate-spin text-xs">...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>回覧板を回す（送信）</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COMMENTS DRAWER / SIDEBAR HAS BEEN RETIRED FOR COHERENCE */}

      {/* REPORT SUBMISSION MODAL (通報) */}
      <AnimatePresence>
        {showReportModal && currentScene && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportModal(false)}
              className="absolute inset-0 bg-black/80"
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#2d1b13] border border-orange-950/50 rounded-3xl p-6 shadow-2xl z-10 text-orange-200"
            >
              <button 
                onClick={() => setShowReportModal(false)}
                className="absolute top-4 right-4 text-orange-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-md font-extrabold text-orange-100 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span>この投稿を通報する</span>
              </h2>
              <p className="text-[10px] text-orange-400/80 mb-4">
                規約違反や不適切なコンテンツを含むとお考えの場合は、理由を選択、または記入してください。
              </p>

              <form onSubmit={handleReportPost} className="space-y-4">
                <textarea
                  required
                  placeholder="通報理由を具体的に入力してください（例：誹謗中傷、迷惑行為、商用、スパムなど）..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full h-24 bg-[#1f120c] border border-orange-950/40 rounded-2xl p-3 text-xs font-bold text-orange-50 focus:outline-hidden"
                />

                <button
                  type="submit"
                  disabled={isReporting || !reportReason.trim()}
                  className="w-full bg-red-600 hover:bg-red-500 text-orange-50 font-black text-xs py-3.5 rounded-2xl transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isReporting ? '送信中...' : '通報を送信する'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
