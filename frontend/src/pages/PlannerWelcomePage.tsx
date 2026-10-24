import { PlannerWelcome } from "../components/planner/PlannerWelcome";
import "../styles/planner.css";

export function PlannerWelcomePage() {
  return (
    <main className="planner planner--welcome">
      <PlannerWelcome onDiscover={() => undefined} />
    </main>
  );
}
