// Gacha Store Utility for Jimi Gacha
import { Badge, TitlePart, TITLE_PREFIXES, TITLE_SUFFIXES, BADGES } from './badgeUtils';
import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';

export interface GachaItem {
  id: string;
  name: string;
  emoji?: string;
  type: 'prefix' | 'suffix' | 'badge';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
}

export interface PullResult {
  item: GachaItem;
  isDuplicate: boolean;
  shardsGained: number; // Duplicates: 5 for title, 10 for badge
}

export interface GachaState {
  coins: number;
  shards: number;
  pityCount: number; // Tracks pulls until next pity
  unlockedPrefixIds: string[];
  unlockedSuffixIds: string[];
  unlockedBadgeIds: string[];
  dailyPostsCount: number; // max 3/day
  dailyUpvotesSentCount: number; // max 20/day
  dailyUpvotesReceivedCount: number; // max 20/day
  lastActionDate: string; // YYYY-MM-DD
  lastLoginDate?: string; // YYYY-MM-DD
  loginStreak?: number;
  dailyMissionsClaimed?: Record<string, boolean>;
}

// Map of Gacha items with their rarities
export const GACHA_POOL: GachaItem[] = [
  // Badges
  { id: 'badge_gacha_socks', name: '靴下片方ない', emoji: '🧦', type: 'badge', rarity: 'common' },
  { id: 'badge_gacha_stone', name: '特にない', emoji: '🗿', type: 'badge', rarity: 'uncommon' },
  { id: 'badge_gacha_sofa', name: 'ソファの主', emoji: '🛋️', type: 'badge', rarity: 'rare' },
  { id: 'badge_gacha_antenna', name: '電波1本', emoji: '📡', type: 'badge', rarity: 'rare' },
  { id: 'badge_gacha_owl', name: '深夜管理人', emoji: '🦉', type: 'badge', rarity: 'epic' },
  { id: 'badge_gacha_bread', name: 'トースト成功', emoji: '🍞', type: 'badge', rarity: 'epic' },
  { id: 'badge_gacha_starry', name: 'なんかエモい', emoji: '🌌', type: 'badge', rarity: 'legendary' },
  { id: 'badge_gacha_crown', name: '地味王候補', emoji: '👑', type: 'badge', rarity: 'legendary' },

  // --- 新バッジ (アンコモン) ---
  { id: 'badge_gacha_yofukashi_nintei', name: '夜更かし認定', emoji: '🌙', type: 'badge', rarity: 'uncommon' },
  { id: 'badge_gacha_nurui_coffee', name: 'ぬるいコーヒー', emoji: '☕', type: 'badge', rarity: 'uncommon' },
  { id: 'badge_gacha_chisai_radio', name: '小さいラジオ', emoji: '📻', type: 'badge', rarity: 'uncommon' },
  { id: 'badge_gacha_nanka_mita_kagami', name: 'なんか見た鏡', emoji: '🪞', type: 'badge', rarity: 'uncommon' },
  { id: 'badge_gacha_sofa_kotei', name: 'ソファ固定席', emoji: '🛋️', type: 'badge', rarity: 'uncommon' },
  { id: 'badge_gacha_aita_mama_hon', name: '開いたまま本', emoji: '📚', type: 'badge', rarity: 'uncommon' },
  { id: 'badge_gacha_kori_nokori', name: '氷1個残り', emoji: '🧊', type: 'badge', rarity: 'uncommon' },
  { id: 'badge_gacha_hanbun_fusen', name: '半分終わった付箋', emoji: '📌', type: 'badge', rarity: 'uncommon' },

  // --- 新バッジ (レア) ---
  { id: 'badge_gacha_sasatta_ya', name: '刺さった矢', emoji: '🎯', type: 'badge', rarity: 'rare' },
  { id: 'badge_gacha_chisai_nami', name: '小さい波', emoji: '🌊', type: 'badge', rarity: 'rare' },
  { id: 'badge_gacha_shinya_bangumi', name: '深夜番組', emoji: '📺', type: 'badge', rarity: 'rare' },
  { id: 'badge_gacha_yoru_owl', name: '夜フクロウ', emoji: '🦉', type: 'badge', rarity: 'rare' },
  { id: 'badge_gacha_nazo_coin', name: '謎コイン', emoji: '🪙', type: 'badge', rarity: 'rare' },
  { id: 'badge_gacha_katamimi_earphone', name: '片耳イヤホン', emoji: '🎧', type: 'badge', rarity: 'rare' },
  { id: 'badge_gacha_chisai_ginga', name: '小さい銀河', emoji: '🌌', type: 'badge', rarity: 'rare' },
  { id: 'badge_gacha_kosan_ticket', name: '古参チケット', emoji: '🎫', type: 'badge', rarity: 'rare' },

  // --- 新バッジ (エピック) ---
  { id: 'badge_gacha_empathy_dna', name: '共感DNA', emoji: '🧬', type: 'badge', rarity: 'epic' },
  { id: 'badge_gacha_sho_wakusei', name: '小惑星', emoji: '🪐', type: 'badge', rarity: 'epic' },
  { id: 'badge_gacha_hikaru_no', name: '光る脳', emoji: '🧠', type: 'badge', rarity: 'epic' },
  { id: 'badge_gacha_kami_wand', name: '紙の王冠', emoji: '🪄', type: 'badge', rarity: 'epic' },
  { id: 'badge_gacha_shinya_denpa', name: '深夜電波', emoji: '📡', type: 'badge', rarity: 'epic' },
  { id: 'badge_gacha_furui_film', name: '古いフィルム', emoji: '🎞️', type: 'badge', rarity: 'epic' },
  { id: 'badge_gacha_glass_cho', name: 'ガラス蝶', emoji: '🦋', type: 'badge', rarity: 'epic' },
  { id: 'badge_gacha_ochiru_ryusei', name: '落ちる流星', emoji: '🌠', type: 'badge', rarity: 'epic' },

  // --- 新バッジ (レジェンダリー) ---
  { id: 'badge_gacha_kami_okan', name: '紙王冠', emoji: '👑', type: 'badge', rarity: 'legendary' },
  { id: 'badge_gacha_kodai_arch', name: '古代アーチ', emoji: '🏛️', type: 'badge', rarity: 'legendary' },
  { id: 'badge_gacha_hane_pen', name: '羽ペン', emoji: '🪶', type: 'badge', rarity: 'legendary' },
  { id: 'badge_gacha_mangetsu', name: '満月', emoji: '🌕', type: 'badge', rarity: 'legendary' },
  { id: 'badge_gacha_akanai_kagi', name: '開かない鍵', emoji: '🗝️', type: 'badge', rarity: 'legendary' },
  { id: 'badge_gacha_himitsu_no_kami', name: '秘密の紙', emoji: '📜', type: 'badge', rarity: 'legendary' },
  { id: 'badge_gacha_anaaki_kinka', name: '穴あき金貨', emoji: '🪙', type: 'badge', rarity: 'legendary' },
  { id: 'badge_gacha_chisana_yusho', name: '小さな優勝', emoji: '🏆', type: 'badge', rarity: 'legendary' },

  // --- 新バッジ (ミシック) ---
  { id: 'badge_gacha_nanimonai_en', name: '何もない円', emoji: '🌑', type: 'badge', rarity: 'mythic' },
  { id: 'badge_gacha_noise_to', name: 'ノイズ塔', emoji: '📡', type: 'badge', rarity: 'mythic' },
  { id: 'badge_gacha_tomei_badge', name: '透明バッジ', emoji: '🫥', type: 'badge', rarity: 'mythic' },
  { id: 'badge_gacha_tada_no_ishi', name: 'ただの石', emoji: '🗿', type: 'badge', rarity: 'mythic' },
  { id: 'badge_gacha_chisai_ana', name: '小さい穴', emoji: '🕳️', type: 'badge', rarity: 'mythic' },
  { id: 'badge_gacha_me_mitaina_nanika', name: '目みたいな何か', emoji: '🧿', type: 'badge', rarity: 'mythic' },
  { id: 'badge_gacha_yugami', name: '歪み', emoji: '🌀', type: 'badge', rarity: 'mythic' },
  { id: 'badge_gacha_hyoji_dekimasen', name: '表示できません', emoji: '❔', type: 'badge', rarity: 'mythic' },

  // --- イースターエッグ・シークレット ---
  { id: 'badge_gacha_mawasanakatta', name: '回さなかった', emoji: '🪙', type: 'badge', rarity: 'mythic' },

  // Gacha Prefixes
  { id: 'p_gacha_nantonaku', name: 'なんとなく', type: 'prefix', rarity: 'common' },
  { id: 'p_gacha_futsu', name: '普通の', type: 'prefix', rarity: 'common' },
  { id: 'p_gacha_chotto', name: 'ちょっとだけ', type: 'prefix', rarity: 'common' },
  { id: 'p_gacha_nemukatta', name: '眠かった', type: 'prefix', rarity: 'common' },
  
  { id: 'p_gacha_kyukei', name: '休憩中の', type: 'prefix', rarity: 'uncommon' },
  { id: 'p_gacha_daitai', name: 'だいたい', type: 'prefix', rarity: 'uncommon' },
  { id: 'p_gacha_tamatama', name: 'たまたま', type: 'prefix', rarity: 'uncommon' },
  { id: 'p_gacha_yuruku', name: 'ゆるく', type: 'prefix', rarity: 'uncommon' },
  { id: 'p_gacha_shizukana', name: '静かな', type: 'prefix', rarity: 'uncommon' },
  { id: 'p_gacha_bimyo', name: '微妙に', type: 'prefix', rarity: 'uncommon' },
  
  { id: 'p_gacha_nichijo', name: '日常の', type: 'prefix', rarity: 'rare' },
  { id: 'p_gacha_kukiyomu', name: '空気読む', type: 'prefix', rarity: 'rare' },
  { id: 'p_gacha_kyokan', name: '共感の', type: 'prefix', rarity: 'rare' },
  { id: 'p_gacha_yosogai', name: '予想外の', type: 'prefix', rarity: 'rare' },
  { id: 'p_gacha_soreiu', name: 'それ言う？', type: 'prefix', rarity: 'rare' },
  { id: 'p_gacha_jimino', name: '地味の', type: 'prefix', rarity: 'rare' },
  { id: 'p_gacha_yorunishika', name: '夜にしか', type: 'prefix', rarity: 'rare' },
  { id: 'p_gacha_minnano', name: 'みんなの', type: 'prefix', rarity: 'rare' },
  
  { id: 'p_gacha_shinya', name: '深夜だけの', type: 'prefix', rarity: 'epic' },
  { id: 'p_gacha_hitokoto', name: '一言で', type: 'prefix', rarity: 'epic' },
  { id: 'p_gacha_densetsumiman', name: '伝説未満の', type: 'prefix', rarity: 'epic' },
  { id: 'p_gacha_nichijo_shiru', name: '日常を知る', type: 'prefix', rarity: 'epic' },
  { id: 'p_gacha_shosupa', name: '少数派の', type: 'prefix', rarity: 'epic' },
  { id: 'p_gacha_kizukanai', name: '気付かない', type: 'prefix', rarity: 'epic' },
  
  { id: 'p_gacha_jimikkai', name: '地味界の', type: 'prefix', rarity: 'legendary' },
  { id: 'p_gacha_uneimo', name: '運営も', type: 'prefix', rarity: 'legendary' },
  { id: 'p_gacha_kyokan_sonomono', name: '共感そのもの', type: 'prefix', rarity: 'legendary' },
  { id: 'p_gacha_kirokusarenai', name: '記録されない', type: 'prefix', rarity: 'legendary' },
  { id: 'p_gacha_sekaino_hasi', name: '世界の端の', type: 'prefix', rarity: 'legendary' },
  { id: 'p_gacha_unei_konin', name: '運営公認の', type: 'prefix', rarity: 'legendary' },
  { id: 'p_gacha_jimino_saki', name: '地味の先に', type: 'prefix', rarity: 'legendary' },
  
  { id: 'p_gacha_shinwaky', name: '神話級の', type: 'prefix', rarity: 'mythic' },
  { id: 'p_gacha_konohitodake', name: 'この人だけ', type: 'prefix', rarity: 'mythic' },
  { id: 'p_gacha_mukogawa', name: '向こう側の', type: 'prefix', rarity: 'mythic' },
  { id: 'p_gacha_zuttomae', name: 'ずっと前から', type: 'prefix', rarity: 'mythic' },
  { id: 'p_gacha_daremo_shiranai', name: '誰も知らない', type: 'prefix', rarity: 'mythic' },
  { id: 'p_gacha_jimi_wo_koeta', name: '地味を超えた', type: 'prefix', rarity: 'mythic' },
  { id: 'p_gacha_sansoku_dekinai', name: '観測できない', type: 'prefix', rarity: 'mythic' },
  { id: 'p_gacha_yoku_ga_nai', name: '欲がない', type: 'prefix', rarity: 'mythic' },
  { id: 'p_gacha_gachizei', name: 'ガチャ極めし', type: 'prefix', rarity: 'legendary' },
  { id: 'p_gacha_jimi_kami', name: '地味をも超越した', type: 'prefix', rarity: 'mythic' },
  { id: 'p_gacha_ultimate_synchro', name: '同調率400%の', type: 'prefix', rarity: 'mythic' },

  // Gacha Suffixes
  { id: 's_gacha_kita', name: '来た', type: 'suffix', rarity: 'common' },
  { id: 's_gacha_kyokan', name: '共感', type: 'suffix', rarity: 'common' },
  
  { id: 's_gacha_atteru', name: '合ってる', type: 'suffix', rarity: 'uncommon' },
  { id: 's_gacha_isogashii', name: '忙しい', type: 'suffix', rarity: 'uncommon' },
  { id: 's_gacha_shinjin', name: '新人', type: 'suffix', rarity: 'uncommon' },
  { id: 's_gacha_ataru', name: '当たる', type: 'suffix', rarity: 'uncommon' },
  { id: 's_gacha_ikiru', name: '生きる', type: 'suffix', rarity: 'uncommon' },
  { id: 's_gacha_kiyo', name: '器用', type: 'suffix', rarity: 'uncommon' },
  { id: 's_gacha_tami', name: '民', type: 'suffix', rarity: 'uncommon' },
  { id: 's_gacha_yumei', name: '有名', type: 'suffix', rarity: 'uncommon' },
  
  { id: 's_gacha_uraboss', name: '裏ボス', type: 'suffix', rarity: 'rare' },
  { id: 's_gacha_tatsujin', name: '達人', type: 'suffix', rarity: 'rare' },
  { id: 's_gacha_junin', name: '住人', type: 'suffix', rarity: 'rare' },
  { id: 's_gacha_tankyusha', name: '探究者', type: 'suffix', rarity: 'rare' },
  { id: 's_gacha_hasha', name: '覇者', type: 'suffix', rarity: 'rare' },
  { id: 's_gacha_arawarenai', name: '現れない', type: 'suffix', rarity: 'rare' },
  { id: 's_gacha_kizuki', name: '気付き', type: 'suffix', rarity: 'rare' },
  
  { id: 's_gacha_sekaikaeru', name: '世界変える', type: 'suffix', rarity: 'epic' },
  { id: 's_gacha_densetsu', name: '伝説', type: 'suffix', rarity: 'epic' },
  { id: 's_gacha_kuki_kaeru', name: '空気変える', type: 'suffix', rarity: 'epic' },
  { id: 's_gacha_kirokusha', name: '記録者', type: 'suffix', rarity: 'epic' },
  { id: 's_gacha_ou', name: '王', type: 'suffix', rarity: 'epic' },
  
  { id: 's_gacha_eiyu', name: '英雄', type: 'suffix', rarity: 'legendary' },
  { id: 's_gacha_sonzai', name: '存在', type: 'suffix', rarity: 'legendary' },
  { id: 's_gacha_odoroki', name: '驚いた', type: 'suffix', rarity: 'legendary' },
  { id: 's_gacha_nahito', name: 'な人', type: 'suffix', rarity: 'legendary' },
  { id: 's_gacha_kuki', name: '空気', type: 'suffix', rarity: 'legendary' },
  { id: 's_gacha_ita', name: 'いた', type: 'suffix', rarity: 'legendary' },
  
  { id: 's_gacha_jimi', name: '地味', type: 'suffix', rarity: 'mythic' },
  { id: 's_gacha_chigau', name: '違う', type: 'suffix', rarity: 'mythic' },
  { id: 's_gacha_iru', name: 'いる', type: 'suffix', rarity: 'mythic' },
  { id: 's_gacha_kami_jimi', name: '地味神', type: 'suffix', rarity: 'mythic' },
  { id: 's_gacha_mugen_legend', name: '無限の超越者', type: 'suffix', rarity: 'legendary' }
];

