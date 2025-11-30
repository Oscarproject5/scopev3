import { NextRequest, NextResponse } from 'next/server';
import { db, projects, requests } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { analyzeRequest, analyzeRequestWithAnswers, type ScopeAnalysis } from '@/lib/ai/scope-analyzer';

// POST /api/analyze - Analyze a client request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectSlug, requestText, clientName, clientEmail, clarificationAnswers, save = true } = body;

    if (!projectSlug || !requestText) {
      return NextResponse.json(
        { error: 'Project slug and request text are required' },
        { status: 400 }
      );
    }

    // Find the project by slug with user relationship
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, projectSlug),
      with: {
        rules: true,
        contextNotes: true,
        user: true, // NEW: Need user for tier-based pricing
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.isActive) {
      return NextResponse.json({ error: 'This project is not accepting requests' }, { status: 400 });
    }

    if (!project.rules) {
      return NextResponse.json(
        { error: 'Project rules not configured' },
        { status: 400 }
      );
    }

    if (!project.user) {
      return NextResponse.json(
        { error: 'Project owner not found' },
        { status: 404 }
      );
    }

    // Check if this is a submission with answers (second call) or initial request (first call)
    const hasAnswers = clarificationAnswers && Object.keys(clarificationAnswers).length > 0;

    let analysis: ScopeAnalysis;
    let suggestedPrice: number | null = null;

    if (hasAnswers) {
      // CLIENT PROVIDED ANSWERS - Run AI analysis for pricing SUGGESTIONS
      // AI does NOT decide scope - only provides estimates for freelancer to review
      analysis = await analyzeRequestWithAnswers(
        requestText,
        clarificationAnswers,
        project.rules,
        project.user,
        project.contextNotes || []
      );

      // Store suggested price for freelancer reference (not a decision)
      suggestedPrice = analysis.priceBreakdown?.recommendedPrice || analysis.suggestedPrice || null;
    } else {
      // INITIAL REQUEST: No answers yet - generate clarification questions
      analysis = await analyzeRequest(
        requestText,
        project.rules,
        project.user,
        project.contextNotes || []
      );
    }

    // SIMPLIFIED STATUS: AI never decides scope
    // - No answers yet = pending_questions (client needs to answer)
    // - Has answers = pending_freelancer_approval (freelancer decides scope)
    const status = hasAnswers ? 'pending_freelancer_approval' : 'pending_questions';
    const freelancerApproved: boolean | null = null; // Freelancer hasn't decided yet

    // Save the request if needed
    let savedRequest = null;
    if (save) {
      // Include clarification answers in the analysis if provided
      const analysisWithAnswers = clarificationAnswers
        ? { ...analysis, clarificationAnswers }
        : analysis;

      const [newRequest] = await db.insert(requests).values({
        projectId: project.id,
        clientName: clientName || null,
        clientEmail: clientEmail || null,
        requestText,
        status,
        isInScope: null, // Freelancer will decide, not AI
        aiAnalysis: analysisWithAnswers,

        // AI's SUGGESTED price (freelancer may change this)
        quotedPrice: suggestedPrice?.toString() || null,
        estimatedHours: analysis.priceBreakdown?.estimatedHours?.toString() || null,
        laborCost: analysis.priceBreakdown?.laborCost?.toString() || null,
        overheadCost: analysis.priceBreakdown?.overhead?.amount?.toString() || null,
        profitAmount: analysis.priceBreakdown?.profit?.amount?.toString() || null,

        // Buffer tracking
        baseSubtotal: analysis.priceBreakdown?.baseSubtotal?.toString() || null,
        bufferPercentage: analysis.priceBreakdown?.safetyBuffer?.percentage?.toString() || null,
        bufferAmount: analysis.priceBreakdown?.safetyBuffer?.amount?.toString() || null,
        bufferReasoning: analysis.priceBreakdown?.safetyBuffer?.reasoning || null,

        // AI analysis transparency fields (for freelancer review)
        pricingReasoning: analysis.pricingReasoning || null,
        marketResearchData: analysis.pricingContextUsed ? {
          searchQueries: [],
          rateRanges: [],
          marketInsights: [analysis.marketResearchSummary || ''],
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

        // Approval tracking - freelancer hasn't reviewed yet
        freelancerApproved: null,
        freelancerApprovedAt: null,
      }).returning();
      savedRequest = newRequest;
    }

    return NextResponse.json({
      analysis,
      request: savedRequest,
      project: {
        name: project.name,
        clientName: project.clientName,
      },
      // AI's pricing SUGGESTION (freelancer will review and decide)
      pricing: analysis.priceBreakdown ? {
        suggestedPrice: analysis.priceBreakdown.recommendedPrice,
        priceRange: analysis.priceBreakdown.priceRange,
        breakdown: analysis.priceBreakdown,
        confidence: analysis.confidence,
        // Transparency data for freelancer review
        reasoning: analysis.pricingReasoning,
        marketResearchSummary: analysis.marketResearchSummary,
        contextUsed: analysis.pricingContextUsed,
        improvementTips: analysis.improvementTips,
      } : null,
    });
  } catch (error) {
    console.error('Error analyzing request:', error);

    // Enhanced error logging for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to analyze request',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}
