"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTeam } from "@/lib/team-context";
import { Mail, ChevronRight, ChevronDown, MessageSquare, Plus, X } from "lucide-react";

type Message = {
  id: number;
  subject: string;
  body: string;
  sentAt: string | null;
  isRead: boolean;
};

type Question = {
  id: number;
  subject: string;
  body: string;
  sentAt: string;
  replyBody: string | null;
  repliedAt: string | null;
  isRead: boolean;
};

export default function InboxPage() {
  const t = useTranslations("inbox");
  const { teamId, setInboxCount } = useTeam();

  const [tab, setTab] = useState<"messages" | "questions">("messages");

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  // Ask question modal
  const [showAskForm, setShowAskForm] = useState(false);
  const [askSubject, setAskSubject] = useState("");
  const [askBody, setAskBody] = useState("");
  const [askSending, setAskSending] = useState(false);
  const [askSuccess, setAskSuccess] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    setMessages([]);
    setMessagesLoading(true);
    setOpenId(null);
    setQuestions([]);
    setQuestionsLoaded(false);
    fetch(`/api/teams/${teamId}/inbox`).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        setInboxCount(data.filter((m: { isRead: boolean }) => !m.isRead).length);
      }
      setMessagesLoading(false);
    });
  }, [teamId, setInboxCount]);

  useEffect(() => {
    if (tab === "questions" && !questionsLoaded && teamId) {
      setQuestionsLoading(true);
      fetch(`/api/teams/${teamId}/questions`).then(async (res) => {
        if (res.ok) setQuestions(await res.json());
        setQuestionsLoading(false);
        setQuestionsLoaded(true);
      });
    }
  }, [tab, teamId, questionsLoaded]);

  async function markAsRead(msgId: number) {
    if (!teamId) return;
    await fetch(`/api/teams/${teamId}/inbox`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: msgId }),
    });
    setMessages((prev) => {
      const updated = prev.map((m) => (m.id === msgId ? { ...m, isRead: true } : m));
      setInboxCount(updated.filter((m) => !m.isRead).length);
      return updated;
    });
  }

  function handleOpen(msg: Message) {
    if (openId === msg.id) {
      setOpenId(null);
    } else {
      setOpenId(msg.id);
      if (!msg.isRead) markAsRead(msg.id);
    }
  }

  async function handleAskSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId || !askSubject.trim() || !askBody.trim()) return;
    setAskSending(true);
    const res = await fetch(`/api/teams/${teamId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: askSubject.trim(), body: askBody.trim() }),
    });
    if (res.ok) {
      const created = await res.json();
      setQuestions((prev) => [created, ...prev]);
      setAskSubject("");
      setAskBody("");
      setShowAskForm(false);
      setAskSuccess(true);
      setTimeout(() => setAskSuccess(false), 3000);
    }
    setAskSending(false);
  }

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold th-text">{t("title")}</h1>
        <p className="th-text-2 text-sm mt-1">{t("description")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b th-border">
        <button
          onClick={() => setTab("messages")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            tab === "messages"
              ? "border-navy text-navy"
              : "border-transparent th-text-2 hover:th-text"
          }`}
        >
          {t("messagesTab")}
          {unreadCount > 0 && (
            <span className="bg-gold text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("questions")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "questions"
              ? "border-navy text-navy"
              : "border-transparent th-text-2 hover:th-text"
          }`}
        >
          {t("questionsTab")}
        </button>
      </div>

      {/* Messages Tab */}
      {tab === "messages" && (
        <Card>
          {messagesLoading ? null : messages.length > 0 ? (
            <div className="divide-y divide-border">
              {messages.map((msg) => (
                <div key={msg.id}>
                  <button
                    onClick={() => handleOpen(msg)}
                    className="flex items-center gap-3 w-full py-4 text-left hover:th-bg rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
                  >
                    <Mail
                      className={`w-5 h-5 shrink-0 ${
                        msg.isRead ? "th-text-2" : "text-success"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm truncate ${
                          msg.isRead ? "th-text-2" : "font-semibold th-text"
                        }`}
                      >
                        {msg.subject}
                      </p>
                      {msg.sentAt && (
                        <p className="text-xs th-text-2">
                          {new Date(msg.sentAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {!msg.isRead && <Badge variant="info">{t("reply")}</Badge>}
                    {openId === msg.id ? (
                      <ChevronDown className="w-4 h-4 th-text-2 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 th-text-2 shrink-0" />
                    )}
                  </button>
                  {openId === msg.id && (
                    <div className="px-10 pb-4 text-sm th-text whitespace-pre-wrap leading-relaxed">
                      {msg.body}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 th-text-2 text-sm">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
              {t("noMessages")}
            </div>
          )}
        </Card>
      )}

      {/* Questions Tab */}
      {tab === "questions" && (
        <div className="space-y-4">
          {askSuccess && (
            <div className="bg-success-light text-success rounded-lg px-4 py-3 text-sm font-medium">
              {t("questionSent")}
            </div>
          )}

          {/* Ask question button */}
          <div className="flex justify-end">
            <Button onClick={() => setShowAskForm(!showAskForm)}>
              {showAskForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {t("askQuestion")}
            </Button>
          </div>

          {/* Ask question form */}
          {showAskForm && (
            <Card>
              <CardTitle>{t("askQuestion")}</CardTitle>
              <form onSubmit={handleAskSubmit} className="mt-4 space-y-4">
                <Input
                  id="ask-subject"
                  label={t("questionSubject")}
                  value={askSubject}
                  onChange={(e) => setAskSubject(e.target.value)}
                  required
                />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium th-text">
                    {t("questionBody")}
                  </label>
                  <textarea
                    value={askBody}
                    onChange={(e) => setAskBody(e.target.value)}
                    className="w-full rounded-lg border th-border th-card px-3 py-2 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-navy/20"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowAskForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={askSending}>
                    {askSending ? "Sending..." : "Send Question"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Questions list */}
          <Card>
            {questionsLoading ? (
              <div className="text-sm th-text-2 py-4">Loading...</div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8 th-text-2 text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {t("noQuestions")}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {questions.map((q) => (
                  <div key={q.id}>
                    <button
                      onClick={() =>
                        setExpandedQuestion(expandedQuestion === q.id ? null : q.id)
                      }
                      className="flex items-center gap-3 w-full py-4 text-left hover:th-bg rounded-lg px-2 -mx-2 transition-colors"
                    >
                      <MessageSquare
                        className={`w-5 h-5 shrink-0 ${
                          q.replyBody ? "text-success" : "text-gold"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{q.subject}</p>
                        <p className="text-xs th-text-2">
                          {new Date(q.sentAt).toLocaleDateString()}
                        </p>
                      </div>
                      {q.replyBody ? (
                        <Badge variant="success">{t("answered")}</Badge>
                      ) : (
                        <Badge variant="warning">{t("pending")}</Badge>
                      )}
                      {expandedQuestion === q.id ? (
                        <ChevronDown className="w-4 h-4 th-text-2 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 th-text-2 shrink-0" />
                      )}
                    </button>

                    {expandedQuestion === q.id && (
                      <div className="px-4 pb-4 space-y-3">
                        <div className="th-bg rounded-lg p-3">
                          <p className="text-xs font-semibold th-text-2 uppercase mb-1">
                            Your question
                          </p>
                          <p className="text-sm th-text whitespace-pre-wrap">{q.body}</p>
                        </div>
                        {q.replyBody && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-xs font-semibold text-green-700 uppercase mb-1">
                              {t("reply")}{" "}
                              {q.repliedAt
                                ? `· ${new Date(q.repliedAt).toLocaleDateString()}`
                                : ""}
                            </p>
                            <p className="text-sm th-text whitespace-pre-wrap">
                              {q.replyBody}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
