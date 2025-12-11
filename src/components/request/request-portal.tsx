'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Send, Loader2, CheckCircle2, AlertCircle, DollarSign, ArrowRight, Clock } from 'lucide-react';
import type { ProjectRules } from '@/lib/db/schema';

interface RequestPortalProps {
  project: {
    name: string;
    slug: string;
    clientName: string | null;
    freelancerName: string;
    rules: ProjectRules | null;
    requireApproval: boolean; // If true, don't show price to client until freelancer approves
  };
}

interface ClarificationQuestion {
  id: string;
  question: string;
  helpText?: string;
  type: 'text' | 'select' | 'multiselect';
  options?: string[];
}

interface AnalysisResult {
  analysis: {
    verdict: 'in_scope' | 'out_of_scope' | 'needs_clarification' | 'pending_review';
    reasoning: string;
    scopeSummary?: string;
    relevantRules: string[];
    estimatedHours?: number;
    suggestedPrice?: number;
    revisionCount?: string;
    confidence: number;
    clarificationQuestions?: ClarificationQuestion[];
  };
  request: {
    id: string;
    status: string;
    quotedPrice?: string;
  };
  // New pricing transparency data
  pricing?: {
    suggestedPrice?: number;
    recommendedPrice?: number;
    priceRange?: { min: number; max: number };
    breakdown?: {
      estimatedHours: number;
      hourlyRate: number;
      laborCost: number;
      complexity: 'simple' | 'moderate' | 'complex';
    };
    confidence?: number;
    reasoning?: string;
    marketResearchSummary?: string;
  };
}

