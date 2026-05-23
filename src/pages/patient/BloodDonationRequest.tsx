import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Droplets, Phone, MapPin, Star, Clock, Plus, CheckCircle, XCircle, AlertCircle, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const statusConfig = {
  pending: { label: "Pending", icon: AlertCircle, color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  approved: { label: "Approved", icon: CheckCircle, color: "bg-green-500/10 text-green-600 border-green-500/20" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const urgencyConfig = {
  normal: "bg-muted text-muted-foreground",
  urgent: "bg-orange-500/10 text-orange-600",
  critical: "bg-destructive/10 text-destructive",
};

export default function BloodDonationRequest() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    blood_group: profile?.blood_group || "",
    units_needed: "1",
    reason: "",
    urgency: "normal",
    preferred_bank_id: "",
  });

  const { data: banks } = useQuery({
    queryKey: ["blood-banks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blood_banks").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: myRequests, isLoading } = useQuery({
    queryKey: ["my-blood-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_donation_requests")
        .select("*, blood_banks(name, address)")
        .eq("patient_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("blood_donation_requests").insert({
        patient_id: user!.id,
        blood_group: form.blood_group,
        units_needed: parseInt(form.units_needed),
        reason: form.reason,
        urgency: form.urgency,
        preferred_bank_id: form.preferred_bank_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-blood-requests"] });
      setOpen(false);
      setForm({ blood_group: profile?.blood_group || "", units_needed: "1", reason: "", urgency: "normal", preferred_bank_id: "" });
      toast({ title: "Request submitted!", description: "Your blood donation request has been sent to the doctor." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Droplets className="w-5 h-5 text-destructive" /> Blood Donation
          </h2>
          <p className="text-muted-foreground text-sm">Apply for blood or find nearby blood banks</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 gradient-primary text-primary-foreground">
              <Plus className="w-4 h-4" /> Apply for Blood
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-destructive" /> Blood Donation Request
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Blood Group Needed</label>
                <Select value={form.blood_group} onValueChange={(v) => setForm({ ...form, blood_group: v })}>
                  <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((bg) => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Units Needed</label>
                <Input type="number" min="1" max="10" value={form.units_needed} onChange={(e) => setForm({ ...form, units_needed: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Urgency</label>
                <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Preferred Blood Bank (optional)</label>
                <Select value={form.preferred_bank_id} onValueChange={(v) => setForm({ ...form, preferred_bank_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Any available bank" /></SelectTrigger>
                  <SelectContent>
                    {banks?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Reason / Medical Notes</label>
                <Textarea placeholder="Briefly describe why blood is needed..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} />
              </div>
              <Button className="w-full gradient-primary text-primary-foreground" onClick={() => submit.mutate()} disabled={!form.blood_group || submit.isPending}>
                {submit.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* My Requests */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-3">My Requests</h3>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : !myRequests?.length ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
            <Droplets className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
            <p>No blood donation requests yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myRequests.map((req, i) => {
              const s = statusConfig[req.status as keyof typeof statusConfig] || statusConfig.pending;
              const StatusIcon = s.icon;
              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 bg-destructive/10 text-destructive px-2 py-0.5 rounded-full text-sm font-bold">
                        <Droplets className="w-3 h-3" /> {req.blood_group}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgencyConfig[req.urgency as keyof typeof urgencyConfig]}`}>
                        {req.urgency.charAt(0).toUpperCase() + req.urgency.slice(1)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${s.color}`}>
                        <StatusIcon className="w-3 h-3" /> {s.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{req.units_needed} unit(s) needed{req.reason ? ` · ${req.reason}` : ""}</p>
                    {(req as any).blood_banks && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {(req as any).blood_banks.name}
                      </p>
                    )}
                    {req.doctor_note && (
                      <p className="text-xs text-primary border border-primary/20 bg-primary/5 rounded-lg px-3 py-1.5 mt-1">
                        🩺 Doctor note: {req.doctor_note}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(req.created_at).toLocaleDateString()}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Blood Banks */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" /> Blood Banks in Kolhapur
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banks?.map((bank, i) => (
            <motion.div
              key={bank.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-card border border-border rounded-xl p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{bank.name}</h4>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{bank.type}</span>
                </div>
              {bank.rating && (
                  <div className="flex items-center gap-1 text-primary text-xs font-medium flex-shrink-0">
                    <Star className="w-3.5 h-3.5 fill-primary" /> {bank.rating}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" /> {bank.address}
              </p>
              {bank.contact && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <a href={`tel:${bank.contact}`} className="hover:text-primary transition-colors">{bank.contact}</a>
                </p>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3 flex-shrink-0" /> {bank.availability}
              </p>
              {bank.services && (
                <p className="text-xs text-muted-foreground border-t border-border pt-2 mt-1">{bank.services}</p>
              )}
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
