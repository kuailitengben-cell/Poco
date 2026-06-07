// Title Rarity Utilities
import { Badge } from './badgeUtils';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface TitleDetails {
  baseText: string;
  prefix?: string;
  suffix?: string;
  rarity: Rarity;
  isAwakened: boolean; // Ending in ・熟
  isLimitBreak: boolean; // Ending in ・極
  matchingBadgeEffects: string[]; // E.g., ['owl']
}

export const PREFIX_TRANSLATIONS: Record<string, string> = {
  'なんとなく': 'Somewhat',
  '普通の': 'Ordinary',
  'ちょっとだけ': 'Slightly',
  '眠かった': 'Sleepy',
  '地味共感の': 'Subtly Empathetic',
  '生まれたての': 'Newborn',
  'はじめての': 'First-Time',
  'まだ無名の': 'Untitled',
  '休憩中の': 'Resting',
  'だいたい': 'Mostly',
  '地味に': 'Subtly',
  '刺さりすぎた': 'Overly Affected',
  '気まずい': 'Awkward',
  '日常の': 'Everyday',
  '空気読む': 'Aura-Reading',
  '共感の': 'Empathetic',
  'インサイト': 'Insightful',
  '心眼の': 'Mind-Eye',
  '第６感の': 'Sixth-Sense',
  '深夜だけの': 'Late-Night Only',
  '一言で': 'In a Word',
  '伝説未満の': 'Sub-Legendary',
  '静かなる': 'Silent',
  'なぜここに': 'Why Am I Here',
  'テレパシーの': 'Telepathic',
  '地味界の': 'In Subtlety World',
  '共感されし': 'Sympathized',
  '運営も': 'Admins Also',
  '生活の一部な': 'Habitual',
  '神算鬼謀の': 'Mastermind',
  '絶対的': 'Absolute',
  '神話級の': 'Mythic',
  'この人だけ': 'Selective',
  '向こう側の': 'Beyond-the-Scenes',
  '伝説の': 'Legendary',
  '100%を': '100%-Seeing',
  '地味をも超越した': 'Subtlety Transcending',
  '同調率400%の': '400%-Synced',
  'ガチャ極めし': 'Gacha Mastered',
  'たまま': 'By Chance',
  'たまたま': 'Accidental',
  'ゆるく': 'Chilled',
  '静かな': 'Silent',
  '微妙に': 'Subtly',
  '予想外の': 'Unexpected',
  'それ言う？': 'Saying That?',
  '地味の': 'Subtle',
  '夜にしか': 'Night-Only',
  'minnano': 'Everyone\'s',
  'みんなの': 'Everyone\'s',
  '日常を知る': 'Everyday-Knowing',
  '少数派の': 'Minority',
  '気付かない': 'Unnoticing',
  '共感そのもの': 'Pure Empathy',
  '記録されない': 'Unrecorded',
  '世界の端の': 'Edge-of-the-World',
  '運営公認の': 'Certified',
  '地味の先に': 'Beyond Subtlety',
  'ずっと前から': 'Way Back Since',
  '誰も知らない': 'Unexplored',
  '地味を超えた': 'Transcendent',
  '観測できない': 'Unobservable',
  '欲がない': 'Unambitious',
  '地味俳人たる': 'Jimi Poet',
  '言葉遊びの': 'Wordplaying',
  '本棚の': 'Bookshelf\'s',
  '深夜の': 'Midnight',
  '一文字': 'Single-Stroke',
  '笑撃の': 'Laugh-Inducing',
  '活字の': 'Literary',
  '静寂に': 'In Silence',
  '海を越えて': 'Beyond the Sea',
  '南半球の': 'Southern Hemisphere',
  '大洋を渡った': 'Ocean-Crossing',
  'クイーンズランドの': "Queensland's",
  '地味は国境を越える': 'Jimicchi Crosses Borders',
};