const INITIAL_STATE: GachaState = {
  coins: 500, // Boost starting coins to give participants a great try!
  shards: 0,
  pityCount: 0,
  unlockedPrefixIds: [],
  unlockedSuffixIds: [],
  unlockedBadgeIds: [],
  dailyPostsCount: 0,
  dailyUpvotesSentCount: 0,
  dailyUpvotesReceivedCount: 0,
  lastActionDate: '',
  lastLoginDate: '',
  loginStreak: 0,
  dailyMissionsClaimed: {}
};

export function getGachaState(userId: string): GachaState {
  if (!userId) return INITIAL_STATE;
  const key = `jimicchi_gacha_v3_${userId}`;
  try {
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      // Reset daily counts if the date shifts
      const todayStr = new Date().toISOString().split('T')[0];
      if (parsed.lastActionDate !== todayStr) {
        parsed.dailyPostsCount = 0;
        parsed.dailyUpvotesSentCount = 0;
        parsed.dailyUpvotesReceivedCount = 0;
        parsed.dailyMissionsClaimed = {};
        parsed.lastActionDate = todayStr;
      }
      return { ...INITIAL_STATE, dailyMissionsClaimed: {}, ...parsed };
    }
  } catch (e) {
    console.error('Failed to parse gacha state:', e);
  }
  return INITIAL_STATE;
}

