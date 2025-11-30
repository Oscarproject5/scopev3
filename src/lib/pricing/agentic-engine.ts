/**
 * Agentic Pricing Engine - Market Research Based Pricing
 *
 * Replaces Tier 1 template-based pricing with:
 * - Live market research via web search
 * - Freelancer context (location, specializations, positioning)
 * - Transparent reasoning the freelancer can review
 * - Context visibility so freelancers know what data is being used
 */

import OpenAI from 'openai';
import type { User, ProjectRules, ContextNote } from '@/lib/db/schema';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Types
// ============================================================================

export interface PricingContext {
  // Freelancer context
  freelancer: {
    location?: string;
    specializations?: string[];
    hourlyRate?: number;
    positioning?: string; // budget, mid-market, premium
    industry?: string;
    overhead?: number;
    profitMargin?: number;
    tier?: number;
    projectsCompleted?: number;
  };

  // Project context
  project: {
    originalContractPrice?: number;
    projectType?: string;
    clientLocation?: string;
    projectTimeline?: string;
    deliverables?: string[];
    currency?: string;
  };

  // Request context
  request: {
    description: string;
    clarificationAnswers?: Record<string, string>;
    urgency?: 'normal' | 'urgent' | 'rush';
  };

  // Additional context notes
  contextNotes?: string[];
}

export interface MarketResearchResult {
  searchQueries: string[];
  rateRanges: Array<{
    min: number;
    max: number;
    source?: string;
  }>;
  marketInsights: string[];
  scopeChangeTypicalPricing?: {
    min: number;
    max: number;
    description: string;
  };
  searchedAt: string;
  success: boolean;
}

export interface AgenticPriceBreakdown {
  // Core pricing
  estimatedHours: number;
  hourlyRate: number;
  laborCost: number;

  // Markups
  overhead: {
    percentage: number;
    amount: number;
  };
  profit: {
    percentage: number;
    amount: number;
  };

  // Subtotal
  baseSubtotal: number;

  // Market-informed adjustments
  marketAdjustment: {
    factor: number; // multiplier (e.g., 1.0 = no change, 1.2 = 20% increase)
    reasoning: string;
  };

  // Safety buffer (reduced from old system, market research provides more accuracy)
  safetyBuffer: {
    percentage: number;
    amount: number;
    reasoning: string;
  };

  // Final price
  recommendedPrice: number;
  priceRange: {
    min: number;
    max: number;
  };

