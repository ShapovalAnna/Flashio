import { Navigate, Outlet } from "react-router";
import { useAuth } from "../context/authContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Завантаження...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