export function saveGachaState(userId: string, state: GachaState) {
  if (!userId) return;
  const key = `jimicchi_gacha_v3_${userId}`;
  const todayStr = new Date().toISOString().split('T')[0];
  state.lastActionDate = todayStr;
  localStorage.setItem(key, JSON.stringify(state));

  // Sync state to Firestore profile
  try {
    const profileRef = doc(db, 'profiles', userId);
    updateDoc(profileRef, {
      unlockedPrefixIds: state.unlockedPrefixIds || [],
      unlockedSuffixIds: state.unlockedSuffixIds || [],
      unlockedBadgeIds: state.unlockedBadgeIds || [],
      coins: state.coins !== undefined ? state.coins : 500,
      shards: state.shards !== undefined ? state.shards : 0,
      lastLoginDate: state.lastLoginDate || '',
      loginStreak: state.loginStreak || 0
    }).catch(err => {
      console.warn("Failed to sync state to Firestore profile:", err);
    });
  } catch (err) {
    console.warn("Firestore initialization error in saveGachaState sync:", err);
  }
}

export interface LoginRewardResult {
  awarded: boolean;
  coinsGained: number;
  streak: number;
  milestoneReached: boolean;
}

export function handleDailyLoginReward(userId: string): LoginRewardResult {
  if (!userId) return { awarded: false, coinsGained: 0, streak: 0, milestoneReached: false };
  const state = getGachaState(userId);
  const todayStr = new Date().toISOString().split('T')[0];
  
  // If we already logged in today
  if (state.lastLoginDate === todayStr) {
    return { awarded: false, coinsGained: 0, streak: state.loginStreak || 1, milestoneReached: false };
  }

  const lastLogin = state.lastLoginDate;
  let streak = state.loginStreak || 0;

  if (!lastLogin) {
    streak = 1;
  } else {
    // Check if we logged in yesterday to maintain the streak
    const today = new Date(todayStr);
    const lastDate = new Date(lastLogin);
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) {
      streak += 1;
    } else {
      streak = 1;
    }
  }

  let coinsGained = 5;
  let milestoneReached = false;

  if (streak > 0 && streak % 7 === 0) {
    coinsGained += 50;
    milestoneReached = true;
  }

  state.coins += coinsGained;
  state.lastLoginDate = todayStr;
  state.loginStreak = streak;
  saveGachaState(userId, state);

  return {
    awarded: true,
    coinsGained,
    streak,
    milestoneReached
  };
}

