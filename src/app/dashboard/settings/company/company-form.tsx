'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Phone, Globe, MapPin, FileText, Upload, X } from 'lucide-react';

interface CompanySettingsFormProps {
  initialData: {
    companyName: string;
    companyLogo: string;
    companyAddress: string;
    companyEmail: string;
    companyPhone: string;
    companyWebsite: string;
    taxId: string;
  };
}

export function CompanySettingsForm({ initialData }: CompanySettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    companyName: initialData.companyName,
    companyLogo: initialData.companyLogo,
    companyAddress: initialData.companyAddress,
    companyEmail: initialData.companyEmail,
    companyPhone: initialData.companyPhone,
    companyWebsite: initialData.companyWebsite,
    taxId: initialData.taxId,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update company settings');
      }

      setMessage({ type: 'success', text: 'Company settings updated successfully!' });
      router.refresh();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update settings. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For now, convert to base64 - in production, you'd upload to a CDN
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, companyLogo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, companyLogo: '' }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Company Logo */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Company Logo
        </label>
        <div className="flex items-center gap-4">
          {formData.companyLogo ? (
            <div className="relative">
              <img
                src={formData.companyLogo}
                alt="Company logo"
                className="w-20 h-20 object-contain rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={removeLogo}
                className="absolute -top-2 -right-2 p-1 bg-red-100 rounded-full text-red-600 hover:bg-red-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
              <Building2 className="w-8 h-8" />
            </div>
          )}
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Upload className="w-4 h-4" />
              Upload Logo
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-xs text-gray-500">Recommended: Square image, at least 200x200px</p>
      </div>

      {/* Company Name */}
      <div className="space-y-2">
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
          Company / Business Name
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            placeholder="Your Company Name"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <p className="text-xs text-gray-500">This appears on invoices and contracts</p>
      </div>

      {/* Company Email */}
      <div className="space-y-2">
        <label htmlFor="companyEmail" className="block text-sm font-medium text-gray-700">
          Business Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="email"
            id="companyEmail"
            name="companyEmail"
            value={formData.companyEmail}
            onChange={handleChange}
            placeholder="billing@yourcompany.com"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Company Phone */}
      <div className="space-y-2">
        <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700">
          Business Phone
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="tel"
            id="companyPhone"
            name="companyPhone"
            value={formData.companyPhone}
            onChange={handleChange}
            placeholder="+1 (555) 123-4567"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Company Website */}
      <div className="space-y-2">
        <label htmlFor="companyWebsite" className="block text-sm font-medium text-gray-700">
          Website
        </label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="url"
            id="companyWebsite"
            name="companyWebsite"
            value={formData.companyWebsite}
            onChange={handleChange}
            placeholder="https://yourcompany.com"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Company Address */}
      <div className="space-y-2">
        <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700">
          Business Address
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <textarea
            id="companyAddress"
            name="companyAddress"
            value={formData.companyAddress}
            onChange={handleChange}
            placeholder="123 Business Street&#10;Suite 100&#10;City, State 12345"
            rows={3}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Tax ID */}
      <div className="space-y-2">
        <label htmlFor="taxId" className="block text-sm font-medium text-gray-700">
          Tax ID / VAT Number
        </label>
        <div className="relative">
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            id="taxId"
            name="taxId"
            value={formData.taxId}
            onChange={handleChange}
            placeholder="XX-XXXXXXX"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <p className="text-xs text-gray-500">Optional - displayed on invoices if provided</p>
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Saving...' : 'Save Company Settings'}
        </button>
      </div>
    </form>
  );
}
