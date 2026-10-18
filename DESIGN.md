---
name: FineDine Customer Ordering
description: A warm ice-cream-parlour ordering counter in cherry pink and amber, Arabic-first and bidirectional, on cream ground with white rows.
colors:
  text-50: "#f7f0ee"
  text-100: "#efe1dc"
  text-200: "#dfc3b9"
  text-300: "#cfa596"
  text-400: "#bf8773"
  text-500: "#af6950"
  text-600: "#8c5440"
  text-700: "#693f30"
  text-800: "#462a20"
  text-900: "#231510"
  text-950: "#110b08"
  background-50: "#faf7ea"
  background-100: "#f6efd5"
  background-200: "#ecdfac"
  background-300: "#e3cf82"
  background-400: "#d9c059"
  background-500: "#d0b02f"
  background-600: "#a68d26"
  background-700: "#7d691c"
  background-800: "#534613"
  background-900: "#2a2309"
  background-950: "#151205"
  primary-50: "#faeaf0"
  primary-100: "#f5d6e0"
  primary-200: "#ebadc2"
  primary-300: "#e184a3"
  primary-400: "#d75b84"
  primary-500: "#cd3266"
  primary-600: "#a42851"
  primary-700: "#7b1e3d"
  primary-800: "#521429"
  primary-900: "#290a14"
  primary-950: "#15050a"
  secondary-50: "#fcf5e8"
  secondary-100: "#f9ead2"
  secondary-200: "#f4d5a4"
  secondary-300: "#eec077"
  secondary-400: "#e9ac49"
  secondary-500: "#e3971c"
  secondary-600: "#b67916"
  secondary-700: "#885a11"
  secondary-800: "#5b3c0b"
  secondary-900: "#2d1e06"
  secondary-950: "#170f03"
  accent-50: "#fbeaed"
  accent-100: "#f7d4dc"
  accent-200: "#eeaab9"
  accent-300: "#e67f95"
  accent-400: "#dd5572"
  accent-500: "#d52a4f"
  accent-600: "#aa223f"
  accent-700: "#80192f"
  accent-800: "#551120"
  accent-900: "#2b0810"
  accent-950: "#150408"
  surface-white: "#ffffff"
  ok-green: "#1f7a4d"
typography:
  headline:
    fontFamily: "Thmanyah Sans, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 900
    lineHeight: 1.25
  title:
    fontFamily: "Thmanyah Sans, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 900
    lineHeight: 1.2
  item-name:
    fontFamily: "Thmanyah Sans, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.35
  price:
    fontFamily: "Thmanyah Sans, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 900
    lineHeight: 1.5
  body:
    fontFamily: "Thmanyah Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  description:
    fontFamily: "Thmanyah Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Thmanyah Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.5
rounded:
  control: "16px"
  row: "22px"
  sheet: "28px"
  pill: "999px"
  photo: "18px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  page-gutter: "16px"
components:
  item-row:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.text-900}"
    rounded: "{rounded.row}"
    padding: "12px"
  add-button:
    backgroundColor: "{colors.primary-500}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.pill}"
    size: "46px"
  button-primary:
    backgroundColor: "{colors.primary-500}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.pill}"
    height: "54px"
    padding: "0 24px"
  button-soft:
    backgroundColor: "{colors.background-100}"
    textColor: "{colors.text-900}"
    rounded: "{rounded.pill}"
    height: "54px"
  category-pill:
    textColor: "{colors.text-600}"
    rounded: "{rounded.pill}"
    height: "44px"
    padding: "0 18px"
  category-pill-selected:
    backgroundColor: "{colors.primary-500}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.pill}"
  field:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.text-900}"
    rounded: "{rounded.control}"
    height: "52px"
    padding: "12px 16px"
  sheet:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.text-900}"
    rounded: "{rounded.sheet}"
  stepper:
    backgroundColor: "{colors.background-100}"
    rounded: "{rounded.pill}"
    padding: "4px"
  payment-option:
    backgroundColor: "{colors.surface-white}"
    rounded: "18px"
    padding: "14px 16px"
  transfer-panel:
    backgroundColor: "{colors.background-100}"
    rounded: "{rounded.row}"
    padding: "18px"
  hero-card:
    textColor: "{colors.surface-white}"
    rounded: "{rounded.row}"
    padding: "20px"
  timeline-dot-current:
    backgroundColor: "{colors.secondary-500}"
    textColor: "{colors.text-900}"
    rounded: "50%"
    size: "40px"
