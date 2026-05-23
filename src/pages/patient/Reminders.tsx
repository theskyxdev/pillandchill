import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Pill, Plus, Trash2, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const Reminders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ medicine_name: "", dosage: "", time: "" });

  const today = new Date().toISOString().split("T")[0];

  const { data: reminders, isLoading } = useQuery({
    queryKey: ["reminders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch today's medicine logs
  const { data: todayLogs } = useQuery({
    queryKey: ["medicine-logs-today", user?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicine_logs")
        .select("*")
        .eq("user_id", user!.id)
        .eq("taken_date", today);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch today's SMS logs
  const { data: smsLogs } = useQuery({
    queryKey: ["sms-logs-today", user?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_logs")
        .select("*")
        .eq("user_id", user!.id)
        .eq("sent_date", today);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const takenReminderIds = new Set(todayLogs?.map((l) => l.reminder_id) ?? []);

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reminders").insert({
        user_id: user!.id,
        medicine_name: form.medicine_name,
        dosage: form.dosage,
        time: form.time,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      setForm({ medicine_name: "", dosage: "", time: "" });
      setShowForm(false);
      toast.success("Reminder added!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Reminder removed");
    },
  });

  const markTakenMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase.from("medicine_logs").insert({
        reminder_id: reminderId,
        user_id: user!.id,
        taken_date: today,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicine-logs-today"] });
      toast.success("Marked as taken ✅");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const unmarkTakenMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from("medicine_logs")
        .delete()
        .eq("reminder_id", reminderId)
        .eq("user_id", user!.id)
        .eq("taken_date", today);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicine-logs-today"] });
      toast.success("Unmarked");
    },
  });

  const getStatus = (timeStr: string, reminderId: string) => {
    const taken = takenReminderIds.has(reminderId);
    if (taken) return "taken";
    const now = new Date();
    const [h, m] = timeStr.split(":").map(Number);
    if (now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m)) return "missed";
    return "upcoming";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Medicine Reminders</h2>
          <p className="text-muted-foreground text-sm">Track your medications and dosages</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> Add Reminder
        </Button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-card rounded-xl border border-border p-5"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Medicine Name</Label>
              <Input
                value={form.medicine_name}
                onChange={(e) => setForm((p) => ({ ...p, medicine_name: e.target.value }))}
                placeholder="Paracetamol"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Dosage</Label>
              <Input
                value={form.dosage}
                onChange={(e) => setForm((p) => ({ ...p, dosage: e.target.value }))}
                placeholder="500mg"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Time</Label>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <Button
            onClick={() => addMutation.mutate()}
            disabled={!form.medicine_name || !form.time}
            className="mt-4 gradient-accent text-accent-foreground"
          >
            Save Reminder
          </Button>
        </motion.div>
      )}

      {/* SMS Log Summary */}
      {smsLogs && smsLogs.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm font-medium text-foreground mb-2">📱 SMS Notifications Today</p>
          <div className="space-y-1">
            {smsLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={log.status === "sent" ? "default" : "secondary"} className="text-xs">
                  {log.status === "sent" ? "Sent" : "Simulated"}
                </Badge>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground text-center py-12">Loading...</p>
      ) : reminders?.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Pill className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No reminders yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders?.map((r, i) => {
            const status = getStatus(r.time, r.id);
            const taken = status === "taken";
            const missed = status === "missed";

            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`bg-card rounded-xl border p-4 flex items-center justify-between ${
                  taken
                    ? "border-green-500/30 bg-green-500/5"
                    : missed
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      taken
                        ? "bg-green-500/10"
                        : missed
                        ? "bg-destructive/10"
                        : "bg-accent/10"
                    }`}
                  >
                    {taken ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : missed ? (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    ) : (
                      <Pill className="w-5 h-5 text-accent" />
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${taken ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {r.medicine_name}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {r.dosage && <span>{r.dosage}</span>}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {r.time}
                      </span>
                      <Badge
                        variant={taken ? "default" : missed ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {taken ? "Taken" : missed ? "Missed" : "Upcoming"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {taken ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unmarkTakenMutation.mutate(r.id)}
                      className="text-muted-foreground text-xs"
                    >
                      Undo
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markTakenMutation.mutate(r.id)}
                      className="text-green-600 border-green-500/30 hover:bg-green-500/10 text-xs gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Taken
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(r.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Reminders;
