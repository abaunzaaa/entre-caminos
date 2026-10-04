import { useId } from "react";
import { AuthForgotModalLayout } from "./AuthForgotModalLayout";
import { ChangePasswordForm } from "./ChangePasswordForm";

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  if (!open) {
    return null;
  }

  return (
    <AuthForgotModalLayout titleId={titleId} onClose={onClose}>
      <ChangePasswordForm layout="modal" titleId={titleId} onCancel={onClose} onComplete={onClose} />
    </AuthForgotModalLayout>
  );
}