---

# Design System: FineDine Customer Ordering

## Customer app, version 6 (current; overrides everything below it)

- **Payment screen** has four short parts: your name; how you pay; for a transfer, the number you paid from; and the operation number (8 or 9 digits, optional) or a photo of the receipt, at least one of the two. Nothing about the table or pickup. The total is pinned above the action button on the order and payment screens (`components/ui/CheckoutBar`).
- **Phone numbers** are shown as 059-123-4567 and stored and copied as 10 plain digits starting with 05 (`lib/phone.ts` turns +970…, 00970… and dashed forms into that). The server checks the same rules.
- **Item view** is a true bottom sheet: the page stays visible but dimmed, a handle on top, a square photo, details that fit. Close with the button, a tap on the dimmed page, a drag or flick down on the handle or photo, Escape, or back. The page behind does not scroll.
- **Order status card** has only a faint glow just inside its edges.
- **Home shapes** wander slowly across the page (30 to 60 s loops), like a live wallpaper; the carousel fade is long, soft and low-contrast.

## Customer app, version 5 (current for what version 6 does not change)

- **Components, not copies.** `components/ui` holds the repeated pieces: `Button` (primary, soft, quiet), `IconButton`, `Stepper`, `TextField`. Screens compose them; styles live in one place each.
- **Quantity** is `Stepper`: "+" on the left, the number, then "x" (remove) when there is one or "-" when there are more, the same order in Arabic and English. When choosing a quantity before adding it stops at 1 with no remove.
- **No card boxes.** Rows, order lines, payment options, totals, notices and the admin sections sit on the page and are separated by a hairline that fades out at both ends (`--rule`). Rounded containers remain only where they are a control (buttons, fields, size choices) or the one hero (the order status card). Staff screens follow the same rule; the current page in the staff navigation is marked by a bar.
- **Alive buttons** lift very slightly in brightness and colour now and then (an opacity-only overlay) over a still grain. No orb, no moving grain.
- **Carousel** is sized by width only (it never changes layout on a short screen; the page scrolls instead), has a short smooth edge fade, and is draggable by mouse and touch. Photos and text cannot be selected or dragged anywhere in the customer app.
- **Item view** is a square photo on top (capped at 40% of a short screen, cropped not stretched) and a sheet that fits the rest without scrolling; it opens in 320 ms on a standard ease.
- **Top bar**: the open/closed indicator is gone; the language button carries a globe at its start edge; the order bar reads "View order" with an arrow pointing the way forward.

## Customer app, version 4 (current for what version 5 does not change)

Round three changed these (the version 3 notes below still hold unless contradicted here):

- **Home carousel** is a custom strip (pointer drag, flick, wheel, arrow keys), not a scroller: three cards in view, the middle one whole and the sides as half cards curving toward it with an 8px gap, faded into the page at both edges, endless, and automatic every 3.2 s. Any touch, hover or focus on the home pauses it for 3 s. Above it a large two-tone title; behind it soft pastel rings and arcs (vector, transform-only motion).
- **Wheel** picks the page the moment its destination is known (the old version waited for the spring to stop, which felt like lag).
- **Glow, not shimmer.** Coloured controls have a static fine grain and one soft bright orb that drifts across them (a single transform animation). No moving grain, no scaling pulses, no bounce: easing is a plain standard curve.
- **Order card** (status screen) is a colour that gathers at the bottom edge and thins out slowly toward the top, a light divider, and a "Show details" row that opens the items, payment, note and total without moving the progress list below it.
- **Floating order bar** has an inner light-and-depth gradient (inset shadows only).
- **Item view** grows from the tapped card to the top 62% of the screen (the whole photo shows), the sheet rises over its lower edge.
- **Top corner**: an open/closed chip (the table name replaces it when the table is known).
- **Notice** "your order is in progress" appears only after the server confirms that order is still running.
- **Speed**: `npm run local` runs the real production build on this machine; judge speed there, not in `npm run dev`.

## Customer app, version 3