// Earn coin events
export function awardGachaCoins(userId: string, amount: number, reason: string): number {
  if (!userId) return 0;
  const state = getGachaState(userId);
  state.coins += amount;
  saveGachaState(userId, state);
  return state.coins;
}

// Earn helper daily limits
export function earnFromPost(userId: string): { coins: number; awarded: boolean } {
  if (!userId) return { coins: 0, awarded: false };
  const state = getGachaState(userId);
  if (state.dailyPostsCount < 3) {
    state.dailyPostsCount += 1;
    state.coins += 3;
    saveGachaState(userId, state);
    return { coins: state.coins, awarded: true };
  }
  return { coins: state.coins, awarded: false };
}

export function earnFromUpvoteSent(userId: string): { coins: number; awarded: boolean } {
  if (!userId) return { coins: 0, awarded: false };
  const state = getGachaState(userId);
  if (state.dailyUpvotesSentCount < 20) {
    state.dailyUpvotesSentCount += 1;
    state.coins += 1;
    saveGachaState(userId, state);
    return { coins: state.coins, awarded: true };
  }
  return { coins: state.coins, awarded: false };
}

export function earnFromUpvoteReceived(userId: string): { coins: number; awarded: boolean } {
  if (!userId) return { coins: 0, awarded: false };
  const state = getGachaState(userId);
  if (state.dailyUpvotesReceivedCount < 20) {
    state.dailyUpvotesReceivedCount += 1;
    state.coins += 2;
    saveGachaState(userId, state);
    return { coins: state.coins, awarded: true };
  }
  return { coins: state.coins, awarded: false };
}

