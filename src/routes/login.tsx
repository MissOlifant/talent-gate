import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Candidate Login — TalentGate" }] }),
});

function LoginPage() {
  const nav = useNavigate();
  const [id_number, setId] = useState("");
  const [password, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: emailData, error: rpcErr } = await supabase.rpc("email_for_id_number", { _id_number: id_number });
    if (rpcErr || !emailData) { setLoading(false); return toast.error("No account found for that ID number"); }
    const { error } = await supabase.auth.signInWithPassword({ email: emailData, password });
    setLoading(false);
    if (error) return toast.error("Invalid credentials");
    toast.success("Welcome back!");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12 max-w-md">
        <Card className="p-8">
          <h1 className="text-2xl font-bold">Candidate Login</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in with your South African ID number.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div><Label htmlFor="id">ID Number</Label>
              <Input id="id" required value={id_number} onChange={(e) => setId(e.target.value)} maxLength={13} inputMode="numeric" /></div>
            <div><Label htmlFor="pwd">Password</Label>
              <Input id="pwd" type="password" required value={password} onChange={(e) => setPwd(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign In"}</Button>
            <p className="text-sm text-center text-muted-foreground">
              New here? <Link to="/register" className="text-primary font-medium">Create an account</Link>
            </p>
          </form>
        </Card>
      </main>
    </div>
  );
}