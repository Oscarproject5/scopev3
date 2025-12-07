import { notFound } from 'next/navigation';
import { db, projects } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { RequestPortal } from '@/components/request/request-portal';

export default async function RequestPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, slug),
    with: {
      rules: true,
      user: true,
    },
  });

  if (!project || !project.isActive) {
    notFound();
  }

  return (
    <RequestPortal
      project={{
        name: project.name,
        slug: project.slug,
        clientName: project.clientName,
        freelancerName: project.user?.name || 'The Freelancer',
        rules: project.rules,
        requireApproval: project.requireApproval || false,
      }}
    />
  );
}
