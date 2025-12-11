import { NextRequest, NextResponse } from 'next/server';
import { db, projects, requests } from '@/lib/db';
import { eq, and, isNotNull, desc } from 'drizzle-orm';
import { analyzeRequestFull } from '@/lib/ai/orchestrator';
import type { PriceCorrection } from '@/lib/ai/types';

// POST /api/analyze/background - Process AI analysis in background
// This endpoint is called internally after the main request is saved
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, requestText, clarificationAnswers, projectId } = body;

    if (!requestId || !requestText || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`[Background Analysis] Starting for request ${requestId}`);

    // Get the project with all context
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      with: {
        rules: true,
        contextNotes: true,
        user: true,
      },
    });

    if (!project || !project.user) {
      console.error(`[Background Analysis] Project or user not found for ${requestId}`);
      await db.update(requests)
        .set({
          status: 'pending_freelancer_approval',
          aiAnalysis: {
            verdict: 'pending_review',
            reasoning: 'Analysis could not be completed. Please review manually.',
            scopeSummary: requestText,
            relevantRules: [],
            confidence: 0,
            clarificationAnswers,
            error: 'Project or user not found',
          },
          updatedAt: new Date(),
        })
        .where(eq(requests.id, requestId));
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const rules = project.rules || {
      hourlyRate: null,
      currency: 'USD',
      deliverables: [],
      revisionsIncluded: 2,
      revisionsUsed: 0,
      customRules: [],
      rulesSummary: null,
      projectType: null,
      originalContractPrice: null,
      clientLocation: null,
      projectTimeline: null,
      contractText: null,
    };

    // Fetch past price corrections from this project to help AI learn
    const pastRequests = await db.query.requests.findMany({
      where: and(
        eq(requests.projectId, projectId),
        eq(requests.freelancerModifiedPrice, true),
        isNotNull(requests.quotedPrice)
      ),
      orderBy: [desc(requests.createdAt)],
      limit: 10,
    });

    const pastCorrections: PriceCorrection[] = pastRequests
      .map(req => {
        const aiAnalysis = req.aiAnalysis as any;
        const aiPrice = aiAnalysis?.suggestedPrice;
        const correctedPrice = req.quotedPrice ? parseFloat(req.quotedPrice) : null;

        if (aiPrice && correctedPrice && Math.abs(aiPrice - correctedPrice) > 1) {
          return {
            requestText: req.requestText,
            aiPrice,
            correctedPrice,
            reason: req.priceModificationReason || undefined,
          };
        }
        return null;
      })
      .filter((c): c is PriceCorrection => c !== null);

    console.log(`[Background Analysis] Found ${pastCorrections.length} past price corrections to learn from`);

    // Run the full multi-agent analysis
    console.log(`[Background Analysis] Running full analysis for ${requestId}`);
    const analysis = await analyzeRequestFull({
      requestText,
      clarificationAnswers,
      rules: rules as any,
      user: project.user,
      contextNotes: project.contextNotes || [],
      pastCorrections, // Pass past corrections so AI can learn
    });

    console.log(`[Background Analysis] Complete for ${requestId}:`, {
      suggestedPrice: analysis.suggestedPrice,
      hasBreakdown: !!analysis.priceBreakdown,
      estimatedHours: analysis.estimatedHours,
      scopeVerdict: analysis.scopeAnalysis?.verdict,
    });

    // Update the request with the full analysis
    const analysisWithAnswers = { ...analysis, clarificationAnswers };

    await db.update(requests)
      .set({
        status: 'pending_freelancer_approval',
        aiAnalysis: analysisWithAnswers,

        // Store AI's estimates for freelancer reference
        estimatedHours: analysis.estimatedHours?.toString() || null,
        laborCost: analysis.priceBreakdown?.directCosts?.labor?.toString() || null,
        overheadCost: analysis.priceBreakdown?.indirectCosts?.pmOverhead?.toString() || null,
        profitAmount: analysis.priceBreakdown?.adjustments?.scopePremiumAmt?.toString() || null,

        // Buffer tracking
        baseSubtotal: analysis.priceBreakdown?.directCosts?.subtotal?.toString() || null,
        bufferPercentage: analysis.priceBreakdown?.adjustments?.riskPremiumPct?.toString() || null,
        bufferAmount: analysis.priceBreakdown?.adjustments?.riskPremiumAmt?.toString() || null,
        bufferReasoning: 'Market-informed pricing with complexity buffer',

        // AI analysis transparency fields
        pricingReasoning: analysis.pricingReasoning || null,
        marketResearchData: analysis.marketResearchSummary ? {
          searchQueries: [],
          rateRanges: [],
          marketInsights: [analysis.marketResearchSummary],
          searchedAt: new Date().toISOString(),
        } : null,
        pricingContextUsed: analysis.pricingContextUsed ? {
          freelancerLocation: analysis.pricingContextUsed.freelancer?.location,
          freelancerSpecializations: analysis.pricingContextUsed.freelancer?.specializations,
          freelancerPositioning: analysis.pricingContextUsed.freelancer?.positioning,
          projectType: analysis.pricingContextUsed.project?.projectType,
          originalContractPrice: analysis.pricingContextUsed.project?.originalContractPrice,
          clientLocation: analysis.pricingContextUsed.project?.clientLocation,
          hourlyRate: analysis.pricingContextUsed.freelancer?.hourlyRate,
        } : null,

        updatedAt: new Date(),
      })
      .where(eq(requests.id, requestId));

    console.log(`[Background Analysis] Database updated for ${requestId}`);

    return NextResponse.json({
      success: true,
      requestId,
      suggestedPrice: analysis.suggestedPrice,
    });
  } catch (error) {
    console.error('[Background Analysis] Error:', error);

    // Try to update the request with error status
    const body = await request.clone().json().catch(() => ({}));
    if (body.requestId) {
      try {
        await db.update(requests)
          .set({
            status: 'pending_freelancer_approval',
            aiAnalysis: {
              verdict: 'pending_review',
              reasoning: 'AI analysis encountered an error. Please review manually.',
              scopeSummary: body.requestText || '',
              relevantRules: [],
              confidence: 0,
              clarificationAnswers: body.clarificationAnswers,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            updatedAt: new Date(),
          })
          .where(eq(requests.id, body.requestId));
      } catch (updateError) {
        console.error('[Background Analysis] Failed to update request with error:', updateError);
      }
    }

    return NextResponse.json(
      { error: 'Background analysis failed' },
      { status: 500 }
    );
  }
}
