import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { lazy, Suspense } from "react";

import DashboardLayout from "./components/DashboardLayout";

const AuthPage = lazy(() => import("./pages/AuthPage"));
const PatientDashboard = lazy(() => import("./pages/patient/PatientDashboard"));
const MedicalRecords = lazy(() => import("./pages/patient/MedicalRecords"));
const Reminders = lazy(() => import("./pages/patient/Reminders"));
const LabAnalysis = lazy(() => import("./pages/patient/LabAnalysis"));
const AIAssistant = lazy(() => import("./pages/patient/AIAssistant"));
const RiskPrediction = lazy(() => import("./pages/patient/RiskPrediction"));
const EmergencyProfile = lazy(() => import("./pages/patient/EmergencyProfile"));
const DoctorDashboard = lazy(() => import("./pages/doctor/DoctorDashboard"));
const DoctorPatients = lazy(() => import("./pages/doctor/DoctorPatients"));
const BloodDonation = lazy(() => import("./pages/doctor/BloodDonation"));
const BloodDonationRequest = lazy(() => import("./pages/patient/BloodDonationRequest"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
    Loading...
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageFallback />;
  if (!user) return <Navigate to="/auth" replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
};

const AuthRoute = () => {
  const { user, role, loading } = useAuth();
  if (loading) return <PageFallback />;
  if (user) {
    return <Navigate to={role === "doctor" ? "/doctor" : "/dashboard"} replace />;
  }
  return <AuthPage />;
};

const AppRoutes = () => (
  <Suspense fallback={<PageFallback />}>
    <Routes>
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="/auth" element={<AuthRoute />} />

      {/* Patient Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><PatientDashboard /></ProtectedRoute>} />
      <Route path="/records" element={<ProtectedRoute><MedicalRecords /></ProtectedRoute>} />
      <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
      <Route path="/lab-analysis" element={<ProtectedRoute><LabAnalysis /></ProtectedRoute>} />
      <Route path="/ai-assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
      <Route path="/risk-prediction" element={<ProtectedRoute><RiskPrediction /></ProtectedRoute>} />
      <Route path="/emergency" element={<ProtectedRoute><EmergencyProfile /></ProtectedRoute>} />
      <Route path="/blood-donation" element={<ProtectedRoute><BloodDonationRequest /></ProtectedRoute>} />

      {/* Doctor Routes */}
      <Route path="/doctor" element={<ProtectedRoute><DoctorDashboard /></ProtectedRoute>} />
      <Route path="/doctor/patients" element={<ProtectedRoute><DoctorPatients /></ProtectedRoute>} />
      <Route path="/doctor/blood-donation" element={<ProtectedRoute><BloodDonation /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
