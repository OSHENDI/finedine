---
version: 1
slug: "components-menu-menuapp-tsx"
primary_target: "components/menu/MenuApp.tsx"
related_targets: ["components/menu/CartScreen.tsx","components/menu/CheckoutScreen.tsx","components/OrderProgressClient.tsx"]
---

# Customer ordering surface

Scope: the customer screens opened from a table or branch QR code: menu, item sheet, cart, checkout, order status. Visitor mode: Operate (the visitor completes a task: order and pay, then wait). Pinned by the owner: palette, Thmanyah Sans, page structure from four reference screens, separate Arabic and English with a language switch, no card payment. Not pinned: everything else.

Audience and job: a customer at a table, one hand on the phone, often in dim light, who wants to order in under a minute and know when it is ready. Constraints: honest copy (no tax, no waiter call, no ETA, because none exist), payment verified by staff before the kitchen starts, Arabic right to left as a first-class mode.

Unresolved: whether a table shares one open bill; whether the pink-and-amber look is this venue's theme or the product's identity.

## Direction contract

THESIS: a warm ice-cream-parlour ordering counter. The menu is the first thing on screen and the whole job is add, review, pay, wait. It refuses the marketing banner, the language-mixed bilingual line, and the stock card grid.

OWN-WORLD: cream ground (#faf7ea), white rows with soft lifted shadows, cherry-pink (#cd3266) as the only action colour, amber (#e3971c) for "current", crimson gradient (pink to #8c1c35) for the two hero cards, Thmanyah Sans from light to black, pill buttons and 22px rows, outline icons on one 1.8 stroke. A dark set (olive-black ground) follows the phone's setting.

STORY: the customer understands what each item is and costs, adds without friction, sees one cart and one total, knows exactly where to send money and that staff confirm it, and then sees a live five-step status ending in a clear "ready" moment.

FIRST VIEWPORT: top bar with cone logo, venue name, language switch and cart button; the heading "Our menu" with category and count; a search field; item rows with photo at the start edge, name, two-line description, price in pink and a round add button at the end edge; a floating dock at the bottom with the cart bar above a scrollable category pill bar.

FORM: item list with bottom dock (native dialog sheet for options, full screens for cart, checkout and status); position one of the owner's reference structure; seed: none (unavailable).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
