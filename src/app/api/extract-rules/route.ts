import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { extractRulesFromContract } from '@/lib/ai/scope-analyzer';

// POST /api/extract-rules - Extract rules from uploaded contract text
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contractText } = body;

    if (!contractText) {
      return NextResponse.json(
        { error: 'Contract text is required' },
        { status: 400 }
      );
    }

    const extractedRules = await extractRulesFromContract(contractText);

    return NextResponse.json(extractedRules);
  } catch (error) {
    console.error('Error extracting rules:', error);
    return NextResponse.json(
      { error: 'Failed to extract rules' },
      { status: 500 }
    );
  }
}
