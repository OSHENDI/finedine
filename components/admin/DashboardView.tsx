"use client";

import Image from "next/image";
import Link from "next/link";
import { useAdmin } from "./AdminFrame";
import PageHead from "./PageHead";

type Recent = { id: string; number: number; name: string; totalCents: number; status: string };

export default function DashboardView({
  currency,
  slug,
  todayCount,
  todayCents,
  openCount,
  recent
}: {
  currency: string;
  slug: string;
  todayCount: number;
  todayCents: number;
  openCount: number;
  recent: Recent[];
}) {
  const { t, money, number, plain } = useAdmin();

  return (
    <>
      <PageHead page="dashboard">
        <Link className="fda-btn" href="/admin/orders">
          {t.dashboard.manage}
        </Link>
      </PageHead>

      <div className="fda-stack">
        <section className="fda-stats">
          <div className="fda-stat">
            <span>{t.dashboard.todayOrders}</span>
            <strong>{number(todayCount)}</strong>
          </div>
          <div className="fda-stat">
            <span>{t.dashboard.todayTotal}</span>
            <strong>{money(todayCents, currency)}</strong>
          </div>
          <div className="fda-stat">
            <span>{t.dashboard.openOrders}</span>
            <strong>{number(openCount)}</strong>
          </div>
        </section>

        <div className="fda-grid">
          <section className="fda-card fda-qr">
            <h2>{t.dashboard.qr}</h2>
            <p className="fda-muted">{t.dashboard.qrHelp}</p>
            <Image alt="" height={220} src={`/api/qr/${slug}`} unoptimized width={220} />
            <a className="fda-btn fda-btn--soft" download={`qr-${slug}.svg`} href={`/api/qr/${slug}`}>
              {t.dashboard.download}
            </a>
          </section>

          <section className="fda-card">
            <h2>{t.dashboard.recent}</h2>
            {recent.length === 0 ? (
              <p className="fda-muted">{t.dashboard.none}</p>
            ) : (
              <ul className="fda-recent">
                {recent.map((order) => (
                  <li key={order.id}>
                    <strong>
                      <bdi>#{plain(order.number)}</bdi>
                    </strong>
                    <span>{order.name}</span>
                    <span>{money(order.totalCents, currency)}</span>
                    <span className="fda-pill" data-tone={order.status}>
                      {t.orders.status[order.status as keyof typeof t.orders.status] ?? order.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
