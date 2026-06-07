import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { resolveTitleDetails, Rarity, PREFIX_TRANSLATIONS, SUFFIX_TRANSLATIONS, TITLE_TRANSLATIONS } from '../lib/titleRarityUtils';
import { Sparkles, HelpCircle, Eye } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

interface RarityTitleProps {
  title: string;
  equippedBadges?: string[];
  isProfileView?: boolean; // true for full effects, false for lightweight list rendering
  userName?: string;
  userPhoto?: string;
}

export default function RarityTitle({
  title,
  equippedBadges = [],
  isProfileView = false,
  userName,
  userPhoto,
}: RarityTitleProps) {
  const { language } = useLanguage();
  const [simplifiedMode, setSimplifiedMode] = useState(false);
  const [triggerSecret, setTriggerSecret] = useState(false);
  const [secretTextVisible, setSecretTextVisible] = useState(true);
  const [showSecretNotice, setShowSecretNotice] = useState(false);
  const [badgeTriggerActive, setBadgeTriggerActive] = useState(false);
  
  // Custom pon effect when title changes
  const [ponTrigger, setPonTrigger] = useState(false);

  // Parse title rarity info
  const details = useMemo(() => {
    return resolveTitleDetails(title, equippedBadges);
  }, [title, equippedBadges]);

  const { rarity, baseText, prefix, suffix, isAwakened, isLimitBreak, matchingBadgeEffects } = details;

  // React to title changes with a "pon" animation (especially for Uncommon+)
  useEffect(() => {
    if (title && (rarity !== 'common')) {
      setPonTrigger(true);
      const timer = setTimeout(() => setPonTrigger(false), 800);
      return () => clearTimeout(timer);
    }
  }, [title, rarity]);

  // Performance / Low Power Check (Battery level or high-load throttling)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'navigator' in window && (navigator as any).getBattery) {
      (navigator as any).getBattery().then((battery: any) => {
        if (battery.charging === false && battery.level < 0.2) {
          setSimplifiedMode(true); // Automatically simplify rendering on low battery
        }
      });
    }
  }, []);

  // Secret Easter Egg (0.1% chance on mount/render to trigger a passive disappearing gag)
  useEffect(() => {
    if (title && Math.random() < 0.001) { // 0.1% probability
      // Trigger disappearing
      const timer1 = setTimeout(() => {
        setSecretTextVisible(false);
        // Reappear in 1.2s and show notification
        const timer2 = setTimeout(() => {
          setSecretTextVisible(true);
          setShowSecretNotice(true);
          // Hide notice after 4 seconds
          const timer3 = setTimeout(() => setShowSecretNotice(false), 4000);
        }, 1200);
      }, Math.random() * 8000 + 3000); // Trigger randomly after 3 to 11 seconds
    }
  }, [title]);

  // Badge flying animal / symbols loop (Happens every 10-15 seconds for valid pairings)
  useEffect(() => {
    if (matchingBadgeEffects.length > 0) {
      const interval = setInterval(() => {
        setBadgeTriggerActive(true);
        const timer = setTimeout(() => setBadgeTriggerActive(false), 4000);
      }, 15000); // Occurs every 15s

      return () => clearInterval(interval);
    }
  }, [matchingBadgeEffects]);

  if (!title) return null;

  // Formatting name in parts: Prefix and Suffix combined with no brackets or slash
  const prefixTranslated = language === 'en' && prefix && PREFIX_TRANSLATIONS[prefix] ? PREFIX_TRANSLATIONS[prefix] : prefix;
  const suffixTranslated = language === 'en' && suffix && SUFFIX_TRANSLATIONS[suffix] ? SUFFIX_TRANSLATIONS[suffix] : suffix;
  const baseTextTranslated = language === 'en' && TITLE_TRANSLATIONS[baseText] 
    ? TITLE_TRANSLATIONS[baseText] 
    : (language === 'en' && SUFFIX_TRANSLATIONS[baseText] ? SUFFIX_TRANSLATIONS[baseText] : baseText);

  const isAwakenedEn = language === 'en' ? ' [Awa.]' : '・熟';
  const isLimitBreakEn = language === 'en' ? ' [Ult.]' : '・極';

  const suffixExt = `${suffixTranslated || ''}${isAwakened ? isAwakenedEn : ''}${isLimitBreak ? isLimitBreakEn : ''}`;
  const formattedTitle = prefixTranslated && suffixTranslated 
    ? `${prefixTranslated} ${suffixExt}` 
    : `${baseTextTranslated}${isAwakened ? isAwakenedEn : ''}${isLimitBreak ? isLimitBreakEn : ''}`;

  // Unique mythic vibration configuration to ensure no two mythic titles react exactly the same way
  const mythicSeed = Math.random() * 5;

  // 1. Common (コモン) styling & classes
  // Subtle glow shifting around once a minute. No special heavy loops.
  const getCommonStyles = () => {
    return {
      containerClass: `border border-slate-250 bg-slate-50 text-slate-500 text-[10px] sm:text-xs px-2.5 py-1 rounded-full font-bold shadow-sm transition-all duration-300`,
      style: {
        animation: !simplifiedMode ? 'subtlePulse 60s infinite ease-in-out' : undefined
      }
    };
  };

  // 2. Uncommon (アンコモン) styling
  // 6 second smooth breath period + 1px glow
  const getUncommonStyles = () => {
    return {
      containerClass: `border border-emerald-250 bg-emerald-50/60 text-emerald-700 text-[10px] sm:text-xs px-2.5 py-1 rounded-full font-bold shadow-[0_0_6px_rgba(16,185,129,0.15)] transition-all duration-300`,
      style: {
        animation: !simplifiedMode ? 'breathGrow 6s infinite ease-in-out' : undefined
      }
    };
  };

  // 3. Rare (レア) styling
  // Blue glass aesthetic + light sweep from left-to-right + hover scale up
  const getRareStyles = () => {
    return {
      containerClass: `border border-sky-300/50 bg-sky-50/30 backdrop-blur-[2px] text-sky-600 text-[10px] sm:text-xs px-3 py-1 rounded-full font-black shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_2px_4px_rgba(56,189,248,0.1)] hover:scale-[1.05] transition-all duration-300 relative overflow-hidden`,
      style: {}
    };
  };

  // 4. Epic (エピック) styling
  // Purple + glass, Slow rotating border gradient (conic), slight backdrop blur
  const getEpicStyles = () => {
    return {
      containerClass: `border border-purple-300 bg-purple-50/20 backdrop-blur-[3px] text-purple-700 text-[10px] sm:text-xs px-3.5 py-1.5 rounded-xl font-extrabold shadow-md relative overflow-hidden transition-all duration-300`,
      style: {
        animation: !simplifiedMode ? 'epicSpin 6s infinite linear' : undefined
      }
    };
  };

  // 5. Legendary (レジェンダリー) styling
  // Metal reflection sweep, golden border aura, 0.3s quick entrance flash
  const getLegendaryStyles = () => {
    return {
      containerClass: `border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 text-[10px] sm:text-xs px-4 py-1.5 rounded-xl font-black shadow-lg relative overflow-hidden scale-[1.02] transform transition-transform duration-300`,
      style: {
        animation: !simplifiedMode ? 'legendaryGlow 8s infinite ease-in-out' : undefined
      }
    };
  };

  // 6. Mythic (ミシック) styling
  // Shift colors dynamically, chromatic layout aberrations + micro vibrations
  const getMythicStyles = () => {
    return {
      containerClass: `border bg-zinc-950 text-white border-zinc-700 text-[10px] sm:text-xs px-4 py-1.5 rounded-xl font-black tracking-wider uppercase relative overflow-hidden transition-all duration-500`,
      style: {
        boxShadow: '0 0 10px rgba(255, 0, 0, 0.2), inset 0 0 5px rgba(255, 255, 255, 0.1)',
        fontFamily: "'JetBrains Mono', monospace",
        textShadow: '1px 0px 0px #ff0055, -1px 0px 0px #00ffaa'
      }
    };
  };

  const currentStyles = () => {
    switch (rarity) {
      case 'uncommon': return getUncommonStyles();
      case 'rare': return getRareStyles();
      case 'epic': return getEpicStyles();
      case 'legendary': return getLegendaryStyles();
      case 'mythic': return getMythicStyles();
      default: return getCommonStyles();
    }
  };

  const { containerClass, style } = currentStyles() as { containerClass: string; style: React.CSSProperties };

  let finalContainerClass = containerClass;
  let finalStyle = { ...style };

  if (isLimitBreak) {
    // Ultimate Limit Break rainbow styling
    finalContainerClass = `border bg-zinc-950 text-white border-transparent text-[10px] sm:text-xs px-4 py-1.5 rounded-xl font-black tracking-widest relative overflow-hidden transition-all duration-500 hover:scale-[1.05]`;
    finalStyle = {
      ...finalStyle,
      boxShadow: '0 0 16px rgba(168, 85, 247, 0.35), inset 0 0 8px rgba(255, 255, 255, 0.05)',
      fontFamily: "'JetBrains Mono', monospace",
      textShadow: '0 0 4px rgba(255,255,255,0.8), 0 0 12px rgba(168, 85, 247, 0.6)',
      animation: !simplifiedMode ? 'divineRainbow 5s infinite linear' : undefined
    };
  }

  return (
    <>
      <style>{`
        @keyframes subtlePulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.08); }
        }
        @keyframes breathGrow {
          0%, 100% { transform: scale(1); box-shadow: 0 0 3px rgba(16,185,129,0.1); }
          50% { transform: scale(1.03); box-shadow: 0 0 8px rgba(16,185,129,0.3); }
        }
        @keyframes sweepLine {
          0% { left: -100%; }
          15% { left: 150%; }
          100% { left: 150%; }
        }
        @keyframes goldGlitter {
          0% { transform: translateY(-5px) scale(0); opacity: 0; }
          50% { opacity: 1; transform: translateY(5px) scale(1.2); }
          100% { transform: translateY(15px) scale(0); opacity: 0; }
        }
        @keyframes floatOwl {
          0% { transform: translateX(120%) translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(-120%) translateY(-5px); opacity: 0; }
        }
        @keyframes epicInnerGlow {
          0%, 100% { box-shadow: inset 0 0 8px rgba(147, 51, 234, 0.2); }
          50% { box-shadow: inset 0 0 16px rgba(147, 51, 234, 0.5); }
        }
        @keyframes epicSpin {
          0%, 100% { border-color: rgba(147, 51, 234, 0.5); box-shadow: 0 0 8px rgba(147, 51, 234, 0.3); }
          50% { border-color: rgba(168, 85, 247, 0.9); box-shadow: 0 0 16px rgba(168, 85, 247, 0.6); }
        }
        @keyframes legendaryGlow {
          0%, 100% { box-shadow: 0 0 6px rgba(245, 158, 11, 0.3), inset 0 1px 1px rgba(255,255,255,0.8); }
          50% { box-shadow: 0 0 18px rgba(245, 158, 11, 0.75), inset 0 1px 2px rgba(255,255,255,0.9); }
        }
        @keyframes mythicVibe {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-0.8px, 0.8px); }
          40% { transform: translate(-0.8px, -0.6px); }
          60% { transform: translate(1px, 0.5px); }
          80% { transform: translate(0.6px, -1px); }
        }
        @keyframes chromaShit {
          0%, 100% { text-shadow: 1px 0 0 #ff0055, -1px 0 0 #00ffaa; }
          33% { text-shadow: -1px 1px 0 #00ffff, 1px -1px 0 #ffaa00; }
          66% { text-shadow: 2px -1px 0 #aa00ff, -1px 2px 0 #00ff00; }
        }
        @keyframes divineRainbow {
          0% { border-color: #f43f5e; box-shadow: 0 0 10px rgba(244, 63, 94, 0.5), inset 0 0 6px rgba(244, 63, 94, 0.2); }
          25% { border-color: #fbbf24; box-shadow: 0 0 10px rgba(251, 191, 36, 0.5), inset 0 0 6px rgba(251, 191, 36, 0.2); }
          50% { border-color: #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.5), inset 0 0 6px rgba(16, 185, 129, 0.2); }
          75% { border-color: #3b82f6; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5), inset 0 0 6px rgba(59, 130, 246, 0.2); }
          100% { border-color: #f43f5e; box-shadow: 0 0 10px rgba(244, 63, 94, 0.5), inset 0 0 6px rgba(244, 63, 94, 0.2); }
        }
      `}</style>

      <div className="flex flex-col items-center select-none">
        
        {/* User Card Format when user details are passed */}
        {userName && (
          <div className="flex items-center gap-2 mb-1.5">
            {userPhoto && (
              <img src={userPhoto} alt="" className="w-5 h-5 rounded-full ring-1 ring-orange-200/50 grayscale opacity-70" />
            )}
            <span className="text-xs font-black text-orange-950 tracking-tight">{userName}</span>
          </div>
        )}

        {/* Title Badge Component */}
        <div 
          className={`${finalContainerClass} ${ponTrigger ? 'scale-110 rotate-1' : ''}`}
          style={{
            ...finalStyle,
            animation: isLimitBreak && !simplifiedMode
              ? 'divineRainbow 5s infinite linear'
              : rarity === 'mythic' && !simplifiedMode 
                ? 'chromaShit 2.5s infinite linear' 
                : finalStyle.animation
          }}
        >
          {/* Rainbow Particle Layer for Limit Break */}
          {isLimitBreak && !simplifiedMode && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden bg-gradient-to-tr from-rose-500/10 via-amber-400/10 to-transparent animate-pulse" />
          )}
          {/* 1. Star sparkly decoration for Rare titles (occasional 15s) */}
          {rarity === 'rare' && !simplifiedMode && (
            <span 
              className="absolute pointer-events-none text-sky-400 text-[10px] animate-pulse duration-1000"
              style={{
                top: '5%',
                right: '15%',
                animationDelay: '3s'
              }}
            >
              ✦
            </span>
          )}

          {/* 2. Light Sweep for Rare/Epic/Legendary */}
          {(rarity === 'rare' || rarity === 'epic' || rarity === 'legendary') && !simplifiedMode && (
            <div 
              className="absolute top-0 h-full w-4 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none transform -skew-x-25"
              style={{
                animation: 'sweepLine 11s infinite ease-in-out',
                animationDelay: rarity === 'legendary' ? '3s' : '0s'
              }}
            />
          )}

          {/* 3. Gold Sparks for Legendary titles or Awakened Titles */}
          {((rarity === 'legendary') || (isAwakened)) && !simplifiedMode && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-amber-400"
                  style={{
                    left: `${15 + i * 18}%`,
                    top: '-5px',
                    animation: `goldGlitter ${1.5 + i * 0.4}s infinite linear`,
                    animationDelay: `${i * 0.3}s`
                  }}
                />
              ))}
            </div>
          )}

          {/* 4. Mini flying items for Badge Interactivity */}
          {badgeTriggerActive && matchingBadgeEffects.includes('owl') && (
            <div 
              className="absolute h-full flex items-center justify-center top-0 left-0 right-0 pointer-events-none text-[10px] z-20"
              style={{ animation: 'floatOwl 4s ease-in-out forwards' }}
            >
              🦉
            </div>
          )}
          {badgeTriggerActive && matchingBadgeEffects.includes('star') && (
            <div 
              className="absolute h-full flex items-center justify-center top-0 left-0 right-0 pointer-events-none text-[9px] z-20 text-yellow-300"
              style={{ animation: 'floatOwl 4s ease-in-out forwards' }}
            >
              🌟
            </div>
          )}
          {badgeTriggerActive && matchingBadgeEffects.includes('crown') && (
            <div 
              className="absolute h-full flex items-center justify-center top-0 left-0 right-0 pointer-events-none text-[9px] z-20"
              style={{ animation: 'floatOwl 4s ease-in-out forwards' }}
            >
              👑
            </div>
          )}

          {/* Epic slow inner circular breathing glow */}
          {rarity === 'epic' && !simplifiedMode && (
            <div className="absolute inset-0 pointer-events-none rounded-xl" style={{ animation: 'epicInnerGlow 5s infinite ease-in-out' }} />
          )}

          {/* Mythic noise overlay */}
          {rarity === 'mythic' && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.85))] opacity-80 mix-blend-overlay pointer-events-none" />
          )}

          {/* Text Content with Secret hide capability */}
          <span className="relative z-10 transition-opacity duration-300 block text-center" style={{ opacity: secretTextVisible ? 1 : 0 }}>
            {formattedTitle}
          </span>
        </div>

        {/* 0.1% Secret Notification overlay */}
        <AnimatePresence>
          {showSecretNotice && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute mt-8 bg-zinc-900 border border-zinc-700 text-red-400 font-bold text-[10px] px-2.5 py-1 rounded-md shadow-lg pointer-events-none flex items-center gap-1 z-35"
            >
              <span>{language === 'en' ? '...Was here?' : '…いた？'}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
