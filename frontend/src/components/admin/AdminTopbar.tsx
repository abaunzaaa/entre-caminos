import { Bell } from "lucide-react";
import type { PublicUser } from "../../types";
import { AdminUserMenu } from "./AdminUserMenu";
import "../../styles/admin-topbar.css";

export function AdminTopbar({ user }: { user: PublicUser | null }) {
  return (
    <header className="admin-topbar">
      <div className="admin-topbar__end">
        <button type="button" className="admin-topbar__icon-btn" aria-label="Notificaciones">
          <Bell size={18} strokeWidth={1.7} />
        </button>
        <AdminUserMenu user={user} />
      </div>
    </header>
  );
}
