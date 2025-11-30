/**
 * Pricing Accuracy Utilities
 *
 * Provides functions for calculating and tracking pricing accuracy.
 */

/**
 * Calculate pricing accuracy score
 * Used to track how well AI pricing matches freelancer expectations
 */
export function calculateAccuracyScore(
  aiPrice: number,
  finalPrice: number
): number {
  if (aiPrice === 0 || finalPrice === 0) return 0;

  const difference = Math.abs(aiPrice - finalPrice);
  const percentDiff = (difference / finalPrice) * 100;

  // Perfect = 100%, 50% off = 50%, 100%+ off = 0%
  return Math.max(0, 100 - percentDiff);
}
