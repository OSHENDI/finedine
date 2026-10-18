"use client";

import Image from "next/image";
import { FormEvent, useRef, useState } from "react";
import Icon from "@/components/menu/Icon";
import { shrinkImage } from "@/lib/image";
import { localized } from "@/lib/i18n";
import { fillText } from "@/lib/i18n-admin";
import type { ProductView } from "@/types/menu";
import { useAdmin } from "./AdminFrame";
import PageHead from "./PageHead";
import { useAdminAction } from "./useAdminAction";

type Item = ProductView & { labels?: string; isFeatured?: boolean };
type Category = { id: string; nameEn: string; nameAr: string; isActive: boolean; items: Item[] };

type Draft = {
  id?: string;
  categoryId: string;
  nameEn: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  imageUrl: string;
  price: string;
  labels: string;
  isFeatured: boolean;
  isAvailable: boolean;
  variants: Array<{ id?: string; name: string; nameAr: string; delta: string }>;
  addOns: Array<{ id?: string; name: string; nameAr: string; price: string }>;
};

const toCents = (value: string) => Math.round(Number.parseFloat(value || "0") * 100);
const toUnits = (cents: number) => (cents / 100).toFixed(2);

function emptyDraft(categoryId: string): Draft {
  return { categoryId, nameEn: "", nameAr: "", description: "", descriptionAr: "", imageUrl: "", price: "", labels: "", isFeatured: false, isAvailable: true, variants: [], addOns: [] };
}

function draftFrom(item: Item): Draft {
  return {
    id: item.id,
    categoryId: item.categoryId,
    nameEn: item.nameEn,
    nameAr: item.nameAr,
    description: item.description,
    descriptionAr: item.descriptionAr ?? "",
    imageUrl: item.imageUrl,
    price: toUnits(item.priceCents),
    labels: item.labels ?? "",
    isFeatured: item.isFeatured ?? false,
    isAvailable: item.isAvailable,
    variants: item.variants.map((variant) => ({ id: variant.id, name: variant.name, nameAr: variant.nameAr ?? "", delta: toUnits(variant.priceDelta) })),
    addOns: item.addOns.map((addOn) => ({ id: addOn.id, name: addOn.name, nameAr: addOn.nameAr ?? "", price: toUnits(addOn.priceCents) }))
  };
}

