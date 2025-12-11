import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, projects, projectRules } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// GET /api/projects - List all projects for current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userProjects = await db.query.projects.findMany({
      where: eq(projects.userId, session.user.id),
      with: {
        rules: true,
      },
      orderBy: (projects, { desc }) => [desc(projects.createdAt)],
    });

    return NextResponse.json(userProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      clientName,
      clientEmail,
      requireApproval,
      hourlyRate,
      revisionsIncluded,
      deliverables,
      customRules,
      // New pricing context fields
      originalContractPrice,
      projectType,
      clientLocation,
      projectTimeline,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    // Generate unique slug
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = `${baseSlug}-${nanoid(6)}`;

    // Create project
    const [project] = await db.insert(projects).values({
      userId: session.user.id,
      name,
      slug,
      description,
      clientName,
      clientEmail,
      requireApproval: requireApproval !== undefined ? requireApproval : true,
    }).returning();

    // Create project rules
    await db.insert(projectRules).values({
      projectId: project.id,
      hourlyRate: hourlyRate || null,
      revisionsIncluded: revisionsIncluded || 2,
      deliverables: deliverables || [],
      customRules: customRules || [],
      // New pricing context fields
      originalContractPrice: originalContractPrice || null,
      projectType: projectType || null,
      clientLocation: clientLocation || null,
      projectTimeline: projectTimeline || null,
    });

    // Fetch complete project with rules
    const completeProject = await db.query.projects.findFirst({
      where: eq(projects.id, project.id),
      with: { rules: true },
    });

    return NextResponse.json(completeProject, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
