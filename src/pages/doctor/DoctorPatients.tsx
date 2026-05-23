import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText, AlertTriangle, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";

const DoctorPatients = () => {
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  const { data: patients, isLoading } = useQuery({
    queryKey: ["doctor-all-patients"],
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
        .in("user_id", patientIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: patientReports } = useQuery({
    queryKey: ["patient-reports", selectedPatient],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", selectedPatient!)
        .order("upload_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPatient,
  });

  const { data: patientRisk } = useQuery({
    queryKey: ["patient-risk", selectedPatient],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("risk_records")
        .select("*")
        .eq("user_id", selectedPatient!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPatient,
  });

  const { data: patientEmergency } = useQuery({
    queryKey: ["patient-emergency", selectedPatient],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_profiles")
        .select("*")
        .eq("user_id", selectedPatient!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPatient,
  });

  if (isLoading) return <p className="text-muted-foreground text-center py-12">Loading patients...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">Patient List</h2>
        <p className="text-muted-foreground text-sm">View all registered patients and their data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient List */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Mobile</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No patients registered yet
                  </TableCell>
                </TableRow>
              ) : (
                patients?.map((p) => (
                  <TableRow
                    key={p.id}
                    className={`cursor-pointer transition-colors ${
                      selectedPatient === p.user_id ? "bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedPatient(p.user_id)}
                  >
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.email}</TableCell>
                    <TableCell>{p.blood_group || "-"}</TableCell>
                    <TableCell>{p.age || "-"}</TableCell>
                    <TableCell>{p.mobile || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Patient Details */}
        <div className="space-y-4">
          {selectedPatient ? (
            <>
              {/* Risk */}
              {patientRisk && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-xl border border-border p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <h4 className="font-display font-semibold text-foreground text-sm">Latest Risk</h4>
                  </div>
                  <p className={`text-xl font-bold ${
                    patientRisk.risk_score === "High" ? "text-destructive" : patientRisk.risk_score === "Medium" ? "text-warning" : "text-accent"
                  }`}>
                    {patientRisk.risk_score}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    BP: {patientRisk.bp} · Sugar: {String(patientRisk.sugar_level)} mg/dL
                  </p>
                </motion.div>
              )}

              {/* Emergency */}
              {patientEmergency && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="bg-card rounded-xl border border-border p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-destructive" />
                    <h4 className="font-display font-semibold text-foreground text-sm">Emergency Info</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Blood:</span> {patientEmergency.blood_group || "-"}</p>
                    <p><span className="text-muted-foreground">Allergies:</span> {patientEmergency.allergies || "None"}</p>
                    <p><span className="text-muted-foreground">Diseases:</span> {patientEmergency.diseases || "None"}</p>
                    <p><span className="text-muted-foreground">Contact:</span> {patientEmergency.emergency_contact || "-"}</p>
                  </div>
                </motion.div>
              )}

              {/* Reports */}
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card rounded-xl border border-border p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-primary" />
                  <h4 className="font-display font-semibold text-foreground text-sm">Reports</h4>
                </div>
                {patientReports?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reports</p>
                ) : (
                  <div className="space-y-2">
                    {patientReports?.map((r) => (
                      <div key={r.id} className="text-sm flex justify-between">
                        <span className="text-foreground">{r.file_name || "Report"}</span>
                        <span className="text-muted-foreground">
                          {new Date(r.upload_date).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </>
          ) : (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Select a patient to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorPatients;
