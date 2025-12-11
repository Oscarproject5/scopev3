import { Resend } from 'resend';

// Only initialize Resend if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Default from email - update this to your verified domain
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ScopePilot <noreply@scopepilot.io>';

interface QuoteApprovalEmailParams {
  clientEmail: string;
  clientName: string | null;
  freelancerName: string;
  projectName: string;
  requestText: string;
  quotedPrice: number;
  requestId: string;
  // Optional: include invoice link
  invoiceUrl?: string;
}

/**
 * Send email to client when freelancer approves a quote
 */
export async function sendQuoteApprovalEmail({
  clientEmail,
  clientName,
  freelancerName,
  projectName,
  requestText,
  quotedPrice,
  requestId,
  invoiceUrl,
}: QuoteApprovalEmailParams): Promise<{ success: boolean; error?: string }> {
  // Skip email if Resend is not configured
  if (!resend) {
    console.log('[Email] Skipping email - RESEND_API_KEY not configured');
    return { success: true };
  }

  try {
    const displayName = clientName || 'there';
    const truncatedRequest = requestText.length > 200
      ? requestText.slice(0, 200) + '...'
      : requestText;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: clientEmail,
      subject: `Quote Ready: ${projectName} - $${quotedPrice.toFixed(2)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Quote is Ready</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Your Quote is Ready!</h1>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-top: 0;">Hi ${displayName},</p>

            <p>${freelancerName} has reviewed your request and prepared a quote for you.</p>

            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-weight: 600; color: #475569;">Your Request:</p>
              <p style="margin: 0; color: #64748b; font-style: italic;">"${truncatedRequest}"</p>
            </div>

            <div style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 5px 0; color: #059669; font-weight: 600; font-size: 14px;">QUOTED PRICE</p>
              <p style="margin: 0; color: #047857; font-size: 32px; font-weight: 700;">$${quotedPrice.toFixed(2)}</p>
            </div>

            ${invoiceUrl ? `
            <div style="text-align: center; margin: 25px 0;">
              <a href="${invoiceUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">View Invoice & Pay</a>
            </div>
            ` : ''}

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">

            <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
              If you have any questions about this quote, please reply to this email or contact ${freelancerName} directly.
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
            <p style="margin: 0;">Powered by ScopePilot</p>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${displayName},

${freelancerName} has reviewed your request and prepared a quote for you.

Your Request:
"${truncatedRequest}"

QUOTED PRICE: $${quotedPrice.toFixed(2)}

${invoiceUrl ? `View Invoice & Pay: ${invoiceUrl}` : ''}

If you have any questions about this quote, please contact ${freelancerName} directly.

---
Powered by ScopePilot
      `.trim(),
    });

    if (error) {
      console.error('[Email] Failed to send quote approval email:', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Quote approval email sent successfully:', data?.id);
    return { success: true };
  } catch (error) {
    console.error('[Email] Error sending quote approval email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send email to client when their request is received (optional)
 */
export async function sendRequestReceivedEmail({
  clientEmail,
  clientName,
  freelancerName,
  projectName,
  requestText,
}: {
  clientEmail: string;
  clientName: string | null;
  freelancerName: string;
  projectName: string;
  requestText: string;
}): Promise<{ success: boolean; error?: string }> {
  // Skip email if Resend is not configured
  if (!resend) {
    console.log('[Email] Skipping email - RESEND_API_KEY not configured');
    return { success: true };
  }

  try {
    const displayName = clientName || 'there';
    const truncatedRequest = requestText.length > 200
      ? requestText.slice(0, 200) + '...'
      : requestText;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: clientEmail,
      subject: `Request Received: ${projectName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Request Received!</h1>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-top: 0;">Hi ${displayName},</p>

            <p>Your request has been submitted to ${freelancerName} for review.</p>

            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-weight: 600; color: #475569;">Your Request:</p>
              <p style="margin: 0; color: #64748b; font-style: italic;">"${truncatedRequest}"</p>
            </div>

            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #1e40af; font-weight: 500;">What happens next?</p>
              <p style="margin: 10px 0 0 0; color: #3b82f6;">${freelancerName} will review your request and send you a quote. You'll receive an email when it's ready.</p>
            </div>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">

            <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
              If you have any questions, please contact ${freelancerName} directly.
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
            <p style="margin: 0;">Powered by ScopePilot</p>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${displayName},

Your request has been submitted to ${freelancerName} for review.

Your Request:
"${truncatedRequest}"

What happens next?
${freelancerName} will review your request and send you a quote. You'll receive an email when it's ready.

If you have any questions, please contact ${freelancerName} directly.

---
Powered by ScopePilot
      `.trim(),
    });

    if (error) {
      console.error('[Email] Failed to send request received email:', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Request received email sent successfully:', data?.id);
    return { success: true };
  } catch (error) {
    console.error('[Email] Error sending request received email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
