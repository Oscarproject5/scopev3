import { NextRequest, NextResponse } from 'next/server';
import { db, projects, requests } from '@/lib/db';
import { eq } from 'drizzle-orm';
import {
  generateClarificationQuestions,
  analyzeRequestFull,
  type OrchestratorResult,
} from '@/lib/ai/orchestrator';

// POST /api/analyze - Analyze a client request using multi-agent system
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
        user: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.isActive) {
      return NextResponse.json({ error: 'This project is not accepting requests' }, { status: 400 });
    }

    // Project rules are now optional - use defaults if not configured
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

    if (!project.user) {
      return NextResponse.json(
        { error: 'Project owner not found' },
        { status: 404 }
      );
    }

    // Check if this is a submission with answers (second call) or initial request (first call)
    const hasAnswers = clarificationAnswers && Object.keys(clarificationAnswers).length > 0;

    let analysis: OrchestratorResult;
    let suggestedPrice: number | null = null;

    // Project info for context
    const projectInfo = {
      name: project.name,
      description: project.description,
    };

    if (hasAnswers) {
      // =====================================================================
      // PHASE 2-6: Full Multi-Agent Analysis
      // Client provided answers - run complete scope creep pricing workflow
      // =====================================================================
      analysis = await analyzeRequestFull({
        requestText,
        clarificationAnswers,
        rules: rules as any,
        user: project.user,
        contextNotes: project.contextNotes || [],
      });

      suggestedPrice = analysis.suggestedPrice || null;
      console.log('Full analysis completed:', {
        suggestedPrice,
        hasBreakdown: !!analysis.priceBreakdown,
        estimatedHours: analysis.estimatedHours,
      });
    } else {
      // =====================================================================
      // PHASE 1: Information Gathering
      // No answers yet - generate clarification questions
      // =====================================================================
      const clarificationQuestions = await generateClarificationQuestions(
        requestText,
        rules as any,
        project.contextNotes || [],
        projectInfo
      );

      // Return pending_review with questions - freelancer will decide scope
      analysis = {
        verdict: 'pending_review',
        reasoning: 'This request has been submitted for review. Please answer the clarification questions below to help the freelancer understand your needs and provide an accurate quote.',
        scopeSummary: requestText,
        relevantRules: [],
        confidence: 1.0,
        clarificationQuestions,
      };
    }

    // SIMPLIFIED STATUS: AI never decides scope
    // - No answers yet = pending_questions (client needs to answer)
    // - Has answers = pending_freelancer_approval (freelancer decides scope)
    const status = hasAnswers ? 'pending_freelancer_approval' : 'pending_questions';

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
        estimatedHours: analysis.estimatedHours?.toString() || null,
        laborCost: analysis.priceBreakdown?.directCosts?.labor?.toString() || null,
        overheadCost: analysis.priceBreakdown?.indirectCosts?.pmOverhead?.toString() || null,
        profitAmount: analysis.priceBreakdown?.adjustments?.scopePremiumAmt?.toString() || null,

        // Buffer tracking
        baseSubtotal: analysis.priceBreakdown?.directCosts?.subtotal?.toString() || null,
        bufferPercentage: analysis.priceBreakdown?.adjustments?.riskPremiumPct?.toString() || null,
        bufferAmount: analysis.priceBreakdown?.adjustments?.riskPremiumAmt?.toString() || null,
        bufferReasoning: 'Market-informed pricing with complexity buffer',

        // AI analysis transparency fields (for freelancer review)
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
      // Always include suggestedPrice at top level for easy access
      pricing: {
        suggestedPrice: analysis.suggestedPrice || suggestedPrice,
        priceRange: analysis.priceRange,
        breakdown: analysis.priceBreakdown || null,
        confidence: analysis.confidence,
        estimatedHours: analysis.estimatedHours,
        // Transparency data for freelancer review
        reasoning: analysis.pricingReasoning,
        marketResearchSummary: analysis.marketResearchSummary,
        contextUsed: analysis.pricingContextUsed,
        improvementTips: analysis.improvementTips,
      },
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
