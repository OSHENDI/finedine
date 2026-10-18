"use client";

import { FormEvent } from "react";
import { useAdmin } from "@/components/admin/AdminFrame";
import PageHead from "@/components/admin/PageHead";
import { useAdminAction } from "@/components/admin/useAdminAction";
import Icon from "@/components/ui/Icon";
import { localizeTable } from "@/lib/i18n";

type Code = { id: string; label: string; tableLabel: string | null; kind: string; isActive: boolean };

export default function TablesBoard({ codes, venueName, canEdit }: { codes: Code[]; venueName: string; canEdit: boolean }) {
  const { t, lang } = useAdmin();
  const { busy, message, setMessage, run } = useAdminAction();

  async function addTables(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const count = Number(data.get("count"));
    const single = String(data.get("label") ?? "").trim();
    const labels = single ? [single] : Number.isInteger(count) && count > 0 ? Array.from({ length: Math.min(count, 100) }, (_, index) => `Table ${index + 1}`) : [];
    if (!labels.length) return setMessage(t.tables.enterName);
    const result = await run("/api/admin/tables", "POST", { labels });
    if (result.ok) form.reset();
  }

  const branchCode = codes.find((code) => code.kind === "branch");
  const tables = codes.filter((code) => code.kind === "table");
  const printable = [...(branchCode ? [branchCode] : []), ...tables.filter((table) => table.isActive)];

  return (
    <>
      <div className="fda-noprint">
        <PageHead page="tables">
          <button className="fda-btn" disabled={!printable.length} onClick={() => window.print()} type="button">
            <Icon name="printer" size={20} />
            {t.tables.print}
          </button>
        </PageHead>
      </div>

      <div className="fda-stack">
        {message ? (
          <p className="fda-error fda-noprint" role="alert">
            {message}
          </p>
        ) : null}

        <div className="fda-grid fda-noprint">
          {canEdit ? (
            <form className="fda-card fda-form" onSubmit={addTables}>
              <h2>{t.tables.add}</h2>
              <p className="fda-muted">{t.tables.help}</p>
              <label>
                {t.tables.count}
                <input className="fd-input" max={100} min={1} name="count" type="number" />
              </label>
              <label>
                {t.tables.oneName}
                <input className="fd-input" maxLength={40} name="label" placeholder="Terrace 4" />
              </label>
              <div>
                <button className="fda-btn" disabled={busy}>
                  {t.tables.create}
                </button>
              </div>
            </form>
          ) : null}

          {tables.length ? (
            <section className="fda-card">
              <h2>{t.tables.list}</h2>
              <div className="fda-scroll">
                <table className="fda-table">
                  <tbody>
                    {tables.map((table) => (
                      <tr key={table.id}>
                        <td>
                          <strong>{localizeTable(table.label, lang)}</strong>
                        </td>
                        <td>
                          <span className="fda-pill" data-tone={table.isActive ? "ready" : "cancelled"}>
                            {table.isActive ? t.active : t.disabled}
                          </span>
                        </td>
                        <td>
                          {canEdit ? (
                            <button className="fda-btn fda-btn--soft" disabled={busy} onClick={() => run(`/api/admin/tables/${table.id}`, "PATCH", { isActive: !table.isActive })} type="button">
                              {table.isActive ? t.disable : t.enable}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>

        <section aria-label={t.tables.title} className="fda-qr-sheet">
          {printable.map((code) => (
            <figure className="fda-qr-card" key={code.id}>
              <img alt="" height={200} src={`/api/admin/qr/${code.id}`} width={200} />
              <figcaption>
                <strong>{code.kind === "table" ? localizeTable(code.label, lang) : venueName}</strong>
                <br />
                <span>{code.kind === "table" ? venueName : t.tables.scanToSee}</span>
                <br />
                <span>{t.tables.scanToOrder}</span>
              </figcaption>
            </figure>
          ))}
        </section>
      </div>
    </>
  );
}