- **One page, no reloads.** `components/menu/MenuApp.tsx` holds home, categories, item, order, checkout and order status as states with history entries. `/`, `/m/[slug]`, `/t/[code]` and `/order/[token]` all render it. There is no landing page.
- **It is an order, not a cart.** Wording and icons say "order" everywhere (a clipboard icon, "Continue order"). The order button in the top bar and the floating order bar appear only once something was added; the count chip beside an item appears only when that item is in the order.
- **Intro.** `public/intro.mp4` is plain HTML in the server response and plays first, pinned to the viewport. The app rises into place while the intro fades and scales away; the intro is removed only after the fade. It plays once per browser tab and never on staff pages.
- **Navigation is the category wheel.** An endless wheel (Home plus the categories) with a springy, slightly underdamped turn. Drag, flick, tap a name, trackpad, mouse wheel or arrow keys. Whatever settles at the centre is the page. Two small arrows breathe above the bottom edge until the first interaction; then they are gone for good (localStorage `fd_wheel_hint`).
- **Home carousel** is a concave strip drawn from the scroll position: cards sit on the inside of a ring, turned toward the centre and brought forward. Name, price and the add control follow the centred card.
- **Item view** grows out of the tapped card (photo box clip-path, image transform, sheet rising), and plays backwards on close. No View Transitions API. Extras are rows with an "Add" button that turns into "Added" and shows the price it adds.
- **Quantity everywhere.** An item with no sizes or extras turns its add button into a small stepper once it is in the order; items with options show a count chip.
- **Life without shadows.** No borders, no drop shadows, no pills. Coloured controls carry a slow drifting highlight and fine moving grain (`.fd-live`); presses scale and brighten; lists rise in one after another; the wheel dot breathes. All of it stops under reduced motion.
- **Gradients run along the line of reading** (start edge to end edge), mirrored in Arabic.
- **Checkout.** The table comes from the QR code and is shown as one quiet line. No table field, no pickup card. Name needs 3 letters; the mobile number is required, 10 digits starting with 05 (checked on the client and on the server). Payment methods are ordered cash, PalPay, Jawwal Pay, bank.
- **Session.** The open order and the order being followed live in cookies (`fd_cart_<branch>`, `fd_order_<branch>`) that the server reads too, so the first paint already shows them and a closed tab loses nothing.
- **Fonts and weight.** Three WOFF2 subsets of Thmanyah Sans (Arabic and Latin), about a third of the original files. Brand files are cached for a year; customer pages are revalidated but allowed into the back/forward cache.

## Overview

**Creative North Star: "The Parlour Counter"**

A warm ice-cream-parlour ordering counter. Cream ground, white rows that sit on it with a soft lifted shadow, cherry pink as the single action colour, amber for "this is happening now". The menu is the first thing on screen and the whole job is add, review, pay, wait. There is no marketing banner.

The system is built for one hand on a phone, often in dim light, in Arabic (right to left) or English (left to right) with one stylesheet. Surfaces are generous in tap size (44px minimum, 46 to 54px typical), pill-shaped for actions and rounded-rectangle for content. The phone's colour-scheme setting swaps the whole palette to an olive-black dark set.

**Key Characteristics:**
- Cream (`background-50`) ground, white (`surface`) rows, pink action, amber current-state.
- Pill buttons and 22px rows; photos at 18px inside them.
- Thmanyah Sans only, weights 400 to 900, heavy weights for names, prices and headings.
- One icon family: outline, 24px grid, 1.8 stroke, inline SVG.
- Logical CSS properties only, so rtl and ltr share one stylesheet.
- Crimson gradient reserved for brand moments: logo, cart bar, hero card, status card.

## Colors

Owner-supplied palette: five 50-to-950 scales (text, background, primary, secondary, accent), a light set and a dark set that is a deliberate inversion of each scale, plus three brand gradients. The scales are brand commitments; the frontmatter records the light set exactly as written in `app/menu.css`, and the dark set lives in the sidecar. Components never use a scale step directly; they use the semantic role tokens below.

### Primary
- **Cherry Pink** (`primary-500`): the only action colour. Add button, primary button, selected category pill, cart badge, selected choice and payment outlines, focus on fields, done timeline steps.
- **Raspberry Text** (`primary-600`): pink as text on cream or white (prices, table chip, links, total), because 500 is too light for small text.

### Secondary
- **Amber** (`secondary-500`): "current" only. The current timeline dot with a 6px soft halo. Never a button colour.

