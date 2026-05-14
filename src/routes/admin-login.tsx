import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin-login")({
  component: AdminLoginPage,
  head: () => ({ meta: [{ title: "Admin Login — TalentGate" }] }),
});

function AdminLoginPage() {
  const nav = useNavigate();
  const { refreshRole } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);

  useEffect(() => {
    supabase.rpc("admin_exists").then(({ data }) => setNeedsBootstrap(data === false));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) { setLoading(false); return toast.error("Invalid credentials"); }
    if (needsBootstrap) {
      const { data: ok } = await supabase.rpc("bootstrap_first_admin");
      if (ok) toast.success("Bootstrapped first admin");
    }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) { await supabase.auth.signOut(); setLoading(false); return toast.error("This account is not an administrator"); }
    await refreshRole();
    setLoading(false);
    toast.success("Welcome, admin");
    nav({ to: "/admin" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12 max-w-md">
        <Card className="p-8">
          <div className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Administrator Login</h1></div>
          <p className="text-sm text-muted-foreground mt-1">Restricted access — staff only.</p>
          {needsBootstrap && (
            <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              <strong>First-time setup:</strong> No admin exists yet. Sign in with any registered account here and you will be promoted to administrator.
            </div>
          )}
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div><Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label htmlFor="pwd">Password</Label>
              <Input id="pwd" type="password" required value={password} onChange={(e) => setPwd(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign In"}</Button>
          </form>
        </Card>
      </main>
    </div>
  );
}