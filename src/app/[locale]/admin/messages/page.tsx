"use client";

import { useState, useEffect } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Mail, MessageSquare, ChevronDown, ChevronRight } from "lucide-react";

type Team = { id: number; name: string | null; classId: number | null };
type Message = {
  id: number;
  subject: string;
  body: string;
  sentAt: string;
  sendToAll: boolean;
  readCount: number;
  recipientTeams: { id: number; name: string }[] | null;
};
type Question = {
  id: number;
  teamId: number;
  teamName: string | null;
  clubName: string | null;
  subject: string;
  body: string;
  sentAt: string;
  replyBody: string | null;
  repliedAt: string | null;
  isRead: boolean;
};

export default function AdminMessagesPage() {
  const [tab, setTab] = useState<"messages" | "questions">("messages");

  // Messages state
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [totalTeams, setTotalTeams] = useState(0);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Compose form state
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [replyingSending, setReplyingSending] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/messages")
      .then((r) => r.json())
      .then((data) => {
        setMessages(data.messages ?? []);
        setAllTeams(data.allTeams ?? []);
        setTotalTeams(data.totalTeams ?? 0);
        setQuestionsCount(data.questionsCount ?? 0);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (tab === "questions" && questions.length === 0) {
      setQuestionsLoading(true);
      fetch("/api/admin/questions")
        .then((r) => r.json())
        .then((data) => {
          setQuestions(data);
          setQuestionsLoading(false);
        });
    }
  }, [tab]);

  function toggleTeam(id: number) {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    if (!sendToAll && selectedTeamIds.length === 0) return;

    setSending(true);
    const res = await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: subject.trim(),
        body: body.trim(),
        sendToAll,
        teamIds: sendToAll ? [] : selectedTeamIds,
      }),
    });

    if (res.ok) {
      setSendSuccess(true);
      setSubject("");
      setBody("");
      setSelectedTeamIds([]);
      setSendToAll(true);
      // Refresh messages
      const data = await fetch("/api/admin/messages").then((r) => r.json());
      setMessages(data.messages ?? []);
      setTimeout(() => setSendSuccess(false), 3000);
    }
    setSending(false);
  }

  async function handleReply(questionId: number) {
    const replyBody = replyDrafts[questionId]?.trim();
    if (!replyBody) return;
    setReplyingSending(questionId);
    const res = await fetch(`/api/admin/questions/${questionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replyBody }),
    });
    if (res.ok) {
      const updated = await res.json();
      setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, ...updated } : q)));
      setReplyDrafts((prev) => ({ ...prev, [questionId]: "" }));
    }
    setReplyingSending(null);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-text-primary">Messages</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("messages")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "messages"
              ? "border-navy text-navy"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          Sent Messages
        </button>
        <button
          onClick={() => setTab("questions")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            tab === "questions"
              ? "border-navy text-navy"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          Questions from Teams
          {questionsCount > 0 && (
            <span className="bg-gold text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {questionsCount}
            </span>
          )}
        </button>
      </div>

      {/* Messages Tab */}
      {tab === "messages" && (
        <>
          {/* Compose */}
          <Card>
            <CardTitle>New Message</CardTitle>
            <form onSubmit={handleSend} className="mt-4 space-y-4">
              <Input
                id="subject"
                label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Message body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm min-h-[160px] focus:outline-none focus:ring-2 focus:ring-navy/20"
                  required
                />
              </div>

              {/* Recipient selector */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-text-primary">Recipients</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="recipients"
                      checked={sendToAll}
                      onChange={() => { setSendToAll(true); setSelectedTeamIds([]); }}
                      className="accent-navy"
                    />
                    All teams ({totalTeams})
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="recipients"
                      checked={!sendToAll}
                      onChange={() => setSendToAll(false)}
                      className="accent-navy"
                    />
                    Select teams
                  </label>
                </div>

                {!sendToAll && (
                  <div className="border border-border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {allTeams.length === 0 ? (
                      <p className="text-sm text-text-secondary">No teams</p>
                    ) : (
                      allTeams.map((team) => (
                        <label key={team.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-surface rounded px-1 py-0.5">
                          <input
                            type="checkbox"
                            checked={selectedTeamIds.includes(team.id)}
                            onChange={() => toggleTeam(team.id)}
                            className="accent-navy"
                          />
                          {team.name ?? `Team #${team.id}`}
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                {sendSuccess && (
                  <span className="text-sm text-success font-medium">Message sent!</span>
                )}
                {!sendSuccess && <span />}
                <Button type="submit" disabled={sending}>
                  <Send className="w-4 h-4" />
                  {sending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </form>
          </Card>

          {/* Sent messages list */}
          <Card>
            <CardTitle>Sent Messages</CardTitle>
            {loading ? (
              <div className="mt-4 text-sm text-text-secondary">Loading...</div>
            ) : messages.length === 0 ? (
              <div className="mt-4 text-center py-8 text-text-secondary text-sm">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No messages sent yet
              </div>
            ) : (
              <div className="mt-4 divide-y divide-border">
                {messages.map((msg) => (
                  <div key={msg.id} className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-text-primary">{msg.subject}</p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {new Date(msg.sentAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-text-secondary mt-1">
                          {msg.sendToAll
                            ? "All teams"
                            : msg.recipientTeams
                              ? `${msg.recipientTeams.length} team${msg.recipientTeams.length !== 1 ? "s" : ""}: ${msg.recipientTeams.map((t) => t.name).join(", ")}`
                              : "Specific teams"}
                        </p>
                      </div>
                      <Badge variant="info">
                        {msg.readCount} read
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Questions Tab */}
      {tab === "questions" && (
        <Card>
          <CardTitle>Questions from Teams</CardTitle>
          {questionsLoading ? (
            <div className="mt-4 text-sm text-text-secondary">Loading...</div>
          ) : questions.length === 0 ? (
            <div className="mt-4 text-center py-8 text-text-secondary text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No questions yet
            </div>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {questions.map((q) => (
                <div key={q.id}>
                  <button
                    onClick={() => setExpandedQuestion(expandedQuestion === q.id ? null : q.id)}
                    className="flex items-center gap-3 w-full py-4 text-left hover:bg-surface rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <MessageSquare
                      className={`w-4 h-4 shrink-0 ${q.replyBody ? "text-success" : "text-gold"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${!q.isRead ? "font-semibold" : ""}`}>
                        {q.subject}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {q.teamName ?? q.clubName} · {new Date(q.sentAt).toLocaleString()}
                      </p>
                    </div>
                    {!q.replyBody && (
                      <Badge variant="warning">Unanswered</Badge>
                    )}
                    {q.replyBody && (
                      <Badge variant="success">Answered</Badge>
                    )}
                    {expandedQuestion === q.id ? (
                      <ChevronDown className="w-4 h-4 text-text-secondary shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
                    )}
                  </button>

                  {expandedQuestion === q.id && (
                    <div className="px-4 pb-4 space-y-4">
                      {/* Question body */}
                      <div className="bg-surface rounded-lg p-4">
                        <p className="text-xs font-semibold text-text-secondary uppercase mb-2">Question</p>
                        <p className="text-sm text-text-primary whitespace-pre-wrap">{q.body}</p>
                      </div>

                      {/* Existing reply */}
                      {q.replyBody && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-xs font-semibold text-green-700 uppercase mb-2">
                            Reply · {q.repliedAt ? new Date(q.repliedAt).toLocaleString() : ""}
                          </p>
                          <p className="text-sm text-text-primary whitespace-pre-wrap">{q.replyBody}</p>
                        </div>
                      )}

                      {/* Reply form */}
                      {!q.replyBody && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-text-primary">Reply</label>
                          <textarea
                            value={replyDrafts[q.id] ?? ""}
                            onChange={(e) =>
                              setReplyDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))
                            }
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-navy/20"
                            placeholder="Type your reply..."
                          />
                          <div className="flex justify-end">
                            <Button
                              onClick={() => handleReply(q.id)}
                              disabled={replyingSending === q.id || !replyDrafts[q.id]?.trim()}
                            >
                              <Send className="w-4 h-4" />
                              {replyingSending === q.id ? "Sending..." : "Send Reply"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
