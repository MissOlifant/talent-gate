import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function SiteHeader() {
  const { user, role, signOut } = useAuth();
  return (
    <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="grid place-items-center h-9 w-9 rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          TalentGate
        </Link>
        <nav className="flex items-center gap-2">
          {!user && (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">Candidate Login</Button></Link>
              <Link to="/register"><Button variant="outline" size="sm">Register</Button></Link>
              <Link to="/admin-login"><Button size="sm">Admin Login</Button></Link>
            </>
          )}
          {user && role === "candidate" && (
            <>
              <Link to="/dashboard"><Button variant="ghost" size="sm">Dashboard</Button></Link>
              <Button size="sm" variant="outline" onClick={signOut}>Logout</Button>
            </>
          )}
          {user && role === "admin" && (
            <>
              <Link to="/admin"><Button variant="ghost" size="sm">Admin</Button></Link>
              <Button size="sm" variant="outline" onClick={signOut}>Logout</Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
