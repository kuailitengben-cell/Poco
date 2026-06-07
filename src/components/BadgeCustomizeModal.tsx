import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, Lock, Trophy, AlertCircle, Bookmark, Star, Palette, Flame, ShieldAlert
} from 'lucide-react';
import { Profile, Scene } from '../types';
import { calculateUserStats, BADGES, Badge, getBadgeRarityStyle } from '../lib/badgeUtils';
import { cn } from '../lib/utils';
import { useLanguage } from '../lib/LanguageContext';

interface BadgeCustomizeModalProps {
  profile: Profile;
  scenes: Scene[];
  onClose: () => void;
  onSave: (equippedBadges: string[]) => Promise<void>;
}

const CATEGORIES = [
  {
    key: 'all',
    title: 'すべて',
    emoji: '✨',
    subtitle: 'すべての実績バッジの一覧',
    accentColor: 'orange',
    accentBg: 'bg-orange-50 border-orange-200 text-orange-850',
  },
  {
    key: 'action',
    title: '日常・行動系',
    emoji: '📝',
    subtitle: 'いつのまにか取れるかも？日常の行動 of 証',
    accentColor: 'emerald',
    accentBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  },
  {
    key: 'reaction',
    title: '投稿・リアクション系',
    emoji: '💬',
    subtitle: 'つぶやくほどじゃないから生まれる、温かいやりとりの証',
    accentColor: 'sky',
    accentBg: 'bg-sky-50 border-sky-300 text-sky-850',
  },
  {
    key: 'explore',
    title: '閲覧・探索系',
    emoji: '🔍',
    subtitle: '見つける楽しさをあなたに。他者との心のシンクロ',
    accentColor: 'indigo',
    accentBg: 'bg-indigo-50 border-indigo-200 text-indigo-850',
  },
  {
    key: 'habit',
    title: '時間・習慣系',
    emoji: '📆',
    subtitle: '続けるあなたはえらい。あなたの毎日のサイクル',
    accentColor: 'amber',
    accentBg: 'bg-amber-50 border-amber-200 text-amber-850',
  },
  {
    key: 'material',
    title: '新素材バッジ',
    emoji: '🪵',
    subtitle: '木、金属、ガラス、クリスタルなど、多彩なマテリアルで出来た特別な証',
    accentColor: 'slate',
    accentBg: 'bg-slate-100 border-slate-300 text-slate-800',
  },
  {
    key: 'unique',
    title: 'ユニーク・ネタ系',
    emoji: '💡',
    subtitle: 'クスッと笑える変わり種、おちゃめで珍しい実績タグ',
    accentColor: 'rose',
    accentBg: 'bg-rose-50 border-rose-250 text-rose-850',
  }
] as const;

const RARITY_MAP = {
  common: {
    label: 'コモン',
    labelEn: 'COMMON',
    stars: '★',
    style: 'text-slate-600 bg-slate-100 border-slate-200/60',
  },
  uncommon: {
    label: 'アンコモン',
    labelEn: 'UNCOMMON',
    stars: '★★',
    style: 'text-emerald-700 bg-emerald-50 border-emerald-150',
  },
  rare: {
    label: 'レア',
    labelEn: 'RARE',
    stars: '★★★',
    style: 'text-blue-700 bg-blue-50 border-blue-150',
  },
  epic: {
    label: 'エピック',
    labelEn: 'EPIC',
    stars: '★★★★',
    style: 'text-purple-700 bg-purple-50 border-purple-150',
  },
  legendary: {
    label: 'レジェンダリー',
    labelEn: 'LEGENDARY',
    stars: '★★★★★ 👑',
    style: 'text-amber-800 bg-amber-50 border-amber-200 font-bold bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm',
  },
  mythic: {
    label: 'ミシック',
    labelEn: 'MYTHIC',
    stars: '🌀 MYTHIC',
    style: 'text-rose-800 bg-rose-50 border-rose-200 font-black animate-pulse bg-gradient-to-r from-rose-50 to-red-100/50 shadow-sm border',
  },
};

