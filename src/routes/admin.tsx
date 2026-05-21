import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileQuestion, Settings, LogOut, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "Admin — TalentGate" }] }),
});

function AdminLayout() {
  const { user, role, loading, signOut } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/admin-login" });
    else if (role && role !== "admin") nav({ to: "/dashboard" });
    else if (user && role === "admin") {
      supabase.rpc("password_expired", { _user_id: user.id }).then(({ data }) => {
        if (data === true) nav({ to: "/change-password" });
      });
    }
  }, [user, role, loading, nav]);

  const items = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/questions", label: "Questions", icon: FileQuestion },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ];

  if (!user || role !== "admin") {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Checking access…</div>;
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 border-r bg-card flex flex-col">
        <div className="h-16 px-5 flex items-center gap-2 border-b font-bold">
          <span className="grid place-items-center h-8 w-8 rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </span>
          TalentGate
        </div>
        <nav className="p-3 flex-1 space-y-1">
          {items.map((it) => {
            const active = it.exact ? path === it.to : path.startsWith(it.to);
            return (
              <Link key={it.to} to={it.to as any} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                <it.icon className="h-4 w-4" /> {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { signOut(); nav({ to: "/" }); }}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {path === "/admin" ? <AdminDashboardInline /> : <Outlet />}
      </main>
    </div>
  );
}

import AdminDashboardInline from "@/components/admin/AdminDashboard";
