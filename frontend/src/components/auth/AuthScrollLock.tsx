import { useEffect } from "react";

/** Locks page scroll while full-screen auth views are mounted. */
export function AuthScrollLock() {
  useEffect(() => {
    document.documentElement.classList.add("auth-lock");
    return () => {
      document.documentElement.classList.remove("auth-lock");
    };
  }, []);

  return null;
}
