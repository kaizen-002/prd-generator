import { cx } from "@/lib/cx";

/**
 * Double-bezel enclosure: an outer shell holding an inner core with a
 * concentric, mathematically smaller radius. Used for every major container so
 * panels read as machined objects rather than flat rectangles.
 */
export function Bezel({
  children,
  className,
  tone = "light",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={cx(
        "rounded-[2rem] p-1.5",
        tone === "light"
          ? "bg-fjord/[0.045] ring-1 ring-fjord/10"
          : "bg-ivory/[0.06] ring-1 ring-ivory/15",
        className,
      )}
    >
      <div
        className={cx(
          "h-full rounded-[calc(2rem-0.375rem)]",
          tone === "light"
            ? "bg-ivory shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_50px_-30px_rgba(23,59,70,0.45)]"
            : "bg-fjord-deep shadow-[inset_0_1px_0_rgba(250,249,238,0.12)]",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-fjord/[0.06] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-ink-muted ring-1 ring-fjord/10">
      {children}
    </span>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "quiet";
  trailing?: React.ReactNode;
};

/**
 * Pill CTA. A trailing glyph is never naked beside the label — it sits in its
 * own circular well flush with the inner padding, and gains kinetic tension on
 * hover while the whole button compresses on press.
 */
export function Button({
  variant = "primary",
  trailing,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={cx(
        "group inline-flex items-center gap-3 rounded-full font-medium",
        "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-ivory",
        "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
        trailing ? "py-2 pl-6 pr-2" : "px-6 py-3",
        variant === "primary"
          ? "bg-coral text-ivory shadow-[0_14px_30px_-18px_rgba(201,75,61,0.9)] hover:bg-coral-deep"
          : "bg-fjord/[0.05] text-ink ring-1 ring-fjord/10 hover:bg-fjord/[0.09]",
        className,
      )}
    >
      <span className="text-sm tracking-tight">{children}</span>
      {trailing ? (
        <span
          className={cx(
            "flex h-9 w-9 items-center justify-center rounded-full",
            "transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
            "group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105",
            variant === "primary" ? "bg-ivory/20" : "bg-fjord/[0.07]",
          )}
        >
          {trailing}
        </span>
      ) : null}
    </button>
  );
}

export function ArrowGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <path
        d="M4 12L12 4M12 4H6M12 4v6"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Rule() {
  return <div className="h-px w-full bg-fjord/[0.09]" />;
}
