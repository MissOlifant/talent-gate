import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { CheckCircle2, FileText, Timer, ShieldCheck, Trophy, UserPlus } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

const steps = [
  { icon: UserPlus, title: "Register", desc: "Create your candidate profile in under a minute." },
  { icon: FileText, title: "Take the Assessment", desc: "Answer 50 timed questions across Math, Logic, Patterns & Technical." },
  { icon: Trophy, title: "Get Instant Results", desc: "See your score and shortlist status the moment you finish." },
];

const features = [
  { icon: Timer, title: "Timed & Fair", desc: "Strict timer ensures everyone gets the same shot." },
  { icon: ShieldCheck, title: "Secure & Private", desc: "Encrypted accounts with role-based access." },
  { icon: CheckCircle2, title: "Instant Marking", desc: "Auto-scored against admin-set pass marks." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 opacity-40" style={{ background: "var(--gradient-hero)" }} />
          <div className="absolute inset-0 -z-10 bg-background/60" />
          <div className="container mx-auto px-4 py-24 md:py-32 text-center max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-success" /> Now hiring — assessments open
            </span>
            <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight">
              Hire the right talent.
              <br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>
                Assess fairly. Decide faster.
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              TalentGate is the company's online recruitment portal. Register, complete a timed
              assessment, and find out instantly whether you've been shortlisted.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/register"><Button size="lg">Register as Candidate</Button></Link>
              <Link to="/login"><Button size="lg" variant="outline">Candidate Login</Button></Link>
              <Link to="/admin-login"><Button size="lg" variant="ghost">Staff Login</Button></Link>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">How the assessment works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <Card key={s.title} className="p-6 relative">
                <div className="absolute -top-3 -left-3 h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">
                  {i + 1}
                </div>
                <s.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-semibold text-lg">{s.title}</h3>
                <p className="text-muted-foreground mt-2">{s.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-secondary/40 py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6">
              {features.map((f) => (
                <div key={f.title} className="flex gap-4">
                  <div className="h-11 w-11 shrink-0 rounded-lg bg-primary/10 text-primary grid place-items-center">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t py-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} TalentGate Recruitment Portal
        </footer>
      </main>
    </div>
  );
}
