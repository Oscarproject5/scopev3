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

const SCOPE_ANALYZER_PROMPT = `You are a scope change detection agent. Your primary job is to determine if the client's request is within the original contract boundaries or represents scope creep.

## Critical Task: Scope Verdict
Compare the client's NEW REQUEST against the ORIGINAL CONTRACT DELIVERABLES and determine:
- IN_SCOPE: Request is clearly covered by the original contract
- OUT_OF_SCOPE: Request is beyond the original contract boundaries (scope creep)
- BOUNDARY_CASE: Request is ambiguous - could be argued either way
- CLARIFICATION_ONLY: Request is just clarifying how to deliver existing scope

## Classification Types for Changes
- ADDITION: Completely new work not in original scope (usually OUT_OF_SCOPE)
- MODIFICATION: Change to existing requirement (depends on magnitude)
- EXPANSION: More of the same type of work (e.g., 10 pages instead of 5) (usually OUT_OF_SCOPE)
- CLARIFICATION: Ambiguous requirement now specified (usually IN_SCOPE)
- REDUCTION: Removal of original scope (IN_SCOPE - no extra charge)

## Scope Analysis Framework
1. Review original contract deliverables
2. Identify what the client is requesting
3. Check if it's explicitly included in deliverables
4. Check if it's explicitly excluded
5. Assess if it's a reasonable interpretation of existing scope
6. Consider industry standards for what's "included"

## Impact Assessment
Direct Impact (1-5): How much direct work
Ripple Effect (1-5): How much it affects other work
Risk Level: Low/Medium/High

Respond with JSON:
{
  "verdict": "IN_SCOPE|OUT_OF_SCOPE|BOUNDARY_CASE|CLARIFICATION_ONLY",
  "verdictReasoning": "Detailed explanation of why this verdict was chosen",
  "contractAlignment": {
    "matchingDeliverables": ["Which original deliverables cover this"],
    "conflictingClauses": ["Any clauses that suggest this is excluded"],
    "grayAreas": ["Ambiguous aspects"]
  },
  "changes": [
    {
      "id": "SC-001",
      "description": "Description of the change",
      "classification": "ADDITION|MODIFICATION|EXPANSION|CLARIFICATION|REDUCTION",
      "directImpact": 1-5,
      "rippleEffect": 1-5,
      "riskLevel": "low|medium|high",
      "scopeJustification": "Why this is/isn't in scope"
    }
  ],
  "overallSeverity": "minor|moderate|significant|major",
  "effortMultiplier": 1.0-3.0,
  "isOutOfScope": true/false,
  "recommendedAction": "approve_free|price_as_change_order|negotiate|decline"
}`;

const MARKET_RESEARCHER_PROMPT = `You are a market research agent. Search for current pricing.

## Your Job:
1. Search for actual market prices for the requested service
2. Determine if this is add-on work to an existing project (resources already in place)
3. If add-on, apply 30-50% discount - work still takes time and effort

## Respond with JSON:
{
  "marketPriceRange": {
    "standalone": { "min": number, "max": number },
    "asAddOn": { "min": number, "max": number }
  },
  "isLikelyAddOn": true/false,
  "addOnReasoning": "explanation",
  "marketInsights": ["findings"],
  "confidence": "high|medium|low"
}`;

const PRICING_CALCULATOR_PROMPT = `You are a pricing calculator. Pick a fair price from the market research.

## Rules:
1. Use the market research price range provided
2. Pick a price in the MIDDLE of the range, not the minimum
3. For add-on work, use "asAddOn" range. For standalone, use "standalone" range
4. Don't underprice - you're running a business

## PROFIT LEAK DETECTION
Before finalizing, check for hidden costs that could eat into profit:
- Travel/transportation costs
- Disposal/cleanup fees
- Permits or inspections
- Waiting time / delays
- Coordination with other trades
- Material price fluctuations
- Rework risk
- Client communication overhead
- Administrative time

Add a buffer if profit leaks are likely.

## Respond with JSON:
{
  "recommendedPrice": number,
  "priceRange": { "min": number, "max": number },
  "estimatedHours": number,
  "complexity": "simple|moderate|complex",
  "isAddOnWork": true/false,
  "confidence": 0-1,
  "profitLeaks": {
    "identified": ["list of potential profit leaks"],
    "bufferAdded": number,
    "bufferReason": "why buffer was added"
  },
  "reasoning": "Brief explanation"
}`;

