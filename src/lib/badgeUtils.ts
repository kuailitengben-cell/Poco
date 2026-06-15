import { Scene, Profile } from '../types';

export interface Badge {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  iconName: 'Award' | 'Flame' | 'Zap' | 'Trophy' | 'Sparkles' | 'Target' | 'Crown';
  emoji: string;     // Unique emoji for this badge
  color: string;      // Tailwind text color class
  bgColor: string;    // Tailwind bg color class
  borderColor: string;// Tailwind border color class
  conditionText: string;
  conditionTextEn?: string;
  type: 'total' | 'streak' | 'custom';
  threshold: number;
  category?: 'action' | 'reaction' | 'explore' | 'habit' | 'material' | 'unique';
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
}

export interface Title {
  id: string;
  name: string;
  nameEn?: string;
  conditionText: string;
  conditionTextEn?: string;
}

export interface TitlePart {
  id: string;
  text: string;
  textEn?: string;
  conditionText: string;
  conditionTextEn?: string;
  type: 'free' | 'total' | 'streak' | 'custom';
  threshold: number;
}

export interface BadgeStyle {
  bg: string;
  border: string;
  text: string;
}

export function getBadgeRarityStyle(rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'): BadgeStyle {
  switch (rarity) {
    case 'uncommon':
      return {
        bg: 'bg-gradient-to-br from-emerald-50/95 to-teal-50/40',
        border: 'border-emerald-200/60',
        text: 'text-emerald-700'
      };
    case 'rare':
      return {
        bg: 'bg-gradient-to-br from-sky-50/95 to-blue-50/40',
        border: 'border-sky-200/60',
        text: 'text-sky-700'
      };
    case 'epic':
      return {
        bg: 'bg-gradient-to-br from-fuchsia-50/95 to-purple-50/40',
        border: 'border-fuchsia-200/60',
        text: 'text-purple-700'
      };
    case 'legendary':
      return {
        bg: 'bg-gradient-to-br from-amber-50/95 to-orange-50/40',
        border: 'border-amber-200/60',
        text: 'text-amber-800'
      };
    case 'mythic':
      return {
        bg: 'bg-gradient-to-br from-indigo-50/90 via-rose-50/90 to-amber-50/50',
        border: 'border-rose-200/60',
        text: 'text-rose-700 font-extrabold'
      };
    case 'common':
    default:
      return {
        bg: 'bg-gradient-to-br from-stone-50/95 to-orange-50/40',
        border: 'border-stone-200/60',
        text: 'text-stone-600'
      };
  }
}

