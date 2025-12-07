# Agentic Pricing System Implementation Plan

## Overview
Replace the current Tier 1 pricing engine with an agentic system that:
- Does **live market research via web search** to price accurately
- Uses freelancer context (location, specializations, contract value)
- Provides **transparent reasoning** the freelancer can review
- Shows the freelancer **what context is being used** so they know what to provide

---

## Phase 1: Database Schema Updates

### Add Freelancer Context Fields to `users` table
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS specializations JSONB; -- ["React", "Next.js", "AWS"]
ALTER TABLE users ADD COLUMN IF NOT EXISTS typical_contract_value DECIMAL(10,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS competitive_positioning TEXT DEFAULT 'mid-market'; -- budget, mid-market, premium
```

### Add Project Context Fields to `project_rules` table
```sql
ALTER TABLE project_rules ADD COLUMN IF NOT EXISTS original_contract_price DECIMAL(10,2);
ALTER TABLE project_rules ADD COLUMN IF NOT EXISTS project_type TEXT; -- "website", "mobile app", "design", etc.
ALTER TABLE project_rules ADD COLUMN IF NOT EXISTS client_location TEXT;
ALTER TABLE project_rules ADD COLUMN IF NOT EXISTS project_timeline TEXT; -- "1 week", "1 month", "ongoing"
```

### Update `requests` table for pricing transparency
```sql
ALTER TABLE requests ADD COLUMN IF NOT EXISTS pricing_reasoning TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS market_research_data JSONB;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS pricing_context_used JSONB;
```

---

## Phase 2: Create Agentic Pricing Engine

### New File: `src/lib/pricing/agentic-engine.ts`

**Core Functions:**
1. `gatherPricingContext()` - Collect all context from freelancer profile + project rules
2. `performMarketResearch()` - Use web search to find current market rates
3. `analyzeAndPrice()` - LLM reasoning with context + market data
4. `calculateAgenticPrice()` - Main entry point

**Flow:**
```
Input: requestText, clarificationAnswers, user, projectRules

1. Gather Context
   - Freelancer: location, specializations, hourlyRate, positioning
   - Project: contractPrice, projectType, deliverables, clientLocation
   - Request: scopeDescription, clientAnswers, timeline/urgency

2. Market Research (Web Search)
   - Search: "[skill] freelance rates [location] 2024"
   - Search: "[project type] pricing [market]"
   - Search: "scope creep pricing [industry]"
   - Extract rate ranges and pricing strategies

3. Agentic Analysis
   - Synthesize context + market research
   - Multi-lens pricing: cost-based, value-based, competitive
   - Generate transparent reasoning
   - Calculate recommended price with confidence

4. Output
   - recommendedPrice
   - priceRange: {min, max}
   - reasoning (educational, transparent)
   - marketResearchSummary
   - contextUsed (show freelancer what was used)
```

---

## Phase 3: Update Freelancer Project Setup UI

### Project Creation/Edit Form Updates

Add new fields to collect pricing context:

**Section: "Pricing Context" (helps AI price accurately)**

1. **Your Location** (autocomplete)
   - "Where are you based? This helps determine market rates."
   - Example: "San Francisco, CA" or "London, UK"

2. **Your Specializations** (tag input)
   - "What are your main skills for this project?"
   - Example: ["React", "TypeScript", "Next.js"]

3. **Original Contract Value** (currency input)
   - "What was the original contract price?"
   - Example: $5,000

4. **Project Type** (dropdown)
   - "What type of project is this?"
   - Options: Website, Mobile App, Design, Backend/API, Full Stack, Consulting, Other

5. **Client Location** (optional autocomplete)
   - "Where is your client based? (affects budget expectations)"
   - Example: "New York, NY"

6. **Your Market Positioning** (radio)
   - "How do you position yourself?"
   - Options: Budget (competitive rates), Mid-Market (standard rates), Premium (high-end rates)

**UI Note:** Show helper text explaining WHY each field helps:
> "The more context you provide, the more accurate the AI pricing will be.
> You'll see exactly what information is used when pricing scope changes."

---

## Phase 4: Update Scope Analyzer

### Modify `src/lib/ai/scope-analyzer.ts`

**Replace `analyzeRequestWithAnswers()` to use agentic pricing:**

```typescript
export async function analyzeRequestWithAnswers(
  requestText: string,
  clarificationAnswers: Record<string, string>,
  rules: ProjectRules,
  user: User,
  contextNotes: ContextNote[] = []
): Promise<ScopeAnalysis> {

  // 1. Gather all pricing context
  const pricingContext = gatherPricingContext(user, rules, contextNotes);

  // 2. Perform market research via web search
  const marketResearch = await performMarketResearch({
    skills: user.specializations || [],
    location: user.location,
    projectType: rules.projectType,
    requestDescription: requestText
  });

  // 3. Agentic pricing analysis
  const pricingResult = await analyzeAndPrice({
    requestText,
    clarificationAnswers,
    pricingContext,
    marketResearch,
    rules
  });

  return {
    verdict: pricingResult.isOutOfScope ? 'out_of_scope' : 'needs_clarification',
    reasoning: pricingResult.reasoning,
    relevantRules: pricingResult.rulesApplied,
    estimatedHours: pricingResult.estimatedHours,
    suggestedPrice: pricingResult.recommendedPrice,
    confidence: pricingResult.confidence,
    complexity: pricingResult.complexity,
    // NEW: Transparent context
    pricingContextUsed: pricingContext,
    marketResearchSummary: marketResearch.summary
  };
}
```

---

## Phase 5: Update Request Portal UI

### Show Pricing Transparency to Client

When displaying the price to the client, show:

1. **The Price** (prominent)
2. **Why This Price** (expandable reasoning)
3. **Based On** (what market research found)

### Show Context to Freelancer Dashboard

In the freelancer's request review, show:

1. **Context Used for Pricing:**
   - Your location: San Francisco, CA
   - Your specializations: React, TypeScript
   - Original contract: $5,000
   - Your positioning: Mid-market

2. **Market Research Found:**
   - Similar work in your area: $100-$175/hr
   - This type of scope change typically: $500-$2,000
   - Sources: [links to search results]

3. **AI Reasoning:**
   - Full explanation of how price was calculated

4. **Tip to Improve Accuracy:**
   - "Add more specializations to get better market comparisons"
   - "Set your client's location for budget-appropriate pricing"

---

## Phase 6: Remove Old Tier 1 Engine

### Files to Delete/Deprecate:
- `src/lib/pricing/tier1-engine.ts` - Replace entirely
- `src/lib/pricing/buffer-calculator.ts` - Incorporate logic into agentic engine
- `src/lib/pricing/industry-templates.ts` - No longer needed (market research replaces this)

### Keep:
- Basic buffer/safety margin logic (move to agentic engine)
- Approval routing logic

---

## Implementation Order

### Week 1: Foundation
- [ ] Add database schema changes (migrations)
- [ ] Create `agentic-engine.ts` with basic structure
- [ ] Implement `gatherPricingContext()` function
- [ ] Implement `performMarketResearch()` with web search

### Week 2: Core Logic
- [ ] Implement `analyzeAndPrice()` LLM reasoning
- [ ] Update `analyzeRequestWithAnswers()` to use new engine
- [ ] Add pricing transparency fields to response
- [ ] Test with sample requests

### Week 3: UI Updates
- [ ] Update project creation form with pricing context fields
- [ ] Update freelancer dashboard to show context used
- [ ] Update client portal to show reasoning
- [ ] Add "improve accuracy" tips

### Week 4: Polish & Deploy
- [ ] Remove old tier1-engine.ts
- [ ] End-to-end testing
- [ ] Deploy to production
- [ ] Monitor and iterate

---

## Key Design Decisions

1. **Web Search for Market Research** - Real-time data, not static templates
2. **No Years of Experience** - Removed as requested
3. **Transparent Context** - Show freelancers exactly what's being used
4. **Educational Reasoning** - Help freelancers understand pricing
5. **Graceful Fallback** - If web search fails, use conservative estimate based on hourly rate

---

## Success Metrics

- Pricing accuracy: >85% within 15% of what freelancer would charge
- Freelancer satisfaction: >8/10 on pricing confidence
- Context completion: >70% of fields filled by freelancers
- Web search success rate: >95% (with fallback for failures)