const VERIFICATION_PROMPT = `You are a verification agent. Check if pricing makes sense.

## IMPORTANT: Trust the Market Research
If the pricing calculator used market research data to determine the price, TRUST IT.
Do NOT increase prices just because they seem "low" - add-on work IS cheaper than standalone.

## Only flag issues if:
1. Math is wrong
2. Price is OUTSIDE the market research range provided
3. Something was clearly missed

## Respond with JSON:
{
  "overallStatus": "passed|passed_with_warnings|failed",
  "confidenceScore": 0-100,
  "issues": ["only real issues"],
  "approvedForClient": true/false,
  "adjustmentNeeded": 0
}

NOTE: adjustmentNeeded should almost always be 0. Only use non-zero if there's a clear error.`;

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
  console.log('\n=== GATHERING PROJECT CONTEXT ===');
  console.log('User:', {
    id: user.id,
    name: user.name,
    location: user.location,
    hourlyRate: user.hourlyRate,
    specializations: user.specializations,
    positioning: user.competitivePositioning,
    industry: user.industry,
  });
  console.log('Project Rules:', {
    hourlyRate: rules.hourlyRate,
    currency: rules.currency,
    projectType: rules.projectType,
    originalContractPrice: rules.originalContractPrice,
    clientLocation: rules.clientLocation,
    deliverables: rules.deliverables,
    revisionsIncluded: rules.revisionsIncluded,
    revisionsUsed: rules.revisionsUsed,
    rulesSummary: rules.rulesSummary?.slice(0, 200),
  });
  console.log('Context Notes:', contextNotes.map(n => n.content));
  console.log('Request Text:', requestText.slice(0, 300) + (requestText.length > 300 ? '...' : ''));
  if (clarificationAnswers) {
    console.log('Clarification Answers:', clarificationAnswers);
  }
  console.log('=================================\n');

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
    console.log('\n=== ANTHROPIC API REQUEST ===');
    console.log('Model: claude-sonnet-4-5-20250929');
    console.log('System prompt (first 200 chars):', systemPrompt.slice(0, 200) + '...');
    console.log('User prompt (first 500 chars):', userPrompt.slice(0, 500) + '...');
    console.log('Sending request...');

    const startTime = Date.now();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const duration = Date.now() - startTime;

    let result = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        result += block.text;
      }
    }

    console.log('=== ANTHROPIC API RESPONSE ===');
    console.log('Duration:', duration, 'ms');
    console.log('Usage:', response.usage);
    console.log('Stop reason:', response.stop_reason);
    console.log('Response (first 500 chars):', result.slice(0, 500) + '...');
    console.log('==============================\n');

    return result;
  } catch (error) {
    console.error('=== ANTHROPIC API ERROR ===');
    console.error('Agent execution error:', error);
    console.error('===========================\n');
    throw error;
  }
}

