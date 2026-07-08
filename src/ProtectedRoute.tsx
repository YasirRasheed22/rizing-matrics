// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext";



interface ProtectedRouteProps {
  allowedRoles?: string[]; // e.g., ["admin"], ["agent", "admin"]
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="d-flex justify-content-center py-5"><div className="spinner-border" /></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />; // or "/unauthorized"
  }

  return <Outlet />;
}