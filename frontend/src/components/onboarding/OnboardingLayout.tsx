import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import "../../styles/onboarding.css";

export function OnboardingLayout() {
  useEffect(() => {
    document.documentElement.classList.add("onboarding-lock");
    return () => {
      document.documentElement.classList.remove("onboarding-lock");
    };
  }, []);

  return <Outlet />;
}