// ユーザーが撮影したバッジの見た目案を反映したバッジの一覧
export const BADGES: Badge[] = [
  // --- 地味ひろばイベント系 (Category: unique/habit) ---
  {
    id: 'badge_haiku_king',
    name: '地味俳句王',
    description: '地味ひろばの「地味俳句」大会で優勝した、天才地味俳人！',
    iconName: 'Trophy',
    emoji: '🏆',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    conditionText: '地味ひろば「地味俳句」優勝で獲得',
    type: 'custom',
    threshold: 1,
    category: 'unique',
    rarity: 'legendary'
  },
  {
    id: 'badge_dajare_king',
    name: 'ダジャレ王',
    description: '地味ひろばの「地味ダジャレ」大会で優勝した、言葉遊びの巨匠！',
    iconName: 'Trophy',
    emoji: '🤣',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    conditionText: '地味ひろば「地味ダジャレ」優勝で獲得',
    type: 'custom',
    threshold: 1,
    category: 'unique',
    rarity: 'legendary'
  },
  {
    id: 'badge_bookshelf_resident',
    name: '本棚の住人',
    description: '地味ひろばの「地味書籍」で初めて作品を書き上げた、新進気鋭の作家！',
    iconName: 'Award',
    emoji: '📚',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    conditionText: '地味ひろば「地味書籍」に1作投稿で獲得',
    type: 'custom',
    threshold: 1,
    category: 'action',
    rarity: 'uncommon'
  },
  {
    id: 'badge_text_addict',
    name: '活字中毒',
    description: '地味ひろばの「地味書籍」に3作以上の作品を投稿した、執筆の達人！',
    iconName: 'Flame',
    emoji: '📝',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    conditionText: '地味ひろば「地味書籍」に3作投稿で獲得',
    type: 'custom',
    threshold: 3,
    category: 'habit',
    rarity: 'rare'
  },
  {
    id: 'badge_consecutive_champion',
    name: '連覇王',
    description: '地味ひろばのイベントで2回以上連続・または複数回優勝した、絶対王者！',
    iconName: 'Crown',
    emoji: '👑',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    conditionText: '地味ひろばイベントで累計2回以上優勝',
    type: 'custom',
    threshold: 2,
    category: 'unique',
    rarity: 'mythic'
  },
  {
    id: 'badge_runnerup_collector',
    name: '準優勝コレクター',
    description: '地味ひろばのイベントで惜しくも準優勝に輝いた、実力派の共感王！',
    iconName: 'Award',
    emoji: '🏅',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    conditionText: '地味ひろばイベントで準優勝すると獲得',
    type: 'custom',
    threshold: 1,
    category: 'unique',
    rarity: 'rare'
  },

  // --- 日常・行動系 (Category: action) ---
  {
    id: 'synchro_1',
    name: 'ゆるっと投稿',
    description: '初めて予想共感度と実際の共感度の誤差10%以内を達成した、日常のつぶやき手！',
    iconName: 'Target',
    emoji: '📝',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    conditionText: '累積シンクロ予測成功 1回',
    type: 'total',
    threshold: 1,
    category: 'action',
    rarity: 'common'
  },
  {
    id: 'streak_5',
    name: '波を起こした',
    description: '5連続で予想共感度の誤差10%以内をクリア！あなたの言葉はコミュニティにさざ波を広げます。',
    iconName: 'Zap',
    emoji: '🌊',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    conditionText: '予測成功 5連続',
    type: 'streak',
    threshold: 5,
    category: 'action',
    rarity: 'legendary'
  },
  {
    id: 'badge_first_post',
    name: 'はじめの一歩',
    description: 'あるあるエピソードを初めて投稿した証！あなたの地味共感ライフの幕開けです。',
    iconName: 'Target',
    emoji: '🚶‍♂️',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    conditionText: '投稿 1回',
    type: 'custom',
    threshold: 1,
    category: 'action',
    rarity: 'common'
  },

  // --- 投稿・リアクション系 (Category: reaction) ---
  {
    id: 'synchro_5',
    name: '共感の達人',
    description: '誤差10%以内のシンクロ予測を5回達成！他の人の共感ポイントが見え始めています。',
    iconName: 'Trophy',
    emoji: '❤️',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    conditionText: '累積シンクロ予測成功 5回',
    type: 'total',
    threshold: 5,
    category: 'reaction',
    rarity: 'rare'
  },
  {
    id: 'streak_3',
    name: '一言職人',
    description: '3回連続で予測成功！短い言葉のなかに確かな共感を見いだす、言葉のスペシャリスト！',
    iconName: 'Flame',
    emoji: '💬',
    color: 'text-sky-700',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    conditionText: '予測成功 3連続',
    type: 'streak',
    threshold: 3,
    category: 'reaction',
    rarity: 'epic'
  },
  {
    id: 'badge_comment_100',
    name: 'コメント職人',
    description: '共感の声やコメントを累計100回以上送信した、温かい対話のつむぎ手！',
    iconName: 'Trophy',
    emoji: '✍️',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    conditionText: '自身のコメント 100回以上',
    type: 'custom',
    threshold: 100,
    category: 'reaction',
    rarity: 'uncommon'
  },
  {
    id: 'badge_one_hit_wonder',
    name: '何気にバズった',
    description: '1つの投稿で、驚異の1000以上の共感(Upvote)を獲得した、隠れたオピニオンリーダー！',
    iconName: 'Crown',
    emoji: '👑',
    color: 'text-sky-750',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-300',
    conditionText: '1投稿で 1000共感達成',
    type: 'custom',
    threshold: 1000,
    category: 'reaction',
    rarity: 'epic'
  },
  {
    id: 'badge_empathy_scholar',
    name: '共感の鬼',
    description: '予測判定5回以上かつ、成功（誤差10%以内）の確率が80%を超える超心理学者。',
    iconName: 'Crown',
    emoji: '👹',
    color: 'text-sky-800',
    bgColor: 'bg-sky-100',
    borderColor: 'border-sky-305',
    conditionText: '予測成功率 80%以上 (判定5回以上)',
    type: 'custom',
    threshold: 80,
    category: 'reaction',
    rarity: 'legendary'
  },

  // --- 閲覧・探索系 (Category: explore) ---
  {
    id: 'synchro_3',
    name: '日常研究家',
    description: '誤差10%以内のシンクロ予測を3回達成！みんなのささやかな日常を研究しています。',
    iconName: 'Award',
    emoji: '🔍',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    conditionText: '累積シンクロ予測成功 3回',
    type: 'total',
    threshold: 3,
    category: 'explore',
    rarity: 'uncommon'
  },
  {
    id: 'synchro_10',
    name: '伝説の住人',
    description: '誤差10%以内のシンクロ予測を10回達成！みんなの心の奥にあるジミを視通しています。',
    iconName: 'Crown',
    emoji: '🏰',
    color: 'text-purple-750',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    conditionText: '累積シンクロ予測成功 10回',
    type: 'total',
    threshold: 10,
    category: 'explore',
    rarity: 'legendary'
  },
  {
    id: 'badge_viewer_500',
    name: '観察者',
    description: 'アプリ内で他者のエピソードを累計500回以上閲覧した、静かで深い観測者。',
    iconName: 'Award',
    emoji: '👀',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    conditionText: '閲覧 500回以上',
    type: 'custom',
    threshold: 500,
    category: 'explore',
    rarity: 'uncommon'
  },

  // --- 時間・習慣系 (Category: habit) ---
  {
    id: 'badge_login_streak',
    name: '1週間がんばった',
    description: 'ジミっちに7日間連続でログインし続けた、素晴らしく堅実で習慣的な継続者！',
    iconName: 'Flame',
    emoji: '📆',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    conditionText: '7日連続ログイン',
    type: 'custom',
    threshold: 7,
    category: 'habit',
    rarity: 'uncommon'
  },
  {
    id: 'badge_night_owl',
    name: '夜更かし初心者',
    description: '深夜帯（23時〜4時）に静かに投稿を行った、月明かりを愛する初心者。',
    iconName: 'Sparkles',
    emoji: '🌙',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    conditionText: '深夜帯に投稿を行う',
    type: 'custom',
    threshold: 1,
    category: 'habit',
    rarity: 'common'
  },
  {
    id: 'badge_elder',
    name: '古参',
    description: 'アカウント登録から180日以上が経過した、ジミっちコミュニティの長老格。',
    iconName: 'Crown',
    emoji: '🛡️',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    conditionText: '登録 180日経過',
    type: 'custom',
    threshold: 180,
    category: 'habit',
    rarity: 'legendary'
  },
  {
    id: 'badge_lunch_eating',
    name: 'お昼の住民',
    description: 'お昼時（12:00〜13:00）に累計30回以上の投稿を行った、もぐもぐ常連者！',
    iconName: 'Trophy',
    emoji: '🍚',
    color: 'text-amber-800',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    conditionText: '12〜13時の投稿 30回以上',
    type: 'custom',
    threshold: 30,
    category: 'habit',
    rarity: 'uncommon'
  },
  {
    id: 'badge_night_walk',
    name: '夜の管理人',
    description: '深夜の2時以降に、エピソードページを累計50回以上閲覧した、静かな守り人。',
    iconName: 'Sparkles',
    emoji: '🦉',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    conditionText: '2時以降の閲覧 50回以上',
    type: 'custom',
    threshold: 50,
    category: 'habit',
    rarity: 'epic'
  },

  // --- 新素材バッジ (Category: material) ---
  {
    id: 'badge_material_wood',
    name: '木製バッジ',
    description: '木のぬくもりを感じる素朴なバッジ。累計5回以上のエピソード投稿を達成しました。',
    iconName: 'Award',
    emoji: '🪵',
    color: 'text-slate-600',
    bgColor: 'bg-amber-50/40',
    borderColor: 'border-amber-300',
    conditionText: '投稿 5回以上',
    type: 'custom',
    threshold: 5,
    category: 'material',
    rarity: 'common'
  },
  {
    id: 'badge_material_metal',
    name: '金属バッジ',
    description: '重みのある確かな証。これまでの投稿で、累計15回以上の共感(Upvote)を受け取りました。',
    iconName: 'Trophy',
    emoji: '⚙️',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
    conditionText: '総獲得共感 15回以上',
    type: 'custom',
    threshold: 15,
    category: 'material',
    rarity: 'uncommon'
  },
  {
    id: 'badge_material_glass',
    name: 'ガラスバッジ',
    description: '上品で透明感がきれい。他者の投稿を他ならぬ自身の目で150回以上閲覧しました。',
    iconName: 'Award',
    emoji: '💎',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50/30',
    borderColor: 'border-cyan-200',
    conditionText: '閲覧 150回以上',
    type: 'custom',
    threshold: 150,
    category: 'material',
    rarity: 'rare'
  },
  {
    id: 'badge_material_crystal',
    name: 'クリスタルバッジ',
    description: 'キラキラと幻想的に輝くバッジ。ジミっちへの累計ログインが15日に達した人に贈られます。',
    iconName: 'Sparkles',
    emoji: '🔮',
    color: 'text-fuchsia-500',
    bgColor: 'bg-fuchsia-50/30',
    borderColor: 'border-fuchsia-200',
    conditionText: '累計ログイン 15日以上',
    type: 'custom',
    threshold: 15,
    category: 'material',
    rarity: 'epic'
  },
  {
    id: 'badge_material_hologram',
    name: 'ホログラムバッジ',
    description: '見る角度で鮮やかに色が変わる特別なバッジ。他者の投稿に25回以上のコメントをしました。',
    iconName: 'Sparkles',
    emoji: '💿',
    color: 'text-violet-500',
    bgColor: 'bg-violet-50/30',
    borderColor: 'border-violet-200',
    conditionText: 'コメント送信 25回以上',
    type: 'custom',
    threshold: 25,
    category: 'material',
    rarity: 'rare'
  },
  {
    id: 'badge_material_neon',
    name: 'ネオンバッジ',
    description: '夜に光る電子のような美しいネオン。深夜帯（23時〜4時）の投稿が合計10回を超えました。',
    iconName: 'Zap',
    emoji: '🌐',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50/30',
    borderColor: 'border-emerald-200',
    conditionText: '深夜帯の投稿 10回以上',
    type: 'custom',
    threshold: 10,
    category: 'material',
    rarity: 'epic'
  },
  {
    id: 'badge_material_flame',
    name: '炎バッジ',
    description: '燃え盛る情熱。たったひとつのエピソードで、一挙に25個以上の共感を受け取った栄誉です。',
    iconName: 'Flame',
    emoji: '🔥',
    color: 'text-red-500',
    bgColor: 'bg-red-50/30',
    borderColor: 'border-red-200',
    conditionText: '1投稿で 25共感達成',
    type: 'custom',
    threshold: 25,
    category: 'material',
    rarity: 'epic'
  },
  {
    id: 'badge_material_starry',
    name: '星空バッジ',
    description: '満点の星空。深夜帯の徘徊（2時以降の閲覧）が20回を超え、静かなロマンを感じています。',
    iconName: 'Sparkles',
    emoji: '🌌',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50/30',
    borderColor: 'border-blue-200',
    conditionText: '2時以降の閲覧 20回以上',
    type: 'custom',
    threshold: 20,
    category: 'material',
    rarity: 'rare'
  },

  // --- ユニーク・ネタ系 (Category: unique) ---
  {
    id: 'streak_6',
    name: '地味の向こう側',
    description: 'なんと6連続以上で予測成功！ジミ共感の頂点に立っています。',
    iconName: 'Sparkles',
    emoji: '👼',
    color: 'text-rose-550',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    conditionText: '予測成功 6連続以上',
    type: 'streak',
    threshold: 6,
    category: 'unique',
    rarity: 'mythic'
  },
  {
    id: 'badge_silent_king',
    name: '特に何もない',
    description: '50回以上投稿したのに、1投稿あたりの平均共感数が3以下の、シュールな空気。',
    iconName: 'Target',
    emoji: '🫥',
    color: 'text-rose-400',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-150',
    conditionText: '投稿50回以上、平均共感3以下',
    type: 'custom',
    threshold: 50,
    category: 'unique',
    rarity: 'mythic'
  },
  {
    id: 'badge_delete_past',
    name: '消したい過去',
    description: 'エピソードの投稿削除を累計20回以上実行した、履歴の断捨離プロ。',
    iconName: 'Zap',
    emoji: '💀',
    color: 'text-rose-600',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
    conditionText: '投稿削除 20回以上',
    type: 'custom',
    threshold: 20,
    category: 'unique',
    rarity: 'uncommon'
  },
  {
    id: 'badge_returned',
    name: '帰還者',
    description: '30日以上の期間をあけて再びジミっちに戻ってきた、おかえりなさいの旅人！',
    iconName: 'Sparkles',
    emoji: '🪃',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    conditionText: '30日ぶり以上の復帰ログイン',
    type: 'custom',
    threshold: 1,
    category: 'unique',
    rarity: 'mythic'
  },
  {
    id: 'badge_buzz_almost',
    name: 'ギリギリ人間',
    description: 'いずれかの投稿で、惜しくも1000に1つ足りない「ちょうど999共感」に達した奇跡！',
    iconName: 'Zap',
    emoji: '🚨',
    color: 'text-rose-500',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    conditionText: '1投稿で ちょうど999共感',
    type: 'custom',
    threshold: 999,
    category: 'unique',
    rarity: 'uncommon'
  },
  {
    id: 'badge_invisible',
    name: '空気',
    description: '7日間以上連続で投稿を行ったものの、受け取った共感(Upvote)がすべてゼロだった。',
    iconName: 'Award',
    emoji: '🫥',
    color: 'text-rose-450',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-100',
    conditionText: '7投稿以上して全投稿反応ゼロ',
    type: 'custom',
    threshold: 7,
    category: 'unique',
    rarity: 'mythic'
  },
  {
    id: 'badge_lucky_gacha',
    name: '運営もびっくり',
    description: 'おみくじやガチャ引きで大吉（SSR）を獲得した超ラッキーパーソン！',
    iconName: 'Sparkles',
    emoji: '🎲',
    color: 'text-rose-500',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    conditionText: 'ガチャ・おみくじに当選する',
    type: 'custom',
    threshold: 1,
    category: 'unique',
    rarity: 'mythic'
  },
  // --- ガチャ限定バッジ (Gacha Exclusives) ---
  {
    id: 'badge_gacha_socks',
    name: '靴下片方ない',
    description: '靴下が片方だけ見当たらないときの、あのなんとも言えない切なさを知る者。',
    iconName: 'Trophy',
    emoji: '🧦',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    conditionText: 'ガチャ限定 (コモン)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'common'
  },
  {
    id: 'badge_gacha_stone',
    name: '特にない',
    description: '聞かれても「特にない」としか答えられない、無の境地を極めし地味。',
    iconName: 'Flame',
    emoji: '🗿',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-205',
    conditionText: 'ガチャ限定 (アンコモン)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'uncommon'
  },
  {
    id: 'badge_gacha_sofa',
    name: 'ソファの主',
    description: '一度ソファに沈み込むと、二度と立ち上がらないと誓ったリビングの主。',
    iconName: 'Award',
    emoji: '🛋️',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    conditionText: 'ガチャ限定 (レア)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'rare'
  },
  {
    id: 'badge_gacha_antenna',
    name: '電波1本',
    description: '電波が1本しか立っていない極限状態でも、静かにアンテナを張り続ける者。',
    iconName: 'Zap',
    emoji: '📡',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-250',
    conditionText: 'ガチャ限定 (レア)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'rare'
  },
  {
    id: 'badge_gacha_owl',
    name: '深夜管理人',
    description: 'みんなが寝静まった深夜にひっそりと現れ、地味を見守る夜のフクロウ。',
    iconName: 'Sparkles',
    emoji: '🦉',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    conditionText: 'ガチャ限定 (エピック)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'epic'
  },
  {
    id: 'badge_gacha_bread',
    name: 'トースト成功',
    description: '朝、トーストがちょっとだけ焦げたけど、それも含めて完璧な仕上がりだった奇跡！',
    iconName: 'Trophy',
    emoji: '🍞',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    conditionText: 'ガチャ限定 (エピック)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'epic'
  },
  {
    id: 'badge_gacha_starry',
    name: 'なんかエモい',
    description: '日常の些細な瞬間に、説明のつかない「なんかエモい」を感じてしまう感性。',
    iconName: 'Sparkles',
    emoji: '🌌',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    conditionText: 'ガチャ限定 (レジェンダリー)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'legendary'
  },
  {
    id: 'badge_gacha_crown',
    name: '地味王候補',
    description: '紙でできた粗末な王冠を頭に載せ、今日も王国の地味ライフを統治する。',
    iconName: 'Crown',
    emoji: '👑',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    conditionText: 'ガチャ限定 (レジェンダリー)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'legendary'
  },
  // --- 新追加 ガチャ限定バッジ (アンコモン) ---
  {
    id: 'badge_gacha_yofukashi_nintei',
    name: '夜更かし認定',
    description: '深夜まで起きているその不屈の地味力を公式認定。',
    iconName: 'Award',
    emoji: '🌙',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-150',
    conditionText: 'ガチャ限定 (アンコモン)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'uncommon'
  },
  {
    id: 'badge_gacha_nurui_coffee',
    name: 'ぬるいコーヒー',
    description: '淹れてからしばらく放置された、あの絶妙な温度を慈しむ。',
    iconName: 'Award',
    emoji: '☕',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-150',
    conditionText: 'ガチャ限定 (アンコモン)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'uncommon'
  },
  {
    id: 'badge_gacha_chisai_radio',
    name: '小さいラジオ',
    description: '静かな部屋の片隅で、微かなノイズとともに低音を紡ぐ。',
    iconName: 'Award',
    emoji: '📻',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-150',
    conditionText: 'ガチャ限定 (アンコモン)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'uncommon'
  },
  {
    id: 'badge_gacha_nanka_mita_kagami',
    name: 'なんか見た鏡',
    description: '通りすがりにふと覗き込み、いつも通りの自分を確認した証。',
    iconName: 'Award',
    emoji: '🪞',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-150',
    conditionText: 'ガチャ限定 (アンコモン)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'uncommon'
  },
  {
    id: 'badge_gacha_sofa_kotei',
    name: 'ソファ固定席',
    description: '完全にフィットしてしまい、一時的に重力が増したリビングの一角。',
    iconName: 'Award',
    emoji: '🛋️',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-150',
    conditionText: 'ガチャ限定 (アンコモン)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'uncommon'
  },
  {
    id: 'badge_gacha_aita_mama_hon',
    name: '開いたまま本',
    description: 'しおりすら挟まず、開きっぱなしで眠りについたぬくもりの主。',
    iconName: 'Award',
    emoji: '📚',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-150',
    conditionText: 'ガチャ限定 (アンコモン)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'uncommon'
  },
  {
    id: 'badge_gacha_kori_nokori',
    name: '氷1個残り',
    description: '製氷機から零れ落ち、グラスの中で小さく鳴り響く最後のひとかけら。',
    iconName: 'Award',
    emoji: '🧊',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-150',
    conditionText: 'ガチャ限定 (アンコモン)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'uncommon'
  },
  {
    id: 'badge_gacha_hanbun_fusen',
    name: '半分終わった付箋',
    description: '終わったタスクとこれからが同居する、整理整頓の発展途上。',
    iconName: 'Award',
    emoji: '📌',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-150',
    conditionText: 'ガチャ限定 (アンコモン)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'uncommon'
  },
  // --- 新追加 ガチャ限定バッジ (レア) ---
  {
    id: 'badge_gacha_sasatta_ya',
    name: '刺さった矢',
    description: '誰かの心に静かに刺さり続ける、確かなあるあるの矢。',
    iconName: 'Target',
    emoji: '🎯',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-150',
    conditionText: 'ガチャ限定 (レア)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'rare'
  },
  {
    id: 'badge_gacha_chisai_nami',
    name: '小さい波',
    description: '静寂を破る、そよ風が起こしたささやかなるエモーショナルウェーブ。',
    iconName: 'Target',
    emoji: '🌊',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-150',
    conditionText: 'ガチャ限定 (レア)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'rare'
  },
  {
    id: 'badge_gacha_shinya_bangumi',
    name: '深夜番組',
    description: '夜更かしの果てに偶然流れていた、妙に興味深いローカル情報。',
    iconName: 'Target',
    emoji: '📺',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-150',
    conditionText: 'ガチャ限定 (レア)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'rare'
  },
  {
    id: 'badge_gacha_yoru_owl',
    name: '夜フクロウ',
    description: 'みんなが眠る静謐な闇の中で、鋭く日常を観察する夜行性の瞳。',
    iconName: 'Target',
    emoji: '🦉',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-150',
    conditionText: 'ガチャ限定 (レア)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'rare'
  },
  {
    id: 'badge_gacha_nazo_coin',
    name: '謎コイン',
    description: 'ポケットに入っていた、いつどこで手に入れたか思い出せない金属片。',
    iconName: 'Target',
    emoji: '🪙',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-150',
    conditionText: 'ガチャ限定 (レア)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'rare'
  },
  {
    id: 'badge_gacha_katamimi_earphone',
    name: '片耳イヤホン',
    description: '周囲の音を遮断しきらず、片耳だけで静かに世界と繋がるスタイル。',
    iconName: 'Target',
    emoji: '🎧',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-150',
    conditionText: 'ガチャ限定 (レア)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'rare'
  },
  {
    id: 'badge_gacha_chisai_ginga',
    name: '小さい銀河',
    description: '手のひらのなかの小さな画面に広がる、私たちのささやかな星団。',
    iconName: 'Target',
    emoji: '🌌',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-150',
    conditionText: 'ガチャ限定 (レア)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'rare'
  },
  {
    id: 'badge_gacha_kosan_ticket',
    name: '古参チケット',
    description: '時の流れが証明する、このコミュニティをずっと支え続けてきた情熱。',
    iconName: 'Target',
    emoji: '🎫',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-150',
    conditionText: 'ガチャ限定 (レア)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'rare'
  },
  // --- 新追加 ガチャ限定バッジ (エピック) ---
  {
    id: 'badge_gacha_empathy_dna',
    name: '共感DNA',
    description: 'もはや直感で他人の地味あるあるを察知できる、究極の同調遺伝子。',
    iconName: 'Sparkles',
    emoji: '🧬',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-150',
    conditionText: 'ガチャ限定 (エピック)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'epic'
  },
  {
    id: 'badge_gacha_sho_wakusei',
    name: '小惑星',
    description: '太陽系の片隅をひっそりと、しかし意思を持って周回する小さな天体。',
    iconName: 'Sparkles',
    emoji: '🪐',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-150',
    conditionText: 'ガチャ限定 (エピック)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'epic'
  },
  {
    id: 'badge_gacha_hikaru_no',
    name: '光る脳',
    description: '共感予測の瞬間に一筋の閃光を放つ、美しきあるあるニューロン。',
    iconName: 'Sparkles',
    emoji: '🧠',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-150',
    conditionText: 'ガチャ限定 (エピック)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'epic'
  },
  {
    id: 'badge_gacha_kami_wand',
    name: '紙の王冠',
    description: '安っぽく見えて、そこには地味界を統べる確かな誇りと王座がある。',
    iconName: 'Sparkles',
    emoji: '🪄',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-150',
    conditionText: 'ガチャ限定 (エピック)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'epic'
  },
  {
    id: 'badge_gacha_shinya_denpa',
    name: '深夜電波',
    description: '深夜0時の静けさにのみ聞こえてくる、私たちだけの微かな心の共鳴。',
    iconName: 'Sparkles',
    emoji: '📡',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-150',
    conditionText: 'ガチャ限定 (エピック)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'epic'
  },
  {
    id: 'badge_gacha_furui_film',
    name: '古いフィルム',
    description: '色褪せた記憶の１ページに刻まれた、いつまでも風化しない日常。',
    iconName: 'Sparkles',
    emoji: '🎞️',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-150',
    conditionText: 'ガチャ限定 (エピック)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'epic'
  },
  {
    id: 'badge_gacha_glass_cho',
    name: 'ガラス蝶',
    description: '壊れやすく、しかし透明な輝きを保ちながら優雅に羽ばたく奇跡。',
    iconName: 'Sparkles',
    emoji: '🦋',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-150',
    conditionText: 'ガチャ限定 (エピック)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'epic'
  },
  {
    id: 'badge_gacha_ochiru_ryusei',
    name: '落ちる流星',
    description: '通りすがり、ただそれだけのために夜空を引き裂いた光の尾。',
    iconName: 'Sparkles',
    emoji: '🌠',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-150',
    conditionText: 'ガチャ限定 (エピック)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'epic'
  },
  // --- 新追加 ガチャ限定バッジ (レジェンダリー) ---
  {
    id: 'badge_gacha_kami_okan',
    name: '紙王冠',
    description: 'ただの紙切れ。だがこれこそが真の『地味あるある王』の証。',
    iconName: 'Crown',
    emoji: '👑',
    color: 'text-amber-800',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    conditionText: 'ガチャ限定 (レジェンダリー)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'legendary'
  },
  {
    id: 'badge_gacha_kodai_arch',
    name: '古代アーチ',
    description: '悠久の時を越えて、地味の歴史を静かに支え続けている巨大な門。',
    iconName: 'Crown',
    emoji: '🏛️',
    color: 'text-amber-800',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    conditionText: 'ガチャ限定 (レジェンダリー)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'legendary'
  },
  {
    id: 'badge_gacha_hane_pen',
    name: '羽ペン',
    description: '人知れず静かに、私たちの日常のつぶやきを歴史書に記録する。',
    iconName: 'Crown',
    emoji: '🪶',
    color: 'text-amber-800',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    conditionText: 'ガチャ限定 (レジェンダリー)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'legendary'
  },
  {
    id: 'badge_gacha_mangetsu',
    name: '満月',
    description: '暗闇の一切を静かに照らし出し、心地よい夜を包み込む完璧な球体。',
    iconName: 'Crown',
    emoji: '🌕',
    color: 'text-amber-800',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    conditionText: 'ガチャ限定 (レジェンダリー)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'legendary'
  },
  {
    id: 'badge_gacha_akanai_kagi',
    name: '開かない鍵',
    description: '誰にもこじあけられない、絶対に解けない謎めいた自己のコア。',
    iconName: 'Crown',
    emoji: '🗝️',
    color: 'text-amber-800',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    conditionText: 'ガチャ限定 (レジェンダリー)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'legendary'
  },
  {
    id: 'badge_gacha_himitsu_no_kami',
    name: '秘密の紙',
    description: '世界の深淵にひっそり記された、あるある共感のバイブル。',
    iconName: 'Crown',
    emoji: '📜',
    color: 'text-amber-800',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    conditionText: 'ガチャ限定 (レジェンダリー)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'legendary'
  },
  {
    id: 'badge_gacha_anaaki_kinka',
    name: '穴あき金貨',
    description: '中央に穴が空いている、かつて人々が大切に流通させた不朽の資産。',
    iconName: 'Crown',
    emoji: '🪙',
    color: 'text-amber-800',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    conditionText: 'ガチャ限定 (レジェンダリー)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'legendary'
  },
  {
    id: 'badge_gacha_chisana_yusho',
    name: '小さな優勝',
    description: '派手なトロフィーはない。だがあなたのささやかな心が今日、確かに優勝した。',
    iconName: 'Crown',
    emoji: '🏆',
    color: 'text-amber-800',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    conditionText: 'ガチャ限定 (レジェンダリー)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'legendary'
  },
  // --- 新追加 ガチャ限定バッジ (ミシック) ---
  {
    id: 'badge_gacha_nanimonai_en',
    name: '何もない円',
    description: '無であることの完璧さ。引き算の果てにたどり着いた地味の終着点。',
    iconName: 'Flame',
    emoji: '🌑',
    color: 'text-rose-800',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    conditionText: 'ガチャ限定 (ミシック)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'mythic'
  },
  {
    id: 'badge_gacha_noise_to',
    name: 'ノイズ塔',
    description: '絶え間なくノイズを送信し続ける、世界の最果てに屹立する謎の塔。',
    iconName: 'Flame',
    emoji: '📡',
    color: 'text-rose-800',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    conditionText: 'ガチャ限定 (ミシック)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'mythic'
  },
  {
    id: 'badge_gacha_tomei_badge',
    name: '透明バッジ',
    description: '見ようとしても見えない。そこにただ存在する最高度の静けさ。',
    iconName: 'Flame',
    emoji: '🫥',
    color: 'text-rose-800',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    conditionText: 'ガチャ限定 (ミシック)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'mythic'
  },
  {
    id: 'badge_gacha_tada_no_ishi',
    name: 'ただの石',
    description: 'ただそこにあるだけの石ころ。その不変なる存在感に静かに敬意を表す。',
    iconName: 'Flame',
    emoji: '🗿',
    color: 'text-rose-800',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    conditionText: 'ガチャ限定 (ミシック)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'mythic'
  },
  {
    id: 'badge_gacha_chisai_ana',
    name: '小さい穴',
    description: 'のぞき込むと吸い込まれそうになる、意識の底に開いた小さな暗黒。',
    iconName: 'Flame',
    emoji: '🕳️',
    color: 'text-rose-800',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    conditionText: 'ガチャ限定 (ミシック)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'mythic'
  },
  {
    id: 'badge_gacha_me_mitaina_nanika',
    name: '目みたいな何か',
    description: '見つめ返してくる、異次元の気配を感じるまばゆいシンボル。',
    iconName: 'Flame',
    emoji: '🧿',
    color: 'text-rose-800',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    conditionText: 'ガチャ限定 (ミシック)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'mythic'
  },
  {
    id: 'badge_gacha_yugami',
    name: '歪み',
    description: '日常の時空間が少しだけ揺らぎ、不思議な共感の歪みが生じた。',
    iconName: 'Flame',
    emoji: '🌀',
    color: 'text-rose-800',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    conditionText: 'ガチャ限定 (ミシック)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'mythic'
  },
  {
    id: 'badge_gacha_hyoji_dekimasen',
    name: '表示できません',
    description: '記述不可能、デコード不能、ただ圧倒的なミステリー。',
    iconName: 'Flame',
    emoji: '❔',
    color: 'text-rose-800',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    conditionText: 'ガチャ限定 (ミシック)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'mythic'
  },
  // --- ガチャシークレット (コイン返却イースターエッグトリガー) ---
  {
    id: 'badge_gacha_mawasanakatta',
    name: '回さなかった',
    description: '何も得なかった。でも少し嬉しい。',
    iconName: 'Trophy',
    emoji: '🪙',
    color: 'text-rose-800',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    conditionText: 'ガチャ限定 (シークレット)',
    type: 'custom',
    threshold: 999999,
    category: 'unique',
    rarity: 'mythic'
  },
  // --- Overseas & Australia Badges ---
  {
    id: 'badge_overseas_kangaroo',
    name: 'カンガルー目撃者',
    nameEn: 'Kangaroo Witness',
    description: 'オーストラリアからのアクセス、または滞在を記録した証！',
    descriptionEn: 'Witnessed Australia! Granted for accessing or posting from Australia or simulated overseas mode.',
    iconName: 'Award',
    emoji: '🦘',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    conditionText: 'オーストラリア滞在中にログイン/シミュレートで獲得',
    conditionTextEn: 'Logged in or simulated staying in Australia',
    type: 'custom',
    threshold: 1,
    category: 'unique',
    rarity: 'common'
  },
  {
    id: 'badge_overseas_pioneer',
    name: '海外開拓者',
    nameEn: 'Overseas Pioneer',
    description: '海の向こうから地味っちを使い始めた、勇敢な先駆者。',
    descriptionEn: 'Dared to use Jimicchi from across the sea as an early pioneer.',
    iconName: 'Sparkles',
    emoji: '🌏',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-300',
    conditionText: '海外/オーストラリアから初の投稿を完了する',
    conditionTextEn: 'First post completed from Australia/Overseas',
    type: 'custom',
    threshold: 1,
    category: 'unique',
    rarity: 'rare'
  },
  {
    id: 'badge_overseas_queensland',
    name: 'クイーンズランド探索者',
    nameEn: 'Queensland Explorer',
    description: 'オーストラリア・クイーンズランド州に滞在し、地味共感を広げた冒険家！',
    descriptionEn: 'Stayed in Queensland, Australia, exploring and spreading small relatable moments!',
    iconName: 'Trophy',
    emoji: '🏝️',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    conditionText: 'オーストラリア/クイーンズランド州で3回以上投稿する',
    conditionTextEn: 'Post 3 or more times from Queensland/Australia',
    type: 'custom',
    threshold: 3,
    category: 'unique',
    rarity: 'epic'
  },
  {
    id: 'badge_overseas_first_user',
    name: '初の海外ユーザー',
    nameEn: 'First International User',
    description: '地味っち初のオーストラリア進出計画における、初の記念すべき海外ユーザー第一号！',
    descriptionEn: 'The historic first international user in the Jimicchi Australia Expansion Project!',
    iconName: 'Crown',
    emoji: '✈️',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-250',
    conditionText: '海外進出計画の最初の海外ユーザーになる',
    conditionTextEn: 'Granted to early international accounts or simulated global users',
    type: 'custom',
    threshold: 1,
    category: 'unique',
    rarity: 'legendary'
  },
  {
    id: 'badge_overseas_across_ocean',
    name: '海を越えた共感',
    nameEn: 'Across the Ocean',
    description: '国境と海を越えて他ユーザーに「それな！」の共感を送った、または受け取ったグローバルリーダー！',
    descriptionEn: 'Across countries and oceans, gave or received a relativistic empathetic upvote!',
    iconName: 'Flame',
    emoji: '🌊',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    conditionText: '日本のユーザーと海外のユーザー間でUpvoteのやりとりを成立させる',
    conditionTextEn: 'Send or receive upvotes between Japanese and International accounts',
    type: 'custom',
    threshold: 1,
    category: 'unique',
    rarity: 'mythic'
  },
  {
    id: 'badge_jse_first_trade',
    name: '📈 初取引 (First Trade)',
    description: 'JSE「人類あるある市場」で初めての取引注文を完了した優良な初期メンバー。',
    iconName: 'Sparkles',
    emoji: '🪙',
    color: 'text-[#b45309]',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    conditionText: 'JSEでいすれかの日常現象株を初めて購入または売却する',
    type: 'custom',
    threshold: 1,
    category: 'unique',
    rarity: 'uncommon'
  },
  {
    id: 'badge_jse_first_profit',
    name: '📈 初利益 (First Profit)',
    description: '相場を生き抜き、日常あるある株の売り買いによって初めて純利益を確定させた敏腕トレーダー。',
    iconName: 'Trophy',
    emoji: '🏆',
    color: 'text-rose-605',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    conditionText: 'JSE取引の確定損益(Realized Profit)をプラスにする',
    type: 'custom',
    threshold: 1,
    category: 'unique',
    rarity: 'rare'
  },
  {
    id: 'badge_jse_wealth_100k',
    name: '📈 資産10万J (100k Wealth)',
    description: '地味株の波を読み解き、総資産評価額を大台の「100,000 J-Coin」に乗せたJSE中堅資産家。',
    iconName: 'Crown',
    emoji: '👑',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    conditionText: 'JSEでのキャッシュと保有株の合計評価額が10万Jに達する',
    type: 'custom',
    threshold: 100000,
    category: 'unique',
    rarity: 'epic'
  },
  {
    id: 'badge_jse_wealth_1m',
    name: '📈 資産100万J (1M Wealth)',
    description: 'あるある経済圏を完全に掌握し、資産評価額「1,000,000 J-Coin」を記録した市場伝説。',
    iconName: 'Crown',
    emoji: '💎',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-350',
    conditionText: 'JSEでのキャッシュと保有株の合計評価額が100万Jに達する',
    type: 'custom',
    threshold: 1000000,
    category: 'unique',
    rarity: 'legendary'
  }
];

