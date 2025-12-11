'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

interface NewProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewProjectModal({ open, onOpenChange }: NewProjectModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [scope, setScope] = useState('');
  const [clientName, setClientName] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [industryType, setIndustryType] = useState('');
  const [location, setLocation] = useState('');
  const [contractFile, setContractFile] = useState<File | null>(null);

  const resetForm = () => {
    setName('');
    setScope('');
    setClientName('');
    setContractValue('');
    setHourlyRate('');
    setIndustryType('');
    setLocation('');
    setContractFile(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF, DOC, DOCX, or TXT file');
      return;
    }

    setContractFile(file);

    // Extract text and analyze contract
    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract-contract', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // Auto-fill fields from extracted data
        if (data.scope) setScope(data.scope);
        if (data.clientName) setClientName(data.clientName);
        if (data.contractValue) setContractValue(data.contractValue.toString());
        if (data.hourlyRate) setHourlyRate(data.hourlyRate.toString());
        if (data.industryType) setIndustryType(data.industryType);
        toast.success('Contract analyzed! Fields have been auto-filled.');
      }
    } catch (error) {
      // Silently fail - user can still fill in manually
      console.log('Contract extraction not available');
    } finally {
      setIsExtracting(false);
    }
  };

  const removeFile = () => {
    setContractFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
          description: scope,
          clientName: clientName || null,
          originalContractPrice: contractValue ? parseFloat(contractValue) : null,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
          projectType: industryType || null,
          clientLocation: location || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to create project');

      const project = await response.json();
      toast.success('Project created successfully!');
      resetForm();
      onOpenChange(false);
      router.push(`/dashboard/projects/${project.id}`);
    } catch (error) {
      toast.error('Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Only the project name is required. Fill in what you know now — you can always add more later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name *</Label>
            <Input
              id="projectName"
              placeholder="e.g., Website Redesign"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Project Scope */}
          <div className="space-y-2">
            <Label htmlFor="projectScope">Project Scope</Label>
            <Textarea
              id="projectScope"
              placeholder="What's included in this project? E.g.: • 5 page website with contact form • 2 rounds of revisions • Mobile responsive design  What's NOT included? E.g.: • Content writing • Photography • Ongoing maintenance"
              className="min-h-[100px] resize-none"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            />
            <p className="text-xs text-blue-600">
              Define the boundaries to help prevent scope creep
            </p>
          </div>

          {/* Client Name */}
          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name</Label>
            <Input
              id="clientName"
              placeholder="e.g., Acme Corp"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., New York, NY or Remote"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <p className="text-xs text-blue-600">
              Client or project location for market-rate pricing
            </p>
          </div>

          {/* Contract Value and Hourly Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractValue">Contract Value ($)</Label>
              <Input
                id="contractValue"
                type="number"
                placeholder="5000"
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
              <Input
                id="hourlyRate"
                type="number"
                placeholder="100"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
            </div>
          </div>

          {/* Industry / Service Type */}
          <div className="space-y-2">
            <Label htmlFor="industryType">Industry / Service Type</Label>
            <Input
              id="industryType"
              placeholder="e.g., Web Design, Landscaping, Legal Services, Photography.."
              value={industryType}
              onChange={(e) => setIndustryType(e.target.value)}
            />
            <p className="text-xs text-blue-600">
              Helps the AI understand pricing norms for your field
            </p>
          </div>

          {/* Contract Upload */}
          <div className="space-y-2">
            <Label>Contract / Agreement (Optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
            />

            {contractFile ? (
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <FileText className="h-5 w-5 text-slate-500" />
                <span className="flex-1 text-sm truncate">{contractFile.name}</span>
                {isExtracting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                ) : (
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 transition-colors flex flex-col items-center gap-2 text-slate-500"
              >
                <Upload className="h-5 w-5" />
                <span className="text-sm">Upload contract (PDF, DOC, DOCX, TXT)</span>
              </button>
            )}
            <p className="text-xs text-blue-600">
              Upload your existing contract to help the AI understand the project scope
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
