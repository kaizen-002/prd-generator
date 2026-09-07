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
3. "## Color" — a fenced css block of custom properties on :root, with a real hex per token. Cover: ground, surface, ink, muted ink, disabled ink, accent, accent-strong, hairline, and semantic success/warning/danger plus the text colour that sits on each semantic fill.
   - \`--color-ground\` and \`--color-surface\` MUST be different values. If panels are the same colour as the page they are invisible.
   - Split the accent in two. \`--color-accent\` is a FILL, used with a stated text colour on top of it; \`--color-accent-strong\` is the darker variant used for accent text, links and the focus ring. A single mid-tone accent cannot legally be both: it fails as text on a light ground while being too light to sit under white text. This is the most common failure in a generated design system, and it puts the failure in the primary button.
   - Then a table: Token | Hex | Use | Ratio on ground | Ratio on surface | Verdict.
   - You cannot compute logarithms reliably, so DO NOT invent the numbers. Emit a "## Verification" section containing a short, runnable \`scripts/contrast.py\` that hardcodes the palette, computes every required pair, and exits non-zero on failure. State in the document that every ratio came from that script and must be re-run after any colour change. Then leave the numeric cells filled with your best estimate AND add a line directly under the table: "Ratios are estimates until \`python scripts/contrast.py\` has been run; the script is authoritative."
   - The pairs the script must check: every text token on ground and on surface (4.5:1); the text colour on every fill including hover and pressed variants (4.5:1); the focus ring against both ground and surface (3:1, WCAG 2.2 non-text); and that muted ink, disabled ink and the accent are mutually distinguishable, since collapsing them makes secondary text, disabled text and interactive accent identical.
   - Disabled text is exempt from 4.5:1 (WCAG 1.4.3). Say so explicitly rather than quietly failing it.
4. "## Dark Mode" — the same tokens redefined with their own ratio table, or a stated decision not to ship dark mode with the reason. Dark mode gets the same scrutiny as light: a semantic colour that passes on a light ground frequently fails as a fill in dark mode, because the fill got lighter while the text on it stayed white. Check the text-on-fill pairs specifically.
5. "## Typography" — named font families with a fallback stack, and a fenced css block defining a modular scale as custom properties. Then a table mapping each role (display, h1, h2, body, small, mono) to size, weight, line-height, and letter-spacing. Never specify Inter, Roboto, Arial, or Open Sans.
6. "## Spacing & Layout" — a spacing scale as custom properties on a consistent base, plus container widths, grid columns, and named breakpoints. State the section vertical rhythm as a concrete value.
7. "## Radius, Border & Elevation" — token values. Shadows given as full CSS values, tinted with the brand hue rather than pure black.
8. "## Motion" — duration tokens, named easing curves as full cubic-bezier values, and a table of which interaction uses which. Include a prefers-reduced-motion rule as a css block.

9. "## Output Tokens" — REQUIRED whenever the PRD describes a product that renders its own visual artefact: video, burned-in captions, a generated image, PDF, chart, slide or email template. The design system must cover what the product PRODUCES, not only the interface that produces it. Omitting this is a hard failure, because a rules document that forbids values outside the token set makes the renderer literally unwritable.
   - Give the output surface its own complete token block: typography, geometry in the output's own units, colour, and safe areas.
   - Give it its OWN timing scale, separate from the UI motion tokens, and say why they are not interchangeable. UI durations assume an event-driven compositor; a rendered video has a fixed frame grid, so every duration must be a whole number of frames at the target frame rate (at 30fps, 250ms is 7.5 frames and will judder). State the frame rate you quantised against.
   - Where output text sits on unpredictable backgrounds (over video or photography), WCAG ratios do not apply, because there is no known background colour. Say so, and specify the structural guarantee instead — an opaque stroke, a scrim, or a plate — then give the ratio of the text against THAT.
   - Never signal state by colour alone in output that will be watched rather than inspected.
10. "## Components" — for each of button, input, card, and one component specific to this product: the exact tokens it composes, and its states (default, hover, focus-visible, active, disabled, error). Focus-visible must be defined for every interactive component.
11. "## Accessibility" — minimum target size, focus ring specification, contrast floor, keyboard traversal order, and required aria for any custom control this product needs.

Hard rules:
- Every colour is a hex value. Every size is a number with a unit. Never "medium", "subtle", or "appropriate".
- Do not write a paragraph where a table or a css block carries the information.
- Derive the palette from the product's domain and the PRD's users. Do not default to blue.
- If the PRD names brand colours, use them exactly and build the system around them.
- Read the PRD's chosen UI stack before specifying components. If the stack cannot express what you are specifying — custom focus rings, exact hit targets, explicit ARIA roles, drag interactions — say so in one line rather than writing a specification that cannot be implemented. A design system and a stack chosen independently will contradict each other.`;

export function designPrompt(prd: string, brandNotes?: string): string {
  const brand = brandNotes?.trim()
    ? `\n\nBrand direction the user supplied — treat these values as fixed and build the system around them:\n"""\n${brandNotes.trim()}\n"""`
    : "";

  return `Approved PRD:\n\n"""\n${prd.trim()}\n"""${brand}\n\nWrite design.md.`;
}
