"use client";

import { useEffect, useState } from "react";
import AdminFrame, { type AdminAuthSource } from "./AdminFrame";

type MemberRow = {
  id: string;
  displayName: string;
  email: string | null;
  locale: string;
  role: "member" | "admin";
  status: "active" | "disabled";
  createdAt: string;
  lastLoginAt: string;
  providers: Array<"google" | "line">;
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-Hant", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(date);
}

export default function MembersPanel({
  userName,
  authSource,
  actorMemberId,
}: {
  userName: string;
  authSource: AdminAuthSource;
  actorMemberId?: string;
}) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [status, setStatus] = useState("讀取會員中…");

  const load = () => {
    fetch("/api/admin/members", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ members?: MemberRow[]; error?: string }>)
      .then((data) => {
        setMembers(data.members ?? []);
        setStatus(data.error ? data.error : `共 ${data.members?.length ?? 0} 位會員`);
      })
      .catch(() => setStatus("暫時無法讀取會員"));
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id: string, action: "disable" | "enable" | "promote" | "demote") => {
    setStatus("更新中…");
    const response = await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) {
      setStatus(data.error || "更新失敗");
      return;
    }
    load();
  };

  return (
    <AdminFrame active="members" userName={userName} authSource={authSource}>
      <section className="adminMain">
        <header>
          <div>
            <p>MEMBERS</p>
            <h1>會員管理</h1>
          </div>
          <span>{status}</span>
        </header>
        <div className="memberTableWrap">
          <table className="memberTable">
            <thead>
              <tr>
                <th>會員</th>
                <th>登入方式</th>
                <th>建立</th>
                <th>最近登入</th>
                <th>角色</th>
                <th>狀態</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={7}>尚無會員。前台 Google／LINE 登入後會出現在這裡。</td>
                </tr>
              ) : members.map((member) => {
                const self = member.id === actorMemberId;
                return (
                  <tr key={member.id} className={member.status === "disabled" ? "disabled" : ""}>
                    <td>
                      <strong>{member.displayName}</strong>
                      <small>{member.email || "（未提供 Email）"}</small>
                    </td>
                    <td>{member.providers.length ? member.providers.join("、") : "—"}</td>
                    <td>{formatTime(member.createdAt)}</td>
                    <td>{formatTime(member.lastLoginAt)}</td>
                    <td>{member.role === "admin" ? "管理者" : "會員"}</td>
                    <td>{member.status === "disabled" ? "已停用" : "正常"}</td>
                    <td className="memberActions">
                      {member.status === "active" ? (
                        <button type="button" disabled={self} onClick={() => void act(member.id, "disable")}>停用</button>
                      ) : (
                        <button type="button" onClick={() => void act(member.id, "enable")}>啟用</button>
                      )}
                      {member.role === "admin" ? (
                        <button type="button" className="secondary" disabled={self} onClick={() => void act(member.id, "demote")}>降為會員</button>
                      ) : (
                        <button type="button" className="secondary" onClick={() => void act(member.id, "promote")}>升為管理者</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="memberTableNote">
            列於 <code>ADMIN_EMAILS</code> 的 Google 信箱會在下次登入時自動恢復管理者角色。停用會立刻作廢該會員的工作階段。
          </p>
        </div>
      </section>
    </AdminFrame>
  );
}
