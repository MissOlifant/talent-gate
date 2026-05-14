import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { validateSAID } from "@/lib/sa-id";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  head: () => ({ meta: [{ title: "Register — TalentGate" }] }),
});

function RegisterPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    full_name: "", id_number: "", email: "", phone: "", password: "", confirm: ""
  });
  const [loading, setLoading] = useState(false);

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error("Passwords do not match");
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters");
    const v = validateSAID(form.id_number);
    if (!v.valid) return toast.error(v.error || "Invalid SA ID number");
    if (!form.full_name.trim()) return toast.error("Full name is required");

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: form.full_name.trim(),
          id_number: form.id_number,
          phone: form.phone.trim(),
        },
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("registered")) toast.error("Email already registered");
      else toast.error(error.message);
      return;
    }
    toast.success("Account created! Logging you in…");
    setTimeout(() => nav({ to: "/dashboard" }), 600);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12 max-w-xl">
        <Card className="p-8">
          <h1 className="text-2xl font-bold">Candidate Registration</h1>
          <p className="text-sm text-muted-foreground mt-1">Create your candidate account to start the assessment.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" required value={form.full_name} onChange={update("full_name")} maxLength={100} />
            </div>
            <div>
              <Label htmlFor="id_number">South African ID Number</Label>
              <Input id="id_number" required value={form.id_number} onChange={update("id_number")} maxLength={13} inputMode="numeric" />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" required value={form.email} onChange={update("email")} maxLength={255} />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" required value={form.phone} onChange={update("phone")} maxLength={20} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required value={form.password} onChange={update("password")} minLength={8} />
              </div>
              <div>
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input id="confirm" type="password" required value={form.confirm} onChange={update("confirm")} minLength={8} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create Account"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account? <Link to="/login" className="text-primary font-medium">Sign in</Link>
            </p>
          </form>
        </Card>
      </main>
    </div>
  );
}
