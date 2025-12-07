/**
 * Scope Creep Pricing Engine - Multi-Agent Orchestrator
 *
 * Uses Claude Agent SDK to coordinate specialized agents:
 * 1. Clarification Agent - Identifies gaps, generates questions
 * 2. Scope Analyzer - Detects and classifies scope changes
 * 3. Market Researcher - Gathers real-time pricing data via web search
 * 4. Pricing Calculator - Computes defensible pricing
 * 5. Verification Agent - Validates and cross-checks pricing
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ProjectRules, ContextNote, User } from '@/lib/db/schema';
import type {
  ClarificationQuestion,
  ClarificationResult,
  ScopeAnalysis,
  MarketResearchResult,
  PricingResult,
  VerificationResult,
  PricingContext,
  OrchestratorInput,
  OrchestratorResult,
} from './types';

// ============================================================================
// Agent System Prompts
// ============================================================================

const CLARIFICATION_AGENT_PROMPT = `You are a specialized clarification agent for scope creep pricing. Your job is to identify gaps in the CLIENT'S REQUEST and generate targeted questions to help price their change request.

## CRITICAL: Use Existing Project Context
The freelancer has ALREADY set up their project with:
- Project deliverables (original scope)
- Hourly rates and pricing rules
- Contract context and rules summary
- Additional context notes

DO NOT ask questions about information already provided in the Project Rules or Additional Context sections below. The client should NOT be asked about the freelancer's original contract terms - that's already known.

## What to Ask the CLIENT About
Only ask questions to clarify the CLIENT'S NEW REQUEST:
1. Scope/extent of their change request - What exactly do they need?
2. Technical requirements - Any specific requirements or constraints?
3. Timeline/urgency - When do they need this done?
4. Dependencies - Does this relate to specific parts of the existing work?

## Question Design Principles
1. Be specific - Ask for exactly what you need to understand THEIR request
2. Provide options - Give examples when helpful
3. Limit to 3-4 questions maximum
4. Focus on what impacts pricing of THIS REQUEST
5. NEVER ask about the original scope/contract - that's already provided by the freelancer

Respond with JSON:
{
  "questions": [
    {
      "id": "q1",
      "question": "The question text",
      "helpText": "Optional help text",
      "type": "text" | "select",
      "options": ["opt1", "opt2"] // only if type is select
    }
  ],
  "assumptions": ["Any assumptions you're making"],
  "canProceed": true/false
}`;

const SCOPE_ANALYZER_PROMPT = `You are a scope change detection agent. Analyze the delta between original scope and new request.

## Classification Types
- ADDITION: Completely new work not in original scope
- MODIFICATION: Change to existing requirement
- EXPANSION: More of the same type of work (e.g., 10 pages instead of 5)
- CLARIFICATION: Ambiguous requirement now specified
- REDUCTION: Removal of original scope

## Impact Assessment
Direct Impact (1-5): How much direct work
Ripple Effect (1-5): How much it affects other work
Risk Level: Low/Medium/High

Respond with JSON:
{
  "changes": [
    {
      "id": "SC-001",
      "description": "Description",
      "classification": "ADDITION|MODIFICATION|EXPANSION|CLARIFICATION|REDUCTION",
      "directImpact": 1-5,
      "rippleEffect": 1-5,
      "riskLevel": "low|medium|high"
    }
  ],
  "overallSeverity": "minor|moderate|significant|major",
  "effortMultiplier": 1.0-3.0,
  "isOutOfScope": true/false
}`;

const MARKET_RESEARCHER_PROMPT = `You are a market research agent. Gather current pricing data for scope creep analysis.

Use web search to find:
1. Labor rates for specific skills in the project location
2. Industry standard markups for scope changes (typically 10-25%)
3. Regional cost multipliers
4. Similar project pricing benchmarks

Search strategies:
- "[skill] hourly rate [location] 2024 2025"
- "[trade] contractor rates [region]"
- "scope change markup [industry] standard"

Respond with JSON:
{
  "laborRates": {
    "primarySkill": {
      "medianRate": number,
      "range": { "min": number, "max": number },
      "source": "description of source"
    }
  },
  "scopeChangeMarkup": {
    "industryStandard": "15-25%",
    "recommended": 20
  },
  "locationMultiplier": 1.0,
  "marketInsights": ["insight1", "insight2"],
  "confidence": "high|medium|low"
}`;

const PRICING_CALCULATOR_PROMPT = `You are a pricing calculator agent. Compute accurate, defensible scope creep pricing.

## Core Formula
TOTAL = (Direct Costs + Indirect Costs) × (1 + Risk Premium) × (1 + Scope Change Premium) × Location Multiplier

## Pricing Components
- Direct Labor: Hours × Hourly Rate
- Overhead: 15-25% of direct costs
- Profit Margin: 10-20%
- Risk Premium: 5-20% based on complexity
- Scope Change Premium: 10-25% for disruption

## Output Requirements
- Provide a recommended price AND a range (min/max)
- Be conservative - better to slightly overestimate
- Include all assumptions

Respond with JSON:
{
  "recommendedPrice": number,
  "priceRange": { "min": number, "max": number },
  "estimatedHours": number,
  "hourlyRate": number,
  "complexity": "simple|moderate|complex",
  "breakdown": {
    "laborCost": number,
    "overhead": number,
    "profit": number,
    "riskPremium": number,
    "scopePremium": number
  },
  "confidence": 0-1,
  "reasoning": "Brief explanation"
}`;

const VERIFICATION_PROMPT = `You are a verification agent. Validate pricing for accuracy and defensibility.

## Verification Checks
1. Mathematical accuracy - calculations sum correctly
2. Rate verification - within market range (±20%)
3. Price leak detection - check for missing costs
4. Reasonableness - proportional to scope change
5. Defensibility - can be justified to client

Respond with JSON:
{
  "overallStatus": "passed|passed_with_warnings|failed",
  "confidenceScore": 0-100,
  "issues": ["list of any issues found"],
  "recommendations": ["recommendations"],
  "approvedForClient": true/false,
  "adjustmentNeeded": number // 0 if none
}`;

// ============================================================================
// Helper Functions
// ============================================================================

function gatherContext(
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

function formatContextForPrompt(context: PricingContext, rules: ProjectRules): string {
  const sections: string[] = [];

  // Freelancer context
  sections.push('## Freelancer Profile');
  if (context.freelancer.location) sections.push(`- Location: ${context.freelancer.location}`);
  if (context.freelancer.specializations?.length) {
    sections.push(`- Specializations: ${context.freelancer.specializations.join(', ')}`);
  }
  if (context.freelancer.hourlyRate) sections.push(`- Hourly Rate: $${context.freelancer.hourlyRate}/hr`);
  if (context.freelancer.positioning) sections.push(`- Market Positioning: ${context.freelancer.positioning}`);
  sections.push(`- Overhead: ${((context.freelancer.overhead || 0.2) * 100).toFixed(0)}%`);
  sections.push(`- Profit Margin: ${((context.freelancer.profitMargin || 0.15) * 100).toFixed(0)}%`);

  // Project context
  sections.push('\n## Project Context');
  if (context.project.originalContractPrice) {
    sections.push(`- Original Contract Price: $${context.project.originalContractPrice}`);
  }
  if (context.project.projectType) sections.push(`- Project Type: ${context.project.projectType}`);
  if (context.project.clientLocation) sections.push(`- Client Location: ${context.project.clientLocation}`);
  if (context.project.deliverables?.length) {
    sections.push(`- Deliverables: ${context.project.deliverables.join(', ')}`);
  }

  // Project rules
  sections.push('\n## Project Rules');
  if (rules.hourlyRate) sections.push(`- Hourly Rate: ${rules.currency || 'USD'} ${rules.hourlyRate}/hr`);
  if (rules.revisionsIncluded != null) {
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

  // Context notes
  if (context.contextNotes?.length) {
    sections.push('\n## Additional Context');
    context.contextNotes.forEach((note) => sections.push(`- ${note}`));
  }

  return sections.join('\n');
}

// Initialize Anthropic client (uses ANTHROPIC_API_KEY env var automatically)
const anthropic = new Anthropic();

async function runAgent(systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let result = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        result += block.text;
      }
    }

    return result;
  } catch (error) {
    console.error('Agent execution error:', error);
    throw error;
  }
}

async function runAgentWithWebSearch(systemPrompt: string, userPrompt: string): Promise<string> {
  // Note: Web search would require implementing server-side search tools.
  // For now, this uses the same API call but instructs the model to use its training data.
  try {
    const enhancedPrompt = `${userPrompt}

Note: Use your training data knowledge of typical market rates and industry standards. Provide your best estimates based on available information.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: enhancedPrompt }],
    });

    let result = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        result += block.text;
      }
    }

    return result;
  } catch (error) {
    console.error('Agent with web search error:', error);
    throw error;
  }
}

function parseJSON<T>(text: string): T | null {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('JSON parse error:', e, 'Text:', text.slice(0, 500));
    return null;
  }
}

// ============================================================================
// Main Orchestrator Functions
// ============================================================================

/**
 * Generate clarification questions for initial request
 */