// Perform drawing pulls
// Standard probability formula
export function drawGacha(userId: string, count: number, pool?: any | null): { results: PullResult[]; state: GachaState; easterEggRefund: boolean } {
  const state = getGachaState(userId);
  let cost = count === 1 ? 100 : count === 10 ? 900 : 4500;
  if (pool) {
    if (count === 1) cost = pool.cost1 ?? 100;
    else if (count === 10) cost = pool.cost10 ?? 900;
  }

  if (state.coins < cost) {
    throw new Error('Gacha Coinsが不足しています。');
  }

  // 1. Check Easter Egg (0.01% chance) - only applicable for standard gacha
  const rollEasterEgg = !pool && (Math.random() < 0.0001); 
  if (rollEasterEgg) {
    // Save easter egg prefix/suffix
    if (!state.unlockedPrefixIds.includes('p_gacha_nantonaku')) state.unlockedPrefixIds.push('p_gacha_nantonaku'); // "欲がない" simulated below:
    const refundState = { ...state };
    return {
      results: [],
      state: refundState,
      easterEggRefund: true
    };
  }

  state.coins -= cost;
  const results: PullResult[] = [];

  // Determine current pool items based on selection
  let currentPool = GACHA_POOL;
  if (pool && pool.selectedItemIds && pool.selectedItemIds.length > 0) {
    currentPool = GACHA_POOL.filter(item => pool.selectedItemIds.includes(item.id));
    if (currentPool.length === 0) {
      currentPool = GACHA_POOL;
    }
  }

  // Determine custom rates (Common, Uncommon, Rare, Epic, Legendary, Mythic)
  const rates = (pool && pool.rates) ? pool.rates : {
    common: 55,
    uncommon: 25,
    rare: 13,
    epic: 5,
    legendary: 1.8,
    mythic: 0.2
  };

  const rMythic = Number(rates.mythic) ?? 0.2;
  const rLegendary = Number(rates.legendary) ?? 1.8;
  const rEpic = Number(rates.epic) ?? 5.0;
  const rRare = Number(rates.rare) ?? 13.0;
  const rUncommon = Number(rates.uncommon) ?? 25.0;
  const rCommon = Number(rates.common) ?? 55.0;
  const totalRate = rMythic + rLegendary + rEpic + rRare + rUncommon + rCommon;

  for (let i = 0; i < count; i++) {
    state.pityCount += 1;
    let selectedItem: GachaItem;

    // --- Ceiling (Pity) Rules ---
    const pity50Rarity = pool?.pityLimit50 || 'rare';
    const pity200Rarity = pool?.pityLimit200 || 'legendary';

    const isLegendaryPity = state.pityCount % 200 === 0;
    const isRarePity = state.pityCount % 50 === 0;

    if (isLegendaryPity) {
      // Pity 200 guaranteed
      selectedItem = selectRandomItemWithRaritiesAndPool(currentPool, [pity200Rarity as any, 'mythic']);
    } else if (isRarePity) {
      // Pity 50 guaranteed
      const allowedRarities: GachaItem['rarity'][] = [];
      if (pity50Rarity === 'common') {
        allowedRarities.push('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic');
      } else if (pity50Rarity === 'uncommon') {
        allowedRarities.push('uncommon', 'rare', 'epic', 'legendary', 'mythic');
      } else if (pity50Rarity === 'rare') {
        allowedRarities.push('rare', 'epic', 'legendary', 'mythic');
      } else if (pity50Rarity === 'epic') {
        allowedRarities.push('epic', 'legendary', 'mythic');
      } else if (pity50Rarity === 'legendary') {
        allowedRarities.push('legendary', 'mythic');
      } else {
        allowedRarities.push('mythic');
      }
      selectedItem = selectRandomItemWithRaritiesAndPool(currentPool, allowedRarities);
    } else {
      // Normal rate rolls
      const roll = Math.random() * totalRate;
      let targetRarity: GachaItem['rarity'] = 'common';

      if (roll < rMythic) {
        targetRarity = 'mythic';
      } else if (roll < rMythic + rLegendary) {
        targetRarity = 'legendary';
      } else if (roll < rMythic + rLegendary + rEpic) {
        targetRarity = 'epic';
      } else if (roll < rMythic + rLegendary + rEpic + rRare) {
        targetRarity = 'rare';
      } else if (roll < rMythic + rLegendary + rEpic + rRare + rUncommon) {
        targetRarity = 'uncommon';
      } else {
        targetRarity = 'common';
      }

      selectedItem = selectRandomItemWithRaritiesAndPool(currentPool, [targetRarity]);
    }

    // Process unlocked collection storage & handle duplicates
    let isDuplicate = false;
    let shardsGained = 0;

    if (selectedItem.type === 'prefix') {
      if (state.unlockedPrefixIds.includes(selectedItem.id)) {
        isDuplicate = true;
        shardsGained = 5; // Title parts give 5 shards
      } else {
        state.unlockedPrefixIds.push(selectedItem.id);
      }
    } else if (selectedItem.type === 'suffix') {
      if (state.unlockedSuffixIds.includes(selectedItem.id)) {
        isDuplicate = true;
        shardsGained = 5;
      } else {
        state.unlockedSuffixIds.push(selectedItem.id);
      }
    } else {
      // Badge
      if (state.unlockedBadgeIds.includes(selectedItem.id)) {
        isDuplicate = true;
        shardsGained = 10; // Badges give 10 shards
      } else {
        state.unlockedBadgeIds.push(selectedItem.id);
      }
    }

    if (isDuplicate) {
      state.shards += shardsGained;
    }

    results.push({
      item: selectedItem,
      isDuplicate,
      shardsGained
    });
  }

  saveGachaState(userId, state);
  return { results, state, easterEggRefund: false };
}

