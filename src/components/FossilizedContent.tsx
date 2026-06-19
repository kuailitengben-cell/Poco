import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface FossilizedContentProps {
  text: string;
  percentage: number; // 0 to 100
  sceneId: string;
  isTitle?: boolean;
}

// 1. Keep the backward-compatible FossilizedContent. 
// Instead of altering the letters themselves, characters now remain 100% intact,
// and the main parent box level is heavily overlayed with FossilOverlay.
export function FossilizedContent({ text }: FossilizedContentProps) {
  return <span>{text}</span>;
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

interface FossilOverlayProps {
  percentage: number; // 0 to 100
  sceneId: string;
}

export function FossilOverlay({ percentage, sceneId }: FossilOverlayProps) {
  const [rubble, setRubble] = useState<{ id: string; x: number; y: number; size: number; color: string }[]>([]);

  // Generate a natural sediment-packed rock pile
  const stones = useMemo(() => {
    const rng = seededRandom(sceneId);
    
    // We will place 16 overlapping stones at various organic coordinates
    const numStones = 16;
    const items = [];

    const stoneColors = [
      { fill: '#8a837a', stroke: '#524c45', sediment: '#9e978d', name: '泥岩' },
      { fill: '#9c9285', stroke: '#5d554a', sediment: '#b1a798', name: '砂岩' },
      { fill: '#a08f7f', stroke: '#615243', sediment: '#b4a392', name: '頁岩' },
      { fill: '#a69d90', stroke: '#696054', sediment: '#beb4a7', name: '凝灰岩' },
      { fill: '#7d776f', stroke: '#46423c', sediment: '#918b82', name: '玄武岩' }
    ];

    for (let i = 0; i < numStones; i++) {
      const gridRow = Math.floor(i / 4);
      const gridCol = i % 4;

      const baseX = (gridCol / 4) * 100;
      const baseY = (gridRow / 4) * 100;

      // Heavy jitter to emulate hand-piled, un-aligned messy stacking
      const left = Math.max(-10, Math.min(85, baseX + (rng() * 26 - 13)));
      const top = Math.max(-10, Math.min(85, baseY + (rng() * 26 - 13)));

      // Sizes overlap extensively
      const width = 32 + Math.floor(rng() * 18);  // 32% to 50% width
      const height = 30 + Math.floor(rng() * 15); // 30% to 45% height

      // Angle limit option: rotation is randomized between -10 and +10 degrees
      const rotation = (rng() * 20) - 10;

      // Select geologic tone
      const colorScheme = stoneColors[Math.floor(rng() * stoneColors.length)]!;
      
      // Build an irregular, heavily jagged path representing the stone block outline
      const numPoints = 6 + Math.floor(rng() * 4); // 6 to 9 sides
      const points = [];
      for (let p = 0; p < numPoints; p++) {
        const angle = (p / numPoints) * Math.PI * 2;
        // Chipped/shattered corners
        const isChipped = rng() > 0.72;
        const radius = isChipped ? 24 + rng() * 10 : 42 + rng() * 8;
        const x = 50 + Math.cos(angle) * radius;
        const y = 50 + Math.sin(angle) * radius;
        points.push({ x, y });
      }

      // Format SVG path
      let d = `M ${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;
      for (let p = 1; p < points.length; p++) {
        const pt = points[p]!;
        if (rng() > 0.45) {
          // Sharp jagged chipped corner
          d += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        } else {
          // Slightly curved sediment plate rounded limit
          const prev = points[p - 1]!;
          const cx = (prev.x + pt.x) / 2 + (rng() * 8 - 4);
          const cy = (prev.y + pt.y) / 2 + (rng() * 8 - 4);
          d += ` Q ${cx.toFixed(1)} ${cy.toFixed(1)}, ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        }
      }
      d += ' Z';

      // Crack structures inside
      const crackPaths = [];
      if (rng() > 0.25) {
        const crackCount = 1 + Math.floor(rng() * 2);
        for (let c = 0; c < crackCount; c++) {
          const xStart = 35 + rng() * 30;
          const yStart = 35 + rng() * 30;
          const xEnd = xStart + (rng() * 36 - 18);
          const yEnd = yStart + (rng() * 36 - 18);
          crackPaths.push(`M ${xStart.toFixed(1)} ${yStart.toFixed(1)} L ${xEnd.toFixed(1)} ${yEnd.toFixed(1)}`);
          if (rng() > 0.5) {
            // Secondary branching crack
            const xBranch = xEnd + (rng() * 16 - 8);
            const yBranch = yEnd + (rng() * 16 - 8);
            crackPaths.push(`M ${xEnd.toFixed(1)} ${yEnd.toFixed(1)} L ${xBranch.toFixed(1)} ${yBranch.toFixed(1)}`);
          }
        }
      }

      // Sediment layout lines representing eons of time (Banding lines)
      const sedimentaryLines = [];
      const numLines = 2 + Math.floor(rng() * 3);
      for (let l = 0; l < numLines; l++) {
        const yBase = 15 + (l * 20) + rng() * 8;
        sedimentaryLines.push(`M 10 ${yBase.toFixed(1)} Q 50 ${(yBase + rng() * 10 - 5).toFixed(1)}, 90 ${(yBase + rng() * 8 - 4).toFixed(1)}`);
      }

      // Geologic Fossil Markings (Fish Skeleton, Ammonite Spiral, Paleolithic Leaf veins)
      let fossilType: 'ammonite' | 'fish' | 'leaf' | 'none' = 'none';
      const fVal = rng();
      if (fVal < 0.13) {
        fossilType = 'ammonite';
      } else if (fVal < 0.24) {
        fossilType = 'fish';
      } else if (fVal < 0.35) {
        fossilType = 'leaf';
      }

      const priority = rng();

      items.push({
        id: `card_stone_${i}`,
        left,
        top,
        width,
        height,
        rotation,
        colorScheme,
        pathData: d,
        crackPaths,
        sedimentaryLines,
        fossilType,
        priority
      });
    }

    return items.sort((a, b) => a.priority - b.priority);
  }, [sceneId]);

  // Active stone objects calculated linearly corresponding to current petrification %
  const activeStones = useMemo(() => {
    if (percentage <= 0) return [];
    
    // Scale count
    const countToActivate = Math.round((percentage / 100) * stones.length);
    return stones.slice(0, countToActivate);
  }, [stones, percentage]);

  // Emits real falling stone fragments / flakes when the percent changes
  useEffect(() => {
    if (percentage > 0) {
      const newD = [];
      const rng = seededRandom(`${sceneId}_shatter_${Date.now()}_pct_${percentage}`);
      
      for (let i = 0; i < 15; i++) {
        newD.push({
          id: `debris_${i}_${Date.now()}`,
          x: 10 + rng() * 80,
          y: 10 + rng() * 60,
          size: 4 + Math.floor(rng() * 6),
          color: rng() > 0.5 ? '#7d7468' : '#a1978a'
        });
      }
      setRubble(newD);
      const timer = setTimeout(() => {
        setRubble([]);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [percentage, sceneId]);

  if (percentage <= 0) return null;

  return (
    <div className="absolute inset-0 z-20 overflow-hidden rounded-3xl pointer-events-none select-none">
      {/* Visual background shaded gloom representing overall stone block wrap */}
      <div 
        className="absolute inset-0 bg-stone-900/10 transition-opacity duration-300 pointer-events-none z-10" 
        style={{ opacity: percentage / 100 }}
      />

      {/* Falling physical chips when hammer hits */}
      <AnimatePresence>
        {rubble.map((item) => (
          <motion.div
            key={item.id}
            initial={{ left: `${item.x}%`, top: `${item.y}%`, opacity: 1, scale: 1.2, rotate: 0 }}
            animate={{ 
              top: `${item.y + 40}%`, 
              left: `${item.x + (Math.random() * 22 - 11)}%`, 
              opacity: 0, 
              scale: 0.3,
              rotate: 220
            }}
            transition={{ duration: 0.55, ease: 'easeIn' }}
            className="absolute shadow-sm pointer-events-none z-30"
            style={{ 
              width: `${item.size}px`, 
              height: `${item.size}px`, 
              backgroundColor: item.color,
              // Organically chipped tiny rock debris
              borderRadius: '40% 60% 45% 55% / 55% 45% 60% 40%',
              border: '1px solid rgba(0,0,0,0.15)'
            }}
          />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {activeStones.map((stone) => {
          return (
            <motion.div
              key={stone.id}
              initial={{ opacity: 0, scale: 0.72, rotate: stone.rotation * 1.5 }}
              animate={{ opacity: 1, scale: 1, rotate: stone.rotation }}
              exit={{ 
                opacity: 0, 
                y: 180, 
                rotate: stone.rotation * 3, 
                scale: 0.5,
                transition: { duration: 0.5, ease: 'easeIn' }
              }}
              whileHover={{ 
                scale: 1.05, 
                zIndex: 25,
                filter: 'brightness(1.04)',
                transition: { duration: 0.1 }
              }}
              className="absolute pointer-events-auto cursor-crosshair drop-shadow-md z-20"
              style={{
                left: `${stone.left}%`,
                top: `${stone.top}%`,
                width: `${stone.width}%`,
                height: `${stone.height}%`,
              }}
              title={`長い年代を経て石化しています (${percentage}%)。コインでハンマーを叩き発掘してください。`}
            >
              <svg 
                viewBox="0 0 100 100" 
                className="w-full h-full" 
                preserveAspectRatio="none"
              >
                {/* 1. Rough sediment outline plate */}
                <path 
                  d={stone.pathData} 
                  fill={stone.colorScheme.fill} 
                  stroke={stone.colorScheme.stroke} 
                  strokeWidth="3.2"
                  strokeLinejoin="round" 
                />

                {/* 2. Sediment eon banding lines */}
                {stone.sedimentaryLines.map((line, idx) => (
                  <path 
                    key={idx}
                    d={line} 
                    fill="none" 
                    stroke={stone.colorScheme.sediment} 
                    strokeWidth="3.5" 
                    className="opacity-45"
                    strokeLinecap="round"
                    strokeDasharray={idx % 2 === 0 ? "none" : "2 4"}
                  />
                ))}

                {/* 3. Sandy grains & rough inclusions */}
                <circle cx="20" cy="35" r="1.5" fill="#3D3831" className="opacity-20" />
                <circle cx="80" cy="55" r="1.2" fill="#3D3831" className="opacity-25" />
                <circle cx="48" cy="78" r="1.6" fill="#3D3831" className="opacity-20" />
                <circle cx="78" cy="18" r="1.4" fill="#ffffff" className="opacity-20" />
                <circle cx="32" cy="85" r="1.1" fill="#ffffff" className="opacity-25" />

                {/* 4. Fossil designs in relief */}
                {stone.fossilType === 'ammonite' && (
                  <path 
                    d="M50,50 Q45,45 42,48 T40,55 T50,60 T60,50 T50,38 T30,50 T50,70 T70,50 T50,25" 
                    fill="none" 
                    stroke="#433b32" 
                    strokeWidth="1.8" 
                    strokeLinecap="round" 
                    className="opacity-30"
                  />
                )}
                {stone.fossilType === 'fish' && (
                  <g className="opacity-25">
                    <path d="M 25 50 L 75 50" fill="none" stroke="#433b32" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M 33 42 L 38 58" fill="none" stroke="#433b32" strokeWidth="1.2" />
                    <path d="M 43 40 L 48 60" fill="none" stroke="#433b32" strokeWidth="1.2" />
                    <path d="M 53 42 L 58 58" fill="none" stroke="#433b32" strokeWidth="1.2" />
                    <path d="M 63 44 L 68 56" fill="none" stroke="#433b32" strokeWidth="1.2" />
                    <path d="M 75 50 L 80 43 M 75 50 L 80 57" fill="none" stroke="#433b32" strokeWidth="1.2" strokeLinecap="round" />
                  </g>
                )}
                {stone.fossilType === 'leaf' && (
                  <g className="opacity-25">
                    <path d="M 50 78 Q 50 50 50 22" fill="none" stroke="#433b32" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M 50 68 Q 38 56 32 56" fill="none" stroke="#433b32" strokeWidth="1.2" />
                    <path d="M 50 68 Q 62 56 68 56" fill="none" stroke="#433b32" strokeWidth="1.2" />
                    <path d="M 50 50 Q 40 40 35 40" fill="none" stroke="#433b32" strokeWidth="1.2" />
                    <path d="M 50 50 Q 60 40 65 40" fill="none" stroke="#433b32" strokeWidth="1.2" />
                  </g>
                )}

                {/* 5. Jagged cracks */}
                {stone.crackPaths.map((crack, idx) => (
                  <path 
                    key={idx} 
                    d={crack} 
                    fill="none" 
                    stroke="#332c25" 
                    strokeWidth="2.2" 
                    strokeLinecap="round" 
                    className="opacity-60"
                  />
                ))}

                {/* 6. Realistic 3D edge light reflecting highlight */}
                <path 
                  d={stone.pathData} 
                  fill="none" 
                  stroke="#ffffff" 
                  strokeWidth="1.5" 
                  className="opacity-30"
                  style={{ transform: 'translate(-1.4px, -1.4px)' }}
                />
              </svg>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
