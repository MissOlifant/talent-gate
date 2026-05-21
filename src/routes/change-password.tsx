import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/change-password")({
  component: ChangePasswordPage,
  head: () => ({ meta: [{ title: "Change Password — TalentGate" }] }),
});

function ChangePasswordPage() {
  const nav = useNavigate();
  const { user, role } = useAuth();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Not signed in");
    if (pwd !== confirm) return toast.error("Passwords do not match");
    if (pwd.length < 8) return toast.error("Min 8 characters");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) { setLoading(false); return toast.error(error.message); }
    await supabase.rpc("mark_password_changed");
    setLoading(false);
    toast.success("Password updated");
    nav({ to: role === "admin" ? "/admin" : "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12 max-w-md">
        <Card className="p-8">
          <div className="flex items-center gap-2"><KeyRound className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Change Password</h1></div>
          <p className="text-sm text-muted-foreground mt-1">
            Staff passwords must be rotated every 30 days.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div><Label>New Password</Label>
              <Input type="password" required minLength={8} value={pwd} onChange={(e) => setPwd(e.target.value)} /></div>
            <div><Label>Confirm New Password</Label>
              <Input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Updating…" : "Update Password"}</Button>
          </form>
        </Card>
      </main>
    </div>
  );
}