### Tertiary
- **Crimson** (`accent-600`, danger): error text and error panel tint. `accent-700` (`#80192f`) is only the deep end of the gradient family.

### Neutral
- **Cream** (`background-50`): page ground and top bar.
- **Butter** (`background-100`): soft fill for secondary buttons, steppers, notices, totals, transfer panel, icon wells, disabled add button.
- **Cocoa Ink** (`text-900`): body and headings. **Soft Cocoa** (`text-600`): descriptions, helper text, unselected pills, upcoming steps. **Control Cocoa** (`text-400`, 500 in dark): outlines of unselected inputs, choices, checks, radios.
- **White** (`surface-white`, `#1f1c08` in dark): row, sheet, input and pill-bar surface.
- **Ok Green** (`ok-green`, `#58c98b` in dark): the transient "added" state of the add button only.

### Semantic role tokens (defined once in `.fd`, dark overrides in the media query)
- `--c-bg` = background-50: page, top bar, sticky CTA fade.
- `--c-surface` = `#ffffff` / `#1f1c08`: rows, sheet, inputs, category bar, close button.
- `--c-soft` = background-100 / `#2d290c`: soft fills listed above.
- `--c-ink` = text-900: text. `--c-ink-soft` = text-600: secondary text, placeholders.
- `--c-line` = text-900 at 11%: hairlines, row top edge, timeline rail.
- `--c-control` = text-400 / text-500: unselected outlines.
- `--c-primary` = primary-500: fills. `--c-primary-text` = primary-600 / primary-700: pink text. `--c-on-primary` = white.
- `--c-amber` = secondary-500, `--c-on-amber` = text-900 / `#231510`: current step.
- `--c-danger` = accent-600 (accent-600 is lighter in dark): errors. `--c-ok`: added state.
- `--c-focus` = primary-600 / primary-700: 3px focus outline, 2px offset. `--c-shadow` = `rgba(66,30,20,0.12)` / `rgba(0,0,0,0.45)`.

### Gradients (brand commitments)
- `grad-primary-secondary`: `linear-gradient(135deg, #d03a6c, #e59f2d)`. Placeholder fill behind photos and the empty-cart icon.
- `grad-primary-accent`: `linear-gradient(135deg, #d03a6c, #8c1c35)`. Logo disc, cart bar, hero card, status card.
- `grad-secondary-accent`: `linear-gradient(135deg, #e59f2d, #8c1c35)`. Declared, unused in the current build.

### Named Rules
**The One Action Colour Rule.** Pink is the only colour that means "press this". Amber and green are state, never action.

**The Role Token Rule.** Components consume `--c-*` roles, not scale steps, so the dark set swaps without touching components.

**The Gradient Reserve Rule.** The crimson gradient marks brand moments (identity, the cart, the two hero cards). It is not a decoration for ordinary rows, buttons or headings.

## Typography

**Display, Body and Label Font:** Thmanyah Sans (system-ui fallback), loaded from `custom-font/` at weights 300, 400, 500, 700, 900 and exposed as `--font-brand`.

**Character:** One family, contrast carried by weight: black (900) for headings, prices and totals, bold (700) for names and labels, regular for reading text. Arabic runs at line-height 1.75 (1.5 in English) and Arabic descriptions are one pixel larger.

### Hierarchy
- **Headline** (900, 32px, 1.25): order status title.
- **Title** (900, 26 to 30px, 1.2): menu heading 30, cart and checkout screen heads 28, sheet item name 26.
- **Section title** (900, 18px): checkout sections. Price 18px 900 in pink-text; total 26px 900.
- **Item name** (700, 17px, 1.35); venue name (900, 19px).
- **Body** (400, 16px, 1.5): form text and general copy; weight 500 for supporting lines and notices.
- **Description** (400, 14px, 1.6; 15px in Arabic and in the sheet): two-line clamp in rows, unclamped in the sheet.
- **Label** (700, 13 to 14px): sold-out chip, choice sublabel, table chip, helper text.

### Named Rules
**The Weight Carries It Rule.** Hierarchy comes from weight and size inside one family. No second typeface, no letter-spaced uppercase labels.

**The One Language Per Line Rule.** Arabic and English are never shown in one line or one string. The language switch changes the whole screen.

**The Eastern Digits Rule.** In Arabic, every number (prices, counts, badges, table numbers) is formatted with the `ar-EG` locale so digits are Arabic-Indic; English uses Latin digits. Formatting lives in `lib/i18n.ts`. Bank account strings are forced `direction: ltr` so they copy cleanly.

