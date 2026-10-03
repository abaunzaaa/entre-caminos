import { useEffect, useId, useState } from "react";
import { AuthForgotModalLayout } from "./AuthForgotModalLayout";
import { SuccessConfirm } from "../feedback/SuccessConfirm";
import { Button } from "../ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { clearSession } from "../../services/api";
import { getApiErrorMessage } from "../../utils/api-error";

export function DeleteAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  const { deleteAccount } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) {
      setSaving(false);
      setError(null);
      setConfirmed(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  function requestClose() {
    if (saving || confirmed) {
      return;
    }
    setError(null);
    onClose();
  }

  async function onConfirm() {
    setSaving(true);
    setError(null);
    try {
      await deleteAccount();
      setConfirmed(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo eliminar la cuenta."));
    } finally {
      setSaving(false);
    }
  }

  function finish() {
    clearSession();
    window.location.replace("/");
  }

  return (
    <>
      {confirmed ? null : (
        <AuthForgotModalLayout titleId={titleId} onClose={requestClose}>
          <div className="profile-delete-modal">
            <div className="dash-profile__identity">
              <h1 id={titleId} className="dash-profile__name">
                ¿Eliminar cuenta?
              </h1>
              <p className="dash-section__lead">
                Esta acción eliminará tu cuenta y la información asociada. Esta acción no se puede deshacer.
              </p>
            </div>
            {error ? (
              <p className="dash-team-toast is-error profile-password-modal__error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="dash-password__actions">
              <Button type="button" variant="secondary" disabled={saving} onClick={requestClose}>
                Cancelar
              </Button>
              <button type="button" className="tourist-hero__cta" disabled={saving} onClick={() => void onConfirm()}>
                {saving ? "Eliminando..." : "Eliminar cuenta"}
              </button>
            </div>
          </div>
        </AuthForgotModalLayout>
      )}
      <SuccessConfirm
        open={confirmed}
        showIcon={false}
        title="Cuenta eliminada"
        text="Tu cuenta se ha eliminado correctamente."
        actionLabel="Aceptar"
        actionClassName="tourist-hero__cta"
        onClose={finish}
      />
    </>
  );
}
