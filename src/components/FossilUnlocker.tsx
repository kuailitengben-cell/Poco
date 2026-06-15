import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Scene, Profile } from '../types';
import { calculateFossilInfo } from '../utils/fossilUtils';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, HelpCircle } from 'lucide-react';

interface FossilUnlockerProps {
  scene: Scene;
  currentUserProfile: Profile | null;
  onUnlocked: () => void;
}

export default function FossilUnlocker({ scene, currentUserProfile, onUnlocked }: FossilUnlockerProps) {
  const [phase, setPhase] = useState<'locked' | 'tapping' | 'cracking' | 'rolling' | 'revealed'>('locked');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Local overlay visual triggers
  const [cracksState, setCracksState] = useState<number>(0);
  const [soundText, setSoundText] = useState<string>('');

  const upvotes = scene.upvotes || 0;
  const commentCount = scene.commentCount || 0;
  const sashiireCount = scene.sashiireCount || 0;
  const kairanAmount = scene.kairanAmount || 0;
  const excavationsCount = scene.excavationsCount || 0;

  const fossilInfo = calculateFossilInfo(
    scene.createdAt,
    upvotes,
    commentCount,
    sashiireCount,
    kairanAmount,
    excavationsCount
  );

  const handleExcavate = async () => {
    if (!auth.currentUser) {
      setErrorMsg('発掘調査を行うにはログインが必要です。');
      return;
    }

    const currentCoins = currentUserProfile?.jCoins || 0;
    if (currentCoins < fossilInfo.cost) {
      setErrorMsg(`J-コインが足りません。発掘には ${fossilInfo.cost}J 必要ですが、現在の所有コインは ${currentCoins}J です。`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    // Play ASMR visual sequences step-by-step
    try {
      // Step 1: Tapping (コツ…)
      setPhase('tapping');
      setSoundText('コツ… コツ…');
      setCracksState(1);
      await new Promise(r => setTimeout(r, 250));

      // Step 2: Cracking (パキ…)
      setPhase('cracking');
      setSoundText('パキ… パキッ！');
      setCracksState(2);
      await new Promise(r => setTimeout(r, 250));

      // Step 3: Rolling / Sand Sand (サラ… サラサラ)
      setPhase('rolling');
      setSoundText('サラ… サラ、ﾊﾟﾗﾊﾟﾗ…');
      setCracksState(3);
      await new Promise(r => setTimeout(r, 305));

      // Write changes to Firestore
      const userRef = doc(db, 'profiles', auth.currentUser.uid);
      await updateDoc(userRef, {
        jCoins: increment(-fossilInfo.cost),
        excavatedScenes: arrayUnion(scene.id)
      });

      const sceneRef = doc(db, 'scenes', scene.id);
      await updateDoc(sceneRef, {
        excavationsCount: increment(1)
      });

      // Send silent anonymous notification to author
      if (scene.authorId && scene.authorId !== auth.currentUser.uid) {
        await addDoc(collection(db, 'admin_messages'), {
          recipientId: scene.authorId,
          senderId: auth.currentUser.uid,
          content: `🪨 誰か（匿名）があなたの地味話「${scene.title.slice(0, 15)}...」を遥か彼方の地層から【発掘】しました！(発掘費: ${fossilInfo.cost}J)`,
          createdAt: serverTimestamp(),
          read: false
        });
      }

      setPhase('revealed');
      setSoundText('');
      setLoading(false);
      
      // Trigger success reveal callback
      setTimeout(() => {
        onUnlocked();
      }, 500);

    } catch (e: any) {
      console.error('Excavation failed:', e);
      setErrorMsg('発掘作業中に地盤沈下（エラー）が発生しました。時間をおいてやり直してください。');
      setPhase('locked');
      setLoading(false);
    }
  };

  return (
    <div className="relative border-4 border-dashed border-stone-300 bg-gradient-to-br from-stone-200 to-stone-100 p-8 rounded-3xl shadow-inner min-h-[220px] flex flex-col items-center justify-center overflow-hidden flex-1 self-stretch">
      {/* Mystical dust particle canvas */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-200/50 via-stone-300/10 to-stone-500/20 pointer-events-none" />

      <AnimatePresence mode="wait">
        {phase === 'locked' && (
          <motion.div 
            key="lock-layout"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center max-w-sm z-10 space-y-4"
          >
            <div className="mx-auto w-16 h-16 rounded-full bg-stone-300/80 flex items-center justify-center border-4 border-stone-400 text-stone-600 shadow-sm relative animate-pulse">
              <span className="text-3xl font-black">🪨</span>
              <span className="absolute -bottom-1 -right-1 text-xs bg-stone-700 text-stone-100 px-1 rounded-full border border-stone-300 font-mono font-bold">
                {fossilInfo.percentage}%
              </span>
            </div>

            <div>
              <h4 className="text-stone-700 text-base font-black tracking-wider flex items-center justify-center gap-1.5">
                <span>この地味話は【{fossilInfo.label}】化しました</span>
              </h4>
              <p className="text-[11px] text-stone-500 leading-relaxed font-semibold mt-1">
                ささやかな日常の出来事は、誰にも反応されないまま数日が過ぎると、人類の記録＝「化石」として石化します。
              </p>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded-xl border border-red-200">
                {errorMsg}
              </p>
            )}

            <div className="flex flex-col items-center gap-2 pt-2">
              <button
                onClick={handleExcavate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-stone-700 to-stone-600 hover:from-stone-800 hover:to-shadow-stone-700 text-white font-bold py-2.5 px-6 rounded-2xl shadow-md border-b-4 border-stone-900 active:scale-95 transition-all cursor-pointer focus:outline-none"
              >
                <Coins className="w-4 h-4 text-amber-300" />
                <span>発掘調査する (費用: {fossilInfo.cost} J-Coin)</span>
              </button>
              <div className="text-[10px] text-stone-400 font-mono tracking-tighter flex items-center gap-1">
                <span>※ 支払われたコインは「発掘調査費」として消費されます</span>
                <HelpCircle className="w-3 h-3 text-stone-300 inline" title="投稿者には、誰かが思い出を発掘したことだけが匿名で通知されます。" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Cinematic Slow ASMR Demolition Sequence */}
        {(phase === 'tapping' || phase === 'cracking' || phase === 'rolling') && (
          <motion.div 
            key="sequence-layout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex flex-col items-center justify-center z-10 space-y-4"
          >
            {/* Visual cracks overlays */}
            <div className="relative w-28 h-28 flex items-center justify-center bg-stone-300 border-4 border-stone-400 rounded-2xl shadow-inner overflow-hidden">
              <motion.div 
                animate={{ rotate: [0, -1, 1, -1, 0], y: [0, -1, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.15 }}
                className="text-5xl"
              >
                🪨
              </motion.div>

              {/* Cracking effect lines overlays using styled absolute div containers */}
              {cracksState >= 1 && (
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent,transparent_45%,#78716c_48%,#e7e5e4_50%,#78716c_52%,transparent_55%)] opacity-85 pointer-events-none" />
              )}
              {cracksState >= 2 && (
                <div className="absolute inset-0 bg-[linear-gradient(-45deg,transparent,transparent_40%,#57534e_45%,#ffffff_48%,#57534e_52%,transparent_58%)] opacity-90 pointer-events-none" />
              )}
              {cracksState >= 3 && (
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.73)_10%,transparent_60%)] animate-ping pointer-events-none" />
              )}
            </div>

            <div className="text-center font-mono space-y-2">
              <motion.p 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-stone-750 font-black tracking-widest text-lg"
              >
                {soundText}
              </motion.p>
              <div className="flex gap-1 justify-center">
                <span className="w-1.5 h-1.5 bg-stone-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-stone-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-stone-500 rounded-full animate-bounce" />
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'revealed' && (
          <motion.div 
            key="revealed-layout"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center text-center space-y-3 z-10"
          >
            <div className="text-5xl animate-bounce">✨💎✨</div>
            <p className="text-emerald-700 font-black text-base tracking-wider">
              発掘に成功しました！
            </p>
            <p className="text-xs text-stone-500 font-semibold max-w-xs">
              地層から何気ない生活の記録が取り出されました。
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
