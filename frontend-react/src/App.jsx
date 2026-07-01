import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Generate from "./pages/Generate";
import FactCheck from "./pages/FactCheck";
import History from "./pages/History";
import FeedbackHistory from "./pages/FeedbackHistory";

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-bg bg-mesh">
      <Navbar />
      {children}
    </div>
  );
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
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/generate"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Generate />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fact-check"
        element={
          <ProtectedRoute>
            <AppLayout>
              <FactCheck />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <AppLayout>
              <History />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/feedback-history"
        element={
          <ProtectedRoute>
            <AppLayout>
              <FeedbackHistory />
            </AppLayout>
          </ProtectedRoute>
        }
      />

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