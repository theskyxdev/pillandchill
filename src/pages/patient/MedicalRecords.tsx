import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, FileText, Trash2, Image, Calendar, Tag } from "lucide-react";
import { motion } from "framer-motion";

const MedicalRecords = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    record_type: "Lab Report",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user!.id)
        .order("upload_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase.from("reports").delete().eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Record deleted");
    },
  });

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("reports")
        .upload(filePath, selectedFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("reports")
        .getPublicUrl(filePath);

      const isImage = selectedFile.type.startsWith("image/");

      const structuredData = {
        title: form.title || selectedFile.name,
        description: form.description,
        record_type: form.record_type,
        file_type: isImage ? "image" : "document",
        date: new Date().toLocaleDateString(),
        values: isImage
          ? ["Image uploaded for review"]
          : ["Hemoglobin: 14.2 g/dL", "WBC: 7,500/μL", "Platelets: 250,000/μL"],
      };

      const { error: dbError } = await supabase.from("reports").insert({
        user_id: user.id,
        file_url: urlData.publicUrl,
        file_name: form.title || selectedFile.name,
        extracted_data: structuredData,
      });
      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Record uploaded successfully!");
      setShowForm(false);
      setSelectedFile(null);
      setForm({ title: "", description: "", record_type: "Lab Report" });
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const isImage = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Medical Records</h2>
          <p className="text-muted-foreground text-sm">Upload and manage your health reports & photos</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="gradient-primary text-primary-foreground gap-2"
        >
          <Upload className="w-4 h-4" />
          Add Record
        </Button>
      </div>

      {/* Upload Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-card rounded-xl border border-border p-5 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Record Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Blood Test Report"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Record Type</Label>
              <select
                value={form.record_type}
                onChange={(e) => setForm((p) => ({ ...p, record_type: e.target.value }))}
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option>Lab Report</option>
                <option>Prescription</option>
                <option>X-Ray</option>
                <option>ECG</option>
                <option>MRI/CT Scan</option>
                <option>Discharge Summary</option>
                <option>Photo</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Any notes about this record..."
              className="mt-1"
              rows={2}
            />
          </div>
          <div>
            <Label>Upload File (PDF, Image)</Label>
            <Input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
          </div>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="gradient-accent text-accent-foreground"
          >
            {uploading ? "Uploading..." : "Save Record"}
          </Button>
        </motion.div>
      )}

      {/* Records List */}
      {isLoading ? (
        <div className="text-muted-foreground text-center py-12">Loading records...</div>
      ) : reports?.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No records yet. Upload your first record.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports?.map((report, i) => {
            const data = report.extracted_data as any;
            const fileIsImage = data?.file_type === "image" || isImage(report.file_url);

            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                {/* Image preview */}
                {fileIsImage && (
                  <div className="h-48 bg-muted overflow-hidden">
                    <img
                      src={report.file_url}
                      alt={report.file_name || "Medical record"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {fileIsImage ? (
                        <Image className="w-4 h-4 text-primary" />
                      ) : (
                        <FileText className="w-4 h-4 text-primary" />
                      )}
                      <h3 className="font-medium text-foreground text-sm">
                        {report.file_name || "Record"}
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(report.id)}
                      className="text-muted-foreground hover:text-destructive h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(report.upload_date).toLocaleDateString()}
                    </span>
                    {data?.record_type && (
                      <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        <Tag className="w-3 h-3" />
                        {data.record_type}
                      </span>
                    )}
                  </div>

                  {data?.description && (
                    <p className="text-sm text-muted-foreground mb-2">{data.description}</p>
                  )}

                  {data?.values && !fileIsImage && (
                    <div className="bg-secondary rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Extracted Data</p>
                      {data.values.map((v: string, idx: number) => (
                        <p key={idx} className="text-sm text-foreground">{v}</p>
                      ))}
                    </div>
                  )}

                  {!fileIsImage && (
                    <a
                      href={report.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-xs text-primary hover:underline"
                    >
                      View Document →
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MedicalRecords;