async function runAgentWithWebSearch(systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    console.log('\n=== ANTHROPIC API REQUEST (Web Search Agent) ===');
    console.log('Model: claude-sonnet-4-5-20250929');
    console.log('Web Search: ENABLED');
    console.log('System prompt (first 200 chars):', systemPrompt.slice(0, 200) + '...');
    console.log('User prompt (first 500 chars):', userPrompt.slice(0, 500) + '...');
    console.log('Sending request with web search tool...');

    const startTime = Date.now();

    // Use Anthropic's web search tool for real-time pricing data
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 5,
        } as any, // Type assertion needed for beta feature
      ],
      messages: [{ role: 'user', content: userPrompt }],
    });

    const duration = Date.now() - startTime;

    let result = '';
    let searchResults: string[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        result += block.text;
      } else if (block.type === 'web_search_tool_result' || (block as any).type === 'tool_result') {
        // Capture web search results for logging
        searchResults.push(JSON.stringify(block));
      }
    }

    console.log('=== ANTHROPIC API RESPONSE (Web Search Agent) ===');
    console.log('Duration:', duration, 'ms');
    console.log('Usage:', response.usage);
    console.log('Stop reason:', response.stop_reason);
    if (searchResults.length > 0) {
      console.log('Web searches performed:', searchResults.length);
    }
    console.log('Response (first 500 chars):', result.slice(0, 500) + '...');
    console.log('=================================================\n');

    return result;
  } catch (error: any) {
    // If web search fails (not available, rate limited, etc.), fall back to standard call
    console.error('=== WEB SEARCH FAILED, FALLING BACK ===');
    console.error('Error:', error.message || error);
    console.log('Retrying without web search...');

    // Fallback: Use standard API call with explicit instruction
    const fallbackPrompt = `${userPrompt}

IMPORTANT: Web search is unavailable. Use your training knowledge to provide the best market rate estimates. Be conservative and note that these are estimates without live data.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: fallbackPrompt }],
    });

    let result = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        result += block.text;
      }
    }

    console.log('Fallback response received');
    console.log('=================================================\n');

    return result;
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
  console.log('\n=== GENERATING CLARIFICATION QUESTIONS ===');
  console.log('Project Info:', projectInfo);
  console.log('Request Text:', requestText);
  console.log('Rules:', {
    projectType: rules.projectType,
    deliverables: rules.deliverables,
    hourlyRate: rules.hourlyRate,
    rulesSummary: rules.rulesSummary?.slice(0, 200),
  });
  console.log('Context Notes:', contextNotes.map(n => n.content));
  console.log('==========================================\n');

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
      const questions = parsed.questions.map((q, i) => ({
        ...q,
        id: q.id || `q${i + 1}`,
        priority: q.priority || 1,
        category: q.category || 'other',
      }));

      console.log('\n=== CLARIFICATION QUESTIONS GENERATED ===');
      console.log('Number of questions:', questions.length);
      questions.forEach((q, i) => {
        console.log(`Q${i + 1}: ${q.question}`);
        if (q.type === 'select' && q.options) {
          console.log(`   Options: ${q.options.join(', ')}`);
        }
      });
      console.log('=========================================\n');

      return questions;
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
  const { requestText, clarificationAnswers, rules, user, contextNotes = [], pastCorrections = [] } = input;

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║         STARTING FULL MULTI-AGENT ANALYSIS                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Gather pricing context
  const pricingContext = gatherContext(user, rules, contextNotes, requestText, clarificationAnswers);
  const contextPrompt = formatContextForPrompt(pricingContext, rules);

  console.log('=== FORMATTED CONTEXT FOR PROMPTS ===');
  console.log(contextPrompt);
  console.log('=====================================\n');

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
    console.log('┌─────────────────────────────────────────┐');
    console.log('│ PHASE 1: SCOPE ANALYSIS                 │');
    console.log('└─────────────────────────────────────────┘');

    const scopePrompt = `${contextPrompt}

## Client Request
"${requestText}"

## Clarification Answers
${answersText}

Analyze the scope change - classify it and assess impact.`;

    const scopeResponse = await runAgent(SCOPE_ANALYZER_PROMPT, scopePrompt);
    const scopeData = parseJSON<{
      verdict: 'IN_SCOPE' | 'OUT_OF_SCOPE' | 'BOUNDARY_CASE' | 'CLARIFICATION_ONLY';
      verdictReasoning: string;
      contractAlignment: {
        matchingDeliverables: string[];
        conflictingClauses: string[];
        grayAreas: string[];
      };
      changes: any[];
      overallSeverity: string;
      effortMultiplier: number;
      isOutOfScope: boolean;
      recommendedAction: 'approve_free' | 'price_as_change_order' | 'negotiate' | 'decline';
    }>(scopeResponse);

    console.log('Scope Creep Verdict:', scopeData?.verdict, '-', scopeData?.verdictReasoning);

    // =========================================================================
    // PHASE 2: Market Research (with web search)
    // =========================================================================
    console.log('\n┌─────────────────────────────────────────┐');
    console.log('│ PHASE 2: MARKET RESEARCH                │');
    console.log('└─────────────────────────────────────────┘');
    console.log('Scope Analysis Result:', JSON.stringify(scopeData, null, 2));

    const skills = pricingContext.freelancer.specializations || ['general'];
    const location = pricingContext.freelancer.location || pricingContext.project.clientLocation || 'USA';

    const marketPrompt = `Search for current market prices for: "${requestText}"

Project Type: ${pricingContext.project.projectType || 'general'}
Location: ${location}

Clarification Details:
${answersText}

Search for real pricing data and determine if this is standalone work or add-on work based on the project context.`;

    const marketResponse = await runAgentWithWebSearch(MARKET_RESEARCHER_PROMPT, marketPrompt);
    const marketData = parseJSON<{
      marketPriceRange?: {
        standalone: { min: number; max: number };
        asAddOn?: { min: number; max: number };
      };
      isLikelyAddOn?: boolean;
      addOnReasoning?: string;
      marketInsights?: string[];
      confidence?: string;
    }>(marketResponse);

    // =========================================================================
    // PHASE 3: Pricing Calculation
    // =========================================================================
    console.log('\n┌─────────────────────────────────────────┐');
    console.log('│ PHASE 3: PRICING CALCULATION            │');
    console.log('└─────────────────────────────────────────┘');
    console.log('Market Research Result:', JSON.stringify(marketData, null, 2));

    const complexity = scopeData?.overallSeverity === 'major' ? 'complex'
      : scopeData?.overallSeverity === 'significant' ? 'complex'
      : scopeData?.overallSeverity === 'moderate' ? 'moderate'
      : 'simple';

    const freelancerRate = pricingContext.freelancer.hourlyRate ||
      (rules.hourlyRate ? parseFloat(rules.hourlyRate.toString()) : 100);

    // Build market price info for pricing prompt
    const marketPriceInfo = marketData?.marketPriceRange
      ? `
## MARKET RESEARCH RESULTS (USE THIS!)
- Standalone Price Range: $${marketData.marketPriceRange.standalone.min} - $${marketData.marketPriceRange.standalone.max}
${marketData.marketPriceRange.asAddOn
  ? `- Add-On Price Range: $${marketData.marketPriceRange.asAddOn.min} - $${marketData.marketPriceRange.asAddOn.max}`
  : ''}
- Is Add-On Work: ${marketData.isLikelyAddOn ? 'YES' : 'NO'}
${marketData.addOnReasoning ? `- Reasoning: ${marketData.addOnReasoning}` : ''}
${marketData.marketInsights?.length ? `- Market Insights: ${marketData.marketInsights.join('; ')}` : ''}
`
      : '';

    const pricingPrompt = `## Project Context
${contextPrompt}

## Request
"${requestText}"

## Clarification Answers
${answersText}
${marketPriceInfo}
${pastCorrections.length > 0 ? `
## LEARN FROM PAST CORRECTIONS
The freelancer has corrected AI pricing before. Use these as guidance:
${pastCorrections.slice(0, 5).map(c =>
  `- "${c.requestText.slice(0, 50)}..." → AI: $${c.aiPrice}, Corrected to: $${c.correctedPrice}${c.reason ? ` (Reason: ${c.reason})` : ''}`
).join('\n')}

Adjust your pricing to match the freelancer's preferences.
` : ''}
Calculate the price. Use the add-on price range if this is add-on work, otherwise use standalone range.`;

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
      profitLeaks?: {
        identified: string[];
        bufferAdded: number;
        bufferReason: string;
      };
    }>(pricingResponse);

    // Log profit leak detection
    if (pricingData?.profitLeaks?.identified?.length) {
      console.log('Profit Leaks Detected:', pricingData.profitLeaks.identified);
      console.log('Buffer Added: $' + pricingData.profitLeaks.bufferAdded);
    }

    // =========================================================================
    // PHASE 4: Verification
    // =========================================================================
    console.log('\n┌─────────────────────────────────────────┐');
    console.log('│ PHASE 4: VERIFICATION                   │');
    console.log('└─────────────────────────────────────────┘');
    console.log('Pricing Calculation Result:', JSON.stringify(pricingData, null, 2));

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
    console.log('\n┌─────────────────────────────────────────┐');
    console.log('│ BUILDING FINAL RESULT                   │');
    console.log('└─────────────────────────────────────────┘');
    console.log('Verification Result:', JSON.stringify(verifyData, null, 2));

    // Use the pricing calculator's price directly - don't let verification override it
    const finalPrice = pricingData?.recommendedPrice || freelancerRate * 4;

    // Generate scope summary from answers
    const scopeSummary = generateScopeSummary(requestText, clarificationAnswers);

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║         ANALYSIS COMPLETE - FINAL PRICING                    ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║ Suggested Price: $${finalPrice.toFixed(2).padEnd(43)}║`);
    console.log(`║ Estimated Hours: ${(pricingData?.estimatedHours || 4).toString().padEnd(44)}║`);
    console.log(`║ Complexity: ${(pricingData?.complexity || complexity).padEnd(49)}║`);
    console.log(`║ Confidence: ${((verifyData?.confidenceScore ? verifyData.confidenceScore / 100 : 0.75) * 100).toFixed(0)}%${' '.repeat(46)}║`);
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

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

      // Scope Creep Analysis - AI's assessment of whether request is in/out of scope
      scopeAnalysis: scopeData ? {
        verdict: scopeData.verdict || 'BOUNDARY_CASE',
        verdictReasoning: scopeData.verdictReasoning || 'Unable to determine scope status.',
        contractAlignment: scopeData.contractAlignment || {
          matchingDeliverables: [],
          conflictingClauses: [],
          grayAreas: [],
        },
        changes: scopeData.changes || [],
        overallSeverity: (scopeData.overallSeverity as 'minor' | 'moderate' | 'significant' | 'major') || 'moderate',
        effortMultiplier: scopeData.effortMultiplier || 1.0,
        isOutOfScope: scopeData.isOutOfScope ?? (scopeData.verdict === 'OUT_OF_SCOPE'),
        recommendedAction: scopeData.recommendedAction || 'price_as_change_order',
      } : undefined,

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

      // Profit leak detection
      profitLeaks: pricingData?.profitLeaks || undefined,
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
