import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// POST /api/extract-contract - Extract project info from uploaded contract file
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Extract text based on file type
    let contractText = '';

    if (file.type === 'text/plain') {
      contractText = await file.text();
    } else if (file.type === 'application/pdf') {
      // For PDF, we'll just pass it directly to Claude which can read PDFs
      // Or we extract the text content
      contractText = await extractTextFromPDF(file);
    } else if (
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      // For Word docs, try to extract text
      contractText = await extractTextFromDoc(file);
    }

    if (!contractText.trim()) {
      return NextResponse.json(
        { error: 'Could not extract text from file' },
        { status: 400 }
      );
    }

    // Use Claude to analyze the contract
    const extractedData = await analyzeContractForProjectSetup(contractText);

    return NextResponse.json(extractedData);
  } catch (error) {
    console.error('Error extracting contract:', error);
    return NextResponse.json(
      { error: 'Failed to extract contract data' },
      { status: 500 }
    );
  }
}

async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Use pdf-parse if available, otherwise return buffer for Claude
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Try dynamic import of pdf-parse
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      return data.text;
    } catch {
      // If pdf-parse is not available, return base64 for Claude to analyze
      return buffer.toString('base64').slice(0, 50000); // Limit size
    }
  } catch (error) {
    console.error('PDF extraction error:', error);
    return '';
  }
}

async function extractTextFromDoc(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Try mammoth for docx files
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch {
      // Fallback: try to extract plain text from the file
      return buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    }
  } catch (error) {
    console.error('Doc extraction error:', error);
    return '';
  }
}

async function analyzeContractForProjectSetup(contractText: string): Promise<{
  scope?: string;
  clientName?: string;
  contractValue?: number;
  hourlyRate?: number;
  industryType?: string;
}> {
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic();

    const systemPrompt = `You are an expert at analyzing contracts and proposals. Extract key project information for setting up a new freelance project.

Respond with ONLY valid JSON (no markdown):
{
  "scope": "Brief summary of what's included and excluded from the project scope",
  "clientName": "The client or company name if mentioned",
  "contractValue": number or null (total project value in dollars),
  "hourlyRate": number or null (hourly rate if mentioned),
  "industryType": "The type of service/industry (e.g., Web Design, Landscaping, Legal Services)"
}

If a field cannot be determined, use null.`;

    const userPrompt = `Analyze this contract/proposal and extract the project setup information:

"""
${contractText.slice(0, 10000)}
"""`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let result = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        result += block.text;
      }
    }

    // Parse JSON from response
    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result];
    const parsed = JSON.parse(jsonMatch[1]?.trim() || result.trim());

    return {
      scope: parsed.scope || undefined,
      clientName: parsed.clientName || undefined,
      contractValue: parsed.contractValue || undefined,
      hourlyRate: parsed.hourlyRate || undefined,
      industryType: parsed.industryType || undefined,
    };
  } catch (error) {
    console.error('Contract analysis error:', error);
    return {};
  }
}