export const TITLE_PREFIXES: TitlePart[] = [
  // デフォルト
  { id: 'p_free_1', text: '地味共感の', conditionText: '最初から選択可能', type: 'free', threshold: 0 },

  // 新規追加2つ名（前部）
  { id: 'p_first_post', text: '生まれたての', conditionText: '初投稿', type: 'custom', threshold: 1 },
  { id: 'p_login_3', text: 'はじめての', conditionText: '3日連続ログイン', type: 'custom', threshold: 3 },
  { id: 'p_view_50', text: 'まだ無名の', conditionText: '閲覧50回', type: 'custom', threshold: 50 },
  { id: 'p_votes_100', text: '地味に', conditionText: '共感100獲得', type: 'custom', threshold: 100 },
  { id: 'p_votes_1000', text: 'あるあるの', conditionText: '1000共感', type: 'custom', threshold: 1000 },
  { id: 'p_vote_one_100', text: '共感されし', conditionText: '1投稿100共感', type: 'custom', threshold: 100 },
  { id: 'p_night_50', text: '深夜の', conditionText: '23〜4時投稿50回', type: 'custom', threshold: 50 },
  { id: 'p_comment_rate_30', text: '刺さりすぎた', conditionText: 'コメント率30%', type: 'custom', threshold: 30 },
  { id: 'p_posts_100', text: '静かなる', conditionText: '投稿100回', type: 'custom', threshold: 100 },
  { id: 'p_login_30', text: '気づいたら', conditionText: '30日継続', type: 'custom', threshold: 30 },
  { id: 'p_login_100', text: '生活の一部な', conditionText: '100日継続', type: 'custom', threshold: 100 },
  { id: 'p_posts_1000', text: '終わりなき', conditionText: '投稿1000回', type: 'custom', threshold: 1000 },
  { id: 'p_weekday_lunch', text: '宿題より', conditionText: '平日昼投稿多い', type: 'custom', threshold: 30 },
  { id: 'p_night_streak_3', text: 'なぜここに', conditionText: '深夜3日連続', type: 'custom', threshold: 3 },
  { id: 'p_no_votes_20', text: '共感されない', conditionText: '投稿20回平均共感0以下', type: 'custom', threshold: 20 },
  { id: 'p_silent_100', text: '既読感覚の', conditionText: '投稿せず100日', type: 'custom', threshold: 100 },
  { id: 'p_blocked_1', text: '気まずい', conditionText: 'コメント停止された回数', type: 'custom', threshold: 1 },
  { id: 'p_mythic_30', text: '神話級の', conditionText: '全称号30%解放', type: 'custom', threshold: 30 },
  { id: 'p_top_1', text: '伝説の', conditionText: '全体TOP1%(総共感500以上)', type: 'custom', threshold: 500 },
  { id: 'p_secret', text: '運営でも', conditionText: '隠しメッセージ・隠し条件', type: 'custom', threshold: 1 },

  // 予測ゲーム実績連動（後方互換用）
  { id: 'p_total_1', text: 'ビギナー', conditionText: '累積予測成功 1回', type: 'total', threshold: 1 },
  { id: 'p_total_2', text: 'お忍びの', conditionText: '累積予測成功 2回', type: 'total', threshold: 2 },
  { id: 'p_total_3', text: '共感の', conditionText: '累積予測成功 3回', type: 'total', threshold: 3 },
  { id: 'p_total_4', text: 'インサイト', conditionText: '累積予測成功 4回', type: 'total', threshold: 4 },
  { id: 'p_total_5', text: '人間心理の', conditionText: '累積予測成功 5回', type: 'total', threshold: 5 },
  { id: 'p_total_8', text: '神算鬼謀の', conditionText: '累積予測成功 8回', type: 'total', threshold: 8 },
  { id: 'p_total_10', text: '100%を', conditionText: '累積予測成功 10回', type: 'total', threshold: 10 },
  { id: 'p_streak_3', text: '心眼の', conditionText: '予測成功 3連続以上', type: 'streak', threshold: 3 },
  { id: 'p_streak_4', text: '第６感の', conditionText: '予測成功 4連続以上', type: 'streak', threshold: 4 },
  { id: 'p_streak_5', text: 'テレパシーの', conditionText: '予測成功 5連続以上', type: 'streak', threshold: 5 },
  { id: 'p_streak_6', text: '絶対的', conditionText: '予測成功 6連続以上', type: 'streak', threshold: 6 },

  // --- ガチャ限定二つ名（前部） ---
  { id: 'p_gacha_nantonaku', text: 'なんとなく', conditionText: 'ガチャ限定 (コモン)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_futsu', text: '普通の', conditionText: 'ガチャ限定 (コモン)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_chotto', text: 'ちょっとだけ', conditionText: 'ガチャ限定 (コモン)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_nemukatta', text: '眠かった', conditionText: 'ガチャ限定 (コモン)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_kyukei', text: '休憩中の', conditionText: 'ガチャ限定 (アンコモン)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_daitai', text: 'だいたい', conditionText: 'ガチャ限定 (アンコモン)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_nichijo', text: '日常の', conditionText: 'ガチャ限定 (レア)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_kukiyomu', text: '空気読む', conditionText: 'ガチャ限定 (レア)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_kyokan', text: '共感の', conditionText: 'ガチャ限定 (レア)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_shinya', text: '深夜だけの', conditionText: 'ガチャ限定 (エピック)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_hitokoto', text: '一言で', conditionText: 'ガチャ限定 (エピック)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_densetsumiman', text: '伝説未満の', conditionText: 'ガチャ限定 (エピック)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_jimikkai', text: '地味界の', conditionText: 'ガチャ限定 (レジェンダリー)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_uneimo', text: '運営も', conditionText: 'ガチャ限定 (レジェンダリー)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_shinwaky', text: '神話級の', conditionText: 'ガチャ限定 (ミシック)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_konohitodake', text: 'この人だけ', conditionText: 'ガチャ限定 (ミシック)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_mukogawa', text: '向こう側の', conditionText: 'ガチャ限定 (ミシック)', type: 'custom', threshold: 999999 },

  // --- 新規追加 ガチャ限定二つ名（前部） ---
  { id: 'p_gacha_tamatama', text: 'たまたま', conditionText: 'ガチャ限定 (アンコモン)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_yuruku', text: 'ゆるく', conditionText: 'ガチャ限定 (アンコモン)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_shizukana', text: '静かな', conditionText: 'ガチャ限定 (アンコモン)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_bimyo', text: '微妙に', conditionText: 'ガチャ限定 (アンコモン)', type: 'custom', threshold: 999999 },
  
  { id: 'p_gacha_yosogai', text: '予想外の', conditionText: 'ガチャ限定 (レア)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_soreiu', text: 'それ言う？', conditionText: 'ガチャ限定 (レア)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_jimino', text: '地味の', conditionText: 'ガチャ限定 (レア)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_yorunishika', text: '夜にしか', conditionText: 'ガチャ限定 (レア)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_minnano', text: 'みんなの', conditionText: 'ガチャ限定 (レア)', type: 'custom', threshold: 999999 },

  { id: 'p_gacha_nichijo_shiru', text: '日常を知る', conditionText: 'ガチャ限定 (エピック)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_shosupa', text: '少数派の', conditionText: 'ガチャ限定 (エピック)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_kizukanai', text: '気付かない', conditionText: 'ガチャ限定 (エピック)', type: 'custom', threshold: 999999 },

  { id: 'p_gacha_kyokan_sonomono', text: '共感そのもの', conditionText: 'ガチャ限定 (レジェンダリー)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_kirokusarenai', text: '記録されない', conditionText: 'ガチャ限定 (レジェンダリー)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_sekaino_hasi', text: '世界の端の', conditionText: 'ガチャ限定 (レジェンダリー)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_unei_konin', text: '運営公認の', conditionText: 'ガチャ限定 (レジェンダリー)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_jimino_saki', text: '地味の先に', conditionText: 'ガチャ限定 (レジェンダリー)', type: 'custom', threshold: 999999 },

  { id: 'p_gacha_zuttomae', text: 'ずっと前から', conditionText: 'ガチャ限定 (ミシック)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_daremo_shiranai', text: '誰も知らない', conditionText: 'ガチャ限定 (ミシック)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_jimi_wo_koeta', text: '地味を超えた', conditionText: 'ガチャ限定 (ミシック)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_sansoku_dekinai', text: '観測できない', conditionText: 'ガチャ限定 (ミシック)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_yoku_ga_nai', text: '欲がない', conditionText: 'ガチャ限定 (シークレット)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_gachizei', text: 'ガチャ極めし', conditionText: 'ガチャ限定 (レジェンダリー)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_jimi_kami', text: '地味をも超越した', conditionText: 'ガチャ限定 (ミシック)', type: 'custom', threshold: 999999 },
  { id: 'p_gacha_ultimate_synchro', text: '同調率400%の', conditionText: 'ガチャ限定 (ミシック)', type: 'custom', threshold: 999999 },
  
  // 地味ひろば実績二つ名 (前部)
  { id: 'p_plaza_jimi_haiku_poet', text: '地味俳人たる', conditionText: '地味ひろば実績', type: 'custom', threshold: 1 },
  { id: 'p_plaza_wordplay', text: '言葉遊びの', conditionText: '地味ひろば実績', type: 'custom', threshold: 1 },
  { id: 'p_plaza_books', text: '本棚の', conditionText: '地味ひろば実績', type: 'custom', threshold: 1 },
  { id: 'p_plaza_midnight_writer', text: '深夜の', conditionText: '地味ひろば実績', type: 'custom', threshold: 1 },
  { id: 'p_plaza_one_char_soul', text: '一文字', conditionText: '地味ひろば実績', type: 'custom', threshold: 1 },
  { id: 'p_plaza_laugh_impact', text: '笑撃の', conditionText: '地味ひろば実績', type: 'custom', threshold: 1 },
  { id: 'p_plaza_text_alchemist', text: '活字の', conditionText: '地味ひろば実績', type: 'custom', threshold: 1 },
  { id: 'p_plaza_silence_words', text: '静寂に', conditionText: '地味ひろば実績', type: 'custom', threshold: 1 },

  // 海外限定称号 (前部)
  { id: 'p_overseas_sea', text: '海を越えて', textEn: 'Beyond the Sea', conditionText: 'オーストラリア滞在中にログイン/シミュレート', conditionTextEn: 'Logged in or simulated staying in Australia', type: 'custom', threshold: 1 },
  { id: 'p_overseas_hemisphere', text: '南半球の', textEn: 'Southern Hemisphere', conditionText: 'オーストラリア滞在中にログイン/シミュレート', conditionTextEn: 'Logged in or simulated staying in Australia', type: 'custom', threshold: 1 },
  { id: 'p_overseas_ocean', text: '大洋を渡った', textEn: 'Ocean-Crossing', conditionText: 'オーストラリアから投稿する', conditionTextEn: 'Post from Australia', type: 'custom', threshold: 1 },
  { id: 'p_overseas_queensland', text: 'クイーンズランドの', textEn: "Queensland's", conditionText: 'クイーンズランドから3回以上投稿する', conditionTextEn: 'Post 3 or more times from Queensland/Australia', type: 'custom', threshold: 3 },
  { id: 'p_overseas_border', text: '地味は国境を越える', textEn: 'Jimicchi Crosses Borders', conditionText: '日本とオーストラリアのユーザー間Upvote成立', conditionTextEn: 'Receive or send upvotes between Japan and Australia/Overseas', type: 'custom', threshold: 1 }
];

