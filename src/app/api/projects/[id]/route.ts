import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, projects, projectRules } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

// GET /api/projects/[id] - Get a single project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.userId, session.user.id)),
      with: {
        rules: true,
        requests: {
          orderBy: (requests, { desc }) => [desc(requests.createdAt)],
          limit: 50,
        },
        contextNotes: {
          orderBy: (notes, { desc }) => [desc(notes.createdAt)],
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/projects/[id] - Update a project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Verify ownership
    const existing = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.userId, session.user.id)),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update project
    const { name, description, clientName, clientEmail, isActive, requireApproval } = body;
    await db.update(projects)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(clientName !== undefined && { clientName }),
        ...(clientEmail !== undefined && { clientEmail }),
        ...(isActive !== undefined && { isActive }),
        ...(requireApproval !== undefined && { requireApproval }),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id));

    // Update rules if provided
    const { hourlyRate, currency, revisionsIncluded, deliverables, customRules, workingHours, excludedDays, contractText } = body;
    if (hourlyRate !== undefined || currency !== undefined || revisionsIncluded !== undefined ||
        deliverables !== undefined || customRules !== undefined || workingHours !== undefined ||
        excludedDays !== undefined || contractText !== undefined) {
      await db.update(projectRules)
        .set({
          ...(hourlyRate !== undefined && { hourlyRate }),
          ...(currency !== undefined && { currency }),
          ...(revisionsIncluded !== undefined && { revisionsIncluded }),
          ...(deliverables !== undefined && { deliverables }),
          ...(customRules !== undefined && { customRules }),
          ...(workingHours !== undefined && { workingHours }),
          ...(excludedDays !== undefined && { excludedDays }),
          ...(contractText !== undefined && { contractText }),
          updatedAt: new Date(),
        })
        .where(eq(projectRules.projectId, id));
    }

    // Fetch updated project
    const updated = await db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: { rules: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existing = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.userId, session.user.id)),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await db.delete(projects).where(eq(projects.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
