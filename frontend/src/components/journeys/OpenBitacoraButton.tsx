import { useNavigate } from "react-router-dom";

export function OpenBitacoraButton() {
  const navigate = useNavigate();

  return (
    <button type="button" className="tourist-hero__cta caminos-keep__cta" onClick={() => navigate("/mis-caminos/bitacora")}>
      Abrir bitácora
    </button>
  );
}
