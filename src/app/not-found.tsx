import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Shield className="h-10 w-10 text-emerald-600" />
          <span className="font-bold text-2xl">ScopePilot</span>
        </div>

        <div className="bg-white rounded-xl border p-8 max-w-md">
          <h1 className="text-6xl font-bold text-slate-200 mb-4">404</h1>
          <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
          <p className="text-slate-600 mb-6">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Link href="/">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
