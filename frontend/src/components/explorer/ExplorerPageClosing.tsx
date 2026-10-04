import type { ReactNode } from "react";
import paloma1 from "../../assets/paloma1.png";
import paloma2 from "../../assets/paloma 2.png";
import { ExplorerUserFooter } from "./ExplorerUserFooter";

type ExplorerPageClosingProps = {
  children: ReactNode;
};

export function ExplorerPageClosing({ children }: ExplorerPageClosingProps) {
  return (
    <>
      <div className="explorer-page__fill">
        {children}
        <img
          className="explorer-map__dove explorer-map__dove--left"
          src={paloma1}
          alt=""
          aria-hidden="true"
          decoding="async"
        />
        <img
          className="explorer-map__dove explorer-map__dove--right"
          src={paloma2}
          alt=""
          aria-hidden="true"
          decoding="async"
        />
      </div>
      <ExplorerUserFooter />
    </>
  );
}
