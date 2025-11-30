import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
  typescript: true,
});

// Create a connected account for a freelancer
export async function createConnectedAccount(email: string) {
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
  return account;
}

// Generate onboarding link for Stripe Connect
export async function createAccountLink(accountId: string, returnUrl: string) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${returnUrl}?refresh=true`,
    return_url: `${returnUrl}?success=true`,
    type: 'account_onboarding',
  });
  return accountLink;
}

// Create a payment intent for a client request
export async function createPaymentIntent(
  amount: number, // in cents
  currency: string,
  connectedAccountId: string,
  metadata: Record<string, string>
) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    transfer_data: {
      destination: connectedAccountId,
    },
    metadata,
  });
  return paymentIntent;
}

// Create a checkout session for quick payment
export async function createCheckoutSession(
  amount: number,
  currency: string,
  connectedAccountId: string,
  requestId: string,
  successUrl: string,
  cancelUrl: string,
  description: string
) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: 'Project Add-on',
            description,
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    payment_intent_data: {
      transfer_data: {
        destination: connectedAccountId,
      },
      metadata: {
        requestId,
      },
    },
  });
  return session;
}

// Check if account is fully onboarded
export async function checkAccountStatus(accountId: string) {
  const account = await stripe.accounts.retrieve(accountId);
  return {
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  };
}
