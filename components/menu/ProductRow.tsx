"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import IconButton from "@/components/ui/IconButton";
import Stepper from "@/components/ui/Stepper";
import { formatPrice, localized, numberFormat, text, type Lang } from "@/lib/i18n";
import type { ProductView } from "@/types/menu";
import Icon from "./Icon";

export function ProductPhoto({ product, sizes, priority }: { product: ProductView; sizes: string; priority?: boolean }) {
  if (!product.imageUrl) {
    return (
      <span aria-hidden="true" className="fd-photo fd-photo--empty">
        <Icon name="cone" size={32} />
      </span>
    );
  }
  return <Image alt="" className="fd-photo" draggable={false} fill priority={priority} sizes={sizes} src={product.imageUrl} unoptimized={product.imageUrl.startsWith("/api/media/")} />;
}

// What a product needs to be added in one tap: no size to choose and no extras to offer.
export const isPlain = (product: ProductView) => product.variants.length === 0 && product.addOns.length === 0;

// The control that adds an item or, once it is in the order, changes how many. Used by the list
// rows and by the home carousel so both behave the same.
export function ItemControls({
  product,
  lang,
  quantity,
  canOrder,
  onOpen,
  onStep
}: {
  product: ProductView;
  lang: Lang;
  quantity: number;
  canOrder: boolean;
  onOpen: (product: ProductView) => void;
  onStep: (product: ProductView, delta: number) => void;
}) {
  const t = text(lang);
  const [done, setDone] = useState(false);
  const name = localized(lang, product.nameEn, product.nameAr);
  const number = numberFormat(lang);

  if (!product.isAvailable) return <span className="fd-sold">{t.soldOut}</span>;

  if (isPlain(product) && quantity > 0) {
    return <Stepper disabled={!canOrder} label={name} lang={lang} onChange={(delta) => onStep(product, delta)} quantity={quantity} size="sm" />;
  }

  function add() {
    if (!isPlain(product)) return onOpen(product);
    onStep(product, 1);
    setDone(true);
    window.setTimeout(() => setDone(false), 700);
  }

  // The count of an item that has sizes or extras sits on the add button as a badge, so the row never changes shape.
  return (
    <span className="fd-add-wrap" onClick={(event) => event.stopPropagation()}>
      <IconButton data-done={done} disabled={!canOrder} label={`${canOrder ? t.add : t.closedLabel}: ${name}`} onClick={add} tone="add">
        <Icon name={done ? "check" : "plus"} />
      </IconButton>
      {quantity > 0 ? (
        <span aria-label={`${t.inOrder}: ${number.format(quantity)}`} className="fd-count">
          {number.format(quantity)}
        </span>
      ) : null}
    </span>
  );
}

export default function ProductRow({
  product,
  index,
  lang,
  currency,
  ordersOpen,
  quantity,
  onOpen,
  onStep
}: {
  product: ProductView;
  index: number;
  lang: Lang;
  currency: string;
  ordersOpen: boolean;
  quantity: number;
  onOpen: (product: ProductView) => void;
  onStep: (product: ProductView, delta: number) => void;
}) {
  const name = localized(lang, product.nameEn, product.nameAr);

  // The whole row opens the item; the buttons inside are there for keyboards and screen readers.
  return (
    <li className="fd-row" data-soldout={!product.isAvailable} onClick={() => onOpen(product)} style={{ "--i": index } as CSSProperties}>
      <span className="fd-row-photo" data-photo={product.id}>
        <ProductPhoto product={product} sizes="76px" />
      </span>
      <div className="fd-row-body">
        <button className="fd-name" type="button">
          {name}
        </button>
        <div className="fd-row-foot">
          {product.isAvailable ? <span className="fd-price">{formatPrice(product.priceCents, currency, lang)}</span> : <span />}
          <ItemControls canOrder={ordersOpen} lang={lang} onOpen={onOpen} onStep={onStep} product={product} quantity={quantity} />
        </div>
      </div>
    </li>
  );
}
