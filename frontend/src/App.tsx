import { useState } from "react";
import { EntreCaminosIntro } from "./components/intro/EntreCaminosIntro";
import { AppRoutes } from "./routes/AppRoutes";
import { AuthProvider } from "./hooks/useAuth";

function LandingIntro() {
  const [play] = useState(
    () => typeof window !== "undefined" && window.location.pathname === "/",
  );

  if (!play) {
    return null;
  }

  return <EntreCaminosIntro />;
}

export default function App() {
  return (
    <AuthProvider>
      <LandingIntro />
      <AppRoutes />
    </AuthProvider>
  );
}
