import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) { setLoading(false); return toast.error("Invalid credentials"); }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) { await supabase.auth.signOut(); setLoading(false); return toast.error("This account is not a staff/administrator account"); }
    await refreshRole();
    const { data: expired } = await supabase.rpc("password_expired", { _user_id: data.user.id });
    setLoading(false);
    if (expired) {
      toast.warning("Your password expired. Please set a new one.");
      nav({ to: "/change-password" });
      return;
    }
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
          <p className="text-sm text-muted-foreground mt-1">Restricted access — staff only. Passwords expire every 30 days.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div><Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label htmlFor="pwd">Password</Label>
              <Input id="pwd" type="password" required value={password} onChange={(e) => setPwd(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign In"}</Button>
            <p className="text-sm text-center text-muted-foreground">
              Need a staff account? <Link to="/staff-register" className="text-primary font-medium">Register</Link>
            </p>
          </form>
        </Card>
      </main>
    </div>
  );
}