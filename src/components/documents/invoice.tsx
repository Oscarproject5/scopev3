'use client';

import { forwardRef } from 'react';
import { format } from 'date-fns';

interface InvoiceProps {
  invoice: {
    number: string;
    date: Date;
    dueDate?: Date;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
  };
  company: {
    name: string;
    logo?: string;
    address?: string;
    email?: string;
    phone?: string;
    website?: string;
    taxId?: string;
  };
  client: {
    name: string;
    email?: string;
    company?: string;
    address?: string;
  };
  project: {
    name: string;
    description?: string;
  };
  items: Array<{
    description: string;
    details?: string;
    quantity?: number;
    rate?: number;
    amount: number;
  }>;
  totals: {
    subtotal: number;
    tax?: number;
    taxRate?: number;
    discount?: number;
    total: number;
  };
  notes?: string;
  terms?: string;
  currency?: string;
}

export const Invoice = forwardRef<HTMLDivElement, InvoiceProps>(
  function Invoice({ invoice, company, client, project, items, totals, notes, terms, currency = 'USD' }, ref) {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    };

    const statusColors = {
      draft: 'bg-gray-100 text-gray-700',
      sent: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
      overdue: 'bg-red-100 text-red-700',
    };

    return (
      <div ref={ref} className="bg-white p-8 max-w-4xl mx-auto shadow-lg" id="invoice-content">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-8 border-b-2 border-gray-200">
          <div>
            {company.logo ? (
              <img src={company.logo} alt={company.name} className="h-16 mb-4" />
            ) : (
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{company.name}</h1>
            )}
            {company.logo && <h2 className="text-xl font-semibold text-gray-800">{company.name}</h2>}
            <div className="text-sm text-gray-600 mt-2 space-y-1">
              {company.address && <p className="whitespace-pre-line">{company.address}</p>}
              {company.email && <p>{company.email}</p>}
              {company.phone && <p>{company.phone}</p>}
              {company.website && <p>{company.website}</p>}
              {company.taxId && <p className="text-xs mt-2">Tax ID: {company.taxId}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-bold text-gray-400 mb-4">INVOICE</h2>
            <div className="space-y-1 text-sm">
              <p className="text-gray-600">
                <span className="font-medium">Invoice #:</span> {invoice.number}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Date:</span> {format(invoice.date, 'MMM dd, yyyy')}
              </p>
              {invoice.dueDate && (
                <p className="text-gray-600">
                  <span className="font-medium">Due Date:</span> {format(invoice.dueDate, 'MMM dd, yyyy')}
                </p>
              )}
              <p className="mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${statusColors[invoice.status]}`}>
                  {invoice.status}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Bill To</h3>
            <div className="text-gray-800">
              <p className="font-semibold text-lg">{client.name}</p>
              {client.company && <p className="text-gray-600">{client.company}</p>}
              {client.email && <p className="text-gray-600">{client.email}</p>}
              {client.address && <p className="text-gray-600 whitespace-pre-line">{client.address}</p>}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Project</h3>
            <p className="font-semibold text-lg text-gray-800">{project.name}</p>
            {project.description && <p className="text-gray-600 text-sm mt-1">{project.description}</p>}
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wide">Description</th>
                {items.some(i => i.quantity !== undefined) && (
                  <th className="py-3 text-right text-sm font-semibold text-gray-600 uppercase tracking-wide w-20">Qty</th>
                )}
                {items.some(i => i.rate !== undefined) && (
                  <th className="py-3 text-right text-sm font-semibold text-gray-600 uppercase tracking-wide w-28">Rate</th>
                )}
                <th className="py-3 text-right text-sm font-semibold text-gray-600 uppercase tracking-wide w-32">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-4">
                    <p className="font-medium text-gray-800">{item.description}</p>
                    {item.details && <p className="text-sm text-gray-500 mt-1">{item.details}</p>}
                  </td>
                  {items.some(i => i.quantity !== undefined) && (
                    <td className="py-4 text-right text-gray-700">{item.quantity || '-'}</td>
                  )}
                  {items.some(i => i.rate !== undefined) && (
                    <td className="py-4 text-right text-gray-700">
                      {item.rate ? formatCurrency(item.rate) : '-'}
                    </td>
                  )}
                  <td className="py-4 text-right font-medium text-gray-800">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-72">
            <div className="flex justify-between py-2 text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.discount && totals.discount > 0 && (
              <div className="flex justify-between py-2 text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(totals.discount)}</span>
              </div>
            )}
            {totals.tax !== undefined && totals.tax > 0 && (
              <div className="flex justify-between py-2 text-gray-600">
                <span>Tax {totals.taxRate && `(${totals.taxRate}%)`}</span>
                <span>{formatCurrency(totals.tax)}</span>
              </div>
            )}
            <div className="flex justify-between py-3 border-t-2 border-gray-300 mt-2">
              <span className="text-xl font-bold text-gray-800">Total</span>
              <span className="text-xl font-bold text-gray-800">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        {(notes || terms) && (
          <div className="border-t border-gray-200 pt-6 space-y-4">
            {notes && (
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</h4>
                <p className="text-gray-600 text-sm whitespace-pre-line">{notes}</p>
              </div>
            )}
            {terms && (
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Terms & Conditions</h4>
                <p className="text-gray-600 text-sm whitespace-pre-line">{terms}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm">
          <p>Thank you for your business!</p>
        </div>
      </div>
    );
  }
);

export default Invoice;
