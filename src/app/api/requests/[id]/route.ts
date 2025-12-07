import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, requests, projects } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { calculateAccuracyScore } from '@/lib/approval/router';

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
      with: { project: true },
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

        const originalAiPrice = req.quotedPrice ? parseFloat(req.quotedPrice) : 0;
        const finalPrice = customPrice !== undefined && customPrice !== null
          ? parseFloat(customPrice)
          : originalAiPrice;

        // Track if price was modified for learning
        const wasModified = customPrice !== undefined && customPrice !== null &&
          Math.abs(finalPrice - originalAiPrice) > 0.01;

        // Calculate accuracy score
        const accuracyScore = originalAiPrice > 0
          ? calculateAccuracyScore(originalAiPrice, finalPrice)
          : null;

        const updateData: Record<string, unknown> = {
          status: 'pending_client_approval',
          freelancerApproved: true,
          freelancerApprovedAt: new Date(),
          updatedAt: new Date(),
          freelancerModifiedPrice: wasModified,
          pricingAccuracyScore: accuracyScore?.toString() || null,
        };

        // If custom price is provided, update the quoted price and track final price
        if (customPrice !== undefined && customPrice !== null) {
          updateData.finalPrice = customPrice.toString();
          // Keep original AI price in quotedPrice for comparison
        }

        // If reason provided for modification
        if (body.modificationReason) {
          updateData.priceModificationReason = body.modificationReason;
        }

        await db.update(requests)
          .set(updateData)
          .where(eq(requests.id, id));
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
