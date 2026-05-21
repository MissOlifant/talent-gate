import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/staff-register")({
  component: StaffRegisterPage,
  head: () => ({ meta: [{ title: "Staff Registration — TalentGate" }] }),
});

function StaffRegisterPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error("Passwords do not match");
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters");
    if (!form.full_name.trim()) return toast.error("Full name required");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
        data: {
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          id_number: `STAFF-${Date.now()}`,
          is_staff: true,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Staff account created. Please sign in.");
    nav({ to: "/admin-login" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12 max-w-xl">
        <Card className="p-8">
          <div className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Staff Registration</h1></div>
          <p className="text-sm text-muted-foreground mt-1">
            Restricted: staff accounts only. You will be required to change your password every 30 days.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div><Label>Full Name</Label>
              <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength={100} /></div>
            <div><Label>Staff Email</Label>
              <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} /></div>
            <div><Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Password</Label>
                <Input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div><Label>Confirm Password</Label>
                <Input type="password" required minLength={8} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} /></div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating account…" : "Create Staff Account"}</Button>
            <p className="text-sm text-center text-muted-foreground">
              Already staff? <Link to="/admin-login" className="text-primary font-medium">Sign in</Link>
            </p>
          </form>
        </Card>
      </main>
    </div>
  );
}