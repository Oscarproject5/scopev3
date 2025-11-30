'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, DollarSign, Loader2, Edit2, FileText, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { Request } from '@/lib/db/schema';

interface RequestActionsProps {
  request: Request;
}

export function RequestActions({ request }: RequestActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const aiAnalysis = request.aiAnalysis as any;
  const aiSuggestedPrice = aiAnalysis?.suggestedPrice || 0;
  const currentQuotedPrice = request.quotedPrice ? parseFloat(request.quotedPrice) : aiSuggestedPrice;

  const [customPrice, setCustomPrice] = useState('');

  const handleAction = async (action: string, price?: number) => {
    setIsLoading(true);
    try {
      const body: { action: string; customPrice?: number } = { action };
      if (price !== undefined) body.customPrice = price;

      const response = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to update request');

      toast.success('Request updated successfully');
      setShowEditDialog(false);
      router.refresh();
    } catch (error) {
      toast.error('Failed to update request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = () => {
    setCustomPrice(currentQuotedPrice.toFixed(2));
    setShowEditDialog(true);
  };

  const handleApproveWithCustomPrice = () => {
    const price = parseFloat(customPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    handleAction('freelancer_approve', price);
  };

  if (request.status === 'pending_freelancer_approval') {
    return (
      <>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-emerald-600 hover:text-emerald-700"
            onClick={() => handleAction('freelancer_approve')}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Approve Quote
              </>
            )}
          </Button>
          {currentQuotedPrice > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleEditClick}
              disabled={isLoading}
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Edit Price
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700"
            onClick={() => handleAction('freelancer_decline')}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-1" />
                Decline
              </>
            )}
          </Button>
        </div>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Quote Price</DialogTitle>
              <DialogDescription>
                Adjust the AI-suggested price before sending to the client.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>AI Suggested Price</Label>
                <div className="text-2xl font-bold text-slate-700">
                  ${aiSuggestedPrice.toFixed(2)}
                </div>
                {aiAnalysis?.estimatedHours && (
                  <p className="text-sm text-slate-500">
                    Based on {aiAnalysis.estimatedHours} hours
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="customPrice">Your Quote</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <Input
                    id="customPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-7"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleApproveWithCustomPrice}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve & Send to Client
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (request.status === 'approved' || request.status === 'paid') {
    return (
      <div className="flex gap-2">
        <Link href={`/invoice/${request.id}`} target="_blank">
          <Button size="sm" variant="outline" className="gap-1">
            <FileText className="h-4 w-4" />
            View Invoice
            <ExternalLink className="h-3 w-3" />
          </Button>
        </Link>
        {request.status === 'approved' && (
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => handleAction('mark_paid')}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-1" />
                Mark as Paid
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  return null;
}
