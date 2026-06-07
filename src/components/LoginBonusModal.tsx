import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Gift, Star, CheckCircle2, Coins, ArrowRight, Zap, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { awardGachaItem } from '../lib/gachaStore';
import { cn } from '../lib/utils';

// Helper to get today's local date string
function getTodayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

interface LoginBonusModalProps {
  userId: string;
  activeBoard: {
    id: string;
    name: string;
    gridType: '3x3' | '5x5';
    daysCount: number;
    rewards: {
      day: number;
      rewardType: 'coins' | 'shards' | 'special_title' | 'special_badge';
      rewardValue: string;
      rewardName: string;
    }[];
  };
  claimData: {
    lastClaimDate?: string;
    claimedDays?: number[];
  } | null;
  onClose: () => void;
  onClaimSuccess: () => void;
}

export default function LoginBonusModal({
  userId,
  activeBoard,
  claimData,
  onClose,
  onClaimSuccess
}: LoginBonusModalProps) {
  const [isStamping, setIsStamping] = useState(false);
  const [stampLanded, setStampLanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);
  const [successRewardMsg, setSuccessRewardMsg] = useState<string | null>(null);

  const claimedDaysList = claimData?.claimedDays || [];
  const currentDayToStamp = claimedDaysList.length + 1;
  const isAlreadyClaimedToday = claimData?.lastClaimDate === getTodayString();
  const isCompletedBoard = claimedDaysList.length >= activeBoard.daysCount;

  const totalCells = activeBoard.daysCount || 7;

  // Determine which column layouts to render cleanly
  const getGridColsClass = (count: number) => {
    if (count <= 3) return 'grid-cols-3';
    if (count === 4) return 'grid-cols-4';
    if (count === 7 || count === 14 || count === 21 || count === 28) return 'grid-cols-7';
    if (count <= 9) return 'grid-cols-3';
    if (count <= 16) return 'grid-cols-4';
    if (count <= 25) return 'grid-cols-5';
    return 'grid-cols-6';
  };

  // Find reward for a given day
  const getRewardForDay = (dayNum: number) => {
    return activeBoard.rewards?.find(r => r.day === dayNum) || {
      day: dayNum,
      rewardType: 'coins' as const,
      rewardValue: '50',
      rewardName: '50 Gacha Coins'
    };
  };

  // Play stamp animation automatically if not claimed today
  useEffect(() => {
    if (!isAlreadyClaimedToday && !isCompletedBoard) {
      const timer = setTimeout(() => {
        setIsStamping(true);
        // Sound or haptic effect could go here
        const landTimer = setTimeout(() => {
          setStampLanded(true);
          handleTriggerClaim();
        }, 700);
        return () => clearTimeout(landTimer);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isAlreadyClaimedToday, isCompletedBoard]);

  const handleTriggerClaim = async () => {
    if (saving) return;
    setSaving(true);
    setHasError(null);

    const todayStr = getTodayString();
    const updatedClaimedList = [...claimedDaysList, currentDayToStamp];

    try {
      try {
        // 1. Save claim in Firestore
        const claimRef = doc(db, 'login_claims', `${userId}_${activeBoard.id}`);
        await setDoc(claimRef, {
          userId,
          bonusId: activeBoard.id,
          lastClaimDate: todayStr,
          claimedDays: updatedClaimedList,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (firestoreErr: any) {
        const isQuota = firestoreErr.message?.toLowerCase().includes('quota') || 
                        firestoreErr.message?.toLowerCase().includes('exhausted') || 
                        firestoreErr.message?.toLowerCase().includes('permission') || 
                        firestoreErr.message?.toLowerCase().includes('unavailable') ||
                        firestoreErr.message?.toLowerCase().includes('limit');

        if (isQuota) {
          console.warn("[Quota Fallback] Saving login claims locally due to Firestore resource limits.");
          const localClaimKey = `jimicchi_local_login_claims_${userId}_${activeBoard.id}`;
          const localClaimData = {
            userId,
            bonusId: activeBoard.id,
            lastClaimDate: todayStr,
            claimedDays: updatedClaimedList,
            updatedAt: new Date().toISOString()
          };
          localStorage.setItem(localClaimKey, JSON.stringify(localClaimData));

          try {
            localStorage.setItem('jimicchi_db_quota_exceeded', 'true');
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('jimicchi_quota_change'));
          } catch (_) {}
        } else {
          throw firestoreErr;
        }
      }

      // 2. Dispatch reward to local gacha store
      const dayReward = getRewardForDay(currentDayToStamp);
      const res = awardGachaItem(userId, dayReward.rewardType, dayReward.rewardValue);

      if (res.success) {
        setSuccessRewardMsg(res.msg);
      } else {
        setSuccessRewardMsg(`ログインボーナス報酬を受け取りました！`);
      }

      // 3. Callback to app
      onClaimSuccess();
    } catch (err: any) {
      console.error('Failed to claim login bonus:', err);
      setHasError(err.message || '報酬の更新に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="login-bonus-modal-overlay" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
      <motion.div
        id="login-bonus-modal-card"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl shadow-2xl border border-stone-100 p-6 max-w-md w-full relative overflow-hidden flex flex-col items-center"
      >
        {/* Close Button */}
        <button
          id="login-bonus-modal-close"
          onClick={onClose}
          disabled={saving && !isAlreadyClaimedToday}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-1.5 hover:bg-stone-50 rounded-full transition"
        >
          <X size={18} />
        </button>

        {/* Header decoration */}
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-3 border border-amber-100 animate-pulse">
          <Gift size={24} />
        </div>

        <h2 id="login-bonus-title" className="text-base font-black text-amber-950 text-center tracking-tight font-bold">
          {activeBoard.name}
        </h2>
        
        <p className="text-[10px] font-bold text-stone-500 mt-1 mb-4 text-center font-bold">
          ログインするたびにマスにスタンプが押され、特製の報酬が手に入ります！
        </p>

        {/* Bingo Card / Days Grid */}
        <div 
          id="login-bonus-grid"
          className={cn(
            "grid w-full gap-2 p-3.5 bg-stone-50 rounded-3xl border border-stone-200/60 shadow-inner select-none relative",
            totalCells > 12 ? "max-w-md" : totalCells > 6 ? "max-w-sm" : "max-w-xs",
            getGridColsClass(totalCells)
          )}
        >
          {Array.from({ length: totalCells }).map((_, index) => {
            const dayNum = index + 1;
            const isStamped = claimedDaysList.includes(dayNum);
            const isCurrentToStamp = dayNum === currentDayToStamp && !isAlreadyClaimedToday;
            const reward = getRewardForDay(dayNum);

            // Determine label structure
            let emoji = '🪙';
            if (reward.rewardType === 'shards') emoji = '💎';
            if (reward.rewardType === 'special_title') emoji = '🏷️';
            if (reward.rewardType === 'special_badge') emoji = '🏆';

            return (
              <div
                key={dayNum}
                id={`login-day-cell-${dayNum}`}
                className={cn(
                  "aspect-square rounded-2xl border bg-white flex flex-col items-center justify-between p-1 text-center relative overflow-hidden transition-all",
                  isStamped ? "border-rose-100 bg-rose-50/20" : "border-stone-200",
                  isCurrentToStamp ? "ring-4 ring-amber-400 shadow-lg border-amber-300 scale-[1.03] z-10" : ""
                )}
              >
                {/* Day Header */}
                <span className="text-[8px] font-black leading-none block text-stone-400 uppercase tracking-tight font-bold pt-1">
                  Day {dayNum}
                </span>

                {/* Reward Preview */}
                <div className="flex flex-col items-center justify-center flex-1 my-0.5">
                  <span className="text-[14px]" role="img" aria-label="reward">
                    {emoji}
                  </span>
                  <span className="text-[7px] font-extrabold text-stone-850 truncate max-w-[55px] block leading-tight font-bold">
                    {reward.rewardValue}
                  </span>
                </div>

                {/* Reward tooltip-like name */}
                <div className="w-full bg-stone-100/50 rounded-b-xl py-0.5 text-[6px] text-stone-500 font-bold truncate">
                  {reward.rewardName}
                </div>

                {/* STAMP OVERLAYS */}
                {/* Already Stamped Days */}
                {isStamped && (
                  <div className="absolute inset-0 flex items-center justify-center bg-rose-500/10 backdrop-blur-[0.5px]">
                    <motion.div
                      initial={{ scale: 1, rotate: -15 }}
                      className="text-rose-500 border-4 border-rose-500 font-black rounded-full w-10 h-10 flex items-center justify-center text-[10px] transform -rotate-12 tracking-wide block font-extrabold"
                    >
                      ジミ済
                    </motion.div>
                  </div>
                )}

                {/* Today's stamping animation stamp */}
                {isCurrentToStamp && isStamping && (
                  <AnimatePresence>
                    <motion.div 
                      key="active-stamp"
                      initial={{ scale: 3.5, rotate: 30, opacity: 0 }}
                      animate={{ 
                        scale: stampLanded ? 1 : 1.3, 
                        rotate: -15, 
                        opacity: 1 
                      }}
                      transition={{ 
                        type: "spring", 
                        stiffness: stampLanded ? 280 : 150, 
                        damping: stampLanded ? 15 : 20 
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-rose-500/10"
                    >
                      <div className="relative text-rose-500 border-4 border-rose-500 font-black rounded-full w-10 h-10 flex items-center justify-center text-[10px] transform tracking-wide block font-extrabold shadow-sm bg-white">
                        ジミ済
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            );
          })}
        </div>

        {/* Live Status Description */}
        <div className="w-full mt-4 text-center px-4">
          {isAlreadyClaimedToday ? (
            <div id="login-bonus-claimed-badge" className="bg-emerald-50 text-emerald-800 border border-emerald-100 py-2.5 px-4 rounded-2xl text-xs font-bold inline-flex items-center gap-1.5 font-bold">
              <CheckCircle2 size={15} className="text-emerald-500 animate-bounce" />
              本日のログインボーナスは全て受け取り済みです！
            </div>
          ) : isCompletedBoard ? (
            <div className="bg-amber-50 text-amber-800 border border-amber-100 py-2 px-4 rounded-xl text-[10px] font-bold">
              🎉 素晴らしい！このログインボーナスカードをコンプリートしました！
            </div>
          ) : (
            <div className="space-y-3">
              {stampLanded ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-rose-50 text-rose-800 border border-rose-100 p-3 rounded-2xl text-xs text-center font-bold"
                >
                  <p className="flex items-center justify-center gap-1 font-bold">
                    🎯 Day {currentDayToStamp} クリア！
                  </p>
                  {successRewardMsg && (
                    <p className="text-[10px] text-rose-600 mt-1 font-bold">
                      {successRewardMsg}
                    </p>
                  )}
                </motion.div>
              ) : (
                <div className="text-amber-600 animate-pulse text-[11px] font-bold">
                  スタンプを押しています... しばらくお待ちください 🎯
                </div>
              )}
            </div>
          )}

          {hasError && (
            <p className="text-xs text-red-500 mt-2 font-bold">Error: {hasError}</p>
          )}
        </div>

        {/* Action button to proceed */}
        <div className="w-full mt-6">
          <button
            id="login-bonus-success-btn"
            onClick={onClose}
            className={cn(
              "w-full rounded-2xl py-2.5 text-xs text-white transition font-black active:scale-[0.98] outline-none font-bold",
              isAlreadyClaimedToday
                ? "bg-stone-850 hover:bg-stone-900"
                : stampLanded
                ? "bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-100"
                : "bg-stone-300 cursor-not-allowed"
            )}
            disabled={!isAlreadyClaimedToday && !stampLanded}
          >
            {isAlreadyClaimedToday ? "閉じる" : stampLanded ? "受け取って閉じる" : "スタンプ押印中..."}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