export default function MenuEditor({ categories, currency, canEdit }: { categories: Category[]; currency: string; canEdit: boolean }) {
  const { t, lang, money } = useAdmin();
  const { busy, message, setMessage, run } = useAdminAction();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const editorRef = useRef<HTMLFormElement>(null);

  function openDraft(next: Draft) {
    setDraft(next);
    setMessage(null);
    window.setTimeout(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    const form = new FormData();
    form.set("file", await shrinkImage(file, 900));
    const result = await run("/api/admin/media", "POST", form, { json: false });
    if (result.ok) change("imageUrl", result.data?.url ?? "");
  }

  async function saveDraft(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const body = {
      categoryId: draft.categoryId,
      nameEn: draft.nameEn,
      nameAr: draft.nameAr,
      description: draft.description,
      descriptionAr: draft.descriptionAr,
      imageUrl: draft.imageUrl,
      priceCents: toCents(draft.price),
      labels: draft.labels,
      isFeatured: draft.isFeatured,
      isAvailable: draft.isAvailable,
      variants: draft.variants.map((variant) => ({ id: variant.id, name: variant.name, nameAr: variant.nameAr, priceDelta: toCents(variant.delta) })),
      addOns: draft.addOns.map((addOn) => ({ id: addOn.id, name: addOn.name, nameAr: addOn.nameAr, priceCents: toCents(addOn.price) }))
    };
    const result = await run(draft.id ? `/api/admin/items/${draft.id}` : "/api/admin/items", draft.id ? "PUT" : "POST", body);
    if (result.ok) setDraft(null);
  }

  async function removeItem(item: Item) {
    if (!window.confirm(fillText(t.menu.confirmDelete, { name: localized(lang, item.nameEn, item.nameAr) }))) return;
    const result = await run(`/api/admin/items/${item.id}`, "DELETE");
    if (result.ok) setDraft(null);
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const result = await run("/api/admin/categories", "POST", { nameEn: data.get("nameEn"), nameAr: data.get("nameAr") });
    if (result.ok) form.reset();
  }

  async function renameCategory(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await run(`/api/admin/categories/${id}`, "PATCH", { nameEn: data.get("nameEn"), nameAr: data.get("nameAr") });
    if (result.ok) setRenaming(null);
  }

  const updateVariant = (index: number, patch: Partial<Draft["variants"][number]>) =>
    draft && change("variants", draft.variants.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const updateAddOn = (index: number, patch: Partial<Draft["addOns"][number]>) =>
    draft && change("addOns", draft.addOns.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <>
      <PageHead page="menu" />
      <div className="fda-stack">
        {message ? (
          <p className="fda-error" role="alert">
            {message}
          </p>
        ) : null}

        {draft ? (
          <form className="fda-card fda-form" onSubmit={saveDraft} ref={editorRef} style={{ maxWidth: 860 }}>
            <h2>{draft.id ? t.menu.editItem : t.menu.newItem}</h2>
            <div className="fda-row-fields">
              <label>
                {t.menu.nameEn}
                <input className="fd-input" maxLength={24} onChange={(event) => change("nameEn", event.target.value)} required value={draft.nameEn} />
              </label>
              <label>
                {t.menu.nameAr}
                <input className="fd-input" dir="rtl" maxLength={24} onChange={(event) => change("nameAr", event.target.value)} value={draft.nameAr} />
              </label>
              <label>
                {t.menu.price} ({currency})
                <input className="fd-input" dir="ltr" min="0.01" onChange={(event) => change("price", event.target.value)} required step="0.01" type="number" value={draft.price} />
              </label>
              <label>
                {t.menu.category}
                <select className="fd-input" onChange={(event) => change("categoryId", event.target.value)} value={draft.categoryId}>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {localized(lang, category.nameEn, category.nameAr)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="fda-row-fields">
              <label>
                {t.menu.descEn}
                <textarea className="fd-input" maxLength={400} onChange={(event) => change("description", event.target.value)} value={draft.description} />
              </label>
              <label>
                {t.menu.descAr}
                <textarea className="fd-input" dir="rtl" maxLength={400} onChange={(event) => change("descriptionAr", event.target.value)} value={draft.descriptionAr} />
              </label>
            </div>
            <label>
              {t.menu.labels}
              <input className="fd-input" maxLength={120} onChange={(event) => change("labels", event.target.value)} value={draft.labels} />
            </label>

            <div className="fda-photo-row">
              {draft.imageUrl ? <img alt="" className="fda-photo-preview" height={96} src={draft.imageUrl} width={96} /> : <div className="fda-photo-preview">{t.menu.noPhoto}</div>}
              <label className="fda-btn fda-btn--line">
                <Icon name="upload" size={20} />
                {draft.imageUrl ? t.menu.replacePhoto : t.menu.uploadPhoto}
                <input accept="image/jpeg,image/png,image/webp" className="fd-sr" onChange={(event) => void upload(event.target.files?.[0])} type="file" />
              </label>
              {draft.imageUrl ? (
                <button className="fda-btn fda-btn--soft" onClick={() => change("imageUrl", "")} type="button">
                  {t.menu.removePhoto}
                </button>
              ) : null}
            </div>

            <fieldset className="fda-options">
              <legend>{t.menu.sizes}</legend>
              {draft.variants.map((variant, index) => (
                <div className="fda-option" key={variant.id ?? `new-${index}`}>
                  <input aria-label={t.menu.variantEn} className="fd-input" maxLength={80} onChange={(event) => updateVariant(index, { name: event.target.value })} placeholder="Large" required value={variant.name} />
                  <input aria-label={t.menu.variantAr} className="fd-input" dir="rtl" maxLength={80} onChange={(event) => updateVariant(index, { nameAr: event.target.value })} placeholder="كبير" value={variant.nameAr} />
                  <input aria-label={t.menu.priceDiff} className="fd-input" dir="ltr" onChange={(event) => updateVariant(index, { delta: event.target.value })} step="0.01" type="number" value={variant.delta} />
                  <button className="fda-btn fda-btn--soft" onClick={() => change("variants", draft.variants.filter((_, i) => i !== index))} type="button">
                    {t.remove}
                  </button>
                </div>
              ))}
              <div>
                <button className="fda-btn fda-btn--soft" onClick={() => change("variants", [...draft.variants, { name: "", nameAr: "", delta: "0.00" }])} type="button">
                  <Icon name="plus" size={18} />
                  {t.menu.addVariant}
                </button>
              </div>
            </fieldset>

            <fieldset className="fda-options">
              <legend>{t.menu.addOns}</legend>
              {draft.addOns.map((addOn, index) => (
                <div className="fda-option" key={addOn.id ?? `new-${index}`}>
                  <input aria-label={t.menu.addOnEn} className="fd-input" maxLength={80} onChange={(event) => updateAddOn(index, { name: event.target.value })} placeholder="Extra shot" required value={addOn.name} />
                  <input aria-label={t.menu.addOnAr} className="fd-input" dir="rtl" maxLength={80} onChange={(event) => updateAddOn(index, { nameAr: event.target.value })} placeholder="إضافة" value={addOn.nameAr} />
                  <input aria-label={t.menu.addOnPrice} className="fd-input" dir="ltr" min="0" onChange={(event) => updateAddOn(index, { price: event.target.value })} step="0.01" type="number" value={addOn.price} />
                  <button className="fda-btn fda-btn--soft" onClick={() => change("addOns", draft.addOns.filter((_, i) => i !== index))} type="button">
                    {t.remove}
                  </button>
                </div>
              ))}
              <div>
                <button className="fda-btn fda-btn--soft" onClick={() => change("addOns", [...draft.addOns, { name: "", nameAr: "", price: "0.00" }])} type="button">
                  <Icon name="plus" size={18} />
                  {t.menu.addAddOn}
                </button>
              </div>
            </fieldset>

            <div className="fda-actions">
              <label className="fda-check">
                <input checked={draft.isAvailable} onChange={(event) => change("isAvailable", event.target.checked)} type="checkbox" /> {t.menu.available}
              </label>
              <label className="fda-check">
                <input checked={draft.isFeatured} onChange={(event) => change("isFeatured", event.target.checked)} type="checkbox" /> {t.menu.featured}
              </label>
            </div>
            <div className="fda-actions">
              <button className="fda-btn" disabled={busy}>
                {t.menu.saveItem}
              </button>
              <button className="fda-btn fda-btn--soft" onClick={() => setDraft(null)} type="button">
                {t.cancel}
              </button>
            </div>
          </form>
        ) : null}

        {categories.map((category) => (
          <section className="fda-card" key={category.id}>
            <div className="fda-actions" style={{ justifyContent: "space-between" }}>
              <div>
                <h2>{localized(lang, category.nameEn, category.nameAr)}</h2>
                {category.isActive ? null : <p className="fda-muted">{t.menu.hidden}</p>}
              </div>
              {canEdit ? (
                <div className="fda-actions">
                  <button className="fda-btn fda-btn--soft" disabled={busy} onClick={() => setRenaming(renaming === category.id ? null : category.id)} type="button">
                    {t.menu.rename}
                  </button>
                  <button className="fda-btn fda-btn--soft" disabled={busy} onClick={() => run(`/api/admin/categories/${category.id}`, "PATCH", { isActive: !category.isActive })} type="button">
                    {category.isActive ? t.menu.hide : t.menu.show}
                  </button>
                  <button className="fda-btn" onClick={() => openDraft(emptyDraft(category.id))} type="button">
                    <Icon name="plus" size={18} />
                    {t.menu.addItem}
                  </button>
                </div>
              ) : null}
            </div>

            {renaming === category.id ? (
              <form className="fda-row-fields" onSubmit={(event) => renameCategory(event, category.id)}>
                <input aria-label={t.menu.nameEn} className="fd-input" defaultValue={category.nameEn} maxLength={80} name="nameEn" required />
                <input aria-label={t.menu.nameAr} className="fd-input" defaultValue={category.nameAr} dir="rtl" maxLength={80} name="nameAr" />
                <div>
                  <button className="fda-btn" disabled={busy}>
                    {t.save}
                  </button>
                </div>
              </form>
            ) : null}

            {category.items.length === 0 ? <p className="fda-muted">{t.menu.noItems}</p> : null}
            <ul className="fda-menu-rows">
              {category.items.map((item) => (
                <li key={item.id}>
                  {item.imageUrl ? (
                    <Image alt="" className="fda-thumb" height={104} src={item.imageUrl} unoptimized={item.imageUrl.startsWith("/api/media/")} width={104} />
                  ) : (
                    <span aria-hidden="true" className="fda-thumb" />
                  )}
                  <div>
                    <strong>{localized(lang, item.nameEn, item.nameAr)}</strong>
                    <div className="fda-muted">
                      {money(item.priceCents, currency)}
                      {item.variants.length ? (
                        <>
                          <span className="fd-sep" />
                          {fillText(t.menu.variants, { n: item.variants.length })}
                        </>
                      ) : null}
                      {item.addOns.length ? (
                        <>
                          <span className="fd-sep" />
                          {fillText(t.menu.addOnsCount, { n: item.addOns.length })}
                        </>
                      ) : null}
                    </div>
                  </div>
                  <span className="fda-pill" data-tone={item.isAvailable ? "ready" : "cancelled"}>
                    {item.isAvailable ? t.menu.available : t.menu.soldOut}
                  </span>
                  <div className="fda-actions">
                    <button
                      className={item.isAvailable ? "fda-btn fda-btn--line" : "fda-btn"}
                      disabled={busy}
                      onClick={() => run(`/api/admin/items/${item.id}`, "PATCH", { isAvailable: !item.isAvailable })}
                      type="button"
                    >
                      {item.isAvailable ? t.menu.markSoldOut : t.menu.markAvailable}
                    </button>
                    {canEdit ? (
                      <>
                        <button className="fda-btn fda-btn--soft" onClick={() => openDraft(draftFrom(item))} type="button">
                          <Icon name="edit" size={18} />
                          {t.edit}
                        </button>
                        <button className="fda-btn fda-btn--soft" disabled={busy} onClick={() => removeItem(item)} type="button">
                          {t.delete}
                        </button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {canEdit ? (
          <form className="fda-card fda-form" onSubmit={addCategory}>
            <h2>{t.menu.addCategory}</h2>
            <div className="fda-row-fields">
              <label>
                {t.menu.nameEn}
                <input className="fd-input" maxLength={80} name="nameEn" required />
              </label>
              <label>
                {t.menu.nameAr}
                <input className="fd-input" dir="rtl" maxLength={80} name="nameAr" />
              </label>
            </div>
            <div>
              <button className="fda-btn" disabled={busy}>
                {t.add}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </>
  );
}
