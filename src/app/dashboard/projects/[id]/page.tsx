import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db, projects, requests as requestsTable } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Link as LinkIcon, ExternalLink, CheckCircle2, XCircle, Clock, DollarSign, FileText, Receipt } from 'lucide-react';
import { CopyLinkButton } from '@/components/dashboard/copy-link-button';
import { RequestActions } from '@/components/dashboard/request-actions';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, id), eq(projects.userId, session.user.id)),
    with: {
      rules: true,
      requests: {
        orderBy: [desc(requestsTable.createdAt)],
      },
      contextNotes: true,
    },
  });

  if (!project) {
    notFound();
  }

  const requestLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/request/${project.slug}`;

  const stats = {
    total: project.requests?.length || 0,
    inScope: project.requests?.filter(r => r.status === 'in_scope').length || 0,
    pending: project.requests?.filter(r => r.status.includes('pending')).length || 0,
    paid: project.requests?.filter(r => r.status === 'paid').length || 0,
    totalEarned: project.requests
      ?.filter(r => r.status === 'paid' && r.finalPrice)
      .reduce((sum, r) => sum + parseFloat(r.finalPrice || '0'), 0) || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <Badge variant={project.isActive ? 'default' : 'secondary'}>
                {project.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-slate-600">{project.clientName || 'No client assigned'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/contract/${project.slug}`} target="_blank">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              View Contract
            </Button>
          </Link>
          <Link href={`/request/${project.slug}`} target="_blank">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Preview Portal
            </Button>
          </Link>
        </div>
      </div>

      {/* Links Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Request Link */}
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg">
                  <LinkIcon className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-emerald-900">Client Request Link</p>
                  <code className="text-sm text-emerald-700">{requestLink}</code>
                </div>
              </div>
              <CopyLinkButton link={requestLink} />
            </div>
          </CardContent>
        </Card>

        {/* Contract/Scope Document */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-blue-900">Scope of Work Contract</p>
                  <p className="text-sm text-blue-700">Send to client with deliverables & terms</p>
                </div>
              </div>
              <Link href={`/contract/${project.slug}`} target="_blank">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1">
                  <FileText className="h-4 w-4" />
                  View & Download
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-slate-500">Total Requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.inScope}</p>
            <p className="text-sm text-slate-500">In Scope</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-sm text-slate-500">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.paid}</p>
            <p className="text-sm text-slate-500">Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">${stats.totalEarned.toFixed(0)}</p>
            <p className="text-sm text-slate-500">Earned</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Client Requests</CardTitle>
              <CardDescription>All requests submitted through your portal</CardDescription>
            </CardHeader>
            <CardContent>
              {!project.requests || project.requests.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-2">No requests yet</p>
                  <p className="text-sm text-slate-400">Share your link to start receiving requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {project.requests.map((request) => (
                    <div
                      key={request.id}
                      className="p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-medium mb-1">{request.requestText}</p>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span>{request.clientEmail || 'Anonymous'}</span>
                            <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <StatusBadge status={request.status} />
                      </div>

                      {request.aiAnalysis && (
                        <div className="p-3 bg-slate-50 rounded-lg mb-3">
                          <p className="text-sm font-medium mb-1">AI Analysis</p>
                          <p className="text-sm text-slate-600">
                            {(request.aiAnalysis as any).reasoning}
                          </p>
                          {request.quotedPrice && (
                            <p className="text-sm font-medium text-emerald-600 mt-2">
                              Quoted: ${request.quotedPrice}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Pricing Transparency Section */}
                      {(request.pricingContextUsed || request.pricingReasoning) && (
                        <div className="p-3 bg-blue-50 rounded-lg mb-3 border border-blue-100">
                          <p className="text-sm font-medium text-blue-900 mb-2">Pricing Context Used</p>

                          {request.pricingContextUsed && (
                            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                              {(request.pricingContextUsed as any).freelancerLocation && (
                                <div>
                                  <span className="text-blue-700">Your Location:</span>{' '}
                                  <span className="text-blue-900">{(request.pricingContextUsed as any).freelancerLocation}</span>
                                </div>
                              )}
                              {(request.pricingContextUsed as any).freelancerSpecializations?.length > 0 && (
                                <div>
                                  <span className="text-blue-700">Specializations:</span>{' '}
                                  <span className="text-blue-900">{(request.pricingContextUsed as any).freelancerSpecializations.join(', ')}</span>
                                </div>
                              )}
                              {(request.pricingContextUsed as any).projectType && (
                                <div>
                                  <span className="text-blue-700">Project Type:</span>{' '}
                                  <span className="text-blue-900">{(request.pricingContextUsed as any).projectType}</span>
                                </div>
                              )}
                              {(request.pricingContextUsed as any).originalContractPrice && (
                                <div>
                                  <span className="text-blue-700">Original Contract:</span>{' '}
                                  <span className="text-blue-900">${(request.pricingContextUsed as any).originalContractPrice}</span>
                                </div>
                              )}
                              {(request.pricingContextUsed as any).freelancerPositioning && (
                                <div>
                                  <span className="text-blue-700">Positioning:</span>{' '}
                                  <span className="text-blue-900 capitalize">{(request.pricingContextUsed as any).freelancerPositioning}</span>
                                </div>
                              )}
                              {(request.pricingContextUsed as any).hourlyRate && (
                                <div>
                                  <span className="text-blue-700">Hourly Rate:</span>{' '}
                                  <span className="text-blue-900">${(request.pricingContextUsed as any).hourlyRate}/hr</span>
                                </div>
                              )}
                            </div>
                          )}

                          {request.pricingReasoning && (
                            <div className="border-t border-blue-200 pt-2 mt-2">
                              <p className="text-sm font-medium text-blue-800 mb-1">How This Price Was Calculated</p>
                              <p className="text-sm text-blue-700">{request.pricingReasoning}</p>
                            </div>
                          )}

                          {request.marketResearchData && (request.marketResearchData as any).marketInsights?.length > 0 && (
                            <div className="border-t border-blue-200 pt-2 mt-2">
                              <p className="text-sm font-medium text-blue-800 mb-1">Market Research</p>
                              <ul className="text-sm text-blue-700 list-disc list-inside">
                                {(request.marketResearchData as any).marketInsights.map((insight: string, i: number) => (
                                  <li key={i}>{insight}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <RequestActions request={request} />

                        {/* Document Links - Always show invoice link if there's a quoted price */}
                        {request.quotedPrice && (
                          <Link href={`/invoice/${request.id}`} target="_blank">
                            <Button size="sm" variant="outline" className="gap-1 text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300">
                              <Receipt className="h-4 w-4" />
                              View Invoice
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Project Rules</CardTitle>
              <CardDescription>The &quot;rulebook&quot; AI uses to evaluate requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Hourly Rate</p>
                  <p className="text-2xl font-bold">
                    {project.rules?.hourlyRate ? `$${project.rules.hourlyRate}/hr` : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Revisions</p>
                  <p className="text-2xl font-bold">
                    {project.rules?.revisionsUsed || 0} / {project.rules?.revisionsIncluded || 0}
                    <span className="text-base font-normal text-slate-500 ml-2">used</span>
                  </p>
                </div>
              </div>

              {project.rules?.deliverables && (project.rules.deliverables as string[]).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">Included Deliverables</p>
                  <div className="flex flex-wrap gap-2">
                    {(project.rules.deliverables as string[]).map((d, i) => (
                      <Badge key={i} variant="secondary">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {project.rules?.customRules && (project.rules.customRules as any[]).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">Custom Rules</p>
                  <div className="space-y-2">
                    {(project.rules.customRules as { rule: string; description: string }[]).map((rule, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-lg">
                        <p className="font-medium">{rule.rule}</p>
                        <p className="text-sm text-slate-600">{rule.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Project Settings</CardTitle>
              <CardDescription>Configure project behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Project Status</p>
                  <p className="text-sm text-slate-500">
                    {project.isActive ? 'Accepting requests' : 'Not accepting requests'}
                  </p>
                </div>
                <Badge variant={project.isActive ? 'default' : 'secondary'}>
                  {project.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Freelancer Approval Required</p>
                  <p className="text-sm text-slate-500">
                    {project.requireApproval ? 'You review quotes before clients see them' : 'Clients see quotes immediately'}
                  </p>
                </div>
                <Badge variant={project.requireApproval ? 'default' : 'secondary'}>
                  {project.requireApproval ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-slate-100 text-slate-700' },
    in_scope: { label: 'In Scope', className: 'bg-emerald-100 text-emerald-700' },
    out_of_scope: { label: 'Out of Scope', className: 'bg-amber-100 text-amber-700' },
    pending_client_approval: { label: 'Awaiting Client', className: 'bg-blue-100 text-blue-700' },
    pending_freelancer_approval: { label: 'Review Needed', className: 'bg-purple-100 text-purple-700' },
    approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700' },
    declined: { label: 'Declined', className: 'bg-red-100 text-red-700' },
    paid: { label: 'Paid', className: 'bg-green-100 text-green-700' },
  };

  const { label, className } = config[status] || { label: status, className: 'bg-slate-100 text-slate-700' };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
