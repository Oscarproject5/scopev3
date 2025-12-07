'use client';

import { DocumentViewer } from '@/components/documents/document-viewer';
import { Invoice } from '@/components/documents/invoice';

interface InvoiceClientPageProps {
  invoiceData: {
    invoice: {
      number: string;
      date: Date;
      dueDate?: Date;
      status: 'draft' | 'sent' | 'paid' | 'overdue';
    };
    company: {
      name: string;
      logo?: string;
      address?: string;
      email?: string;
      phone?: string;
      website?: string;
      taxId?: string;
    };
    client: {
      name: string;
      email?: string;
      company?: string;
      address?: string;
    };
    project: {
      name: string;
      description?: string;
    };
    items: Array<{
      description: string;
      details?: string;
      quantity?: number;
      rate?: number;
      amount: number;
    }>;
    totals: {
      subtotal: number;
      tax?: number;
      taxRate?: number;
      discount?: number;
      total: number;
    };
    notes?: string;
    terms?: string;
    currency?: string;
  };
  requestId: string;
}

export function InvoiceClientPage({ invoiceData, requestId }: InvoiceClientPageProps) {
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/invoice/${requestId}`
    : undefined;

  const handleSendEmail = async (email: string) => {
    // TODO: Implement email sending
    console.log('Sending invoice to:', email);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <DocumentViewer
      title={`Invoice ${invoiceData.invoice.number}`}
      filename={`invoice-${invoiceData.invoice.number}`}
      shareUrl={shareUrl}
      onSendEmail={handleSendEmail}
    >
      <Invoice {...invoiceData} />
    </DocumentViewer>
  );
}
