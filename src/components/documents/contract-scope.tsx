'use client';

import { forwardRef } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Clock, DollarSign, FileText, Calendar } from 'lucide-react';

interface ContractScopeProps {
  company: {
    name: string;
    logo?: string;
    address?: string;
    email?: string;
    phone?: string;
    website?: string;
  };
  client: {
    name: string;
    email?: string;
    company?: string;
  };
  project: {
    name: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    contractValue?: number;
    currency?: string;
  };
  scope: {
    deliverables: string[];
    revisionsIncluded?: number;
    revisionsUsed?: number;
    hourlyRate?: number;
    workingHours?: {
      start: string;
      end: string;
      timezone: string;
    };
    excludedDays?: string[];
    customRules?: Array<{
      rule: string;
      description: string;
    }>;
    contractText?: string;
    rulesSummary?: string;
  };
  createdAt?: Date;
}

export const ContractScope = forwardRef<HTMLDivElement, ContractScopeProps>(
  function ContractScope({ company, client, project, scope, createdAt }, ref) {
    const currency = project.currency || 'USD';

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    };

    return (
      <div ref={ref} className="bg-white p-8 max-w-4xl mx-auto shadow-lg" id="contract-content">
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
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-emerald-600 mb-4">SCOPE OF WORK</h2>
            {createdAt && (
              <p className="text-sm text-gray-500">
                Created {format(createdAt, 'MMM dd, yyyy')}
              </p>
            )}
          </div>
        </div>

        {/* Project & Client Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Project</h3>
            <p className="font-bold text-2xl text-gray-800 mb-2">{project.name}</p>
            {project.description && <p className="text-gray-600">{project.description}</p>}
            <div className="mt-4 space-y-2 text-sm">
              {project.startDate && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Start: {format(project.startDate, 'MMM dd, yyyy')}</span>
                </div>
              )}
              {project.endDate && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>End: {format(project.endDate, 'MMM dd, yyyy')}</span>
                </div>
              )}
              {project.contractValue && (
                <div className="flex items-center gap-2 text-gray-800 font-semibold">
                  <DollarSign className="h-4 w-4" />
                  <span>Contract Value: {formatCurrency(project.contractValue)}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Client</h3>
            <p className="font-semibold text-xl text-gray-800">{client.name}</p>
            {client.company && <p className="text-gray-600">{client.company}</p>}
            {client.email && <p className="text-gray-600 text-sm mt-1">{client.email}</p>}
          </div>
        </div>

        {/* Included Deliverables */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Included Deliverables
          </h3>
          <div className="bg-emerald-50 rounded-lg p-6">
            <ul className="space-y-3">
              {scope.deliverables.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Revisions & Rates */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {scope.revisionsIncluded !== undefined && (
            <div className="bg-blue-50 rounded-lg p-6">
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Revisions
              </h4>
              <p className="text-3xl font-bold text-blue-600 mb-1">
                {scope.revisionsIncluded}
                <span className="text-lg font-normal text-gray-500 ml-2">included</span>
              </p>
              {scope.revisionsUsed !== undefined && (
                <p className="text-sm text-gray-600">
                  {scope.revisionsUsed} used, {scope.revisionsIncluded - scope.revisionsUsed} remaining
                </p>
              )}
            </div>
          )}

          {scope.hourlyRate && (
            <div className="bg-amber-50 rounded-lg p-6">
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-600" />
                Out-of-Scope Rate
              </h4>
              <p className="text-3xl font-bold text-amber-600 mb-1">
                {formatCurrency(scope.hourlyRate)}
                <span className="text-lg font-normal text-gray-500 ml-1">/hr</span>
              </p>
              <p className="text-sm text-gray-600">
                For work outside the defined scope
              </p>
            </div>
          )}
        </div>

        {/* Working Hours */}
        {scope.workingHours && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-600" />
              Working Hours
            </h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-700">
                <span className="font-semibold">{scope.workingHours.start}</span>
                {' '}-{' '}
                <span className="font-semibold">{scope.workingHours.end}</span>
                <span className="text-gray-500 ml-2">({scope.workingHours.timezone})</span>
              </p>
              {scope.excludedDays && scope.excludedDays.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Excluded: {scope.excludedDays.join(', ')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Custom Rules */}
        {scope.customRules && scope.customRules.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Additional Terms</h3>
            <div className="space-y-3">
              {scope.customRules.map((rule, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <p className="font-semibold text-gray-800">{rule.rule}</p>
                  <p className="text-gray-600 text-sm mt-1">{rule.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary */}
        {scope.rulesSummary && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Scope Summary</h3>
            <div className="bg-slate-50 rounded-lg p-6 border-l-4 border-slate-400">
              <p className="text-gray-700 whitespace-pre-line">{scope.rulesSummary}</p>
            </div>
          </div>
        )}

        {/* Original Contract Text */}
        {scope.contractText && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Original Contract Terms</h3>
            <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
              <p className="text-gray-700 whitespace-pre-line text-sm">{scope.contractText}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center text-gray-500 text-sm">
            <p>This document outlines the agreed scope of work.</p>
            <p>Powered by ScopePilot</p>
          </div>
        </div>
      </div>
    );
  }
);

export default ContractScope;
