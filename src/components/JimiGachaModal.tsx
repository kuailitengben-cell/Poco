import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Coins, Sparkles, Award, Bookmark, Info, HelpCircle, AlertCircle, ShoppingBag, RefreshCw, Star, CheckCircle2, Search, Play, Trophy
} from 'lucide-react';
import { 
  getGachaState, saveGachaState, drawGacha, exchangeShard, GACHA_POOL, GachaItem, GachaState, PullResult, awardGachaCoins, claimDailyMission
} from '../lib/gachaStore';
import { BADGES } from '../lib/badgeUtils';
import { PREFIX_TRANSLATIONS, SUFFIX_TRANSLATIONS } from '../lib/titleRarityUtils';
import { useLanguage } from '../lib/LanguageContext';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc, 
  runTransaction, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';

interface JimiGachaModalProps {
  userId: string;
  onClose: () => void;
  onItemUnlocked?: () => void; // Refresh badges / titles list if needed
  isAdmin?: boolean;
}

export default function JimiGachaModal({ userId, onClose, onItemUnlocked, isAdmin }: JimiGachaModalProps) {
  const { language, t } = useLanguage();
  const [state, setState] = useState<GachaState | null>(null);

  const getGachaItemName = (item: GachaItem) => {
    if (language !== 'en') return item.name;
    
    if (item.type === 'badge') {
      const b = BADGES.find(x => x.id === item.id);
      if (b) {
        return b.nameEn || b.name;
      }
    } else if (item.type === 'prefix') {
      const textEn = PREFIX_TRANSLATIONS[item.name];
      if (textEn) return textEn;
    } else if (item.type === 'suffix') {
      const textEn = SUFFIX_TRANSLATIONS[item.name];
      if (textEn) return textEn;
    }
    return item.name;
  };

  const [activeTab, setActiveTab] = useState<'play' | 'exchange' | 'rates'>('play');
  const [pulling, setPulling] = useState(false);
  const [pullResults, setPullResults] = useState<PullResult[]>([]);
  const [hasMythic, setHasMythic] = useState(false);
  const [easterEggRefundMsg, setEasterEggRefundMsg] = useState(false);
  const [pityTracker, setPityTracker] = useState({ nextRare: 50, nextLegendary: 200 });
  const [dialRotation, setDialRotation] = useState(0);
  const [showCoinShop, setShowCoinShop] = useState(false);
  const [purchasingPack, setPurchasingPack] = useState<string | null>(null);

  // New variables for enhanced physical feeling and gacha draw popups
  const [isShaking, setIsShaking] = useState(false);
  const [showGachaOverlay, setShowGachaOverlay] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const [isOpeningSequence, setIsOpeningSequence] = useState(false);

  // Profile status state for reactive coin & display name tracking
  const [profile, setProfile] = useState<any>(null);

  // Gift Code Claim Systems
  const [giftCodeInput, setGiftCodeInput] = useState('');
  const [giftClaimMessage, setGiftClaimMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  // Issue/Create Systems
  const [createRewardGc, setCreateRewardGc] = useState(100);
  const [createMaxUses, setCreateMaxUses] = useState(5);
  const [createCampaignName, setCreateCampaignName] = useState('');
  const [createTargetUid, setCreateTargetUid] = useState('');
  const [isCreatingCode, setIsCreatingCode] = useState(false);
  const [newlyCreatedCode, setNewlyCreatedCode] = useState('');
  const [createError, setCreateError] = useState('');

  // Sub-tabs inside Code Center
  const [giftCenterTab, setGiftCenterTab] = useState<'claim' | 'create' | 'my_codes'>('claim');

  // List of my issued codes
  const [myCodes, setMyCodes] = useState<any[]>([]);

  // Listen to profile updates (coins synchronizations)
  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(doc(db, 'profiles', userId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        
        // Push backend coins back to GachaState matching localstorage
        setState(prev => {
          if (!prev) return prev;
          if (prev.coins !== data.coins || prev.shards !== data.shards) {
            const newState = { ...prev, coins: data.coins ?? prev.coins, shards: data.shards ?? prev.shards };
            const key = `jimicchi_gacha_v3_${userId}`;
            localStorage.setItem(key, JSON.stringify(newState));
            return newState;
          }
          return prev;
        });
      }
    });
    return () => unsub();
  }, [userId]);

  // Listen to my issued codes
  useEffect(() => {
    if (!userId || !showCoinShop) return;
    const q = query(
      collection(db, 'gift_codes'),
      where('creator_uid', '==', userId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyCodes(list);
    });
    return () => unsub();
  }, [userId, showCoinShop]);

  const generateRandomGiftCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${segment()}-${segment()}-${segment()}`;
  };

  const handleClaimCode = async () => {
    if (!userId || !giftCodeInput.trim()) return;
    setIsClaiming(true);
    setGiftClaimMessage(null);
    const codeStr = giftCodeInput.trim().toUpperCase();

    // --- 1. Local Code Fallback Check ---
    let localCodes: any[] = [];
    try {
      localCodes = JSON.parse(localStorage.getItem('jimicchi_local_gift_codes') || '[]');
    } catch (_) {}
    const localMatch = localCodes.find((c: any) => c.code === codeStr);

    if (localMatch) {
      try {
        const claimKey = `jimicchi_local_gift_claims_${userId}`;
        const localClaims = JSON.parse(localStorage.getItem(claimKey) || '[]');

        if (localClaims.includes(codeStr)) {
          setGiftClaimMessage({ text: '⚠️ このコードはすでに受け取り済みです（ローカル制限）。', type: 'error' });
          setIsClaiming(false);
          return;
        }

        if (localMatch.creator_uid === userId && !isAdmin) {
          setGiftClaimMessage({ text: '⚠️ 自分が発行した配布コードを自分で受け取ることはできません。', type: 'error' });
          setIsClaiming(false);
          return;
        }

        if (localMatch.active !== true) {
          setGiftClaimMessage({ text: '⚠️ このコードは現在、発行者によって停止されています。', type: 'error' });
          setIsClaiming(false);
          return;
        }

        if (new Date(localMatch.expire_at) < new Date()) {
          setGiftClaimMessage({ text: '⚠️ このコードは有効期限が終了しています。', type: 'error' });
          setIsClaiming(false);
          return;
        }

        if (localMatch.used_count >= localMatch.max_uses) {
          setGiftClaimMessage({ text: '⚠️ このコードの使用回数は上限（定員）に達しました。', type: 'error' });
          setIsClaiming(false);
          return;
        }

        // Apply local claim count update
        localMatch.used_count += 1;
        localStorage.setItem('jimicchi_local_gift_codes', JSON.stringify(localCodes));

        localClaims.push(codeStr);
        localStorage.setItem(claimKey, JSON.stringify(localClaims));

        // Credit coins
        const gState = getGachaState(userId);
        gState.coins += localMatch.reward_gc;
        saveGachaState(userId, gState);
        setState(gState);

        setGiftClaimMessage({
          text: `🎉 【ローカル認証】コードの照合に成功しました！\nコイン残高に +${localMatch.reward_gc} GC をお受け取りしました。`,
          type: 'success'
        });

        setGiftCodeInput('');
        if (onItemUnlocked) onItemUnlocked();
        setIsClaiming(false);
        return;
      } catch (localErr: any) {
        setGiftClaimMessage({ text: `⚠️ エラーが発生しました: ${localErr.message}`, type: 'error' });
        setIsClaiming(false);
        return;
      }
    }

    // --- 2. Online Claim with Quota Safety ---
    try {
      const codeRef = doc(db, 'gift_codes', codeStr);
      const redemptionId = `${userId}_${codeStr}`;
      const redemptionRef = doc(db, 'gift_redemptions', redemptionId);
      const userProfileRef = doc(db, 'profiles', userId);

      await runTransaction(db, async (transaction) => {
        const codeDoc = await transaction.get(codeRef);
        if (!codeDoc.exists()) {
          throw new Error('CODE_NOT_FOUND');
        }
        const codeData = codeDoc.data();

        const redemptionDoc = await transaction.get(redemptionRef);
        if (redemptionDoc.exists()) {
          throw new Error('ALREADY_REDEEMED');
        }

        // Fetch profileDoc first to fulfill Firestore transaction ordering requirement
        const profileDoc = await transaction.get(userProfileRef);

        if (codeData.creator_uid === userId && !isAdmin) {
          throw new Error('SELF_CLAIM_FORBIDDEN');
        }

        if (codeData.active !== true) {
          throw new Error('CODE_INACTIVE');
        }

        const expiryDate = new Date(codeData.expire_at);
        if (expiryDate < new Date()) {
          throw new Error('CODE_EXPIRED');
        }

        if (codeData.used_count >= codeData.max_uses) {
          throw new Error('USES_EXCEEDED');
        }

        if (codeData.target_uid && codeData.target_uid !== userId) {
          throw new Error('TARGET_MISMATCH');
        }

        const currentCoins = profileDoc.exists() ? (profileDoc.data().coins ?? 500) : 500;

        transaction.update(codeRef, {
          used_count: codeData.used_count + 1
        });

        transaction.set(redemptionRef, {
          user_uid: userId,
          code: codeStr,
          reward_gc: codeData.reward_gc,
          redeemed_at: new Date().toISOString()
        });

        transaction.update(userProfileRef, {
          coins: currentCoins + codeData.reward_gc
        });
      });

      setGiftClaimMessage({
        text: `🎉 配布コードの照合に成功しました！\nコイン残高に +${codeStr} の配布分をお受け取りしました。`,
        type: 'success'
      });

      setGiftCodeInput('');
    } catch (err: any) {
      console.error("Gift code claim transaction failed:", err);
      const isQuota = err.message?.toLowerCase().includes('quota') || 
                      err.message?.toLowerCase().includes('exhausted') || 
                      err.message?.toLowerCase().includes('permission') || 
                      err.message?.toLowerCase().includes('unavailable') ||
                      err.message?.toLowerCase().includes('limit');

      if (isQuota) {
        // Quota Limit friendly workaround: award standard gift coin locally!
        const fallbackReward = 100;
        const gState = getGachaState(userId);
        gState.coins += fallbackReward;
        saveGachaState(userId, gState);
        setState(gState);

        setGiftClaimMessage({
          text: `🎉 オンライン一時混雑（制限）のため、デモ用お詫びプレゼントとして +${fallbackReward} GC を獲得しました！（オフライン代替処理）`,
          type: 'success'
        });
        setGiftCodeInput('');
        if (onItemUnlocked) onItemUnlocked();

        try {
          localStorage.setItem('jimicchi_db_quota_exceeded', 'true');
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('jimicchi_quota_change'));
        } catch (_) {}
      } else {
        let errMsg = '有効ではないコードか、不整合が発生しました。';
        if (err.message === 'CODE_NOT_FOUND') {
          errMsg = '⚠️ 入力された配布コードが存在しません。';
        } else if (err.message === 'ALREADY_REDEEMED') {
          errMsg = '⚠️ このコードはすでに受け取り済みです。';
        } else if (err.message === 'CODE_INACTIVE') {
          errMsg = '⚠️ このコードは現在、発行者によって停止されています。';
        } else if (err.message === 'CODE_EXPIRED') {
          errMsg = '⚠️ このコードは有効期限が終了しています。';
        } else if (err.message === 'USES_EXCEEDED') {
          errMsg = '⚠️ このコードの使用回数は上限（定員）に達しました。';
        } else if (err.message === 'TARGET_MISMATCH') {
          errMsg = '⚠️ あなたはこのコードの対象ユーザーではありません。';
        } else if (err.message === 'SELF_CLAIM_FORBIDDEN') {
          errMsg = '⚠️ 自分が発行した配布コードを自分で受け取ることはできません。';
        }
        setGiftClaimMessage({ text: errMsg, type: 'error' });
      }
    } finally {
      setIsClaiming(false);
    }
  };

  const handleCreateCode = async () => {
    if (!userId) return;
    setCreateError('');
    setNewlyCreatedCode('');

    const totalCost = createRewardGc * createMaxUses;
    const currentCoins = profile?.coins ?? (state?.coins ?? 500);

    if (!isAdmin && currentCoins < totalCost) {
      setCreateError(`⚠️ コイン（GC）が不足しています。作成には合計 ${totalCost} GC 必要ですが、現在 ${currentCoins} GC のみ保有しています。`);
      return;
    }

    setIsCreatingCode(true);

    const codeSegment = generateRandomGiftCode();

    try {
      const codeRef = doc(db, 'gift_codes', codeSegment);
      const creatorProfileRef = doc(db, 'profiles', userId);

      await runTransaction(db, async (transaction) => {
        if (!isAdmin) {
          const profileDoc = await transaction.get(creatorProfileRef);
          if (!profileDoc.exists()) {
            throw new Error('PROFILE_NOT_FOUND');
          }
          const userCoins = profileDoc.data().coins ?? 500;
          if (userCoins < totalCost) {
            throw new Error('BALANCE_INSUFFICIENT');
          }
          transaction.update(creatorProfileRef, {
            coins: userCoins - totalCost
          });
        }

        transaction.set(codeRef, {
          code: codeSegment,
          creator_uid: userId,
          creator_name: profile?.displayName || 'Anonymous 地味者',
          reward_gc: createRewardGc,
          created_at: new Date().toISOString(),
          expire_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          max_uses: createMaxUses,
          used_count: 0,
          active: true,
          target_uid: createTargetUid.trim() || null,
          campaign_name: createCampaignName.trim() || 'ユーザー配布プレゼント'
        });
      });

      if (!isAdmin) {
        const gState = getGachaState(userId);
        gState.coins = Math.max(0, gState.coins - totalCost);
        saveGachaState(userId, gState);
        setState(gState);
      }

      setNewlyCreatedCode(codeSegment);
      setCreateCampaignName('');
      setCreateTargetUid('');
    } catch (err: any) {
      console.error("Gift code creation transaction failed:", err);
      const isQuota = err.message?.toLowerCase().includes('quota') || 
                      err.message?.toLowerCase().includes('exhausted') || 
                      err.message?.toLowerCase().includes('permission') || 
                      err.message?.toLowerCase().includes('unavailable') ||
                      err.message?.toLowerCase().includes('limit');

      if (isQuota) {
        // Create Code locally instead of crashing!
        try {
          if (!isAdmin) {
            const gState = getGachaState(userId);
            if (gState.coins < totalCost) {
              setCreateError('⚠️ コインが不足しているため作成できませんでした。');
              setIsCreatingCode(false);
              return;
            }
            gState.coins = Math.max(0, gState.coins - totalCost);
            saveGachaState(userId, gState);
            setState(gState);
          }

          const localCodeObj = {
            id: codeSegment,
            code: codeSegment,
            creator_uid: userId,
            creator_name: profile?.displayName || 'Anonymous 地味者',
            reward_gc: createRewardGc,
            created_at: new Date().toISOString(),
            expire_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            max_uses: createMaxUses,
            used_count: 0,
            active: true,
            target_uid: createTargetUid.trim() || null,
            campaign_name: `${createCampaignName.trim() || 'ユーザー配布プレゼント'} (ローカル保存)`
          };

          const localCodes = JSON.parse(localStorage.getItem('jimicchi_local_gift_codes') || '[]');
          localCodes.push(localCodeObj);
          localStorage.setItem('jimicchi_local_gift_codes', JSON.stringify(localCodes));

          setNewlyCreatedCode(codeSegment);
          setCreateCampaignName('');
          setCreateTargetUid('');

          try {
            localStorage.setItem('jimicchi_db_quota_exceeded', 'true');
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('jimicchi_quota_change'));
          } catch (_) {}
        } catch (localWriteErr) {
          console.error("Local claim backup write failed", localWriteErr);
          setCreateError('⚠️ 配布コードの作成に失敗しました。');
        }
      } else {
        setCreateError(err.message === 'BALANCE_INSUFFICIENT' ? '⚠️ コインが不足しているため作成できませんでした。' : '⚠️ 配布コードの作成に失敗しました。時間をおいて再試行してください。');
      }
    } finally {
      setIsCreatingCode(false);
    }
  };

  const handleToggleCodeActive = async (codeId: string, currentActive: boolean) => {
    try {
      await updateDoc(doc(db, 'gift_codes', codeId), {
        active: !currentActive
      });
    } catch (err) {
      console.error("Failed to toggle code active state:", err);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    const confirmed = window.confirm(`本当にこの配布コード「${codeId}」を削除してもよろしいですか？`);
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, 'gift_codes', codeId));
    } catch (err) {
      console.error("Failed to delete code:", err);
    }
  };

  // Coin Purchase with Real Stripe & Demo-Fallback
  // Coin Purchase (Safe offline simulation fallback - No web requests)
  const handlePurchasePack = async (packId: string, coinsCount: number, packName: string) => {
    if (!userId) return;
    setPurchasingPack(packId);

    try {
      // Fast immediate local free simulation to bypass any server-side dependencies
      awardGachaCoins(userId, coinsCount, `デモチャージ: ${packName}`);
      const newState = getGachaState(userId);
      setState(newState);
      alert(`🎉 【地味コイン（GC）チャージ完了】\n「${packName}」のチャージが無料で完了しました！\nコイン残高に +${coinsCount} GC が追加されました。`);
    } catch (err: any) {
      console.error("Local token generation failed:", err);
      alert(`⚠️ コイン補充中に問題が発生しました:\n${err.message || err}`);
    } finally {
      setPurchasingPack(null);
    }
  };

  const handleAdminInfiniteCoins = () => {
    if (!userId) return;
    awardGachaCoins(userId, 999999, '管理者特典（無限チャージ）');
    const newState = getGachaState(userId);
    setState(newState);
    alert('🎉 【管理者特典】無料無限コインチャージが完了しました！ (+999,999 GC)');
  };

  const handlePurchaseAdmin = (amount: number) => {
    if (!userId) return;
    awardGachaCoins(userId, amount, '管理者チャージ');
    const newState = getGachaState(userId);
    setState(newState);
  };

  const handleResetCoins = () => {
    if (!userId || !state) return;
    const key = `jimicchi_gacha_v3_${userId}`;
    const refreshedState = { ...state, coins: 100 };
    localStorage.setItem(key, JSON.stringify(refreshedState));
    setState(refreshedState);
    alert('コインを100GCにリセットしました。');
  };

  // Exchange filters and search
  const [exchangeTypeFilter, setExchangeTypeFilter] = useState<'all' | 'prefix' | 'suffix' | 'badge'>('all');
  const [exchangeOwnFilter, setExchangeOwnFilter] = useState<'all' | 'locked' | 'unlocked'>('all');
  const [exchangeSearchQuery, setExchangeSearchQuery] = useState('');

  // Catalog tab filters
  const [catalogRarityFilter, setCatalogRarityFilter] = useState<'all' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'>('all');
  const [catalogOwnFilter, setCatalogOwnFilter] = useState<'all' | 'locked' | 'unlocked'>('all');

  // Load state on mount and when userId shifts
  const [pools, setPools] = useState<any[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>('default');

  useEffect(() => {
    if (userId) {
      const gState = getGachaState(userId);
      setState(gState);
      updatePityInfo(gState);
    }
  }, [userId]);

  useEffect(() => {
    const q = query(collection(db, 'gacha_pools'), where('active', '==', true));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPools(list);
    }, (error) => {
      console.warn("Gacha pools subscription failed:", error.message);
    });
    return () => unsub();
  }, []);

  const updatePityInfo = (gState: GachaState) => {
    const remainsRare = 50 - (gState.pityCount % 50);
    const remainsLegendary = 200 - (gState.pityCount % 200);
    setPityTracker({
      nextRare: remainsRare,
      nextLegendary: remainsLegendary
    });
  };

  const handlePull = (count: number) => {
    if (!userId || !state) return;
    try {
      setPulling(true);
      setPullResults([]);
      setHasMythic(false);
      setEasterEggRefundMsg(false);

      const selectedPoolObj = selectedPoolId !== 'default' 
        ? pools.find(p => p.id === selectedPoolId) 
        : null;

      const { results, state: newState, easterEggRefund } = drawGacha(userId, count, selectedPoolObj);
      
      // Save new state immediately
      setState(newState);
      updatePityInfo(newState);

      if (easterEggRefund) {
        // Unlocked the secret "欲がない人"
        setTimeout(() => {
          setEasterEggRefundMsg(true);
          const refundAmount = selectedPoolObj
            ? (count === 1 ? (selectedPoolObj.cost1 ?? 100) : (selectedPoolObj.cost10 ?? 900))
            : (count === 1 ? 100 : count === 10 ? 900 : 4500);

          awardGachaCoins(userId, refundAmount, '回さない返金');
          
          const refundedState = getGachaState(userId);
          if (!refundedState.unlockedPrefixIds.includes('p_gacha_nantonaku')) {
            refundedState.unlockedPrefixIds.push('p_gacha_nantonaku');
          }
          if (!refundedState.unlockedSuffixIds.includes('s_gacha_kita')) {
            refundedState.unlockedSuffixIds.push('s_gacha_kita');
          }
          saveGachaState(userId, refundedState);
          setState(refundedState);
          setPulling(false);
          setShowGachaOverlay(false); // Close the overlay since it was an easter egg refund
          if (onItemUnlocked) onItemUnlocked();
        }, 1200);
        return;
      }

      // Check if any drawn item is Mythic
      const containsMythic = results.some(r => r.item.rarity === 'mythic');
      
      setPullResults(results);
      if (containsMythic) {
        setHasMythic(true);
        setTimeout(() => {
          setPulling(false);
          setIsOpeningSequence(false);
          if (onItemUnlocked) onItemUnlocked();
        }, 3800); // Dramatic dark screen sequence
      } else {
        setTimeout(() => {
          setPulling(false);
          setIsOpeningSequence(false);
          if (onItemUnlocked) onItemUnlocked();
        }, 1500); // Suspense waiting for visual ball drops
      }

    } catch (err: any) {
      alert(err.message || 'ガチャに失敗しました。');
      setPulling(false);
      setShowGachaOverlay(false);
    }
  };

  const triggerPullWithAnimation = (count: number) => {
    if (!userId || !state) return;
    const selectedPoolObj = selectedPoolId !== 'default' 
      ? pools.find(p => p.id === selectedPoolId) 
      : null;

    const requiredCoins = selectedPoolObj
      ? (count === 1 ? (selectedPoolObj.cost1 ?? 100) : (selectedPoolObj.cost10 ?? 900))
      : (count === 1 ? 100 : count === 10 ? 900 : 4500);

    if (state.coins < requiredCoins) {
      alert('地味コイン（GC）が足りません。');
      return;
    }
    
    // Twist knob rotation action - 4 full spins with violence
    setDialRotation(prev => prev + 1440);
    setIsShaking(true);
    setPulling(true);
    setShowGachaOverlay(true);
    setIsOpeningSequence(true);
    setRevealedIndices([]);
    
    // Deliberate pause while shaking cabinet mechanical effects complete
    setTimeout(() => {
      setIsShaking(false);
      handlePull(count);
    }, 1000);
  };

  const handleExchange = (item: GachaItem) => {
    if (!userId || !state) return;
    try {
      if (state.shards < 500) {
        alert(t('欠片が足りません。', 'You do not have enough shards.'));
        return;
      }
      const newState = exchangeShard(userId, item.id);
      setState(newState);
      if (onItemUnlocked) onItemUnlocked();
      alert(language === 'en' 
        ? `Congratulations! Exchanged and unlocked "${getGachaItemName(item)}"!`
        : `祝！「${item.name}」を交換・解放しました！`
      );
    } catch (err: any) {
      alert(err.message || t('交換に失敗しました。', 'Exchange failed.'));
    }
  };

  // Helper developers coin generator
  const getFreeCoins = () => {
    if (!userId) return;
    awardGachaCoins(userId, 1000, 'デバッグボーナス');
    const newState = getGachaState(userId);
    setState(newState);
  };

  if (!state) return null;

  const rarityColorMap: Record<GachaItem['rarity'], string> = {
    common: 'border-slate-200 bg-slate-50 text-slate-700',
    uncommon: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    rare: 'border-sky-300 bg-sky-50 text-sky-700',
    epic: 'border-purple-300 bg-purple-50 text-purple-700',
    legendary: 'border-amber-400 bg-amber-50 text-amber-800 font-extrabold',
    mythic: 'border-rose-600 bg-zinc-950 text-rose-400 font-black'
  };

  const rarityNameMap: Record<GachaItem['rarity'], string> = {
    common: 'コモン (55%)',
    uncommon: 'アンコモン (25%)',
    rare: 'レア (13%)',
    epic: 'エピック (5%)',
    legendary: 'レジェンダリー (1.8%)',
    mythic: 'ミシック (0.2%)'
  };

  // Active exchange filtering list
  const filteredExchangeItems = GACHA_POOL.filter(item => {
    const isUnlocked = item.type === 'prefix' 
      ? state.unlockedPrefixIds.includes(item.id) 
      : item.type === 'suffix' 
        ? state.unlockedSuffixIds.includes(item.id) 
        : state.unlockedBadgeIds.includes(item.id);

    if (exchangeTypeFilter !== 'all' && item.type !== exchangeTypeFilter) return false;
    if (exchangeOwnFilter === 'locked' && isUnlocked) return false;
    if (exchangeOwnFilter === 'unlocked' && !isUnlocked) return false;
    
    if (exchangeSearchQuery) {
      const matchesNameEn = getGachaItemName(item).toLowerCase().includes(exchangeSearchQuery.toLowerCase());
      const matchesNameJa = item.name.toLowerCase().includes(exchangeSearchQuery.toLowerCase());
      return matchesNameEn || matchesNameJa;
    }
    return true;
  });

  // Unique pity calculation indicators (max 50, max 200)
  const rarePityPercent = Math.min(100, Math.max(0, ((50 - pityTracker.nextRare) / 50) * 100));
  const legendaryPityPercent = Math.min(100, Math.max(0, ((200 - pityTracker.nextLegendary) / 200) * 100));

  // Find highest rarity revealed so far to determine glow auroral background
  const getHighestRarityRevealed = (): GachaItem['rarity'] | 'none' => {
    if (pullResults.length === 0) return 'none';
    const openedResults = pullResults.filter((_, idx) => revealedIndices.includes(idx));
    if (openedResults.length === 0) return 'none';

    const rank: Record<string, number> = { none: 0, common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6 };
    let highest: GachaItem['rarity'] | 'none' = 'none';

    for (const r of openedResults) {
      if (rank[r.item.rarity] > rank[highest]) {
        highest = r.item.rarity;
      }
    }
    return highest;
  };

  const currentHighestRarity = getHighestRarityRevealed();

  const auraClassMap: Record<string, string> = {
    none: 'bg-[#0c0a09]/90',
    common: 'bg-[#18181b]/95 shadow-[inset_0_0_120px_rgba(255,255,255,0.06)]',
    uncommon: 'bg-[#022c22]/95 shadow-[inset_0_0_150px_rgba(16,185,129,0.12)]',
    rare: 'bg-[#030712]/95 shadow-[inset_0_0_180px_rgba(59,130,246,0.16)]',
    epic: 'bg-[#1e1b4b]/95 shadow-[inset_0_0_200px_rgba(168,85,247,0.22)]',
    legendary: 'bg-[#451a03]/95 shadow-[inset_0_0_280px_rgba(245,158,11,0.28)]',
    mythic: 'animate-mythic-rift shadow-[inset_0_0_380px_rgba(244,63,94,0.5)] border border-rose-500/20'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-orange-950/60 backdrop-blur-md overflow-hidden">
      
      {/* Visual background effect variables */}
      <style>{`
        @keyframes driftPinkConfetti {
          0% { transform: translateY(-50px) rotate(0deg) translateX(0px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.8; }
          100% { transform: translateY(500px) rotate(360deg) translateX(-30px); opacity: 0; }
        }
        .confetti-only-one {
          position: absolute;
          width: 14px;
          height: 14px;
          background-color: #f43f5e;
          clip-path: polygon(50% 0%, 100% 38%, 81% 100%, 19% 100%, 0% 38%);
          animation: driftPinkConfetti 3.5s linear infinite forwards;
        }

        /* Tactical 3D physical shaking cabinet */
        @keyframes gacha-shake {
          0% { transform: translate(0, 0) rotate(0deg); }
          12% { transform: translate(-3px, 2px) rotate(-1.2deg); }
          25% { transform: translate(3px, -2px) rotate(1.2deg); }
          37% { transform: translate(-3px, -1px) rotate(-0.8deg); }
          50% { transform: translate(3px, 3px) rotate(1.5deg); }
          63% { transform: translate(-2px, 1px) rotate(-0.5deg); }
          75% { transform: translate(2px, -3px) rotate(1deg); }
          87% { transform: translate(-1px, 2px) rotate(-0.5deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        .gacha-cabinet-shake {
          animation: gacha-shake 0.16s ease-in-out infinite;
        }

        /* Shuffle tumbling dynamic capsules inside dome */
        @keyframes random-shuffle-1 {
          0% { transform: translate(0, 0) rotate(0deg); }
          100% { transform: translate(25px, -30px) rotate(180deg); }
        }
        @keyframes random-shuffle-2 {
          0% { transform: translate(0, 0) rotate(0deg); }
          100% { transform: translate(-35px, 20px) rotate(-220deg); }
        }
        @keyframes random-shuffle-3 {
          0% { transform: translate(0, 0) rotate(0deg); }
          100% { transform: translate(30px, 15px) rotate(120deg); }
        }
        .capsule-shuffle-1 { animation: random-shuffle-1 0.25s ease-in-out infinite alternate; }
        .capsule-shuffle-2 { animation: random-shuffle-2 0.22s ease-in-out infinite alternate; }
        .capsule-shuffle-3 { animation: random-shuffle-3 0.28s ease-in-out infinite alternate; }

        /* Rotate slow beams behind card results */
        @keyframes rotating-beams {
          0% { transform: scale(1.6) rotate(0deg); }
          100% { transform: scale(1.6) rotate(360deg); }
        }
        .animate-rotating-beams {
          animation: rotating-beams 16s linear infinite;
        }

        /* Pulsing Glow Orbs */
        @keyframes soft-pulse {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.15); }
        }
        .animate-soft-pulse {
          animation: soft-pulse 4s ease-in-out infinite;
        }

        /* Cyberpunk flowing rift behind Mythic */
        @keyframes mythic-rift-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-mythic-rift {
          background: linear-gradient(135deg, rgba(9,9,11,0.95), rgba(76,29,149,0.95), rgba(24,24,27,0.95), rgba(157,23,77,0.95), rgba(9,9,11,0.95));
          background-size: 300% 300%;
          animation: mythic-rift-flow 8s ease infinite;
        }

        /* Rainbow spectrum flow for mythic card back border */
        @keyframes rainbow-border {
          0% { border-color: #f43f5e; }
          20% { border-color: #a855f7; }
          40% { border-color: #3b82f6; }
          60% { border-color: #10b981; }
          80% { border-color: #eab308; }
          100% { border-color: #f43f5e; }
        }
        .animate-rainbow-border {
          animation: rainbow-border 4s linear infinite;
        }
      `}</style>

      {/* --- CINEMATIC OVERLAYS --- */}
      {/* 1. Mythic Dark Screen Dramatic Sequence */}
      <AnimatePresence>
        {pulling && hasMythic && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-950 z-[60] flex flex-col items-center justify-center text-center p-8 text-white select-none overflow-hidden"
          >
            {/* Exactly ONE falling confetti piece as requested by legacy mechanics */}
            <div className="confetti-only-one" style={{ left: '50%', top: '10%' }} />

            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.0, duration: 1.2 }}
              className="space-y-6"
            >
              <div className="w-20 h-20 rounded-full border border-rose-500 flex items-center justify-center mx-auto bg-rose-500/10 animate-pulse">
                <Sparkles className="w-10 h-10 text-rose-500 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div className="space-y-3">
                <h4 className="text-2xl font-black tracking-widest text-rose-400 bg-gradient-to-r from-rose-400 via-rose-250 to-rose-400 bg-clip-text text-transparent">ミシック級 存在を観測</h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-2 leading-relaxed">
                  世界の理が少しだけ歪みました。あなたが手にしたのは、地味を越えし深淵。
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. "回さない" Refund Easter Egg Modal */}
      <AnimatePresence>
        {easterEggRefundMsg && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute z-[60] bg-white border-2 border-orange-200 p-8 rounded-[40px] shadow-2xl text-center max-w-sm mx-auto space-y-5"
          >
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              <HelpCircle className="w-8 h-8 text-orange-600 animate-bounce" />
            </div>
            <div>
              <h4 className="text-xl font-black text-orange-950">🎉 【隠し演出】回さない</h4>
              <p className="text-xs text-orange-600 font-bold mt-2 leading-relaxed">
                欲がないあなたの行動を検知しました。<br />
                コインは <span className="text-emerald-600">全額返却</span> され、ガチャ限定称号<br />
                <span className="text-orange-900 font-extrabold text-sm border-b border-orange-400 pb-0.5">なんとなく来た</span><br />
                が解放されセット可能になりました！
              </p>
            </div>
            <button 
              onClick={() => setEasterEggRefundMsg(false)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-3 rounded-2xl shadow-md w-full transition"
            >
              了解した
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Grand Premium Gacha Draw and Reveal Popup Overlay */}
      <AnimatePresence>
        {showGachaOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-xl overflow-hidden select-none"
          >
            {/* Dynamic Ambient Glow Backdrops matching highest revealed rarity */}
            <div className={cn("absolute inset-0 transition-all duration-1000 opacity-90", auraClassMap[currentHighestRarity])} />

            {/* Radiant light beams */}
            {currentHighestRarity === 'legendary' && (
              <div className="absolute inset-0 overflow-hidden opacity-30 select-none pointer-events-none mix-blend-screen">
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(251,191,36,0.3)_0%,transparent_60%)]" />
                <div className="w-full h-full bg-[repeating-conic-gradient(from_0deg,rgba(251,191,36,0.2)_0deg_15deg,transparent_15deg_30deg)] animate-rotating-beams rounded-full" />
              </div>
            )}
            
            {currentHighestRarity === 'mythic' && (
              <div className="absolute inset-0 overflow-hidden opacity-45 select-none pointer-events-none mix-blend-color-dodge">
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(244,63,94,0.35)_0%,transparent_70%)] animate-pulse" />
                <div className="w-full h-full bg-[repeating-conic-gradient(from_0deg,rgba(244,63,94,0.3)_0deg_8deg,rgba(168,85,247,0.2)_8deg_16deg,transparent_16deg_30deg)] animate-rotating-beams rounded-full" />
              </div>
            )}

            {currentHighestRarity === 'epic' && (
              <div className="absolute inset-0 overflow-hidden opacity-25 select-none pointer-events-none mix-blend-screen">
                <div className="w-full h-full bg-[repeating-conic-gradient(from_0deg,rgba(168,85,247,0.25)_0deg_18deg,transparent_18deg_36deg)] animate-rotating-beams rounded-full" style={{ animationDuration: '24s' }} />
              </div>
            )}

            {currentHighestRarity === 'rare' && (
              <div className="absolute inset-0 overflow-hidden opacity-20 select-none pointer-events-none mix-blend-screen">
                <div className="w-full h-full bg-[repeating-conic-gradient(from_0deg,rgba(56,189,248,0.2)_0deg_20deg,transparent_20deg_40deg)] animate-rotating-beams rounded-full" style={{ animationDuration: '30s' }} />
              </div>
            )}

            {/* Sparkles particle emitter layer */}
            <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-70">
              {currentHighestRarity === 'legendary' && <div className="absolute left-1/4 top-1/4 w-2 h-2 bg-amber-400 rounded-full animate-ping" />}
              {currentHighestRarity === 'mythic' && <div className="absolute right-1/4 bottom-1/4 w-3 h-3 bg-rose-500 rounded-full animate-ping" />}
            </div>

            {/* CONTENT CARD */}
            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 120, damping: 16 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-stone-900/40 border border-stone-800/80 rounded-[40px] px-6 py-8 md:p-10 flex flex-col justify-between shadow-2xl backdrop-blur-md overflow-hidden"
            >
              
              {/* Outer decorative neon border for mythic */}
              {currentHighestRarity === 'mythic' && (
                <div className="absolute inset-0 border-2 border-rose-500 rounded-[40px] pointer-events-none animate-rainbow-border" />
              )}

              {/* Sub-header inside the overlay */}
              <div className="flex justify-between items-center border-b border-white/10 pb-4 shrink-0 z-10">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-stone-950 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow">GACHA DECK</span>
                  <p className="text-xs text-stone-300 font-bold">
                    {isOpeningSequence 
                      ? t("レバーが引かれました。運命の観測中...", "Lever pulled. Observing destiny...") 
                      : t(`カプセルをタップして中身を解放してください (${revealedIndices.length} / ${pullResults.length} 開封済)`, `Tap capsules to reveal contents (${revealedIndices.length} / ${pullResults.length} opened)`)}
                  </p>
                </div>
                {!isOpeningSequence && revealedIndices.length < pullResults.length && (
                  <button
                    onClick={() => {
                      // Reveal all as an array of indices
                      const allIndices = pullResults.map((_, i) => i);
                      setRevealedIndices(allIndices);
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black px-4 py-2 rounded-xl transition shadow active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-stone-950" />
                    {t('すべて開放する', 'Reveal All')}
                  </button>
                )}
              </div>

              {/* CENTER AREA: DRAW ANIMATION OR REVEAL DECK */}
              <div className={cn(
                "flex-1 my-6 overflow-y-auto min-h-[300px] p-2 z-10",
                isOpeningSequence ? "flex flex-col items-center justify-center" : "block"
              )}>
                {isOpeningSequence ? (
                  /* 1. Dramatic Shaking / Dropping Capsule Stage */
                  <div className="text-center space-y-6">
                    <div className="relative inline-block animate-bounce" style={{ animationDuration: '2s' }}>
                      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg">
                        <Coins className="w-12 h-12 text-white fill-amber-100 animate-spin" style={{ animationDuration: '3s' }} />
                      </div>
                      <div className="absolute -inset-4 rounded-full border border-amber-400/20 animate-ping opacity-40" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-black text-white tracking-widest animate-pulse">{t('カプセルが下りてきています', 'Capsule is dropping...')}</h4>
                      <p className="text-xs text-stone-400 font-bold max-w-sm mx-auto leading-relaxed text-center">
                        {t('レトロな歯車が回り、おもちゃの軌道が構築されました。', 'The vintage mechanism whirls, delivering your prize!')}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* 2. Interactive Click Capsule Deck */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 w-full p-2">
                    {pullResults.map((res, idx) => {
                      const isRevealed = revealedIndices.includes(idx);
                      const rarity = res.item.rarity;
                      
                      const capsuleColors: Record<string, string> = {
                        common: 'from-slate-400 to-slate-200 border-slate-300 shadow-[0_4px_12px_rgba(255,255,255,0.05)] text-slate-900',
                        uncommon: 'from-emerald-500 to-emerald-300 border-emerald-400 shadow-[0_4px_12px_rgba(16,185,129,0.15)] text-emerald-950',
                        rare: 'from-sky-500 to-sky-300 border-sky-400 shadow-[0_4px_12px_rgba(59,130,246,0.15)] text-indigo-950',
                        epic: 'from-purple-650 to-purple-400 border-purple-500 shadow-[0_4px_12px_rgba(168,85,247,0.2)] text-purple-950',
                        legendary: 'from-amber-500 to-yellow-350 border-amber-400 shadow-[0_6px_16px_rgba(245,158,11,0.3)] text-amber-950',
                        mythic: 'from-rose-700 to-red-400 border-rose-500 shadow-[0_8px_24px_rgba(244,63,94,0.4)] text-rose-950'
                      };

                      return (
                        <AnimatePresence key={idx}>
                          {!isRevealed ? (
                            /* Unopened Capsule representation */
                            <motion.div
                              whileHover={{ scale: 1.15, rotate: [0, -5, 5, -5, 0] }}
                              whileTap={{ scale: 0.9 }}
                              layout
                              onClick={() => {
                                setRevealedIndices(prev => [...prev, idx]);
                              }}
                              className={cn(
                                "aspect-square rounded-full border-3 bg-gradient-to-b flex flex-col items-center justify-center cursor-pointer relative group transition-all duration-300 font-black text-stone-950 text-xs shadow-md",
                                capsuleColors[rarity] || "from-stone-400 to-stone-200 border-stone-300"
                              )}
                            >
                              <span className="text-xl filter drop-shadow">🎁</span>
                              <span className="text-[8px] font-black tracking-widest text-[#1c1917]/70 uppercase mt-1">TAP OPEN</span>
                              
                              {/* Rarity Indicator Sparkle dot */}
                              {['legendary', 'mythic'].includes(rarity) && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                </span>
                              )}
                            </motion.div>
                          ) : (
                            /* Opened / Inside item display representation */
                            <motion.div
                              initial={{ scale: 0.3, rotate: -45, opacity: 0 }}
                              animate={{ scale: 1, rotate: 0, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 150, damping: 11 }}
                              layout
                              className={cn(
                                "p-3 rounded-2xl border text-center relative flex flex-col items-center justify-center space-y-2 shadow-sm text-xs min-h-[110px] group/item hover:scale-[1.04] transition-all",
                                rarityColorMap[rarity],
                                rarity === 'mythic' && "border-rose-500 bg-zinc-950 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse"
                              )}
                            >
                              {res.item.emoji ? (
                                <span className="text-3xl transform group-hover/item:scale-115 transition duration-200 select-none filter drop-shadow-sm">{res.item.emoji}</span>
                              ) : (
                                <Trophy className="w-5 h-5 text-amber-500 fill-amber-100 shrink-0" />
                              )}
                              
                              <div className="font-extrabold truncate max-w-full leading-snug">
                                {res.item.type === 'prefix' && <span className="text-[9px] opacity-60 block font-normal text-stone-500">{t('前部称号', 'Prefix')}</span>}
                                {res.item.type === 'suffix' && <span className="text-[9px] opacity-60 block font-normal text-stone-500">{t('後部称号', 'Suffix')}</span>}
                                {res.item.type === 'badge' && <span className="text-[9px] opacity-60 block font-normal text-stone-500">{t('バッジ', 'Badge')}</span>}
                                <span className={cn(rarity === 'mythic' ? "text-rose-200" : "text-stone-900", "font-extrabold")}>{getGachaItemName(res.item)}</span>
                              </div>

                              {/* Duplicate check info badge */}
                              {res.isDuplicate ? (
                                <span className="absolute bottom-1 bg-purple-600 text-white font-bold text-[8px] px-1.5 py-0.5 rounded-md scale-90">
                                  +{res.shardsGained} {t('欠片', 'Shards')}
                                </span>
                              ) : (
                                <span className="absolute bottom-1 bg-emerald-500 text-white font-bold text-[8px] px-1.5 py-0.5 rounded-md scale-90">
                                  NEW!
                                </span>
                              )}

                              <span className="absolute top-1 right-2 text-[6px] uppercase tracking-wider font-extrabold opacity-40 select-none">
                                {rarity}
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* FOOTER ROW INSIDE POPUP */}
              <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 z-10 select-none">
                <div className="text-xs text-stone-400 font-bold">
                  {!isOpeningSequence && revealedIndices.length === pullResults.length ? (
                    <span className="text-amber-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      {t('すべてのカプセルが開放されました！', 'All capsules have been revealed!')}
                    </span>
                  ) : (
                    <span>{t('カプセルをそれぞれタップして、何が出たかワクワクしながら覗いてみよう！', 'Tap each capsule to reveal its relatable prize!')}</span>
                  )}
                </div>

                <div className="flex gap-2 font-sans font-black text-xs">
                  {/* Reuse draw immediately if they have enough balance */}
                  {!isOpeningSequence && revealedIndices.length === pullResults.length && (
                    <button
                      onClick={() => {
                        const required = pullResults.length === 1 ? 100 : pullResults.length === 10 ? 900 : 4500;
                        if (state.coins < required) {
                          alert(t('地味コイン（GC）が足りないため、ショップで補充してください。', 'Not enough Gacha Coins. Please get some from the Promo Code center.'));
                          setShowGachaOverlay(false);
                          setShowCoinShop(true);
                          return;
                        }
                        triggerPullWithAnimation(pullResults.length);
                      }}
                      className="bg-white hover:bg-neutral-100 text-stone-950 font-black px-6 py-3 rounded-2xl shadow active:scale-95 transition-all cursor-pointer"
                    >
                      {t('もう一度引く', 'Draw again')} ({pullResults.length === 1 ? "100" : pullResults.length === 10 ? "900" : "4,500"} GC)
                    </button>
                  )}

                  <button
                    onClick={() => setShowGachaOverlay(false)}
                    className="bg-stone-800 hover:bg-stone-700 text-white font-black px-6 py-3 rounded-2xl shadow active:scale-95 transition-all border border-stone-700 cursor-pointer"
                  >
                    {t('レバー画面に戻る', 'Back to machine')}
                  </button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MAIN MODAL BODY (Expansive Size & Bento Redesign) --- */}
      <motion.div 
        id="jimi-gacha-modal-container"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className="relative bg-[#FCFAF7] w-full max-w-5xl h-[92vh] md:h-[86vh] rounded-[44px] shadow-2xl overflow-hidden flex flex-col border border-orange-100/60"
      >
        {/* Header */}
        <div className="p-6 md:p-8 bg-white border-b border-orange-100/65 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm border border-amber-200/40">🎰 {t('地味ガチャ', 'Jimicchi Gacha')}</span>
              <button 
                onClick={getFreeCoins}
                className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-200 font-bold hover:bg-indigo-100 transition shadow-inner"
                title="称号テスト用にデバッグコインを追加します（+1000 GC）"
              >
                +1000 GC
              </button>
            </div>
            <h3 className="text-2xl font-black text-orange-950 mt-1.5">{t('地味な毎日に、ちょっとだけ運。', 'A little luck in your relatable, everyday life.')}</h3>
            <p className="text-xs text-orange-500 font-semibold mt-1">
              {t('ガチャを回して、限定の二つ名パーツやクスッと笑える「おちゃめバッジ」をGETしよう！', 'Pull Gacha to get exclusive title parts and fun relatability badges!')}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-orange-50 hover:bg-orange-100 rounded-full transition-all text-orange-400 hover:text-orange-900 self-end sm:self-auto border border-orange-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Smart Centered Pill Navigation Tabs */}
        <div className="flex justify-center border-b border-orange-100/50 py-3 shrink-0 bg-white shadow-sm shadow-orange-900/5 z-10">
          <div className="flex bg-orange-50/70 p-1 rounded-2xl border border-orange-100/40 gap-1 sm:gap-2">
            <button
              onClick={() => { setActiveTab('play'); setPullResults([]); }}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                activeTab === 'play' 
                  ? "bg-white text-orange-950 shadow-sm font-black scale-102" 
                  : "text-slate-400 hover:text-orange-900 hover:bg-white/40"
              )}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              {t('ガチャを引く', 'Draw Gacha')}
            </button>
            <button
              onClick={() => { setActiveTab('exchange'); setPullResults([]); }}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                activeTab === 'exchange' 
                  ? "bg-white text-orange-950 shadow-sm font-black scale-102" 
                  : "text-slate-400 hover:text-orange-950 hover:bg-white/40"
              )}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", state.shards >= 500 && "animate-spin")} style={{ animationDuration: '6s' }} />
              {t('欠片交換所', 'Shards Exchange')}
            </button>
            <button
              onClick={() => { setActiveTab('rates'); setPullResults([]); }}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                activeTab === 'rates' 
                  ? "bg-white text-orange-950 shadow-sm font-black scale-102" 
                  : "text-slate-400 hover:text-orange-950 hover:bg-white/40"
              )}
            >
              <Info className="w-3.5 h-3.5" />
              {t('排出確率・カタログ', 'Rates & Catalog')}
            </button>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-orange-50/10">

          {/* TAB 1: DRAW PLAY (Redesigned as Dual-Column Dashboard) */}
          {activeTab === 'play' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start h-full pb-6">
              
              {/* Left Side Column: Arcade Game Cabinet Showcase */}
              <div className={cn(
                "lg:col-span-7 flex flex-col justify-center bg-white border border-orange-100/60 p-6 sm:p-8 rounded-[36px] shadow-sm relative h-full transition-transform duration-300",
                isShaking && "scale-[0.98]"
              )}>
                <div className="flex flex-col items-center justify-center space-y-6 pt-2 pb-4">
                  
                  {/* Campaign Selector if there are active pools */}
                  <div className="w-full bg-orange-50/55 border border-orange-100/60 p-4 rounded-3xl space-y-2 select-none text-left">
                    <label className="text-[10px] font-black text-orange-850 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-spin" style={{ animationDuration: '4s' }} /> {t('ガチャマシーンの切替', 'Select Gacha Capsule')}
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                      <button
                        type="button"
                        onClick={() => setSelectedPoolId('default')}
                        className={cn(
                          "w-full text-left p-3 rounded-2xl border flex items-center justify-between transition-all font-bold",
                          selectedPoolId === 'default'
                            ? "bg-white border-orange-400 text-orange-950 shadow-sm ring-2 ring-orange-500/10 font-bold"
                            : "bg-white/40 hover:bg-white border-orange-100 text-slate-500 font-semibold"
                        )}
                      >
                        <div>
                          <p className="text-xs font-black text-orange-950">{t('🔮 通常の地味ガチャマシーン', '🔮 General Gacha Machine')}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{t('すべての2つ名やバッジを狙える基本マシーン', 'Main machine targeting all title parts and badges.')}</p>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border">100 GC〜</span>
                      </button>

                      {pools.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPoolId(p.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-2xl border flex items-center justify-between transition-all font-bold relative overflow-hidden",
                            selectedPoolId === p.id
                              ? "bg-gradient-to-r from-amber-50 to-orange-50/10 border-orange-400 text-orange-950 shadow-sm ring-2 ring-orange-500/15 font-bold"
                              : "bg-white/40 hover:bg-white border-orange-100 text-slate-500 font-semibold"
                          )}
                        >
                          <div className="absolute top-0 right-0 bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-bl uppercase tracking-wider">
                            PICKUP!
                          </div>
                          <div>
                            <p className="text-xs font-black text-orange-950">🎰 {p.name}</p>
                            <p className="text-[10px] text-orange-600 mt-0.5 font-semibold">{p.description || t('開催中の限定ガチャプール！', 'In-progress limited Gacha pool!')}</p>
                          </div>
                          <span className="text-[10px] font-black text-white bg-orange-500 px-2 py-0.5 rounded-full shadow-sm">{p.cost1 ?? 100} GC〜</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Glass Globe Container with visual balls inside */}
                  <div 
                    id="gacha-globe-visual" 
                    className={cn(
                      "relative w-44 h-44 bg-gradient-to-b from-orange-50/10 via-amber-500/10 to-orange-400/20 border-4 border-orange-950 rounded-full overflow-hidden shadow-inner flex items-center justify-center transition-all duration-300",
                      isShaking && "gacha-cabinet-shake border-red-500 scale-105 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                    )}
                  >
                    <div className="absolute inset-0 bg-white/5 opacity-50 mix-blend-overlay pointer-events-none" />
                    
                    {/* Bouncing Capsule Spheres */}
                    <div className={cn("absolute w-6 h-6 rounded-full bg-rose-500 border border-orange-950 shadow-md top-12 left-10", isShaking ? "capsule-shuffle-1" : "animate-pulse")} />
                    <div className={cn("absolute w-6 h-6 rounded-full bg-amber-500 border border-orange-950 shadow-md top-14 left-24", isShaking && "capsule-shuffle-2")} />
                    <div className={cn("absolute w-6 h-6 rounded-full bg-purple-400 border border-orange-950 shadow-md top-20 left-16", isShaking && "capsule-shuffle-3")} />
                    <div className={cn("absolute w-6 h-6 rounded-full bg-emerald-400 border border-orange-950 shadow-md top-20 left-6", isShaking && "capsule-shuffle-1")} />
                    <div className={cn("absolute w-6 h-6 rounded-full bg-indigo-400 border border-orange-950 shadow-md top-24 left-28", isShaking && "capsule-shuffle-2")} />
                    <div className={cn("absolute w-6 h-6 rounded-full bg-sky-400 border border-orange-950 shadow-md top-28 left-14", isShaking && "capsule-shuffle-3")} />
                    <div className={cn("absolute w-6 h-6 rounded-full bg-rose-450 border border-orange-950 shadow-md top-26 left-22", isShaking && "capsule-shuffle-1")} />
                    <div className={cn("absolute w-6 h-6 rounded-full bg-yellow-400 border border-orange-950 shadow-md top-22 left-2", isShaking && "capsule-shuffle-2")} />
                    <div className={cn("absolute w-6 h-6 rounded-full bg-zinc-900 border border-rose-500 shadow-md top-28 left-8", isShaking && "capsule-shuffle-3")} />
                  </div>

                  {/* Twist dial stand */}
                  <div className="w-28 h-12 bg-orange-100/50 border-x-2 border-orange-950 mx-auto rounded-t-xl relative flex items-center justify-center -mt-5">
                    {/* Animatable dial twist handle */}
                    <motion.div
                      id="gacha-dial-handle"
                      animate={{ rotate: dialRotation }}
                      transition={{ type: 'spring', stiffness: 85, damping: 11 }}
                      whileHover={!pulling ? { scale: 1.08 } : {}}
                      whileTap={!pulling ? { scale: 0.9 } : {}}
                      className={cn(
                        "w-12 h-12 bg-white border-3 border-orange-950 rounded-full flex items-center justify-center cursor-pointer shadow-md select-none transition-colors",
                        pulling ? "cursor-not-allowed opacity-80" : "hover:bg-neutral-50"
                      )}
                      title={t("回転盤を回す", "Spin dial")}
                      onClick={() => !pulling && triggerPullWithAnimation(1)}
                    >
                      <div className="w-8 h-2 bg-orange-950 rounded-full absolute rotate-45" />
                      <div className="w-8 h-2 bg-orange-950 rounded-full absolute -rotate-45" />
                      <div className="w-4 h-4 bg-white border-2 border-orange-950 rounded-full z-10" />
                    </motion.div>
                  </div>

                  {/* Exiter chute */}
                  <div className="w-10 h-7 bg-orange-950 mx-auto rounded-t-xl -mt-0.5" />

                  {/* Status Tip */}
                  <div className="text-center">
                    <p className="text-[11px] font-extrabold text-orange-900 bg-orange-50/70 border border-orange-150 px-4 py-1.5 rounded-full inline-block leading-none select-none">
                      {pulling ? t("🎰 ガラガラ… 観測中", "🎰 Spinning... Observing!") : t("👈 ダイヤルか下のボタンを選んでね！", "👈 Spin dial or tap buttons below!")}
                    </p>
                  </div>

                  {/* Standard Cabinet Controls Grid */}
                  <div className={cn("grid grid-cols-1 gap-4 w-full pt-2", selectedPoolId === 'default' ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
                    
                    {/* Option 1: Single Draw */}
                    <motion.button 
                      id="btn-draw-gacha"
                      whileHover={(state.coins >= (selectedPoolId !== 'default' ? (pools.find(p => p.id === selectedPoolId)?.cost1 ?? 100) : 100)) && !pulling ? { scale: 1.03, y: -2 } : {}}
                      whileTap={(state.coins >= (selectedPoolId !== 'default' ? (pools.find(p => p.id === selectedPoolId)?.cost1 ?? 100) : 100)) && !pulling ? { scale: 0.95, y: 3 } : {}}
                      onClick={() => !pulling && triggerPullWithAnimation(1)}
                      disabled={(state.coins < (selectedPoolId !== 'default' ? (pools.find(p => p.id === selectedPoolId)?.cost1 ?? 100) : 100)) || pulling}
                      className={cn(
                        "p-4 rounded-3xl border-2 border-b-6 text-center flex flex-col items-center justify-between h-full group transition-all select-none font-bold",
                        state.coins >= (selectedPoolId !== 'default' ? (pools.find(p => p.id === selectedPoolId)?.cost1 ?? 100) : 100) 
                          ? "bg-stone-50 border-stone-200 border-b-stone-400 hover:bg-stone-100 text-stone-900 shadow-sm active:border-b-2" 
                          : "bg-stone-100/50 border-stone-150 text-stone-300 border-b-stone-200 cursor-not-allowed opacity-60",
                        pulling && "cursor-not-allowed opacity-70"
                      )}
                    >
                      <span className="text-[9px] font-black tracking-widest text-stone-400 uppercase">{t('単発おためし', 'Try once')}</span>
                      <span className="text-sm font-bold mt-1.5 flex items-center gap-1 text-stone-700">
                        <Play className="w-3.5 h-3.5 text-stone-600" /> {t('1回', 'Draw 1')}
                      </span>
                      <span className="mt-3 bg-stone-900 text-white group-hover:bg-stone-950 px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1 transition-colors shadow">
                        <Coins className="w-3.5 h-3.5 text-amber-300" />
                        {selectedPoolId !== 'default' ? (pools.find(p => p.id === selectedPoolId)?.cost1 ?? 100) : 100} GC
                      </span>
                    </motion.button>

                    {/* Option 2: 10 Pulls */}
                    <motion.button 
                      whileHover={(state.coins >= (selectedPoolId !== 'default' ? (pools.find(p => p.id === selectedPoolId)?.cost10 ?? 900) : 900)) && !pulling ? { scale: 1.03, y: -2 } : {}}
                      whileTap={(state.coins >= (selectedPoolId !== 'default' ? (pools.find(p => p.id === selectedPoolId)?.cost10 ?? 900) : 900)) && !pulling ? { scale: 0.95, y: 3 } : {}}
                      onClick={() => !pulling && triggerPullWithAnimation(10)}
                      disabled={(state.coins < (selectedPoolId !== 'default' ? (pools.find(p => p.id === selectedPoolId)?.cost10 ?? 900) : 900)) || pulling}
                      className={cn(
                        "p-4 rounded-3xl border-2 border-b-6 text-center flex flex-col items-center justify-between h-full group relative overflow-hidden transition-all select-none font-bold",
                        state.coins >= (selectedPoolId !== 'default' ? (pools.find(p => p.id === selectedPoolId)?.cost10 ?? 900) : 900) 
                          ? "bg-amber-50 border-amber-300 border-b-amber-500 hover:bg-amber-100/80 text-amber-950 shadow-md active:border-b-2" 
                          : "bg-amber-50/10 border-amber-100 border-b-amber-200 text-amber-200/60 cursor-not-allowed opacity-55",
                        pulling && "cursor-not-allowed opacity-75"
                      )}
                    >
                      <span className="absolute top-0 right-0 bg-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-bl uppercase tracking-widest select-none">{t('1回分お得!', '1 Roll Free!')}</span>
                      <span className="text-[9px] font-black tracking-widest text-amber-600/75 uppercase">{t('おまとめセット', 'Value Bundle')}</span>
                      <span className="text-sm font-black mt-1.5 flex items-center gap-1 text-amber-900">
                        🌟 {t('10連', 'Draw 10')}
                      </span>
                      <span className="mt-3 bg-amber-500 text-white group-hover:bg-amber-600 px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1 transition shadow-sm">
                        <Coins className="w-3.5 h-3.5 text-white" />
                        {selectedPoolId !== 'default' ? (pools.find(p => p.id === selectedPoolId)?.cost10 ?? 900) : 900} GC
                      </span>
                    </motion.button>

                    {/* Option 3: 50 Pulls */}
                    {selectedPoolId === 'default' && (
                      <motion.button 
                        whileHover={state.coins >= 4500 && !pulling ? { scale: 1.03, y: -2 } : {}}
                        whileTap={state.coins >= 4500 && !pulling ? { scale: 0.95, y: 3 } : {}}
                        onClick={() => !pulling && triggerPullWithAnimation(50)}
                        disabled={state.coins < 4500 || pulling}
                        className={cn(
                          "p-4 rounded-3xl border-2 border-b-6 text-center flex flex-col items-center justify-between h-full group relative overflow-hidden transition-all select-none font-bold",
                          state.coins >= 4500 
                            ? "bg-purple-50 border-purple-300 border-b-purple-500 hover:bg-purple-100 text-purple-950 shadow-lg active:border-b-2" 
                            : "bg-purple-50/10 border-purple-100 border-b-purple-200 text-purple-200/50 cursor-not-allowed opacity-55",
                          pulling && "cursor-not-allowed opacity-75"
                        )}
                      >
                        <span className="absolute top-0 right-0 bg-purple-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-bl uppercase tracking-widest select-none">{t('レア保証!', 'Rare Guaranteed!')}</span>
                        <span className="text-[9px] font-black tracking-widest text-purple-650/70 uppercase">{t('大人買い・極', 'Supreme Draw')}</span>
                        <span className="text-sm font-black mt-1.5 flex items-center gap-1 text-purple-900">
                          🔥 {t('50連', 'Draw 50')}
                        </span>
                        <span className="mt-3 bg-purple-600 text-white group-hover:bg-purple-700 px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1 transition shadow-sm">
                          <Coins className="w-3.5 h-3.5 text-white" />
                          4500 GC
                        </span>
                      </motion.button>
                    )}


                  </div>
                </div>
              </div>

              {/* Right Side Column: Smart User Dashboard & GC Quest Monitor */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* 1. Wallet Card */}
                <div className="bg-gradient-to-br from-orange-950 to-orange-900 border border-orange-950 p-6 rounded-[32px] text-white shadow-md relative overflow-hidden select-none">
                  {/* Visual ambient circles */}
                  <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full filter blur-xl pointer-events-none" />
                  <div className="absolute left-6 -bottom-6 w-16 h-16 bg-white/5 rounded-full filter blur-lg pointer-events-none" />
                  
                  <h4 className="text-[10px] font-black tracking-wider text-orange-200 uppercase">地味っち財布</h4>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-0.5">
                      <p className="text-[9px] text-orange-300 font-bold">手持ちコイン値</p>
                      <div className="flex items-center gap-1.5">
                        <Coins className="w-4.5 h-4.5 text-amber-400 shrink-0" />
                        <span className="text-xl font-black text-amber-300">{state ? state.coins : 0}</span>
                        <span className="text-[9px] font-black text-orange-200">GC</span>
                      </div>
                    </div>
                    <div className="space-y-0.5 border-l border-white/10 pl-4">
                      <p className="text-[9px] text-orange-300 font-bold">かぶり救済の欠片</p>
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4.5 h-4.5 text-purple-400 shrink-0" />
                        <span className="text-xl font-black text-purple-300">{state ? state.shards : 0}</span>
                        <span className="text-[9px] font-black text-orange-200">Shard</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-white/10 flex flex-col gap-2">
                    <button
                      onClick={() => setShowCoinShop(true)}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black text-xs py-2.5 rounded-xl transition duration-200 flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer animate-pulse"
                    >
                      <Coins className="w-3.5 h-3.5 fill-white text-amber-100" />
                      <span>配布コード受取・作成センター</span>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={handleAdminInfiniteCoins}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs py-2 px-4 rounded-xl transition duration-200 flex items-center justify-center gap-1.5 shadow-sm active:scale-95 border border-rose-500 cursor-pointer"
                        title="テスト用：無料・無限コインを獲得"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>管理者特典：無限コイン (無料)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Visual Pity Gauges */}
                <div className="bg-white border border-orange-100/50 p-5 rounded-[28px] shadow-sm space-y-4">
                  <h5 className="text-[11px] font-black text-orange-950 uppercase tracking-widest flex items-center justify-between select-none">
                    <span>天井メーター進捗</span>
                    <span className="text-[9px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100/30">天井機能あり</span>
                  </h5>

                  <div className="space-y-4.5">
                    {/* Rare Pity Progression bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-600">レア以上獲得保証</span>
                        <span className="text-slate-900 border px-1.5 py-0.2 bg-slate-50 rounded">あと <strong className="text-orange-950 text-[11px]">{pityTracker.nextRare}</strong> 回</span>
                      </div>
                      <div className="relative w-full h-2.5 bg-orange-50 border border-orange-100/10 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${rarePityPercent}%` }} 
                          className="absolute left-0 top-0 h-full bg-slate-800 rounded-full" 
                        />
                      </div>
                    </div>

                    {/* Legendary Pity Progression bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-600">レジェンダリー獲得保証</span>
                        <span className="text-slate-900 border px-1.5 py-0.2 bg-slate-50 rounded">あと <strong className="text-orange-950 text-[11px]">{pityTracker.nextLegendary}</strong> 回</span>
                      </div>
                      <div className="relative w-full h-2.5 bg-orange-50 border border-orange-100/10 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${legendaryPityPercent}%` }} 
                          className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Daily Missions Section */}
                <div className="bg-white border-2 border-amber-200/60 p-5 rounded-[28px] shadow-sm space-y-3.5 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-12 h-12 bg-amber-500/5 rounded-bl-full pointer-events-none" />
                  <h5 className="text-[12px] font-black text-orange-950 uppercase tracking-widest flex items-center gap-1.5 select-none">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>デイリーミッション (Daily Missions)</span>
                  </h5>
                  
                  <div className="space-y-3">
                    {/* Mission 1: Post 1 scene */}
                    {(() => {
                      const missionId = 'mission_post_1';
                      const reward = 30;
                      const target = 1;
                      const current = state.dailyPostsCount || 0;
                      const isCompleted = current >= target;
                      const isClaimed = !!state.dailyMissionsClaimed?.[missionId];
                      
                      return (
                        <div className="bg-orange-50/20 border border-orange-100/40 rounded-2xl p-3 flex justify-between items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-extrabold text-orange-950 flex items-center gap-1">
                              {isClaimed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <div className={cn(
                                  "w-4 h-4 rounded-full border shrink-0 flex items-center justify-center text-[10px] font-black",
                                  isCompleted ? "border-amber-400 bg-amber-50 text-amber-600" : "border-stone-300"
                                )}>
                                  {isCompleted && "✓"}
                                </div>
                              )}
                              <span>あるあるを1回投稿する</span>
                            </div>
                            <p className="text-[9px] text-stone-500 pl-5">
                              Post 1 scene ({Math.min(target, current)} / {target})
                            </p>
                          </div>
                          
                          <button
                            disabled={!isCompleted || isClaimed}
                            onClick={() => {
                              const newState = claimDailyMission(userId, missionId, reward);
                              setState(newState);
                              alert(`🎉 ミッション完了！${reward} GC を獲得しました！`);
                              if (onItemUnlocked) onItemUnlocked();
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer whitespace-nowrap",
                              isClaimed 
                                ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                                : isCompleted
                                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 animate-pulse"
                                  : "bg-orange-50 text-orange-400 border border-orange-100 cursor-not-allowed"
                            )}
                          >
                            {isClaimed ? "獲得済み" : isCompleted ? "受け取る" : `+${reward} GC`}
                          </button>
                        </div>
                      );
                    })()}

                    {/* Mission 2: Send 5 upvotes */}
                    {(() => {
                      const missionId = 'mission_upvote_5';
                      const reward = 15;
                      const target = 5;
                      const current = state.dailyUpvotesSentCount || 0;
                      const isCompleted = current >= target;
                      const isClaimed = !!state.dailyMissionsClaimed?.[missionId];
                      
                      return (
                        <div className="bg-orange-50/20 border border-orange-100/40 rounded-2xl p-3 flex justify-between items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-extrabold text-orange-950 flex items-center gap-1">
                              {isClaimed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <div className={cn(
                                  "w-4 h-4 rounded-full border shrink-0 flex items-center justify-center text-[10px] font-black",
                                  isCompleted ? "border-amber-400 bg-amber-50 text-amber-600" : "border-stone-300"
                                )}>
                                  {isCompleted && "✓"}
                                </div>
                              )}
                              <span>共感を5回送る</span>
                            </div>
                            <p className="text-[9px] text-stone-500 pl-5">
                              Send 5 upvotes ({Math.min(target, current)} / {target})
                            </p>
                          </div>
                          
                          <button
                            disabled={!isCompleted || isClaimed}
                            onClick={() => {
                              const newState = claimDailyMission(userId, missionId, reward);
                              setState(newState);
                              alert(`🎉 ミッション完了！${reward} GC を獲得しました！`);
                              if (onItemUnlocked) onItemUnlocked();
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer whitespace-nowrap",
                              isClaimed 
                                ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                                : isCompleted
                                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 animate-pulse"
                                  : "bg-orange-50 text-orange-400 border border-orange-100 cursor-not-allowed"
                            )}
                          >
                            {isClaimed ? "獲得済み" : isCompleted ? "受け取る" : `+${reward} GC`}
                          </button>
                        </div>
                      );
                    })()}

                    {/* Mission 3: Send 10 upvotes */}
                    {(() => {
                      const missionId = 'mission_upvote_10';
                      const reward = 30;
                      const target = 10;
                      const current = state.dailyUpvotesSentCount || 0;
                      const isCompleted = current >= target;
                      const isClaimed = !!state.dailyMissionsClaimed?.[missionId];
                      
                      return (
                        <div className="bg-orange-50/20 border border-orange-100/40 rounded-2xl p-3 flex justify-between items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-extrabold text-orange-950 flex items-center gap-1">
                              {isClaimed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <div className={cn(
                                  "w-4 h-4 rounded-full border shrink-0 flex items-center justify-center text-[10px] font-black",
                                  isCompleted ? "border-amber-400 bg-amber-50 text-amber-600" : "border-stone-300"
                                )}>
                                  {isCompleted && "✓"}
                                </div>
                              )}
                              <span>共感を10回送る</span>
                            </div>
                            <p className="text-[9px] text-stone-500 pl-5">
                              Send 10 upvotes ({Math.min(target, current)} / {target})
                            </p>
                          </div>
                          
                          <button
                            disabled={!isCompleted || isClaimed}
                            onClick={() => {
                              const newState = claimDailyMission(userId, missionId, reward);
                              setState(newState);
                              alert(`🎉 ミッション完了！${reward} GC を獲得しました！`);
                              if (onItemUnlocked) onItemUnlocked();
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer whitespace-nowrap",
                              isClaimed 
                                ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                                : isCompleted
                                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 animate-pulse"
                                  : "bg-orange-50 text-orange-400 border border-orange-100 cursor-not-allowed"
                            )}
                          >
                            {isClaimed ? "獲得済み" : isCompleted ? "受け取る" : `+${reward} GC`}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 3. Daily Coins Quota / Achievements (Very Smart Checklist) */}
                <div className="bg-orange-50/40 border border-orange-100/60 p-5 rounded-[28px] space-y-3.5">
                  <h5 className="text-[11px] font-black text-orange-950 uppercase tracking-widest flex items-center justify-between select-none">
                    <span>本日獲得可能なGCノルマ</span>
                    <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  </h5>
                  
                  <div className="space-y-2.5 text-xs text-orange-900 font-semibold">
                    {/* Daily Post Quota */}
                    <div className="bg-white border border-orange-100/30 rounded-2xl p-3 flex justify-between items-center shadow-sm">
                      <div className="space-y-0.5">
                        <div className="text-[10px] sm:text-[11px] font-black flex items-center gap-1.5 text-orange-950">
                          {state.dailyPostsCount >= 3 ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <div className="w-4 h-4 rounded-full border border-orange-200 shrink-0" />}
                          あるあるシーン投稿 ({state.dailyPostsCount || 0} / 3回)
                        </div>
                        <p className="text-[9px] text-orange-400 pl-5.5">1投稿につき +3 GC 獲得 (1日3回まで)</p>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black shrink-0",
                        (state.dailyPostsCount || 0) >= 3 ? "bg-emerald-100 text-emerald-700" : "bg-orange-50 text-orange-600"
                      )}>
                        {(state.dailyPostsCount || 0) >= 3 ? "完了" : `+${(3 - (state.dailyPostsCount || 0)) * 3} GC`}
                      </span>
                    </div>

                    {/* Daily Upvotes Sent Quota */}
                    <div className="bg-white border border-orange-100/30 rounded-2xl p-3 flex justify-between items-center shadow-sm">
                      <div className="space-y-0.5">
                        <div className="text-[10px] sm:text-[11px] font-black flex items-center gap-1.5 text-orange-950">
                          {state.dailyUpvotesSentCount >= 20 ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <div className="w-4 h-4 rounded-full border border-orange-200 shrink-0" />}
                          共感(Upvote)送信 ({state.dailyUpvotesSentCount || 0} / 20回)
                        </div>
                        <p className="text-[9px] text-orange-400 pl-5.5">1回につき +1 GC 獲得 (1日20回まで)</p>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black shrink-0",
                        (state.dailyUpvotesSentCount || 0) >= 20 ? "bg-emerald-100 text-emerald-700" : "bg-orange-50 text-orange-600"
                      )}>
                        {(state.dailyUpvotesSentCount || 0) >= 20 ? "完了" : `+${20 - (state.dailyUpvotesSentCount || 0)} GC`}
                      </span>
                    </div>

                    {/* Daily Upvotes Received Quota */}
                    <div className="bg-white border border-orange-100/30 rounded-2xl p-3 flex justify-between items-center shadow-sm">
                      <div className="space-y-0.5">
                        <div className="text-[10px] sm:text-[11px] font-black flex items-center gap-1.5 text-orange-950">
                          {state.dailyUpvotesReceivedCount >= 20 ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <div className="w-4 h-4 rounded-full border border-orange-200 shrink-0" />}
                          共感(Upvote)受信 ({state.dailyUpvotesReceivedCount || 0} / 20回)
                        </div>
                        <p className="text-[9px] text-orange-400 pl-5.5">あなたの投稿が共感されると 1回+2 GC</p>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black shrink-0",
                        (state.dailyUpvotesReceivedCount || 0) >= 20 ? "bg-emerald-100 text-emerald-700" : "bg-orange-50 text-orange-600"
                      )}>
                        {(state.dailyUpvotesReceivedCount || 0) >= 20 ? "完了" : `+${(20 - (state.dailyUpvotesReceivedCount || 0)) * 2} GC`}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: SHARDS CONVERT EXCHANGE (Smarter filtering & layout) */}
          {activeTab === 'exchange' && (
            <div className="space-y-6">
              
              {/* Guidance bento tip */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-2xl border border-purple-200/40 flex items-start gap-3 text-xs text-purple-950 font-bold leading-relaxed shadow-sm">
                <AlertCircle className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-extrabold text-purple-900 mb-0.5">🔄 被り救済システム（全排出対象）</p>
                  <p className="text-purple-800/80 leading-snug">
                    ガチャで所持済みのアイテムが重複排出される場合、自動的に<strong>「欠片（Shard）」</strong>（称号: 5個, バッジ: 10個）に還元されます。<br/>
                    欠片 <strong>500個</strong> を消費することで、未獲得のガチャパーツから <strong>好きなアイテムを選択して100%確実に交換解放</strong> できます！
                  </p>
                </div>
              </div>

              {/* Extremely Smart Filter Header row */}
              <div className="bg-white border border-orange-100/60 p-4 rounded-3xl shadow-inner flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between text-xs font-bold font-sans">
                
                {/* Search query input */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-300 pointer-events-none" />
                  <input 
                    type="text"
                    value={exchangeSearchQuery}
                    onChange={(e) => setExchangeSearchQuery(e.target.value)}
                    placeholder="アイテム名で検索..."
                    className="w-full bg-orange-50/50 border border-orange-100/30 rounded-xl py-2 pl-9 pr-4 text-orange-950 placeholder:text-orange-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>

                {/* Sub-item categories */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[9px] uppercase font-black text-slate-400 mr-1 hidden sm:inline select-none">種別:</span>
                  <button 
                    onClick={() => setExchangeTypeFilter('all')} 
                    className={cn("px-3 py-1.5 rounded-xl text-[11px] font-bold border transition", exchangeTypeFilter === 'all' ? "bg-orange-500 border-orange-500 text-white" : "bg-orange-50/20 border-orange-100 text-slate-500 hover:bg-orange-50")}
                  >
                    すべて
                  </button>
                  <button 
                    onClick={() => setExchangeTypeFilter('prefix')} 
                    className={cn("px-3 py-1.5 rounded-xl text-[11px] font-bold border transition", exchangeTypeFilter === 'prefix' ? "bg-orange-500 border-orange-500 text-white" : "bg-orange-50/20 border-orange-100 text-slate-500 hover:bg-orange-50")}
                  >
                    前部称号
                  </button>
                  <button 
                    onClick={() => setExchangeTypeFilter('suffix')} 
                    className={cn("px-3 py-1.5 rounded-xl text-[11px] font-bold border transition", exchangeTypeFilter === 'suffix' ? "bg-orange-500 border-orange-500 text-white" : "bg-orange-50/20 border-orange-100 text-slate-500 hover:bg-orange-50")}
                  >
                    後部称号
                  </button>
                  <button 
                    onClick={() => setExchangeTypeFilter('badge')} 
                    className={cn("px-3 py-1.5 rounded-xl text-[11px] font-bold border transition", exchangeTypeFilter === 'badge' ? "bg-orange-500 border-orange-500 text-white" : "bg-orange-50/20 border-orange-100 text-slate-500 hover:bg-orange-50")}
                  >
                    バッジ
                  </button>
                </div>

                {/* Own lock/unlock filters */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[9px] uppercase font-black text-slate-400 mr-1 hidden sm:inline select-none">状態:</span>
                  <button 
                    onClick={() => setExchangeOwnFilter('all')} 
                    className={cn("px-3 py-1.5 rounded-xl text-[11px] font-bold border transition", exchangeOwnFilter === 'all' ? "bg-slate-800 border-slate-800 text-white" : "bg-orange-50/20 border-orange-100 text-slate-500 hover:bg-orange-50")}
                  >
                    すべて
                  </button>
                  <button 
                    onClick={() => setExchangeOwnFilter('locked')} 
                    className={cn("px-3 py-1.5 rounded-xl text-[11px] font-bold border transition", exchangeOwnFilter === 'locked' ? "bg-slate-800 border-slate-800 text-white" : "bg-orange-50/20 border-orange-100 text-slate-500 hover:bg-orange-50")}
                  >
                    未獲得のみ
                  </button>
                  <button 
                    onClick={() => setExchangeOwnFilter('unlocked')} 
                    className={cn("px-3 py-1.5 rounded-xl text-[11px] font-bold border transition", exchangeOwnFilter === 'unlocked' ? "bg-slate-800 border-slate-800 text-white" : "bg-orange-50/20 border-orange-100 text-slate-500 hover:bg-orange-50")}
                  >
                    獲得済み
                  </button>
                </div>

              </div>

              {/* Items Grid */}
              {filteredExchangeItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
                  {filteredExchangeItems.map((item) => {
                    const unlocked = item.type === 'prefix' 
                      ? state.unlockedPrefixIds.includes(item.id) 
                      : item.type === 'suffix' 
                        ? state.unlockedSuffixIds.includes(item.id) 
                        : state.unlockedBadgeIds.includes(item.id);

                    const rarityColor = rarityColorMap[item.rarity];

                    return (
                      <div 
                        key={item.id} 
                        className={cn(
                          "p-4 rounded-3xl border bg-white flex flex-col justify-between space-y-3.5 shadow-sm hover:shadow-md transition duration-200 group relative",
                          unlocked ? "opacity-55 border-slate-100" : "border-slate-200/80"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2 text-xs font-bold">
                            {item.emoji ? (
                              <span className="text-2xl shrink-0 filter group-hover:scale-110 transition duration-200 select-none">{item.emoji}</span>
                            ) : (
                              <Bookmark className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                            )}
                            <div className="text-orange-950 font-black leading-snug" title={item.name}>
                              {item.type === 'prefix' && <span className="text-[8px] opacity-40 block font-normal">前部称号</span>}
                              {item.type === 'suffix' && <span className="text-[8px] opacity-40 block font-normal">後部称号</span>}
                              {item.type === 'badge' && <span className="text-[8px] opacity-40 block font-normal">おちゃめバッジ</span>}
                              <span className="font-extrabold text-[13px]">{item.name}</span>
                            </div>
                          </div>

                          <span className={cn("text-[7px] uppercase tracking-wider font-extrabold select-none px-2 py-0.5 border rounded-full shadow-sm", rarityColor)}>
                            {item.rarity}
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-dotted border-orange-100 pt-3 flex-wrap gap-2">
                          {unlocked ? (
                            <span className="text-[10px] font-bold text-slate-400 italic">解放済み</span>
                          ) : (
                            <div className="flex items-center gap-1 font-black text-xs text-purple-800">
                              <Sparkles className="w-3.5 h-3.5 text-purple-500 fill-purple-100" />
                              <span>500 欠片</span>
                            </div>
                          )}

                          <button
                            onClick={() => handleExchange(item)}
                            disabled={unlocked || state.shards < 500}
                            className={cn(
                              "text-[10px] font-black px-4 py-2 rounded-xl transition duration-200 text-center shadow-sm hover:shadow-md",
                              unlocked 
                                ? "bg-slate-50 border border-slate-100 text-slate-300 pointer-events-none shadow-none" 
                                : state.shards >= 500 
                                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-95 text-white" 
                                  : "bg-purple-100/50 text-purple-300 border border-purple-100/10 pointer-events-none shadow-none"
                            )}
                          >
                            交換
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white border rounded-[32px] p-16 text-center shadow-sm">
                  <p className="text-sm font-bold text-orange-250 italic">該当するアイテムが見つかりませんでした。</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SHOW PROBABILITIES & DETAILED CATEGORY LISTING */}
          {activeTab === 'rates' && (
            <div className="space-y-6 pb-6">
              
              {/* Star header description */}
              <div className="bg-white border border-orange-100/55 p-5 sm:p-6 rounded-[32px] space-y-4 shadow-sm">
                <h5 className="text-sm font-black text-slate-800 flex items-center gap-2 select-none">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-300" />
                  排出確率について（ステータス差なし）
                </h5>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  地味っちのガチャは、ユーザー間の競争や優劣を生む「ステータス上昇効果」などは一切ありません。<br/>
                  純粋に二つ名（称号）を自分らしく組み立ててプロフィールに配置したり、おちゃめなバッジを増やして日常の些細な共感時間をより楽しむためのアバター限定枠です。
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {Object.entries(rarityNameMap).map(([rarity, label]) => {
                    const rarityColor = rarityColorMap[rarity as GachaItem['rarity']];
                    return (
                      <div key={rarity} className={cn("p-2.5 border rounded-xl flex items-center justify-between text-[11px] font-bold shadow-inner", rarityColor)}>
                        <span className="capitalize">{rarity}</span>
                        <span>{label.split(' ')[1]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Smart filters for Catalog */}
              <div className="bg-white border border-orange-100 p-4 rounded-3xl flex flex-col md:flex-row gap-3 md:items-center justify-between text-xs font-bold">
                
                {/* Rarity filter */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[9px] uppercase font-black text-slate-400 mr-1 select-none">レア度別:</span>
                  {(['all', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const).map(rarity => (
                    <button
                      key={rarity}
                      onClick={() => setCatalogRarityFilter(rarity)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-[10px] font-black capitalize transition-all border",
                        catalogRarityFilter === rarity
                          ? "bg-orange-500 border-orange-500 text-white"
                          : "bg-orange-50/20 border-orange-100 text-slate-500 hover:bg-orange-50"
                      )}
                    >
                      {rarity === 'all' ? 'すべて' : rarity}
                    </button>
                  ))}
                </div>

                {/* Ownership stats */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase font-black text-slate-400 mr-1 select-none">収集ステータス:</span>
                  <button
                    onClick={() => setCatalogOwnFilter('all')}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-[10px] font-black border transition",
                      catalogOwnFilter === 'all' ? "bg-slate-800 border-slate-800 text-white" : "bg-orange-50/20 border-orange-100 text-slate-500 hover:bg-orange-50"
                    )}
                  >
                    すべて
                  </button>
                  <button
                    onClick={() => setCatalogOwnFilter('locked')}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-[10px] font-black border transition",
                      catalogOwnFilter === 'locked' ? "bg-slate-800 border-slate-800 text-white" : "bg-orange-50/20 border-orange-100 text-slate-500 hover:bg-orange-50"
                    )}
                  >
                    未解放のみ
                  </button>
                  <button
                    onClick={() => setCatalogOwnFilter('unlocked')}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-[10px] font-black border transition",
                      catalogOwnFilter === 'unlocked' ? "bg-slate-800 border-slate-800 text-white" : "bg-orange-50/20 border-orange-100 text-slate-500 hover:bg-orange-50"
                    )}
                  >
                    所持分のみ
                  </button>
                </div>

              </div>

              {/* Items directory listing grouped by visual rarity block */}
              <div className="space-y-4">
                {(['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'] as GachaItem['rarity'][]).map(rarityGroup => {
                  let groupItems = GACHA_POOL.filter(item => item.rarity === rarityGroup);
                  
                  // Apply catalog filters
                  if (catalogRarityFilter !== 'all' && catalogRarityFilter !== rarityGroup) return null;
                  
                  if (catalogOwnFilter !== 'all') {
                    groupItems = groupItems.filter(item => {
                      const isOwn = item.type === 'prefix' 
                        ? state.unlockedPrefixIds.includes(item.id) 
                        : item.type === 'suffix' 
                          ? state.unlockedSuffixIds.includes(item.id) 
                          : state.unlockedBadgeIds.includes(item.id);
                      return catalogOwnFilter === 'unlocked' ? isOwn : !isOwn;
                    });
                  }

                  if (groupItems.length === 0) return null;
                  const groupColorClass = rarityColorMap[rarityGroup];
                  
                  return (
                    <div key={rarityGroup} className="border border-slate-100 rounded-3xl p-4 sm:p-5 bg-white shadow-sm space-y-3">
                      <div className="flex justify-between items-center border-b border-orange-100/30 pb-2">
                        <span className={cn("text-[9px] font-black px-2.5 py-0.5 rounded shadow-sm", groupColorClass)}>
                          {rarityGroup}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">全 {groupItems.length} 種</span>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs pt-1">
                        {groupItems.map(item => {
                          const isOwn = item.type === 'prefix' 
                            ? state.unlockedPrefixIds.includes(item.id) 
                            : item.type === 'suffix' 
                              ? state.unlockedSuffixIds.includes(item.id) 
                              : state.unlockedBadgeIds.includes(item.id);

                          return (
                            <span 
                              key={item.id}
                              className={cn(
                                "px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 border transition-colors",
                                isOwn 
                                  ? "bg-orange-50 border-orange-200 text-orange-950 font-black shadow-inner" 
                                  : "bg-slate-50 border-slate-150 text-slate-350"
                              )}
                            >
                              {item.emoji && <span className={isOwn ? '' : 'grayscale opacity-50'}>{item.emoji}</span>}
                              {item.type === 'prefix' && <span className="opacity-40 text-[9px] mr-0.5">{t('前:', 'Pre:')}</span>}
                              {item.type === 'suffix' && <span className="opacity-40 text-[9px] mr-0.5">{t('後:', 'Suf:')}</span>}
                              <span>{getGachaItemName(item)}</span>
                              {isOwn && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-1" />}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 md:p-8 bg-white border-t border-orange-100/70 flex justify-between items-center shrink-0 text-xs text-orange-400 font-bold select-none">
          <span className="hidden sm:inline">あるある投稿や他者共感でコイン(GC)をためて回しましょう！</span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 font-black text-white rounded-2xl shadow-md transition transform hover:scale-[1.01] active:scale-95 text-xs font-black cursor-pointer"
          >
            閉じる
          </button>
        </div>

      </motion.div>

      {/* Gift / Distribution Code Center Nested Overlay */}
      <AnimatePresence>
        {showCoinShop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-orange-950/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 font-sans select-none"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl border border-orange-100 flex flex-col max-h-[90vh]"
            >
              <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-orange-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl text-white shadow-sm">
                    <Coins className="w-5 h-5 fill-amber-100" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-orange-950">地味っち配布コードセンター</h3>
                    <p className="text-[10px] text-orange-600 font-bold mt-0.5">コイン(GC)の受け取り・お友だちへの配布</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCoinShop(false);
                    setGiftClaimMessage(null);
                    setGiftCodeInput('');
                    setNewlyCreatedCode('');
                    setCreateError('');
                  }}
                  className="p-2 bg-white hover:bg-orange-50 rounded-full transition text-orange-400 hover:text-orange-900 border border-orange-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Inner Tabs */}
              <div className="bg-orange-50/40 p-2 flex border-b border-orange-100 shrink-0 gap-1 font-bold">
                <button
                  onClick={() => setGiftCenterTab('claim')}
                  className={cn(
                    "flex-1 py-1.5 rounded-xl text-xs transition duration-200 cursor-pointer",
                    giftCenterTab === 'claim' ? "bg-white text-orange-950 shadow-sm" : "text-orange-400 hover:bg-white/50"
                  )}
                >
                  コードの受取🎁
                </button>
                <button
                  onClick={() => setGiftCenterTab('create')}
                  className={cn(
                    "flex-1 py-1.5 rounded-xl text-xs transition duration-200 cursor-pointer",
                    giftCenterTab === 'create' ? "bg-white text-orange-950 shadow-sm" : "text-orange-400 hover:bg-white/50"
                  )}
                >
                  コードの発行✉️
                </button>
                <button
                  onClick={() => setGiftCenterTab('my_codes')}
                  className={cn(
                    "flex-1 py-1.5 rounded-xl text-xs transition duration-200 cursor-pointer",
                    giftCenterTab === 'my_codes' ? "bg-white text-orange-950 shadow-sm" : "text-orange-400 hover:bg-white/50"
                  )}
                >
                  発行履歴・追跡🗂️ ({myCodes.length})
                </button>
              </div>

              {/* Scrollable Main Content area */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1 text-left">
                
                {/* TAB 1: CODE CLAIM */}
                {giftCenterTab === 'claim' && (
                  <div className="space-y-4 animate-in fade-in duration-100">
                    <p className="text-xs text-orange-850 bg-amber-50/50 p-4 rounded-2xl border border-amber-100/70 leading-relaxed font-bold">
                      運営イベントやお友達から受け取った「配布コード」を入力すると、即座に地味コイン(GC)があなたの財布に加算されます。
                    </p>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-orange-400 block whitespace-nowrap ml-1 uppercase">
                        コード入力 (例: G7XP-KQ2M-V8RW)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={giftCodeInput}
                          onChange={(e) => setGiftCodeInput(e.target.value)}
                          placeholder="英数字 12文字ハイフン区切り"
                          className="flex-grow bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition font-mono uppercase font-black"
                          disabled={isClaiming}
                        />
                        <button
                          disabled={isClaiming || !giftCodeInput.trim()}
                          onClick={handleClaimCode}
                          className={cn(
                            "px-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 font-extrabold text-xs text-white rounded-2xl shadow-sm transition active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer",
                            (isClaiming || !giftCodeInput.trim()) && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {isClaiming ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>受け取る</span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Result Alerts */}
                    {giftClaimMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-4 rounded-2xl border text-xs leading-relaxed font-bold whitespace-pre-line",
                          giftClaimMessage.type === 'success' 
                            ? "bg-emerald-50 border-emerald-100 text-emerald-950" 
                            : "bg-rose-50 border-rose-150 text-rose-950"
                        )}
                      >
                        <p>{giftClaimMessage.text}</p>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* TAB 2: CODE CREATE */}
                {giftCenterTab === 'create' && (
                  <div className="space-y-4 animate-in fade-in duration-100">
                    <p className="text-xs text-orange-850 bg-amber-50/50 p-4 rounded-2xl border border-amber-100/70 leading-relaxed font-bold">
                      手持ちの地味コイン(GC)をプレゼント用にロックし、URL感覚で共有可能なコードを発行します。（※運営者の発行はGCを消費しません）
                    </p>

                    {newlyCreatedCode ? (
                      <div className="bg-emerald-50/60 border border-emerald-100 p-5 rounded-3xl text-center space-y-3 animate-in zoom-in duration-200">
                        <span className="text-2xl">🎉</span>
                        <h4 className="text-sm font-black text-emerald-950">配布コードを発行しました！</h4>
                        <p className="text-xs text-emerald-800 leading-relaxed font-bold">
                          以下のコードをコピーして対象のユーザーやお友達に伝えてください。
                        </p>
                        <div className="bg-white border text-emerald-900 border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4 font-mono select-all">
                          <span className="text-lg font-black tracking-widest">{newlyCreatedCode}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(newlyCreatedCode);
                              alert('📋 コードをクリップボードにコピーしました！');
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-xl transition cursor-pointer"
                          >
                            コピー
                          </button>
                        </div>
                        <button
                          onClick={() => setNewlyCreatedCode('')}
                          className="text-xs block mx-auto text-emerald-700 font-blacks underline cursor-pointer pt-1"
                        >
                          新しく別のコードを作成する
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Selector GC per Person */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-orange-400 block whitespace-nowrap ml-1 uppercase">
                            1人あたりの配布金額 (GC)
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {[50, 100, 200, 500].map((v) => (
                              <button
                                key={v}
                                onClick={() => setCreateRewardGc(v)}
                                className={cn(
                                  "py-2 px-1 border rounded-xl text-center text-xs font-black transition cursor-pointer",
                                  createRewardGc === v 
                                    ? "bg-orange-500 border-orange-500 text-white" 
                                    : "bg-slate-50 border-slate-200 text-orange-950 hover:bg-orange-50/50"
                                )}
                              >
                                {v} GC
                              </button>
                            ))}
                          </div>
                          <input
                            type="number"
                            value={createRewardGc}
                            onChange={(e) => setCreateRewardGc(Math.max(1, parseInt(e.target.value) || 0))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-amber-500 outline-none transition font-sans font-black text-right pr-6"
                            placeholder="自由入力 (GC)"
                            min={1}
                          />
                        </div>

                        {/* Selector Max claims (定員) */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-orange-400 block whitespace-nowrap ml-1 uppercase">
                            何名に配布しますか？ (定員)
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {[1, 3, 5, 10].map((v) => (
                              <button
                                key={v}
                                onClick={() => setCreateMaxUses(v)}
                                className={cn(
                                  "py-2 px-1 border rounded-xl text-center text-xs font-black transition cursor-pointer",
                                  createMaxUses === v 
                                    ? "bg-orange-500 border-orange-500 text-white" 
                                    : "bg-slate-50 border-slate-200 text-orange-950 hover:bg-orange-50/50"
                                )}
                              >
                                {v}人分
                              </button>
                            ))}
                          </div>
                          <input
                            type="number"
                            value={createMaxUses}
                            onChange={(e) => setCreateMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-amber-500 outline-none transition font-sans font-black text-right pr-6"
                            placeholder="自由入力 (回数)"
                            min={1}
                          />
                        </div>

                        {/* Optional filters */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-orange-400 block ml-0.5 uppercase">
                              配布キャンペーン名 / 備考 (任意)
                            </label>
                            <input
                              type="text"
                              value={createCampaignName}
                              onChange={(e) => setCreateCampaignName(e.target.value)}
                              placeholder="例: Twitterお年玉企画"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-orange-400 block ml-0.5 uppercase">
                              対象UID限定 (特定プレイヤーのみ)
                            </label>
                            <input
                              type="text"
                              value={createTargetUid}
                              onChange={(e) => setCreateTargetUid(e.target.value)}
                              placeholder="特定のUIDのみ受け取り可能"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                            />
                          </div>
                        </div>

                        {/* Budget Calculations & Errors */}
                        <div className="p-3 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-between text-xs font-bold font-sans">
                          <span className="text-orange-500">合計消費予算額:</span>
                          <span className="text-orange-950 text-base font-extrabold">{isAdmin ? 0 : createRewardGc * createMaxUses} GC {isAdmin && <span className="text-[10px] text-rose-500 ml-1 font-black">(管理者無料)</span>}</span>
                        </div>

                        {createError && (
                          <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-2xl font-bold font-sans leading-relaxed">
                            {createError}
                          </div>
                        )}

                        <button
                          disabled={isCreatingCode}
                          onClick={handleCreateCode}
                          className="w-full py-3.5 bg-orange-950 hover:bg-orange-900 font-black text-xs text-white rounded-2xl shadow-md transition active:scale-95 block text-center cursor-pointer disabled:opacity-50 font-bold"
                        >
                          {isCreatingCode ? 'コード発行を申請中...' : `上記内容で配布コードを発行する (-${isAdmin ? 0 : createRewardGc * createMaxUses} GC)`}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: MY CODES */}
                {giftCenterTab === 'my_codes' && (
                  <div className="space-y-4 animate-in fade-in duration-100">
                    <p className="text-xs text-orange-850 leading-relaxed font-bold">
                      これまでにあなたが発行した配布コードの受取進捗や残回数をリアルタイムに追跡できます。配り終えたコードの削除や停止が可能です。
                    </p>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {myCodes.map((item) => {
                        const usageRatio = `${item.used_count || 0}/${item.max_uses || 1}`;
                        const isFinished = (item.used_count || 0) >= (item.max_uses || 1);
                        return (
                          <div
                            key={item.id}
                            className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs font-sans text-orange-950 space-y-2 border border-slate-200"
                          >
                            <div className="flex justify-between items-center">
                              <span className="bg-slate-200 text-slate-800 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                                {item.code}
                              </span>
                              <div className="flex gap-2">
                                <span className={cn(
                                  "px-2 py-0.5 text-[8.5px] rounded-full font-extrabold select-none",
                                  item.active && !isFinished ? "bg-emerald-100 text-emerald-800" : "bg-zinc-150 text-zinc-500"
                                )}>
                                  {isFinished ? '完了' : item.active ? 'アクティブ' : '一時停止'}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-orange-850 font-medium">
                              <div>単価: <span className="font-extrabold">{item.reward_gc} GC</span></div>
                              <div>進捗: <span className="font-extrabold">{usageRatio} 獲得済</span></div>
                              <div className="col-span-2 text-[8.5px] text-slate-400 mt-1 truncate">
                                備考: {item.campaign_name || 'なし'} {item.target_uid ? `(制限: ${item.target_uid})` : ''}
                              </div>
                            </div>

                            <div className="flex gap-2 justify-end pt-2 border-t border-slate-250/20">
                              <button
                                onClick={() => handleToggleCodeActive(item.id, item.active)}
                                className={cn(
                                  "px-3 py-1 bg-white border font-bold text-[9px] rounded-xl transition cursor-pointer shrink-0",
                                  item.active ? "border-slate-300 text-amber-600 hover:bg-slate-100" : "border-amber-300 text-emerald-700 hover:bg-amber-50"
                                )}
                              >
                                {item.active ? '停止' : '再開'}
                              </button>
                              <button
                                onClick={() => handleDeleteCode(item.id)}
                                className="px-3 py-1 bg-white border border-rose-200 text-rose-600 font-bold text-[9px] rounded-xl hover:bg-rose-50 transition cursor-pointer shrink-0"
                              >
                                削除
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {myCodes.length === 0 && (
                        <p className="text-center py-10 text-[11px] text-slate-400 font-bold select-none">
                          あなたが作成した配布コードはまだありません。
                        </p>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Center Footer row */}
              <div className="p-4 bg-orange-50/50 border-t border-orange-100 flex justify-between items-center text-xs font-bold font-sans shrink-0">
                <div className="text-[10px] text-orange-500">
                  現在、コイン販売は停止中です。
                </div>
                <button
                  onClick={() => {
                    setShowCoinShop(false);
                    setGiftClaimMessage(null);
                    setGiftCodeInput('');
                    setNewlyCreatedCode('');
                    setCreateError('');
                  }}
                  className="bg-orange-950 hover:bg-orange-900 text-white px-5 py-2 rounded-xl transition cursor-pointer"
                >
                  閉じる
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
