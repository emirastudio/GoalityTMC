"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useTeam } from "@/lib/team-context";
import {
  Upload, ImageIcon, Check, UserPlus, Copy, Trash2, Users, Info,
} from "lucide-react";

type Manager = {
  id: number;
  name: string | null;
  email: string;
  teamId: number | null;
  teamName: string | null;
  createdAt: string;
};

export default function ClubPage() {
  const tj = useTranslations("jersey");
  const t = useTranslations("club");
  const tp = useTranslations("profile");
  const locale = useLocale();
  const { clubId, teamId, isTeamManager } = useTeam();

  // Badge state
  const [badgeUrl, setBadgeUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [badgeError, setBadgeError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Managers state
  const [managers, setManagers] = useState<Manager[]>([]);
  const [managersLoading, setManagersLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Invite state
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteTeamId, setInviteTeamId] = useState<number | null>(null);

  useEffect(() => {
    if (!clubId) return;
    fetch(`/api/clubs/${clubId}/badge`).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (data.badgeUrl) setBadgeUrl(data.badgeUrl);
      }
    });
  }, [clubId]);

  useEffect(() => {
    if (!clubId || isTeamManager) return;
    fetch(`/api/clubs/${clubId}/managers`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setManagers(data))
      .finally(() => setManagersLoading(false));
  }, [clubId, isTeamManager]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setSaved(false);
    setBadgeError("");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setSaved(false);
    setBadgeError("");
  }

  async function handleUpload() {
    if (!file || !clubId) return;
    setUploading(true);
    setBadgeError("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/clubs/${clubId}/badge`, { method: "POST", body: form });
    if (res.ok) {
      const data = await res.json();
      setBadgeUrl(data.badgeUrl);
      setSaved(true);
      setPreview(null);
      setFile(null);
    } else {
      const err = await res.json();
      setBadgeError(err.error ?? tj("uploadFailed"));
    }
    setUploading(false);
  }

  async function handleDeleteManager(id: number) {
    if (!clubId) return;
    setDeletingId(id);
    const res = await fetch(`/api/clubs/${clubId}/managers/${id}`, { method: "DELETE" });
    if (res.ok) {
      setManagers((prev) => prev.filter((m) => m.id !== id));
    }
    setDeletingId(null);
    setConfirmDeleteId(null);
  }

  async function handleGenerateInvite(forTeamId: number) {
    setInviteTeamId(forTeamId);
    setInviteLoading(true);
    setInviteToken(null);
    const res = await fetch(`/api/teams/${forTeamId}/invite`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setInviteToken(data.token);
    }
    setInviteLoading(false);
  }

  const displayImage = preview ?? badgeUrl;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>

      {saved && <Alert variant="success">{tj("submitted")} ✓</Alert>}
      {badgeError && <Alert variant="error">{badgeError}</Alert>}

      {/* Club Badge */}
      <Card>
        <CardTitle>{tj("title")}</CardTitle>
        <CardDescription>
          {tj("description")}
          <br />
          {tj("hint")}
        </CardDescription>

        <div className="mt-6 flex flex-col items-center">
          <div className="w-28 h-28 rounded-full bg-surface flex items-center justify-center mb-6 overflow-hidden border-2 border-border">
            {displayImage ? (
              <img src={displayImage} alt="Club badge" className="w-full h-full object-contain" />
            ) : (
              <span className="text-4xl text-text-secondary/40">?</span>
            )}
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-navy/40 hover:bg-surface/50 transition-colors cursor-pointer"
          >
            <ImageIcon className="w-10 h-10 text-text-secondary/40 mx-auto mb-3" />
            <p className="text-sm">
              <span className="text-navy font-medium">{tj("uploadLink")}</span>
              {" "}{tj("orDragDrop")}
            </p>
            <p className="text-xs text-text-secondary mt-1">{tj("fileTypes")}</p>
            {file && <p className="text-xs text-navy mt-2 font-medium">{file.name}</p>}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="mt-6 flex justify-end w-full">
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? "..." : (
                <>
                  {saved ? <Check className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                  {tj("submit")}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Team Managers — only for club admins */}
      {!isTeamManager && (
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-navy" />
            <CardTitle>{t("managersTitle")}</CardTitle>
          </div>
          <CardDescription>{t("managersDesc")}</CardDescription>

          <div className="mt-4 space-y-3">
            {managersLoading ? null : managers.length === 0 ? (
              <p className="text-sm text-text-secondary">{t("noManagers")}</p>
            ) : (
              managers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {m.name ?? m.email}
                    </p>
                    <p className="text-xs text-text-secondary truncate">{m.email}</p>
                    {m.teamName && (
                      <p className="text-xs text-navy mt-0.5">{m.teamName}</p>
                    )}
                  </div>

                  {confirmDeleteId === m.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-error font-medium">{t("confirmRemove")}</span>
                      <Button
                        variant="danger"
                        onClick={() => handleDeleteManager(m.id)}
                        disabled={deletingId === m.id}
                      >
                        {deletingId === m.id ? "..." : t("removeYes")}
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                        {t("removeNo")}
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(m.id)}
                      className="shrink-0 p-2 rounded-lg text-text-secondary hover:text-error hover:bg-error/5 transition-colors"
                      title={t("removeAccess")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}

            {/* Invite new manager */}
            <div className="pt-2 border-t border-border space-y-3">
              <p className="text-sm font-medium text-text-primary">{t("inviteNew")}</p>

              {/* How it works */}
              <div className="rounded-xl bg-navy/5 border border-navy/10 p-4 space-y-2">
                <div className="flex items-center gap-1.5 mb-3">
                  <Info className="w-4 h-4 text-navy shrink-0" />
                  <span className="text-xs font-semibold text-navy uppercase tracking-wide">{t("inviteHowTitle")}</span>
                </div>
                {(["inviteStep1", "inviteStep2", "inviteStep3", "inviteStep4"] as const).map((key, i) => (
                  <div key={key} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-xs text-text-secondary leading-relaxed">{t(key)}</p>
                  </div>
                ))}
                <p className="text-[11px] text-text-secondary/70 italic mt-2 pl-7">{t("inviteNote")}</p>
              </div>

              {inviteToken && inviteTeamId ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={`${window.location.origin}/${locale}/invite/${inviteToken}`}
                      className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-secondary font-mono min-w-0"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/${locale}/invite/${inviteToken}`
                        );
                        setInviteCopied(true);
                        setTimeout(() => setInviteCopied(false), 2000);
                      }}
                      className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface transition-colors"
                    >
                      {inviteCopied ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {inviteCopied ? tp("copied") : tp("copy")}
                    </button>
                  </div>
                  <p className="text-xs text-text-secondary">{tp("inviteLinkExpiry")}</p>
                  <Button variant="ghost" onClick={() => { setInviteToken(null); setInviteTeamId(null); }}>
                    {tp("generateNew")}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {/* Show invite button per team if club has multiple teams, or just one button if single */}
                  <InviteByTeam
                    clubId={clubId}
                    onGenerate={handleGenerateInvite}
                    loading={inviteLoading}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function InviteByTeam({
  clubId,
  onGenerate,
  loading,
}: {
  clubId: number | null;
  onGenerate: (teamId: number) => void;
  loading: boolean;
}) {
  const tp = useTranslations("profile");
  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!clubId) return;
    fetch(`/api/clubs/${clubId}/teams`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        setTeams(data.map((item: { id: number; name: string | null }) => ({ id: item.id, name: item.name ?? `Team ${item.id}` })));
        setLoaded(true);
      });
  }, [clubId]);

  if (!loaded) return null;

  if (teams.length === 0) return null;

  if (teams.length === 1) {
    return (
      <Button onClick={() => onGenerate(teams[0].id)} disabled={loading}>
        <UserPlus className="w-4 h-4" />
        {loading ? "..." : tp("generateLink")}
      </Button>
    );
  }

  return (
    <>
      {teams.map((team) => (
        <Button key={team.id} onClick={() => onGenerate(team.id)} disabled={loading} variant="ghost">
          <UserPlus className="w-4 h-4" />
          {loading ? "..." : `${tp("generateLink")} — ${team.name}`}
        </Button>
      ))}
    </>
  );
}
