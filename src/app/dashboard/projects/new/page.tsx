'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Loader2, Plus, X, Sparkles, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function NewProjectPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [revisionsIncluded, setRevisionsIncluded] = useState('2');
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [newDeliverable, setNewDeliverable] = useState('');
  const [customRules, setCustomRules] = useState<{ rule: string; description: string }[]>([]);
  const [contractText, setContractText] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);

  // New pricing context fields
  const [originalContractPrice, setOriginalContractPrice] = useState('');
  const [projectType, setProjectType] = useState('');
  const [clientLocation, setClientLocation] = useState('');
  const [projectTimeline, setProjectTimeline] = useState('');

  const addDeliverable = () => {
    if (newDeliverable.trim()) {
      setDeliverables([...deliverables, newDeliverable.trim()]);
      setNewDeliverable('');
    }
  };

  const removeDeliverable = (index: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== index));
  };

  const addCustomRule = () => {
    setCustomRules([...customRules, { rule: '', description: '' }]);
  };

  const updateCustomRule = (index: number, field: 'rule' | 'description', value: string) => {
    const updated = [...customRules];
    updated[index][field] = value;
    setCustomRules(updated);
  };

  const removeCustomRule = (index: number) => {
    setCustomRules(customRules.filter((_, i) => i !== index));
  };

  const extractRulesFromContract = async () => {
    if (!contractText.trim()) {
      toast.error('Please paste your contract text first');
      return;
    }

    setIsExtracting(true);
    try {
      const response = await fetch('/api/extract-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractText }),
      });

      if (!response.ok) throw new Error('Failed to extract rules');

      const data = await response.json();

      if (data.hourlyRate) setHourlyRate(data.hourlyRate.toString());
      if (data.revisionsIncluded) setRevisionsIncluded(data.revisionsIncluded.toString());
      if (data.deliverables) setDeliverables(data.deliverables);
      if (data.customRules) setCustomRules(data.customRules);

      toast.success('Rules extracted from contract!');
    } catch (error) {
      toast.error('Failed to extract rules. Please enter them manually.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          clientName,
          clientEmail,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
          revisionsIncluded: parseInt(revisionsIncluded) || 2,
          deliverables,
          customRules: customRules.filter(r => r.rule.trim()),
          requireApproval,
          // New pricing context fields
          originalContractPrice: originalContractPrice ? parseFloat(originalContractPrice) : null,
          projectType: projectType || null,
          clientLocation: clientLocation || null,
          projectTimeline: projectTimeline || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to create project');

      const project = await response.json();
      toast.success('Project created successfully!');
      router.push(`/dashboard/projects/${project.id}`);
    } catch (error) {
      toast.error('Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Project</h1>
          <p className="text-slate-600">Set up your project rules and scope boundaries</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="rules">Rules & Rates</TabsTrigger>
            <TabsTrigger value="pricing">Pricing Context</TabsTrigger>
            <TabsTrigger value="contract">Contract Import</TabsTrigger>
          </TabsList>

          <TabsContent value="basics">
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
                <CardDescription>Basic information about your project</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Website Redesign for Acme Corp"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the project scope..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Client Name</Label>
                    <Input
                      id="clientName"
                      placeholder="John Smith"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientEmail">Client Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      placeholder="john@example.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">Require Your Approval</p>
                    <p className="text-sm text-slate-500">Review AI quotes before clients see them</p>
                  </div>
                  <Switch
                    checked={requireApproval}
                    onCheckedChange={setRequireApproval}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Rules</CardTitle>
                <CardDescription>Define what&apos;s in scope and your rates for extras</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      placeholder="100"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">For out-of-scope work</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="revisions">Revisions Included</Label>
                    <Input
                      id="revisions"
                      type="number"
                      placeholder="2"
                      value={revisionsIncluded}
                      onChange={(e) => setRevisionsIncluded(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">Free revision rounds</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Included Deliverables</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., 1 Homepage Design"
                      value={newDeliverable}
                      onChange={(e) => setNewDeliverable(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDeliverable())}
                    />
                    <Button type="button" variant="outline" onClick={addDeliverable}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {deliverables.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm"
                      >
                        {d}
                        <button type="button" onClick={() => removeDeliverable(i)}>
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Custom Rules</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addCustomRule}>
                      <Plus className="h-4 w-4 mr-1" /> Add Rule
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {customRules.map((rule, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Rule name (e.g., No Weekend Work)"
                            value={rule.rule}
                            onChange={(e) => updateCustomRule(i, 'rule', e.target.value)}
                          />
                          <Input
                            placeholder="Description (e.g., Work delivered Mon-Fri only)"
                            value={rule.description}
                            onChange={(e) => updateCustomRule(i, 'description', e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCustomRule(i)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle>Pricing Context</CardTitle>
                <CardDescription>
                  Help the AI price scope changes accurately by providing context about your project and client.
                  The more information you provide, the more accurate the pricing will be.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-800">
                    <strong>Why does this matter?</strong> The AI uses this context to perform market research
                    and calculate fair prices. You&apos;ll see exactly what information is used when pricing
                    scope changes.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="originalContractPrice">Original Contract Value ($)</Label>
                    <Input
                      id="originalContractPrice"
                      type="number"
                      placeholder="5000"
                      value={originalContractPrice}
                      onChange={(e) => setOriginalContractPrice(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">
                      What was the original contract price? Helps calculate proportional scope changes.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectType">Project Type</Label>
                    <select
                      id="projectType"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value)}
                    >
                      <option value="">Select project type...</option>
                      <option value="website">Website</option>
                      <option value="mobile-app">Mobile App</option>
                      <option value="design">Design</option>
                      <option value="backend-api">Backend / API</option>
                      <option value="full-stack">Full Stack Application</option>
                      <option value="consulting">Consulting</option>
                      <option value="ecommerce">E-commerce</option>
                      <option value="wordpress">WordPress</option>
                      <option value="other">Other</option>
                    </select>
                    <p className="text-xs text-slate-500">
                      What type of project is this? Enables industry-specific pricing.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientLocation">Client Location</Label>
                    <Input
                      id="clientLocation"
                      placeholder="e.g., New York, NY or London, UK"
                      value={clientLocation}
                      onChange={(e) => setClientLocation(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">
                      Where is your client based? Affects budget expectations.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectTimeline">Project Timeline</Label>
                    <select
                      id="projectTimeline"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={projectTimeline}
                      onChange={(e) => setProjectTimeline(e.target.value)}
                    >
                      <option value="">Select timeline...</option>
                      <option value="1-week">1 Week</option>
                      <option value="2-weeks">2 Weeks</option>
                      <option value="1-month">1 Month</option>
                      <option value="2-3-months">2-3 Months</option>
                      <option value="6-months">6 Months</option>
                      <option value="ongoing">Ongoing / Retainer</option>
                    </select>
                    <p className="text-xs text-slate-500">
                      How long is this project? Longer projects may have different scope change dynamics.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contract">
            <Card>
              <CardHeader>
                <CardTitle>Import from Contract</CardTitle>
                <CardDescription>Paste your contract text and let AI extract the rules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contract">Contract Text</Label>
                  <Textarea
                    id="contract"
                    placeholder="Paste your contract, proposal, or scope of work here..."
                    className="min-h-[200px]"
                    value={contractText}
                    onChange={(e) => setContractText(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={extractRulesFromContract}
                  disabled={isExtracting || !contractText.trim()}
                  className="w-full"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Extracting rules...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Extract Rules with AI
                    </>
                  )}
                </Button>
                <p className="text-xs text-slate-500 text-center">
                  AI will analyze your contract and populate the Rules & Rates tab
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4 mt-6">
          <Link href="/dashboard/projects">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Project'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