## Layout

A single centred column: `.fd-shell` is `min(100%, 560px)` with 16px inline padding. Top bar is sticky, 68px minimum. Menu body has 200px bottom padding to clear the fixed dock; plain screens use 40px. Rhythm is 4 / 8 / 12 / 16 / 20px; lists gap 12px, stacks gap 16px.

Item rows are a two-column grid: 96px photo at the start edge, content at the end, with the price and the 46px add button in a foot row. Cart lines use a 64px photo. The bottom dock is fixed, 536px max, stacking the cart bar over the category pill bar with 10px gap, safe-area aware. Everything uses logical properties (`margin-inline`, `inset-inline-end`, `border-block-end`, `text-align: start`); direction-sensitive icons carry `fd-flip`, mirrored with `scaleX(-1)` in rtl. There is a single layout, mobile-first; no breakpoints exist.

## Elevation & Depth

Hybrid: tonal layering first, soft shadows for lift. Cream ground, white rows with a 1px line plus a long soft shadow (`0 1px 0 var(--c-line), 0 10px 26px -14px var(--c-shadow)`). Inputs, choices and unselected options are flat, drawn with an inset ring (`inset 0 0 0 1.5px var(--c-control)`), thickened to 2px pink when selected or focused.

### Shadow Vocabulary
- **Row lift** (`0 1px 0 var(--c-line), 0 10px 26px -14px var(--c-shadow)`): item rows, cart lines.
- **Dock lift** (`0 0 0 1px var(--c-line), 0 14px 30px -14px var(--c-shadow)`): category bar.
- **Pink glow** (`0 8px 18px -8px var(--c-primary)` add button, `0 12px 24px -12px` primary button): action colour bleeding downward. Removed when disabled.
- **Crimson glow** (`0 14px 28px -12px rgba(140,28,53,0.65)`, up to `0 22px 40px -22px rgba(140,28,53,0.75)`): the gradient surfaces.
- **Sheet backdrop** (`rgba(35,21,16,0.55)`).

### Named Rules
**The Soft Lift Rule.** Shadows are long, low-opacity and negatively spread (blurred downward, never offset hard). No hard offset shadows.

## Shapes

Round and friendly. Actions and bars are full pills (`999px`); content rows and panels are 22px (`radius-card`); the item sheet is 28px on its top corners only; inputs, choices and checks 16px; payment options 18px; photos 18px (14px in cart, 12px for the receipt thumbnail). Logo, add button, close button, stepper buttons and timeline dots are circles. Selection is shown by ring and tint, not by checkmark badges alone.

## Components

### Top bar
Sticky, cream, hairline underneath. Start side: 42px pink-crimson gradient circle logo with initial, venue name (900, 19px, ellipsis), pink table chip. End side: language switch (pill button, 44px min, white with inset line ring) and cart button (44px circle with a pink count badge pinned at the end corner).

### Item row
White 22px row, 96px photo at start, name (700), two-line description in soft cocoa, pink price, 46px round pink add button at the end. Add turns green with a check briefly (`data-done`). Sold out: photo, name and price at 55% opacity, a soft "sold" chip, add button disabled to the soft fill.

### Bottom dock
Fixed. Cart bar: crimson gradient pill-ish bar (20px radius), white text, count and total, rises in on mount. Category bar: white pill track, 44px pills, selected pill filled pink with 700 weight; scrolls horizontally with the scrollbar hidden.

### Item sheet
Native `<dialog>`: focus trap, Escape and inert page come from the platform. Slides up from the bottom, 560px max, 92dvh max, 28px top corners, 16:10 photo (or gradient placeholder), 44px close button at the end corner. Body holds name, full description, option groups (choice tiles at 16px with min width 96px; check rows 52px) and a foot with stepper plus a full-width add button.

### Stepper
Soft butter pill containing round white 42px minus and plus buttons and a 900-weight count between them. Disabled at limits (40% opacity). Used in the sheet foot and, at end alignment, in cart lines.

### Field
Label in 700, optional small helper in soft cocoa, 52px white input at 16px radius with an inset ring; focus swaps to a 2px pink ring. Note textarea is butter-filled with no ring. Search is the pill variant (48px) with an icon.

