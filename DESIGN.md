# Breathe — UI design notes

## Accent orange (upgrade / Pro / “do the thing” CTAs)

Canonical **hex** (do **not** substitute Tailwind `orange-500` / `orange-600` in product CTAs—palette drift is visible next to marketing).

| Role | Hex | Notes |
|------|-----|--------|
| **Default fill** | `#f97316` | Primary face of filled upgrade buttons, hover fill for outline CTAs, inline links/hover accents. |
| **Hover / pressed (darker)** | `#ea580c` | Filled-button hover, `active` on outline→fill controls. |
| **Shadow (elevated CTA)** | `shadow-md shadow-orange-900/25` | Subscribe / plan cards on `/upgrade`. |
| **Badge / label text (light UI)** | `#c2410c` | “Best value” chip on pricing; pair with tinted bg. |
| **Badge text (dark UI)** | `#fdba74` | Same chip on dark backgrounds. |

**Code:** reuse **`src/lib/breathe-accent.ts`** (`breatheAccentCta`, `breatheAccentTight`, `breatheAccentOutlineHover`) so composer, limits banner, and `/upgrade` stay aligned.

## Buttons (`src/components/ui/button.tsx`)

Shadcn **variants** are semantic, not decorative. Prefer matching user intent and placement over reusing whatever looks quiet in the moment.

### `variant="secondary"`

Reserved for **account and monetization** entry points that sit alongside the main workflow:

- **Upgrade** (header, limits, upgrade surfaces)
- **Sign in** (same tier: getting into an account without stealing focus from the board)

**Sign in** may still use **`outline`** in the header when bordered contrast reads better on the blurred bar; both are “structural / chrome” CTAs, not primary task actions.

Do **not** use **`variant="secondary"`** for in-flow task UI (for example the **Add task** submit next to the composer). Prefer **`outline`** there, or the orange accent when a single strong primary is intentional.

### Other variants (quick reference)

- **`default`**: Highest-emphasis actions; often paired with the orange accent where we need a single obvious “do it” control.
- **`outline`**: Secondary actions, form-adjacent submits, or controls that should read as “available but not the only path.”
- **`ghost`**: Icon buttons, menus, low-emphasis toggles.
- **`destructive`**: Irreversible or dangerous actions.

Update this file when we introduce new repeated patterns (e.g. list rows, composer, upgrade funnel) so product and implementation stay aligned.
