import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Heart,
  LayoutDashboard,
  FileText,
  Pill,
  Activity,
  MessageSquare,
  Shield,
  AlertTriangle,
  Users,
  LogOut,
  ChevronLeft,
  Menu,
  Droplets,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const patientLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/records", icon: FileText, label: "Medical Records" },
  { to: "/reminders", icon: Pill, label: "Reminders" },
  { to: "/lab-analysis", icon: Activity, label: "Lab Analysis" },
  { to: "/ai-assistant", icon: MessageSquare, label: "AI Assistant" },
  { to: "/risk-prediction", icon: AlertTriangle, label: "Risk Prediction" },
  { to: "/emergency", icon: Shield, label: "Emergency Profile" },
  { to: "/blood-donation", icon: Droplets, label: "Blood Donation" },
];

const doctorLinks = [
  { to: "/doctor", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/doctor/patients", icon: Users, label: "Patients" },
  { to: "/doctor/blood-donation", icon: Heart, label: "Blood Donation" },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { role, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = role === "doctor" ? doctorLinks : patientLinks;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
          <Heart className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-sidebar-primary-foreground font-display font-bold text-lg">
            Pill & Chill
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/dashboard" || to === "/doctor"}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full gradient-accent flex items-center justify-center flex-shrink-0">
            <span className="text-accent-foreground text-sm font-bold">
              {profile?.name?.[0]?.toUpperCase() || "U"}
            </span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
                {profile?.name || "User"}
              </p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{role}</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start gap-2 text-sidebar-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && "Sign Out"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-5 -right-3 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:bg-muted transition-colors z-10"
          style={{ left: collapsed ? 60 : 248 }}
        >
          <ChevronLeft className={cn("w-3 h-3 text-muted-foreground transition-transform", collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-foreground/20" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full bg-sidebar">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 lg:px-8 h-16 flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">
              {role === "doctor" ? "Doctor Dashboard" : "Patient Dashboard"}
            </h1>
          </div>
        </header>
        <div className="flex-1 p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
