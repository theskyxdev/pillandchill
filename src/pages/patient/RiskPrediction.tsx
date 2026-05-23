import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle, Activity } from "lucide-react";
import { motion } from "framer-motion";

const calculateRisk = (age: number, weight: number, bp: string, sugar: number): string => {
  let score = 0;
  if (age > 60) score += 3;
  else if (age > 45) score += 2;
  else if (age > 30) score += 1;

  if (weight > 100) score += 3;
  else if (weight > 80) score += 2;
  else if (weight > 70) score += 1;

  const systolic = parseInt(bp.split("/")[0]) || 120;
  if (systolic > 160) score += 3;
  else if (systolic > 140) score += 2;
  else if (systolic > 130) score += 1;

  if (sugar > 200) score += 3;
  else if (sugar > 140) score += 2;
  else if (sugar > 100) score += 1;

  if (score >= 8) return "High";
  if (score >= 4) return "Medium";
  return "Low";
};

const RiskPrediction = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ age: "", weight: "", bp: "", sugar_level: "" });
  const [result, setResult] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (riskScore: string) => {
      const { error } = await supabase.from("risk_records").insert({
        user_id: user!.id,
        age: parseInt(form.age),
        weight: parseFloat(form.weight),
        bp: form.bp,
        sugar_level: parseFloat(form.sugar_level),
        risk_score: riskScore,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk_records"] });
      toast.success("Risk assessment saved!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handlePredict = (e: React.FormEvent) => {
    e.preventDefault();
    const risk = calculateRisk(
      parseInt(form.age),
      parseFloat(form.weight),
      form.bp,
      parseFloat(form.sugar_level)
    );
    setResult(risk);
    saveMutation.mutate(risk);
  };

  const riskColor = result === "High" ? "destructive" : result === "Medium" ? "warning" : "accent";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">Health Risk Prediction</h2>
        <p className="text-muted-foreground text-sm">Assess your preventive health risk level</p>
      </div>

      <form onSubmit={handlePredict} className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Age</Label>
            <Input
              type="number"
              value={form.age}
              onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
              placeholder="30"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label>Weight (kg)</Label>
            <Input
              type="number"
              value={form.weight}
              onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))}
              placeholder="70"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label>Blood Pressure (e.g., 120/80)</Label>
            <Input
              value={form.bp}
              onChange={(e) => setForm((p) => ({ ...p, bp: e.target.value }))}
              placeholder="120/80"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label>Sugar Level (mg/dL)</Label>
            <Input
              type="number"
              value={form.sugar_level}
              onChange={(e) => setForm((p) => ({ ...p, sugar_level: e.target.value }))}
              placeholder="90"
              className="mt-1"
              required
            />
          </div>
        </div>
        <Button type="submit" className="gradient-primary text-primary-foreground gap-2">
          <Activity className="w-4 h-4" /> Predict Risk
        </Button>
      </form>

      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-xl border p-8 text-center ${
            riskColor === "destructive"
              ? "bg-destructive/5 border-destructive/20"
              : riskColor === "warning"
              ? "bg-warning/5 border-warning/20"
              : "bg-accent/5 border-accent/20"
          }`}
        >
          <AlertTriangle
            className={`w-12 h-12 mx-auto mb-3 ${
              riskColor === "destructive"
                ? "text-destructive"
                : riskColor === "warning"
                ? "text-warning"
                : "text-accent"
            }`}
          />
          <h3 className="text-2xl font-display font-bold text-foreground">Risk Level: {result}</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            {result === "High"
              ? "Please consult a healthcare professional immediately."
              : result === "Medium"
              ? "Consider lifestyle changes and regular check-ups."
              : "Great! Maintain your healthy lifestyle."}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default RiskPrediction;
