'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, Mic, MicOff, Sparkles, Volume2, VolumeX } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { aiTeacherAPI } from '@/lib/lmsService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SPEECH_PAUSE_MS = 5500;

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function looksLikeGoodbye(text) {
  const normalized = (text || '').trim().toLowerCase();
  return /\b(bye|goodbye|stop session|end session|that is all|thanks bye)\b/.test(normalized);
}

function isBoardWorthyLine(line) {
  const text = (line || '').trim();
  if (!text) return false;

  const formulaPattern = /[=+\-*/^%<>]|\\|∫|Σ|√|π|θ|λ|→|=>|>=|<=|\b(a|b|c|x|y|z|n|f\(x\))\b/i;
  const codePattern = /[{}[\]();]|=>|===|!==|def |class |function |return |const |let |var |if\s*\(|for\s*\(|while\s*\(/i;
  const derivationPattern = /^\s*(step\s*\d+|therefore|thus|hence|so,|given|assume|first,|next,|finally,|\d+\.)/i;
  const shortPointPattern = text.length <= 120 && /^(key point|important|note|remember|result|rule|formula|derivation|approach)\b/i.test(text);

  return formulaPattern.test(text) || codePattern.test(text) || derivationPattern.test(text) || shortPointPattern;
}

function cleanBoardLine(line) {
  return (line || '')
    .replace(/^[-*•\d.\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBoardPoints(messages = []) {
  const lastTeacherMessage = [...messages].reverse().find((item) => item.role === 'assistant' && item.content);
  if (!lastTeacherMessage) return [];

  const normalized = lastTeacherMessage.content
    .replace(/\r/g, '')
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map(cleanBoardLine)
    .filter(Boolean);

  const boardLines = normalized.filter(isBoardWorthyLine);
  if (boardLines.length > 0) {
    return boardLines.slice(0, 8);
  }

  const fallbackSummary = normalized
    .filter((line) => line.length <= 140)
    .slice(0, 4);

  return fallbackSummary;
}

function WhiteboardTeacher({ mode = 'idle', speaking = false, listening = false, topicFocus = '', points = [] }) {
  const ringClass =
    mode === 'thinking'
      ? 'from-amber-400 to-orange-500'
      : speaking
        ? 'from-emerald-400 to-teal-500'
        : listening
          ? 'from-sky-400 to-blue-500'
          : 'from-slate-400 to-slate-600';
  const boardTitle = topicFocus?.trim() || 'AI Teacher Whiteboard';

  return (
    <div className="relative mx-auto flex min-h-[680px] w-full max-w-3xl items-center justify-center overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top,_#f8fafc,_#dbeafe_35%,_#cbd5e1_70%)] shadow-2xl">
      <div className={`absolute inset-6 rounded-[1.75rem] bg-gradient-to-b ${ringClass} opacity-20 blur-2xl transition-all duration-500`} />
      <div className="absolute inset-5 rounded-[1.75rem] bg-[#1f4f3a]" />
      <div className="absolute inset-5 rounded-[1.75rem] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_30%),linear-gradient(135deg,_rgba(255,255,255,0.03),_transparent_35%)]" />
      <div className="absolute inset-x-10 top-10 h-14 rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-center text-white/95 shadow-sm backdrop-blur-sm">
        <div
          className="text-3xl tracking-wide"
          style={{ fontFamily: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive' }}
        >
          {boardTitle}
        </div>
      </div>

      <div className="absolute inset-x-12 top-32 bottom-20 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/5">
        <div
          className="visible-scrollbar h-full space-y-5 overflow-y-scroll pr-4 pl-8 py-8 text-left text-white/95"
          style={{ fontFamily: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive' }}
        >
          {points.length ? points.map((point, index) => (
            <div key={`${index}-${point}`} className="flex items-start gap-4 text-2xl leading-[1.5] sm:text-[2rem]">
              <span className="mt-1 text-3xl text-emerald-200">•</span>
              <span>{point}</span>
            </div>
          )) : (
            <div className="space-y-5">
              <div className="text-3xl leading-relaxed text-white/95">Teacher board is ready.</div>
              <div className="text-2xl leading-relaxed text-emerald-100/95">Start the session and the important points will appear here as the teacher explains them.</div>
            </div>
          )}
        </div>
      </div>

      {mode === 'thinking' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/18 backdrop-blur-[2px]">
          <div className="flex items-center gap-3 rounded-full border border-white/35 bg-white/90 px-5 py-3 text-sm font-semibold text-slate-800 shadow-xl">
            <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
            Teacher is thinking...
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-0 left-10 right-10 h-8 rounded-t-2xl bg-[#d7b98e] shadow-[0_-8px_25px_rgba(0,0,0,0.12)]" />
      <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.12),_transparent_60%)] transition-opacity ${speaking || listening ? 'opacity-100' : 'opacity-50'}`} />
      <div className="absolute bottom-10 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm">
        {mode === 'thinking' ? 'Thinking' : speaking ? 'Answering' : listening ? 'Listening' : 'Ready'}
      </div>
    </div>
  );
}

export default function AITeacherPage() {
  const { user, loading } = useAuth();
  const { profileType } = useProfile();
  const [topicFocus, setTopicFocus] = useState('');
  const [status, setStatus] = useState('Idle');
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [messages, setMessages] = useState([]);
  const [teacherConfig, setTeacherConfig] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechOutputEnabled, setSpeechOutputEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('face');
  const [faceSession, setFaceSession] = useState(null);
  const [faceError, setFaceError] = useState('');
  const recognitionRef = useRef(null);
  const sessionActiveRef = useRef(false);
  const shouldResumeRef = useRef(false);
  const speechPauseTimerRef = useRef(null);
  const pendingSpeechRef = useRef('');

  const transcriptItems = useMemo(() => messages.slice(-14), [messages]);
  const boardPoints = useMemo(() => extractBoardPoints(messages), [messages]);

  useEffect(() => {
    setSpeechSupported(!!getSpeechRecognition());
    aiTeacherAPI.getStatus().then(setTeacherConfig).catch(() => null);
  }, []);

  useEffect(() => {
    sessionActiveRef.current = sessionActive;
  }, [sessionActive]);

  useEffect(() => {
    return () => {
      forceStopSession();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const appendMessage = (role, content, meta = {}) => {
    const clean = (content || '').trim();
    if (!clean) return;
    setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, role, content: clean, ...meta }]);
  };

  const stopRecognitionOnly = () => {
    if (speechPauseTimerRef.current) {
      window.clearTimeout(speechPauseTimerRef.current);
      speechPauseTimerRef.current = null;
    }
    pendingSpeechRef.current = '';
    shouldResumeRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const forceStopSession = () => {
    if (faceSession?.conversation_id) {
      aiTeacherAPI.endFaceSession(faceSession.conversation_id).catch(() => null);
    }
    setFaceSession(null);
    setFaceError('');
    sessionActiveRef.current = false;
    setSessionActive(false);
    stopRecognitionOnly();
    setIsListening(false);
    setIsThinking(false);
    setIsSpeaking(false);
    setStatus('Stopped');
  };

  const speakText = (text, onDone) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !speechOutputEnabled) {
      onDone?.();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.97;
    utterance.pitch = 1;
    utterance.lang = 'en-IN';
    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatus('Teacher is answering...');
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      onDone?.();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      onDone?.();
    };
    window.speechSynthesis.speak(utterance);
  };

  const resumeListeningIfNeeded = () => {
    if (!sessionActiveRef.current || isThinking) return;
    window.setTimeout(() => {
      if (sessionActiveRef.current) {
        startListening();
      }
    }, 220);
  };

  const sendMessage = async (inputText) => {
    const clean = (inputText || '').trim();
    if (!clean || isThinking) return;

    const nextHistory = messages
      .filter((item) => item.role === 'user' || item.role === 'assistant')
      .map((item) => ({ role: item.role, content: item.content }));

    appendMessage('user', clean);
    setDraftText('');
    setError('');

    if (looksLikeGoodbye(clean)) {
      const goodbye = 'Okay. Ending the session now. Come back whenever you want to continue.';
      appendMessage('assistant', goodbye, { sources: [] });
      speakText(goodbye, () => {
        forceStopSession();
      });
      return;
    }

    setIsThinking(true);
    setStatus('Teacher is thinking...');

    try {
      const response = await aiTeacherAPI.chat({
        message: clean,
        history: nextHistory,
        profile_type: profileType,
        topic_focus: topicFocus,
      });

      appendMessage('assistant', response.answer, {
        sources: Array.isArray(response.sources) ? response.sources : [],
      });

      speakText(response.answer, () => {
        setStatus('Ready for your next doubt');
        resumeListeningIfNeeded();
      });
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to get teacher response.');
      setStatus('Request failed');
      if (sessionActiveRef.current) {
        resumeListeningIfNeeded();
      }
    } finally {
      setIsThinking(false);
    }
  };

  const startListening = () => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setError('Speech recognition is not supported in this browser. Use Chrome or Edge.');
      return;
    }
    if (!sessionActiveRef.current || isThinking || isSpeaking) return;

    if (recognitionRef.current) {
      return;
    }

    setError('');
    setStatus('Listening...');
    shouldResumeRef.current = true;
    const recognition = new Recognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalText += text;
        } else {
          interim += text;
        }
      }

      const mergedFinal = [pendingSpeechRef.current, finalText].filter(Boolean).join(' ').trim();
      if (mergedFinal) {
        pendingSpeechRef.current = mergedFinal;
      }

      setDraftText((mergedFinal || interim || '').trimStart());

      if (speechPauseTimerRef.current) {
        window.clearTimeout(speechPauseTimerRef.current);
        speechPauseTimerRef.current = null;
      }

      if ((mergedFinal || interim).trim()) {
        setStatus('Listening... pause to continue, or wait for reply');
      }

      if (mergedFinal) {
        speechPauseTimerRef.current = window.setTimeout(() => {
          const textToSend = pendingSpeechRef.current.trim();
          pendingSpeechRef.current = '';
          speechPauseTimerRef.current = null;
          shouldResumeRef.current = false;
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch {}
            recognitionRef.current = null;
          }
          setIsListening(false);
          sendMessage(textToSend);
        }, SPEECH_PAUSE_MS);
      }
    };

    recognition.onerror = (event) => {
      recognitionRef.current = null;
      setError(event.error === 'not-allowed' ? 'Microphone permission was denied.' : `Speech recognition error: ${event.error}`);
      setStatus('Mic error');
      setIsListening(false);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      if (speechPauseTimerRef.current) {
        return;
      }
      if (sessionActiveRef.current && shouldResumeRef.current && !isThinking && !isSpeaking) {
        window.setTimeout(() => {
          if (sessionActiveRef.current) {
            startListening();
          }
        }, 250);
      } else if (sessionActiveRef.current) {
        setStatus('Ready');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const startSession = () => {
    if (!speechSupported) {
      setError('Speech recognition is not supported in this browser. Use Chrome or Edge.');
      return;
    }
    sessionActiveRef.current = true;
    setSessionActive(true);
    setError('');
    setStatus('Starting session...');

    const greeting = topicFocus
      ? `Hello. I am ready to help you with ${topicFocus}. Ask your first question.`
      : 'Hello. I am ready. Ask your first question whenever you want.';

    appendMessage('assistant', greeting, { sources: [] });
    if (teacherConfig?.face_enabled) {
      aiTeacherAPI.createFaceSession({
        profile_type: profileType,
        topic_focus: topicFocus,
      })
        .then((data) => {
          setFaceSession(data);
          setFaceError('');
        })
        .catch((err) => {
          setFaceSession(null);
          setFaceError(err?.response?.data?.error || 'Realistic face session could not be started.');
        });
    } else {
      setFaceSession(null);
      setFaceError('');
    }
    speakText(greeting, () => {
      resumeListeningIfNeeded();
    });
  };

  const handleTextSend = () => {
    if (!sessionActiveRef.current) {
      sessionActiveRef.current = true;
      setSessionActive(true);
    }
    sendMessage(draftText);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <Card>
          <CardContent className="p-8 text-slate-600">Loading AI Teacher...</CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="space-y-4 p-8">
            <Badge variant="outline">AI Teacher</Badge>
            <h1 className="text-3xl font-bold text-slate-900">Login required</h1>
            <p className="text-slate-600">AI Teacher is available to logged-in users only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#e2e8f0_55%,_#cbd5e1)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-slate-200 bg-white/90 shadow-xl backdrop-blur">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-3">
                <Badge variant="outline" className="gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Seamless AI Teacher
                </Badge>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">AI Teacher</h1>
                <p className="max-w-2xl text-slate-600">
                  Press <strong>Start</strong> once and talk naturally. The teacher keeps listening and answering until you press <strong>Stop</strong> or say <strong>bye</strong>.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Active profile</label>
                  <div className="flex h-11 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm capitalize text-slate-700">
                    {profileType || 'general'}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Model</label>
                  <div className="flex h-11 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                    {teacherConfig?.model || 'Loading...'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Topic focus</label>
                <Input
                  value={topicFocus}
                  onChange={(e) => setTopicFocus(e.target.value)}
                  placeholder="Example: limits, recursion, quadratic functions"
                  disabled={sessionActive}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Ask by text too</label>
                <div className="flex gap-2">
                  <Input
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    placeholder="Type your doubt here"
                    disabled={isThinking}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleTextSend();
                      }
                    }}
                  />
                  <Button onClick={handleTextSend} disabled={!draftText.trim() || isThinking}>
                    Send
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={startSession}
                  disabled={!speechSupported || sessionActive || isThinking || isSpeaking}
                  className="gap-2 bg-slate-900 hover:bg-slate-800"
                >
                  <Mic className="h-4 w-4" />
                  Start
                </Button>
                <Button
                  onClick={forceStopSession}
                  disabled={!sessionActive && !isThinking && !isSpeaking}
                  variant="outline"
                  className="gap-2"
                >
                  <MicOff className="h-4 w-4" />
                  Stop
                </Button>
                <Button
                  onClick={() => setSpeechOutputEnabled((prev) => !prev)}
                  variant="outline"
                  className="gap-2"
                >
                  {speechOutputEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  {speechOutputEnabled ? 'Voice On' : 'Voice Off'}
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-slate-700">
                    {isListening ? <Mic className="h-4 w-4 text-sky-600" /> : <MicOff className="h-4 w-4" />}
                    Listening
                  </div>
                  <div className="text-sm text-slate-600">{isListening ? 'Student microphone is active' : 'Waiting'}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-slate-700">
                    <Bot className="h-4 w-4" />
                    Teacher
                  </div>
                  <div className="text-sm text-slate-600">{isThinking ? 'Thinking' : isSpeaking ? 'Answering aloud' : 'Ready'}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-slate-700">
                    {isThinking ? <Loader2 className="h-4 w-4 animate-spin text-amber-600" /> : <Sparkles className="h-4 w-4" />}
                    Session
                  </div>
                  <div className={`text-sm ${isThinking ? 'font-semibold text-amber-700' : 'text-slate-600'}`}>{status}</div>
                </div>
              </div>

              {isThinking ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    AI Teacher is preparing the next explanation...
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                This version uses continuous browser speech input and browser voice output. For best results, use Chrome or Edge and allow microphone access.
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
              ) : null}
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
            <Card className="border-slate-200 bg-white/90 shadow-xl backdrop-blur">
              <CardContent className="p-3 sm:p-4">
                <div className="flex justify-end">
                  <TabsList className="grid w-full max-w-sm grid-cols-2">
                    <TabsTrigger value="face">Board</TabsTrigger>
                    <TabsTrigger value="conversation">Conversation</TabsTrigger>
                  </TabsList>
                </div>
              </CardContent>
            </Card>

            <TabsContent value="face" className="pt-0">
              <Card className="border-slate-200 bg-white/90 shadow-xl backdrop-blur">
                <CardContent className="space-y-5 p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">Face</h2>
                      <p className="text-sm text-slate-600">Whiteboard view for the ongoing teaching session.</p>
                    </div>
                    <Badge variant={sessionActive ? 'default' : 'outline'} className={sessionActive ? 'bg-emerald-600' : ''}>
                      {sessionActive ? 'Live Session' : 'Idle'}
                    </Badge>
                  </div>

                  {faceSession?.conversation_url ? (
                    <div className="space-y-3">
                      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 shadow-2xl">
                        <iframe
                          src={faceSession.conversation_url}
                          title="AI Teacher Face Session"
                          allow="camera; microphone; autoplay; fullscreen"
                          className="h-[680px] w-full border-0"
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        Realistic face mode is powered by Tavus and uses an embedded live video conversation session.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <WhiteboardTeacher
                        mode={isThinking ? 'thinking' : sessionActive ? 'session' : 'idle'}
                        speaking={isSpeaking}
                        listening={isListening}
                        topicFocus={topicFocus}
                        points={boardPoints}
                      />
                      {teacherConfig?.face_enabled ? null : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                          Board mode is active. The teacher writes the important teaching points here while speaking.
                        </div>
                      )}
                      {faceError ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{faceError}</div>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conversation" className="space-y-4 pt-0">
              <Card className="border-slate-200 bg-white/90 shadow-xl backdrop-blur">
                <CardContent className="space-y-5 p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">Conversation</h2>
                      <p className="text-sm text-slate-600">Recent turns between you and the AI teacher.</p>
                    </div>
                    <Badge variant={sessionActive ? 'default' : 'outline'} className={sessionActive ? 'bg-emerald-600' : ''}>
                      {sessionActive ? 'Live Session' : 'Idle'}
                    </Badge>
                  </div>

                  <div className="min-h-[640px] space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    {transcriptItems.length ? transcriptItems.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                          item.role === 'assistant'
                            ? 'mr-6 bg-white text-slate-800 shadow-sm'
                            : 'ml-6 bg-slate-900 text-white'
                        }`}
                      >
                        <div className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${item.role === 'assistant' ? 'text-slate-500' : 'text-slate-300'}`}>
                          {item.role === 'assistant' ? 'AI Teacher' : 'You'}
                        </div>
                        <div>{item.content}</div>
                        {item.role === 'assistant' && Array.isArray(item.sources) && item.sources.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                            {item.sources.map((source) => (
                              <a
                                key={`${item.id}-${source.url}`}
                                href={source.url}
                                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                              >
                                {source.type === 'note' ? 'Note' : 'Question Bank'}: {source.label}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )) : (
                      <div className="flex min-h-[600px] items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 text-center text-sm text-slate-500">
                        Start the session and begin speaking. The teacher will continue until you stop it or say bye.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
