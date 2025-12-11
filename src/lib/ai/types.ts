/**
 * Scope Creep Pricing Engine - Type Definitions
 *
 * Shared types for the multi-agent pricing system
 */

import type { ProjectRules, ContextNote, User } from '@/lib/db/schema';

// ============================================================================
// Clarification Agent Types
// ============================================================================

export interface ClarificationQuestion {
  id: string;
  question: string;
  helpText?: string;
  type: 'text' | 'select' | 'multiselect';
  options?: string[];
  priority: number; // 1 = must ask, 2 = should ask, 3 = could ask
  category: 'location' | 'scope' | 'timeline' | 'skills' | 'budget' | 'urgency' | 'other';
}

export interface InformationAssessment {
  provided: string[];
  missingCritical: string[];
  missingRecommended: string[];
  canProceed: boolean;
  confidenceIfProceeding: 'high' | 'medium' | 'low';
}

export interface ClarificationResult {
  assessment: InformationAssessment;
  questions: ClarificationQuestion[];
  assumptions: Array<{
    assumption: string;
    impact: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  recommendation: 'ask_questions' | 'proceed_with_assumptions' | 'need_more_context';
}

// ============================================================================
// Scope Analyzer Types
// ============================================================================

export type ScopeChangeClassification =
  | 'ADDITION'      // Completely new work
  | 'MODIFICATION'  // Change to existing requirement
  | 'EXPANSION'     // More of the same type of work
  | 'CLARIFICATION' // Ambiguous requirement now specified
  | 'REDUCTION';    // Removal of original scope

export interface ScopeChange {
  id: string;
  description: string;
  classification: ScopeChangeClassification;
  originalRequirement: string | null;
  newRequirement: string;
  directImpact: number; // 1-5
  rippleEffect: number; // 1-5
  riskLevel: 'low' | 'medium' | 'high';
  affectedDeliverables: string[];
  dependencies: string[];
  notes?: string;
  scopeJustification?: string; // Why this is/isn't in scope
}

export type ScopeVerdict = 'IN_SCOPE' | 'OUT_OF_SCOPE' | 'BOUNDARY_CASE' | 'CLARIFICATION_ONLY';

export type ScopeRecommendedAction = 'approve_free' | 'price_as_change_order' | 'negotiate' | 'decline';

export interface ScopeAnalysis {
  // Scope Creep Verdict - the main determination
  verdict: ScopeVerdict;
  verdictReasoning: string;

  // Contract alignment analysis
  contractAlignment: {
    matchingDeliverables: string[];  // Which original deliverables cover this
    conflictingClauses: string[];    // Clauses that suggest this is excluded
    grayAreas: string[];             // Ambiguous aspects
  };

  // Detailed change breakdown
  changes: ScopeChange[];

  // Impact assessment
  overallSeverity: 'minor' | 'moderate' | 'significant' | 'major';
  effortMultiplier: number; // 1.0 - 3.0
  isOutOfScope: boolean;

  // AI's recommended action for the freelancer
  recommendedAction: ScopeRecommendedAction;

