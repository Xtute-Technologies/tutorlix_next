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

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function AITeacherPage() {
  const { user, loading } = useAuth();
  const { profileType } = useProfile();
  const [topicFocus, setTopicFocus] = useState('');
  const [status, setStatus] = useState('Idle');
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [messages, setMessages] = useState([]);
  const [teacherConfig, setTeacherConfig] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechOutputEnabled, setSpeechOutputEnabled] = useState(true);
  const recognitionRef = useRef(null);

  const transcriptItems = useMemo(() => messages.slice(-14), [messages]);

  useEffect(() => {
    setSpeechSupported(!!getSpeechRecognition());
    aiTeacherAPI.getStatus().then(setTeacherConfig).catch(() => null);
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
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

  const speakText = (text) => {
    if (!speechOutputEnabled || typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.97;
    utterance.pitch = 1;
    utterance.lang = 'en-IN';
    window.speechSynthesis.speak(utterance);
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
    setIsThinking(true);
    setStatus('Teacher is thinking...');

    try {
      const response = await aiTeacherAPI.chat({
        message: clean,
        history: nextHistory,
        profile_type: profileType,
        topic_focus: topicFocus,
      });

      appendMessage('assistant', response.answer, { sources: Array.isArray(response.sources) ? response.sources : [] });
      speakText(response.answer);
      setStatus('Ready for your next doubt');
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to get teacher response.');
      setStatus('Request failed');
    } finally {
      setIsThinking(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const startListening = () => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setError('Speech recognition is not supported in this browser. Use Chrome or Edge.');
      return;
    }

    setError('');
    setStatus('Listening...');
    const recognition = new Recognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = false;
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

      setDraftText((finalText || interim || '').trimStart());

      if (finalText.trim()) {
        stopListening();
        sendMessage(finalText);
      }
    };

    recognition.onerror = (event) => {
      setError(event.error === 'not-allowed' ? 'Microphone permission was denied.' : `Speech recognition error: ${event.error}`);
      setStatus('Mic error');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setStatus((current) => (current === 'Listening...' ? 'Idle' : current));
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <Card><CardContent className="p-8 text-slate-600">Loading AI Teacher...</CardContent></Card>
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
            <p className="text-slate-600">Phase 1 AI Teacher is available to logged-in users only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#e2e8f0_55%,_#cbd5e1)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-slate-200 bg-white/90 shadow-xl backdrop-blur">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-3">
                <Badge variant="outline" className="gap-2"><Sparkles className="h-3.5 w-3.5" /> Phase 2 Grounded Teacher</Badge>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">AI Teacher</h1>
                <p className="max-w-2xl text-slate-600">
                  Voice-powered doubt solving using browser speech and an open-source model running through Ollama on your backend.
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
                  disabled={isThinking || isListening}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Ask by text too</label>
                <div className="flex gap-2">
                  <Input
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    placeholder="Type your doubt or use the microphone"
                    disabled={isThinking}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        sendMessage(draftText);
                      }
                    }}
                  />
                  <Button onClick={() => sendMessage(draftText)} disabled={!draftText.trim() || isThinking}>
                    Send
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={isListening ? stopListening : startListening}
                  disabled={!speechSupported || isThinking}
                  className="gap-2 bg-slate-900 hover:bg-slate-800"
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {isListening ? 'Stop Listening' : 'Speak to Teacher'}
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
                  <div className="mb-2 flex items-center gap-2 text-slate-700"><Mic className="h-4 w-4" /> Speech Input</div>
                  <div className="text-sm text-slate-600">{speechSupported ? 'Browser speech recognition ready' : 'Browser speech recognition unavailable'}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-slate-700"><Bot className="h-4 w-4" /> Model Backend</div>
                  <div className="text-sm text-slate-600">{teacherConfig?.provider === 'ollama' ? 'Ollama open-source runtime with Tutorlix grounding' : 'Checking backend'}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-slate-700">{isThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Status</div>
                  <div className="text-sm text-slate-600">{status}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Run Ollama on the backend machine, for example:
                <div className="mt-2 font-mono text-xs text-amber-900">ollama pull qwen2.5:3b-instruct</div>
                <div className="mt-1 font-mono text-xs text-amber-900">ollama serve</div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white/90 shadow-xl backdrop-blur">
            <CardContent className="space-y-5 p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Conversation</h2>
                  <p className="text-sm text-slate-600">Recent turns between you and the AI teacher.</p>
                </div>
                <Badge variant={isListening ? 'default' : 'outline'} className={isListening ? 'bg-emerald-600' : ''}>
                  {isListening ? 'Listening' : 'Ready'}
                </Badge>
              </div>

              <div className="min-h-[420px] space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
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
                  <div className="flex min-h-[380px] items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 text-center text-sm text-slate-500">
                    Ask your first doubt by text or voice.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
