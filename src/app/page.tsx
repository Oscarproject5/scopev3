import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, Zap, DollarSign, CheckCircle2, ArrowRight, Clock } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-emerald-600" />
            <span className="font-bold text-xl">ScopePilot</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login"><Button variant="ghost">Sign In</Button></Link>
            <Link href="/login"><Button className="bg-emerald-600 hover:bg-emerald-700">Get Started Free</Button></Link>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />Stop doing free work
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Let AI Be the <span className="text-emerald-600">&quot;Bad Cop&quot;</span><br />for Scope Creep
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Freelancers lose thousands to unpaid work because asking for money feels awkward. ScopePilot handles the pricing so you can stay the &quot;good guy.&quot;
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/login"><Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8 h-14">Start Free Trial<ArrowRight className="ml-2 h-5 w-5" /></Button></Link>
            <Link href="#how-it-works"><Button size="lg" variant="outline" className="text-lg px-8 h-14">See How It Works</Button></Link>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-slate-500 text-sm">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />No credit card required</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Setup in 2 minutes</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Works with any contract</div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-900 text-white" id="how-it-works">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">The Problem</h2>
              <div className="space-y-4 text-slate-300">
                <p className="text-lg">Client: &quot;Hey, can we also get a dark mode version?&quot;</p>
                <p className="text-lg">You (thinking): &quot;That&apos;s 3 hours of work...&quot;</p>
                <p className="text-lg">You (saying): &quot;Sure, no problem!&quot;</p>
              </div>
              <div className="mt-6 p-4 bg-red-500/20 rounded-lg border border-red-500/30">
                <p className="text-red-300"><strong>Result:</strong> Free work. Again.</p>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-6 text-emerald-400">The Solution</h2>
              <div className="space-y-4 text-slate-300">
                <p className="text-lg">Client: &quot;Hey, can we also get a dark mode version?&quot;</p>
                <p className="text-lg">You: &quot;Sure! Pop that into my request portal: [link]&quot;</p>
                <p className="text-lg">ScopePilot: &quot;This is outside scope. Cost: $225&quot;</p>
              </div>
              <div className="mt-6 p-4 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                <p className="text-emerald-300"><strong>Result:</strong> You stay the good guy. The System handles the money talk.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">Three simple steps to protect your time and income</p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Shield className="h-8 w-8 text-emerald-600" /></div>
              <h3 className="font-bold text-xl mb-2">1. Set Your Rules</h3>
              <p className="text-slate-600">Upload your contract or set rules manually. AI extracts what&apos;s in scope and your rates.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Clock className="h-8 w-8 text-emerald-600" /></div>
              <h3 className="font-bold text-xl mb-2">2. Share Your Link</h3>
              <p className="text-slate-600">Get a permanent request link. Put it in your email signature or share when clients ask for extras.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><DollarSign className="h-8 w-8 text-emerald-600" /></div>
              <h3 className="font-bold text-xl mb-2">3. Get Paid</h3>
              <p className="text-slate-600">AI analyzes requests, quotes prices, and collects payment—all before work begins.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Built for Peace of Mind</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'AI-Powered Analysis', description: 'GPT-4 compares every request against your contract rules in seconds.' },
              { title: 'Revision Tracking', description: '"This counts as revision 2 of 3" — automatic limit enforcement.' },
              { title: 'One-Click Approval', description: 'Clients approve and pay without creating accounts.' },
              { title: 'Freelancer Review Mode', description: 'Optionally review AI quotes before clients see them.' },
              { title: 'Context Memory', description: 'Add project notes so AI remembers past decisions.' },
              { title: 'Stripe Integration', description: 'Secure payments direct to your account.' },
            ].map((feature, i) => (
              <div key={i} className="flex gap-4 p-6 bg-white rounded-xl border">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                <div><h3 className="font-semibold mb-1">{feature.title}</h3><p className="text-slate-600 text-sm">{feature.description}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Stop Working for Free?</h2>
          <p className="text-slate-600 mb-8">Join freelancers who protect their time and income with ScopePilot.</p>
          <Link href="/login"><Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8 h-14">Get Started Free<ArrowRight className="ml-2 h-5 w-5" /></Button></Link>
        </div>
      </section>

      <footer className="py-8 px-4 border-t">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2"><Shield className="h-6 w-6 text-emerald-600" /><span className="font-semibold">ScopePilot</span></div>
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} ScopePilot. Protect your scope.</p>
        </div>
      </footer>
    </div>
  );
}
