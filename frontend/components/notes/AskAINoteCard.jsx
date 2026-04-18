"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { noteAIAPI, noteAISubscriptionAPI } from "@/lib/notesService";
import { useAuth } from "@/context/AuthContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { Bot, CreditCard, Loader2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function AskAINoteCard({ note, onSubscriptionActivated }) {
  const { user, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const monthlyPrice = useMemo(() => Number(note.ask_ai_monthly_price || 150), [note.ask_ai_monthly_price]);
  const hasNoteAccess = !!note.can_access;

  if (!note.ask_ai_enabled) {
    return null;
  }

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }

    setSubscribing(true);
    try {
      const data = await noteAISubscriptionAPI.create({ note_id: note.id });
      if (data.payment_link) {
        window.location.href = data.payment_link;
        return;
      }
      toast.success("Ask AI subscription activated.");
      onSubscriptionActivated?.();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to start Ask AI subscription.");
    } finally {
      setSubscribing(false);
    }
  };

  const handleAsk = async () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    if (!question.trim()) {
      toast.error("Enter your doubt first.");
      return;
    }

    setLoading(true);
    try {
      const data = await noteAIAPI.ask(note.id, { question: question.trim() });
      setAnswer(data.answer || "");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to get AI answer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 border-primary/10 bg-card/70">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold">Ask AI About This Note</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Ask note-specific doubts and get AI explanations grounded in this note&apos;s content.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit">
            ₹{monthlyPrice}/month
          </Badge>
        </div>

        {!isAuthenticated ? (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            Login as a student to subscribe and ask doubts about this note.
          </div>
        ) : user?.role !== "student" ? (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            Ask AI is available for student accounts only.
          </div>
        ) : !hasNoteAccess ? (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            Get access to this note first. The Ask AI monthly add-on is available only after note access is active.
          </div>
        ) : note.has_ai_subscription ? (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <Bot className="h-4 w-4" />
              <span>
                Subscription active
                {note.ai_subscription_valid_until ? ` until ${new Date(note.ai_subscription_valid_until).toLocaleDateString("en-IN")}` : ""}.
              </span>
            </div>
            <div className="space-y-3">
              <Textarea
                rows={5}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a doubt about this note..."
              />
              <Button onClick={handleAsk} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                Ask AI
              </Button>
            </div>
            {answer && (
              <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
                <div className="text-sm font-semibold">AI Answer</div>
                <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">{answer}</div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Lock className="h-4 w-4 text-primary" />
                Paid add-on for this note
              </div>
              <p className="text-sm text-muted-foreground">
                Subscribe for ₹{monthlyPrice}/month to ask unlimited note-specific doubts using AI.
              </p>
            </div>
            <Button onClick={handleSubscribe} disabled={subscribing}>
              {subscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              Subscribe with Razorpay
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