export default function BadgeCustomizeModal({ profile, scenes, onClose, onSave }: BadgeCustomizeModalProps) {
  const { language } = useLanguage();
  const stats = calculateUserStats(scenes, profile);
  const earnedBadges = stats.earnedBadges;

  const [activeTab, setActiveTab] = useState<string>('all');
  const [equipped, setEquipped] = useState<string[]>(profile.equippedBadges || []);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active hover tooltip helper state
  const [hoveredBadgeId, setHoveredBadgeId] = useState<string | null>(null);

  const handleToggleBadge = (badgeId: string) => {
    const isEarned = earnedBadges.some(b => b.id === badgeId);
    if (!isEarned) return;

    if (equipped.includes(badgeId)) {
      setEquipped(equipped.filter(id => id !== badgeId));
      setErrorMsg(null);
    } else {
      if (equipped.length >= 5) {
        setErrorMsg(language === 'en' ? 'You can only equip up to 5 badges.' : 'バッジは最大5個までしか装備できません');
        return;
      }
      setEquipped([...equipped, badgeId]);
      setErrorMsg(null);
    }
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    try {
      await onSave(equipped);
      onClose();
    } catch (e) {
      console.error(e);
      setErrorMsg(language === 'en' ? 'Failed to save. Please try again later.' : '保存に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  // Filter badges according to tab
  const filteredBadges = BADGES.filter(badge => {
    if (activeTab === 'all') return true;
    return badge.category === activeTab;
  });

  const activeCategoryInfo = CATEGORIES.find(c => c.key === activeTab) || CATEGORIES[0];

  const getTranslatedCategoryTitle = (key: string) => {
    if (language !== 'en') {
      return CATEGORIES.find(c => c.key === key)?.title || '';
    }
    return {
      'all': 'All',
      'action': 'Life & Idle',
      'reaction': 'Post & Reaction',
      'explore': 'View & Explore',
      'habit': 'Time & Habits',
      'material': 'Materials',
      'unique': 'Quirky & Fun'
    }[key] || '';
  };

  const getTranslatedCategorySubtitle = (key: string) => {
    if (language !== 'en') {
      return CATEGORIES.find(c => c.key === key)?.subtitle || '';
    }
    return {
      'all': 'All unlocked milestone badges',
      'action': 'Proof of small everyday moments & behaviors',
      'reaction': 'Proof of warm interactions built up over time',
      'explore': 'Proof of deep synchronization with what other people felt',
      'habit': 'Bravo for keeping it up! Your daily cycle and routines',
      'material': 'Badges made of wood, metals, glass, crystals, etc.',
      'unique': 'Playful, rare, and quirky achievement labels'
    }[key] || '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-orange-950/40 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[36px] shadow-2xl shadow-orange-950/20 overflow-hidden flex flex-col border border-orange-100"
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-orange-100 flex items-start justify-between bg-gradient-to-b from-orange-50/50 to-white">
          <div className="space-y-1">
            <h3 className="text-2xl font-extrabold text-orange-950 flex items-center gap-2 tracking-tight">
              <Trophy className="w-6 h-6 text-orange-500 fill-orange-200" />
              {language === 'en' ? 'Collective Badge Album & Equip Setup' : 'コレクティブバッジ図鑑 & 装備設定'}
            </h3>
            <p className="text-xs text-orange-600/80 font-bold max-w-2xl leading-relaxed">
              {language === 'en' 
                ? 'We have collected a variety of user-suggested categories, rarities, new materials, and playful badges! Select up to 5 to display your subtle empathy identity.'
                : 'ユーザー案のカテゴリとレアリティ、いろんな新素材＆おちゃめバッジを取り揃えました！最大5つ選んで、あなたの地味あるあるアイデンティティをアピールしましょう。'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-orange-100 rounded-full transition-colors duration-200 text-orange-400 hover:text-orange-950"
            id="close-badge-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 md:px-8 bg-white border-b border-orange-50 overflow-x-auto py-3 shrink-0 flex gap-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const countInCategory = BADGES.filter(b => cat.key === 'all' || b.category === cat.key).length;
            const earnedInCategory = earnedBadges.filter(b => cat.key === 'all' || b.category === cat.key).length;
            const isActive = activeTab === cat.key;
            
            return (
              <button
                key={cat.key}
                onClick={() => {
                  setActiveTab(cat.key);
                  setErrorMsg(null);
                }}
                className={cn(
                  "px-4 py-2 rounded-2xl text-xs font-black transition-all shrink-0 whitespace-nowrap flex items-center gap-1.5 border",
                  isActive 
                    ? "bg-orange-500 text-white border-orange-550 shadow-sm"
                    : "bg-orange-50/40 hover:bg-orange-50 text-orange-850 hover:text-orange-950 border-orange-100/60"
                )}
                id={`badge-tab-${cat.key}`}
              >
                <span>{cat.emoji}</span>
                <span>{getTranslatedCategoryTitle(cat.key)}</span>
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                  isActive ? "bg-orange-650 text-white" : "bg-orange-100/70 text-orange-800"
                )}>
                  {earnedInCategory}/{countInCategory}
                </span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Badge Bento Grid Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {errorMsg && (
            <div className="flex items-center gap-2 p-4 bg-rose-50 text-rose-800 border border-rose-100 rounded-2xl text-xs font-bold leading-relaxed shadow-sm">
              <AlertCircle className="w-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Active Category Meta Panel */}
          <div className={cn("p-4 rounded-3xl border flex items-center justify-between gap-4 shadow-sm", activeCategoryInfo.accentBg)}>
            <div>
              <h4 className="text-sm font-black flex items-center gap-1.5 uppercase tracking-wide">
                <span>{activeCategoryInfo.emoji}</span>
                <span>{getTranslatedCategoryTitle(activeCategoryInfo.key)}</span>
              </h4>
              <p className="text-[11px] font-bold opacity-80 mt-0.5">{getTranslatedCategorySubtitle(activeCategoryInfo.key)}</p>
            </div>
            <div className="text-right whitespace-nowrap">
              <span className="text-[10px] font-black uppercase tracking-wide block">
                {language === 'en' ? 'Overall Progress' : '全体進捗'}
              </span>
              <span className="text-sm font-black">
                {earnedBadges.length} / {BADGES.length} {language === 'en' ? 'Unlocked' : '解放'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-orange-950/60 uppercase tracking-widest flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-orange-400" />
              {language === 'en' ? 'Tap a badge to equip / unequip' : 'バッジをタップして装備 / 解除'}
            </span>
            <span className="text-[10px] text-orange-600 font-extrabold bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              {language === 'en' ? 'Selected' : '選択中'}: {equipped.length} / 5
            </span>
          </div>

          {/* Actual Grid */}
          {filteredBadges.length === 0 ? (
            <div className="py-12 text-center bg-orange-50/20 border border-orange-100 rounded-3xl">
              <p className="text-sm font-bold text-orange-950/40">
                {language === 'en' ? 'No badges available in this category' : 'このカテゴリにはバッジがありません'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBadges.map((badge) => {
                const isEarned = earnedBadges.some(b => b.id === badge.id);
                const isEquipped = equipped.includes(badge.id);
                const eqIndex = equipped.indexOf(badge.id);
                const rarity = badge.rarity || 'common';
                const rInfo = RARITY_MAP[rarity];

                const rStyle = getBadgeRarityStyle(badge.rarity);

                return (
                  <div
                    key={badge.id}
                    onMouseEnter={() => setHoveredBadgeId(badge.id)}
                    onMouseLeave={() => setHoveredBadgeId(null)}
                    className="relative group shrink-0"
                  >
                    <button
                      onClick={() => isEarned && handleToggleBadge(badge.id)}
                      disabled={!isEarned}
                      className={cn(
                        "w-full p-4 rounded-[24px] border text-left transition-all duration-300 flex items-start gap-4 relative",
                        isEquipped 
                          ? `${rStyle.bg} ${rStyle.border} ring-2 ring-orange-550 ring-offset-2 scale-[0.99] shadow-inner` 
                          : isEarned 
                            ? "bg-white hover:bg-orange-50/40 hover:border-orange-200 text-orange-950 border-orange-100/70 cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.01]"
                            : "bg-slate-50/60 text-slate-400 border-slate-200/50 opacity-65"
                      )}
                      id={`badge-card-${badge.id}`}
                    >
                      {/* Left Badge Icon Container */}
                      <div className={cn(
                        "w-12 h-12 rounded-[20px] flex items-center justify-center text-2xl select-none shrink-0 border transition-all duration-300",
                        isEquipped || isEarned 
                          ? `${rStyle.bg} ${rStyle.border} shadow-sm group-hover:scale-110` 
                          : "bg-slate-100 border-slate-200/50 grayscale opacity-45"
                      )}>
                        <span>{badge.emoji}</span>
                      </div>

                      {/* Middle text blocks */}
                      <div className="flex-1 min-w-0 pr-6 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn(
                            "text-sm font-black tracking-tight", 
                            isEarned ? "text-orange-950" : "text-slate-400"
                          )}>
                            {language === 'en' && badge.nameEn ? badge.nameEn : badge.name}
                          </span>
                          
                          {/* Rarity tag */}
                          <span className={cn(
                            "text-[8px] px-2 py-0.5 rounded-full font-black border uppercase tracking-wider",
                            isEarned ? rInfo.style : "text-slate-400 bg-slate-100 border-slate-200"
                          )}>
                            {rInfo.stars} {language === 'en' ? rInfo.labelEn : rInfo.label}
                          </span>
                        </div>

                        <p className={cn(
                          "text-[10px] leading-relaxed line-clamp-2",
                          isEarned ? "text-orange-950/60" : "text-slate-400/85"
                        )}>
                          {language === 'en' && badge.descriptionEn ? badge.descriptionEn : badge.description}
                        </p>

                        <div className="pt-1 flex items-center gap-1.5 text-[9px] font-bold">
                          <span className={isEarned ? "text-orange-400" : "text-slate-400"}>
                            {language === 'en' ? 'Requirement' : '獲得条件'}: {language === 'en' && badge.conditionTextEn ? badge.conditionTextEn : badge.conditionText}
                          </span>
                        </div>
                      </div>

                      {/* Equipped Number Badge / Lock Position */}
                      <div className="absolute top-4 right-4 flex items-center justify-center">
                        {isEquipped && (
                          <span className="w-5 h-5 bg-orange-500 text-white font-extrabold text-[10px] rounded-full shadow-sm flex items-center justify-center animate-bounce">
                            {eqIndex + 1}
                          </span>
                        )}

                        {!isEarned && (
                          <div className="p-1.5 rounded-xl bg-slate-200/50 text-slate-400">
                            <Lock className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions with visual totals */}
        <div className="p-6 md:p-8 border-t border-orange-100 bg-gradient-to-t from-orange-50/30 to-white flex items-center justify-between gap-4 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-orange-50 text-orange-500">
              <Bookmark className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] text-orange-400 uppercase tracking-widest font-black block">
                {language === 'en' ? 'TOY BOX SLOTS' : 'おもちゃ箱スロット'}
              </span>
              <span className="text-xs font-extrabold text-orange-950">
                {language === 'en' ? 'Equipped badges will decorate your public profile card' : '装備したバッジはプロフィールに飾られます'}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-3 rounded-2xl border border-orange-100 bg-white hover:bg-orange-50 text-orange-950 text-xs font-bold transition-all shadow-sm"
              id="cancel-badge-modal-btn"
            >
              {language === 'en' ? 'Cancel' : 'キャンセル'}
            </button>
            <button
              onClick={handleConfirmSave}
              disabled={saving}
              className="px-8 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black transition-all shadow-md shadow-orange-500/10 flex items-center justify-center gap-1.5"
              id="save-badge-modal-btn"
            >
              {saving ? (
                <span className="animate-pulse">{language === 'en' ? 'Saving...' : '保存中...'}</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {language === 'en' ? 'Change Equipment' : '装備を変更する'}
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