  // Metadata
  confidence: number;
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface AgenticPricingResult {
  breakdown: AgenticPriceBreakdown;
  reasoning: string; // Educational, transparent explanation
  scopeSummary: string; // Simple description of what's being done (no pricing details)
  marketResearchSummary: string;
  contextUsed: PricingContext;
  improvementTips: string[]; // Tips to improve accuracy
  isOutOfScope: boolean;
  rulesApplied: string[];
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Gather all pricing context from user profile and project rules
 */
export function gatherPricingContext(
  user: User,
  rules: ProjectRules,
  contextNotes: ContextNote[] = [],
  requestText: string,
  clarificationAnswers?: Record<string, string>
): PricingContext {
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

/**
 * Perform market research via web search to find current market rates
 */
export async function performMarketResearch(params: {
  skills: string[];
  location?: string;
  projectType?: string;
  requestDescription: string;
  positioning?: string;
}): Promise<MarketResearchResult> {
  const { skills, location, projectType, requestDescription, positioning } = params;
  const searchQueries: string[] = [];
  const rateRanges: Array<{ min: number; max: number; source?: string }> = [];
  const marketInsights: string[] = [];

  try {
    // Build search queries based on available context
    if (skills.length > 0 && location) {
      searchQueries.push(`${skills.slice(0, 3).join(' ')} freelance rates ${location} 2024 2025`);
    }
    if (skills.length > 0) {
      searchQueries.push(`${skills[0]} freelancer hourly rate market rate`);
    }
    if (projectType) {
      searchQueries.push(`${projectType} pricing freelance scope change additional work`);
    }
    searchQueries.push('scope creep pricing strategy freelancer change request');

    // Use LLM to synthesize market research without actual web search
    // In production, this would integrate with a real search API
    const marketAnalysis = await synthesizeMarketResearch({
      skills,
      location,
      projectType,
      requestDescription,
      positioning,
      searchQueries,
    });

    return {
      searchQueries,
      rateRanges: marketAnalysis.rateRanges,
      marketInsights: marketAnalysis.insights,
      scopeChangeTypicalPricing: marketAnalysis.scopeChangeTypicalPricing,
      searchedAt: new Date().toISOString(),
      success: true,
    };
  } catch (error) {
    console.error('Market research error:', error);
    // Return fallback data
    return {
      searchQueries,
      rateRanges: [],
      marketInsights: ['Unable to perform live market research. Using conservative estimates.'],
      searchedAt: new Date().toISOString(),
      success: false,
    };
  }
}

/**
 * Perform real web search using OpenAI's web search capability
 */
async function performWebSearch(query: string): Promise<string> {
  try {
    // Use GPT 5.1 with web search tool
    const response = await openai.chat.completions.create({
      model: 'gpt-5.1',
      web_search_options: {
        search_context_size: 'medium',
      },
      messages: [
        {
          role: 'user',
          content: query,
        },
      ],
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Web search error:', error);
    // Fallback to regular GPT if search not available
    return '';
  }
}

/**
 * Synthesize market research using REAL web search + LLM analysis
 */
async function synthesizeMarketResearch(params: {
  skills: string[];
  location?: string;
  projectType?: string;
  requestDescription: string;
  positioning?: string;
  searchQueries: string[];
}): Promise<{
  rateRanges: Array<{ min: number; max: number; source?: string }>;
  insights: string[];
  scopeChangeTypicalPricing?: { min: number; max: number; description: string };
  pricingModel?: 'hourly' | 'per_unit' | 'fixed';
  unitType?: string; // e.g., "per linear foot", "per square foot", "per page"
  unitRate?: { min: number; max: number };
}> {
  // Step 1: Perform real web search for market rates
  const searchQuery = `${params.requestDescription.slice(0, 100)} pricing cost rates 2024 2025 ${params.location || 'USA'}`;
  const webSearchResult = await performWebSearch(searchQuery);

  const systemPrompt = `You are a pricing research expert who finds REAL market rates for services.

IMPORTANT: Many services are NOT priced hourly. Common pricing models include:
- Per linear foot (fencing, gutters, trim work)
- Per square foot (flooring, painting, roofing, demolition)
- Per unit (per page, per word, per item)
- Fixed price (per project)
- Hourly (consulting, design, development)

Your job is to:
1. Identify the correct pricing MODEL for this type of work
2. Find realistic market rates from the web search results
3. Calculate the total estimated cost based on quantities mentioned

Always respond in valid JSON format.`;

  const userPrompt = `Based on this web search result and request, provide accurate market pricing:

## Web Search Results:
${webSearchResult || 'No web search results available - use your knowledge of 2024 market rates'}

## Request to Price:
"${params.requestDescription}"

## Context:
- Location: ${params.location || 'USA average'}
- Project Type: ${params.projectType || 'Not specified'}

## Your Task:
1. Identify what type of work this is
2. Determine the correct pricing model (hourly, per foot, per sq ft, fixed, etc.)
3. Find/estimate realistic market rates
4. If quantities are mentioned (e.g., "300 feet"), calculate the total

Respond with this JSON:
{
  "pricingModel": "hourly" | "per_unit" | "fixed",
  "unitType": "per linear foot" | "per square foot" | "per hour" | "per project" | etc,
  "unitRate": {
    "min": number (cost per unit low end),
    "max": number (cost per unit high end)
  },
  "quantity": number or null (if mentioned in request),
  "rateRanges": [
    {"min": number, "max": number, "source": "where this rate comes from"}
  ],
  "insights": [
    "Key insight about pricing for this type of work"
  ],
  "scopeChangeTypicalPricing": {
    "min": number (total job cost low estimate),
    "max": number (total job cost high estimate),
    "description": "How this total was calculated"
  }
}

Be accurate and use real market data. For example:
- Fence removal: $3-7 per linear foot
- Painting: $2-6 per square foot
- Web development: $50-200 per hour`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('Market synthesis error:', error);
    return {
      rateRanges: [{ min: 50, max: 150, source: 'General freelance market rates' }],
      insights: ['Using general market estimates due to limited context.'],
    };
  }
}

/**
 * Main agentic pricing analysis function
 * Synthesizes context + market research to generate transparent pricing
 */
export async function analyzeAndPrice(params: {
  requestText: string;
  clarificationAnswers: Record<string, string>;
  pricingContext: PricingContext;
  marketResearch: MarketResearchResult;
  rules: ProjectRules;
}): Promise<AgenticPricingResult> {
  const { requestText, clarificationAnswers, pricingContext, marketResearch, rules } = params;

  const systemPrompt = `You are an expert freelance pricing consultant. Your job is to analyze a scope change request and provide transparent, well-reasoned pricing.

You use multiple pricing lenses:
1. **Cost-based**: Labor + overhead + profit margin
2. **Value-based**: What is this worth to the client?
3. **Market-based**: What do similar services cost in the market?

Your pricing should:
- Be FAIR to both freelancer and client
- Account for hidden complexity and unknowns
- Be TRANSPARENT with clear reasoning
- Consider the freelancer's market positioning

Always respond in valid JSON format.`;

  // Format all context for the LLM
  const contextSummary = formatContextForLLM(pricingContext);
  const marketSummary = formatMarketResearchForLLM(marketResearch);
  const rulesSummary = formatRulesForPricing(rules);

  const answersText = Object.entries(clarificationAnswers)
    .map(([q, a]) => `Q: ${q}\nA: ${a}`)
    .join('\n\n');

  const userPrompt = `## Pricing Context
${contextSummary}

## Market Research
${marketSummary}

## Project Rules
${rulesSummary}

## Client Request
"${requestText}"

## Clarification Answers
${answersText || 'No clarification answers provided'}

## Your Task
Analyze this request and provide comprehensive pricing. Consider:
1. Is this truly out of scope based on the rules?
2. What rules apply to this decision?
3. Estimate hours conservatively (account for unknowns)
4. Apply market-informed pricing
5. Provide transparent reasoning

Respond with this JSON structure:
{
  "isOutOfScope": boolean,
  "rulesApplied": ["Rule 1", "Rule 2"],
  "scopeSummary": "A detailed description of the work being requested, incorporating the client's answers to clarification questions. Format as bullet points listing specific deliverables and requirements. Include details from their answers like quantities, specifications, timeline preferences, etc. NO pricing details, NO hours, NO calculations. Example:\n• Add dark mode toggle to settings page\n• Support automatic switching based on system preferences\n• Apply dark theme to all existing components including navigation, forms, and cards\n• Timeline: Within 1 week as specified",
  "breakdown": {
    "estimatedHours": number,
    "hourlyRate": number (use freelancer's rate or market rate),
    "laborCost": number,
    "overhead": {
      "percentage": number (0.0-1.0),
      "amount": number
    },
    "profit": {
      "percentage": number (0.0-1.0),
      "amount": number
    },
    "baseSubtotal": number,
    "marketAdjustment": {
      "factor": number (1.0 = no adjustment),
      "reasoning": "Why this adjustment was applied"
    },
    "safetyBuffer": {
      "percentage": number (0.0-1.0),
      "amount": number,
      "reasoning": "Why this buffer percentage was chosen"
    },
    "recommendedPrice": number,
    "priceRange": {
      "min": number,
      "max": number
    },
    "confidence": number (0.0-1.0),
    "complexity": "simple" | "moderate" | "complex"
  },
  "reasoning": "Educational explanation of how the price was calculated, written for the freelancer to understand and learn from",
  "marketResearchSummary": "Summary of market research findings relevant to this pricing",
  "improvementTips": [
    "Tip to help freelancer get more accurate pricing in the future"
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const result = JSON.parse(content);

    // Check if market research provided unit-based pricing (per foot, per sq ft, etc.)
    const hasUnitPricing = marketResearch.scopeChangeTypicalPricing &&
      marketResearch.scopeChangeTypicalPricing.min > 0;

    let recommendedPrice: number;
    let priceRange: { min: number; max: number };
    let laborCost: number;
    let estimatedHours: number;
    let hourlyRate: number;
    let marketReasoning: string;

    if (hasUnitPricing) {
      // USE MARKET-BASED PRICING (per foot, per sq ft, etc.)
      const marketMin = marketResearch.scopeChangeTypicalPricing!.min;
      const marketMax = marketResearch.scopeChangeTypicalPricing!.max;

      // Use midpoint of market research as recommended price
      recommendedPrice = Math.round((marketMin + marketMax) / 2);
      priceRange = {
        min: Math.round(marketMin),
        max: Math.round(marketMax),
      };

      // Back-calculate hours for display purposes (rough estimate)
      const freelancerHourlyRate = pricingContext.freelancer.hourlyRate ||
        (rules.hourlyRate ? parseFloat(rules.hourlyRate.toString()) : 100);
      hourlyRate = freelancerHourlyRate;
      estimatedHours = Math.round((recommendedPrice / freelancerHourlyRate) * 10) / 10;
      laborCost = recommendedPrice * 0.7; // Rough estimate: 70% is labor

      marketReasoning = marketResearch.scopeChangeTypicalPricing!.description ||
        'Price based on current market rates for this type of work';
    } else {
      // FALLBACK TO HOURLY-BASED PRICING
      const freelancerHourlyRate = pricingContext.freelancer.hourlyRate ||
        (rules.hourlyRate ? parseFloat(rules.hourlyRate.toString()) : 100);
      hourlyRate = freelancerHourlyRate;

      // Get AI's estimated hours (with sanity check)
      estimatedHours = result.breakdown?.estimatedHours || 4;
      estimatedHours = Math.min(estimatedHours, 40);
      estimatedHours = Math.max(estimatedHours, 0.5);

      // Calculate pricing based on FREELANCER'S rate
      laborCost = estimatedHours * freelancerHourlyRate;
      const overheadPct = pricingContext.freelancer.overhead || 0.2;
      const profitPct = pricingContext.freelancer.profitMargin || 0.15;
      const overheadAmount = laborCost * overheadPct;
      const profitAmount = (laborCost + overheadAmount) * profitPct;
      const baseSubtotal = laborCost + overheadAmount + profitAmount;

      // Safety buffer based on complexity (max 30%)
      const complexity = result.breakdown?.complexity || 'moderate';
      const bufferPct = complexity === 'simple' ? 0.10 : complexity === 'moderate' ? 0.20 : 0.30;
      const bufferAmount = baseSubtotal * bufferPct;

      recommendedPrice = baseSubtotal + bufferAmount;
      priceRange = {
        min: Math.round(recommendedPrice * 0.85),
        max: Math.round(recommendedPrice * 1.25),
      };

      marketReasoning = `Based on ${estimatedHours} hours at $${freelancerHourlyRate}/hr with overhead and buffer`;
    }

    const overheadPct = pricingContext.freelancer.overhead || 0.2;
    const profitPct = pricingContext.freelancer.profitMargin || 0.15;
    const complexity = result.breakdown?.complexity || 'moderate';
    const bufferPct = complexity === 'simple' ? 0.10 : complexity === 'moderate' ? 0.20 : 0.30;

    // Ensure all required fields are present with MARKET-INFORMED values
    return {
      breakdown: {
        estimatedHours,
        hourlyRate,
        laborCost,
        overhead: { percentage: overheadPct, amount: laborCost * overheadPct },
        profit: { percentage: profitPct, amount: laborCost * profitPct },
        baseSubtotal: laborCost * (1 + overheadPct + profitPct),
        marketAdjustment: {
          factor: 1.0,
          reasoning: marketReasoning,
        },
        safetyBuffer: {
          percentage: bufferPct,
          amount: recommendedPrice * bufferPct,
          reasoning: result.breakdown?.safetyBuffer?.reasoning || `${complexity} complexity buffer included in market rate`,
        },
        recommendedPrice: Math.round(recommendedPrice * 100) / 100,
        priceRange,
        confidence: result.breakdown?.confidence || 0.75,
        complexity,
      },
      reasoning: result.reasoning || marketReasoning,
      scopeSummary: result.scopeSummary || requestText,
      marketResearchSummary: marketResearch.marketInsights?.join('. ') ||
        result.marketResearchSummary ||
        'Price based on current market rates.',
      contextUsed: pricingContext,
      improvementTips: result.improvementTips || [],
      isOutOfScope: result.isOutOfScope ?? true,
      rulesApplied: result.rulesApplied || [],
    };
  } catch (error) {
    console.error('Agentic pricing error:', error);
    // Fallback to simple calculation
    return createFallbackPricing(pricingContext, requestText);
  }
}

/**
 * Main entry point for agentic pricing
 */
export async function calculateAgenticPrice(params: {
  requestText: string;
  clarificationAnswers: Record<string, string>;
  user: User;
  rules: ProjectRules;
  contextNotes?: ContextNote[];
}): Promise<AgenticPricingResult> {
  const { requestText, clarificationAnswers, user, rules, contextNotes = [] } = params;

  // Step 1: Gather all pricing context
  const pricingContext = gatherPricingContext(
    user,
    rules,
    contextNotes,
    requestText,
    clarificationAnswers
  );

  // Step 2: Perform market research
  const marketResearch = await performMarketResearch({
    skills: pricingContext.freelancer.specializations || [],
    location: pricingContext.freelancer.location,
    projectType: pricingContext.project.projectType,
    requestDescription: requestText,
    positioning: pricingContext.freelancer.positioning,
  });

  // Step 3: Analyze and price
  const result = await analyzeAndPrice({
    requestText,
    clarificationAnswers,
    pricingContext,
    marketResearch,
    rules,
  });

  return result;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatContextForLLM(context: PricingContext): string {
  const sections: string[] = [];

  // Freelancer context
  const freelancer = context.freelancer;
  sections.push('### Freelancer Profile');
  if (freelancer.location) sections.push(`- Location: ${freelancer.location}`);
  if (freelancer.specializations?.length) {
    sections.push(`- Specializations: ${freelancer.specializations.join(', ')}`);
  }
  if (freelancer.hourlyRate) sections.push(`- Hourly Rate: $${freelancer.hourlyRate}/hr`);
  if (freelancer.positioning) {
    sections.push(`- Market Positioning: ${freelancer.positioning}`);
  }
  if (freelancer.industry) sections.push(`- Industry: ${freelancer.industry}`);
  sections.push(`- Overhead: ${((freelancer.overhead || 0.2) * 100).toFixed(0)}%`);
  sections.push(`- Profit Margin: ${((freelancer.profitMargin || 0.15) * 100).toFixed(0)}%`);
  sections.push(`- Tier: ${freelancer.tier || 1}`);
  sections.push(`- Projects Completed: ${freelancer.projectsCompleted || 0}`);

  // Project context
  const project = context.project;
  sections.push('\n### Project Context');
  if (project.originalContractPrice) {
    sections.push(`- Original Contract Price: $${project.originalContractPrice}`);
  }
  if (project.projectType) sections.push(`- Project Type: ${project.projectType}`);
  if (project.clientLocation) sections.push(`- Client Location: ${project.clientLocation}`);
  if (project.projectTimeline) sections.push(`- Timeline: ${project.projectTimeline}`);
  if (project.deliverables?.length) {
    sections.push(`- Deliverables: ${project.deliverables.join(', ')}`);
  }
  sections.push(`- Currency: ${project.currency || 'USD'}`);

  // Context notes
  if (context.contextNotes?.length) {
    sections.push('\n### Additional Context Notes');
    context.contextNotes.forEach((note) => sections.push(`- ${note}`));
  }

  return sections.join('\n');
}

function formatMarketResearchForLLM(research: MarketResearchResult): string {
  const sections: string[] = [];

  if (research.rateRanges.length > 0) {
    sections.push('### Market Rate Ranges');
    research.rateRanges.forEach((range) => {
      sections.push(`- $${range.min} - $${range.max}/hr ${range.source ? `(${range.source})` : ''}`);
    });
  }

  if (research.marketInsights.length > 0) {
    sections.push('\n### Market Insights');
    research.marketInsights.forEach((insight) => sections.push(`- ${insight}`));
  }

  if (research.scopeChangeTypicalPricing) {
    sections.push('\n### Typical Scope Change Pricing');
    sections.push(
      `- Range: $${research.scopeChangeTypicalPricing.min} - $${research.scopeChangeTypicalPricing.max}`
    );
    sections.push(`- Context: ${research.scopeChangeTypicalPricing.description}`);
  }

  if (!research.success) {
    sections.push('\n*Note: Live market research unavailable. Using conservative estimates.*');
  }

  return sections.join('\n') || 'No market research data available.';
}

function formatRulesForPricing(rules: ProjectRules): string {
  const sections: string[] = [];

  if (rules.hourlyRate) {
    sections.push(`- Hourly Rate: ${rules.currency || 'USD'} ${rules.hourlyRate}/hr`);
  }
  if (rules.deliverables && (rules.deliverables as string[]).length > 0) {
    sections.push(`- Included Deliverables: ${(rules.deliverables as string[]).join(', ')}`);
  }
  if (rules.revisionsIncluded !== null && rules.revisionsIncluded !== undefined) {
    const remaining = rules.revisionsIncluded - (rules.revisionsUsed || 0);
    sections.push(`- Revisions: ${remaining} of ${rules.revisionsIncluded} remaining`);
  }
  if (rules.customRules && (rules.customRules as any[]).length > 0) {
    sections.push('- Custom Rules:');
    (rules.customRules as { rule: string; description: string }[]).forEach((r) => {
      sections.push(`  - ${r.rule}: ${r.description}`);
    });
  }
  if (rules.rulesSummary) {
    sections.push(`- Rules Summary: ${rules.rulesSummary}`);
  }

  return sections.join('\n') || 'No specific rules defined.';
}

function createFallbackPricing(
  context: PricingContext,
  requestText: string
): AgenticPricingResult {
  const hourlyRate = context.freelancer.hourlyRate || 100;
  const estimatedHours = 4; // Conservative default
  const laborCost = estimatedHours * hourlyRate;
  const overhead = laborCost * (context.freelancer.overhead || 0.2);
  const profitAmount = (laborCost + overhead) * (context.freelancer.profitMargin || 0.15);
  const baseSubtotal = laborCost + overhead + profitAmount;
  const bufferAmount = baseSubtotal * 0.25; // 25% safety buffer
  const recommendedPrice = baseSubtotal + bufferAmount;

  return {
    breakdown: {
      estimatedHours,
      hourlyRate,
      laborCost,
      overhead: {
        percentage: context.freelancer.overhead || 0.2,
        amount: overhead,
      },
      profit: {
        percentage: context.freelancer.profitMargin || 0.15,
        amount: profitAmount,
      },
      baseSubtotal,
      marketAdjustment: {
        factor: 1.0,
        reasoning: 'Fallback pricing - no market adjustment applied',
      },
      safetyBuffer: {
        percentage: 0.25,
        amount: bufferAmount,
        reasoning: 'Conservative buffer applied due to pricing system fallback',
      },
      recommendedPrice,
      priceRange: {
        min: recommendedPrice * 0.85,
        max: recommendedPrice * 1.2,
      },
      confidence: 0.5,
      complexity: 'moderate',
    },
    reasoning:
      'Unable to perform full agentic analysis. Using conservative hourly-based pricing with 25% safety buffer.',
    scopeSummary: requestText,
    marketResearchSummary: 'Market research unavailable. Using fallback estimates.',
    contextUsed: context,
    improvementTips: [
      'Add your location for market-specific pricing',
      'Add your specializations for skill-based rate research',
      'Set the original contract price for scope-relative pricing',
    ],
    isOutOfScope: true,
    rulesApplied: [],
  };
}
