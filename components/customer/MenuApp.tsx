"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { orderCookie, writeCookie, type CartSnapshot } from "@/lib/cart-cookie";
import { formatPrice, itemCount, langCookie, localized, localizeTable, numberFormat, text, type Lang } from "@/lib/i18n";
import type { BranchView, CategoryView, PaymentMethodView, ProductView } from "@/types/menu";
import IconButton from "@/components/ui/IconButton";
import Splash from "./Splash";
import CartScreen from "./CartScreen";
import CategoryWheel from "./CategoryWheel";
import CheckoutScreen from "./CheckoutScreen";
import ConcaveCarousel from "./ConcaveCarousel";
import Icon from "@/components/ui/Icon";
import ItemDetail from "./ItemDetail";
import ProductRow from "./ProductRow";
import TrackScreen, { type TrackedOrder } from "./TrackScreen";
import { plainKey, useCart } from "./useCart";

type Screen = "browse" | "cart" | "checkout" | "track";
type RouteState = { fd?: Screen; item?: string };
type Tracked = { token: string; order: TrackedOrder };

const HOME = "home";

// The whole customer experience is one page. Moving between home, a category, an item, the order,
// checkout and the order status only changes state (and the history entry), so nothing reloads and
// the phone's back button steps back through the same screens.
export default function MenuApp({
  branch,
  categories,
  popularIds,
  paymentMethods,
  qrToken,
  tableLabel,
  initialLang,
  initialCart,
  initialActive,
  initialTrack
}: {
  branch: BranchView;
  categories: CategoryView[];
  popularIds: string[];
  paymentMethods: PaymentMethodView[];
  qrToken?: string | null;
  tableLabel: string | null;
  initialLang: Lang;
  initialCart: CartSnapshot;
  initialActive: string | null;
  initialTrack?: Tracked | null;
}) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [screen, setScreen] = useState<Screen>(initialTrack ? "track" : "browse");
  const [track, setTrack] = useState<Tracked | null>(initialTrack ?? null);
  const [item, setItem] = useState<ProductView | null>(null);
  const [itemOpen, setItemOpen] = useState(false);
  const [placeholder, setPlaceholder] = useState<string | null>(null);
  // The "your order is in progress" notice appears only once the server confirms that order is still running.
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const t = text(lang);
  const ordersOpen = branch.isOpen;

  const products = useMemo(() => new Map(categories.flatMap((category) => category.products).map((product) => [product.id, product])), [categories]);
  const cart = useCart(branch.slug, products, lang, initialCart);
  const shownCategories = useMemo(() => categories.filter((category) => category.products.length > 0), [categories]);
  const popular = useMemo(() => popularIds.flatMap((id) => products.get(id) ?? []), [popularIds, products]);
  const hasHome = popular.length > 0;
  const [view, setView] = useState<string>(hasHome ? HOME : (shownCategories[0]?.id ?? HOME));

  const itemRef = useRef<ProductView | null>(null);
  itemRef.current = item;
  const homeUrl = useRef(`/m/${branch.slug}`);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!initialTrack) homeUrl.current = `${window.location.pathname}${window.location.search}`;
  }, [initialTrack]);

  // The page's own language and direction follow the switch (screen readers, browser UI).
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  // Offer "track your order" only while that order really exists and is still running.
  useEffect(() => {
    if (!initialActive) return;
    let cancelled = false;
    fetch(`/api/public/orders/${initialActive}`, { cache: "no-store" })
      .then(async (response) => {
        const progress = response.ok ? ((await response.json()) as { progress: string }).progress : null;
        if (cancelled) return;
        if (!progress || progress === "done" || progress === "cancelled") writeCookie(orderCookie(branch.slug), null);
        else setActiveToken(initialActive);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [initialActive, branch.slug]);

  // History entries carry the screen and the open item: back closes the item, then the order, and so on.
  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      const state = event.state as RouteState | null;
      const nextItem = state?.item ? (products.get(state.item) ?? null) : null;
      setScreen(state?.fd ?? (initialTrack ? "track" : "browse"));
      if (nextItem) {
        setItem(nextItem);
        setItemOpen(true);
      } else setItemOpen(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [products, initialTrack]);

  const go = useCallback((next: Screen) => {
    window.history.pushState({ fd: next } satisfies RouteState, "");
    setScreen(next);
    window.scrollTo(0, 0);
  }, []);

  const back = useCallback(() => {
    if ((window.history.state as RouteState | null)?.fd) window.history.back();
    else setScreen("browse");
  }, []);

  const openItem = useCallback((product: ProductView) => {
    opener.current = document.activeElement as HTMLElement | null;
    setPlaceholder(document.querySelector<HTMLImageElement>(`[data-photo="${product.id}"] img`)?.currentSrc ?? null);
    window.history.pushState({ fd: "browse", item: product.id } satisfies RouteState, "");
    setItem(product);
    setItemOpen(true);
  }, []);

  const closeItem = useCallback(() => {
    if ((window.history.state as RouteState | null)?.item) window.history.back();
    else setItemOpen(false);
  }, []);

  const itemGone = useCallback(() => {
    setItem(null);
    opener.current?.focus({ preventScroll: true });
  }, []);

  function goHome() {
    if (screen !== "browse") {
      window.history.pushState({ fd: "browse" } satisfies RouteState, "", homeUrl.current);
      setScreen("browse");
    }
    setView(hasHome ? HOME : (shownCategories[0]?.id ?? HOME));
    window.scrollTo({ top: 0 });
  }

  function switchLanguage() {
    const next: Lang = lang === "ar" ? "en" : "ar";
    setLang(next);
    document.cookie = `${langCookie}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  function selectView(id: string) {
    setView(id);
    window.scrollTo({ top: 0 });
  }

  const step = useCallback(
    (product: ProductView, delta: number) => {
      if (delta > 0) cart.add({ productId: product.id, addOnIds: [], quantity: 1 });
      else cart.changeQuantity(plainKey(product.id), -1);
    },
    [cart]
  );

  async function handleSuccess(token: string) {
    writeCookie(orderCookie(branch.slug), token);
    try {
      const response = await fetch(`/api/public/orders/${token}`, { cache: "no-store" });
      if (!response.ok) throw new Error("status");
      const order = (await response.json()) as TrackedOrder;
      setTrack({ token, order });
      // The checkout entry becomes the order entry, so back from here goes to the (now empty) order.
      window.history.replaceState({ fd: "track" } satisfies RouteState, "", `/order/${token}`);
      setScreen("track");
      cart.clear();
      window.scrollTo(0, 0);
    } catch {
      cart.clear();
      window.location.assign(`/order/${token}`);
    }
  }

  async function openActive(token: string) {
    try {
      const response = await fetch(`/api/public/orders/${token}`, { cache: "no-store" });
      if (!response.ok) throw new Error("status");
      setTrack({ token, order: (await response.json()) as TrackedOrder });
      window.history.pushState({ fd: "track" } satisfies RouteState, "", `/order/${token}`);
      setScreen("track");
      window.scrollTo(0, 0);
    } catch {
      window.location.assign(`/order/${token}`);
    }
  }

  function leaveTrack() {
    window.history.pushState({ fd: "browse" } satisfies RouteState, "", homeUrl.current);
    setScreen("browse");
    window.scrollTo(0, 0);
  }

  const wheelItems = useMemo(
    () => [
      ...(hasHome ? [{ id: HOME, label: t.home }] : []),
      ...shownCategories.map((category) => ({ id: category.id, label: localized(lang, category.nameEn, category.nameAr) }))
    ],
    [hasHome, shownCategories, lang, t.home]
  );

  const activeCategory = shownCategories.find((category) => category.id === view);
  const knownTable = track?.order.tableLabel ?? tableLabel;
  const shownTable = knownTable ? localizeTable(knownTable, lang) : null;
  const venue = localized(lang, branch.name, branch.nameAr);
  const browsing = screen === "browse";
  const count = numberFormat(lang).format(cart.count);
  const showOrderBar = browsing && cart.count > 0 && ordersOpen;

  return (
    <>
      <Splash />
      <div className="fd" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        <div className={`fd-app${browsing && view === HOME && hasHome ? " fd-app--home" : ""}`} data-order={showOrderBar}>
          <div className="fd-contents" inert={itemOpen}>
            <header className="fd-top">
              <div className="fd-top-start">
                {browsing || screen === "track" ? (
                  <button className="fd-lang" lang={lang === "ar" ? "en" : "ar"} onClick={switchLanguage} type="button">
                    <Icon name="globe" size={18} />
                    {t.switchTo}
                  </button>
                ) : (
                  <IconButton className="fd-bare" label={t.back} onClick={back}>
                    <Icon className="fd-flip" name="back" />
                  </IconButton>
                )}
              </div>
              <button aria-label={venue} className="fd-brand" onClick={goHome} type="button">
                <img alt={venue} decoding="async" fetchPriority="high" height={52} src="/logo.png" width={46} />
              </button>
              <div className="fd-top-end">
                {shownTable && screen !== "track" ? <span className="fd-table">{shownTable}</span> : null}
                {browsing && cart.count > 0 ? (
                  <IconButton className="fd-bare" label={`${t.cart} (${count})`} onClick={() => go("cart")}>
                    <Icon name="order" />
                    <span className="fd-badge">{count}</span>
                  </IconButton>
                ) : null}
              </div>
            </header>

            {browsing ? (
              <>
                {ordersOpen ? null : <p className="fd-notice">{t.closed}</p>}
                {activeToken ? (
                  <p className="fd-notice">
                    <span>{t.activeOrder}</span>
                    <button className="fd-link fd-link--btn" onClick={() => void openActive(activeToken)} type="button">
                      {t.track}
                    </button>
                  </p>
                ) : null}

                {view === HOME && hasHome ? (
                  <ConcaveCarousel
                    currency={branch.currency}
                    key={`carousel-${lang}`}
                    lang={lang}
                    onOpen={openItem}
                    onStep={step}
                    ordersOpen={ordersOpen}
                    paused={itemOpen}
                    products={popular}
                    quantities={cart.quantities}
                    title={t.homeTitle}
                  />
                ) : (
                  <main className="fd-page" key={view}>
                    <div className="fd-page-title fd-enter">
                      <h2>{activeCategory ? localized(lang, activeCategory.nameEn, activeCategory.nameAr) : t.home}</h2>
                      <p>{itemCount(activeCategory?.products.length ?? 0, lang)}</p>
                    </div>
                    {activeCategory && activeCategory.products.length ? (
                      <ul className="fd-list">
                        {activeCategory.products.map((product, index) => (
                          <ProductRow
                            currency={branch.currency}
                            index={index}
                            key={product.id}
                            lang={lang}
                            onOpen={openItem}
                            onStep={step}
                            ordersOpen={ordersOpen}
                            product={product}
                            quantity={cart.quantities.get(product.id) ?? 0}
                          />
                        ))}
                      </ul>
                    ) : (
                      <p className="fd-empty">{t.emptyCategory}</p>
                    )}
                  </main>
                )}

                {showOrderBar ? (
                  <button className="fd-orderbar fd-live" onClick={() => go("cart")} type="button">
                    <span className="fd-orderbar-main">
                      {t.viewOrder}
                      <Icon className="fd-flip" name="arrow" size={20} />
                    </span>
                    <span className="fd-orderbar-meta">
                      <small>{itemCount(cart.count, lang)}</small>
                      <strong>{formatPrice(cart.totalCents, branch.currency, lang)}</strong>
                    </span>
                  </button>
                ) : null}
                <CategoryWheel hint={t.swipeHint} items={wheelItems} key={`wheel-${lang}`} label={t.categories} onSelect={selectView} value={view} />
              </>
            ) : null}

            {screen === "cart" ? (
              <CartScreen
                currency={branch.currency}
                entries={cart.entries}
                lang={lang}
                note={cart.note}
                onBack={back}
                onClear={cart.clear}
                onContinue={() => go("checkout")}
                onNote={cart.setNote}
                onQuantity={cart.changeQuantity}
                totalCents={cart.totalCents}
              />
            ) : null}

            {screen === "checkout" ? (
              <CheckoutScreen
                branch={branch}
                entries={cart.entries}
                lang={lang}
                note={cart.note}
                onBack={back}
                onSuccess={handleSuccess}
                paymentMethods={paymentMethods}
                qrToken={qrToken}
                tableLabel={tableLabel}
                totalCents={cart.totalCents}
              />
            ) : null}

            {screen === "track" && track ? <TrackScreen branchSlug={branch.slug} initial={track.order} key={track.token} lang={lang} onMenu={leaveTrack} token={track.token} /> : null}
          </div>

          {item ? (
            <ItemDetail
              canOrder={ordersOpen}
              currency={branch.currency}
              inOrder={cart.quantities.get(item.id) ?? 0}
              key={item.id}
              lang={lang}
              onAdd={(line) => {
                cart.add(line);
                closeItem();
              }}
              onClose={closeItem}
              onExited={itemGone}
              open={itemOpen}
              placeholder={placeholder}
              product={item}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}

