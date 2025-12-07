import { auth } from '@/lib/auth';
import { db, projects, requests } from '@/lib/db';
import { eq, desc, and, gte } from 'drizzle-orm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FolderOpen, DollarSign, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Fetch user's projects
  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, session.user.id),
    with: { rules: true },
    orderBy: [desc(projects.createdAt)],
    limit: 5,
  });

  // Fetch recent requests across all projects
  const projectIds = userProjects.map(p => p.id);
  const recentRequests = projectIds.length > 0
    ? await db.query.requests.findMany({
        where: and(
          eq(requests.projectId, projectIds[0]), // Simplified for demo
        ),
        orderBy: [desc(requests.createdAt)],
        limit: 10,
      })
    : [];

  // Calculate stats
  const totalProjects = userProjects.length;
  const pendingRequests = recentRequests.filter(r =>
    r.status === 'pending' || r.status === 'pending_client_approval'
  ).length;
  const approvedRequests = recentRequests.filter(r =>
    r.status === 'approved' || r.status === 'paid'
  ).length;
  const totalEarnings = recentRequests
    .filter(r => r.status === 'paid' && r.finalPrice)
    .reduce((sum, r) => sum + parseFloat(r.finalPrice || '0'), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-slate-600">Welcome back! Here&apos;s your scope protection overview.</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <FolderOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalProjects}</p>
                <p className="text-sm text-slate-500">Active Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRequests}</p>
                <p className="text-sm text-slate-500">Pending Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedRequests}</p>
                <p className="text-sm text-slate-500">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${totalEarnings.toFixed(0)}</p>
                <p className="text-sm text-slate-500">Total Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects & Requests */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Projects</CardTitle>
              <CardDescription>Manage your client projects and rules</CardDescription>
            </div>
            <Link href="/dashboard/projects">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {userProjects.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-4">No projects yet</p>
                <Link href="/dashboard/projects/new">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    Create your first project
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {userProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-slate-500">{project.clientName || 'No client'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {project.rules?.hourlyRate && (
                        <Badge variant="secondary">${project.rules.hourlyRate}/hr</Badge>
                      )}
                      <Badge variant={project.isActive ? 'default' : 'secondary'}>
                        {project.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
            <CardDescription>Client requests awaiting action</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No requests yet</p>
                <p className="text-sm text-slate-400">Share your project links to start receiving requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRequests.slice(0, 5).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-start justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{request.requestText.slice(0, 50)}...</p>
                      <p className="text-sm text-slate-500">
                        {request.clientEmail || 'Anonymous'} • {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'Pending', variant: 'secondary' },
    in_scope: { label: 'In Scope', variant: 'default' },
    pending_client_approval: { label: 'Awaiting Client', variant: 'outline' },
    pending_freelancer_approval: { label: 'Review', variant: 'outline' },
    approved: { label: 'Approved', variant: 'default' },
    declined: { label: 'Declined', variant: 'destructive' },
    paid: { label: 'Paid', variant: 'default' },
  };

  const { label, variant } = config[status] || { label: status, variant: 'secondary' as const };

  return <Badge variant={variant}>{label}</Badge>;
}