export const SUFFIX_TRANSLATIONS: Record<string, string> = {
  '来た': 'Arrived',
  '人': 'Person',
  '共感': 'Empath',
  '初心者': 'Beginner',
  '共感民': 'Sympathizer',
  '観測者': 'Observer',
  '合ってる': 'Correct',
  '忙しい': 'Busy One',
  'ジミ使い': 'Jimi User',
  '空気製造機': 'Aura Maker',
  '裏ボス': 'Hidden Boss',
  '達人': 'Master',
  '住人': 'Resident',
  '予測士': 'Predictor',
  '追跡者': 'Pursuer',
  '目利き': 'Expert',
  '支配者': 'Ruler',
  '世界変える': 'World Changer',
  '伝説': 'Legend',
  '一言': 'Single Word',
  'いる人': 'Attendant',
  'ソムリエ': 'Sommelier',
  'アナリスト': 'Analyst',
  '英雄': 'Hero',
  '存在': 'Existence',
  '驚いた': 'Surprised',
  '常連': 'Regular',
  '名探偵': 'Detective',
  'シンクロ職人': 'Artisan',
  '地味': 'Subtlety',
  '違う': 'Alternative',
  '視る者': 'Seer',
  '地味共感の創造神': 'Creator of Subtlety',
  '共感源': 'Empathy Source',
  '地味神': 'Jimi God',
  '無限の超越者': 'Infinite Transcender',
  '新人': 'Rookie',
  '当たる': 'Hitter',
  '生きる': 'Living One',
  '器用': 'Adept',
  '民': 'Citizen',
  '有名': 'Celebrity',
  '探究者': 'Seeker',
  '覇者': 'Champion',
  '現れない': 'Ghost',
  '気付き': 'Awakening',
  '空気変える': 'Vibe Changer',
  '記録者': 'Recorder',
  '王': 'King',
  'な人': 'Type of Person',
  '空気': 'Vibe',
  'いた': 'Was There',
  'いる': 'Is Here',
  '無限 of 極限': 'Infinity of Extreme',
  '地味俳人': 'Jimi Poet',
  '言葉遊びの達人': 'Wordplay Master',
  '本棚の守護者': 'Bookshelf Guardian',
  '深夜の文豪': 'Midnight Novelist',
  '一文字入魂': 'Single-Stroke Soul',
  '笑撃の一撃': 'Laughing Blow',
  '活字の錬金術師': 'Literary Alchemist',
  '静寂に響く言葉': 'Words Resounding in Silence',
  '共感した': 'Empathizer',
  '投稿者': 'Poster',
  '開拓者': 'Explorer',
};

export const TITLE_TRANSLATIONS: Record<string, string> = {
  '地味共感の初心者': 'Subtle Empathy Beginner',
  'ビギナー予測士': 'Beginner Predictor',
  '共感の目利き': 'Empathy Connoisseur',
  '人間心理のソムリエ': 'Human Psychology Sommelier',
  '100%を視る者': 'Seer of 100%',
  '心眼の予知能力者': 'Mind-Eye Precognitive',
  'テレパシー能力者': 'Telepathy Psychic',
  '地味共感の創造神': 'Creator of Subtle Empathy'
};

