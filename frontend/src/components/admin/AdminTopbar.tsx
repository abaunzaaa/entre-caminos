import { AdminNotifications } from "./AdminNotifications";
import { AdminUserMenu } from "./AdminUserMenu";
import type { PublicUser } from "../../types";
import "../../styles/admin-topbar.css";

export function AdminTopbar({ user }: { user: PublicUser | null }) {
  return (
    <header className="admin-topbar">
      <div className="admin-topbar__end">
        <AdminNotifications />
        <AdminUserMenu user={user} />
      </div>
    </header>
  );
}
