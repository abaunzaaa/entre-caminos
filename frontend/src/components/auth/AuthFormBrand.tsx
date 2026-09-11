import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import logoEntreCaminos from "../../assets/logo.png";
import { cn } from "../../utils/cn";

export function AuthFormBrand({
  variant = "form",
  hidden = false,
}: {
  variant?: "form" | "visual";
  hidden?: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  useLayoutEffect(() => {
    if (variant !== "visual" || hidden) {
      if (ref.current) {
        ref.current.style.top = "";
      }
      return;
    }

    const brand = ref.current;
    if (!brand) {
      return;
    }

    const sync = () => {
      const title = document.querySelector<HTMLElement>(".auth-form-pane--register .auth-form__title");
      const parent = brand.offsetParent as HTMLElement | null;
      if (!title || !parent) {
        return;
      }

      const titleBox = title.getBoundingClientRect();
      const parentBox = parent.getBoundingClientRect();
      const top = titleBox.top - parentBox.top;
      brand.style.top = `${Math.max(8, Math.round(top))}px`;
    };

    sync();
    const frame = window.requestAnimationFrame(sync);
    window.addEventListener("resize", sync);
    const observer = new ResizeObserver(sync);
    observer.observe(brand);
    const formPane = document.querySelector(".auth-form-pane--register");
    if (formPane) {
      observer.observe(formPane);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", sync);
      observer.disconnect();
    };
  }, [variant, hidden]);

  return (
    <Link
      ref={ref}
      to="/"
      className={cn(variant === "visual" ? "auth-visual__brand" : "auth-form__brand")}
      aria-label="Entre Caminos, ir al inicio"
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
    >
      <img src={logoEntreCaminos} alt="" />
    </Link>
  );
}