export const TITLE_SUFFIXES: TitlePart[] = [
  // デフォルト
  { id: 's_free_1', text: '初心者', conditionText: '最初から選択可能', type: 'free', threshold: 0 },

  // 新規追加2つ名（後部）
  { id: 's_first_post', text: '共感民', conditionText: '初投稿', type: 'custom', threshold: 1 },
  { id: 's_login_3', text: 'ジミ使い', conditionText: '3日連続ログイン', type: 'custom', threshold: 3 },
  { id: 's_view_50', text: '観測者', conditionText: '閲覧50回', type: 'custom', threshold: 50 },
  { id: 's_votes_100', text: 'わかる人', conditionText: '共感100獲得', type: 'custom', threshold: 100 },
  { id: 's_votes_1000', text: '支配者', conditionText: '1000共感', type: 'custom', threshold: 1000 },
  { id: 's_vote_one_100', text: '存在', conditionText: '1投稿100共感', type: 'custom', threshold: 100 },
  { id: 's_night_50', text: '共感職人', conditionText: '23〜4時投稿50回', type: 'custom', threshold: 50 },
  { id: 's_comment_rate_30', text: '一言', conditionText: 'コメント率30%', type: 'custom', threshold: 30 },
  { id: 's_posts_100', text: '投稿者', conditionText: '投稿100回', type: 'custom', threshold: 100 },
  { id: 's_login_30', text: '常連', conditionText: '30日継続', type: 'custom', threshold: 30 },
  { id: 's_login_100', text: '人', conditionText: '100日継続', type: 'custom', threshold: 100 },
  { id: 's_posts_1000', text: 'つぶやき', conditionText: '投稿1000回', type: 'custom', threshold: 1000 },
  { id: 's_weekday_lunch', text: 'ジミっち', conditionText: '平日昼投稿多い', type: 'custom', threshold: 30 },
  { id: 's_night_streak_3', text: 'いる人', conditionText: '深夜3日連続', type: 'custom', threshold: 3 },
  { id: 's_no_votes_20', text: '天才', conditionText: '投稿20回平均共感0以下', type: 'custom', threshold: 20 },
  { id: 's_silent_100', text: '閲覧勢', conditionText: '投稿せず100日', type: 'custom', threshold: 100 },
  { id: 's_blocked_1', text: '空気製造機', conditionText: 'コメント停止された回数', type: 'custom', threshold: 1 },
  { id: 's_mythic_30', text: '地味', conditionText: '全称号30%解放', type: 'custom', threshold: 30 },
  { id: 's_top_1', text: '共感源', conditionText: '全体TOP1%(総共感500以上)', type: 'custom', threshold: 500 },
  { id: 's_secret', text: '見たことない', conditionText: '隠しメッセージ・隠し条件', type: 'custom', threshold: 1 },

  // 予測ゲーム実績連動（後方互換用）
  { id: 's_total_1', text: '予測士', conditionText: '累積予測成功 1回', type: 'total', threshold: 1 },
  { id: 's_total_2', text: '追跡者', conditionText: '累積予測成功 2回', type: 'total', threshold: 2 },
  { id: 's_total_3', text: '目利き', conditionText: '累積予測成功 3回', type: 'total', threshold: 3 },
  { id: 's_total_4', text: 'アナリスト', conditionText: '累積予測成功 4回', type: 'total', threshold: 4 },
  { id: 's_total_5', text: 'ソムリエ', conditionText: '累積予測成功 5回', type: 'total', threshold: 5 },
  { id: 's_total_8', text: '名探偵', conditionText: '累積予測成功 8回', type: 'total', threshold: 8 },
  { id: 's_total_10', text: '視る者', conditionText: '累積予測成功 10回', type: 'total', threshold: 10 },
  { id: 's_streak_3', text: '予知能力者', conditionText: '予測成功 3連続以上', type: 'streak', threshold: 3 },
  { id: 's_streak_4', text: 'チャネラー', conditionText: '予測成功 4連続以上', type: 'streak', threshold: 4 },
  { id: 's_streak_5', text: 'シンクロ職人', conditionText: '予測成功 5連続以上', type: 'streak', threshold: 5 },
  { id: 's_streak_6', text: '創造神', conditionText: '予測成功 6連続以上', type: 'streak', threshold: 6 },

  // --- ガチャ限定二つ名（後部） ---
  { id: 's_gacha_kita', text: '来た', conditionText: 'ガチャ限定 (コモン)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_kyokan', text: '共感', conditionText: 'ガチャ限定 (コモン)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_atteru', text: '合ってる', conditionText: 'ガチャ限定 (アンコモン)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_isogashii', text: '忙しい', conditionText: 'ガチャ限定 (アンコモン)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_uraboss', text: '裏ボス', conditionText: 'ガチャ限定 (レア)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_tatsujin', text: '達人', conditionText: 'ガチャ限定 (レア)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_junin', text: '住人', conditionText: 'ガチャ限定 (レア)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_sekaikaeru', text: '世界変える', conditionText: 'ガチャ限定 (エピック)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_densetsu', text: '伝説', conditionText: 'ガチャ限定 (エピック)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_eiyu', text: '英雄', conditionText: 'ガチャ限定 (レジェンダリー)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_sonzai', text: '存在', conditionText: 'ガチャ限定 (レジェンダリー)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_odoroki', text: '驚いた', conditionText: 'ガチャ限定 (レジェンダリー)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_jimi', text: '地味', conditionText: 'ガチャ限定 (ミシック)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_chigau', text: '違う', conditionText: 'ガチャ限定 (ミシック)', type: 'custom', threshold: 999999 },

  // --- 新規追加 ガチャ限定二つ名（後部） ---
  { id: 's_gacha_shinjin', text: '新人', conditionText: 'ガチャ限定 (アンコモン)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_ataru', text: '当たる', conditionText: 'ガチャ限定 (アンコモン)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_ikiru', text: '生きる', conditionText: 'ガチャ限定 (アンコモン)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_kiyo', text: '器用', conditionText: 'ガチャ限定 (アンコモン)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_tami', text: '民', conditionText: 'ガチャ限定 (アンコモン)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_yumei', text: '有名', conditionText: 'ガチャ限定 (アンコモン)', type: 'custom', threshold: 999999 },

  { id: 's_gacha_tankyusha', text: '探究者', conditionText: 'ガチャ限定 (レア)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_hasha', text: '覇者', conditionText: 'ガチャ限定 (レア)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_arawarenai', text: '現れない', conditionText: 'ガチャ限定 (レア)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_kizuki', text: '気付き', conditionText: 'ガチャ限定 (レア)', type: 'custom', threshold: 999999 },

  { id: 's_gacha_kuki_kaeru', text: '空気変える', conditionText: 'ガチャ限定 (エピック)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_kirokusha', text: '記録者', conditionText: 'ガチャ限定 (エピック)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_ou', text: '王', conditionText: 'ガチャ限定 (エピック)', type: 'custom', threshold: 999999 },

  { id: 's_gacha_nahito', text: 'な人', conditionText: 'ガチャ限定 (レジェンダリー)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_kuki', text: '空気', conditionText: 'ガチャ限定 (レジェンダリー)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_ita', text: 'いた', conditionText: 'ガチャ限定 (レジェンダリー)', type: 'custom', threshold: 999999 },

  { id: 's_gacha_iru', text: 'いる', conditionText: 'ガチャ限定 (ミシック)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_kami_jimi', text: '地味神', conditionText: 'ガチャ限定 (ミシック)', type: 'custom', threshold: 999999 },
  { id: 's_gacha_mugen_legend', text: '無限 of 極限', conditionText: 'ガチャ限定 (レジェンダリー)', type: 'custom', threshold: 999999 },
  
  // 地味ひろば実績二つ名 (後部)
  { id: 's_plaza_jimi_haiku_poet', text: '地味俳人', conditionText: '地味ひろば実績', type: 'custom', threshold: 1 },
  { id: 's_plaza_wordplay_master', text: '言葉遊びの達人', conditionText: '地味ひろば実績', type: 'custom', threshold: 1 },
  { id: 's_plaza_books_guardian', text: '本棚の守護者', conditionText: '地味ひろば実績', type: 'custom', threshold: 1 },
  { id: 's_plaza_midnight_novelist', text: '深夜の文豪', conditionText: '地味ひろば実績', type: 'custom', threshold: 1 },
  { id: 's_plaza_one_char_soul', text: '一文字入魂', conditionText: '地味ひろば実績', type: 'custom', threshold: 1 },
  { id: 's_plaza_one_hit_laugh', text: '笑撃の一撃', conditionText: '地味ひろば実績', type: 'custom', threshold: 1 },
  { id: 's_plaza_alchemist', text: '活字の錬金術師', conditionText: '地味ひろば実績', type: 'custom', threshold: 1 },
  { id: 's_plaza_ringing_words', text: '静寂に響く言葉', conditionText: '地味ひろば実績', type: 'custom', threshold: 1 },

  // 海外限定称号 (後部)
  { id: 's_overseas_empathized', text: '共感した', textEn: 'Empathizer', conditionText: 'オーストラリア滞在中にログイン/シミュレート', conditionTextEn: 'Logged in or simulated staying in Australia', type: 'custom', threshold: 1 },
  { id: 's_overseas_regular', text: '常連', textEn: 'Regular', conditionText: 'オーストラリア滞在中にログイン/シミュレート', conditionTextEn: 'Logged in or simulated staying in Australia', type: 'custom', threshold: 1 },
  { id: 's_overseas_poster', text: '投稿者', textEn: 'Poster', conditionText: 'オーストラリアから投稿する', conditionTextEn: 'Post from Australia', type: 'custom', threshold: 1 },
  { id: 's_overseas_explorer', text: '開拓者', textEn: 'Explorer', conditionText: 'クイーンズランドから3回以上投稿する', conditionTextEn: 'Post 3 or more times from Queensland/Australia', type: 'custom', threshold: 3 },
  { id: 's_overseas_person', text: '人', textEn: 'Person', conditionText: '日本とオーストラリアのユーザー間Upvote成立', conditionTextEn: 'Receive or send upvotes between Japan and Australia/Overseas', type: 'custom', threshold: 1 }
];

