import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Users, CheckCircle2, XCircle, FileCheck, Download, Search } from "lucide-react";

type Row = {
  attempt_id: string | null;
  candidate_id: string;
  full_name: string;
  id_number: string;
  email: string;
  score: number | null;
  total: number | null;
  percentage: number | null;
  passed: boolean | null;
  status: string | null;
  completed_at: string | null;
};

export default function AdminDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "passed" | "failed">("all");
  const [sort, setSort] = useState<"score_desc" | "recent">("recent");

  useEffect(() => { void load(); }, []);

  const load = async () => {
    const { data: profiles } = await supabase.from("profiles").select("id,full_name,id_number,email");
    const { data: attempts } = await supabase.from("assessment_attempts").select("*").order("completed_at", { ascending: false });
    const byCandidate = new Map<string, any>();
    (attempts || []).forEach((a) => {
      const existing = byCandidate.get(a.candidate_id);
      if (!existing || (a.completed_at && (!existing.completed_at || a.completed_at > existing.completed_at))) {
        byCandidate.set(a.candidate_id, a);
      }
    });
    const merged: Row[] = (profiles || []).map((p) => {
      const a = byCandidate.get(p.id);
      return {
        attempt_id: a?.id ?? null,
        candidate_id: p.id,
        full_name: p.full_name,
        id_number: p.id_number,
        email: p.email,
        score: a?.score ?? null,
        total: a?.total ?? null,
        percentage: a?.percentage ?? null,
        passed: a?.passed ?? null,
        status: a?.status ?? null,
        completed_at: a?.completed_at ?? null,
      };
    });
    setRows(merged);
  };

  const filtered = useMemo(() => {
    let r = rows;
    if (q) {
      const s = q.toLowerCase();
      r = r.filter((x) => x.full_name.toLowerCase().includes(s) || x.email.toLowerCase().includes(s) || x.id_number.includes(s));
    }
    if (filter === "passed") r = r.filter((x) => x.passed === true);
    if (filter === "failed") r = r.filter((x) => x.passed === false);
    if (sort === "score_desc") r = [...r].sort((a, b) => (b.percentage ?? -1) - (a.percentage ?? -1));
    else r = [...r].sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
    return r;
  }, [rows, q, filter, sort]);

  const stats = useMemo(() => ({
    total: rows.length,
    completed: rows.filter((r) => r.status === "completed").length,
    passed: rows.filter((r) => r.passed === true).length,
    failed: rows.filter((r) => r.passed === false).length,
  }), [rows]);

  const exportCSV = () => {
    const headers = ["Full Name","ID Number","Email","Score","Total","Percentage","Status","Date"];
    const lines = [headers.join(",")];
    filtered.forEach((r) => {
      const v = [r.full_name, r.id_number, r.email, r.score ?? "", r.total ?? "", r.percentage ?? "",
        r.passed === null ? (r.status ?? "not_started") : r.passed ? "Passed" : "Failed",
        r.completed_at ?? ""];
      lines.push(v.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `candidates-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of candidates and assessment results.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Candidates" value={stats.total} />
        <StatCard icon={FileCheck} label="Completed" value={stats.completed} />
        <StatCard icon={CheckCircle2} label="Passed" value={stats.passed} accent="success" />
        <StatCard icon={XCircle} label="Failed" value={stats.failed} accent="destructive" />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, email or ID…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="passed">Passed only</SelectItem>
              <SelectItem value="failed">Failed only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v: any) => setSort(v)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="score_desc">Highest Score</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
        </div>

        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">ID Number</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">%</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.candidate_id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{r.full_name}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{r.id_number}</td>
                  <td className="py-3 pr-4">{r.email}</td>
                  <td className="py-3 pr-4">{r.score !== null ? `${r.score}/${r.total}` : "—"}</td>
                  <td className="py-3 pr-4">{r.percentage !== null ? `${r.percentage}%` : "—"}</td>
                  <td className="py-3 pr-4">
                    {r.passed === true && <Badge className="bg-success text-success-foreground hover:bg-success">Passed</Badge>}
                    {r.passed === false && <Badge variant="destructive">Failed</Badge>}
                    {r.status === "in_progress" && <Badge>In Progress</Badge>}
                    {!r.status && <Badge variant="outline">Not Started</Badge>}
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {r.completed_at ? new Date(r.completed_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No candidates yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent?: "success" | "destructive" }) {
  const color = accent === "success" ? "text-success" : accent === "destructive" ? "text-destructive" : "text-primary";
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="mt-3 text-3xl font-bold">{value}</div>
    </Card>
  );
}
