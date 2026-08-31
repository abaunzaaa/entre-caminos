import { useNavigate } from "react-router-dom";
import { IllustrationPanel } from "../../components/auth/IllustrationPanel";
import { getOnboarding } from "../../utils/onboarding";
import panelReady from "../../assets/panel-ready.png";

export function OnboardingReadyPage() {
  const navigate = useNavigate();
  const draft = getOnboarding();
  const firstName = draft.name.split(" ")[0] || "viajero";
  const tags = (draft.preferences.length ? draft.preferences : ["Naturaleza", "Gastronomía", "Aventura"]).slice(0, 3);

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[58%_42%]">
      <main className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-serif text-5xl italic">¡Todo listo, {firstName}!</h1>
        <p className="mx-auto mt-4 max-w-md text-neutral-600">
          Creamos tu perfil viajero, según tus gustos encontraremos experiencias que combinan perfecto contigo
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full border border-black px-5 py-2 text-sm">
              {tag}
            </span>
          ))}
        </div>
        <img
          src={
            draft.avatar ||
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80"
          }
          alt=""
          className="mt-10 h-40 w-40 rounded-full object-cover"
        />
        <button
          className="mt-10 w-full max-w-md rounded-full bg-charcoal py-3.5 text-white"
          onClick={() => navigate("/explorar")}
        >
          Explorar mis planes
        </button>
      </main>
      <IllustrationPanel image={panelReady} variant="register" />
    </div>
  );
}
