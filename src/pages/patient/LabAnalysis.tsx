import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Upload, FileText, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const ANALYZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-lab-report`;

const LabAnalysis = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setAnalysis(null);
    setError(null);
    if (selected && selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const imageBase64 = await toBase64(file);
      const resp = await fetch(ANALYZE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          imageBase64,
          mimeType: file.type,
          fileName: file.name,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Analysis failed (${resp.status})`);
      }

      const data = await resp.json();
      setAnalysis(data.analysis);
    } catch (e: any) {
      console.error(e);
      const msg = e.message || "Failed to analyze report";
      setError(msg);
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">AI Lab Report & ECG Analysis</h2>
        <p className="text-muted-foreground text-sm">
          Upload a lab report or ECG image — Gemini AI will extract data and provide a detailed, readable summary
        </p>
      </div>

      {/* Upload area */}
      <div className="bg-card rounded-xl border border-border p-6">
        <Label htmlFor="lab-file" className="cursor-pointer">
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/30 transition-colors">
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg mb-3 object-contain" />
            ) : (
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            )}
            <p className="text-foreground font-medium">
              {file ? file.name : "Click to upload a lab report or ECG image"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">PNG, JPG, JPEG supported (image files only)</p>
          </div>
        </Label>
        <Input
          ref={fileRef}
          id="lab-file"
          type="file"
          accept="image/png,image/jpg,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {file && (
          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="mt-4 gradient-primary text-primary-foreground gap-2"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            {analyzing ? "Analyzing with AI..." : "Analyze Report"}
          </Button>
        )}
      </div>

      {/* Loading state */}
      {analyzing && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl border border-border p-6 space-y-3">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-foreground font-medium">AI is analyzing your report...</p>
          </div>
          <Progress value={undefined} className="h-2" />
          <p className="text-xs text-muted-foreground">Extracting data, identifying values, and generating summary</p>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-foreground">Analysis Failed</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Results */}
      {analysis && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
            <FileText className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-display font-bold text-foreground">AI Analysis Report</h3>
          </div>
          <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground">
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground italic">
              ⚕️ Disclaimer: This AI analysis is for informational purposes only. Always consult a qualified healthcare professional for medical decisions.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default LabAnalysis;