export const TITLES: Title[] = [
  { id: 'bronze_teller', name: '地味共感の初心者', nameEn: 'Subtle Empathy Beginner', conditionText: '最初から選択可能', conditionTextEn: 'Available from the start' },
  { id: 'title_synchro_1', name: 'ビギナー予測士', nameEn: 'Beginner Predictor', conditionText: '累積予測成功 1回', conditionTextEn: 'Accumulate 1 successful prediction' },
  { id: 'title_synchro_3', name: '共感の目利き', nameEn: 'Empathy Connoisseur', conditionText: '累積予測成功 3回', conditionTextEn: 'Accumulate 3 successful predictions' },
  { id: 'title_synchro_5', name: '人間心理のソムリエ', nameEn: 'Human Psychology Sommelier', conditionText: '累積予測成功 5回', conditionTextEn: 'Accumulate 5 successful predictions' },
  { id: 'title_synchro_10', name: '100%を視る者', nameEn: 'Seer of 100%', conditionText: '累積予測成功 10回', conditionTextEn: 'Accumulate 10 successful predictions' },
  { id: 'title_streak_3', name: '心眼の予知能力者', nameEn: 'Mind-Eye Precognitive', conditionText: '予測成功 3連続', conditionTextEn: 'Prediction streak of 3+' },
  { id: 'title_streak_5', name: 'テレパシー能力者', nameEn: 'Telepathy Psychic', conditionText: '予測成功 5連続', conditionTextEn: 'Prediction streak of 5+' },
  { id: 'title_streak_6', name: '地味共感の創造神', nameEn: 'Creator of Subtle Empathy', conditionText: '予測成功 6連続以上', conditionTextEn: 'Prediction streak of 6+' }
];

