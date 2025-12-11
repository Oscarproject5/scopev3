import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, requests, projects } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { calculateAccuracyScore } from '@/lib/approval/router';
import { sendQuoteApprovalEmail } from '@/lib/email/resend';

// GET /api/requests/[id] - Get a single request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const req = await db.query.requests.findFirst({
      where: eq(requests.id, id),
      with: {
        project: true,
      },
    });

    if (!req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json(req);
  } catch (error) {
    console.error('Error fetching request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/requests/[id] - Update a request (approve, decline, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, clientEmail, customPrice } = body;

    const req = await db.query.requests.findFirst({
      where: eq(requests.id, id),
      with: {
        project: {
          with: {
            user: true,
          },
        },
      },
    });

    if (!req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Handle different actions
    switch (action) {
      case 'freelancer_approve': {
        // Verify freelancer owns this project
        const session = await auth();
        if (!session?.user?.id || req.project.userId !== session.user.id) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get AI's suggested price from aiAnalysis (not quotedPrice, which is now only set after freelancer approves)
        const aiAnalysis = req.aiAnalysis as any;
        const aiSuggestedPrice = aiAnalysis?.suggestedPrice || 0;

        // If freelancer provided a custom price, use that; otherwise use AI's suggestion
        const approvedPrice = customPrice !== undefined && customPrice !== null
          ? parseFloat(customPrice)
          : aiSuggestedPrice;

        // Track if price was modified from AI suggestion for learning
        const wasModified = customPrice !== undefined && customPrice !== null &&
          Math.abs(approvedPrice - aiSuggestedPrice) > 0.01;

        // Calculate accuracy score (how close AI was to what freelancer actually approved)
        const accuracyScore = aiSuggestedPrice > 0
          ? calculateAccuracyScore(aiSuggestedPrice, approvedPrice)
          : null;

        const updateData: Record<string, unknown> = {
          status: 'pending_client_approval',
          freelancerApproved: true,
          freelancerApprovedAt: new Date(),
          updatedAt: new Date(),
          freelancerModifiedPrice: wasModified,
          pricingAccuracyScore: accuracyScore?.toString() || null,
          // Set the quotedPrice now that freelancer has approved (this is what client sees)
          quotedPrice: approvedPrice.toString(),
        };

        // If custom price differs from AI, also track finalPrice and the AI's original suggestion
        if (wasModified) {
          updateData.finalPrice = approvedPrice.toString();
        }

        // If reason provided for modification
        if (body.modificationReason) {
          updateData.priceModificationReason = body.modificationReason;
        }

        await db.update(requests)
          .set(updateData)
          .where(eq(requests.id, id));

        // Send email to client if they provided an email
        if (req.clientEmail) {
          const freelancerName = req.project.user?.name ||
                                 req.project.user?.companyName ||
                                 'Your freelancer';

          // Build invoice URL
          const baseUrl = request.headers.get('origin') ||
                          request.headers.get('x-forwarded-host') ||
                          process.env.NEXT_PUBLIC_APP_URL ||
                          'http://localhost:3000';
          const invoiceUrl = `${baseUrl}/invoice/${id}`;

          // Send email (don't await - fire and forget to not slow down response)
          sendQuoteApprovalEmail({
            clientEmail: req.clientEmail,
            clientName: req.clientName,
            freelancerName,
            projectName: req.project.name,
            requestText: req.requestText,
            quotedPrice: approvedPrice,
            requestId: id,
            invoiceUrl,
          }).then(result => {
            if (!result.success) {
              console.error('[API] Failed to send quote approval email:', result.error);
            }
          }).catch(err => {
            console.error('[API] Error sending quote approval email:', err);
          });
        }

        break;
      }

      case 'freelancer_decline': {
        const session = await auth();
        if (!session?.user?.id || req.project.userId !== session.user.id) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await db.update(requests)
          .set({
            status: 'declined',
            updatedAt: new Date(),
          })
          .where(eq(requests.id, id));
        break;
      }

      case 'client_approve': {
        await db.update(requests)
          .set({
            status: 'approved',
            clientApproved: true,
            clientApprovedAt: new Date(),
            clientEmail: clientEmail || req.clientEmail,
            updatedAt: new Date(),
          })
          .where(eq(requests.id, id));
        break;
      }

      case 'client_decline': {
        await db.update(requests)
          .set({
            status: 'declined',
            clientApproved: false,
            updatedAt: new Date(),
          })
          .where(eq(requests.id, id));
        break;
      }

      case 'mark_paid': {
        const session = await auth();
        if (!session?.user?.id || req.project.userId !== session.user.id) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use finalPrice if modified, otherwise quotedPrice
        const paidPrice = req.finalPrice || req.quotedPrice;
        const originalAiPrice = req.quotedPrice ? parseFloat(req.quotedPrice) : 0;
        const actualPaidPrice = paidPrice ? parseFloat(paidPrice) : 0;

        // Calculate final accuracy score if not already set
        const accuracyScore = !req.pricingAccuracyScore && originalAiPrice > 0
          ? calculateAccuracyScore(originalAiPrice, actualPaidPrice)
          : req.pricingAccuracyScore;

        await db.update(requests)
          .set({
            status: 'paid',
            paidAt: new Date(),
            finalPrice: paidPrice,
            pricingAccuracyScore: accuracyScore?.toString() || null,
            updatedAt: new Date(),
          })
          .where(eq(requests.id, id));
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Fetch updated request
    const updated = await db.query.requests.findFirst({
      where: eq(requests.id, id),
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
