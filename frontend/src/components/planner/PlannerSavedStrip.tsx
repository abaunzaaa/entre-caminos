import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listPlannerItineraries, type PlannerListItem } from "../../services/planner.service";
import "../../styles/planner.css";

export function PlannerSavedStrip() {
  const [items, setItems] = useState<PlannerListItem[]>([]);

  useEffect(() => {
    let alive = true;
    listPlannerItineraries()
      .then((data) => {
        if (alive) setItems(data);
      })
      .catch(() => {
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!items.length) {
    return null;
  }

  return (
    <section className="planner-saved" aria-label="Planes guardados">
      <h2>Tus caminos planeados</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <Link to={`/planear-mi-plan/guardado/${item.id}`}>
              {item.title}
              <span>{item.municipality}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
