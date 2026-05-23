import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Heart, Stethoscope, Mail, Lock, User, Phone, Droplets } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AuthPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    mobile: "",
    blood_group: "",
    specialization: "",
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        toast.success("Logged in successfully!");
      } else {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              name: form.name,
              mobile: form.mobile,
              blood_group: role === "patient" ? form.blood_group : "",
              age: null,
              specialization: role === "doctor" ? form.specialization : "",
              role: role,
            },
          },
        });
        if (error) throw error;
        toast.success("Account created! You can now log in.");
        setIsLogin(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute bottom-32 right-16 w-48 h-48 rounded-full bg-accent/30 blur-3xl" />
        </div>
        <div className="relative z-10 text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary mb-8">
            <Heart className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-primary-foreground mb-4 font-display">
            Pill & Chill
          </h1>
          <p className="text-primary-foreground/70 text-lg leading-relaxed">
            Your intelligent healthcare companion. Manage records, track medications, and get AI-powered health insights.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-secondary">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl gradient-primary">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground">Pill & Chill</h1>
          </div>

          <div className="bg-card rounded-2xl p-8 shadow-elevated">
            <h2 className="text-2xl font-bold font-display text-foreground mb-1">
              {isLogin ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isLogin
                ? "Sign in to your account"
                : "Get started with Pill & Chill"}
            </p>

            {/* Role selector - shown on BOTH login and register */}
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setRole("patient")}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  role === "patient"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                <User className="w-4 h-4" />
                <span className="font-medium text-sm">Patient</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("doctor")}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  role === "doctor"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                <span className="font-medium text-sm">Doctor</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div>
                      <Label className="text-sm font-medium text-foreground">Full Name</Label>
                      <div className="relative mt-1">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={form.name}
                          onChange={(e) => update("name", e.target.value)}
                          className="pl-10"
                          placeholder="John Doe"
                          required={!isLogin}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-foreground">Mobile</Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={form.mobile}
                          onChange={(e) => update("mobile", e.target.value)}
                          className="pl-10"
                          placeholder="+1 234 567 890"
                          required={!isLogin}
                        />
                      </div>
                    </div>

                    {role === "patient" && (
                      <div>
                        <Label className="text-sm font-medium text-foreground">Blood Group</Label>
                        <Select
                          value={form.blood_group}
                          onValueChange={(v) => update("blood_group", v)}
                        >
                          <SelectTrigger className="mt-1">
                            <Droplets className="w-4 h-4 text-muted-foreground mr-2" />
                            <SelectValue placeholder="Select Blood Group" />
                          </SelectTrigger>
                          <SelectContent>
                            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                              <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {role === "doctor" && (
                      <div>
                        <Label className="text-sm font-medium text-foreground">Specialization</Label>
                        <Input
                          value={form.specialization}
                          onChange={(e) => update("specialization", e.target.value)}
                          className="mt-1"
                          placeholder="Cardiology"
                          required={!isLogin && role === "doctor"}
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <Label className="text-sm font-medium text-foreground">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="pl-10"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-foreground">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    className="pl-10"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full gradient-primary text-primary-foreground h-11" disabled={loading}>
                {loading ? "Please wait..." : isLogin ? `Sign In as ${role === "doctor" ? "Doctor" : "Patient"}` : "Create Account"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-medium hover:underline"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;
