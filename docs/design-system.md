# WIT design system

Quiet, warm, precise. Dense where it helps, spacious where it matters. Linear's precision, Notion's calm, one muted emerald accent.

Stack: Tailwind CSS v4 (CSS-first, tokens live in `src/app/globals.css`), shadcn/ui (radix-nova, customized), Lucide, Framer Motion, Geist Sans and Geist Mono via `next/font`.

## Tokens

All colors are CSS variables on `:root` (light) and `.dark`, exposed to Tailwind through `@theme inline`. Use the utility, never a raw hex.

| Token | Utility | Light | Dark | Use |
| --- | --- | --- | --- | --- |
| background | `bg-background` | `#F6F5F1` | `#101210` | Page. Never pure white or black. |
| card | `bg-card` | `#FBFAF7` | `#151815` | Raised surface, used sparingly. |
| popover | `bg-popover` | `#FCFBF8` | `#181B18` | Menus, dialogs. |
| foreground | `text-foreground` | `#151714` | `#ECEBE6` | Primary text. |
| muted-foreground | `text-muted-foreground` | `#66655E` | `#9B9A91` | Secondary text. |
| muted / secondary | `bg-muted` | `#EDEBE5` | `#1D201D` | Quiet fills, skeletons. |
| accent | `bg-accent` | `#EAE8E1` | `#232723` | Hover fill (neutral). |
| border | `border-border` | `#E3E1D9` | `#262A26` | Hairlines. |
| border-strong | `border-border-strong` | `#D2CFC4` | `#353A35` | Emphasis dividers. |
| input | `border-input` | `#D6D3C9` | `#30352F` | Form control borders. |
| primary | `bg-primary` | `#2F7D5B` | `#4FB286` | The single emerald accent. Also focus ring. |
| primary-soft / primary-ink | `bg-primary-soft text-primary-ink` | `#E1EEE6` / `#1F5A41` | `#16271F` / `#8AD4AE` | Tinted accent surfaces and text on them. |
| success / warning / destructive / info | `text-warning`, `bg-warning-soft` ... | see CSS | see CSS | Semantic, sparingly. Each has a `-soft` background. |
| status-* | `bg-status-capturing` | alias | alias | upcoming, ready, capturing, paused, processing, failed. |

Elevation: only `shadow-float` (tinted, defined as `--elevation-float`) for popovers, menus, dialogs, sheets. Cards and rows use a hairline, not a shadow.

## Typography

- Sans: Geist Sans (`font-sans`). Mono: Geist Mono (`font-mono`).
- Numbers, timestamps, durations, metrics: `font-mono tabular-nums` or the `.num` utility (mono, tabular, slightly tight).
- App scale: 12 (`text-xs`) meta, 13 to 14 (`text-sm`) body, 16 (`text-base`) transcript and form inputs, 20 to 24 page titles. Marketing may go larger, never the dashboard.
- Titles `font-semibold tracking-tight`. Body 400, labels 500. Avoid bold paragraphs.
- Muted text only at `text-muted-foreground`; do not stack opacity on it.

## Spacing and radius

- 4px base. Prefer 8 / 12 / 16 / 24 / 32 / 48 steps. Dense lists use 8 to 12px vertical padding, marketing sections 96px or more.
- Radii: `rounded-sm` 4, `rounded-md` 6, `rounded-lg` 8 (controls, cards), `rounded-xl` 8, `rounded-2xl` 10. Max 12px except `rounded-full` for dots, switches, avatars.
- Layout: `min-h-dvh`, never `h-screen`. CSS grid (`grid-cols-[1fr_auto]`, `grid-cols-12`) over flex percentage math. `scrollbar-gutter: stable` is set on `html`.
- Group with hairline dividers (`divide-y divide-border`, `border-b`) before reaching for boxed cards. No three-equal-cards rows.

## Components

- shadcn components live in `src/components/ui` and are already customized: small radii, hairline `ring-border`, accent focus ring (`ring-2 ring-ring`), press feedback (`active:translate-y-[1px] active:scale-[0.99]` on buttons), blur-free overlays (`bg-foreground/30`).
- Badge adds `success | warning | info | danger | muted` variants.
- Shared states in `src/components/shared`: `EmptyState`, `ErrorState`, `LoadingState`, `ConfirmDialog`, `PageHeader`, `Logo`, `StatusBadge`, `VisuallyHidden`.
- Every list or page has all four states: loading (skeleton), empty (icon, explanation, primary action), error (what happened, why it matters, retry; never a raw backend message), success (toast via Sonner).
- Focus: always visible, always the accent. Do not remove outlines without replacing them.
- Server Components by default. Add `"use client"` only for state, effects, browser APIs, or Framer Motion.
- Provider tree is intentionally small: theme, TanStack Query, tooltips, toaster (`AppProviders`). Zustand needs no provider.

## Motion

- Framer Motion springs: `stiffness` 100 to 300, `damping` 20 to 30. Typical: `{ type: "spring", stiffness: 260, damping: 26 }`.
- Animate `transform` and `opacity` only. Never width, height, top, left, margins.
- Durations for CSS transitions: 100 to 200ms, `ease-out`. Press feedback is instant.
- Use motion for page entry, dialogs and sheets, onboarding steps, processing, capture state, number changes. Do not animate long lists or every element.
- Reduced motion: `globals.css` collapses animation and transition durations under `prefers-reduced-motion: reduce`. In Framer Motion use `useReducedMotion()` or `MotionConfig reducedMotion="user"` and drop movement.
- Pulses (capturing, processing dots) use `motion-safe:animate-pulse`.

## Icons

- Lucide only, imported by name (`import { Mic } from "lucide-react"`). No other icon library, no emojis anywhere in UI or copy.
- Default 16px (`size-4`) in controls, 20px in empty states. Stroke is the Lucide default; never mix filled and outline.
- Icon-only buttons need `aria-label` and a tooltip when the meaning is ambiguous. Decorative icons get `aria-hidden`.

## Do

- Warm off-white and tinted near-black. One emerald accent. Color means state.
- Mono for timestamps, durations, counts, money.
- Hairlines over boxes. Skeletons over spinners.
- Show the important result first, transcript last. Every AI insight links to its source timestamp.
- Plain, specific copy. Privacy and manual capture stated explicitly.

## Don't

- No pure `#000` or `#fff` surfaces or text.
- No gradients, glows, neon, glassmorphism, or purple.
- No emoji, no robot or sparkle AI imagery.
- No `h-screen`; use `min-h-dvh`.
- No giant radii, no heavy shadows, no cards inside cards.
- No full-page spinners, no `any`, no raw backend errors in the UI.
- Do not duplicate server data into Zustand; TanStack Query owns it.