export function RequestPortal({ project }: RequestPortalProps) {
  const [step, setStep] = useState<'form' | 'analyzing' | 'questions' | 'submitting' | 'result'>('form');
  const [requestText, setRequestText] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requestText.trim()) return;

    setStep('analyzing');

    try {
      // First, get clarification questions (don't save yet)
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectSlug: project.slug,
          requestText,
          clientEmail,
          clientName,
          save: false, // Don't save yet, just get questions
        }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const data = await response.json();
      setResult(data);

      // If we have clarification questions, show them
      if (data.analysis?.clarificationQuestions?.length > 0) {
        setStep('questions');
      } else {
        // Fallback: submit directly if no questions
        await submitWithAnswers({});
      }
    } catch (error) {
      setStep('form');
      alert('Something went wrong. Please try again.');
    }
  };

  const submitWithAnswers = async (answers: Record<string, string>) => {
    setStep('submitting');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectSlug: project.slug,
          requestText,
          clientEmail,
          clientName,
          clarificationAnswers: answers,
          save: true, // Now save the request with answers
        }),
      });

      if (!response.ok) throw new Error('Submission failed');

      const data = await response.json();
      setResult(data);
      setStep('result');
    } catch (error) {
      setStep('questions');
      alert('Something went wrong. Please try again.');
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setQuestionAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitAnswers = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitWithAnswers(questionAnswers);
  };

  const handleApprove = async () => {
    if (!result?.request?.id) return;

    setIsApproving(true);
    try {
      await fetch(`/api/requests/${result.request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'client_approve',
          clientEmail,
        }),
      });

      setResult({
        ...result,
        request: { ...result.request, status: 'approved' },
      });
    } catch (error) {
      alert('Failed to approve. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDecline = async () => {
    if (!result?.request?.id) return;

    try {
      await fetch(`/api/requests/${result.request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'client_decline' }),
      });

      setStep('form');
      setRequestText('');
      setResult(null);
    } catch (error) {
      alert('Failed to cancel. Please try again.');
    }
  };

  const resetForm = () => {
    setStep('form');
    setRequestText('');
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Shield className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Request Portal</p>
              <h1 className="font-bold text-xl">{project.name}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Form Step */}
        {step === 'form' && (
          <Card>
            <CardHeader>
              <CardTitle>Submit a Request</CardTitle>
              <CardDescription>
                Describe what you need and we&apos;ll let you know if it&apos;s included in your package or requires an add-on.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Your Name</Label>
                    <Input
                      id="clientName"
                      placeholder="John Smith"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientEmail">Your Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      placeholder="john@example.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="request">What do you need? *</Label>
                  <Textarea
                    id="request"
                    placeholder="Describe your request in detail. For example: 'Can we add a dark mode version of the homepage?' or 'I need the logo in different sizes for social media.'"
                    className="min-h-[150px]"
                    value={requestText}
                    onChange={(e) => setRequestText(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
                  disabled={!requestText.trim()}
                >
                  Check Scope
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Analyzing Step */}
        {step === 'analyzing' && (
          <Card>
            <CardContent className="py-16 text-center">
              <Loader2 className="h-12 w-12 text-emerald-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Analyzing Your Request</h2>
              <p className="text-slate-500">
                Preparing some questions to better understand your needs...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Questions Step */}
        {step === 'questions' && result?.analysis?.clarificationQuestions && (
          <div className="space-y-6">
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-blue-100">
                    <AlertCircle className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-1">A Few Quick Questions</h2>
                    <p className="text-slate-600">
                      Please answer these questions to help {project.freelancerName} understand your request and provide an accurate quote.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Clarification Questions</CardTitle>
                <CardDescription>
                  Your answers will help us price and scope your request correctly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitAnswers} className="space-y-6">
                  {result.analysis.clarificationQuestions.map((q, index) => (
                    <div key={q.id} className="space-y-2">
                      <Label htmlFor={q.id} className="text-base font-medium">
                        {index + 1}. {q.question}
                      </Label>
                      {q.helpText && (
                        <p className="text-sm text-slate-500">{q.helpText}</p>
                      )}
                      {q.type === 'select' && q.options ? (
                        <select
                          id={q.id}
                          className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          value={questionAnswers[q.id] || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          required
                        >
                          <option value="">Select an option...</option>
                          {q.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <Textarea
                          id={q.id}
                          placeholder="Type your answer here..."
                          className="min-h-[80px]"
                          value={questionAnswers[q.id] || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          required
                        />
                      )}
                    </div>
                  ))}

                  <div className="pt-4 flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setStep('form');
                        setQuestionAnswers({});
                      }}
                    >
                      Back to Edit Request
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Submit Request
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Original Request Reference */}
            <Card className="bg-slate-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">Your Request</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">{requestText}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Submitting Step */}
        {step === 'submitting' && (
          <Card>
            <CardContent className="py-16 text-center">
              <Loader2 className="h-12 w-12 text-emerald-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Submitting Your Request</h2>
              <p className="text-slate-500">
                Sending to {project.freelancerName} for review...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Result Step */}
        {step === 'result' && result && (
          <div className="space-y-6">
            {/* Waiting for Freelancer Review - this is the default state now */}
            {/* AI does NOT decide scope - only freelancer does */}
            {(result.request.status === 'analyzing' ||
              result.request.status === 'pending_freelancer_approval' ||
              result.request.status === 'pending_questions' ||
              result.analysis.verdict === 'pending_review') ? (
              <>
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="py-8 text-center">
                    <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-emerald-900 mb-2">Request Submitted!</h2>
                    <p className="text-emerald-700 mb-2">
                      Your request has been sent to {project.freelancerName} for review.
                    </p>
                  </CardContent>
                </Card>


                {/* Scope of Work */}
                {(result.analysis.scopeSummary || requestText) && (
                  <Card className="border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Scope of Work</CardTitle>
                      <CardDescription>
                        What&apos;s included in this request.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-slate-700 space-y-2">
                        {(result.analysis.scopeSummary || requestText).split('\n').map((line, i) => (
                          <p key={i} className={line.startsWith('•') ? 'pl-2' : ''}>
                            {line}
                          </p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Price is NOT shown to client until freelancer reviews and approves */}
                {/* The freelancer will set the final price after reviewing the AI analysis */}

                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="py-6 text-center">
                    <Clock className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                    <h3 className="text-xl font-semibold text-blue-900 mb-2">What Happens Next?</h3>
                    <p className="text-blue-700 mb-4">
                      {project.freelancerName} will review your request and send you a quote. You&apos;ll be notified when it&apos;s ready.
                    </p>
                    <Button variant="outline" onClick={resetForm}>
                      Submit Another Request
                    </Button>
                  </CardContent>
                </Card>

                {/* Original Request Reference */}
                <Card className="bg-slate-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-500">Your Request</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-700">{requestText}</p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                {/* Legacy verdict cards for other statuses */}
                <Card className={
                  result.analysis.verdict === 'in_scope'
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : result.analysis.verdict === 'out_of_scope' && result.request.status === 'pending_freelancer_approval'
                    ? 'border-blue-200 bg-blue-50/50'
                    : result.analysis.verdict === 'out_of_scope'
                    ? 'border-amber-200 bg-amber-50/50'
                    : 'border-blue-200 bg-blue-50/50'
                }>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${
                        result.analysis.verdict === 'in_scope'
                          ? 'bg-emerald-100'
                          : result.analysis.verdict === 'out_of_scope' && result.request.status === 'pending_freelancer_approval'
                          ? 'bg-blue-100'
                          : result.analysis.verdict === 'out_of_scope'
                          ? 'bg-amber-100'
                          : 'bg-blue-100'
                      }`}>
                        {result.analysis.verdict === 'in_scope' ? (
                          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                        ) : result.analysis.verdict === 'out_of_scope' && result.request.status === 'pending_freelancer_approval' ? (
                          <Clock className="h-8 w-8 text-blue-600" />
                        ) : result.analysis.verdict === 'out_of_scope' ? (
                          <DollarSign className="h-8 w-8 text-amber-600" />
                        ) : (
                          <AlertCircle className="h-8 w-8 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-1">
                          {result.analysis.verdict === 'in_scope' && 'Included in Your Package'}
                          {result.analysis.verdict === 'out_of_scope' && result.request.status === 'pending_freelancer_approval' && 'Under Review'}
                          {result.analysis.verdict === 'out_of_scope' && result.request.status !== 'pending_freelancer_approval' && 'Add-on Request'}
                          {result.analysis.verdict === 'needs_clarification' && 'Needs Clarification'}
                        </h2>
                        {result.analysis.revisionCount && (
                          <p className="text-emerald-600 font-medium mb-2">
                            {result.analysis.revisionCount}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Scope of Work */}
                {result.request.status !== 'pending_freelancer_approval' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Scope of Work</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-slate-700 mb-4 space-y-2">
                        {(result.analysis.scopeSummary || requestText).split('\n').map((line, i) => (
                          <p key={i} className={line.startsWith('•') ? 'pl-2' : ''}>
                            {line}
                          </p>
                        ))}
                      </div>
                      {result.analysis.relevantRules && result.analysis.relevantRules.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-slate-500 mb-2">Relevant Rules:</p>
                          <ul className="space-y-1">
                            {result.analysis.relevantRules.map((rule, i) => (
                              <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                <span className="text-emerald-600">•</span>
                                {rule}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}


                {/* Actions */}
                {result.request.status === 'approved' || result.request.status === 'paid' ? (
                  <Card className="border-emerald-200 bg-emerald-50">
                    <CardContent className="py-6 text-center">
                      <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
                      <h3 className="text-xl font-semibold text-emerald-900 mb-2">Request Approved!</h3>
                      <p className="text-emerald-700">
                        {project.freelancerName} has been notified and will start working on this.
                      </p>
                    </CardContent>
                  </Card>
                ) : result.request.status === 'pending_freelancer_approval' ? (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="py-6 text-center">
                      <Clock className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                      <h3 className="text-xl font-semibold text-blue-900 mb-2">Under Review</h3>
                      <p className="text-blue-700 mb-4">
                        {project.freelancerName} is reviewing your request and will send you a quote soon.
                      </p>
                      <Button variant="outline" onClick={resetForm}>
                        Submit Another Request
                      </Button>
                    </CardContent>
                  </Card>
                ) : result.analysis.verdict === 'in_scope' ? (
                  <Card className="border-emerald-200 bg-emerald-50">
                    <CardContent className="py-6 text-center">
                      <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
                      <h3 className="text-xl font-semibold text-emerald-900 mb-2">You&apos;re All Set!</h3>
                      <p className="text-emerald-700 mb-4">
                        This request is included in your package. {project.freelancerName} has been notified.
                      </p>
                      <Button variant="outline" onClick={resetForm}>
                        Submit Another Request
                      </Button>
                    </CardContent>
                  </Card>
                ) : result.analysis.verdict === 'out_of_scope' ? (
                  <Card>
                    <CardContent className="py-6">
                      <h3 className="font-semibold mb-2 text-center">How would you like to proceed?</h3>
                      <p className="text-sm text-slate-500 text-center mb-4">
                        By proceeding, {project.freelancerName} will review your request and get back to you.
                      </p>
                      <div className="flex gap-3">
                        <Button
                          className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700"
                          onClick={handleApprove}
                          disabled={isApproving}
                        >
                          {isApproving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Proceed
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 h-12"
                          onClick={handleDecline}
                        >
                          Cancel Request
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-6 text-center">
                      <Clock className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                      <h3 className="text-xl font-semibold mb-2">Under Review</h3>
                      <p className="text-slate-600 mb-4">
                        {project.freelancerName} will review this request and get back to you soon.
                      </p>
                      <Button variant="outline" onClick={resetForm}>
                        Submit Another Request
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Your Request Reference */}
                <Card className="bg-slate-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-500">Your Request</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-700">{requestText}</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 w-full bg-white border-t py-3">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Shield className="h-4 w-4 text-emerald-600" />
          Powered by ScopePilot
        </div>
      </div>
    </div>
  );
}
