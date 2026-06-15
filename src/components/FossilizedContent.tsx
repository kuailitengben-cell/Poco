import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface FossilizedContentProps {
  text: string;
  percentage: number; // 0 to 100 (degree of petrification)
  sceneId: string;
  isTitle?: boolean;
}

// Seeded PRNG for consistent, non-shifting layouts
function seededRandom(seed: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function FossilizedContent({ text, percentage, sceneId, isTitle = false }: FossilizedContentProps) {
  const [fossilDust, setFossilDust] = useState<{ id: string; x: number; y: number; delay: number }[]>([]);

  // 1. Generate Stone Slabs that overlap dynamically
  const stoneFragments = useMemo(() => {
    // We target a dense cover of the container
    // A 4x4 matrix gives 16 positions, which we can populate with robustly oversized overlaps (e.g. 30-40% wide/high)
    const gridSize = 4;
    const pieces: {
      id: string;
      left: number;
      top: number;
      width: number;
      height: number;
      rotation: number;
      crackStyle: number;
      roundedType: string;
      color: string;
      priority: number; // Order of appearance (0.0 to 1.0)
    }[] = [];

    const rng = seededRandom(sceneId);

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        // Base coordinate of the grid cell
        const baseX = (col / gridSize) * 100;
        const baseY = (row / gridSize) * 100;

        // Add organic jitter/displacement
        const jitterX = (rng() * 12) - 6; // -6% to +6%
        const jitterY = (rng() * 12) - 6;

        // Sizing is oversized so that stones overlap each other heavily
        const width = 32 + (rng() * 12);  // 32% to 44% wide
        const height = 30 + (rng() * 15); // 30% to 45% high

        // Clamp positions to protect bounding boundaries slightly
        const left = Math.max(-5, Math.min(85, baseX + jitterX));
        const top = Math.max(-5, Math.min(85, baseY + jitterY));

        // Rotation is strictly between -10 degrees and +10 degrees
        const rotation = Math.round((rng() * 20) - 10);

        // Styling details
        const crackStyle = Math.floor(rng() * 4);
        const roundedType = rng() > 0.5 
          ? 'rounded-2xl' 
          : 'rounded-tl-[2rem] rounded-br-[2rem] rounded-tr-[1rem] rounded-bl-[1rem]';

        // Slate variations
        const colorVariants = [
          'bg-stone-300 border-stone-400 text-stone-600',
          'bg-[#c3bab0] border-[#9e9285] text-[#71665a]',
          'bg-[#bcb6b0] border-[#918a80] text-[#696157]',
          'bg-[#cecac3] border-[#a5a198] text-[#78746c]',
        ];
        const color = colorVariants[Math.floor(rng() * colorVariants.length)] || colorVariants[0]!;

        // Appearance priority (shuffled 0..1 scale)
        const priority = rng();

        pieces.push({
          id: `stone_${row}_${col}`,
          left,
          top,
          width,
          height,
          rotation,
          crackStyle,
          roundedType,
          color,
          priority
        });
      }
    }

    // Sort pieces by priority so their order of activation remains completely deterministic
    return pieces.sort((a, b) => a.priority - b.priority);
  }, [sceneId]);

  // 2. Decide which stones are active based on the petrification percentage
  const activePieces = useMemo(() => {
    if (percentage <= 0) return [];
    
    // Scale number of active fragments count (0 to 16) based on percentage
    const maxPieces = stoneFragments.length;
    const countToActivate = Math.round((percentage / 100) * maxPieces);

    return stoneFragments.slice(0, countToActivate);
  }, [stoneFragments, percentage]);

  // 3. Emit physical sand falling action on hammer impact or mount when fossil exists
  useEffect(() => {
    if (percentage > 0) {
      // Lightly trigger temporary visual pebble/dust specs drifting downward
      const dots: { id: string; x: number; y: number; delay: number }[] = [];
      const rng = seededRandom(`${sceneId}_dust_${Date.now()}_pct_${percentage}`);
      
      for (let i = 0; i < 8; i++) {
        dots.push({
          id: `dust_${i}_${Date.now()}`,
          x: rng() * 100,
          y: rng() * 40,
          delay: rng() * 0.2
        });
      }
      setFossilDust(dots);

      const timer = setTimeout(() => {
        setFossilDust([]);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [percentage, sceneId]);

  // Render crack SVG patterns inside ancient stone plates
  const renderCrack = (styleIdx: number) => {
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.25]" viewBox="0 0 100 100" preserveAspectRatio="none">
        {styleIdx === 0 && (
          <path d="M5,10 Q25,30 35,55 T85,90" stroke="#71665a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}
        {styleIdx === 1 && (
          <path d="M90,5 L50,45 L40,35 M50,45 L10,85" stroke="#71665a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}
        {styleIdx === 2 && (
          <>
            <path d="M50,10 L50,90" stroke="#71665a" strokeWidth="2.0" fill="none" strokeLinecap="round" />
            <path d="M25,40 L75,40" stroke="#71665a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </>
        )}
        {styleIdx === 3 && (
          <path d="M15,85 L35,60 L60,65 L85,15" stroke="#71665a" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        )}
        {/* Tiny concentric motif depicting an artifact */}
        {styleIdx % 2 === 0 && (
          <circle cx="50" cy="50" r="15" stroke="#71665a" strokeWidth="1" strokeDasharray="3 3" fill="none" className="opacity-30" />
        )}
      </svg>
    );
  };

  return (
    <span className="relative block w-full overflow-hidden select-none" style={{ minHeight: isTitle ? '1.8rem' : '4rem' }}>
      {/* 1. Underlying Real Text (Intact, untransformed, 100% full text data behind) */}
      <span className="relative z-0 block w-full text-stone-900 leading-relaxed break-all font-serif">
        {text}
      </span>

      {/* 2. Overlapping Physical Stone Blocks (Absolutely positioned directly on top) */}
      <AnimatePresence>
        {activePieces.map((piece) => {
          return (
            <motion.span
              key={piece.id}
              initial={{ opacity: 0, scale: 0.8, rotate: piece.rotation * 1.4 }}
              animate={{ opacity: 1, scale: 1, rotate: piece.rotation }}
              exit={{ 
                opacity: 0, 
                y: 80, 
                rotate: piece.rotation * 2, 
                scale: 0.7,
                transition: { duration: 0.45, ease: 'easeIn' }
              }}
              whileHover={{ 
                scale: 1.05, 
                y: -1, 
                filter: 'brightness(1.05)',
                transition: { duration: 0.12 }
              }}
              className={`absolute border-2 border-stone-500/80 shadow-[inset_2px_2px_0px_rgba(255,255,255,0.45),_0px_4px_8px_rgba(0,0,0,0.3)] flex items-center justify-center overflow-hidden cursor-crosshair z-10 select-none ${piece.color} ${piece.roundedType}`}
              style={{
                left: `${piece.left}%`,
                top: `${piece.top}%`,
                width: `${piece.width}%`,
                height: `${piece.height}%`,
                pointerEvents: 'auto'
              }}
              title={`石化しています (${percentage}%)。発掘調査で砕くことができます。`}
            >
              {/* Shading/Highlights */}
              <span className="absolute inset-0 bg-gradient-to-tr from-stone-900/10 via-transparent to-white/15 pointer-events-none" />
              
              {/* Lichen/moss organic touch */}
              <span className="absolute -bottom-1 -right-1 w-2/3 h-2/3 bg-orange-950/5 rounded-full filter blur-md pointer-events-none" />

              {/* Crack textures */}
              {renderCrack(piece.crackStyle)}

              {/* Mini chisel indents */}
              <span className="w-1.5 h-1.5 bg-[#ad9f92] rounded-full opacity-60 shadow-[inset_1px_1px_1px_rgba(0,0,0,0.2)]" />
            </motion.span>
          );
        })}
      </AnimatePresence>

      {/* 3. Dust drift specs */}
      {fossilDust.map((dot) => (
        <motion.span
          key={dot.id}
          initial={{ x: `${dot.x}%`, y: `${dot.y}px`, opacity: 0, scale: 1.2 }}
          animate={{ 
            y: `${dot.y + 60}px`, 
            opacity: [0, 0.8, 0], 
            scale: [1, 0.4] 
          }}
          transition={{ duration: 0.48, ease: 'easeIn', delay: dot.delay }}
          className="absolute w-1.5 h-1.5 bg-stone-500/50 rounded-full pointer-events-none z-20"
        />
      ))}
    </span>
  );
}