// Dynamic English translations map for all localizable badges
const BADGES_EN_TRANSLATIONS: Record<string, { nameEn: string; descriptionEn: string; conditionTextEn: string }> = {
  badge_haiku_king: {
    nameEn: 'Subtle Haiku King',
    descriptionEn: 'Winner of the Subtle Haiku Contest in Jimi Plaza! A legendary poet of the mundane.',
    conditionTextEn: 'Won the Jimi Plaza Haiku contest'
  },
  badge_dajare_king: {
    nameEn: 'Subtle Pun King',
    descriptionEn: 'Winner of the Subtle Pun Contest in Jimi Plaza. A true wordplay virtuoso!',
    conditionTextEn: 'Won the Jimi Plaza Pun contest'
  },
  badge_bookshelf_resident: {
    nameEn: 'Bookshelf Resident',
    descriptionEn: 'An up-and-coming writer who published their first work/story in Jimi Books!',
    conditionTextEn: 'Post 1 work in Jimi Books'
  },
  badge_text_addict: {
    nameEn: 'Text Addict',
    descriptionEn: 'A veteran novelist who has published 3 or more works in Jimi Books!',
    conditionTextEn: 'Post 3+ works in Jimi Books'
  },
  badge_consecutive_champion: {
    nameEn: 'Grand Champion',
    descriptionEn: 'The absolute ruler of Jimi Plaza events who won multiple times or back-to-back!',
    conditionTextEn: 'Win Jimi Plaza events 2+ times'
  },
  badge_runnerup_collector: {
    nameEn: 'Silver Collector',
    descriptionEn: 'An incredibly relatable contender who won second place in an event. So close!',
    conditionTextEn: 'Earn 2nd place in a Jimi Plaza event'
  },
  synchro_1: {
    nameEn: 'Casual Relater',
    descriptionEn: 'First time predicting your episode upvote percentage within a 10% margin.',
    conditionTextEn: '1 successful sync prediction'
  },
  streak_5: {
    nameEn: 'Making Waves',
    descriptionEn: 'Successfully predicted 5 times in a row! Your insights ripple through our community.',
    conditionTextEn: '5-streak sync success'
  },
  badge_first_post: {
    nameEn: 'First Step',
    descriptionEn: 'Your very first relatable post. Welcome to our humble empathetic journey!',
    conditionTextEn: 'Post 1 time'
  },
  synchro_5: {
    nameEn: 'Empathy Master',
    descriptionEn: 'Predicted 5 total times within a 10% margin. You can foresee how people relate!',
    conditionTextEn: '5 successful sync predictions'
  },
  streak_3: {
    nameEn: 'Short-word Artisan',
    descriptionEn: '3 consecutive prediction successes! Finding empathy in concise daily stories.',
    conditionTextEn: '3-streak sync success'
  },
  badge_comment_100: {
    nameEn: 'Comment Artisan',
    descriptionEn: 'Sent over 100 warm comments or reactions. A connector of kind conversations.',
    conditionTextEn: 'Write 100+ comments'
  },
  badge_one_hit_wonder: {
    nameEn: 'Accidental Buzz',
    descriptionEn: 'Earned 1000+ upvotes on a single episode, a hidden opinion leader of the mundane!',
    conditionTextEn: 'Earn 1000 upvotes on 1 post'
  },
  badge_empathy_scholar: {
    nameEn: 'Subtle Scholar',
    descriptionEn: 'Synchronist with over 80% prediction success rate (running at least 5 trials).',
    conditionTextEn: '80%+ sync success (min 5 trials)'
  },
  synchro_3: {
    nameEn: 'Daily Researcher',
    descriptionEn: '3 total prediction successes! Caringly researching everyone’s small routines.',
    conditionTextEn: '3 successful sync predictions'
  },
  synchro_10: {
    nameEn: 'Legendary Resident',
    descriptionEn: '10 total prediction successes! Seeing through the deep relatability in everyone.',
    conditionTextEn: '10 successful sync predictions'
  },
  badge_viewer_500: {
    nameEn: 'The Silent Watcher',
    descriptionEn: 'Read other users’ episodes over 500 times. A quiet, deep observer.',
    conditionTextEn: 'View 500+ episodes'
  },
  badge_login_streak: {
    nameEn: 'One Week Strong',
    descriptionEn: 'Logged in to Jimicchi for 7 consecutive days, building a great habit!',
    conditionTextEn: '7-day login streak'
  },
  badge_night_owl: {
    nameEn: 'Late Night Beginner',
    descriptionEn: 'Posted an episode between 11 PM and 4 AM, loving the quiet midnight moonlight.',
    conditionTextEn: 'Post during late night'
  },
  badge_elder: {
    nameEn: 'The Elder',
    descriptionEn: 'An account older than 180 days, a highly respected pillar of the community.',
    conditionTextEn: '180 days since registration'
  },
  badge_lunch_eating: {
    nameEn: 'Lunch Resident',
    descriptionEn: 'Posted 30+ times during lunchtime (12:00 PM - 1:00 PM), a munching regular!',
    conditionTextEn: '30+ posts between 12-1 PM'
  },
  badge_night_walk: {
    nameEn: 'Midnight Warden',
    descriptionEn: 'Read episodes over 50 times after 2:00 AM, a silent guardian of the night.',
    conditionTextEn: '50+ views after 2 AM'
  },
  badge_material_wood: {
    nameEn: 'Wooden Badge',
    descriptionEn: 'A cozy wooden style badge. You have posted at least 5 local episodes.',
    conditionTextEn: 'Post 5+ episodes'
  },
  badge_material_metal: {
    nameEn: 'Metal Badge',
    descriptionEn: 'Heavy and reliable. You have received over 15 upvotes across all posts.',
    conditionTextEn: 'Receive 15+ total upvotes'
  },
  badge_material_glass: {
    nameEn: 'Glass Badge',
    descriptionEn: 'Elegant and transparent. You have viewed other users’ episodes at least 150 times.',
    conditionTextEn: 'View 150+ episodes'
  },
  badge_material_crystal: {
    nameEn: 'Crystal Badge',
    descriptionEn: 'Shimmering and crystal. Granted to those with 15 total login days.',
    conditionTextEn: 'Log in for 15+ total days'
  },
  badge_material_hologram: {
    nameEn: 'Hologram Badge',
    descriptionEn: 'Changes colors depending on the angle. You have commented on other posts 25+ times.',
    conditionTextEn: 'Post 25+ comments'
  },
  badge_material_neon: {
    nameEn: 'Neon Badge',
    descriptionEn: 'Glowing in the night. You have posted at least 10 times after 11 PM.',
    conditionTextEn: 'Post 10+ times during late night'
  },
  badge_material_flame: {
    nameEn: 'Flame Badge',
    descriptionEn: 'Burning passion. Earned a remarkable 25 upvotes on a single episode.',
    conditionTextEn: 'Earn 25 upvotes on 1 post'
  },
  badge_material_starry: {
    nameEn: 'Starry Night Badge',
    descriptionEn: 'Stunning night sky. Wandered through the app after 2 AM (viewing 20+ times).',
    conditionTextEn: 'View 20+ times after 2 AM'
  },
  streak_6: {
    nameEn: 'Beyond Relatability',
    descriptionEn: 'Incredible 6+ consecutive prediction successes! You stand at the absolute peak.',
    conditionTextEn: '6+ streak sync success'
  },
  badge_silent_king: {
    nameEn: 'Absolutely Nothing',
    descriptionEn: 'Posted over 50 times, but the average upvotes is 3 or less. A surreal, silent atmosphere.',
    conditionTextEn: 'Post 50+ times with <= 3 upvote average'
  },
  badge_delete_past: {
    nameEn: 'History Deleter',
    descriptionEn: 'Executed post deletion over 20 times. A true cleaning pro of historical records.',
    conditionTextEn: 'Delete posts 20+ times'
  },
  badge_returned: {
    nameEn: 'The Returnee',
    descriptionEn: 'Returned to Jimicchi after an absence of over 30 days. Welcome back, traveler!',
    conditionTextEn: 'Log in after 30+ days away'
  },
  badge_buzz_almost: {
    nameEn: 'Edge of Greatness',
    descriptionEn: 'Unbelievably reached exactly 999 upvotes on one post, falling 1 short of 1000!',
    conditionTextEn: 'Achieve exactly 999 upvotes on 1 post'
  },
  badge_invisible: {
    nameEn: 'Invisible Presence',
    descriptionEn: 'Posted for 7+ consecutive days, but received absolutely zero total upvotes.',
    conditionTextEn: '7+ consecutive posts with zero upvotes'
  },
  badge_lucky_gacha: {
    nameEn: 'Lucky Draw Pro',
    descriptionEn: 'Hit the ultimate jackpot (SSR/Legendary) on a gacha draw or fortune slip! Amazing!',
    conditionTextEn: 'Win the jackpot'
  },
  badge_gacha_socks: {
    nameEn: 'One Missing Sock',
    descriptionEn: 'For those who know the subtle sorrow of never finding your matching sock.',
    conditionTextEn: 'Gacha Exclusive (Common)'
  },
  badge_gacha_stone: {
    nameEn: 'Nothing in Particular',
    descriptionEn: 'Always replying "Nothing" when asked. Solid peaceful state of emptiness.',
    conditionTextEn: 'Gacha Exclusive (Uncommon)'
  },
  badge_gacha_sofa: {
    nameEn: 'Lord of the Sofa',
    descriptionEn: 'Once sunk into the sofa cushions, vowed never to rise again.',
    conditionTextEn: 'Gacha Exclusive (Rare)'
  },
  badge_gacha_antenna: {
    nameEn: 'Single-Grid signal',
    descriptionEn: 'Quietly searching for empathy even with just a single bar of signal.',
    conditionTextEn: 'Gacha Exclusive (Rare)'
  },
  badge_gacha_owl: {
    nameEn: 'Night Warden Owl',
    descriptionEn: 'Appearing quietly in the dead of night to oversee the subtle moments.',
    conditionTextEn: 'Gacha Exclusive (Epic)'
  },
  badge_gacha_bread: {
    nameEn: 'Perfect Toast',
    descriptionEn: 'Breakfast toast got slightly singed, but it was a perfect miracle of taste!',
    conditionTextEn: 'Gacha Exclusive (Epic)'
  },
  badge_gacha_starry: {
    nameEn: 'Somehow Emotional',
    descriptionEn: 'Sensing an indescribable warmth in the tiny, quiet moments of daily life.',
    conditionTextEn: 'Gacha Exclusive (Legendary)'
  },
  badge_gacha_crown: {
    nameEn: 'Subtle King Candidate',
    descriptionEn: 'Governing the realm of simple, everyday moments with a temporary paper crown.',
    conditionTextEn: 'Gacha Exclusive (Legendary)'
  },
  badge_gacha_yofukashi_nintei: {
    nameEn: 'Certified Late Owl',
    descriptionEn: 'Officially certifying your late night stamina and quiet presence.',
    conditionTextEn: 'Gacha Exclusive (Uncommon)'
  },
  badge_gacha_nurui_coffee: {
    nameEn: 'Lukewarm Coffee',
    descriptionEn: 'Appreciating the warm, cozy temperature of a coffee left a bit too long.',
    conditionTextEn: 'Gacha Exclusive (Uncommon)'
  },
  badge_gacha_chisai_radio: {
    nameEn: 'Tiny Radio Set',
    descriptionEn: 'Spinning low tunes with tiny static noise in a quiet corner of the room.',
    conditionTextEn: 'Gacha Exclusive (Uncommon)'
  },
  badge_gacha_nanka_mita_kagami: {
    nameEn: 'Passed-by Mirror',
    descriptionEn: 'Looking into the mirror in passing to confirm you are still your usual self.',
    conditionTextEn: 'Gacha Exclusive (Uncommon)'
  },
  badge_gacha_sofa_kotei: {
    nameEn: 'Reserved Sofa Spot',
    descriptionEn: 'Sofa is perfectly fitted, temporarily increasing local gravity in this spot.',
    conditionTextEn: 'Gacha Exclusive (Uncommon)'
  },
  badge_gacha_aita_mama_hon: {
    nameEn: 'Left-Opened Book',
    descriptionEn: 'Falling asleep with the book open, not even inserting a bookmark.',
    conditionTextEn: 'Gacha Exclusive (Uncommon)'
  },
  badge_gacha_kori_nokori: {
    nameEn: 'One Last Ice Cube',
    descriptionEn: 'The lonely last ice cube clinking quietly inside your glass.',
    conditionTextEn: 'Gacha Exclusive (Uncommon)'
  },
  badge_gacha_hanbun_fusen: {
    nameEn: 'Half-Done Bookmark',
    descriptionEn: 'The neat state of tasks of tomorrow coexisting with those already done.',
    conditionTextEn: 'Gacha Exclusive (Uncommon)'
  },
  badge_gacha_sasatta_ya: {
    nameEn: 'Relatable Arrow',
    descriptionEn: 'A sharp arrow of relatability that quietly pierces someone’s heart.',
    conditionTextEn: 'Gacha Exclusive (Rare)'
  },
  badge_gacha_chisai_nami: {
    nameEn: 'Tiny Ripples',
    descriptionEn: 'The gentle breeze breaking the silence with a small emotional wave.',
    conditionTextEn: 'Gacha Exclusive (Rare)'
  },
  badge_gacha_shinya_bangumi: {
    nameEn: 'Late Night Show',
    descriptionEn: 'Stumbling upon a local, surprisingly interesting program at midnight.',
    conditionTextEn: 'Gacha Exclusive (Rare)'
  },
  badge_gacha_yoru_owl: {
    nameEn: 'Nocturnal Owl',
    descriptionEn: 'Night eyes watching the world in the quiet dark.',
    conditionTextEn: 'Gacha Exclusive (Rare)'
  },
  badge_gacha_nazo_coin: {
    nameEn: 'Mystery Token',
    descriptionEn: 'A metal piece in your pocket that you cannot remember when or where you got.',
    conditionTextEn: 'Gacha Exclusive (Rare)'
  },
  badge_gacha_katamimi_earphone: {
    nameEn: 'Single-Earbud Vibe',
    descriptionEn: 'Connecting with the world through one half, leaving the other free.',
    conditionTextEn: 'Gacha Exclusive (Rare)'
  },
  badge_gacha_chisai_ginga: {
    nameEn: 'Tiny Galaxy',
    descriptionEn: 'The small screen in your palm containing our lovely little cluster.',
    conditionTextEn: 'Gacha Exclusive (Rare)'
  },
  badge_gacha_kosan_ticket: {
    nameEn: 'Veteran Ticket',
    descriptionEn: 'Your continuous passion supporting this community over time.',
    conditionTextEn: 'Gacha Exclusive (Rare)'
  },
  badge_gacha_empathy_dna: {
    nameEn: 'Empathy DNA',
    descriptionEn: 'Intuitive understanding of people’s subtle moments. Absolute synchro gene.',
    conditionTextEn: 'Gacha Exclusive (Epic)'
  },
  badge_gacha_sho_wakusei: {
    nameEn: 'Little Asteroid',
    descriptionEn: 'A small celestial body orbiting the solar system with its own orbit.',
    conditionTextEn: 'Gacha Exclusive (Epic)'
  },
  badge_gacha_hikaru_no: {
    nameEn: 'Glowing Brain',
    descriptionEn: 'Relatable neurons firing with a streak of light during sync predictions.',
    conditionTextEn: 'Gacha Exclusive (Epic)'
  },
  badge_gacha_kami_wand: {
    nameEn: 'Paper Wand',
    descriptionEn: 'Finding pride and magic inside a humble object.',
    conditionTextEn: 'Gacha Exclusive (Epic)'
  },
  badge_gacha_shinya_denpa: {
    nameEn: 'Midnight Signals',
    descriptionEn: 'A soft mental echo between us, best heard in the silence after midnight.',
    conditionTextEn: 'Gacha Exclusive (Epic)'
  },
  badge_gacha_furui_film: {
    nameEn: 'Vintage Film',
    descriptionEn: 'Durable, unfading everyday memories captured on old film rolls.',
    conditionTextEn: 'Gacha Exclusive (Epic)'
  },
  badge_gacha_glass_cho: {
    nameEn: 'Glass Butterfly',
    descriptionEn: 'A delicate but elegantly fluttering butterfly of transparent beauty.',
    conditionTextEn: 'Gacha Exclusive (Epic)'
  },
  badge_gacha_ochiru_ryusei: {
    nameEn: 'Falling Meteor',
    descriptionEn: 'A streak of light cutting through the night sky just for your passing.',
    conditionTextEn: 'Gacha Exclusive (Epic)'
  },
  badge_gacha_kami_okan: {
    nameEn: 'Paper Crown',
    descriptionEn: 'Just a piece of paper, but the true crown of a Subtle Empathy Monarch.',
    conditionTextEn: 'Gacha Exclusive (Legendary)'
  },
  badge_gacha_kodai_arch: {
    nameEn: 'Ancient Archway',
    descriptionEn: 'Supporting the grand history of relatable moments across long eras.',
    conditionTextEn: 'Gacha Exclusive (Legendary)'
  },
  badge_gacha_hane_pen: {
    nameEn: 'Feather Quill',
    descriptionEn: 'Quietly recording our daily whispers inside the grand history of empathy.',
    conditionTextEn: 'Gacha Exclusive (Legendary)'
  },
  badge_gacha_mangetsu: {
    nameEn: 'The Full Moon',
    descriptionEn: 'A perfect sphere softly illuminating the night to cover our loops.',
    conditionTextEn: 'Gacha Exclusive (Legendary)'
  },
  badge_gacha_akanai_kagi: {
    nameEn: 'The Unlocking Key',
    descriptionEn: 'An unbreakable self-core that nobody else can decode.',
    conditionTextEn: 'Gacha Exclusive (Legendary)'
  },
  badge_gacha_himitsu_no_kami: {
    nameEn: 'Scroll of Secrets',
    descriptionEn: 'The sacred textbook of relatable thoughts secretly recorded in time.',
    conditionTextEn: 'Gacha Exclusive (Legendary)'
  },
  badge_gacha_anaaki_kinka: {
    nameEn: 'Holed Gold Coin',
    descriptionEn: 'An everlasting treasure with a hole in the middle, circulated with care.',
    conditionTextEn: 'Gacha Exclusive (Legendary)'
  },
  badge_gacha_chisana_yusho: {
    nameEn: 'Mini Championship',
    descriptionEn: 'No fancy trophies, but your subtle heart certainly won first prize today!',
    conditionTextEn: 'Gacha Exclusive (Legendary)'
  },
  badge_gacha_nanimonai_en: {
    nameEn: 'Empty Circle',
    descriptionEn: 'Perfect state of nothingness. The pure end goal of minimalist empathy.',
    conditionTextEn: 'Gacha Exclusive (Mythic)'
  },
  badge_gacha_noise_to: {
    nameEn: 'Static Tower',
    descriptionEn: 'A mysterious tower in the outer world emitting quiet static signals.',
    conditionTextEn: 'Gacha Exclusive (Mythic)'
  },
  badge_gacha_tomei_badge: {
    nameEn: 'Invisibadge',
    descriptionEn: 'Invisible even if you try to look. Pure state of absolute quiet.',
    conditionTextEn: 'Gacha Exclusive (Mythic)'
  },
  badge_gacha_tada_no_ishi: {
    nameEn: 'Ordinary Stone',
    descriptionEn: 'A simple pebble. Quietly paying respect to its unchanging presence.',
    conditionTextEn: 'Gacha Exclusive (Mythic)'
  },
  badge_gacha_chisai_ana: {
    nameEn: 'Little Void',
    descriptionEn: 'A tiny black hole at the bottom of the mind, whispering empty thoughts.',
    conditionTextEn: 'Gacha Exclusive (Mythic)'
  },
  badge_gacha_me_mitaina_nanika: {
    nameEn: 'The Eye-like Entity',
    descriptionEn: 'A dazzling, mystic emblem looking back from an alternative dimension.',
    conditionTextEn: 'Gacha Exclusive (Mythic)'
  },
  badge_gacha_yugami: {
    nameEn: 'Spatial Warp',
    descriptionEn: 'A slight tremor in daily spacetime, creating a relatable warp.',
    conditionTextEn: 'Gacha Exclusive (Mythic)'
  },
  badge_gacha_hyoji_dekimasen: {
    nameEn: 'Cannot Display',
    descriptionEn: 'Undecodable, unwritable, an absolute mystery.',
    conditionTextEn: 'Gacha Exclusive (Mythic)'
  },
  badge_gacha_mawasanakatta: {
    nameEn: 'The Unspun Coin',
    descriptionEn: 'Gained nothing, but somehow slightly relieved.',
    conditionTextEn: 'Gacha Exclusive (Secret)'
  },
  badge_jse_first_trade: {
    nameEn: '📈 First Trade',
    descriptionEn: 'Completed a transaction order in JSE "Human Relatability Index" market.',
    conditionTextEn: 'Complete a trade on the JSE'
  },
  badge_jse_first_profit: {
    nameEn: '📈 First Profit',
    descriptionEn: 'Survived the marketplace volatility to lock in your first historical net gain!',
    conditionTextEn: 'Gain a positive realized PnL in the JSE'
  },
  badge_jse_wealth_100k: {
    nameEn: '📈 100k Wealth',
    descriptionEn: 'Achieved a total JSE net asset value of 100,000 J-Coin, a solid trader!',
    conditionTextEn: 'Achieve 100,000 J-Coin net worth'
  },
  badge_jse_wealth_1m: {
    nameEn: '📈 1M Wealth',
    descriptionEn: 'A legendary JSE tycoon reaching a massive net worth of 1,000,000 J-Coin!',
    conditionTextEn: 'Achieve 1,000,000 J-Coin net worth'
  }
};

