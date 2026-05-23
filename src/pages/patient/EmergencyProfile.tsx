import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Shield, Save, Droplets, Phone, AlertTriangle, Heart } from "lucide-react";
import { motion } from "framer-motion";

const EmergencyProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    blood_group: "",
    allergies: "",
    emergency_contact: "",
    diseases: "",
  });
  const [editing, setEditing] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["emergency_profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        blood_group: profile.blood_group || "",
        allergies: profile.allergies || "",
        emergency_contact: profile.emergency_contact || "",
        diseases: profile.diseases || "",
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (profile) {
        const { error } = await supabase
          .from("emergency_profiles")
          .update(form)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("emergency_profiles")
          .insert({ user_id: user!.id, ...form });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergency_profile"] });
      setEditing(false);
      toast.success("Emergency profile saved!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const hasProfile = !!profile;

  if (isLoading) return <p className="text-muted-foreground text-center py-12">Loading...</p>;

  if (hasProfile && !editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Emergency Health Profile</h2>
            <p className="text-muted-foreground text-sm">Your critical health information</p>
          </div>
          <Button onClick={() => setEditing(true)} variant="outline" className="gap-2">
            Edit Profile
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border-2 border-destructive/20 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground">Emergency Card</h3>
              <p className="text-sm text-muted-foreground">Show this to emergency responders</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <Droplets className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Blood Group</p>
                <p className="font-bold text-lg text-foreground">{profile.blood_group || "Not set"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Emergency Contact</p>
                <p className="font-bold text-lg text-foreground">{profile.emergency_contact || "Not set"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Allergies</p>
                <p className="font-medium text-foreground">{profile.allergies || "None"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-accent mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Existing Diseases</p>
                <p className="font-medium text-foreground">{profile.diseases || "None"}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">Emergency Health Profile</h2>
        <p className="text-muted-foreground text-sm">Fill in your critical health information</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Blood Group</Label>
            <Input
              value={form.blood_group}
              onChange={(e) => setForm((p) => ({ ...p, blood_group: e.target.value }))}
              placeholder="A+"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Emergency Contact</Label>
            <Input
              value={form.emergency_contact}
              onChange={(e) => setForm((p) => ({ ...p, emergency_contact: e.target.value }))}
              placeholder="+1 234 567 890"
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label>Allergies</Label>
          <Textarea
            value={form.allergies}
            onChange={(e) => setForm((p) => ({ ...p, allergies: e.target.value }))}
            placeholder="Penicillin, Peanuts..."
            className="mt-1"
          />
        </div>
        <div>
          <Label>Existing Diseases</Label>
          <Textarea
            value={form.diseases}
            onChange={(e) => setForm((p) => ({ ...p, diseases: e.target.value }))}
            placeholder="Diabetes, Hypertension..."
            className="mt-1"
          />
        </div>

        <div className="flex gap-3">
          <Button onClick={() => saveMutation.mutate()} className="gradient-primary text-primary-foreground gap-2">
            <Save className="w-4 h-4" /> Save Profile
          </Button>
          {editing && (
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmergencyProfile;
