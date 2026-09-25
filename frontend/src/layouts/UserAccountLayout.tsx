import { Outlet } from "react-router-dom";
import { ExplorerNavbar } from "../components/explorer/ExplorerNavbar";
import "../styles/admin-ui.css";
import "../styles/admin-access.css";
import "../styles/explorer.css";

export function UserAccountLayout() {
  return (
    <div className="explorer-page explorer-page--shell min-h-screen text-ink">
      <ExplorerNavbar />
      <div style={{ paddingTop: "var(--explorer-nav-height)" }}>
        <Outlet />
      </div>
    </div>
  );
}
