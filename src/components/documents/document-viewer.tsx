'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Mail, Link2, Check, Loader2, Eye, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface DocumentViewerProps {
  children: React.ReactNode;
  title: string;
  filename: string;
  shareUrl?: string;
  onSendEmail?: (email: string) => Promise<void>;
}

export function DocumentViewer({ children, title, filename, shareUrl, onSendEmail }: DocumentViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;

    setIsDownloading(true);
    try {
      const element = contentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleSendEmail = async () => {
    if (!email || !onSendEmail) return;

    setIsSending(true);
    try {
      await onSendEmail(email);
      setShowEmailDialog(false);
      setEmail('');
      alert('Email sent successfully!');
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="relative">
      {/* Action Bar */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold text-lg text-gray-800">{title}</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="gap-2"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download PDF
            </Button>

            {shareUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="gap-2"
              >
                {isCopied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {isCopied ? 'Copied!' : 'Copy Link'}
              </Button>
            )}

            {onSendEmail && (
              <Button
                size="sm"
                onClick={() => setShowEmailDialog(true)}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Mail className="h-4 w-4" />
                Send to Client
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="bg-gray-100 min-h-screen py-8">
        <div ref={contentRef}>
          {children}
        </div>
      </div>

      {/* Email Dialog */}
      {showEmailDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Send to Client</h3>
            <p className="text-gray-600 text-sm mb-4">
              Enter the client&apos;s email address to send them this document.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEmailDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={!email || isSending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Send
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 overflow-auto">
          <div className="sticky top-0 bg-gray-900 p-4 flex justify-between items-center">
            <h2 className="text-white font-semibold">{title} - Preview</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="gap-2 bg-white"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download PDF
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPreviewOpen(false)}
                className="text-white hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="py-8">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentViewer;
