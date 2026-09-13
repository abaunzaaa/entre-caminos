import keyClear from "../../assets/key-icon-green-clear.png";

type AuthKeyIconProps = {
  className?: string;
};

/** Llave oficial sin fondo negro. */
export function AuthKeyIcon({ className = "" }: AuthKeyIconProps) {
  return (
    <span className={`auth-key-icon ${className}`.trim()} aria-hidden="true">
      <img src={keyClear} alt="" width={76} height={76} decoding="async" />
    </span>
  );
}
