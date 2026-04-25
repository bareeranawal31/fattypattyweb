"use client"

interface SignInBenefitsPromptProps {
  open: boolean
  onClose: () => void
  onSignIn: () => void
  onContinueGuest: () => void
}

export function SignInBenefitsPrompt({
  open,
  onClose,
  onSignIn,
  onContinueGuest,
}: SignInBenefitsPromptProps) {
  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-dark/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Choose how to continue"
      >
        <h3 className="text-lg font-bold text-foreground">Choose how to continue</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Sign in to save your preferences and order faster next time, or continue as a guest to
          open the product details.
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onSignIn}
            className="w-full rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-brand-red/90"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={onContinueGuest}
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Continue As Guest
          </button>
        </div>
      </div>
    </div>
  )
}