// Apply default English fallback properties if they are not explicitly specified inside BADGES
for (const badge of BADGES) {
  const t = BADGES_EN_TRANSLATIONS[badge.id];
  if (t) {
    if (!badge.nameEn) badge.nameEn = t.nameEn;
    if (!badge.descriptionEn) badge.descriptionEn = t.descriptionEn;
    if (!badge.conditionTextEn) badge.conditionTextEn = t.conditionTextEn;
  }
}
export function getAnalyzedScenes(scenes: Scene[]) {
  const filtered = scenes
    .filter(s => s.confidence !== undefined && s.confidence !== null)
    .sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return timeA - timeB;
    });

  return filtered.map(s => {
    const views = s.views || 0;
    const votes = s.upvotes || 0;
    const isAnalyzable = views >= 5;
    const actualRate = views > 0 ? Math.round((votes / views) * 100) : 0;
    const errorMargin = Math.abs((s.confidence || 0) - actualRate);
    const isSuccess = isAnalyzable && errorMargin <= 10;

    return {
      ...s,
      actualRate,
      isAnalyzable,
      errorMargin,
      isSuccess,
      remainingViews: isAnalyzable ? 0 : 5 - views
    };
  });
}

export interface UserStats {
  totalAnalyzed: number;
  totalPending: number;
  totalSuccess: number;
  maxStreak: number;
  currentStreak: number;
  earnedBadges: Badge[];
  availableTitles: Title[];
  availablePrefixes: TitlePart[];
  availableSuffixes: TitlePart[];
}

