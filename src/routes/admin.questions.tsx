import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/questions")({
  component: QuestionsPage,
});

const CATS = [
  { v: "math", l: "Math" },
  { v: "logic", l: "Logic" },
  { v: "patterns", l: "Patterns" },
  { v: "technical", l: "Technical" },
];
const empty = { id: "", category: "math", question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A", active: true };

function QuestionsPage() {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(empty);

  const load = async () => {
    const { data } = await supabase.from("questions").select("*").order("category");
    setList(data || []);
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!edit.question_text.trim() || !edit.option_a || !edit.option_b || !edit.option_c || !edit.option_d) return toast.error("All fields required");
    const payload = { ...edit }; delete payload.id;
    const { error } = edit.id
      ? await supabase.from("questions").update(payload).eq("id", edit.id)
      : await supabase.from("questions").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(edit.id ? "Updated" : "Added");
    setOpen(false); setEdit(empty); void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    await supabase.from("questions").delete().eq("id", id);
    void load();
  };

  const toggleActive = async (q: any) => {
    await supabase.from("questions").update({ active: !q.active }).eq("id", q.id);
    void load();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Questions</h1>
          <p className="text-muted-foreground">{list.length} questions in the bank.</p></div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEdit(empty); }}>
          <DialogTrigger asChild><Button onClick={() => setEdit(empty)}><Plus className="h-4 w-4 mr-2" /> Add Question</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{edit.id ? "Edit" : "New"} Question</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Category</Label>
                <Select value={edit.category} onValueChange={(v) => setEdit({ ...edit, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATS.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label>Question</Label>
                <Textarea value={edit.question_text} onChange={(e) => setEdit({ ...edit, question_text: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                {(["a","b","c","d"] as const).map((k) => (
                  <div key={k}><Label>Option {k.toUpperCase()}</Label>
                    <Input value={edit[`option_${k}`]} onChange={(e) => setEdit({ ...edit, [`option_${k}`]: e.target.value })} /></div>
                ))}
              </div>
              <div><Label>Correct Answer</Label>
                <Select value={edit.correct_answer} onValueChange={(v) => setEdit({ ...edit, correct_answer: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["A","B","C","D"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select></div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground border-b bg-secondary/30"><tr>
            <th className="py-3 px-4">Category</th><th className="py-3 px-4">Question</th>
            <th className="py-3 px-4">Correct</th><th className="py-3 px-4">Active</th><th className="py-3 px-4"></th>
          </tr></thead>
          <tbody>
            {list.map((q) => (
              <tr key={q.id} className="border-b last:border-0">
                <td className="py-3 px-4 capitalize text-xs">{q.category.replace("_"," ")}</td>
                <td className="py-3 px-4 max-w-md truncate">{q.question_text}</td>
                <td className="py-3 px-4 font-mono">{q.correct_answer}</td>
                <td className="py-3 px-4"><Switch checked={q.active} onCheckedChange={() => toggleActive(q)} /></td>
                <td className="py-3 px-4 text-right space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEdit(q); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}