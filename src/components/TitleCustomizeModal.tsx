import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, Check, Sparkles, AlertCircle, Bookmark, Sparkle, Search
} from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { Profile, Scene } from '../types';
import { calculateUserStats, TITLE_PREFIXES, TITLE_SUFFIXES, TitlePart } from '../lib/badgeUtils';
import { getGachaState } from '../lib/gachaStore';
import { cn } from '../lib/utils';
import RarityTitle from './RarityTitle';
import { PREFIX_TRANSLATIONS, SUFFIX_TRANSLATIONS, CONDITION_TRANSLATIONS } from '../lib/titleRarityUtils';

interface TitleCustomizeModalProps {
  profile: Profile;
  scenes: Scene[];
  onClose: () => void;
  onSave: (selectedTitle: string) => Promise<void>;
}

export default function TitleCustomizeModal({ profile, scenes, onClose, onSave }: TitleCustomizeModalProps) {
  const { t, language } = useLanguage();
  const stats = calculateUserStats(scenes, profile);
  const { availablePrefixes, availableSuffixes } = stats;

  const gState = getGachaState(profile.uid || '');
  const gachaPrefixes = TITLE_PREFIXES.filter(p => gState.unlockedPrefixIds.includes(p.id));
  const gachaSuffixes = TITLE_SUFFIXES.filter(s => gState.unlockedSuffixIds.includes(s.id));

  // De-duplicate availablePrefixes and gachaPrefixes by TEXT
  const prefixMap = new Map<string, typeof TITLE_PREFIXES[0]>();
  availablePrefixes.forEach(p => prefixMap.set(p.text, p));
  gachaPrefixes.forEach(p => prefixMap.set(p.text, p));
  const allPrefixes = Array.from(prefixMap.values());

  const suffixMap = new Map<string, typeof TITLE_SUFFIXES[0]>();
  availableSuffixes.forEach(s => suffixMap.set(s.text, s));
  gachaSuffixes.forEach(s => suffixMap.set(s.text, s));
  const allSuffixes = Array.from(suffixMap.values());

  // Add "None" selection Option
  const prefixes = [
    { id: 'none_p', text: '', conditionText: '未セットにする', type: 'free' as const, threshold: 0 },
    ...allPrefixes
  ];
  const suffixes = [
    { id: 'none_s', text: '', conditionText: '未セットにする', type: 'free' as const, threshold: 0 },
    ...allSuffixes
  ];

  // Parse current equipped title into Prefix & Suffix components
  const parseTitle = (fullTitle: string) => {
    if (!fullTitle) return { prefixText: '', suffixText: '', isAwakened: false, isLimitBreak: false };
    
    const isLimitBreak = fullTitle.endsWith('・極');
    const isAwakened = !isLimitBreak && fullTitle.endsWith('・熟');
    const baseTitle = isLimitBreak || isAwakened ? fullTitle.slice(0, -2) : fullTitle;
    
    // Scan matching prefix
    const sortedPrefixes = [...TITLE_PREFIXES].sort((a, b) => b.text.length - a.text.length);
    for (const p of sortedPrefixes) {
      if (p.text && baseTitle.startsWith(p.text)) {
        const suffixText = baseTitle.substring(p.text.length);
        return { prefixText: p.text, suffixText, isAwakened, isLimitBreak };
      }
    }
    return { prefixText: '', suffixText: baseTitle, isAwakened, isLimitBreak };
  };

  const initialParses = parseTitle(profile.selectedTitle || '');
  const [activePrefix, setActivePrefix] = useState<string>(initialParses.prefixText);
  const [activeSuffix, setActiveSuffix] = useState<string>(initialParses.suffixText);
  const [isAwakened, setIsAwakened] = useState<boolean>(initialParses.isAwakened);
  const [isLimitBreak, setIsLimitBreak] = useState<boolean>(initialParses.isLimitBreak);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search filter query strings
  const [prefixSearch, setPrefixSearch] = useState('');
  const [suffixSearch, setSuffixSearch] = useState('');

  // Filter lists based on search queries
  const filteredPrefixes = prefixes.filter(p => {
    if (p.id === 'none_p') return true; // Always show 'None' option
    const textMatch = p.text.toLowerCase().includes(prefixSearch.toLowerCase());
    const condMatch = p.conditionText.toLowerCase().includes(prefixSearch.toLowerCase());
    return textMatch || condMatch;
  });

  const filteredSuffixes = suffixes.filter(s => {
    if (s.id === 'none_s') return true; // Always show 'None' option
    const textMatch = s.text.toLowerCase().includes(suffixSearch.toLowerCase());
    const condMatch = s.conditionText.toLowerCase().includes(suffixSearch.toLowerCase());
    return textMatch || condMatch;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const baseCombined = `${activePrefix}${activeSuffix}`;
      if (!baseCombined) {
        await onSave('');
      } else {
        const finalTitle = isLimitBreak 
          ? `${baseCombined}・極` 
          : isAwakened 
            ? `${baseCombined}・熟` 
            : baseCombined;
        await onSave(finalTitle);
      }
      onClose();
    } catch (e) {
      console.error(e);
      setErrorMsg('2つ名の保存に失敗しました。時間をおいてやり直してください。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-950/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        className="relative bg-white w-full max-w-2xl max-h-[92vh] rounded-[36px] shadow-2xl shadow-stone-950/40 overflow-hidden flex flex-col border border-stone-100"
      >
        {/* Header */}
        <div className="p-6 border-b border-orange-50 flex items-center justify-between bg-orange-50/50 shrink-0">
          <div>
            <h3 className="text-lg font-black text-orange-950 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-orange-500 fill-orange-200" />
              {t("2つ名の組み替え・編集", "Remix Your Title")}
            </h3>
            <p className="text-xs text-orange-400 font-bold mt-1">
              {t("解放された前部と言葉を自由にクリックして選択し、オリジナルの2つ名を創りましょう！", "Select unlocked prefixes and suffixes to create your own customized title!")}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-orange-100 rounded-full transition-colors duration-200"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-orange-400" />
          </button>
        </div>

        {/* Content area */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-stone-50/20">
          {errorMsg && (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold leading-relaxed w-full">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title Preview Card */}
          <div className="w-full text-center space-y-2.5 bg-gradient-to-br from-orange-50/70 to-peach-50/20 border border-orange-100 p-5 rounded-3xl relative overflow-hidden shadow-sm">
            <span className="text-[10px] font-black tracking-widest text-orange-400 block uppercase">
              {t("現在の2つ名プレビュー", "Current Title Preview")}
            </span>
            <div className="h-12 flex items-center justify-center">
              {(activePrefix || activeSuffix) ? (
                <RarityTitle 
                  title={`${activePrefix}${activeSuffix}${isLimitBreak ? '・極' : isAwakened ? '・熟' : ''}`}
                  equippedBadges={profile.equippedBadges || []}
                  isProfileView={false}
                />
              ) : (
                <span className="text-sm font-bold text-stone-400 italic">
                  {t("称号なし (通常の表示になります)", "No Title Equipped")}
                </span>
              )}
            </div>
          </div>

          {/* Prefix/Suffix side-by-side selectors with built-in search */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Left Column: Prefix Selector */}
            <div className="flex flex-col bg-white border border-stone-150 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-3 bg-stone-50/80 border-b border-stone-100 flex items-center justify-between">
                <span className="text-xs font-extrabold text-stone-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  {t("前部パーツ", "Prefix (First Part)")}
                  <span className="text-[10px] bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded-full font-black ml-1">
                    {prefixes.length - 1}
                  </span>
                </span>
              </div>
              
              {/* Search Bar */}
              <div className="p-2 border-b border-stone-100 bg-stone-50/30 relative flex items-center">
                <Search className="w-3.5 h-3.5 text-stone-450 absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder={t("前部パーツを検索...", "Filter prefix...")}
                  value={prefixSearch}
                  onChange={(e) => setPrefixSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-orange-300"
                />
              </div>

              {/* Scrollable List */}
              <div className="overflow-y-auto max-h-[220px] divide-y divide-stone-100">
                {filteredPrefixes.map((pref) => {
                  const isSelected = activePrefix === pref.text;
                  const isGachaItem = pref.id.startsWith('p_gacha_');
                  return (
                    <button
                      key={pref.id}
                      onClick={() => setActivePrefix(pref.text)}
                      className={cn(
                        "w-full text-left p-3 flex flex-col gap-0.5 transition-all text-stone-700 hover:bg-orange-50/30 relative cursor-pointer",
                        isSelected ? "bg-orange-50/60 border-l-[3px] border-orange-500 hover:bg-orange-50/80" : ""
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={cn(
                          "text-xs font-bold tracking-wide",
                          isSelected ? "text-orange-950 font-black" : "text-stone-800"
                        )}>
                          {pref.text === '' ? t('（なし）', '(None)') : (language === 'en' && PREFIX_TRANSLATIONS[pref.text] ? PREFIX_TRANSLATIONS[pref.text] : pref.text)}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          {isGachaItem && (
                            <span className="text-[8px] bg-purple-150 text-purple-700 border border-purple-200 font-black px-1 py-0.2 rounded">
                              GACHA
                            </span>
                          )}
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-orange-600" />
                          )}
                        </div>
                      </div>
                      <span className="text-[9px] text-stone-400 font-medium">
                        {language === 'en' && CONDITION_TRANSLATIONS[pref.conditionText] ? CONDITION_TRANSLATIONS[pref.conditionText] : pref.conditionText}
                      </span>
                    </button>
                  );
                })}
                {filteredPrefixes.length === 0 && (
                  <div className="p-8 text-center text-xs text-stone-400 font-semibold">
                    {t("該当する言葉がありません", "No matching prefixes found")}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Suffix Selector */}
            <div className="flex flex-col bg-white border border-stone-150 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-3 bg-stone-50/80 border-b border-stone-100 flex items-center justify-between">
                <span className="text-xs font-extrabold text-stone-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-peach-500" />
                  {t("後部パーツ", "Suffix (Last Part)")}
                  <span className="text-[10px] bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded-full font-black ml-1">
                    {suffixes.length - 1}
                  </span>
                </span>
              </div>

              {/* Search Bar */}
              <div className="p-2 border-b border-stone-100 bg-stone-50/30 relative flex items-center">
                <Search className="w-3.5 h-3.5 text-stone-450 absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder={t("後部パーツを検索...", "Filter suffix...")}
                  value={suffixSearch}
                  onChange={(e) => setSuffixSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-orange-300"
                />
              </div>

              {/* Scrollable List */}
              <div className="overflow-y-auto max-h-[220px] divide-y divide-stone-100">
                {filteredSuffixes.map((suff) => {
                  const isSelected = activeSuffix === suff.text;
                  const isGachaItem = suff.id.startsWith('s_gacha_');
                  return (
                    <button
                      key={suff.id}
                      onClick={() => setActiveSuffix(suff.text)}
                      className={cn(
                        "w-full text-left p-3 flex flex-col gap-0.5 transition-all text-stone-700 hover:bg-orange-50/30 relative cursor-pointer",
                        isSelected ? "bg-orange-50/60 border-l-[3px] border-orange-500 hover:bg-orange-50/80" : ""
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={cn(
                          "text-xs font-bold tracking-wide",
                          isSelected ? "text-orange-950 font-black" : "text-stone-800"
                        )}>
                          {suff.text === '' ? t('（なし）', '(None)') : (language === 'en' && SUFFIX_TRANSLATIONS[suff.text] ? SUFFIX_TRANSLATIONS[suff.text] : suff.text)}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          {isGachaItem && (
                            <span className="text-[8px] bg-purple-150 text-purple-700 border border-purple-200 font-black px-1 py-0.2 rounded">
                              GACHA
                            </span>
                          )}
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-orange-600" />
                          )}
                        </div>
                      </div>
                      <span className="text-[9px] text-stone-400 font-medium">
                        {language === 'en' && CONDITION_TRANSLATIONS[suff.conditionText] ? CONDITION_TRANSLATIONS[suff.conditionText] : suff.conditionText}
                      </span>
                    </button>
                  );
                })}
                {filteredSuffixes.length === 0 && (
                  <div className="p-8 text-center text-xs text-stone-400 font-semibold">
                    {t("該当する言葉がありません", "No matching suffixes found")}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Sublimation Segmented Control */}
          {(activePrefix || activeSuffix) && (
            <div className="w-full bg-stone-50 border border-stone-200 rounded-3xl p-5 space-y-3 shadow-inner">
              <span className="text-xs font-black text-stone-800 block uppercase tracking-wider flex items-center gap-1.5">
                <Sparkle className="w-4 h-4 text-orange-500 fill-orange-200" />
                {t("2つ名の昇華エフェクト", "Title Sublimation Effects")}
              </span>
              <div className="grid grid-cols-3 gap-1.5 bg-stone-200/60 p-1 rounded-2xl text-center text-xs font-bold">
                <button
                  onClick={() => { setIsAwakened(false); setIsLimitBreak(false); }}
                  className={cn("py-2 px-1 rounded-xl transition-all cursor-pointer font-black", (!isAwakened && !isLimitBreak) ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700")}
                >
                  {t("通常表示", "Normal")}
                </button>
                <button
                  onClick={() => { setIsAwakened(true); setIsLimitBreak(false); }}
                  className={cn("py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer font-black", isAwakened ? "bg-amber-500 text-stone-900 shadow-sm" : "text-stone-500 hover:text-amber-750")}
                >
                  <Sparkle className="w-3.5 h-3.5 text-amber-800 fill-amber-300" />
                  {t("覚醒 (熟)", "Awakened (熟)")}
                </button>
                <button
                  onClick={() => { setIsAwakened(false); setIsLimitBreak(true); }}
                  className={cn("py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer font-black", isLimitBreak ? "bg-purple-600 text-white shadow-sm" : "text-stone-500 hover:text-purple-700")}
                >
                  <Sparkles className="w-3.5 h-3.5 text-rose-200" />
                  {t("極限 (極)", "Limit Break (極)")}
                </button>
              </div>
              <p className="text-[10px] text-stone-500 leading-relaxed font-semibold">
                {isAwakened && t("✨ ２つ名にゴールドのきらめき効果がつきます！（優雅なゴールドオーラ）", "✨ Golden shimmering particles will sparkle around your title!")}
                {isLimitBreak && t("🌈 超・やり込みの証！２つ名の境界線から虹色に変化する極彩色のドリームオーラエフェクトを纏います！", "🌈 Cycling spectrum borders and glowing mystical rainbow aura effects on your title banner!")}
                {!isAwakened && !isLimitBreak && t("追加のアフェクトがない、シンプルで美しい標準スタイル。", "Sleek, pristine default representation.")}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-stone-100 bg-stone-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 hover:text-stone-900 text-stone-600 text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            {t("キャンセル", "Cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-md shadow-orange-500/15 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {saving ? (
              <span className="animate-pulse">{t("保存中...", "Saving...")}</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {t("この2つ名を装備", "Equip Title")}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
