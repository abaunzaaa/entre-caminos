import { SuccessConfirm } from "../feedback/SuccessConfirm";

const MARKED_TITLE = "¡Nos alegra que hayas vivido esta experiencia!";
const MARKED_TEXT = "¿Quieres contar cómo te fue? Tu opinión puede ayudar a otros viajeros a decidir.";
const LOCKED_TITLE = "No puedes desmarcar esta experiencia";
const LOCKED_TEXT =
  "Tienes una reseña publicada sobre esta experiencia. Para quitarla de tus experiencias visitadas, primero debes eliminar tu reseña.";

export function VisitMarkedDialog({
  open,
  onRate,
  onLater,
}: {
  open: boolean;
  onRate: () => void;
  onLater: () => void;
}) {
  return (
    <SuccessConfirm
      open={open}
      variant="experience"
      title={MARKED_TITLE}
      text={MARKED_TEXT}
      actionLabel="Calificar experiencia"
      secondaryLabel="Más tarde"
      onAction={onRate}
      onSecondary={onLater}
      onClose={onLater}
    />
  );
}

export function VisitLockedDialog({
  open,
  onViewReview,
  onClose,
}: {
  open: boolean;
  onViewReview: () => void;
  onClose: () => void;
}) {
  return (
    <SuccessConfirm
      open={open}
      showIcon={false}
      title={LOCKED_TITLE}
      text={LOCKED_TEXT}
      actionLabel="Ver mi reseña"
      secondaryLabel="Entendido"
      onAction={onViewReview}
      onSecondary={onClose}
      onClose={onClose}
    />
  );
}
