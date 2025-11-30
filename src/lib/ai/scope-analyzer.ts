import OpenAI from 'openai';
import type { ProjectRules, ContextNote, User } from '@/lib/db/schema';
import {
  calculateAgenticPrice,
  type AgenticPriceBreakdown,
  type PricingContext,
} from '@/lib/pricing/agentic-engine';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ClarificationQuestion {
  id: string;
  question: string;
  helpText?: string;
  type: 'text' | 'select' | 'multiselect';
  options?: string[];
}

export interface ScopeAnalysis {
  verdict: 'in_scope' | 'out_of_scope' | 'needs_clarification' | 'pending_review';
  reasoning: string;
  scopeSummary?: string; // Simple description of what's being done (no pricing details)
  relevantRules: string[];
  estimatedHours?: number;
  suggestedPrice?: number;
  revisionCount?: string;
  confidence: number;
  complexity?: 'simple' | 'moderate' | 'complex';
  priceBreakdown?: AgenticPriceBreakdown;
  clarificationQuestions?: ClarificationQuestion[];
  clarificationAnswers?: Record<string, string>;
  // Agentic pricing transparency fields
  pricingContextUsed?: PricingContext;
  marketResearchSummary?: string;
  pricingReasoning?: string;
  improvementTips?: string[];
}

// Generate clarification questions to help the freelancer understand and price the request
export async function generateClarificationQuestions(
  requestText: string,
  rules: ProjectRules,
  contextNotes: ContextNote[] = []
): Promise<ClarificationQuestion[]> {
  const systemPrompt = `You are ScopeGuard, an intelligent assistant that helps freelancers gather information about client requests. Your job is to generate 3-4 smart clarification questions that will help the freelancer:
1. Understand exactly what the client needs
2. Estimate the time/effort required
3. Price the work correctly

Generate questions that are:
- SPECIFIC: Target unclear aspects of the request
- ACTIONABLE: Answers should help with pricing decisions
- PROFESSIONAL: Polite and easy to understand
- RELEVANT: Based on the project context and rules

Always respond in valid JSON format.`;

  const rulesContext = formatRulesForAI(rules);
  const notesContext = contextNotes.map(n => n.content).join('\n\n');

  const userPrompt = `## Project Context
${rulesContext}

${notesContext ? `## Additional Context\n${notesContext}\n\n` : ''}## Client Request
"${requestText}"

## Your Task
Generate 3-4 clarification questions that will help the freelancer understand and price this request correctly. Focus on:
- Scope/extent of the work
- Technical requirements or specifications
- Timeline or urgency
- Any deliverable details that are unclear

Respond with this exact JSON structure:
{
  "questions": [
    {
      "id": "q1",
      "question": "The question to ask the client",
      "helpText": "Optional hint to help the client answer",
      "type": "text" | "select",
      "options": ["Option 1", "Option 2"] (only if type is "select")
    }
  ]
}

Generate exactly 3-4 questions. Make them specific to this request, not generic.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const result = JSON.parse(content);
    return result.questions || [];
  } catch (error) {
    console.error('Question generation error:', error);
    // Return default questions if AI fails
    return [
      {
        id: 'q1',
        question: 'Can you describe in more detail what you need?',
        type: 'text'
      },
      {
        id: 'q2',
        question: 'What is your timeline for this request?',
        type: 'select',
        options: ['ASAP / Urgent', 'This week', 'This month', 'Flexible / No rush']
      },
      {
        id: 'q3',
        question: 'Is there anything else the freelancer should know about this request?',
        type: 'text'
      }
    ];
  }
}

export async function analyzeRequest(
  requestText: string,
  rules: ProjectRules,
  _user: User,
  contextNotes: ContextNote[] = []
): Promise<ScopeAnalysis> {
  // Generate clarification questions instead of making a verdict
  // The freelancer will decide if it's in scope or out of scope
  const clarificationQuestions = await generateClarificationQuestions(
    requestText,
    rules,
    contextNotes
  );

  // Always return pending_review - the freelancer decides scope
  return {
    verdict: 'pending_review',
    reasoning: 'This request has been submitted for review. Please answer the clarification questions below to help the freelancer understand your needs and provide an accurate quote.',
    relevantRules: [],
    confidence: 1.0,
    clarificationQuestions,
  };
}

