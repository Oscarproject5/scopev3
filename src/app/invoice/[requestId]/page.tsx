import { db, requests, projects, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { InvoiceClientPage } from './client-page';

interface PageProps {
  params: Promise<{ requestId: string }>;
}

export default async function InvoicePage({ params }: PageProps) {
  const { requestId } = await params;

  // Fetch the request with project and user data
  const request = await db.query.requests.findFirst({
    where: eq(requests.id, requestId),
    with: {
      project: {
        with: {
          user: true,
          rules: true,
        },
      },
    },
  });

  if (!request || !request.project) {
    notFound();
  }

  const user = request.project.user;
  const project = request.project;

  // Generate invoice number
  const invoiceNumber = `INV-${request.id.slice(0, 8).toUpperCase()}`;

  // Build invoice data
  const invoiceData = {
    invoice: {
      number: invoiceNumber,
      date: new Date(request.createdAt),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      status: request.status === 'paid' ? 'paid' as const : 'sent' as const,
    },
    company: {
      name: user.companyName || user.name || 'Freelancer',
      logo: user.companyLogo || undefined,
      address: user.companyAddress || undefined,
      email: user.companyEmail || user.email,
      phone: user.companyPhone || undefined,
      website: user.companyWebsite || undefined,
      taxId: user.taxId || undefined,
    },
    client: {
      name: request.clientName || 'Client',
      email: request.clientEmail || undefined,
      company: project.clientName || undefined,
    },
    project: {
      name: project.name,
      description: `Scope change request`,
    },
    items: [
      {
        description: 'Scope Change Request',
        details: request.requestText.slice(0, 200) + (request.requestText.length > 200 ? '...' : ''),
        quantity: request.estimatedHours ? parseFloat(request.estimatedHours) : undefined,
        rate: project.rules?.hourlyRate ? parseFloat(project.rules.hourlyRate.toString()) : undefined,
        amount: request.finalPrice
          ? parseFloat(request.finalPrice)
          : request.quotedPrice
            ? parseFloat(request.quotedPrice)
            : 0,
      },
    ],
    totals: {
      subtotal: request.finalPrice
        ? parseFloat(request.finalPrice)
        : request.quotedPrice
          ? parseFloat(request.quotedPrice)
          : 0,
      total: request.finalPrice
        ? parseFloat(request.finalPrice)
        : request.quotedPrice
          ? parseFloat(request.quotedPrice)
          : 0,
    },
    notes: 'Thank you for your business. Payment is due within 14 days.',
    terms: 'This invoice is for work performed outside the original scope of the project agreement.',
    currency: project.rules?.currency || 'USD',
  };

  return (
    <InvoiceClientPage
      invoiceData={invoiceData}
      requestId={requestId}
    />
  );
}
