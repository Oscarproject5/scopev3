import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { CompanySettingsForm } from './company-form';

export default async function CompanySettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    redirect('/api/auth/signin');
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
        <p className="text-gray-600 mt-1">
          Customize how your business appears on invoices and contracts sent to clients.
        </p>
      </div>

      <CompanySettingsForm
        initialData={{
          companyName: user.companyName || '',
          companyLogo: user.companyLogo || '',
          companyAddress: user.companyAddress || '',
          companyEmail: user.companyEmail || user.email,
          companyPhone: user.companyPhone || '',
          companyWebsite: user.companyWebsite || '',
          taxId: user.taxId || '',
        }}
      />
    </div>
  );
}