export async function generateClarificationQuestions(
  requestText: string,
  rules: ProjectRules,
  contextNotes: ContextNote[] = [],
  projectInfo?: { name: string; description?: string | null }
): Promise<ClarificationQuestion[]> {
  // Build comprehensive project context that the freelancer already provided
  const deliverablesList = rules.deliverables && (rules.deliverables as string[]).length > 0
    ? (rules.deliverables as string[]).join(', ')
    : null;

  const rulesContext = `
## EXISTING PROJECT CONTEXT (Already known - DO NOT ask about these)

### Project Overview
${projectInfo?.name ? `- Project Name: ${projectInfo.name}` : ''}
${projectInfo?.description ? `- Project Description: ${projectInfo.description}` : ''}
${rules.projectType ? `- Project Type/Industry: ${rules.projectType}` : ''}

### Original Scope & Deliverables
${deliverablesList ? `- Contracted Deliverables: ${deliverablesList}` : ''}
${rules.rulesSummary ? `- Contract Summary: ${rules.rulesSummary}` : ''}
${rules.contractText ? `- Original Contract: ${rules.contractText.substring(0, 500)}${rules.contractText.length > 500 ? '...' : ''}` : ''}

### Pricing Rules
${rules.hourlyRate ? `- Hourly Rate: $${rules.hourlyRate}/hr` : ''}
${rules.originalContractPrice ? `- Original Contract Value: $${rules.originalContractPrice}` : ''}
${rules.revisionsIncluded ? `- Revisions Included: ${rules.revisionsIncluded} (${rules.revisionsUsed || 0} used)` : ''}
${rules.currency ? `- Currency: ${rules.currency}` : ''}
`;

  const notesContext = contextNotes.length > 0
    ? contextNotes.map((n) => `- ${n.content}`).join('\n')
    : null;

  const userPrompt = `${rulesContext}
${notesContext ? `### Additional Context Notes\n${notesContext}\n` : ''}

## CLIENT'S NEW REQUEST (Need clarification on THIS)
"${requestText}"

Generate 3-4 clarifying questions to help understand and price THIS SPECIFIC REQUEST from the client.

Remember:
- The original scope/deliverables are already known (see above)
- Only ask about details of the client's NEW request
- Focus on: what exactly they want, technical specifics, timeline, and urgency`;

  try {
    const response = await runAgent(CLARIFICATION_AGENT_PROMPT, userPrompt);
    const parsed = parseJSON<{ questions: ClarificationQuestion[] }>(response);

    if (parsed?.questions) {
      return parsed.questions.map((q, i) => ({
        ...q,
        id: q.id || `q${i + 1}`,
        priority: q.priority || 1,
        category: q.category || 'other',
      }));
    }
  } catch (error) {
    console.error('Clarification agent error:', error);
  }

  // Fallback questions
  return [
    {
      id: 'q1',
      question: 'Can you describe in more detail what you need?',
      type: 'text',
      priority: 1,
      category: 'scope',
    },
    {
      id: 'q2',
      question: 'What is your timeline for this request?',
      type: 'select',
      options: ['ASAP / Urgent', 'This week', 'This month', 'Flexible / No rush'],
      priority: 2,
      category: 'timeline',
    },
    {
      id: 'q3',
      question: 'Is there anything else important about this request?',
      type: 'text',
      priority: 3,
      category: 'other',
    },
  ];
}

/**
 * Full analysis with clarification answers - multi-agent orchestration
 */
export async function analyzeRequestFull(
  input: OrchestratorInput
): Promise<OrchestratorResult> {
  const { requestText, clarificationAnswers, rules, user, contextNotes = [] } = input;

  // Gather pricing context
  const pricingContext = gatherContext(user, rules, contextNotes, requestText, clarificationAnswers);
  const contextPrompt = formatContextForPrompt(pricingContext, rules);

  // Format answers for prompts
  const answersText = clarificationAnswers
    ? Object.entries(clarificationAnswers)
        .map(([q, a]) => `Q: ${q}\nA: ${a}`)
        .join('\n\n')
    : 'No clarification answers provided';

  try {
    // =========================================================================
    // PHASE 1: Scope Analysis
    // =========================================================================
    const scopePrompt = `${contextPrompt}

## Client Request
"${requestText}"

## Clarification Answers
${answersText}

Analyze the scope change - classify it and assess impact.`;

    const scopeResponse = await runAgent(SCOPE_ANALYZER_PROMPT, scopePrompt);
    const scopeData = parseJSON<{
      changes: any[];
      overallSeverity: string;
      effortMultiplier: number;
      isOutOfScope: boolean;
    }>(scopeResponse);

    // =========================================================================
    // PHASE 2: Market Research (with web search)
    // =========================================================================
    const skills = pricingContext.freelancer.specializations || ['general'];
    const location = pricingContext.freelancer.location || pricingContext.project.clientLocation || 'USA';

    const marketPrompt = `Research current market rates for:
- Skills: ${skills.join(', ')}
- Location: ${location}
- Project Type: ${pricingContext.project.projectType || 'general'}

Request description: "${requestText}"

Search for current hourly rates and scope change markup standards.`;

    const marketResponse = await runAgentWithWebSearch(MARKET_RESEARCHER_PROMPT, marketPrompt);
    const marketData = parseJSON<{
      laborRates: any;
      scopeChangeMarkup: { recommended: number };
      locationMultiplier: number;
      marketInsights: string[];
      confidence: string;
    }>(marketResponse);

    // =========================================================================
    // PHASE 3: Pricing Calculation
    // =========================================================================
    const complexity = scopeData?.overallSeverity === 'major' ? 'complex'
      : scopeData?.overallSeverity === 'significant' ? 'complex'
      : scopeData?.overallSeverity === 'moderate' ? 'moderate'
      : 'simple';

    const freelancerRate = pricingContext.freelancer.hourlyRate ||
      (rules.hourlyRate ? parseFloat(rules.hourlyRate.toString()) : 100);

    const pricingPrompt = `${contextPrompt}

## Request
"${requestText}"

## Clarification Answers
${answersText}

## Scope Analysis
- Severity: ${scopeData?.overallSeverity || 'moderate'}
- Complexity: ${complexity}
- Effort Multiplier: ${scopeData?.effortMultiplier || 1.2}

## Market Research
- Location Multiplier: ${marketData?.locationMultiplier || 1.0}
- Scope Change Markup: ${marketData?.scopeChangeMarkup?.recommended || 15}%
- Market Insights: ${marketData?.marketInsights?.join('; ') || 'Standard market rates'}

## Freelancer's Rate
- Hourly Rate: $${freelancerRate}/hr
- Overhead: ${((pricingContext.freelancer.overhead || 0.2) * 100).toFixed(0)}%
- Profit Margin: ${((pricingContext.freelancer.profitMargin || 0.15) * 100).toFixed(0)}%

Calculate the recommended price for this scope change.`;

    const pricingResponse = await runAgent(PRICING_CALCULATOR_PROMPT, pricingPrompt);
    const pricingData = parseJSON<{
      recommendedPrice: number;
      priceRange: { min: number; max: number };
      estimatedHours: number;
      hourlyRate: number;
      complexity: 'simple' | 'moderate' | 'complex';
      breakdown: any;
      confidence: number;
      reasoning: string;
    }>(pricingResponse);

    // =========================================================================
    // PHASE 4: Verification
    // =========================================================================
    const verifyPrompt = `Verify this pricing:

## Request
"${requestText}"

## Calculated Pricing
- Recommended Price: $${pricingData?.recommendedPrice || 0}
- Price Range: $${pricingData?.priceRange?.min || 0} - $${pricingData?.priceRange?.max || 0}
- Estimated Hours: ${pricingData?.estimatedHours || 0}
- Hourly Rate: $${pricingData?.hourlyRate || freelancerRate}

## Market Data
- Location Multiplier: ${marketData?.locationMultiplier || 1.0}
- Scope Change Markup: ${marketData?.scopeChangeMarkup?.recommended || 15}%

Verify reasonableness, market alignment, and defensibility.`;

    const verifyResponse = await runAgent(VERIFICATION_PROMPT, verifyPrompt);
    const verifyData = parseJSON<{
      overallStatus: string;
      confidenceScore: number;
      issues: string[];
      recommendations: string[];
      approvedForClient: boolean;
      adjustmentNeeded: number;
    }>(verifyResponse);

    // =========================================================================
    // Build Final Result
    // =========================================================================
    const finalPrice = pricingData?.recommendedPrice
      ? pricingData.recommendedPrice + (verifyData?.adjustmentNeeded || 0)
      : freelancerRate * 4; // Fallback: 4 hours at freelancer rate

    // Generate scope summary from answers
    const scopeSummary = generateScopeSummary(requestText, clarificationAnswers);

    return {
      verdict: 'pending_review', // Freelancer always decides
      reasoning: pricingData?.reasoning || 'Request analyzed for pricing.',
      scopeSummary,
      relevantRules: scopeData?.changes?.map(c => c.description) || [],

      clarificationAnswers,

      estimatedHours: pricingData?.estimatedHours || 4,
      suggestedPrice: Math.round(finalPrice * 100) / 100,
      priceRange: pricingData?.priceRange || {
        min: Math.round(finalPrice * 0.85),
        max: Math.round(finalPrice * 1.25),
      },
      complexity: pricingData?.complexity || complexity,
      confidence: verifyData?.confidenceScore ? verifyData.confidenceScore / 100 : 0.75,

      priceBreakdown: pricingData?.breakdown ? {
        directCosts: {
          labor: pricingData.breakdown.laborCost || 0,
          materials: 0,
          equipment: 0,
          subcontractors: 0,
          subtotal: pricingData.breakdown.laborCost || 0,
        },
        indirectCosts: {
          pmOverhead: pricingData.breakdown.overhead || 0,
          adminOverhead: 0,
          scheduleImpact: 0,
          subtotal: pricingData.breakdown.overhead || 0,
        },
        adjustments: {
          riskPremiumPct: 0,
          riskPremiumAmt: pricingData.breakdown.riskPremium || 0,
          scopePremiumPct: marketData?.scopeChangeMarkup?.recommended || 15,
          scopePremiumAmt: pricingData.breakdown.scopePremium || 0,
          locationMultiplier: marketData?.locationMultiplier || 1.0,
          locationAdjustment: 0,
        },
        laborDetails: {},
      } : undefined,

      pricingContextUsed: pricingContext,
      marketResearchSummary: marketData?.marketInsights?.join('. ') || 'Standard market rates applied.',
      pricingReasoning: pricingData?.reasoning || 'Pricing based on scope analysis and market research.',
      improvementTips: verifyData?.recommendations || [],
    };
  } catch (error) {
    console.error('Orchestrator error:', error);

    // Fallback result
    const fallbackRate = pricingContext.freelancer.hourlyRate || 100;
    const fallbackHours = 4;
    const fallbackPrice = fallbackRate * fallbackHours * 1.35; // With overhead and margin

    return {
      verdict: 'pending_review',
      reasoning: 'Request submitted for review. AI analysis unavailable - please review manually.',
      scopeSummary: requestText,
      relevantRules: [],
      clarificationAnswers,
      estimatedHours: fallbackHours,
      suggestedPrice: fallbackPrice,
      priceRange: { min: fallbackPrice * 0.85, max: fallbackPrice * 1.25 },
      complexity: 'moderate',
      confidence: 0.5,
      pricingContextUsed: pricingContext,
      pricingReasoning: 'Fallback pricing - manual review recommended.',
      improvementTips: [
        'Add your location for market-specific pricing',
        'Set your specializations for accurate rate lookup',
        'Define the original contract price for proportionality checks',
      ],
    };
  }
}

function generateScopeSummary(requestText: string, answers?: Record<string, string>): string {
  if (!answers || Object.keys(answers).length === 0) {
    return requestText;
  }

  const lines = [`Based on the request: "${requestText}"\n`];
  lines.push('With the following specifications:');

  for (const [question, answer] of Object.entries(answers)) {
    lines.push(`• ${answer}`);
  }

  return lines.join('\n');
}

// ============================================================================
// Exports for API Routes
// ============================================================================

export type { OrchestratorInput, OrchestratorResult } from './types';
