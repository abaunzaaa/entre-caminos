import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaqModal } from "./FaqModal";

type FaqModalContextValue = {
  openFaq: () => void;
};

const FaqModalContext = createContext<FaqModalContextValue | null>(null);

function faqQueryOpen() {
  return new URLSearchParams(window.location.search).get("faq") === "1";
}

export function FaqModalProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const returnFocus = useRef<HTMLElement | null>(null);
  const [queryOpen, setQueryOpen] = useState(faqQueryOpen);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [forcedOpen, setForcedOpen] = useState(false);
  const routeOpen = location.pathname === "/preguntas-frecuentes";
  const open = queryOpen || routeOpen || forcedOpen;

  useEffect(() => {
    if (!open) setFocusId(null);
  }, [open]);

  const restoreFocus = useCallback(() => {
    const node = returnFocus.current;
    returnFocus.current = null;
    if (node && document.contains(node)) {
      node.focus();
    }
  }, []);

  useEffect(() => {
    setQueryOpen(faqQueryOpen());
  }, [location.pathname, location.search]);

  useEffect(() => {
    function onPop() {
      const next = faqQueryOpen();
      setQueryOpen(next);
      if (!next && window.location.pathname !== "/preguntas-frecuentes") {
        restoreFocus();
      }
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [restoreFocus]);

  const openFaq = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      returnFocus.current = document.activeElement;
    }
    if (window.location.pathname === "/preguntas-frecuentes") {
      return;
    }
    if (window.location.pathname.startsWith("/admin")) {
      setForcedOpen(true);
      return;
    }
    const url = new URL(window.location.href);
    if (url.searchParams.get("faq") === "1") {
      setQueryOpen(true);
      return;
    }
    url.searchParams.set("faq", "1");
    window.history.pushState({ ecFaq: true }, "", `${url.pathname}${url.search}${url.hash}`);
    setQueryOpen(true);
  }, []);

  useEffect(() => {
    function onReply(event: Event) {
      const id = (event as CustomEvent<string>).detail;
      if (!id) return;
      setFocusId(id);
      openFaq();
    }
    window.addEventListener("ec-faq-reply", onReply);
    return () => window.removeEventListener("ec-faq-reply", onReply);
  }, [openFaq]);

  const closeFaq = useCallback(() => {
    if (forcedOpen) {
      setForcedOpen(false);
      restoreFocus();
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("faq") === "1" && window.history.state?.ecFaq === true) {
      window.history.back();
      return;
    }
    if (window.location.pathname === "/preguntas-frecuentes") {
      navigate("/", { replace: true });
      restoreFocus();
      return;
    }
    if (params.get("faq") === "1") {
      params.delete("faq");
      const search = params.toString();
      const next = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
      window.history.replaceState(window.history.state, "", next);
    }
    setQueryOpen(false);
    restoreFocus();
  }, [forcedOpen, navigate, restoreFocus]);

  return (
    <FaqModalContext.Provider value={{ openFaq }}>
      {children}
      <FaqModal open={open} focusId={focusId} onClose={closeFaq} />
    </FaqModalContext.Provider>
  );
}

export function useFaqModal() {
  const value = useContext(FaqModalContext);
  if (!value) {
    throw new Error("useFaqModal debe usarse dentro de FaqModalProvider");
  }
  return value;
}
