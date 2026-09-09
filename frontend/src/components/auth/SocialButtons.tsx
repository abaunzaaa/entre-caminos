function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.6-5.6-5.7S8.9 6 12 6c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.6 14.6 2.7 12 2.7 6.9 2.7 2.8 6.8 2.8 12S6.9 21.3 12 21.3c5.2 0 8.6-3.6 8.6-8.7 0-.6-.1-1-.2-1.4H12z" />
    </svg>
  );
}

function startGoogleLogin(remember: boolean) {
  const params = new URLSearchParams({ remember: remember ? "1" : "0" });
  window.location.assign(`/api/auth/google?${params.toString()}`);
}

export function SocialButtons({ label, remember = true }: { label: string; remember?: boolean }) {
  return (
    <div className="auth-social">
      <div className="flex items-center gap-3 text-xs text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200" />
        {label}
        <span className="h-px flex-1 bg-neutral-200" />
      </div>
      <div className="flex w-full justify-center">
        <button
          type="button"
          className="grid h-12 w-12 place-items-center rounded-full border border-neutral-200"
          aria-label="Google"
          onClick={() => startGoogleLogin(remember)}
        >
          <GoogleIcon />
        </button>
      </div>
    </div>
  );
}
