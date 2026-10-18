"use client";

import { FormEvent, useState } from "react";
import { useAdmin } from "@/components/admin/AdminFrame";
import PageHead from "@/components/admin/PageHead";
import { useAdminAction } from "@/components/admin/useAdminAction";
import { fillText } from "@/lib/i18n-admin";

type Role = "owner" | "manager" | "staff";
type Member = { id: string; email: string; name: string; role: Role; isActive: boolean; createdAt: string };

export default function StaffBoard({ staff, currentUserId, isOwner }: { staff: Member[]; currentUserId: string; isOwner: boolean }) {
  const { t } = useAdmin();
  const { busy, message, run } = useAdminAction();
  const [resetId, setResetId] = useState<string | null>(null);

  async function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const result = await run("/api/admin/staff", "POST", {
      name: data.get("name"),
      email: data.get("email"),
      role: data.get("role"),
      password: data.get("password")
    });
    if (result.ok) form.reset();
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    const result = await run(`/api/admin/staff/${id}`, "PATCH", { password });
    if (result.ok) setResetId(null);
  }

  if (!isOwner) {
    return (
      <>
        <PageHead page="staff" />
        <p className="fda-card fda-muted">{t.staff.onlyOwner}</p>
      </>
    );
  }

  return (
    <>
      <PageHead page="staff" />
      <div className="fda-stack">
        {message ? (
          <p className="fda-error" role="alert">
            {message}
          </p>
        ) : null}

        <form className="fda-card fda-form" onSubmit={addUser}>
          <h2>{t.staff.addPerson}</h2>
          <p className="fda-muted">{t.staff.addHelp}</p>
          <div className="fda-row-fields">
            <label>
              {t.staff.name}
              <input autoComplete="off" className="fd-input" maxLength={80} name="name" required />
            </label>
            <label>
              {t.staff.email}
              <input autoComplete="off" className="fd-input" dir="ltr" maxLength={200} name="email" required type="email" />
            </label>
            <label>
              {t.staff.role}
              <select className="fd-input" defaultValue="staff" name="role">
                {(Object.keys(t.staff.roles) as Role[]).map((role) => (
                  <option key={role} value={role}>
                    {t.staff.roles[role]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            {t.staff.startingPassword}
            <input autoComplete="new-password" className="fd-input" dir="ltr" maxLength={72} minLength={12} name="password" required type="password" />
          </label>
          <div>
            <button className="fda-btn" disabled={busy}>
              {t.staff.createAccount}
            </button>
          </div>
        </form>

        <section className="fda-card">
          <h2>{t.staff.people}</h2>
          <div className="fda-scroll">
            <table className="fda-table">
              <tbody>
                {staff.map((member) => {
                  const isSelf = member.id === currentUserId;
                  return (
                    <tr key={member.id}>
                      <td>
                        <strong>
                          {member.name} {isSelf ? t.you : ""}
                        </strong>
                        <br />
                        <bdi className="fda-muted" dir="ltr">
                          {member.email}
                        </bdi>
                      </td>
                      <td>
                        <select
                          aria-label={fillText(t.staff.roleOf, { name: member.name })}
                          className="fd-input"
                          disabled={busy || isSelf}
                          onChange={(event) => run(`/api/admin/staff/${member.id}`, "PATCH", { role: event.target.value })}
                          value={member.role}
                        >
                          {(Object.keys(t.staff.roles) as Role[]).map((role) => (
                            <option key={role} value={role}>
                              {t.staff.roles[role]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className="fda-pill" data-tone={member.isActive ? "ready" : "cancelled"}>
                          {member.isActive ? t.active : t.disabled}
                        </span>
                      </td>
                      <td>
                        {resetId === member.id ? (
                          <form className="fda-actions" onSubmit={(event) => resetPassword(event, member.id)}>
                            <input
                              aria-label={fillText(t.staff.newPasswordFor, { name: member.name })}
                              autoComplete="new-password"
                              autoFocus
                              className="fd-input"
                              dir="ltr"
                              maxLength={72}
                              minLength={12}
                              name="password"
                              placeholder={t.staff.newPassword}
                              required
                              style={{ width: 200 }}
                              type="password"
                            />
                            <button className="fda-btn" disabled={busy}>
                              {t.save}
                            </button>
                            <button className="fda-btn fda-btn--soft" disabled={busy} onClick={() => setResetId(null)} type="button">
                              {t.cancel}
                            </button>
                          </form>
                        ) : (
                          <span className="fda-actions">
                            <button className="fda-btn fda-btn--soft" disabled={busy} onClick={() => setResetId(member.id)} type="button">
                              {t.staff.resetPassword}
                            </button>
                            {isSelf ? null : (
                              <button className="fda-btn fda-btn--line" disabled={busy} onClick={() => {
                                  if (member.isActive && !window.confirm(fillText(t.staff.disableConfirm, { name: member.name }))) return;
                                  void run(`/api/admin/staff/${member.id}`, "PATCH", { isActive: !member.isActive });
                                }}
                                type="button"
                              >
                                {member.isActive ? t.disable : t.enable}
                              </button>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
