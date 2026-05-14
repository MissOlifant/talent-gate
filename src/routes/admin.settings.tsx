import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — TalentGate Admin" }] }),
});

function SettingsPage() {
  const [cfg, setCfg] = useState<any>(null);
  useEffect(() => {
    supabase.from("assessment_config").select("*").eq("id", 1).maybeSingle().then(({ data }) => setCfg(data));
  }, []);
  const save = async () => {
    const { error } = await supabase.from("assessment_config").update({
      timer_minutes: cfg.timer_minutes, pass_mark: cfg.pass_mark, active: cfg.active,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
  };
  if (!cfg) return <div className="p-8 text-muted-foreground">Loading…</div>;
  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div><h1 className="text-3xl font-bold">Assessment Settings</h1>
        <p className="text-muted-foreground">Control timer, pass mark and availability.</p></div>
      <Card className="p-6 space-y-5">
        <div><Label>Timer (minutes)</Label>
          <Input type="number" min={1} max={300} value={cfg.timer_minutes} onChange={(e) => setCfg({ ...cfg, timer_minutes: parseInt(e.target.value || "0") })} /></div>
        <div><Label>Pass Mark (%)</Label>
          <Input type="number" min={1} max={100} value={cfg.pass_mark} onChange={(e) => setCfg({ ...cfg, pass_mark: parseInt(e.target.value || "0") })} /></div>
        <div className="flex items-center justify-between">
          <div><Label>Assessment Active</Label>
            <p className="text-xs text-muted-foreground">When off, candidates cannot start a new attempt.</p></div>
          <Switch checked={cfg.active} onCheckedChange={(v) => setCfg({ ...cfg, active: v })} />
        </div>
        <Button onClick={save}>Save Settings</Button>
      </Card>
    </div>
  );
}