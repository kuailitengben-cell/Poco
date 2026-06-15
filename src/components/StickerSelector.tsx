import React from 'react';
import { motion } from 'motion/react';
import { Smile, Sparkles, X } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { Sticker, STICKERS } from '../App';

interface StickerSelectorProps {
  onSelect: (stickerId: string) => void;
  onClose?: () => void;
  className?: string;
}

export default function StickerSelector({ onSelect, onClose, className }: StickerSelectorProps) {
  const { language, t } = useLanguage();

  const popularStickers = STICKERS.filter(s => s.category === 'popular');
  const reactionStickers = STICKERS.filter(s => s.category === 'reaction');

  return (
    <div className={`bg-white rounded-3xl border-2 border-orange-100 shadow-xl p-4 w-64 max-w-sm ${className}`}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-orange-50">
        <span className="text-xs font-black text-orange-950 flex items-center gap-1">
          <Smile className="w-3.5 h-3.5 text-orange-500" />
          {t('ステッカーを選択', 'Select Sticker')}
        </span>
        {onClose && (
          <button 
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-orange-50 rounded-full transition-colors text-orange-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
        {/* Popular stickers */}
        <div>
          <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2 block flex items-center gap-1">
            <span>😀</span>
            <span>{t('人気', 'Popular')}</span>
          </span>
          <div className="grid grid-cols-2 gap-2">
            {popularStickers.map((sticker) => {
              const name = language === 'en' ? sticker.nameEn : sticker.name;
              return (
                <button
                  key={sticker.id}
                  type="button"
                  onClick={() => onSelect(sticker.id)}
                  className="flex flex-col items-center p-2 rounded-2xl border border-orange-50 hover:bg-orange-50/70 hover:scale-[1.03] active:scale-95 transition-all text-center gap-1 bg-orange-50/10 cursor-pointer"
                >
                  <img src={sticker.url} alt={name} className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                  <span className="text-[10px] font-bold text-orange-800/80 mt-0.5">{name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reaction stickers */}
        <div>
          <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2 block flex items-center gap-1">
            <span>😎</span>
            <span>{t('リアクション', 'Reaction')}</span>
          </span>
          <div className="grid grid-cols-2 gap-2">
            {reactionStickers.map((sticker) => {
              const name = language === 'en' ? sticker.nameEn : sticker.name;
              return (
                <button
                  key={sticker.id}
                  type="button"
                  onClick={() => onSelect(sticker.id)}
                  className="flex flex-col items-center p-2 rounded-2xl border border-orange-50 hover:bg-orange-50/70 hover:scale-[1.03] active:scale-95 transition-all text-center gap-1 bg-orange-50/10 cursor-pointer"
                >
                  <img src={sticker.url} alt={name} className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                  <span className="text-[10px] font-bold text-orange-800/80 mt-0.5">{name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
