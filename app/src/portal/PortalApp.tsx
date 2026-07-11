import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase";
import { ToastProvider } from "./ui";
import PortalShell from "./PortalShell";
import Login from "./Login";
import Pending from "./Pending";
import "./portal.css";

export default function PortalApp() {
  const { status } = useAuth();

  // When Supabase isn't configured, skip the auth gate and let people explore
  // the portal with demo data (login still shown once, but "in" is the default).
  if (!isSupabaseConfigured) {
    return (
      <ToastProvider>
        <PortalShell />
      </ToastProvider>
    );
  }

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#05080A", color: "rgba(255,255,255,0.6)" }}>
        불러오는 중…
      </div>
    );
  }
  if (status === "out") return <Login />;
  if (status === "pending") return <Pending />;
  return (
    <ToastProvider>
      <PortalShell />
    </ToastProvider>
  );
}
