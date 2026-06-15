import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Award, Sparkles } from 'lucide-react';
import { Badge, getBadgeRarityStyle } from '../lib/badgeUtils';
import { useLanguage } from '../lib/LanguageContext';
import { cn } from '../lib/utils';

interface BadgeDisplayProps {
  badge: Badge;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isTappable?: boolean;
  key?: string | number;
}

export default function BadgeDisplay({
  badge,
  size = 'sm',
  className,
  isTappable = true
}: BadgeDisplayProps) {
  const [showModal, setShowModal] = useState(false);
  const { language, t } = useLanguage();

  const rStyle = getBadgeRarityStyle(badge.rarity);

  const sizeClasses = {
    sm: 'w-[18px] h-[18px] text-[10px]',
    md: 'w-6 h-6 text-xs',
    lg: 'w-8 h-8 text-base'
  };

  const getRarityLabel = (rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic') => {
    switch (rarity) {
      case 'uncommon': return t('アンコモン', 'Uncommon');
      case 'rare': return t('レア', 'Rare');
      case 'epic': return t('エピック', 'Epic');
      case 'legendary': return t('レジェンダリー', 'Legendary');
      case 'mythic': return t('ミシック', 'Mythic');
      case 'common':
      default:
        return t('コモン', 'Common');
    }
  };

  const getModalRarityGradient = (rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic') => {
    switch (rarity) {
      case 'uncommon':
        return 'from-emerald-500 via-teal-600 to-emerald-700';
      case 'rare':
        return 'from-sky-500 via-blue-600 to-indigo-700';
      case 'epic':
        return 'from-fuchsia-500 via-purple-600 to-violet-700';
      case 'legendary':
        return 'from-amber-400 via-orange-500 to-rose-600';
      case 'mythic':
        return 'from-indigo-600 via-rose-500 via-purple-600 to-amber-500';
      case 'common':
      default:
        return 'from-stone-500 via-orange-600 to-stone-700';
    }
  };

  const name = language === 'en' ? (badge.nameEn || badge.name) : badge.name;
  const description = language === 'en' ? (badge.descriptionEn || badge.description) : badge.description;
  const condition = language === 'en' ? (badge.conditionTextEn || badge.conditionText) : badge.conditionText;
  const rarityLabel = getRarityLabel(badge.rarity);
  const isSpecial = badge.rarity === 'legendary' || badge.rarity === 'mythic';

  const handleClick = (e: React.MouseEvent) => {
    if (!isTappable) return;
    e.preventDefault();
    e.stopPropagation();
    setShowModal(true);
  };

  return (
    <>
      <motion.span
        whileHover={isTappable ? { scale: 1.15 } : undefined}
        whileTap={isTappable ? { scale: 0.9 } : undefined}
        onClick={handleClick}
        className={cn(
          "flex items-center justify-center rounded-full border shadow-sm shrink-0 select-none relative group",
          isTappable ? "cursor-pointer active:scale-95 transition-shadow" : "",
          rStyle.bg,
          rStyle.border,
          sizeClasses[size],
          className
        )}
      >
        <span>{badge.emoji}</span>
        {/* Compact Hover Tooltip (Desktop) */}
        <div className="absolute hidden group-hover:block pointer-events-none bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-32 bg-stone-900 border border-stone-800 text-white text-[9px] font-medium p-2 rounded-xl opacity-95 z-50 shadow-xl text-center leading-normal">
          <strong className="block font-black text-orange-200 text-[10px] mb-0.5">{name}</strong>
          {description}
        </div>
      </motion.span>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-md"
            />

            {/* Popup Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative bg-white w-full max-w-sm rounded-[36px] overflow-hidden shadow-2xl border border-stone-100 flex flex-col"
            >
              {/* Vibrant Gradient Background Section */}
              <div className={cn(
                "p-8 text-center bg-gradient-to-tr flex flex-col items-center justify-center relative text-white overflow-hidden",
                getModalRarityGradient(badge.rarity)
              )}>
                {isSpecial && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-2 left-4 animate-bounce duration-1000">
                      <Sparkles className="w-5 h-5 text-amber-200 opacity-60" />
                    </div>
                    <div className="absolute bottom-6 right-8 animate-pulse duration-700">
                      <Sparkles className="w-4 h-4 text-rose-200 opacity-50" />
                    </div>
                    <div className="absolute top-1/2 right-4 rotate-45 transform scale-75 opacity-40">
                      <Sparkles className="w-6 h-6 text-yellow-100" />
                    </div>
                  </div>
                )}

                {/* Close Button inside gradient so it pops */}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowModal(false); }}
                  className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white/50 text-white"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Badge Emoji Circle */}
                <motion.div
                  initial={{ rotate: -15, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring' }}
                  className="w-20 h-20 bg-white/10 rounded-full border-2 border-white/30 flex items-center justify-center text-5xl shadow-xl shadow-black/10 mb-4 select-none"
                >
                  {badge.emoji}
                </motion.div>

                {/* Badge ID / Rarity */}
                <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black tracking-widest uppercase mb-2 inline-flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  {rarityLabel}
                </div>

                {/* Badge Name */}
                <h4 className="text-2xl font-black tracking-tight leading-none px-4 drop-shadow-sm">
                  {name}
                </h4>
              </div>

              {/* Informative Content Section */}
              <div className="p-8 text-left bg-stone-50/50 space-y-5 flex-1 select-text">
                {/* Condition */}
                <div>
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1">
                    {t('獲得条件', 'Acquisition Condition')}
                  </span>
                  <p className="text-sm font-bold text-stone-800 leading-relaxed bg-white border border-stone-100 p-3 rounded-2xl shadow-sm">
                    {condition}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1">
                    {t('説明', 'Description')}
                  </span>
                  <p className="text-xs font-semibold text-stone-600 leading-relaxed whitespace-pre-wrap">
                    {description}
                  </p>
                </div>

                {/* Acknowledgment button */}
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full mt-2 bg-stone-900 hover:bg-stone-800 active:scale-95 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-stone-800/10"
                >
                  {t('閉じる', 'Close')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
