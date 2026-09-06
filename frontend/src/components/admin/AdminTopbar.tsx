import { Bell, Search, SlidersHorizontal } from "lucide-react";
import type { FormEvent } from "react";
import type { PublicUser } from "../../types";
import { AdminUserMenu } from "./AdminUserMenu";
import "../../styles/admin-topbar.css";

export function AdminTopbar({ user }: { user: PublicUser | null }) {
  function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <header id="search-filter-color" className="admin-topbar">
      <form className="admin-topbar__search" role="search" onSubmit={onSearchSubmit}>
        <Search className="admin-topbar__search-icon" size={18} strokeWidth={1.75} />
        <input type="search" name="q" placeholder="Buscar..." aria-label="Buscar" autoComplete="off" />
      </form>

      <button type="button" className="admin-topbar__filter">
        <SlidersHorizontal size={16} strokeWidth={1.75} />
        <span>Filtrar</span>
      </button>

      <div className="admin-topbar__end">
        <button type="button" className="admin-topbar__icon-btn" aria-label="Notificaciones">
          <Bell size={18} strokeWidth={1.7} />
        </button>
        <AdminUserMenu user={user} />
      </div>
    </header>
  );
}
