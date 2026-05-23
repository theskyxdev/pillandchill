import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Droplets, Phone, User, Heart, MapPin, Star, Clock, CheckCircle, XCircle, AlertCircle, Building2, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const BloodDonation = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [reviewReq, setReviewReq] = useState<any>(null);
  const [doctorNote, setDoctorNote] = useState("");

  // ─── Patient directory ───────────────────────────────────────────
  const { data: patients, isLoading } = useQuery({
    queryKey: ["blood-donation-patients"],
    queryFn: async () => {
      const { data: patientRoles, error: rolesError } = await supabase
        .from("user_roles").select("user_id").eq("role", "patient");
      if (rolesError) throw rolesError;
      if (!patientRoles?.length) return [];
      const { data, error } = await supabase
        .from("profiles").select("*")
        .in("user_id", patientRoles.map((r) => r.user_id))
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: emergencyProfiles } = useQuery({
    queryKey: ["blood-donation-emergency"],
    queryFn: async () => {
      const { data, error } = await supabase.from("emergency_profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  // ─── Blood banks ─────────────────────────────────────────────────
  const { data: banks } = useQuery({
    queryKey: ["blood-banks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blood_banks").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // ─── Donation requests ───────────────────────────────────────────
  const { data: donationRequests } = useQuery({
    queryKey: ["donation-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_donation_requests")
        .select("*, blood_banks(name), profiles!blood_donation_requests_patient_id_fkey(name, email, mobile, blood_group)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("blood_donation_requests")
        .update({ status, doctor_id: user?.id, doctor_note: doctorNote })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donation-requests"] });
      setReviewReq(null);
      setDoctorNote("");
      toast({ title: "Request updated successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const emergencyMap = (emergencyProfiles || []).reduce((acc: Record<string, any>, ep) => {
    acc[ep.user_id] = ep;
    return acc;
  }, {});

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const filtered = patients?.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.mobile?.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = !filterGroup || p.blood_group === filterGroup;
    return matchesSearch && matchesGroup;
  });
  const groupCounts = bloodGroups.map((bg) => ({
    group: bg,
    count: patients?.filter((p) => p.blood_group === bg).length ?? 0,
  }));

  const pendingCount = donationRequests?.filter((r) => r.status === "pending").length ?? 0;

  const statusBadge = (status: string) => {
    if (status === "approved") return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"><CheckCircle className="w-3 h-3" />Approved</span>;
    if (status === "rejected") return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium"><XCircle className="w-3 h-3" />Rejected</span>;
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent/50 text-accent-foreground font-medium"><AlertCircle className="w-3 h-3" />Pending</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
          <Droplets className="w-5 h-5 text-destructive" /> Blood Donation Management
        </h2>
        <p className="text-muted-foreground text-sm">Manage requests, view patient directory and blood banks</p>
      </div>

      <Tabs defaultValue="requests">
        <TabsList className="mb-4">
          <TabsTrigger value="requests" className="gap-2">
            Requests {pendingCount > 0 && <span className="bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 font-bold">{pendingCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="directory">Patient Directory</TabsTrigger>
          <TabsTrigger value="banks">Blood Banks</TabsTrigger>
        </TabsList>

        {/* ── REQUESTS TAB ── */}
        <TabsContent value="requests" className="space-y-4">
          {!donationRequests?.length ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
              <Droplets className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
              <p>No blood donation requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {donationRequests.map((req, i) => {
                const p = (req as any).profiles;
                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm">{p?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{p?.email}</p>
                        {p?.mobile && <p className="text-xs text-muted-foreground">{p.mobile}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 bg-destructive/10 text-destructive px-2 py-1 rounded-full text-sm font-bold">
                        <Heart className="w-3 h-3" /> {req.blood_group}
                      </span>
                      <span className="text-xs text-muted-foreground">{req.units_needed} unit(s)</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.urgency === "critical" ? "bg-destructive/10 text-destructive" : req.urgency === "urgent" ? "bg-orange-500/10 text-orange-600" : "bg-muted text-muted-foreground"}`}>
                        {req.urgency}
                      </span>
                      {statusBadge(req.status)}
                    </div>
                    {req.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => { setReviewReq(req); setDoctorNote(""); }}>
                        Review
                      </Button>
                    )}
                    {req.doctor_note && (
                      <p className="text-xs text-muted-foreground italic hidden sm:block max-w-[160px] truncate">"{req.doctor_note}"</p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── DIRECTORY TAB ── */}
        <TabsContent value="directory" className="space-y-4">
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {groupCounts.map(({ group, count }) => (
              <motion.button
                key={group}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setFilterGroup(filterGroup === group ? "" : group)}
                className={`rounded-xl border p-3 text-center transition-all ${filterGroup === group ? "border-destructive bg-destructive/10 text-destructive" : "border-border bg-card text-foreground hover:border-destructive/30"}`}
              >
                <p className="text-lg font-bold">{group}</p>
                <p className="text-xs text-muted-foreground">{count}</p>
              </motion.button>
            ))}
          </div>
          <Input placeholder="Search by name or mobile..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          {isLoading ? <p className="text-muted-foreground text-center py-12">Loading...</p> : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Blood Group</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Allergies</TableHead>
                    <TableHead>Diseases</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered?.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No patients found</TableCell></TableRow>
                  ) : (
                    filtered?.map((p) => {
                      const ep = emergencyMap[p.user_id];
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              {p.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 bg-destructive/10 text-destructive px-2 py-1 rounded-full text-sm font-semibold">
                              <Heart className="w-3 h-3" /> {p.blood_group || "-"}
                            </span>
                          </TableCell>
                          <TableCell>{p.mobile ? <span className="flex items-center gap-1 text-sm"><Phone className="w-3 h-3 text-muted-foreground" />{p.mobile}</span> : "-"}</TableCell>
                          <TableCell>{p.age || "-"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{p.email}</TableCell>
                          <TableCell className="text-sm">{ep?.allergies || "None"}</TableCell>
                          <TableCell className="text-sm">{ep?.diseases || "None"}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── BLOOD BANKS TAB ── */}
        <TabsContent value="banks" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {banks?.map((bank, i) => (
              <motion.div
                key={bank.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-card border border-border rounded-xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-foreground">{bank.name}</h4>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{bank.type}</span>
                  </div>
                  {bank.rating && (
                    <div className="flex items-center gap-1 text-primary text-sm font-semibold flex-shrink-0">
                      <Star className="w-4 h-4 fill-primary" /> {bank.rating}
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground/60" /> {bank.address}
                </p>
                {bank.contact && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4 flex-shrink-0 text-muted-foreground/60" />
                    <a href={`tel:${bank.contact}`} className="hover:text-primary transition-colors">{bank.contact}</a>
                  </p>
                )}
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 flex-shrink-0 text-muted-foreground/60" /> {bank.availability}
                </p>
                {bank.services && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-2">{bank.services}</p>
                )}
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!reviewReq} onOpenChange={(o) => !o && setReviewReq(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Blood Request</DialogTitle>
          </DialogHeader>
          {reviewReq && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <p><span className="font-medium">Patient:</span> {(reviewReq as any).profiles?.name}</p>
                <p><span className="font-medium">Blood Group:</span> {reviewReq.blood_group}</p>
                <p><span className="font-medium">Units:</span> {reviewReq.units_needed}</p>
                <p><span className="font-medium">Urgency:</span> {reviewReq.urgency}</p>
                {reviewReq.reason && <p><span className="font-medium">Reason:</span> {reviewReq.reason}</p>}
                {(reviewReq as any).blood_banks && <p><span className="font-medium">Preferred Bank:</span> {(reviewReq as any).blood_banks.name}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Doctor's Note (optional)</label>
                <Textarea placeholder="Add a note for the patient..." value={doctorNote} onChange={(e) => setDoctorNote(e.target.value)} rows={3} />
              </div>
              <div className="flex gap-3">
                <Button className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-2" onClick={() => updateRequest.mutate({ id: reviewReq.id, status: "approved" })} disabled={updateRequest.isPending}>
                  <CheckCircle className="w-4 h-4" /> Approve
                </Button>
                <Button variant="destructive" className="flex-1 gap-2" onClick={() => updateRequest.mutate({ id: reviewReq.id, status: "rejected" })} disabled={updateRequest.isPending}>
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BloodDonation;
