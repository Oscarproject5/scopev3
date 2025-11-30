import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      companyName,
      companyLogo,
      companyAddress,
      companyEmail,
      companyPhone,
      companyWebsite,
      taxId,
    } = body;

    // Update user's company settings
    await db
      .update(users)
      .set({
        companyName: companyName || null,
        companyLogo: companyLogo || null,
        companyAddress: companyAddress || null,
        companyEmail: companyEmail || null,
        companyPhone: companyPhone || null,
        companyWebsite: companyWebsite || null,
        taxId: taxId || null,
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating company settings:', error);
    return NextResponse.json(
      { error: 'Failed to update company settings' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      companyName: user.companyName || '',
      companyLogo: user.companyLogo || '',
      companyAddress: user.companyAddress || '',
      companyEmail: user.companyEmail || user.email,
      companyPhone: user.companyPhone || '',
      companyWebsite: user.companyWebsite || '',
      taxId: user.taxId || '',
    });
  } catch (error) {
    console.error('Error fetching company settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company settings' },
      { status: 500 }
    );
  }
}
