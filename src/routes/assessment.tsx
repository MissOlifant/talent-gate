import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Timer, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/assessment")({
  component: AssessmentPage,
  head: () => ({ meta: [{ title: "Assessment — TalentGate" }] }),
});

type Q = {
  id: string; category: string; question_text: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
};

const CAT_LABEL: Record<string, string> = {
  math: "Math",
  logic: "Logic",
  patterns: "Patterns",
  technical: "Technical",
};

function AssessmentPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [now, setNow] = useState(Date.now());
  const submittingRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    (async () => {
      const { data: a } = await supabase.from("assessment_attempts")
        .select("*").eq("candidate_id", user.id).eq("status", "in_progress")
        .order("started_at", { ascending: false }).limit(1).maybeSingle();
      if (!a) { nav({ to: "/dashboard" }); return; }
      setAttempt(a);
      setAnswers((a.answers as Record<string, string>) || {});
      const { data: qs } = await supabase.from("questions")
        .select("id,category,question_text,option_a,option_b,option_c,option_d")
        .in("id", a.question_ids);
      // preserve order from question_ids
      const order = new Map((qs || []).map((q) => [q.id, q]));
      setQuestions(a.question_ids.map((id: string) => order.get(id)!).filter(Boolean));
    })();
  }, [user, loading, nav]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remainingMs = attempt ? new Date(attempt.ends_at).getTime() - now : 0;
  const remainingMin = Math.floor(remainingMs / 60_000);
  const remainingSec = Math.max(0, Math.floor((remainingMs % 60_000) / 1000));

  const submit = async (auto = false) => {
    if (!attempt || submittingRef.current) return;
    submittingRef.current = true;
    let score = 0;
    const { data: full } = await supabase.from("questions")
      .select("id,correct_answer").in("id", attempt.question_ids);
    const map = new Map((full || []).map((q) => [q.id, q.correct_answer]));
    for (const qid of attempt.question_ids) {
      if (answers[qid] && answers[qid] === map.get(qid)) score++;
    }
    const total = attempt.question_ids.length;
    const pct = total ? Math.round((score / total) * 10000) / 100 : 0;
    const { data: cfg } = await supabase.from("assessment_config").select("pass_mark").eq("id", 1).maybeSingle();
    const passed = pct >= (cfg?.pass_mark ?? 70);
    const { error } = await supabase.from("assessment_attempts").update({
      status: "completed", score, total, percentage: pct, passed,
      answers, completed_at: new Date().toISOString(),
    }).eq("id", attempt.id);
    if (error) { submittingRef.current = false; return toast.error(error.message); }
    if (auto) toast.warning("Time's up — assessment auto-submitted");
    nav({ to: "/results/$id", params: { id: attempt.id } });
  };

  // Auto-submit when timer ends
  useEffect(() => {
    if (!attempt) return;
    if (remainingMs <= 0) submit(true);
  }, [remainingMs, attempt]); // eslint-disable-line

  const select = async (qid: string, letter: string) => {
    const next = { ...answers, [qid]: letter };
    setAnswers(next);
    if (attempt) await supabase.from("assessment_attempts").update({ answers: next }).eq("id", attempt.id);
  };

  const current = questions[idx];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const sectionCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const q of questions) m[q.category] = (m[q.category] || 0) + 1;
    return m;
  }, [questions]);
  const sectionIndex = useMemo(() => {
    if (!current) return 0;
    let i = 0;
    for (const q of questions) {
      if (q.id === current.id) break;
      if (q.category === current.category) i++;
    }
    return i + 1;
  }, [questions, current]);

  if (!attempt || !current) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading assessment…</div>;
  }

  const lowTime = remainingMs < 5 * 60_000;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="font-bold">TalentGate Assessment</div>
          <div className={`flex items-center gap-2 font-mono text-lg ${lowTime ? "text-destructive" : ""}`}>
            <Timer className="h-5 w-5" />
            {String(Math.max(0, remainingMin)).padStart(2, "0")}:{String(remainingSec).padStart(2, "0")}
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>Question {idx + 1} of {questions.length}</span>
          <span>{answeredCount} answered</span>
        </div>
        <Progress value={((idx + 1) / questions.length) * 100} />
        <Card className="p-6 mt-4">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-primary font-semibold">
              {CAT_LABEL[current.category] || current.category}
              <span className="ml-2 text-muted-foreground normal-case font-normal">
                Section {sectionIndex} of {sectionCounts[current.category]}
              </span>
            </div>
          </div>
          <h2 className="text-xl font-semibold mt-2">{current.question_text}</h2>
          <div className="mt-6 space-y-3">
            {(["A", "B", "C", "D"] as const).map((letter) => {
              const text = (current as any)[`option_${letter.toLowerCase()}`];
              const selected = answers[current.id] === letter;
              return (
                <button
                  key={letter}
                  onClick={() => select(current.id, letter)}
                  className={`w-full text-left rounded-lg border p-4 transition ${
                    selected ? "border-primary bg-primary/10" : "hover:bg-secondary"
                  }`}
                >
                  <span className="font-bold mr-3">{letter}.</span>{text}
                </button>
              );
            })}
          </div>
        </Card>
        <div className="mt-4 flex justify-between">
          <Button variant="outline" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          {idx < questions.length - 1 ? (
            <Button onClick={() => setIdx(idx + 1)}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
          ) : (
            <Button onClick={() => submit(false)}>Submit Assessment</Button>
          )}
        </div>
        {lowTime && (
          <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> Less than 5 minutes remaining.
          </div>
        )}
      </main>
    </div>
  );
}