export const CONDITION_TRANSLATIONS: Record<string, string> = {
  '最初から選択可能': 'Available from the start',
  '初投稿': 'First post',
  '3日連続ログイン': '3-day login streak',
  '閲覧50回': '50 views',
  '共感100獲得': 'Accumulate 100 upvotes',
  '1000共感': 'Accumulate 1005 upvotes',
  '1投稿100共感': '100 upvotes on a single post',
  '23〜4時投稿50回': '50 posts between 11 PM and 4 AM',
  'コメント率30%': 'Comment rate 30%',
  '投稿100回': '100 posts',
  '30日継続': '30-day streak',
  '100日継続': '100-day streak',
  '投稿1000回': '1000 posts',
  '平日昼投稿多い': 'Active on weekdays at lunchtime',
  '深夜3日連続': 'Late-night activity 3 days in a row',
  '投稿20回平均共感0以下': 'Average upvotes <= 0 after 20+ posts',
  '投稿せず100日': 'No posts for 100 days (Silent observer)',
  'コメント停止された回数': 'Times comments were restricted',
  '全称号30%解放': 'Unlock 30% of all title parts',
  '全体TOP1%(総共感500以上)': 'Top 1% overall (500+ total upvotes)',
  '隠しメッセージ・隠し条件': 'Secret criteria / Hidden message',
  '累積予測成功 1回': '1 total successful prediction',
  '累積予測成功 2回': '2 total successful predictions',
  '累積予測成功 3回': '3 total successful predictions',
  '累積予測成功 4回': '4 total successful predictions',
  '累積予測成功 5回': '5 total successful predictions',
  '累積予測成功 8回': '8 total successful predictions',
  '累積予測成功 10回': '10 total successful predictions',
  '予測成功 3連続以上': 'Prediction streak of 3+',
  '予測成功 4連続以上': 'Prediction streak of 4+',
  '予測成功 5連続以上': 'Prediction streak of 5+',
  '予測成功 6連続以上': 'Prediction streak of 6+',
  'ガチャ限定 (コモン)': 'Gacha Exclusive (Common)',
  'ガチャ限定 (アンコモン)': 'Gacha Exclusive (Uncommon)',
  'ガチャ限定 (レア)': 'Gacha Exclusive (Rare)',
  'ガチャ限定 (エピック)': 'Gacha Exclusive (Epic)',
  'ガチャ限定 (レジェンダリー)': 'Gacha Exclusive (Legendary)',
  'ガチャ限定 (ミシック)': 'Gacha Exclusive (Mythic)',
  'ガチャ限定 (シークレット)': 'Gacha Exclusive (Secret)',
  '地味ひろば実績': 'Jimi Plaza Achievement'
};

// Map texts directly to their rarity
export const PREFIX_RARITIES: Record<string, Rarity> = {
  // Common
  'なんとなく': 'common',
  '普通の': 'common',
  'ちょっとだけ': 'common',
  '眠かった': 'common',
  '地味共感の': 'common',
  '生まれたての': 'common',
  'はじめての': 'common',
  'まだ無名の': 'common',

  // Uncommon
  '休憩中の': 'uncommon',
  'だいたい': 'uncommon',
  '地味に': 'uncommon',
  '刺さりすぎた': 'uncommon',
  '気まずい': 'uncommon',

  // Rare
  '日常の': 'rare',
  '空気読む': 'rare',
  '共感の': 'rare',
  'インサイト': 'rare',
  '心眼の': 'rare',
  '第６感の': 'rare',

  // Epic
  '深夜だけの': 'epic',
  '一言で': 'epic',
  '伝説未満の': 'epic',
  '静かなる': 'epic',
  'なぜここに': 'epic',
  'テレパシーの': 'epic',

  // Legendary
  '地味界の': 'legendary',
  '共感されし': 'legendary',
  '運営も': 'legendary',
  '生活の一部な': 'legendary',
  '神算鬼謀の': 'legendary',
  '絶対的': 'legendary',

  // Mythic
  '神話級の': 'mythic',
  'この人だけ': 'mythic',
  '向こう側の': 'mythic',
  '伝説の': 'mythic',
  '100%を': 'mythic',
  '地味をも超越した': 'mythic',
  '同調率400%の': 'mythic',
  'ガチャ極めし': 'legendary',
  '海を越えて': 'uncommon',
  '南半球の': 'rare',
  '大洋を渡った': 'epic',
  'クイーンズランドの': 'legendary',
  '地味は国境を越える': 'mythic',
};

export const SUFFIX_RARITIES: Record<string, Rarity> = {
  // Common
  '来た': 'common',
  '人': 'common',
  '共感': 'common',
  '初心者': 'common',
  '共感民': 'common',

  // Uncommon
  '観測者': 'uncommon',
  '合ってる': 'uncommon',
  '忙しい': 'uncommon',
  'ジミ使い': 'uncommon',
  '空気製造機': 'uncommon',

  // Rare
  '裏ボス': 'rare',
  '達人': 'rare',
  '住人': 'rare',
  '予測士': 'rare',
  '追跡者': 'rare',
  '目利き': 'rare',

  // Epic
  '支配者': 'epic',
  '世界変える': 'epic',
  '伝説': 'epic',
  '一言': 'epic',
  'いる人': 'epic',
  'ソムリエ': 'epic',
  'アナリスト': 'epic',

  // Legendary
  '英雄': 'legendary',
  '存在': 'legendary',
  '驚いた': 'legendary',
  '常連': 'legendary',
  '名探偵': 'legendary',
  'シンクロ職人': 'legendary',

  // Mythic
  '地味': 'mythic',
  '違う': 'mythic',
  '視る者': 'mythic',
  '地味共感の創造神': 'mythic',
  '共感源': 'mythic',
  '地味神': 'mythic',
  '無限の超越者': 'legendary',
  '共感した': 'uncommon',
  '投稿者': 'epic',
  '開拓者': 'legendary',
};

