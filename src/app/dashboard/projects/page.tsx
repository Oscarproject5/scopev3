import { auth } from '@/lib/auth';
import { db, projects } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FolderOpen, Link as LinkIcon, Copy } from 'lucide-react';
import { CopyLinkButton } from '@/components/dashboard/copy-link-button';

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, session.user.id),
    with: { rules: true, requests: true },
    orderBy: [desc(projects.createdAt)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-slate-600">Manage your client projects and scope rules</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {userProjects.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Create your first project to start protecting your scope. Set your rules, share your link, and let AI handle the pricing.
            </p>
            <Link href="/dashboard/projects/new">
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                Create Your First Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userProjects.map((project) => {
            const requestLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/request/${project.slug}`;
            const pendingCount = project.requests?.filter(r =>
              r.status === 'pending' || r.status === 'pending_client_approval'
            ).length || 0;

            return (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{project.name}</h3>
                      <p className="text-sm text-slate-500">{project.clientName || 'No client assigned'}</p>
                    </div>
                    <Badge variant={project.isActive ? 'default' : 'secondary'}>
                      {project.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Hourly Rate</span>
                      <span className="font-medium">
                        {project.rules?.hourlyRate ? `$${project.rules.hourlyRate}/hr` : 'Not set'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Revisions</span>
                      <span className="font-medium">
                        {project.rules?.revisionsUsed || 0} / {project.rules?.revisionsIncluded || 0} used
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Pending Requests</span>
                      <Badge variant={pendingCount > 0 ? 'destructive' : 'secondary'}>
                        {pendingCount}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg mb-4">
                    <LinkIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <code className="text-xs text-slate-600 truncate flex-1">/request/{project.slug}</code>
                    <CopyLinkButton link={requestLink} />
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/dashboard/projects/${project.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">Manage</Button>
                    </Link>
                    <Link href={`/request/${project.slug}`} target="_blank" className="flex-1">
                      <Button variant="secondary" className="w-full">Preview</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
