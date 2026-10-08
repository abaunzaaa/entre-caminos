import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { addVisit, getVisitedStatus, removeVisit } from "../services/visits.service";
import { notifyVisitedStatus, notifyVisitsChanged, onVisitedStatus } from "../services/visits-sync";

type UseVisitedToggleOptions = {
  initialVisited?: boolean;
  loginRedirectTo?: string;
};

export function useVisitedToggle(experienceId: string, options: UseVisitedToggleOptions = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasInitial = typeof options.initialVisited === "boolean";
  const [visited, setVisited] = useState(Boolean(options.initialVisited));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hasInitial) {
      setVisited(Boolean(options.initialVisited));
    }
  }, [hasInitial, options.initialVisited, experienceId]);

  useEffect(() => {
    if (hasInitial || !user || !experienceId) {
      if (!user && !hasInitial) {
        setVisited(false);
      }
      return;
    }
    let cancelled = false;
    getVisitedStatus(experienceId)
      .then((value) => {
        if (!cancelled) {
          setVisited(value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVisited(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [experienceId, hasInitial, user?.id]);

  useEffect(() => {
    return onVisitedStatus((id, value) => {
      if (id === experienceId) {
        setVisited(value);
      }
    });
  }, [experienceId]);

  async function toggle() {
    if (!experienceId || busy) {
      return;
    }
    if (!user) {
      navigate("/login", {
        state: { from: options.loginRedirectTo ?? `/explorar/${experienceId}` },
      });
      return;
    }

    const next = !visited;
    setVisited(next);
    setBusy(true);
    try {
      if (next) {
        await addVisit(experienceId);
      } else {
        await removeVisit(experienceId);
      }
      notifyVisitedStatus(experienceId, next);
      notifyVisitsChanged();
    } catch {
      setVisited(!next);
    } finally {
      setBusy(false);
    }
  }

  return {
    visited,
    busy,
    toggle: () => {
      void toggle();
    },
  };
}
