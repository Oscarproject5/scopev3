'use client';

import { DocumentViewer } from '@/components/documents/document-viewer';
import { ContractScope } from '@/components/documents/contract-scope';

interface ContractClientPageProps {
  contractData: {
    company: {
      name: string;
      logo?: string;
      address?: string;
      email?: string;
      phone?: string;
      website?: string;
    };
    client: {
      name: string;
      email?: string;
      company?: string;
    };
    project: {
      name: string;
      description?: string;
      startDate?: Date;
      endDate?: Date;
      contractValue?: number;
      currency?: string;
    };
    scope: {
      deliverables: string[];
      revisionsIncluded?: number;
      revisionsUsed?: number;
      hourlyRate?: number;
      workingHours?: {
        start: string;
        end: string;
        timezone: string;
      };
      excludedDays?: string[];
      customRules?: Array<{
        rule: string;
        description: string;
      }>;
      contractText?: string;
      rulesSummary?: string;
    };
    createdAt?: Date;
  };
  projectSlug: string;
}

export function ContractClientPage({ contractData, projectSlug }: ContractClientPageProps) {
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/contract/${projectSlug}`
    : undefined;

  const handleSendEmail = async (email: string) => {
    // TODO: Implement email sending
    console.log('Sending contract to:', email);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <DocumentViewer
      title={`Scope of Work - ${contractData.project.name}`}
      filename={`scope-${projectSlug}`}
      shareUrl={shareUrl}
      onSendEmail={handleSendEmail}
    >
      <ContractScope {...contractData} />
    </DocumentViewer>
  );
}
