import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mountain,
  Palmtree,
  Trees,
  Building2,
  Church,
  Compass,
  Flower2,
  Landmark,
  Utensils,
  PartyPopper,
  User,
  Heart,
  Users,
  Home,
  Music,
  Wallet,
  Sun,
  CloudSun,
  Snowflake,
} from "lucide-react";
import { IllustrationPanel } from "../../components/auth/IllustrationPanel";
import { getOnboarding, saveOnboarding } from "../../utils/onboarding";
import panelPreferences from "../../assets/panel-preferences.png";

const groups = [
  {
    title: "Tipo de lugar que prefieres",
    options: [
      { label: "Playa", icon: Palmtree },
      { label: "Montaña", icon: Mountain },
      { label: "Bosque / Naturaleza", icon: Trees },
      { label: "Ciudad", icon: Building2 },
      { label: "Pueblos mágicos", icon: Church },
    ],
  },
  {
    title: "Actividades que disfrutas",
    options: [
      { label: "Aventura", icon: Compass },
      { label: "Relajación", icon: Flower2 },
      { label: "Cultura", icon: Landmark },
      { label: "Gastronomía", icon: Utensils },
      { label: "Fiesta / Vida nocturna", icon: PartyPopper },
    ],
  },
  {
    title: "¿Con quién viajas?",
    options: [
      { label: "Solo", icon: User },
      { label: "En pareja", icon: Heart },
      { label: "Amigos", icon: Users },
      { label: "Familia", icon: Home },
    ],
  },
  {
    title: "Tipo de música que te gusta",
    options: [
      { label: "Pop", icon: Music },
      { label: "Reggaetón", icon: Music },
      { label: "Rock", icon: Music },
      { label: "Más", icon: Music },
    ],
  },
  {
    title: "Presupuesto por viaje",
    options: [
      { label: "Económico", icon: Wallet },
      { label: "Moderado", icon: Wallet },
      { label: "Alto", icon: Wallet },
      { label: "Lujo", icon: Wallet },
    ],
  },
  {
    title: "¿Qué tan importante es para ti?",
    options: [
      { label: "Naturaleza", icon: Trees },
      { label: "Comida", icon: Utensils },
      { label: "Cultura", icon: Landmark },
      { label: "Fiesta", icon: PartyPopper },
    ],
  },
  {
    title: "¿Qué tipo de clima prefieres?",
    options: [
      { label: "Cálido", icon: Sun },
      { label: "Templado", icon: CloudSun },
      { label: "Frío", icon: Snowflake },
      { label: "No tengo preferencia", icon: CloudSun },
    ],
  },
];

export function OnboardingPreferencesPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>(getOnboarding().preferences);

  function toggle(label: string) {
    setSelected((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[62%_38%]">
      <main className="px-6 py-10 lg:px-12">
        <h1 className="font-serif text-4xl italic md:text-5xl">Cuéntanos más de ti</h1>
        <p className="mt-3 text-neutral-600">¿Cómo son tus viajes ideales? Selecciona tus preferencias</p>
        <div className="mt-8 space-y-8">
          {groups.map((group) => (
            <section key={group.title}>
              <h2 className="mb-3 text-sm font-medium">{group.title}</h2>
              <div className="flex flex-wrap gap-3">
                {group.options.map((option) => {
                  const active = selected.includes(option.label);
                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => toggle(option.label)}
                      className={`relative flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
                        active ? "border-charcoal" : "border-neutral-200"
                      }`}
                    >
                      {active && (
                        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-charcoal text-[10px] text-white">
                          ✓
                        </span>
                      )}
                      <option.icon size={16} />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-10 flex items-center justify-between">
          <button type="button" className="text-sm" onClick={() => navigate("/onboarding")}>
            ← Volver
          </button>
          <button
            className="rounded-full bg-charcoal px-10 py-3 text-white"
            onClick={() => {
              saveOnboarding({ preferences: selected });
              navigate("/onboarding/listo");
            }}
          >
            Continuar
          </button>
        </div>
      </main>
      <IllustrationPanel image={panelPreferences} variant="register" />
    </div>
  );
}
