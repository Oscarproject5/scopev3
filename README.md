# ScopeGuard - Automated Scope Pricing for Freelancers

Stop doing free work. Let AI handle the awkward money conversations.

## Features

- **AI-Powered Scope Analysis** - GPT-4 compares client requests against your contract rules
- **Client Request Portal** - Shareable link where clients submit requests
- **Instant Pricing** - Automatic quotes for out-of-scope work
- **Revision Tracking** - "This counts as revision 2 of 3" - automatic limit enforcement
- **Stripe Integration** - Secure payments with Apple Pay, Google Pay, and cards
- **Freelancer Review Mode** - Optionally approve quotes before clients see them

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, shadcn/ui
- **Database**: Neon PostgreSQL (serverless, auto-scales to 1000s of users)
- **ORM**: Drizzle ORM
- **Auth**: NextAuth v5
- **AI**: OpenAI GPT-4o-mini
- **Payments**: Stripe Connect

## Getting Started

### 1. Install Dependencies

```bash
cd scopeguard
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Database - Get from https://neon.tech (free tier available)
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/scopeguard?sslmode=require

# NextAuth - Generate with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# OpenAI - Get from https://platform.openai.com
OPENAI_API_KEY=sk-your-api-key

# Stripe - Get from https://dashboard.stripe.com
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set Up Database

Push the schema to your Neon database:

```bash
npx drizzle-kit push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. **Freelancer creates a project** with rules (hourly rate, deliverables, revisions)
2. **Freelancer gets a shareable link** (e.g., `/request/design-studio-abc123`)
3. **Client clicks link and submits a request**
4. **AI analyzes the request** against the project rules
5. **Result shown instantly**:
   - In Scope: "Approved! This counts as revision 2 of 3"
   - Out of Scope: "Add-on Required. $150 (1.5 hrs @ $100/hr)"
6. **Client approves and pays** (or declines)
7. **Freelancer gets notified** and starts work

## Deployment

Deploy to Vercel (recommended for Next.js):

```bash
npx vercel
```

Add all environment variables in Vercel's dashboard.

## License

MIT
