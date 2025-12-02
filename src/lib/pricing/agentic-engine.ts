/**
 * Agentic Pricing Engine - Now powered by Claude Agent SDK
 *
 * This module re-exports types and functions from the new orchestrator
 * for backward compatibility. The old OpenAI-based implementation has been replaced.
 */

import type { User, ProjectRules, ContextNote } from '@/lib/db/schema';

// Re-export types from the new system
export type {
  PricingContext,
  PricingBreakdown,
} from '@/lib/ai/types';

// For backward compatibility
export interface AgenticPriceBreakdown {
  estimatedHours: number;
  hourlyRate: number;
  laborCost: number;
  overhead: {
    percentage: number;
    amount: number;
  };
  profit: {
    percentage: number;
    amount: number;
  };
  baseSubtotal: number;
  marketAdjustment: {
    factor: number;
    reasoning: string;
  };
  safetyBuffer: {
    percentage: number;
    amount: number;
    reasoning: string;
  };
  recommendedPrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  confidence: number;
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface AgenticPricingResult {
  breakdown: AgenticPriceBreakdown;
  reasoning: string;
  scopeSummary: string;
  marketResearchSummary: string;
  contextUsed: import('@/lib/ai/types').PricingContext;
  improvementTips: string[];
  isOutOfScope: boolean;
  rulesApplied: string[];
}

/**
 * Main entry point for agentic pricing - now uses Claude Agent SDK
 */
export async function calculateAgenticPrice(params: {
  requestText: string;
  clarificationAnswers: Record<string, string>;
  user: User;
  rules: ProjectRules;
  contextNotes?: ContextNote[];
}): Promise<AgenticPricingResult> {
  const { analyzeRequestFull } = await import('@/lib/ai/orchestrator');

  const result = await analyzeRequestFull({
    requestText: params.requestText,
    clarificationAnswers: params.clarificationAnswers,
    rules: params.rules,
    user: params.user,
    contextNotes: params.contextNotes || [],
  });

  // Convert to legacy format
  const hourlyRate = result.pricingContextUsed?.freelancer?.hourlyRate || 100;
  const estimatedHours = result.estimatedHours || 4;
  const laborCost = hourlyRate * estimatedHours;
  const overheadPct = result.pricingContextUsed?.freelancer?.overhead || 0.2;
  const profitPct = result.pricingContextUsed?.freelancer?.profitMargin || 0.15;
  const overheadAmount = laborCost * overheadPct;
  const profitAmount = (laborCost + overheadAmount) * profitPct;
  const baseSubtotal = laborCost + overheadAmount + profitAmount;

  return {
    breakdown: {
      estimatedHours,
      hourlyRate,
      laborCost,
      overhead: {
        percentage: overheadPct,
        amount: overheadAmount,
      },
      profit: {
        percentage: profitPct,
        amount: profitAmount,
      },
      baseSubtotal,
      marketAdjustment: {
        factor: 1.0,
        reasoning: result.marketResearchSummary || 'Market-informed pricing',
      },
      safetyBuffer: {
        percentage: result.complexity === 'complex' ? 0.25 : result.complexity === 'moderate' ? 0.15 : 0.10,
        amount: (result.suggestedPrice || baseSubtotal) * 0.15,
        reasoning: 'Complexity-based buffer',
      },
      recommendedPrice: result.suggestedPrice || baseSubtotal * 1.15,
      priceRange: result.priceRange || {
        min: (result.suggestedPrice || baseSubtotal) * 0.85,
        max: (result.suggestedPrice || baseSubtotal) * 1.25,
      },
      confidence: result.confidence,
      complexity: result.complexity || 'moderate',
    },
    reasoning: result.pricingReasoning || result.reasoning,
    scopeSummary: result.scopeSummary,
    marketResearchSummary: result.marketResearchSummary || 'Market research completed.',
    contextUsed: result.pricingContextUsed!,
    improvementTips: result.improvementTips || [],
    isOutOfScope: true, // Always out of scope for pricing requests
    rulesApplied: result.relevantRules,
  };
}

// Legacy helper functions - now use orchestrator internally
export function gatherPricingContext(
  user: User,
  rules: ProjectRules,
  contextNotes: ContextNote[] = [],
  requestText: string,
  clarificationAnswers?: Record<string, string>
): import('@/lib/ai/types').PricingContext {
  return {
    freelancer: {
      location: user.location || undefined,
      specializations: user.specializations as string[] | undefined,
      hourlyRate: user.hourlyRate ? parseFloat(user.hourlyRate.toString()) : undefined,
      positioning: user.competitivePositioning || 'mid-market',
      industry: user.industry || undefined,
      overhead: user.overhead ? parseFloat(user.overhead.toString()) : 0.2,
      profitMargin: user.profitMargin ? parseFloat(user.profitMargin.toString()) : 0.15,
      tier: user.currentTier || 1,
      projectsCompleted: user.projectsCompleted || 0,
    },
    project: {
      originalContractPrice: rules.originalContractPrice
        ? parseFloat(rules.originalContractPrice.toString())
        : undefined,
      projectType: rules.projectType || undefined,
      clientLocation: rules.clientLocation || undefined,
      projectTimeline: rules.projectTimeline || undefined,
      deliverables: rules.deliverables as string[] | undefined,
      currency: rules.currency || 'USD',
    },
    request: {
      description: requestText,
      clarificationAnswers,
      urgency: 'normal',
    },
    contextNotes: contextNotes.map((n) => n.content),
  };
}
