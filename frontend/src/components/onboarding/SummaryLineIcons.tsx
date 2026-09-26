import ambientes from "../../assets/onboarding/summary-ambientes.png";
import clima from "../../assets/onboarding/summary-clima.png";
import compania from "../../assets/onboarding/summary-compania.png";
import intereses from "../../assets/onboarding/summary-intereses.png";
import musica from "../../assets/onboarding/summary-musica.png";
import presupuesto from "../../assets/onboarding/summary-presupuesto.png";

function Icon({ src }: { src: string }) {
  return <img src={src} alt="" className="onboarding-line-icon" aria-hidden="true" />;
}

export function BouquetIcon() {
  return <Icon src={intereses} />;
}

export function CheersIcon() {
  return <Icon src={compania} />;
}

export function LandscapeIcon() {
  return <Icon src={ambientes} />;
}

export function RecordPlayerIcon() {
  return <Icon src={musica} />;
}

export function WalletIcon() {
  return <Icon src={presupuesto} />;
}

export function SunFaceIcon() {
  return <Icon src={clima} />;
}
