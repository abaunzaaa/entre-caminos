import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { getApiErrorMessage } from "../utils/api-error";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Confirmando tu correo…");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("El enlace de verificación no es válido.");
      return;
    }

    api
      .post("/auth/verify-email", { token })
      .then(() => {
        setStatus("ok");
        setMessage("Correo verificado. Ya puedes iniciar sesión.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(getApiErrorMessage(err, "No pudimos verificar el correo."));
      });
  }, [token]);

  return (
    <main className="grid min-h-screen place-items-center bg-white px-6">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-4xl italic">
          {status === "ok" ? "Listo" : status === "error" ? "No se pudo verificar" : "Un momento"}
        </h1>
        <p className="mt-4 text-sm text-neutral-600">{message}</p>
        <Link to="/login" className="mt-8 inline-flex rounded-full bg-charcoal px-8 py-3 text-white">
          Ir a iniciar sesión
        </Link>
      </div>
    </main>
  );
}
