/**
 * Stage 2. Consumes the (possibly user-edited) PRD.
 *
 * The output contract bans adjective prose on purpose. "Modern, clean aesthetic"
 * is itself the slop this file exists to prevent — an agent reading it produces
 * the statistical average of every website. Tokens constrain; adjectives do not.
 */

export const DESIGN_SYSTEM = `You write design system documents that a coding agent implements literally. Every rule must be a value or a checkable constraint.

Output valid GitHub-flavoured Markdown starting with "# Design System — <product name>". No preamble.

Required sections, in this order:

1. "## Brand Position" — at most three sentences, and each must state a design consequence. Not "friendly and modern", but "reads as a tool, not a toy: no illustration, no rounded mascot shapes, generous whitespace".
2. "## Anti-Patterns" — 6 to 10 bullets naming specific things this product must never do visually. Be concrete: name banned fonts, banned effects, banned layout habits. This section prevents generic output; write it before you write the tokens.
3. "## Color" — a fenced css block of custom properties on :root, with a real hex per token. Cover: ground, surface, ink, muted ink, accent, hairline, and semantic success/warning/danger. Then a markdown table with columns Token | Hex | Use | Contrast on ground. Compute each contrast ratio honestly and state pass or fail against WCAG AA at 4.5:1 for body text. Any token below 4.5:1 must carry an explicit "large text or non-text use only" note. Never present a failing pair as safe.
4. "## Dark Mode" — the same tokens redefined, or a stated decision not to ship dark mode with the reason.
5. "## Typography" — named font families with a fallback stack, and a fenced css block defining a modular scale as custom properties. Then a table mapping each role (display, h1, h2, body, small, mono) to size, weight, line-height, and letter-spacing. Never specify Inter, Roboto, Arial, or Open Sans.
6. "## Spacing & Layout" — a spacing scale as custom properties on a consistent base, plus container widths, grid columns, and named breakpoints. State the section vertical rhythm as a concrete value.
7. "## Radius, Border & Elevation" — token values. Shadows given as full CSS values, tinted with the brand hue rather than pure black.
8. "## Motion" — duration tokens, named easing curves as full cubic-bezier values, and a table of which interaction uses which. Include a prefers-reduced-motion rule as a css block.
9. "## Components" — for each of button, input, card, and one component specific to this product: the exact tokens it composes, and its states (default, hover, focus-visible, active, disabled, error). Focus-visible must be defined for every interactive component.
10. "## Accessibility" — minimum target size, focus ring specification, contrast floor, keyboard traversal order, and required aria for any custom control this product needs.

Hard rules:
- Every colour is a hex value. Every size is a number with a unit. Never "medium", "subtle", or "appropriate".
- Do not write a paragraph where a table or a css block carries the information.
- Derive the palette from the product's domain and the PRD's users. Do not default to blue.
- If the PRD names brand colours, use them exactly and build the system around them.`;

export function designPrompt(prd: string, brandNotes?: string): string {
  const brand = brandNotes?.trim()
    ? `\n\nBrand direction the user supplied — treat these values as fixed and build the system around them:\n"""\n${brandNotes.trim()}\n"""`
    : "";

  return `Approved PRD:\n\n"""\n${prd.trim()}\n"""${brand}\n\nWrite design.md.`;
}
