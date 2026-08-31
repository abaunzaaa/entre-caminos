import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImagePlus, MapPin } from "lucide-react";
import { IllustrationPanel } from "../../components/auth/IllustrationPanel";
import { getOnboarding, saveOnboarding } from "../../utils/onboarding";
import panelOnboarding from "../../assets/panel-onboarding.png";

const avatars = [
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Leo",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Maya",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Noah",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Luna",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Omar",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Sofia",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Diego",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Coco",
];

const cities = [
  "Bogotá, Colombia",
  "Medellín, Colombia",
  "Cali, Colombia",
  "Cartagena, Colombia",
  "Salento, Quindío",
  "Villa de Leyva, Boyacá",
];

export function OnboardingWelcomePage() {
  const navigate = useNavigate();
  const draft = getOnboarding();
  const [location, setLocation] = useState(draft.location);
  const [mode, setMode] = useState<"upload" | "avatar">(draft.photoMode);
  const [avatar, setAvatar] = useState(draft.avatar);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    saveOnboarding({ location, photoMode: mode, avatar });
    navigate("/onboarding/preferencias");
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[58%_42%]">
      <main className="flex items-center justify-center px-6 py-12">
        <form className="w-full max-w-xl space-y-8" onSubmit={onSubmit}>
          <h1 className="text-center font-serif text-5xl italic">¡Bienvenido!</h1>
          <label className="block space-y-2">
            <span className="text-sm text-neutral-500">Ubicación</span>
            <div className="flex items-center gap-3 rounded-2xl border border-[#E0E0E0] px-4 py-3.5">
              <MapPin size={18} className="text-neutral-400" />
              <select
                className="w-full bg-transparent text-sm outline-none"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                required
              >
                <option value="">Tu ubicación</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <div className="space-y-3">
            <p className="text-sm text-neutral-500">Foto de perfil</p>
            <div className="inline-flex rounded-full bg-neutral-100 p-1 text-sm">
              <button
                type="button"
                className={`rounded-full px-4 py-2 ${mode === "upload" ? "bg-white shadow-sm" : ""}`}
                onClick={() => setMode("upload")}
              >
                Subir foto
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-2 ${mode === "avatar" ? "bg-white shadow-sm" : ""}`}
                onClick={() => setMode("avatar")}
              >
                Elegir avatar
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="grid h-28 w-28 cursor-pointer place-items-center rounded-full border border-dashed border-neutral-300 text-center text-xs text-neutral-400">
                <span>
                  <ImagePlus className="mx-auto mb-1" />
                  Subir foto
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const url = URL.createObjectURL(file);
                    setAvatar(url);
                    setMode("upload");
                  }}
                />
              </label>
              <div className="grid grid-cols-4 gap-3">
                {avatars.map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => {
                      setAvatar(src);
                      setMode("avatar");
                    }}
                    className={`h-14 w-14 overflow-hidden rounded-full border-2 ${
                      avatar === src ? "border-charcoal" : "border-transparent"
                    }`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button className="w-full rounded-full bg-charcoal py-3.5 text-white">Continuar</button>
        </form>
      </main>
      <IllustrationPanel image={panelOnboarding} variant="register" />
    </div>
  );
}
