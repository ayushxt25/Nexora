import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingSpinner from "./components/LoadingSpinner";
import DashboardLayout from "./layouts/DashboardLayout";
import FollowUps from "./pages/FollowUps";
import Events from "./pages/Events";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import FeedbackHistory from "./pages/FeedbackHistory";
import Contacts from "./pages/Contacts";
import ContactProfile from "./pages/ContactProfile";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Onboarding from "./pages/Onboarding";

const Generate = lazy(() => import("./pages/Generate"));
const FactCheck = lazy(() => import("./pages/FactCheck"));
const Recommendations = lazy(() => import("./pages/Recommendations"));
const Opportunities = lazy(() => import("./pages/Opportunities"));
const RelationshipScores = lazy(() => import("./pages/RelationshipScores"));
const Analytics = lazy(() => import("./pages/Analytics"));
const NetworkGraph = lazy(() => import("./pages/NetworkGraph"));
const MetricsConsole = lazy(() => import("./pages/MetricsConsole"));
const AuditLogsConsole = lazy(() => import("./pages/AuditLogsConsole"));
const RetrievalDebugConsole = lazy(() => import("./pages/RetrievalDebugConsole"));
const RankerToolsConsole = lazy(() => import("./pages/RankerToolsConsole"));

function RouteFallback() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <LoadingSpinner label="Loading workspace..." />
    </div>
  );
}

function withSuspense(element) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/contacts/:id" element={<ContactProfile />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/help" element={<Help />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/generate" element={withSuspense(<Generate />)} />
        <Route path="/fact-check" element={withSuspense(<FactCheck />)} />
        <Route path="/history" element={<History />} />
        <Route path="/feedback-history" element={<FeedbackHistory />} />
        <Route path="/follow-ups" element={<FollowUps />} />
        <Route path="/events" element={<Events />} />
        <Route path="/recommendations" element={withSuspense(<Recommendations />)} />
        <Route path="/opportunities" element={withSuspense(<Opportunities />)} />
        <Route path="/relationship-scores" element={withSuspense(<RelationshipScores />)} />
        <Route path="/analytics" element={withSuspense(<Analytics />)} />
        <Route path="/network-graph" element={withSuspense(<NetworkGraph />)} />
        <Route path="/developer/metrics" element={withSuspense(<MetricsConsole />)} />
        <Route path="/developer/audit-logs" element={withSuspense(<AuditLogsConsole />)} />
        <Route path="/developer/retrieval-debug" element={withSuspense(<RetrievalDebugConsole />)} />
        <Route path="/developer/ranker-tools" element={withSuspense(<RankerToolsConsole />)} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