export function registerDynamicGachaItem(item: GachaItem) {
  if (!GACHA_POOL.some(x => x.id === item.id)) {
    GACHA_POOL.push(item);
  }
}

function selectRandomItemWithRaritiesAndPool(poolItems: GachaItem[], rarities: GachaItem['rarity'][]): GachaItem {
  const filtered = poolItems.filter(item => rarities.includes(item.rarity));
  if (filtered.length === 0) {
    if (poolItems.length > 0) {
      return poolItems[Math.floor(Math.random() * poolItems.length)];
    }
    return GACHA_POOL[0];
  }
  const idx = Math.floor(Math.random() * filtered.length);
  return filtered[idx];
}

function selectRandomItemWithRarities(rarities: GachaItem['rarity'][]): GachaItem {
  return selectRandomItemWithRaritiesAndPool(GACHA_POOL, rarities);
}

// Sparkle exchange for 500 fragments
export function exchangeShard(userId: string, targetItemId: string): GachaState {
  const state = getGachaState(userId);
  if (state.shards < 500) {
    throw new Error('欠片(Shards)が500個以上必要です。');
  }

  const findItem = GACHA_POOL.find(item => item.id === targetItemId);
  if (!findItem) throw new Error('該当するアイテムが見つかりません。');

  if (findItem.type === 'prefix') {
    if (state.unlockedPrefixIds.includes(targetItemId)) throw new Error('既にこの称号は獲得しています。');
    state.unlockedPrefixIds.push(targetItemId);
  } else if (findItem.type === 'suffix') {
    if (state.unlockedSuffixIds.includes(targetItemId)) throw new Error('既にこの称号は獲得しています。');
    state.unlockedSuffixIds.push(targetItemId);
  } else {
    if (state.unlockedBadgeIds.includes(targetItemId)) throw new Error('既にこのバッジは獲得しています。');
    state.unlockedBadgeIds.push(targetItemId);
  }

  state.shards -= 500;
  saveGachaState(userId, state);
  return state;
}

