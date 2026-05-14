import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Clock, PlayCircle, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — TalentGate" }] }),
});

function Dashboard() {
  const { user, loading, role } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    if (role && role !== "candidate") { nav({ to: "/admin" }); return; }
    (async () => {
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      setProfile(p);
      const { data: a } = await supabase.from("assessment_attempts").select("*").eq("candidate_id", user.id).order("started_at", { ascending: false });
      setAttempts(a || []);
    })();
  }, [user, loading, role, nav]);

  const inProgress = attempts.find((a) => a.status === "in_progress");
  const completed = attempts.filter((a) => a.status === "completed");
  const latest = completed[0];

  const startAssessment = async () => {
    if (!user) return;
    setBusy(true);
    if (inProgress) {
      nav({ to: "/assessment" });
      return;
    }
    const { data: cfg } = await supabase.from("assessment_config").select("*").eq("id", 1).maybeSingle();
    if (!cfg?.active) { setBusy(false); return; }
    const { data: qs } = await supabase.from("questions").select("id").eq("active", true);
    if (!qs?.length) { setBusy(false); return; }
    const ids = qs.map((q) => q.id).sort(() => Math.random() - 0.5);
    const ends = new Date(Date.now() + cfg.timer_minutes * 60_000).toISOString();
    const { error } = await supabase.from("assessment_attempts").insert({
      candidate_id: user.id,
      question_ids: ids,
      ends_at: ends,
      total: ids.length,
    });
    setBusy(false);
    if (!error) nav({ to: "/assessment" });
  };

  const status = inProgress ? "in_progress" : completed.length ? "completed" : "not_started";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <h1 className="text-3xl font-bold">Welcome, {profile?.full_name || "Candidate"} 👋</h1>
        <p className="text-muted-foreground mt-1">Track your assessment progress and results.</p>

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              {status === "completed" && <Badge variant="secondary">Completed</Badge>}
              {status === "in_progress" && <Badge>In Progress</Badge>}
              {status === "not_started" && <Badge variant="outline">Not Started</Badge>}
            </div>
            <Clock className="h-8 w-8 text-primary mt-4" />
            <div className="mt-3 text-2xl font-bold capitalize">{status.replace("_", " ")}</div>
          </Card>

          <Card className="p-6">
            <span className="text-sm text-muted-foreground">Latest Score</span>
            <Trophy className="h-8 w-8 text-primary mt-4" />
            <div className="mt-3 text-2xl font-bold">
              {latest ? `${latest.percentage}%` : "—"}
            </div>
            {latest && (
              <div className="mt-1 text-sm flex items-center gap-1">
                {latest.passed
                  ? <><CheckCircle2 className="h-4 w-4 text-success" /><span className="text-success">Passed</span></>
                  : <><XCircle className="h-4 w-4 text-destructive" /><span className="text-destructive">Not passed</span></>}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <span className="text-sm text-muted-foreground">Attempts</span>
            <PlayCircle className="h-8 w-8 text-primary mt-4" />
            <div className="mt-3 text-2xl font-bold">{attempts.length}</div>
          </Card>
        </div>

        <Card className="p-6 mt-6">
          <h2 className="text-xl font-semibold">Take the assessment</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {inProgress
              ? "You have an active attempt. Resume to continue where you left off."
              : "Once you start the timer cannot be paused. Make sure you're ready."}
          </p>
          <div className="mt-4 flex gap-2">
            <Button onClick={startAssessment} disabled={busy}>
              {inProgress ? "Resume Assessment" : "Start Assessment"}
            </Button>
            {latest && <Link to="/results/$id" params={{ id: latest.id }}><Button variant="outline">View Last Result</Button></Link>}
          </div>
        </Card>
      </main>
    </div>
  );
}
