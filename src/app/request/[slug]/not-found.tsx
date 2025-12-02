import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Shield className="h-10 w-10 text-emerald-600" />
          <span className="font-bold text-2xl">ScopePilot</span>
        </div>

        <div className="bg-white rounded-xl border p-8 max-w-md">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Project Not Found</h1>
          <p className="text-slate-600 mb-6">
            This request portal doesn&apos;t exist or is no longer accepting requests.
            Please check the link with your freelancer.
          </p>
          <Link href="/">
            <Button>Go to Homepage</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
