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
  // Fossilization has been completely retired to prevent popularity inference
  return {
    percentage: 0,
    tier: 'fresh',
    label: '🌱 新鮮',
    emoji: '🌱',
    cost: 0,
  };
}