// Full analysis with clarification answers - uses agentic pricing engine
// NOTE: AI does NOT decide scope - only provides estimate as a suggestion
// The FREELANCER always decides if work is in-scope or out-of-scope
export async function analyzeRequestWithAnswers(
  requestText: string,
  clarificationAnswers: Record<string, string>,
  rules: ProjectRules,
  user: User,
  contextNotes: ContextNote[] = []
): Promise<ScopeAnalysis> {
  try {
    // Use the new agentic pricing engine to generate an ESTIMATE (not a decision)
    const agenticResult = await calculateAgenticPrice({
      requestText,
      clarificationAnswers,
      user,
      rules,
      contextNotes,
    });

    // ALWAYS pending_review - freelancer decides scope, not AI
    // AI only provides analysis and pricing SUGGESTIONS
    const analysis: ScopeAnalysis = {
      verdict: 'pending_review', // Freelancer will decide in_scope or out_of_scope
      reasoning: agenticResult.reasoning,
      scopeSummary: agenticResult.scopeSummary,
      relevantRules: agenticResult.rulesApplied,
      estimatedHours: agenticResult.breakdown.estimatedHours,
      suggestedPrice: agenticResult.breakdown.recommendedPrice,
      confidence: agenticResult.breakdown.confidence,
      complexity: agenticResult.breakdown.complexity,
      priceBreakdown: agenticResult.breakdown,
      // Transparency fields for freelancer review
      pricingContextUsed: agenticResult.contextUsed,
      marketResearchSummary: agenticResult.marketResearchSummary,
      pricingReasoning: agenticResult.reasoning,
      improvementTips: agenticResult.improvementTips,
      // Store AI's scope suggestion for freelancer to see (but not act on automatically)
      clarificationAnswers,
    };

    return analysis;
  } catch (error) {
    console.error('Agentic analysis error:', error);

    // Fallback - still pending_review, freelancer decides
    return {
      verdict: 'pending_review',
      reasoning: 'Request submitted for review. AI analysis unavailable - please review manually.',
      relevantRules: [],
      confidence: 0,
      clarificationAnswers,
    };
  }
}

function formatRulesForAI(rules: ProjectRules): string {
  const sections: string[] = [];

  if (rules.hourlyRate) {
    sections.push(`**Hourly Rate**: ${rules.currency || 'USD'} ${rules.hourlyRate}/hour for out-of-scope work`);
  }

  if (rules.deliverables && (rules.deliverables as string[]).length > 0) {
    sections.push(`**Included Deliverables**:\n${(rules.deliverables as string[]).map(d => `- ${d}`).join('\n')}`);
  }

  if (rules.revisionsIncluded !== null && rules.revisionsIncluded !== undefined) {
    const used = rules.revisionsUsed || 0;
    const remaining = rules.revisionsIncluded - used;
    sections.push(`**Revisions**: ${rules.revisionsIncluded} included (${used} used, ${remaining} remaining)`);
  }

  if (rules.workingHours) {
    const wh = rules.workingHours as { start: string; end: string; timezone: string };
    sections.push(`**Working Hours**: ${wh.start} - ${wh.end} (${wh.timezone})`);
  }

  if (rules.excludedDays && (rules.excludedDays as string[]).length > 0) {
    sections.push(`**No Work Days**: ${(rules.excludedDays as string[]).join(', ')}`);
  }

  if (rules.customRules && (rules.customRules as any[]).length > 0) {
    const customRulesText = (rules.customRules as { rule: string; description: string }[])
      .map(r => `- **${r.rule}**: ${r.description}`)
      .join('\n');
    sections.push(`**Additional Rules**:\n${customRulesText}`);
  }

  if (rules.contractText) {
    sections.push(`**Original Contract Text**:\n${rules.contractText.slice(0, 2000)}${rules.contractText.length > 2000 ? '...' : ''}`);
  }

  if (rules.rulesSummary) {
    sections.push(`**AI Summary of Rules**:\n${rules.rulesSummary}`);
  }

  return sections.join('\n\n') || 'No specific rules defined. All requests should be considered out of scope.';
}

// Extract rules from uploaded contract/document
export async function extractRulesFromContract(contractText: string): Promise<{
  hourlyRate?: number;
  currency?: string;
  deliverables?: string[];
  revisionsIncluded?: number;
  customRules?: { rule: string; description: string }[];
  summary?: string;
}> {
  const prompt = `Analyze this freelance contract/agreement and extract key project boundaries and rules.

Contract Text:
"""
${contractText.slice(0, 8000)}
"""

Extract and return as JSON:
{
  "hourlyRate": number or null (the hourly rate for additional work),
  "currency": "USD" or other currency code,
  "deliverables": ["list", "of", "specific", "deliverables", "included"],
  "revisionsIncluded": number or null (how many revision rounds are included),
  "customRules": [
    {"rule": "Rule Name", "description": "What this rule means for scope"}
  ],
  "summary": "A 2-3 sentence summary of what is in scope and what isn't"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing contracts and extracting key terms. Be thorough but concise. Always respond in valid JSON.'
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response');

    return JSON.parse(content);
  } catch (error) {
    console.error('Contract extraction error:', error);
    return {};
  }
}
