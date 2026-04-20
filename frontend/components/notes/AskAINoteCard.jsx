"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { noteAIAPI, noteAISubscriptionAPI } from "@/lib/notesService";
import { useAuth } from "@/context/AuthContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { Bot, CreditCard, Loader2, Lock, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

export default function AskAINoteCard({ note, onSubscriptionActivated }) {
  const { user, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const monthlyPrice = useMemo(() => Number(note.ask_ai_monthly_price || 150), [note.ask_ai_monthly_price]);
  const hasSubscription = !!note.has_ai_subscription;

  useEffect(() => {
    if (hasSubscription) {
      setIsPopoverOpen(false);
    } else {
      setIsChatOpen(false);
    }
  }, [hasSubscription]);

  if (!note.ask_ai_enabled) {
    return null;
  }

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }

    if (user?.role !== "student") {
      toast.error("Ask AI is available for student accounts only.");
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
      setIsPopoverOpen(false);
      setIsChatOpen(true);
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
    <>
      {hasSubscription && isChatOpen && (
        <div className="fixed bottom-24 right-4 z-40 w-[calc(100vw-2rem)] max-w-md sm:right-6">
          <Card className="border-primary/15 bg-background/95 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Bot className="h-4 w-4 text-primary" />
                  <span>Ask AI about this note</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {note.ai_subscription_valid_until
                    ? `Active until ${new Date(note.ai_subscription_valid_until).toLocaleDateString("en-IN")}`
                    : "Subscription active"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={() => setIsChatOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3 p-4">
              <Textarea
                rows={5}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a doubt about this note..."
              />
              <Button className="w-full" onClick={handleAsk} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                Ask AI
              </Button>
              {answer && (
                <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
                  <div className="text-sm font-semibold">AI Answer</div>
                  <div className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-foreground">
                    {answer}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
        {hasSubscription ? (
          <Button
            type="button"
            size="lg"
            onClick={() => setIsChatOpen((open) => !open)}
            className="h-14 rounded-full px-5 shadow-xl shadow-primary/25"
          >
            <Sparkles className="h-4 w-4" />
            Ask AI
            <Badge className="ml-1 rounded-full px-2 py-0 text-[10px]">Live</Badge>
          </Button>
        ) : (
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="lg"
                className="h-14 rounded-full px-5 shadow-xl shadow-primary/25"
              >
                <Sparkles className="h-4 w-4" />
                Ask AI
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-80 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Lock className="h-4 w-4 text-primary" />
                  Subscribe to Ask AI
                </div>
                <p className="text-sm text-muted-foreground">
                  Subscribe for ₹{monthlyPrice}/month to open note-specific AI chat for this note.
                </p>
              </div>

              {!isAuthenticated ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Login as a student to continue.</p>
                  <Button className="w-full" onClick={() => openAuthModal("login")}>
                    Login to Subscribe
                  </Button>
                </div>
              ) : user?.role !== "student" ? (
                <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                  Ask AI is available for student accounts only.
                </p>
              ) : (
                <Button className="w-full" onClick={handleSubscribe} disabled={subscribing}>
                  {subscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                  Subscribe with Razorpay
                </Button>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </>
  );
}
