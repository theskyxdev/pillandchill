import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Pill, AlertTriangle, Shield, Activity, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const statCards = [
  { label: "Medical Records", icon: FileText, to: "/records", color: "primary" },
  { label: "Reminders", icon: Pill, to: "/reminders", color: "accent" },
  { label: "Lab Analysis", icon: Activity, to: "/lab-analysis", color: "warning" },
  { label: "AI Assistant", icon: MessageSquare, to: "/ai-assistant", color: "primary" },
  { label: "Risk Prediction", icon: AlertTriangle, to: "/risk-prediction", color: "destructive" },
  { label: "Emergency Profile", icon: Shield, to: "/emergency", color: "accent" },
];

const PatientDashboard = () => {
  const { user, profile } = useAuth();

  const { data: reportsCount } = useQuery({
    queryKey: ["reports-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: remindersCount } = useQuery({
    queryKey: ["reminders-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("reminders")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl gradient-hero p-8 text-primary-foreground"
      >
        <h2 className="text-2xl font-display font-bold mb-2">
          Welcome back, {profile?.name?.split(" ")[0] || "Patient"} 👋
        </h2>
        <p className="text-primary-foreground/70">
          Your health dashboard is ready. Stay on top of your medical records and wellness.
        </p>
        <div className="flex gap-6 mt-6">
          <div>
            <p className="text-3xl font-bold">{reportsCount ?? 0}</p>
            <p className="text-sm text-primary-foreground/60">Reports</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{remindersCount ?? 0}</p>
            <p className="text-sm text-primary-foreground/60">Reminders</p>
          </div>
        </div>
      </motion.div>

      {/* Quick Access Cards */}
      <div>
        <h3 className="text-lg font-display font-semibold text-foreground mb-4">Quick Access</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {statCards.map(({ label, icon: Icon, to, color }, i) => (
            <motion.div
              key={to}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={to}
                className="block bg-card rounded-xl p-5 shadow-card hover:shadow-elevated transition-all border border-border group"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                    color === "primary"
                      ? "bg-primary/10 text-primary"
                      : color === "accent"
                      ? "bg-accent/10 text-accent"
                      : color === "warning"
                      ? "bg-warning/10 text-warning"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {label}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
