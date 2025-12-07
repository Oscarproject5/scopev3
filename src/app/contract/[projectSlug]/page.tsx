import { db, projects, users, projectRules } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { ContractClientPage } from './client-page';

interface PageProps {
  params: Promise<{ projectSlug: string }>;
}

export default async function ContractPage({ params }: PageProps) {
  const { projectSlug } = await params;

  // Fetch the project with user and rules
  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, projectSlug),
    with: {
      user: true,
      rules: true,
    },
  });

  if (!project || !project.rules) {
    notFound();
  }

  const user = project.user;
  const rules = project.rules;

  // Build contract data
  const contractData = {
    company: {
      name: user.companyName || user.name || 'Freelancer',
      logo: user.companyLogo || undefined,
      address: user.companyAddress || undefined,
      email: user.companyEmail || user.email,
      phone: user.companyPhone || undefined,
      website: user.companyWebsite || undefined,
    },
    client: {
      name: project.clientName || 'Client',
      email: project.clientEmail || undefined,
    },
    project: {
      name: project.name,
      description: project.description || undefined,
      contractValue: rules.originalContractPrice
        ? parseFloat(rules.originalContractPrice.toString())
        : undefined,
      currency: rules.currency || 'USD',
    },
    scope: {
      deliverables: (rules.deliverables as string[]) || [],
      revisionsIncluded: rules.revisionsIncluded || undefined,
      revisionsUsed: rules.revisionsUsed || 0,
      hourlyRate: rules.hourlyRate
        ? parseFloat(rules.hourlyRate.toString())
        : undefined,
      workingHours: rules.workingHours as {
        start: string;
        end: string;
        timezone: string;
      } | undefined,
      excludedDays: rules.excludedDays as string[] | undefined,
      customRules: rules.customRules as Array<{
        rule: string;
        description: string;
      }> | undefined,
      contractText: rules.contractText || undefined,
      rulesSummary: rules.rulesSummary || undefined,
    },
    createdAt: new Date(project.createdAt),
  };

  return (
    <ContractClientPage
      contractData={contractData}
      projectSlug={projectSlug}
    />
  );
}
