"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/lib/team-context";
import { User, Lock, Trash2, UserPlus, Copy, Check } from "lucide-react";
import { useLocale } from "next-intl";

type ClubProfile = {
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
};

export default function ProfilePage() {
  const t = useTranslations("profile");
  const { clubId, teamId, isTeamManager } = useTeam();
  const locale = useLocale();

  // Invite state (только для клубных администраторов)
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Contact info
  const [profile, setProfile] = useState<ClubProfile>({
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Deletion
  const [deletionSending, setDeletionSending] = useState(false);
  const [deletionSent, setDeletionSent] = useState(false);
  const [deletionError, setDeletionError] = useState("");
  const [showDeletionConfirm, setShowDeletionConfirm] = useState(false);

  useEffect(() => {
    if (!clubId) return;
    // Load club profile from the API
    fetch(`/api/clubs/${clubId}/profile`)
      .then((r) => {
        if (r.ok) return r.json();
        return null;
      })
      .then((data) => {
        if (data) {
          setProfile({
            contactName: data.contactName ?? "",
            contactEmail: data.contactEmail ?? "",
            contactPhone: data.contactPhone ?? "",
          });
        }
        setProfileLoading(false);
      });
  }, [clubId]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId) return;
    setProfileSaving(true);
    setProfileError("");
    const res = await fetch(`/api/clubs/${clubId}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactName: profile.contactName,
        contactEmail: profile.contactEmail,
        contactPhone: profile.contactPhone,
      }),
    });
    if (res.ok) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } else {
      const d = await res.json().catch(() => ({}));
      setProfileError(d.error ?? "Failed to save");
    }
    setProfileSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    setPasswordSaving(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (res.ok) {
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSaved(false), 3000);
    } else {
      const d = await res.json().catch(() => ({}));
      setPasswordError(d.error ?? "Failed to change password");
    }
    setPasswordSaving(false);
  }

  async function handleRequestDeletion() {
    setDeletionSending(true);
    setDeletionError("");
    const res = await fetch("/api/auth/request-deletion", { method: "POST" });
    if (res.ok) {
      setDeletionSent(true);
      setShowDeletionConfirm(false);
    } else {
      const d = await res.json().catch(() => ({}));
      setDeletionError(d.error ?? "Failed to send request");
    }
    setDeletionSending(false);
  }

  if (profileLoading) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>

      {/* Contact Information */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-navy" />
          <CardTitle>{t("contactInfo")}</CardTitle>
        </div>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <Input
            id="contactName"
            label={t("contactInfo") + " — Name"}
            value={profile.contactName ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, contactName: e.target.value }))}
          />
          <Input
            id="contactEmail"
            label="Email"
            type="email"
            value={profile.contactEmail ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, contactEmail: e.target.value }))}
          />
          <Input
            id="contactPhone"
            label="Phone"
            value={profile.contactPhone ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, contactPhone: e.target.value }))}
          />
          {profileError && (
            <p className="text-sm text-error">{profileError}</p>
          )}
          <div className="flex items-center justify-between">
            {profileSaved && (
              <span className="text-sm text-success font-medium">Saved!</span>
            )}
            {!profileSaved && <span />}
            <Button type="submit" disabled={profileSaving}>
              {profileSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Change Password */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-navy" />
          <CardTitle>{t("changePassword")}</CardTitle>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Input
            id="currentPassword"
            label={t("currentPassword")}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            id="newPassword"
            label={t("newPassword")}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            id="confirmPassword"
            label={t("confirmPassword")}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {passwordError && (
            <p className="text-sm text-error">{passwordError}</p>
          )}
          <div className="flex items-center justify-between">
            {passwordSaved && (
              <span className="text-sm text-success font-medium">{t("passwordChanged")}</span>
            )}
            {!passwordSaved && <span />}
            <Button type="submit" disabled={passwordSaving}>
              {passwordSaving ? "Saving..." : "Change Password"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Delete Account */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="w-5 h-5 text-error" />
          <CardTitle className="text-error">{t("deleteAccount")}</CardTitle>
        </div>
        <p className="text-sm text-text-secondary mb-4">{t("deleteWarning")}</p>

        {deletionSent ? (
          <div className="bg-success-light text-success rounded-lg px-4 py-3 text-sm font-medium">
            {t("deletionSent")}
          </div>
        ) : (
          <>
            {!showDeletionConfirm ? (
              <Button
                variant="danger"
                onClick={() => setShowDeletionConfirm(true)}
              >
                <Trash2 className="w-4 h-4" />
                {t("requestDeletion")}
              </Button>
            ) : (
              <div className="border border-error/30 rounded-lg p-4 bg-error/5 space-y-3">
                <p className="text-sm font-medium text-error">
                  Are you sure? This will send a deletion request to the organizer.
                </p>
                {deletionError && (
                  <p className="text-sm text-error">{deletionError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    onClick={handleRequestDeletion}
                    disabled={deletionSending}
                  >
                    {deletionSending ? "Sending..." : "Yes, request deletion"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowDeletionConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Invite team manager — только для клубных администраторов */}
      {!isTeamManager && teamId && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-navy" />
            <CardTitle>{t("inviteManager")}</CardTitle>
          </div>
          <p className="text-sm text-text-secondary mb-4">{t("inviteManagerDesc")}</p>

          {inviteToken ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={`${window.location.origin}/${locale}/invite/${inviteToken}`}
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-secondary font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/${locale}/invite/${inviteToken}`);
                    setInviteCopied(true);
                    setTimeout(() => setInviteCopied(false), 2000);
                  }}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface transition-colors"
                >
                  {inviteCopied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  {inviteCopied ? t("copied") : t("copy")}
                </button>
              </div>
              <p className="text-xs text-text-secondary">{t("inviteLinkExpiry")}</p>
              <Button
                variant="ghost"
                onClick={() => setInviteToken(null)}
              >
                {t("generateNew")}
              </Button>
            </div>
          ) : (
            <Button
              onClick={async () => {
                setInviteLoading(true);
                const res = await fetch(`/api/teams/${teamId}/invite`, { method: "POST" });
                if (res.ok) {
                  const data = await res.json();
                  setInviteToken(data.token);
                }
                setInviteLoading(false);
              }}
              disabled={inviteLoading}
            >
              <UserPlus className="w-4 h-4" />
              {inviteLoading ? "..." : t("generateLink")}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