export function calculateUserStats(userScenes: Scene[], profile?: Profile | null): UserStats {
  const analyzed = getAnalyzedScenes(userScenes);
  
  let unlockedPrefixIds: string[] = [];
  let unlockedSuffixIds: string[] = [];
  let unlockedBadgeIds: string[] = [];

  if (profile?.uid) {
    try {
      const gachaDataStr = localStorage.getItem(`jimicchi_gacha_v3_${profile.uid}`);
      if (gachaDataStr) {
        const parsed = JSON.parse(gachaDataStr);
        if (Array.isArray(parsed.unlockedPrefixIds)) unlockedPrefixIds = parsed.unlockedPrefixIds;
        if (Array.isArray(parsed.unlockedSuffixIds)) unlockedSuffixIds = parsed.unlockedSuffixIds;
        if (Array.isArray(parsed.unlockedBadgeIds)) unlockedBadgeIds = parsed.unlockedBadgeIds;
      }
    } catch (e) {
      console.error('Failed to load gacha unlocks in stats collection:', e);
    }
  }
  
  let totalSuccess = 0;
  let maxStreak = 0;
  let currentStreak = 0;
  let totalAnalyzed = 0;
  let totalPending = 0;

  for (const s of analyzed) {
    if (!s.isAnalyzable) {
      totalPending++;
      continue;
    }
    
    totalAnalyzed++;
    if (s.isSuccess) {
      totalSuccess++;
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  }

  // --- リアルタイム集計パラメータの算出 ---
  const postsCount = userScenes.length;
  const upvotesReceived = userScenes.reduce((acc, s) => acc + (s.upvotes || 0), 0);
  const maxUpvotesOnSinglePost = userScenes.length > 0 ? Math.max(...userScenes.map(s => s.upvotes || 0)) : 0;

  let midnightPostsCount = 0;
  let lunchPostsCount = 0;
  let weekdayDaytimePostsCount = 0;

  for (const s of userScenes) {
    if (s.createdAt) {
      const dateVal = s.createdAt.toDate ? s.createdAt.toDate() : new Date();
      const hour = dateVal.getHours();
      const day = dateVal.getDay();
      
      // 深夜：23時〜4時
      if (hour >= 23 || hour <= 4) {
        midnightPostsCount++;
      }
      // ランチ：12時〜13時
      if (hour >= 12 && hour <= 13) {
        lunchPostsCount++;
      }
      // 平日昼：月〜金 10時〜16時
      if (day >= 1 && day <= 5 && hour >= 10 && hour <= 16) {
        weekdayDaytimePostsCount++;
      }
    }
  }

  // --- プロフィール側状態の引き当て ---
  const loginStreak = profile?.loginStreak || 0;
  const viewsCount = profile?.viewsCount || 0;
  const totalLoginDays = profile?.totalLoginDays || 0;
  const myCommentsCount = profile?.myCommentsCount || 0;
  const deletedPostsCount = profile?.deletedPostsCount || 0;
  const commentsBlockedCount = profile?.commentsBlockedCount || 0;
  const returnedAfter30Days = profile?.returnedAfter30Days || false;
  const gachaWon = profile?.gachaWon || false;
  const midnightActiveStreak = profile?.midnightActiveStreak || 0;
  const midnightViewsCount = profile?.midnightViewsCount || 0;
  const commentRate = profile?.commentRate || 0;
  const isTopPercentile = profile?.isTopPercentile || false;
  const opsSecret = profile?.opsSecret || false;

  // 予測成功率
  const totalGamesPlayed = totalAnalyzed;
  const successRate = totalGamesPlayed >= 5 ? Math.round((totalSuccess / totalGamesPlayed) * 100) : 0;

  // --- 地味チェック機能 ---
  // 特定の実績から、該当パーツが解放されているか判定を行う
  const isPartUnlocked = (partId: string): boolean => {
    // ガチャで解放された2つ名パーツ
    if (unlockedPrefixIds.includes(partId) || unlockedSuffixIds.includes(partId)) {
      return true;
    }

    switch (partId) {
      // 共通・デフォルト
      case 'p_free_1':
      case 's_free_1':
        return true;

      // 初投稿 (postsCount >= 1 または userScenes.length >= 1)
      case 'p_first_post':
      case 's_first_post':
        return postsCount >= 1;

      // 3日連続ログイン
      case 'p_login_3':
      case 's_login_3':
        return loginStreak >= 3 || totalLoginDays >= 3;

      // 閲覧50回
      case 'p_view_50':
      case 's_view_50':
        return viewsCount >= 50;

      // 共感100獲得 (Upvoteの累計獲得数が100以上)
      case 'p_votes_100':
      case 's_votes_100':
        return upvotesReceived >= 100;

      // 1000共感
      case 'p_votes_1000':
      case 's_votes_1000':
        return upvotesReceived >= 1000;

      // 1投稿100共感
      case 'p_vote_one_100':
      case 's_vote_one_100':
        return maxUpvotesOnSinglePost >= 100;

      // 深夜の投稿50回 (23時〜4時)
      case 'p_night_50':
      case 's_night_50':
        return midnightPostsCount >= 50;

      // コメント率30%
      case 'p_comment_rate_30':
      case 's_comment_rate_30':
        return commentRate >= 30;

      // 投稿100回
      case 'p_posts_100':
      case 's_posts_100':
        return postsCount >= 100;

      // 30日継続
      case 'p_login_30':
      case 's_login_30':
        return totalLoginDays >= 30;

      // 100日継続
      case 'p_login_100':
      case 's_login_100':
        return totalLoginDays >= 100;

      // 投稿1000回
      case 'p_posts_1000':
      case 's_posts_1000':
        return postsCount >= 1000;

      // 平日昼の投稿多い
      case 'p_weekday_lunch':
      case 's_weekday_lunch':
        return weekdayDaytimePostsCount >= 30;

      // 深夜3日連続
      case 'p_night_streak_3':
      case 's_night_streak_3':
        return midnightActiveStreak >= 3;

      // 投稿20回平均共感0以下
      case 'p_no_votes_20':
      case 's_no_votes_20':
        return postsCount >= 20 && (upvotesReceived / postsCount) <= 0;

      // 投稿せず100日
      case 'p_silent_100':
      case 's_silent_100':
        return totalLoginDays >= 100 && postsCount === 0;

      // コメント停止回数
      case 'p_blocked_1':
      case 's_blocked_1':
        return commentsBlockedCount >= 1;

      // 全体TOP1%
      case 'p_top_1':
      case 's_top_1':
        return isTopPercentile || upvotesReceived >= 550;

      // 隠し条件
      case 'p_secret':
      case 's_secret':
        return opsSecret || (profile?.bio && profile.bio.includes('シークレット')) ? true : false;

      // 予測ゲーム実績連動 (後方互換)
      case 'p_total_1': return totalSuccess >= 1;
      case 'p_total_2': return totalSuccess >= 2;
      case 'p_total_3': return totalSuccess >= 3;
      case 'p_total_4': return totalSuccess >= 4;
      case 'p_total_5': return totalSuccess >= 5;
      case 'p_total_8': return totalSuccess >= 8;
      case 'p_total_10': return totalSuccess >= 10;
      case 'p_streak_3': return maxStreak >= 3;
      case 'p_streak_4': return maxStreak >= 4;
      case 'p_streak_5': return maxStreak >= 5;
      case 'p_streak_6': return maxStreak >= 6;

      case 's_total_1': return totalSuccess >= 1;
      case 's_total_2': return totalSuccess >= 2;
      case 's_total_3': return totalSuccess >= 3;
      case 's_total_4': return totalSuccess >= 4;
      case 's_total_5': return totalSuccess >= 5;
      case 's_total_8': return totalSuccess >= 8;
      case 's_total_10': return totalSuccess >= 10;
      case 's_streak_3': return maxStreak >= 3;
      case 's_streak_4': return maxStreak >= 4;
      case 's_streak_5': return maxStreak >= 5;
      case 's_streak_6': return maxStreak >= 6;

      // 海外限定称号
      case 'p_overseas_sea':
      case 'p_overseas_hemisphere':
      case 's_overseas_empathized':
      case 's_overseas_regular':
        return profile?.region === 'AU';
      case 'p_overseas_ocean':
      case 's_overseas_poster':
        return profile?.region === 'AU' && postsCount >= 1;
      case 'p_overseas_queensland':
      case 's_overseas_explorer':
        return profile?.region === 'AU' && postsCount >= 3;
      case 'p_overseas_border':
      case 's_overseas_person':
        return !!(profile?.hasCrossedOcean || (profile?.region === 'AU' && upvotesReceived > 0));

      default:
        return false;
    }
  };

  // 1次的に神話級を除いて解放されている割合を算出する
  const tempPrefixes = TITLE_PREFIXES.filter(p => p.id !== 'p_mythic_30').filter(p => isPartUnlocked(p.id));
  const tempSuffixes = TITLE_SUFFIXES.filter(s => s.id !== 's_mythic_30').filter(s => isPartUnlocked(s.id));
  const totalPartsCount = (TITLE_PREFIXES.length + TITLE_SUFFIXES.length) - 2; // 神話級を除いた総パーツ数
  const unlockedPartsCount = tempPrefixes.length + tempSuffixes.length;
  const unlockRatePercent = totalPartsCount > 0 ? (unlockedPartsCount / totalPartsCount) * 100 : 0;

  // 獲得前部２つ名の判定
  const availablePrefixes = TITLE_PREFIXES.filter(part => {
    if (part.id === 'p_mythic_30') {
      return unlockRatePercent >= 30;
    }
    return isPartUnlocked(part.id);
  });

  // 獲得後部２つ名の判定
  const availableSuffixes = TITLE_SUFFIXES.filter(part => {
    if (part.id === 's_mythic_30') {
      return unlockRatePercent >= 30;
    }
    return isPartUnlocked(part.id);
  });

  // --- 獲得バッジの判定 ---
  const earnedBadges = BADGES.filter(badge => {
    // ガチャで解放されたバッジ
    if (unlockedBadgeIds.includes(badge.id)) {
      return true;
    }

    // 予測ゲーム型
    if (badge.type === 'total') {
      return totalSuccess >= badge.threshold;
    } else if (badge.type === 'streak') {
      return maxStreak >= badge.threshold;
    }

    // 新規追加実績バッジ
    switch (badge.id) {
      case 'badge_first_post':
        return postsCount >= 1;

      case 'badge_login_streak':
        return loginStreak >= 7 || totalLoginDays >= 7;

      case 'badge_night_owl':
        return midnightPostsCount >= 1;

      case 'badge_viewer_500':
        return viewsCount >= 500;

      case 'badge_comment_100':
        return myCommentsCount >= 100;

      case 'badge_one_hit_wonder':
        return maxUpvotesOnSinglePost >= 1000;

      case 'badge_elder':
        // 登録日の経過時間 (デフォルトは現在時刻比180日より前)
        if (profile?.registeredAt) {
          const registeredDate = profile.registeredAt.toDate ? profile.registeredAt.toDate() : new Date();
          const diffMs = Date.now() - registeredDate.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          return diffDays >= 180;
        }
        return false;

      case 'badge_silent_king':
        return postsCount >= 50 && (upvotesReceived / postsCount) <= 3;

      case 'badge_delete_past':
        return deletedPostsCount >= 20;

      case 'badge_returned':
        return returnedAfter30Days;

      case 'badge_empathy_scholar':
        return successRate >= 80;

      case 'badge_buzz_almost':
        // いずれかの投稿で、獲得した upvotes がちょうど999である場合
        return userScenes.some(s => s.upvotes === 999) || upvotesReceived === 999;

      case 'badge_invisible':
        // 7投稿以上。すべての投稿のupvotes(共感)が0。
        return postsCount >= 7 && upvotesReceived === 0;

      case 'badge_lunch_eating':
        return lunchPostsCount >= 30;

      case 'badge_night_walk':
        return midnightViewsCount >= 50;

      case 'badge_lucky_gacha':
        return gachaWon;

      case 'badge_material_wood':
        return postsCount >= 5;

      case 'badge_material_metal':
        return upvotesReceived >= 15;

      case 'badge_material_glass':
        return viewsCount >= 150;

      case 'badge_material_crystal':
        return totalLoginDays >= 15;

      case 'badge_material_hologram':
        return myCommentsCount >= 25;

      case 'badge_material_neon':
        return midnightPostsCount >= 10;

      case 'badge_material_flame':
        return maxUpvotesOnSinglePost >= 25;

      case 'badge_material_starry':
        return midnightViewsCount >= 20;

      // 海外限定バッジ
      case 'badge_overseas_kangaroo':
        return profile?.region === 'AU';
      case 'badge_overseas_pioneer':
        return profile?.region === 'AU' && postsCount >= 1;
      case 'badge_overseas_queensland':
        return profile?.region === 'AU' && postsCount >= 3;
      case 'badge_overseas_first_user':
        return !!(profile?.isFirstOverseasUser || (profile?.region === 'AU' && profile?.language === 'en'));
      case 'badge_overseas_across_ocean':
        return !!(profile?.hasCrossedOcean || (profile?.region === 'AU' && upvotesReceived > 0));

      default:
        return false;
    }
  });

  // 獲得称号の判定 (後方互換性)
  const availableTitles = TITLES.filter(title => {
    if (title.id === 'bronze_teller') return true;
    if (title.id === 'title_synchro_1') return totalSuccess >= 1;
    if (title.id === 'title_synchro_3') return totalSuccess >= 3;
    if (title.id === 'title_synchro_5') return totalSuccess >= 5;
    if (title.id === 'title_synchro_10') return totalSuccess >= 10;
    if (title.id === 'title_streak_3') return maxStreak >= 3;
    if (title.id === 'title_streak_5') return maxStreak >= 5;
    if (title.id === 'title_streak_6') return maxStreak >= 6;
    return false;
  });

  return {
    totalAnalyzed,
    totalPending,
    totalSuccess,
    maxStreak,
    currentStreak,
    earnedBadges,
    availableTitles,
    availablePrefixes,
    availableSuffixes
  };
}

export function registerCustomBadge(badge: Badge) {
  if (!BADGES.some(b => b.id === badge.id)) {
    BADGES.push(badge);
  }
}

export function registerCustomTitlePrefix(part: TitlePart & { rarity?: string }) {
  if (!TITLE_PREFIXES.some(p => p.id === part.id)) {
    TITLE_PREFIXES.push(part);
  }
}

export function registerCustomTitleSuffix(part: TitlePart & { rarity?: string }) {
  if (!TITLE_SUFFIXES.some(s => s.id === part.id)) {
    TITLE_SUFFIXES.push(part);
  }
}

