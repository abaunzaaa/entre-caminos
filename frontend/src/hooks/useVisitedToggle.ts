import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { addVisit, getVisitedStatus, removeVisit } from "../services/visits.service";
import { notifyVisitedStatus, notifyVisitsChanged, onVisitedStatus } from "../services/visits-sync";
import { getApiErrorCode } from "../utils/api-error";

const VISIT_HAS_REVIEW = "VISIT_HAS_REVIEW";

type UseVisitedToggleOptions = {
  initialVisited?: boolean;
  loginRedirectTo?: string;
  onMarkedVisited?: () => void;
  onUnvisitBlocked?: () => void;
};

export function useVisitedToggle(experienceId: string, options: UseVisitedToggleOptions = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasInitial = typeof options.initialVisited === "boolean";
  const [visited, setVisited] = useState(Boolean(options.initialVisited));
  const [settledFor, setSettledFor] = useState<string | null>(hasInitial ? experienceId : null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hasInitial) {
      setVisited(Boolean(options.initialVisited));
      setSettledFor(experienceId);
      return;
    }
    if (!user || !experienceId) {
      if (!user) {
        setVisited(false);
      }
      setSettledFor(experienceId || null);
      return;
    }
    let cancelled = false;
    setSettledFor(null);
    setVisited(false);
    getVisitedStatus(experienceId)
      .then((value) => {
        if (!cancelled) {
          setVisited(value);
          setSettledFor(experienceId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVisited(false);
          setSettledFor(experienceId);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [experienceId, hasInitial, options.initialVisited, user?.id]);

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
      if (next) {
        options.onMarkedVisited?.();
      }
    } catch (error) {
      setVisited(!next);
      if (!next && getApiErrorCode(error) === VISIT_HAS_REVIEW) {
        options.onUnvisitBlocked?.();
      }
    } finally {
      setBusy(false);
    }
  }

  return {
    visited,
    settledFor,
    busy,
    toggle: () => {
      void toggle();
    },
  };
}