export function registerPrefixRarity(text: string, rarity: Rarity) {
  PREFIX_RARITIES[text] = rarity;
}

export function registerSuffixRarity(text: string, rarity: Rarity) {
  SUFFIX_RARITIES[text] = rarity;
}

// Help parse and resolve the overall title info
export function resolveTitleDetails(fullTitle: string, equippedBadges: string[] = []): TitleDetails {
  if (!fullTitle) {
    return { baseText: '', rarity: 'common', isAwakened: false, isLimitBreak: false, matchingBadgeEffects: [] };
  }

  const isLimitBreak = fullTitle.endsWith('・極');
  const isAwakened = !isLimitBreak && fullTitle.endsWith('・熟');
  const baseText = isLimitBreak || isAwakened ? fullTitle.slice(0, -2) : fullTitle;

  // Try to find matching prefix and suffix
  let matchedPrefix = '';
  let matchedSuffix = '';

  // Sort prefixes by length descending to match largest segment first
  const sortedPrefixKeys = Object.keys(PREFIX_RARITIES).sort((a, b) => b.length - a.length);
  for (const prefix of sortedPrefixKeys) {
    if (baseText.startsWith(prefix)) {
      matchedPrefix = prefix;
      matchedSuffix = baseText.substring(prefix.length);
      break;
    }
  }

  if (!matchedPrefix) {
    matchedSuffix = baseText;
  }

  // Look up rarities
  const prefixRarity = matchedPrefix ? (PREFIX_RARITIES[matchedPrefix] || 'common') : 'common';
  const suffixRarity = matchedSuffix ? (SUFFIX_RARITIES[matchedSuffix] || 'common') : 'common';

  // Compute overall rarity (take the highest / max)
  const order: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  const pIdx = order.indexOf(prefixRarity);
  const sIdx = order.indexOf(suffixRarity);
  const maxIdx = Math.max(pIdx, sIdx);
  const rarity = order[maxIdx];

  // Badge interaction (バッジ連動)
  // Check if current title matches badge theme. E.g., title contains "深夜" and badge is owl symbol ("badge_night_walk" or "badge_gacha_owl")
  const matchingBadgeEffects: string[] = [];
  
  const hasOwlBadge = equippedBadges.some(id => id === 'badge_night_walk' || id === 'badge_gacha_owl');
  const hasStarryBadge = equippedBadges.some(id => id === 'badge_material_starry' || id === 'badge_gacha_starry');
  const hasCrownBadge = equippedBadges.some(id => id === 'badge_gacha_crown' || id === 'badge_one_hit_wonder');

  if (hasOwlBadge && (baseText.includes('深夜') || baseText.includes('支配者') || baseText.includes('管理人'))) {
    matchingBadgeEffects.push('owl');
  }
  if (hasStarryBadge && (baseText.includes('エモい') || baseText.includes('星') || baseText.includes('宇宙') || baseText.includes('観測'))) {
    matchingBadgeEffects.push('star');
  }
  if (hasCrownBadge && (baseText.includes('王') || baseText.includes('英雄') || baseText.includes('神') || baseText.includes('支配者'))) {
    matchingBadgeEffects.push('crown');
  }

  return {
    baseText,
    prefix: matchedPrefix || undefined,
    suffix: matchedSuffix || undefined,
    rarity,
    isAwakened,
    isLimitBreak,
    matchingBadgeEffects,
  };
}