### Payment option
White 18px option with a 44px butter icon well in pink-text, title plus small subtitle, and a 24px radio at the end. Selected: 8% pink tint, 2px pink ring, filled radio. Native input is visually hidden over the whole label; focus ring shows on the label.

### Transfer panel
Butter 22px panel holding a white account row (900, 19px, forced ltr, with a 44px copy pill), the receipt upload (pill label button plus 56px thumbnail), and help text. Errors use a danger-tinted panel with 700 danger text.

### Hero card
Crimson gradient 22px card, white text, a 52px translucent icon tile and a 24px 900 headline. The empty cart reuses the icon tile as an 84px circle on the pink-to-amber gradient. The status card is the large (28px radius) variant; when cancelled it drops to butter with ink text and no shadow.

### Status timeline
Five steps on a vertical rail (2px line). Done: pink dot and pink rail. Current: amber dot with a 6px soft amber halo. Upcoming: butter dot, soft text. Dots are 40px circles; the rail is anchored with `inset-inline-start`. In the ready state the status card bell rings.

### Motion
All easing is `cubic-bezier(0.16, 1, 0.3, 1)` (`--ease-out`). Sheet slide-up 360ms (48px rise with fade) with a 240ms backdrop fade; cart bar rise 380ms (16px); press feedback on the add button (scale 0.9) and primary button (scale 0.98) at 220ms; pill colour transitions 220ms; bell ring 1.6s infinite on the ready status card only. Under `prefers-reduced-motion: reduce` every animation and transition inside `.fd` and the sheet backdrop is disabled.

## Do's and Don'ts

### Do:
- **Do** take every colour from a `--c-*` role; use `--c-primary-text` for pink text, `--c-primary` for fills.
- **Do** write logical properties only (`inline`/`block`, `start`/`end`) and mirror directional icons with `fd-flip`.
- **Do** show one language per screen, format numbers through `lib/i18n.ts`, and use Arabic-Indic digits in Arabic.
- **Do** keep tap targets at 44px or more and keep the 3px pink focus outline.
- **Do** use the separator dot element (`fd-sep`) between facts; a typed middle dot reads as an Arabic zero.
- **Do** use the single outline icon set (24px grid, 1.8 stroke).
- **Do** gate every animation behind the reduced-motion override already in the stylesheet.

### Don't:
- **Don't** put Arabic and English in one line, one label or one string.
- **Don't** add UI for features that do not exist: no tax line, no estimated-time display, no call-waiter button, no card payment.
- **Don't** use pink for anything that is not an action, price or selection; use amber only for the current state.
- **Don't** spread the crimson gradient onto ordinary rows, buttons or headings.
- **Don't** use `left`/`right`, `margin-left`, `padding-right` or physical text alignment inside `.fd`.
- **Don't** let `.fd` rules or variables leak outside the scope, and don't give the staff screens a second visual language: new staff components use the `--c-*` roles and the `.fda-` prefix.

## Staff screens (Operate)

Extension of the system above, built from the same roles. Layout: a rail at the inline start on screens 920px and wider (272px, white surface, nav with icons, language switch and sign out at its foot), and on phones a sticky top bar with the venue, language switch and sign out, plus a scrolling tab bar for navigation that keeps the current tab in view. Page titles are 34px (30px on phones) at weight 900; card titles 22px; ticket titles 20px; stat numbers 22px; all other text follows the customer ramp.

Components: ticket card (name and order number, status pill, table chip, items with quantities, a soft payment block with the payment pill and receipt toggle, one filled action); filter chips with counts (wrap instead of scrolling, so the urgent ones are never hidden); stat strip (one white bar, three figures); menu rows with thumbnail, availability pill and actions; option fieldsets; QR sheet cards; login card. Status pills tint from the roles: new and payment check in amber, accepted and preparing in pink, ready and verified in green, cancelled and rejected in crimson. The table chip is a pink tint, never a solid fill, so the ticket has exactly one filled pink element, the next action.

Rules for staff screens: staff text comes from `lib/i18n-admin.ts` (one language per screen, Arabic typed against English); order and table numbers never use thousands separators; destructive or customer-affecting actions (cancel, reject payment, stop taking orders, disable a person, delete an item) ask first; orders store the Arabic names of the payment method and options at the time of the order so an Arabic ticket never shows English in the middle of a line.
