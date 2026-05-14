import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/results/$id")({
  component: ResultsPage,
  head: () => ({ meta: [{ title: "Results — TalentGate" }] }),
});

function ResultsPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [a, setA] = useState<any>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    supabase.from("assessment_attempts").select("*").eq("id", id).maybeSingle().then(({ data }) => setA(data));
  }, [user, loading, id, nav]);

  if (!a) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <Card className="p-8 text-center">
          <div className={`mx-auto h-20 w-20 rounded-full grid place-items-center ${a.passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
            {a.passed ? <CheckCircle2 className="h-10 w-10" /> : <XCircle className="h-10 w-10" />}
          </div>
          <h1 className="mt-6 text-3xl font-bold">{a.passed ? "Congratulations!" : "Thank you for applying"}</h1>
          <p className="mt-2 text-muted-foreground">
            {a.passed ? "You've been shortlisted. Our recruitment team will be in touch shortly." : "We appreciate the time you took to complete the assessment."}
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border"><div className="text-xs text-muted-foreground">Score</div><div className="text-2xl font-bold">{a.score}/{a.total}</div></div>
            <div className="p-4 rounded-lg border"><div className="text-xs text-muted-foreground">Percentage</div><div className="text-2xl font-bold">{a.percentage}%</div></div>
            <div className="p-4 rounded-lg border"><div className="text-xs text-muted-foreground">Result</div>
              <div className={`text-2xl font-bold ${a.passed ? "text-success" : "text-destructive"}`}>{a.passed ? "Pass" : "Fail"}</div></div>
          </div>
          <div className="mt-8 flex justify-center"><Link to="/dashboard"><Button variant="outline">Back to Dashboard</Button></Link></div>
        </Card>
      </main>
    </div>
  );
}