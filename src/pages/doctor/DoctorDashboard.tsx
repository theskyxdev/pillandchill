import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, FileText, AlertTriangle, Pill, CheckCircle, XCircle,
  Search, TrendingUp, Activity, Heart, Shield, Clock
} from "lucide-react";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useMemo, useState } from "react";

const DoctorDashboard = () => {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: patients } = useQuery({
    queryKey: ["doctor-patients"],
    queryFn: async () => {
      const { data: patientRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "patient");
      if (rolesError) throw rolesError;
      if (!patientRoles?.length) return [];

      const patientIds = patientRoles.map((r) => r.user_id);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", patientIds);
      if (error) throw error;
      return data;
    },
  });

  const { data: reports } = useQuery({
    queryKey: ["doctor-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("upload_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const { data: risks } = useQuery({
    queryKey: ["doctor-risks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("risk_records")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allReminders } = useQuery({
    queryKey: ["doctor-all-reminders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: emergencyProfiles } = useQuery({
    queryKey: ["doctor-emergencies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_profiles")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: bloodRequests } = useQuery({
    queryKey: ["doctor-blood-requests-recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_donation_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const today = new Date().toISOString().split("T")[0];

  const { data: allLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["doctor-medicine-logs-today", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicine_logs")
        .select("*")
        .eq("taken_date", today);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("doctor-medicine-logs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "medicine_logs" },
        () => { refetchLogs(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetchLogs]);

  const takenMap = new Set(allLogs?.map((l) => l.reminder_id) ?? []);

  // --- Derived data ---

  // Latest risk per patient
  const latestRiskByPatient = useMemo(() => {
    const map: Record<string, { risk_score: string; created_at: string; bp?: string | null; sugar_level?: number | null; weight?: number | null }> = {};
    risks?.forEach((r) => {
      if (!map[r.user_id]) map[r.user_id] = r;
    });
    return map;
  }, [risks]);

  // Priority ranking
  const rankedPatients = useMemo(() => {
    if (!patients) return [];
    return patients
      .map((p) => {
        const risk = latestRiskByPatient[p.user_id];
        const priority = risk?.risk_score === "High" ? 0 : risk?.risk_score === "Medium" ? 1 : 2;
        const riskLabel = risk?.risk_score || "Unknown";
        return { ...p, priority, riskLabel, riskData: risk };
      })
      .sort((a, b) => a.priority - b.priority);
  }, [patients, latestRiskByPatient]);

  // Search filter
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return rankedPatients;
    const q = searchQuery.toLowerCase();
    return rankedPatients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.blood_group && p.blood_group.toLowerCase().includes(q))
    );
  }, [rankedPatients, searchQuery]);

  // Stats
  const highRiskCount = rankedPatients.filter((p) => p.riskLabel === "High").length;
  const mediumRiskCount = rankedPatients.filter((p) => p.riskLabel === "Medium").length;
  const lowRiskCount = rankedPatients.filter((p) => p.riskLabel === "Low").length;

  // Reminders by patient
  const remindersByPatient = allReminders?.reduce((acc: Record<string, any[]>, r) => {
    if (!acc[r.user_id]) acc[r.user_id] = [];
    acc[r.user_id].push(r);
    return acc;
  }, {} as Record<string, any[]>) ?? {};

  // Treatment progress: % of medicines taken today per patient
  const treatmentProgress = useMemo(() => {
    if (!patients || !allReminders) return [];
    return patients.map((p) => {
      const rems = remindersByPatient[p.user_id] || [];
      const total = rems.length;
      const taken = rems.filter((r: any) => takenMap.has(r.id)).length;
      return { name: p.name, userId: p.user_id, total, taken, percent: total > 0 ? Math.round((taken / total) * 100) : 0 };
    }).filter((p) => p.total > 0).sort((a, b) => a.percent - b.percent);
  }, [patients, allReminders, takenMap, remindersByPatient]);

  // Recent alerts
  const recentAlerts = useMemo(() => {
    const alerts: { id: string; type: string; message: string; time: string; severity: "high" | "medium" | "low" }[] = [];
    const patientMap = new Map(patients?.map((p) => [p.user_id, p.name]) ?? []);

    // Urgent blood requests
    bloodRequests?.forEach((br) => {
      if (br.status === "pending") {
        const name = patientMap.get(br.patient_id) || "Unknown";
        alerts.push({
          id: `br-${br.id}`,
          type: "Blood Request",
          message: `${name} needs ${br.units_needed} unit(s) of ${br.blood_group}`,
          time: br.created_at,
          severity: br.urgency === "urgent" ? "high" : br.urgency === "high" ? "high" : "medium",
        });
      }
    });

    // High risk patients
    risks?.slice(0, 5).forEach((r) => {
      if (r.risk_score === "High") {
        const name = patientMap.get(r.user_id) || "Unknown";
        alerts.push({
          id: `risk-${r.id}`,
          type: "High Risk",
          message: `${name} flagged as high risk`,
          time: r.created_at,
          severity: "high",
        });
      }
    });

    // Missed medicines
    patients?.forEach((p) => {
      const rems = remindersByPatient[p.user_id] || [];
      const now = new Date();
      rems.forEach((rem: any) => {
        const taken = takenMap.has(rem.id);
        const [h, m] = rem.time.split(":").map(Number);
        const missed = !taken && (now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m));
        if (missed) {
          alerts.push({
            id: `miss-${rem.id}`,
            type: "Missed Medicine",
            message: `${p.name} missed ${rem.medicine_name} at ${rem.time}`,
            time: today,
            severity: "medium",
          });
        }
      });
    });

    return alerts.sort((a, b) => {
      const sev = { high: 0, medium: 1, low: 2 };
      return sev[a.severity] - sev[b.severity];
    }).slice(0, 8);
  }, [bloodRequests, risks, patients, remindersByPatient, takenMap, today]);

  const getRiskBadge = (label: string) => {
    switch (label) {
      case "High":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30 gap-1"><AlertTriangle className="w-3 h-3" /> High</Badge>;
      case "Medium":
        return <Badge className="bg-warning/10 text-warning border-warning/30 gap-1"><Activity className="w-3 h-3" /> Medium</Badge>;
      case "Low":
        return <Badge className="bg-accent/10 text-accent border-accent/30 gap-1"><Shield className="w-3 h-3" /> Low</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1">Unknown</Badge>;
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case "high": return <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />;
      case "medium": return <div className="w-2 h-2 rounded-full bg-warning" />;
      default: return <div className="w-2 h-2 rounded-full bg-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl gradient-hero p-8 text-primary-foreground">
        <h2 className="text-2xl font-display font-bold mb-2">
          Welcome, Dr. {profile?.name?.split(" ").pop() || "Doctor"} 👋
        </h2>
        <p className="text-primary-foreground/70">Here's an overview of your patients and their health data.</p>
        <div className="flex gap-8 mt-6">
          <div><p className="text-3xl font-bold">{patients?.length ?? 0}</p><p className="text-sm text-primary-foreground/60">Patients</p></div>
          <div><p className="text-3xl font-bold">{reports?.length ?? 0}</p><p className="text-sm text-primary-foreground/60">Reports</p></div>
          <div><p className="text-3xl font-bold">{highRiskCount}</p><p className="text-sm text-primary-foreground/60">High Risk</p></div>
        </div>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search patients by name, email, or blood group..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Risk Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{patients?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total Patients</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{highRiskCount}</p>
              <p className="text-xs text-muted-foreground">High Risk</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning/30">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{mediumRiskCount}</p>
              <p className="text-xs text-muted-foreground">Medium Risk</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-accent/30">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{lowRiskCount}</p>
              <p className="text-xs text-muted-foreground">Low Risk</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="patients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="patients">Patient Priority</TabsTrigger>
          <TabsTrigger value="alerts">Recent Alerts ({recentAlerts.length})</TabsTrigger>
          <TabsTrigger value="progress">Treatment Progress</TabsTrigger>
          <TabsTrigger value="tracking">Medicine Tracking</TabsTrigger>
        </TabsList>

        {/* Patient Priority Ranking with Summary Cards */}
        <TabsContent value="patients">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.length > 0 ? filteredPatients.map((p, i) => {
              const emergency = emergencyProfiles?.find((e) => e.user_id === p.user_id);
              const remCount = (remindersByPatient[p.user_id] || []).length;
              const takenCount = (remindersByPatient[p.user_id] || []).filter((r: any) => takenMap.has(r.id)).length;

              return (
                <motion.div
                  key={p.user_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={`border-border hover:shadow-elevated transition-shadow ${p.riskLabel === "High" ? "border-l-4 border-l-destructive" : p.riskLabel === "Medium" ? "border-l-4 border-l-warning" : "border-l-4 border-l-accent"}`}>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-display font-semibold text-foreground">{p.name}</h4>
                          <p className="text-xs text-muted-foreground">{p.email}</p>
                        </div>
                        {getRiskBadge(p.riskLabel)}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-secondary rounded-lg p-2">
                          <p className="text-sm font-bold text-foreground">{p.blood_group || "—"}</p>
                          <p className="text-[10px] text-muted-foreground">Blood</p>
                        </div>
                        <div className="bg-secondary rounded-lg p-2">
                          <p className="text-sm font-bold text-foreground">{p.age ?? "—"}</p>
                          <p className="text-[10px] text-muted-foreground">Age</p>
                        </div>
                        <div className="bg-secondary rounded-lg p-2">
                          <p className="text-sm font-bold text-foreground">{remCount}</p>
                          <p className="text-[10px] text-muted-foreground">Meds</p>
                        </div>
                      </div>
                      {p.riskData && (
                        <div className="text-xs text-muted-foreground space-y-1">
                          {p.riskData.bp && <p>BP: <span className="text-foreground font-medium">{p.riskData.bp}</span></p>}
                          {p.riskData.sugar_level && <p>Sugar: <span className="text-foreground font-medium">{p.riskData.sugar_level} mg/dL</span></p>}
                        </div>
                      )}
                      {emergency?.allergies && (
                        <p className="text-xs text-destructive/80">⚠ Allergies: {emergency.allergies}</p>
                      )}
                      {remCount > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Pill className="w-3 h-3" />
                          <span>{takenCount}/{remCount} taken today</span>
                          <Progress value={remCount > 0 ? (takenCount / remCount) * 100 : 0} className="h-1.5 flex-1" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            }) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                {searchQuery ? "No patients match your search" : "No patients registered yet"}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Recent Alerts */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Recent Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentAlerts.length > 0 ? recentAlerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border"
                >
                  {getAlertIcon(alert.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] shrink-0">{alert.type}</Badge>
                      <p className="text-sm text-foreground truncate">{alert.message}</p>
                    </div>
                  </div>
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                </motion.div>
              )) : (
                <p className="text-center text-muted-foreground py-8">No recent alerts — all clear! ✅</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Treatment Progress */}
        <TabsContent value="progress">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Treatment Progress Today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {treatmentProgress.length > 0 ? treatmentProgress.map((tp) => (
                <div key={tp.userId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{tp.name}</span>
                    <span className="text-muted-foreground">{tp.taken}/{tp.total} ({tp.percent}%)</span>
                  </div>
                  <Progress
                    value={tp.percent}
                    className={`h-2.5 ${tp.percent === 100 ? "[&>div]:bg-accent" : tp.percent >= 50 ? "[&>div]:bg-primary" : "[&>div]:bg-destructive"}`}
                  />
                </div>
              )) : (
                <p className="text-center text-muted-foreground py-8">No medicine reminders set for any patient</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medicine Tracking Table */}
        <TabsContent value="tracking">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Pill className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">Patient Tablet Tracking</h3>
                <p className="text-xs text-muted-foreground">Real-time medicine adherence for today</p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients && patients.length > 0 ? (
                  patients.flatMap((patient) => {
                    const reminders = remindersByPatient[patient.user_id] || [];
                    if (reminders.length === 0) {
                      return [
                        <TableRow key={patient.user_id}>
                          <TableCell className="font-medium">{patient.name}</TableCell>
                          <TableCell colSpan={4} className="text-muted-foreground text-sm">No medicines set</TableCell>
                        </TableRow>,
                      ];
                    }
                    return reminders.map((rem: any, idx: number) => {
                      const taken = takenMap.has(rem.id);
                      const now = new Date();
                      const [h, m] = rem.time.split(":").map(Number);
                      const missed = !taken && (now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m));
                      return (
                        <TableRow key={rem.id}>
                          {idx === 0 && (
                            <TableCell rowSpan={reminders.length} className="font-medium align-top">{patient.name}</TableCell>
                          )}
                          <TableCell>{rem.medicine_name}</TableCell>
                          <TableCell className="text-muted-foreground">{rem.dosage || "-"}</TableCell>
                          <TableCell>{rem.time}</TableCell>
                          <TableCell>
                            {taken ? (
                              <Badge className="bg-accent/10 text-accent border-accent/30 gap-1"><CheckCircle className="w-3 h-3" /> Taken</Badge>
                            ) : missed ? (
                              <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Missed</Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1"><Pill className="w-3 h-3" /> Upcoming</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No patients registered yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DoctorDashboard;