export function claimDailyMission(userId: string, missionId: string, reward: number): GachaState {
  const state = getGachaState(userId);
  if (!state.dailyMissionsClaimed) {
    state.dailyMissionsClaimed = {};
  }
  state.dailyMissionsClaimed[missionId] = true;
  state.coins += reward;
  saveGachaState(userId, state);
  return state;
}

export function awardGachaItem(userId: string, itemType: string, itemValue: string): { success: boolean; msg: string } {
  const state = getGachaState(userId);
  if (itemType === 'coins') {
    const val = parseInt(itemValue) || 100;
    state.coins += val;
    saveGachaState(userId, state);
    return { success: true, msg: `${val} Gacha Coinsを獲得しました！` };
  } else if (itemType === 'shards') {
    const val = parseInt(itemValue) || 10;
    state.shards += val;
    saveGachaState(userId, state);
    return { success: true, msg: `欠片 ${val}個を獲得しました！` };
  } else if (itemType === 'special_title') {
    if (!state.unlockedPrefixIds) state.unlockedPrefixIds = [];
    if (!state.unlockedSuffixIds) state.unlockedSuffixIds = [];
    
    const isPrefix = itemValue.includes('prefix') || itemValue.startsWith('p_');
    const isSuffix = itemValue.includes('suffix') || itemValue.startsWith('s_');
    
    if (isPrefix || (!isPrefix && !isSuffix)) {
      if (!state.unlockedPrefixIds.includes(itemValue)) {
        state.unlockedPrefixIds.push(itemValue);
      }
    }
    if (isSuffix || (!isPrefix && !isSuffix)) {
      if (!state.unlockedSuffixIds.includes(itemValue)) {
        state.unlockedSuffixIds.push(itemValue);
      }
    }
    saveGachaState(userId, state);
    return { success: true, msg: `限定2つ名パーツ「${itemValue}」を獲得しました！` };
  } else if (itemType === 'special_badge') {
    if (!state.unlockedBadgeIds) state.unlockedBadgeIds = [];
    if (!state.unlockedBadgeIds.includes(itemValue)) {
      state.unlockedBadgeIds.push(itemValue);
    }
    saveGachaState(userId, state);
    return { success: true, msg: `限定バッジ「${itemValue}」を獲得しました！` };
  }
  return { success: false, msg: '不明なアイテムタイプです' };
}

