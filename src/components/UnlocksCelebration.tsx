import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, Sparkles, X, Award, Flame, Crown, Zap, Target } from 'lucide-react';
import { Badge, Title, TitlePart, getBadgeRarityStyle } from '../lib/badgeUtils';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useLanguage } from '../lib/LanguageContext';
import { PREFIX_TRANSLATIONS, SUFFIX_TRANSLATIONS, CONDITION_TRANSLATIONS } from '../lib/titleRarityUtils';

interface UnlocksCelebrationProps {
  myBadges: Badge[];
  myTitles: Title[];
  myPrefixes?: TitlePart[];
  mySuffixes?: TitlePart[];
  userId: string;
  isProfileLoaded?: boolean;
  isGachaActive?: boolean;
}

interface CelebrationItem {
  id: string;
  type: 'badge' | 'title';
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  emoji?: string;
  color?: string;
  bgColor?: string;
  borderColor?: string;
  rarity?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  gravity: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'circle' | 'square' | 'star' | 'donut';
}

const COLORS = [
  '#FF5E62', '#FF9966', '#FFD97D', '#60EFFF', '#00FF87', 
  '#F355FF', '#FF007F', '#FFFF00', '#00FFFF', '#FFA500'
];

export default function UnlocksCelebration({ myBadges, myTitles, myPrefixes = [], mySuffixes = [], userId, isProfileLoaded, isGachaActive }: UnlocksCelebrationProps) {
  const { language, t } = useLanguage();
  const [queue, setQueue] = useState<CelebrationItem[]>([]);
  const [activeItem, setActiveItem] = useState<CelebrationItem | null>(null);
  
  // Keep track of what has already been celebration-processed during this session
  const knownBadgesRef = useRef<Set<string>>(new Set());
  const knownTitlesRef = useRef<Set<string>>(new Set());
  const knownPrefixesRef = useRef<Set<string>>(new Set());
  const knownSuffixesRef = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef(false);

  // Initialize once we have a userId and profile has loaded successfully (preserving celebrated state sync)
  useEffect(() => {
    if (!userId || (isProfileLoaded !== undefined && !isProfileLoaded)) return;
    
    let storedBadges: string[] = [];
    let storedTitles: string[] = [];
    let storedPrefixes: string[] = [];
    let storedSuffixes: string[] = [];
    
    try {
      const bStr = localStorage.getItem(`jimicchi_celebrated_badges_${userId}`);
      if (bStr) storedBadges = JSON.parse(bStr);
      
      const tStr = localStorage.getItem(`jimicchi_celebrated_titles_${userId}`);
      if (tStr) storedTitles = JSON.parse(tStr);

      const pStr = localStorage.getItem(`jimicchi_celebrated_prefixes_${userId}`);
      if (pStr) storedPrefixes = JSON.parse(pStr);

      const sStr = localStorage.getItem(`jimicchi_celebrated_suffixes_${userId}`);
      if (sStr) storedSuffixes = JSON.parse(sStr);
    } catch(e) {
      console.error('Failed to parse celebrated items:', e);
    }
    
    // Create the initial sets from stored seen list
    const initialBadges = new Set<string>(storedBadges);
    const initialTitles = new Set<string>(storedTitles);
    const initialPrefixes = new Set<string>(storedPrefixes);
    const initialSuffixes = new Set<string>(storedSuffixes);
    
    // If the storage was empty, seed it with currently earned items
    if (storedBadges.length === 0 && myBadges.length > 0) {
      myBadges.forEach(b => initialBadges.add(b.id));
      localStorage.setItem(`jimicchi_celebrated_badges_${userId}`, JSON.stringify(Array.from(initialBadges)));
    } else {
      myBadges.forEach(b => initialBadges.add(b.id));
    }
    
    if (storedTitles.length === 0 && myTitles.length > 0) {
      myTitles.forEach(t => initialTitles.add(t.id));
      localStorage.setItem(`jimicchi_celebrated_titles_${userId}`, JSON.stringify(Array.from(initialTitles)));
    } else {
      myTitles.forEach(t => initialTitles.add(t.id));
    }

    if (storedPrefixes.length === 0 && myPrefixes.length > 0) {
      myPrefixes.forEach(p => initialPrefixes.add(p.id));
      localStorage.setItem(`jimicchi_celebrated_prefixes_${userId}`, JSON.stringify(Array.from(initialPrefixes)));
    } else {
      myPrefixes.forEach(p => initialPrefixes.add(p.id));
    }

    if (storedSuffixes.length === 0 && mySuffixes.length > 0) {
      mySuffixes.forEach(s => initialSuffixes.add(s.id));
      localStorage.setItem(`jimicchi_celebrated_suffixes_${userId}`, JSON.stringify(Array.from(initialSuffixes)));
    } else {
      mySuffixes.forEach(s => initialSuffixes.add(s.id));
    }
    
    knownBadgesRef.current = initialBadges;
    knownTitlesRef.current = initialTitles;
    knownPrefixesRef.current = initialPrefixes;
    knownSuffixesRef.current = initialSuffixes;
    isInitializedRef.current = true;
  }, [userId, isProfileLoaded]);

  // Canvas details
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Detect newly unlocked badges and titles
  useEffect(() => {
    if (!isInitializedRef.current || !userId) {
      return;
    }

    const newCelebrations: CelebrationItem[] = [];
    const newlyUnlockedBadges: string[] = [];
    const newlyUnlockedTitles: string[] = [];
    const newlyUnlockedPrefixes: string[] = [];
    const newlyUnlockedSuffixes: string[] = [];

    // Check badges
    for (const b of myBadges) {
      if (!knownBadgesRef.current.has(b.id)) {
        knownBadgesRef.current.add(b.id);
        newlyUnlockedBadges.push(b.id);
        newCelebrations.push({
          id: `badge-${b.id}`,
          type: 'badge',
          name: b.name,
          nameEn: b.nameEn,
          description: b.description,
          descriptionEn: b.descriptionEn,
          emoji: b.emoji,
          color: b.color,
          bgColor: b.bgColor,
          borderColor: b.borderColor,
          rarity: b.rarity || 'common'
        });
      }
    }

    // Check titles
    for (const t of myTitles) {
      if (!knownTitlesRef.current.has(t.id)) {
        knownTitlesRef.current.add(t.id);
        newlyUnlockedTitles.push(t.id);
        newCelebrations.push({
          id: `title-${t.id}`,
          type: 'title',
          name: t.name,
          nameEn: t.nameEn,
          description: t.conditionText,
          descriptionEn: t.conditionTextEn
        });
      }
    }

    // Check prefixes
    for (const p of myPrefixes) {
      if (!knownPrefixesRef.current.has(p.id)) {
        knownPrefixesRef.current.add(p.id);
        newlyUnlockedPrefixes.push(p.id);
        const pNameEn = p.textEn || PREFIX_TRANSLATIONS[p.text] || p.text;
        const pDescEn = p.conditionTextEn || CONDITION_TRANSLATIONS[p.conditionText] || p.conditionText || 'Special Title Part (Prefix)';
        newCelebrations.push({
          id: `prefix-${p.id}`,
          type: 'title',
          name: `「${p.text}」`,
          nameEn: `"${pNameEn}"`,
          description: p.conditionText || '特別2つ名パーツ(前句)',
          descriptionEn: pDescEn
        });
      }
    }

    // Check suffixes
    for (const s of mySuffixes) {
      if (!knownSuffixesRef.current.has(s.id)) {
        knownSuffixesRef.current.add(s.id);
        newlyUnlockedSuffixes.push(s.id);
        const sNameEn = s.textEn || SUFFIX_TRANSLATIONS[s.text] || s.text;
        const sDescEn = s.conditionTextEn || CONDITION_TRANSLATIONS[s.conditionText] || s.conditionText || 'Special Title Part (Suffix)';
        newCelebrations.push({
          id: `suffix-${s.id}`,
          type: 'title',
          name: `「${s.text}」`,
          nameEn: `"${sNameEn}"`,
          description: s.conditionText || '特別2つ名パーツ(後句)',
          descriptionEn: sDescEn
        });
      }
    }

    if (newCelebrations.length > 0) {
      // Save newly unlocked items to local storage
      try {
        if (newlyUnlockedBadges.length > 0) {
          const bStr = localStorage.getItem(`jimicchi_celebrated_badges_${userId}`);
          const currentStored = bStr ? JSON.parse(bStr) : [];
          const merged = Array.from(new Set([...currentStored, ...newlyUnlockedBadges]));
          localStorage.setItem(`jimicchi_celebrated_badges_${userId}`, JSON.stringify(merged));
        }
        if (newlyUnlockedTitles.length > 0) {
          const tStr = localStorage.getItem(`jimicchi_celebrated_titles_${userId}`);
          const currentStored = tStr ? JSON.parse(tStr) : [];
          const merged = Array.from(new Set([...currentStored, ...newlyUnlockedTitles]));
          localStorage.setItem(`jimicchi_celebrated_titles_${userId}`, JSON.stringify(merged));
        }
        if (newlyUnlockedPrefixes.length > 0) {
          const pStr = localStorage.getItem(`jimicchi_celebrated_prefixes_${userId}`);
          const currentStored = pStr ? JSON.parse(pStr) : [];
          const merged = Array.from(new Set([...currentStored, ...newlyUnlockedPrefixes]));
          localStorage.setItem(`jimicchi_celebrated_prefixes_${userId}`, JSON.stringify(merged));
        }
        if (newlyUnlockedSuffixes.length > 0) {
          const sStr = localStorage.getItem(`jimicchi_celebrated_suffixes_${userId}`);
          const currentStored = sStr ? JSON.parse(sStr) : [];
          const merged = Array.from(new Set([...currentStored, ...newlyUnlockedSuffixes]));
          localStorage.setItem(`jimicchi_celebrated_suffixes_${userId}`, JSON.stringify(merged));
        }

        // Sync celebrated arrays to Firestore profile backup
        const profileRef = doc(db, 'profiles', userId);
        const updates: any = {};
        if (newlyUnlockedBadges.length > 0) {
          const raw = localStorage.getItem(`jimicchi_celebrated_badges_${userId}`);
          updates.celebratedBadgeIds = raw ? JSON.parse(raw) : [];
        }
        if (newlyUnlockedPrefixes.length > 0) {
          const raw = localStorage.getItem(`jimicchi_celebrated_prefixes_${userId}`);
          updates.celebratedPrefixIds = raw ? JSON.parse(raw) : [];
        }
        if (newlyUnlockedSuffixes.length > 0) {
          const raw = localStorage.getItem(`jimicchi_celebrated_suffixes_${userId}`);
          updates.celebratedSuffixIds = raw ? JSON.parse(raw) : [];
        }
        if (Object.keys(updates).length > 0) {
          updateDoc(profileRef, updates).catch(err => {
            console.warn("Failed to backup celebrated status to Firestore:", err);
          });
        }
      } catch (e) {
        console.error('Failed to save celebrated items:', e);
      }
      setQueue(prev => [...prev, ...newCelebrations]);
    }
  }, [myBadges, myTitles, myPrefixes, mySuffixes, userId]);

  // Manage active celebration sequence
  useEffect(() => {
    if (isGachaActive) return;
    if (!activeItem && queue.length > 0) {
      const next = queue[0];
      setQueue(prev => prev.slice(1));
      setActiveItem(next);
    }
  }, [queue, activeItem, isGachaActive]);

  // Sparkles generator helper for canvas particles
  const triggerFireworkBurst = (centerX: number, centerY: number, particleCount = 60) => {
    const burstParticles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      burstParticles.push({
        id: Math.random(),
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 2), // upward bias
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 5 + 3,
        alpha: 1.0,
        decay: Math.random() * 0.015 + 0.012,
        gravity: 0.12,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 10 - 5,
        shape: ['circle', 'square', 'star', 'donut'][Math.floor(Math.random() * 4)] as any
      });
    }

    particlesRef.current = [...particlesRef.current, ...burstParticles];
  };

  // Drifting sparkles helper (e.g. from the center of the card)
  const triggerCenterGlow = (centerX: number, centerY: number) => {
    const glowParticles: Particle[] = [];
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      glowParticles.push({
        id: Math.random(),
        x: centerX + (Math.random() * 40 - 20),
        y: centerY + (Math.random() * 40 - 20),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        color: '#FFEA79', // purely golden
        size: Math.random() * 4 + 2,
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.01,
        gravity: 0.02,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 6 - 3,
        shape: 'star'
      });
    }
    particlesRef.current = [...particlesRef.current, ...glowParticles];
  };

  // Launch fireworks bursts randomly when item unlocks
  useEffect(() => {
    if (activeItem) {
      // Fire particle bursts 
      setTimeout(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        
        // Burst 1: Center
        triggerFireworkBurst(w / 2, h / 2 - 100, 70);
        
        // Burst 2: Left side
        setTimeout(() => triggerFireworkBurst(w * 0.25, h * 0.4, 45), 250);
        
        // Burst 3: Right side
        setTimeout(() => triggerFireworkBurst(w * 0.75, h * 0.45, 45), 500);

        // Gentle floating gold sparkles
        let count = 0;
        const timer = setInterval(() => {
          triggerCenterGlow(w / 2, h / 2);
          count++;
          if (count > 6) clearInterval(timer);
        }, 300);

      }, 100);

      // Auto dismiss after 6.5 seconds
      const dismissTimer = setTimeout(() => {
        handleClose();
      }, 6500);

      return () => clearTimeout(dismissTimer);
    }
  }, [activeItem]);

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const drawStar = (cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number, fillStyle: string, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.translate(cx, cy);
      ctx.moveTo(0, 0 - outerRadius);
      for (let i = 0; i < spikes; i++) {
        ctx.rotate(Math.PI / spikes);
        ctx.lineTo(0, 0 - innerRadius);
        ctx.rotate(Math.PI / spikes);
        ctx.lineTo(0, 0 - outerRadius);
      }
      ctx.closePath();
      ctx.fillStyle = fillStyle;
      ctx.fill();
      ctx.restore();
    };

    const updateAndDraw = () => {
      // Clear previous frames
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const activeParticles = particlesRef.current;

      for (let i = activeParticles.length - 1; i >= 0; i--) {
        const p = activeParticles[i];
        
        // Update physics
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.alpha -= p.decay;
        p.rotation += p.rotationSpeed;

        // If particle is dead, clean it up
        if (p.alpha <= 0) {
          activeParticles.splice(i, 1);
          continue;
        }

        // Draw particle shape
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'square') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else if (p.shape === 'donut') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.arc(0, 0, p.size / 4, 0, Math.PI * 2, true);
          ctx.fill();
        } else if (p.shape === 'star') {
          ctx.restore(); // Star has its own nesting translate
          drawStar(p.x, p.y, 5, p.size, p.size / 2, p.color, p.alpha);
          ctx.save(); // keep balanced for restore
        }

        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(updateAndDraw);
    };

    animationFrameRef.current = requestAnimationFrame(updateAndDraw);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [activeItem]);

  const handleClose = () => {
    setActiveItem(null);
  };

  const getBadgeIcon = (emoji?: string) => {
    return emoji || '🎖️';
  };

  if (!activeItem) return null;

  return (
    <>
      {/* Absolute overlay canvas for fireworks and sparkles */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-50 pointer-events-none select-none"
      />

      {/* Screen Backdrop */}
      <div className="fixed inset-0 bg-orange-950/30 backdrop-blur-[2px] z-[51] flex items-center justify-center p-4">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 120 }}
            className="w-full max-w-md bg-gradient-to-lg from-white to-amber-50/20 shadow-2xl rounded-[32px] overflow-hidden border border-amber-250/50 flex flex-col items-center p-8 text-center relative pointer-events-auto"
          >
            {/* Ambient gold halo background blur */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-200/50 rounded-full filter blur-3xl opacity-60 mix-blend-multiply pointer-events-none" />

            <button
              onClick={handleClose}
              className="absolute top-5 right-5 p-2 bg-slate-50 hover:bg-orange-100 text-slate-400 hover:text-slate-800 rounded-full transition-colors duration-200"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Achievement header with floating sparkles */}
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/60 px-4 py-1.5 rounded-full text-amber-700 text-[10px] font-black uppercase tracking-widest mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-300" />
              <span>実績解除!! ACHIEVEMENT UNLOCKED</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-300" />
            </div>

            {/* Unlocked Item Avatar */}
            {activeItem.type === 'badge' ? (() => {
              const rStyle = getBadgeRarityStyle(activeItem.rarity as any);
              return (
                <div className={`w-24 h-24 rounded-[32px] border-2 flex items-center justify-center text-5xl shadow-lg relative mb-6 group ${rStyle.bg} ${rStyle.border}`}>
                  <span className="animate-wiggle">{getBadgeIcon(activeItem.emoji)}</span>
                  <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full flex items-center justify-center text-xs shadow">
                    ★
                  </span>
                </div>
              );
            })() : (
              <div className="w-24 h-24 rounded-[32px] bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 border-2 border-emerald-300 flex items-center justify-center text-emerald-600 shadow-lg relative mb-6">
                <Crown className="w-12 h-12 fill-emerald-100" />
                <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs shadow font-black">
                  ✓
                </span>
              </div>
            )}

            {/* Type specification label */}
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block mb-1">
              {activeItem.type === 'badge' 
                ? (language === 'en' ? 'Collective Badge' : 'コレクティブバッジ')
                : (language === 'en' ? 'Title / Part' : '称号・2つ名パーツ')}
            </span>

            {/* Achievement Title */}
            <h4 className="text-2xl font-black text-orange-950 tracking-tight leading-tight mb-2 px-2">
              「{language === 'en' ? (activeItem.nameEn || activeItem.name) : activeItem.name}」
            </h4>

            {/* Rarity or Sub details */}
            {activeItem.type === 'badge' && activeItem.rarity && (() => {
              const rStyle = getBadgeRarityStyle(activeItem.rarity as any);
              return (
                <span className={`text-[9px] px-3 py-1 rounded-full border font-black uppercase tracking-wider mb-4 shadow-sm inline-block ${rStyle.bg} ${rStyle.border} ${rStyle.text}`}>
                  {language === 'en' ? `Rarity: ${activeItem.rarity}` : `レアリティ: ${activeItem.rarity}`}
                </span>
              );
            })()}

            {/* Description */}
            <p className="text-xs text-orange-900/70 font-medium leading-relaxed max-w-xs mb-8 px-4">
              {language === 'en' ? (activeItem.descriptionEn || activeItem.description) : activeItem.description}
            </p>

            {/* Glowing Confirm Button */}
            <button
              onClick={handleClose}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 font-extrabold text-xs text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-600/30 transition-all transform hover:scale-[1.02] active:scale-95 duration-200"
            >
              {t("誇らしく受け取る (Got it!)", "Proudly Accept (Got it!)")}
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
