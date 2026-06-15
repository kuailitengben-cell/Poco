import { Timestamp } from 'firebase/firestore';

export interface FossilInfo {
  percentage: number; // 0 to 100
  tier: 'fresh' | 'semi' | 'fossilized' | 'ancient' | 'heritage';
  label: string;
  emoji: string;
  cost: number;
}

/**
 * Calculates the fossilization details for a given post.
 * 
 * Formula:
 * - daysElapsed = days since scene creation
 * - engagementScore = 1 + (upvotes * 0.5) + (commentCount * 1.5) + (sashiireCount * 2.0) + (kairanAmount * 0.05)
 * - fossilRate = daysElapsed / (3 * engagementScore)
 * - percentage = min(100, max(0, fossilRate * 100))
 */
export function calculateFossilInfo(
  createdAt: Timestamp | any,
  upvotes: number = 0,
  commentCount: number = 0,
  sashiireCount: number = 0,
  kairanAmount: number = 0,
  excavationsCount: number = 0,
  fossilOffset: number = 0
): FossilInfo {
  // If excavated 5 times or more, it officially becomes "Human Heritage" (人類遺産)
  if (excavationsCount >= 5) {
    return {
      percentage: 100,
      tier: 'heritage',
      label: '🏛 人類遺産',
      emoji: '🏛',
      cost: 0, // Viewing heritage is free as a historical resource!
    };
  }

  if (!createdAt) {
    return {
      percentage: 0,
      tier: 'fresh',
      label: '🌱 新鮮',
      emoji: '🌱',
      cost: 0,
    };
  }

  const createdDate = typeof createdAt.toDate === 'function' ? createdAt.toDate() : new Date(createdAt);
  const now = new Date();
  
  // Calculate relative days elapsed
  const diffMs = now.getTime() - createdDate.getTime();
  const daysElapsed = Math.max(0, diffMs / (1000 * 60 * 60 * 24));

  // Count the buffer influence of engagement
  const engagementScore = 1 + (upvotes * 0.5) + (commentCount * 1.5) + (sashiireCount * 2.0) + (kairanAmount * 0.05);
  
  // Base fossilization is 100% in 3 days of absolute silence.
  const fossilRate = daysElapsed / (3 * engagementScore);
  const basePercentage = Math.min(100, Math.max(0, Math.round(fossilRate * 100)));

  // Subtract personal excavation offset (each offset offsets percentage by 25%)
  const percentage = Math.max(0, basePercentage - (fossilOffset * 25));

  // Cost of a single chip action (1 tap) is based on base level
  let chipCost = 1;
  if (basePercentage >= 90) {
    chipCost = 5;
  } else if (basePercentage >= 50) {
    chipCost = 3;
  } else if (basePercentage >= 15) {
    chipCost = 2;
  }

  if (percentage < 15) {
    return {
      percentage,
      tier: 'fresh',
      label: '🌱 新鮮',
      emoji: '🌱',
      cost: chipCost,
    };
  } else if (percentage < 50) {
    return {
      percentage,
      tier: 'semi',
      label: '🪨 半石化',
      emoji: '🪨',
      cost: chipCost,
    };
  } else if (percentage < 90) {
    return {
      percentage,
      tier: 'fossilized',
      label: '🪨 石化',
      emoji: '🪨',
      cost: chipCost,
    };
  } else {
    return {
      percentage,
      tier: 'ancient',
      label: '🦴 人類化石',
      emoji: '🦴',
      cost: chipCost,
    };
  }
}