  // Legacy fields for backwards compatibility
  summary?: {
    totalChanges: number;
    additions: number;
    modifications: number;
    expansions: number;
    clarifications: number;
    reductions: number;
  };
  overallAssessment?: {
    severity: 'minor' | 'moderate' | 'significant' | 'major';
    effortMultiplier: number;
    recommendation: 'proceed' | 'proceed_with_caution' | 'requires_renegotiation' | 'separate_project';
  };
  ambiguities?: string[];
}

// ============================================================================
// Market Research Types
// ============================================================================

export interface RateRange {
  min: number;
  max: number;
  source?: string;
  credibility: number; // 1-5
  dateOfData?: string;
}

export interface MarketResearchResult {
  summary: {
    location: string;
    industry: string;
    researchDate: string;
    confidence: 'high' | 'medium' | 'low';
  };
  laborRates: {
    [skillName: string]: {
      lowRate: number;
      medianRate: number;
      highRate: number;
      rateUnit: 'hourly' | 'daily' | 'weekly';
      sources: RateRange[];
      recommendedRate: number;
      rationale: string;
    };
  };
  materials?: {
    [itemName: string]: {
      unitCost: number;
      unit: string;
      volatility: 'stable' | 'moderate' | 'volatile';
    };
  };
  industryBenchmarks: {
    scopeChangeMarkup: {
      range: string;
      recommended: number;
    };
    overheadPercentage: {
      range: string;
      recommended: number;
    };
  };
  regionalFactors: {
    locationMultiplier: number;
    costIndex: number;
    baseLocation: string;
  };
  dataGaps: string[];
  pricingApproach: 'conservative' | 'market' | 'aggressive';
}

// ============================================================================
// Pricing Calculator Types
// ============================================================================

export interface PricingBreakdown {
  directCosts: {
    labor: number;
    materials: number;
    equipment: number;
    subcontractors: number;
    subtotal: number;
  };
  indirectCosts: {
    pmOverhead: number;
    adminOverhead: number;
    scheduleImpact: number;
    subtotal: number;
  };
  adjustments: {
    riskPremiumPct: number;
    riskPremiumAmt: number;
    scopePremiumPct: number;
    scopePremiumAmt: number;
    locationMultiplier: number;
    locationAdjustment: number;
  };
  laborDetails: {
    [role: string]: {
      hours: number;
      rate: number;
      subtotal: number;
    };
  };
}

export interface PricingResult {
  summary: {
    recommendedPrice: number;
    priceRange: {
      low: number;
      mid: number;
      high: number;
    };
    confidence: 'high' | 'medium' | 'low';
  };
  breakdown: PricingBreakdown;
  assumptions: string[];
  warnings: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedHours: number;
  hourlyRate: number;
}

// ============================================================================
// Verification Types
// ============================================================================

export interface VerificationResult {
  summary: {
    overallStatus: 'passed' | 'passed_with_warnings' | 'failed';
    confidenceScore: number; // 0-100
    reviewDate: string;
  };
  mathematicalVerification: {
    status: 'pass' | 'fail';
    discrepancies: string[];
  };
  rateVerification: {
    status: 'pass' | 'warn' | 'fail';
    ratesReviewed: number;
    withinRange: number;
    flaggedRates: string[];
  };
  priceLeakDetection: {
    status: 'pass' | 'warn';
    potentialLeaks: string[];
    estimatedMissingAmount: number;
    recommendation: string;
  };
  consistencyChecks: {
    status: 'pass' | 'warn' | 'fail';
    inconsistencies: string[];
    alignmentWithContract: 'good' | 'acceptable' | 'poor';
  };
  reasonablenessTests: {
    status: 'pass' | 'warn' | 'fail';
    redFlags: string[];
    proportionalityCheck: 'pass' | 'fail';
    boundViolations: string[];
  };
  marketAlignment: {
    status: 'pass' | 'warn' | 'fail';
    deviationFromMarket: string;
    concerns: string[];
  };
  defensibility: {
    score: number; // 0-100
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  finalRecommendations: {
    priceAdjustment: number;
    adjustmentReason?: string;
    actionItems: string[];
    approvedForClient: boolean;
  };
}

// ============================================================================
// Orchestrator Types
// ============================================================================

export interface PricingContext {
  freelancer: {
    location?: string;
    specializations?: string[];
    hourlyRate?: number;
    positioning?: string;
    industry?: string;
    overhead?: number;
    profitMargin?: number;
    tier?: number;
    projectsCompleted?: number;
  };
  project: {
    originalContractPrice?: number;
    projectType?: string;
    clientLocation?: string;
    projectTimeline?: string;
    deliverables?: string[];
    currency?: string;
  };
  request: {
    description: string;
    clarificationAnswers?: Record<string, string>;
    urgency?: 'normal' | 'urgent' | 'rush';
  };
  contextNotes?: string[];
}

export interface PriceCorrection {
  requestText: string;
  aiPrice: number;
  correctedPrice: number;
  reason?: string;
}

export interface OrchestratorInput {
  requestText: string;
  clarificationAnswers?: Record<string, string>;
  rules: ProjectRules;
  user: User;
  contextNotes?: ContextNote[];
  pastCorrections?: PriceCorrection[]; // Learn from freelancer's past price changes
}

export interface OrchestratorResult {
  verdict: 'in_scope' | 'out_of_scope' | 'needs_clarification' | 'pending_review';
  reasoning: string;
  scopeSummary: string;
  relevantRules: string[];

  // Clarification
  clarificationQuestions?: ClarificationQuestion[];
  clarificationAnswers?: Record<string, string>;

  // Pricing
  estimatedHours?: number;
  suggestedPrice?: number;
  priceRange?: { min: number; max: number };
  complexity?: 'simple' | 'moderate' | 'complex';
  confidence: number;

  // Detailed breakdown
  priceBreakdown?: PricingBreakdown;
  scopeAnalysis?: ScopeAnalysis;
  marketResearch?: MarketResearchResult;
  verification?: VerificationResult;

  // Transparency
  pricingContextUsed?: PricingContext;
  marketResearchSummary?: string;
  pricingReasoning?: string;
  improvementTips?: string[];

  // Profit leak detection
  profitLeaks?: {
    identified: string[];
    bufferAdded: number;
    bufferReason: string;
  };
}
