/**
 * Scope Analyzer - Now powered by Claude Agent SDK
 *
 * This module re-exports from the new orchestrator for backward compatibility.
 * The old OpenAI-based implementation has been replaced.
 */

export {
  generateClarificationQuestions,
  analyzeRequestFull as analyzeRequestWithAnswers,
} from './orchestrator';

export type {
  ClarificationQuestion,
  OrchestratorResult as ScopeAnalysis,
} from './types';

// For backward compatibility with existing imports
export async function analyzeRequest(
  requestText: string,
  rules: import('@/lib/db/schema').ProjectRules,
  _user: import('@/lib/db/schema').User,
  contextNotes: import('@/lib/db/schema').ContextNote[] = []
) {
  const { generateClarificationQuestions } = await import('./orchestrator');
  const clarificationQuestions = await generateClarificationQuestions(
    requestText,
    rules,
    contextNotes
  );

  return {
    verdict: 'pending_review' as const,
    reasoning: 'This request has been submitted for review. Please answer the clarification questions below to help the freelancer understand your needs and provide an accurate quote.',
    relevantRules: [],
    confidence: 1.0,
    clarificationQuestions,
  };
}

// Contract extraction using Anthropic SDK
export async function extractRulesFromContract(contractText: string): Promise<{
  hourlyRate?: number;
  currency?: string;
  deliverables?: string[];
  revisionsIncluded?: number;
  customRules?: { rule: string; description: string }[];
  summary?: string;
}> {
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic();

    const systemPrompt = `You are an expert at analyzing contracts and extracting key terms. Analyze the contract and extract pricing rules.

Respond with JSON:
{
  "hourlyRate": number or null,
  "currency": "USD" or other currency code,
  "deliverables": ["list", "of", "deliverables"],
  "revisionsIncluded": number or null,
  "customRules": [{"rule": "Rule Name", "description": "Description"}],
  "summary": "2-3 sentence summary of what is in scope"
}`;

    const userPrompt = `Analyze this contract and extract key project boundaries and rules:

"""
${contractText.slice(0, 8000)}
"""`;

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

    // Parse JSON from response
    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result];
    const parsed = JSON.parse(jsonMatch[1]?.trim() || result.trim());

    return {
      hourlyRate: parsed.hourlyRate || undefined,
      currency: parsed.currency || 'USD',
      deliverables: parsed.deliverables || [],
      revisionsIncluded: parsed.revisionsIncluded || undefined,
      customRules: parsed.customRules || [],
      summary: parsed.summary || undefined,
    };
  } catch (error) {
    console.error('Contract extraction error:', error);
    return {
      currency: 'USD',
      deliverables: [],
      customRules: [],
    };
  }
}
