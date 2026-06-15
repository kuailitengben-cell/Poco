import React, { useState } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Scene, Profile } from '../types';
import { calculateFossilInfo } from '../utils/fossilUtils';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, Flame, Hammer, RefreshCw } from 'lucide-react';

interface FossilChipStationProps {
  scene: Scene;
  currentUserProfile: Profile | null;
  onChipped: () => void;
}

export default function FossilChipStation({ scene, currentUserProfile, onChipped }: FossilChipStationProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'striking' | 'cracked'>('idle');
  const [soundEffect, setSoundEffect] = useState<string>('');

  const myOffset = currentUserProfile?.excavatedScenery?.[scene.id] || 0;
  const originalFossilInfo = calculateFossilInfo(
    scene.createdAt,
    scene.upvotes || 0,
    scene.commentCount || 0,
    scene.sashiireCount || 0,
    scene.kairanAmount || 0,
    scene.excavationsCount || 0,
    0 // base percentage
  );

  const currentFossilInfo = calculateFossilInfo(
    scene.createdAt,
    scene.upvotes || 0,
    scene.commentCount || 0,
    scene.sashiireCount || 0,
    scene.kairanAmount || 0,
    scene.excavationsCount || 0,
    myOffset
  );

  const basePercentage = originalFossilInfo.percentage;
  const currentPercentage = currentFossilInfo.percentage;

  // Fully excavated / restored check
  const isFullyRestored = currentPercentage === 0 || originalFossilInfo.tier === 'heritage';

  if (basePercentage < 15 && originalFossilInfo.tier !== 'heritage') {
    // Fresh posts don't need excavation
    return null;
  }

  const handleChipAway = async () => {
    if (!auth.currentUser) {
      setErrorMsg('発掘調査を行うにはログインが必要です。');
      return;
    }

    const currentCoins = currentUserProfile?.jCoins || 0;
    const cost = currentFossilInfo.cost;

    if (currentCoins < cost) {
      setErrorMsg(`J-コインが足りません。発掘には ${cost}J 必要ですが、現在の所有コインは ${currentCoins}J です。`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setPhase('striking');

    // Tactile slow-motion smash animations
    try {
      setSoundEffect('カーン！');
      await new Promise(r => setTimeout(r, 200));
      
      setSoundEffect('ピシッ…！');
      await new Promise(r => setTimeout(r, 200));

      setSoundEffect('パラパラ…');
      await new Promise(r => setTimeout(r, 200));

      const userRef = doc(db, 'profiles', auth.currentUser.uid);
      
      // Update coins and increment personal chip depth map
      await updateDoc(userRef, {
        jCoins: increment(-cost),
        [`excavatedScenery.${scene.id}`]: increment(1)
      });

      // Increment global excavations list/counts for leaderboard or heritage
      const sceneRef = doc(db, 'scenes', scene.id);
      await updateDoc(sceneRef, {
        excavationsCount: increment(1)
      });

      setPhase('cracked');
      setSoundEffect('発掘完了！');
      await new Promise(r => setTimeout(r, 300));
      
      setPhase('idle');
      setSoundEffect('');
      onChipped(); // trigger reactive reload
    } catch (e: any) {
      console.error(e);
      setErrorMsg('発掘作業中に地盤沈下（エラー）が発生しました。');
      setPhase('idle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full mt-4 bg-stone-100/90 border-2 border-stone-250 p-4 rounded-2xl flex flex-col items-center justify-center space-y-3 shadow-inner relative overflow-hidden">
      {/* Ancient stone-like background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-stone-50/20 via-stone-200/5 to-stone-500/10 pointer-events-none" />

      <div className="flex items-center justify-between w-full z-10">
        <div className="flex items-center gap-1.5 text-stone-700">
          <Hammer className={`w-4 h-4 text-stone-500 ${phase === 'striking' ? 'animate-bounce' : ''}`} />
          <span className="text-xs font-black tracking-wider">地脈発掘ステーション</span>
        </div>
        <span className="text-[10px] font-mono font-bold text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full">
          石化度: {currentPercentage}% {isFullyRestored ? '🏛 100% 復元済' : ''}
        </span>
      </div>

      <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden border border-stone-300 relative z-10 flex">
        {/* Progress tracks */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${100 - currentPercentage}%` }}
          className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
        />
      </div>

      {isFullyRestored ? (
        <div className="text-center py-1 z-10 flex items-center gap-1.5 justify-center">
          <span className="text-emerald-600 text-xs font-black">👏 完全に現象が復元されました！</span>
          <span className="text-xs">✨</span>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center gap-1.5 z-10">
          <p className="text-[10px] text-stone-500 font-semibold leading-tight text-center">
            {myOffset === 0 
              ? 'ささやきは石化しています。コインを使ってハンマーで少しずつ砕くことで、元の文章を復元できます。'
              : `発掘調査進行中 (${myOffset}段階 / 4段階)。あと少しで全貌が見えます！`}
          </p>

          {errorMsg && (
            <p className="text-[10px] text-red-600 font-bold bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
              {errorMsg}
            </p>
          )}

          <div className="relative w-full">
            <button
              onClick={handleChipAway}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-stone-700 hover:bg-stone-800 text-stone-100 py-2 border-b-2 border-stone-900 rounded-xl text-xs font-black shadow transition-all active:translate-y-0.5 cursor-pointer focus:outline-none"
            >
              {phase === 'striking' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-stone-200" />
              ) : (
                <Coins className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>コッ…と砕く (費用: {currentFossilInfo.cost} J-Coin)</span>
            </button>

            <AnimatePresence>
              {soundEffect && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: -5 }}
                  animate={{ opacity: 1, scale: 1.2, y: -25 }}
                  exit={{ opacity: 0, scale: 0.8, y: -35 }}
                  className="absolute inset-x-0 mx-auto w-max bg-stone-850 text-[#faf9f6] text-[10px] font-bold px-2 py-0.5 rounded shadow z-50 pointer-events-none"
                >
                  {soundEffect}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
