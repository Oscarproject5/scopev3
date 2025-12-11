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

    // Project info for context
    const projectInfo = {
      name: project.name,
      description: project.description,
    };

    if (hasAnswers) {
      // =====================================================================
      // FAST PATH: Save request immediately, process AI in background
      // Client doesn't wait for AI analysis - it happens async
      // =====================================================================

      // Save the request immediately with 'analyzing' status
      const [savedRequest] = await db.insert(requests).values({
        projectId: project.id,
        clientName: clientName || null,
        clientEmail: clientEmail || null,
        requestText,
        status: 'analyzing', // New status: AI is processing
        isInScope: null,
        aiAnalysis: {
          verdict: 'pending_review',
          reasoning: 'AI analysis in progress...',
          scopeSummary: requestText,
          relevantRules: [],
          confidence: 0,
          clarificationAnswers,
        },
        quotedPrice: null,
        freelancerApproved: null,
        freelancerApprovedAt: null,
      }).returning();

      // Trigger background analysis (fire and forget)
      // Using fetch to call our own API endpoint
      const baseUrl = request.headers.get('origin') ||
                      request.headers.get('x-forwarded-host') ||
                      'http://localhost:3000';

      // Fire off background analysis - don't await
      fetch(`${baseUrl}/api/analyze/background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: savedRequest.id,
          requestText,
          clarificationAnswers,
          projectId: project.id,
        }),
      }).catch(err => {
        console.error('Failed to trigger background analysis:', err);
      });

      // Return immediately to client
      return NextResponse.json({
        analysis: {
          verdict: 'pending_review',
          reasoning: 'Your request has been submitted! The freelancer will review it shortly.',
          scopeSummary: requestText,
          relevantRules: [],
          confidence: 1.0,
          clarificationAnswers,
        },
        request: savedRequest,
        project: {
          name: project.name,
          clientName: project.clientName,
        },
        // No pricing yet - will be available after analysis completes
        pricing: null,
        status: 'analyzing',
      });
    } else {
      // =====================================================================
      // PHASE 1: Information Gathering (this is fast, ~2-3 seconds)
      // No answers yet - generate clarification questions
      // =====================================================================
      const clarificationQuestions = await generateClarificationQuestions(
        requestText,
        rules as any,
        project.contextNotes || [],
        projectInfo
      );

      // Return pending_review with questions - freelancer will decide scope
      const analysis: OrchestratorResult = {
        verdict: 'pending_review',
        reasoning: 'This request has been submitted for review. Please answer the clarification questions below to help the freelancer understand your needs and provide an accurate quote.',
        scopeSummary: requestText,
        relevantRules: [],
        confidence: 1.0,
        clarificationQuestions,
      };

      // Don't save yet - wait for answers
      return NextResponse.json({
        analysis,
        request: null,
        project: {
          name: project.name,
          clientName: project.clientName,
        },
        pricing: null,
      });
    }
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
