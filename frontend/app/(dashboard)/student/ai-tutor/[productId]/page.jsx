'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  BarVisualizer,
  LiveKitRoom,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  useVoiceAssistant,
} from '@livekit/components-react';
import { AlertCircle, Bot, CheckCircle2, Code2, Loader2, PhoneOff, Sparkles, Wand2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CodeEditor from '@/components/tests/CodeEditor';
import { SpacebarMicShortcut } from '@/components/livekit/LiveKitMediaControls';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { aiTutorAPI } from '@/lib/lmsService';

const stateLabels = {
  connecting: 'Connecting',
  'pre-connect-buffering': 'Connecting',
  initializing: 'Preparing',
  idle: 'Ready',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  failed: 'Unavailable',
  disconnected: 'Disconnected',
};

const errorText = (err, fallback) => {
  const data = err.response?.data;
  const value = data?.detail || data?.livekit || data?.error || data?.non_field_errors;
  if (Array.isArray(value)) return value.join(' ');
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return Object.values(value).flat().join(' ');
  return fallback;
};

const languageOptions = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
];

const starterCode = {
  python: '# Write or paste your code here.\n# Add the expected behavior below before checking.\n\n',
  javascript: '// Write or paste your code here.\n// Add the expected behavior below before checking.\n\n',
  typescript: '// Write or paste your code here.\n// Add the expected behavior below before checking.\n\n',
  java: '// Write or paste your code here.\n// Add the expected behavior below before checking.\n\n',
  cpp: '// Write or paste your code here.\n// Add the expected behavior below before checking.\n\n',
  c: '// Write or paste your code here.\n// Add the expected behavior below before checking.\n\n',
};

let kokoroModelPromise = null;
let currentKokoroAudio = null;

const getKokoroModel = async () => {
  if (!kokoroModelPromise) {
    kokoroModelPromise = import('kokoro-js').then(({ KokoroTTS }) =>
      KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
        dtype: 'q8',
      })
    );
  }

  return kokoroModelPromise;
};

const speakWithKokoro = async (text) => {
  const cleanText = text?.trim();
  if (!cleanText) return;

  if (currentKokoroAudio) {
    currentKokoroAudio.pause();
    currentKokoroAudio = null;
  }

  const model = await getKokoroModel();

  const audio = await model.generate(cleanText, {
    voice: 'af_heart',
  });

  const blob = audio.toBlob();
  const url = URL.createObjectURL(blob);

  currentKokoroAudio = new Audio(url);

  currentKokoroAudio.onended = () => {
    URL.revokeObjectURL(url);
    currentKokoroAudio = null;
  };

  await currentKokoroAudio.play();
};

function CodeTutorPanel({ productId }) {
  const [language, setLanguage] = useState('python');
  const [goal, setGoal] = useState('');
  const [code, setCode] = useState(starterCode.python);
  const [review, setReview] = useState(null);
  const [checking, setChecking] = useState(false);
  const [codeError, setCodeError] = useState('');

  const handleLanguageChange = (value) => {
    setLanguage(value);
    setReview(null);
    setCode((current) => {
      const currentTrimmed = (current || '').trim();
      const isStarter = Object.values(starterCode).some((template) => template.trim() === currentTrimmed);
      return isStarter ? starterCode[value] : current;
    });
  };

  const handleCheckCode = async () => {
    const trimmed = (code || '').trim();
    if (!trimmed || trimmed === starterCode[language].trim()) {
      setCodeError('Add your code in the editor first.');
      return;
    }

    try {
      setChecking(true);
      setCodeError('');
      const data = await aiTutorAPI.reviewCode(productId, {
        code,
        language,
        goal,
      });
      setReview(data);
      if (data?.is_correct && data?.annotated_code) {
        setCode(data.annotated_code);
      } else if (data?.corrected_code) {
        setCode(data.corrected_code);
      } else if (data?.annotated_code) {
        setCode(data.annotated_code);
      }
    } catch (err) {
      setCodeError(errorText(err, 'Could not check this code with Groq.'));
    } finally {
      setChecking(false);
    }
  };

  const applyAnnotatedCode = () => {
    if (review?.annotated_code) setCode(review.annotated_code);
  };

  const applyCorrectedCode = () => {
    if (review?.corrected_code) setCode(review.corrected_code);
  };

  return (
    <div className="flex min-h-[520px] flex-col rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-950">Code Tutor</h2>
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-800">
              Groq
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">Write code, then get inline comments and corrections.</p>
        </div>

        <Select value={language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {languageOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <Textarea
          className="min-h-20 resize-none"
          placeholder="What should this code do? Example: reverse a linked list in O(n), handle empty input, and return the new head."
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
        />

        {codeError ? (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
            <span>{codeError}</span>
          </div>
        ) : null}

        <CodeEditor
          value={code}
          onChange={setCode}
          language={language}
          height={420}
          title="ai_tutor"
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" onClick={handleCheckCode} disabled={checking}>
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Check Code
          </Button>

          {review ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={applyAnnotatedCode} disabled={!review.annotated_code}>
                Comments
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={applyCorrectedCode} disabled={!review.corrected_code}>
                Correction
              </Button>
            </div>
          ) : null}
        </div>

        {review ? (
          <div
            className={`rounded-md border p-4 text-sm ${
              review.is_correct
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-amber-200 bg-amber-50 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-2">
              {review.is_correct ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
              )}
              <div className="min-w-0">
                <div className="font-semibold">{review.summary || (review.is_correct ? 'Looks correct.' : 'Needs correction.')}</div>
                {Array.isArray(review.issues) && review.issues.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {review.issues.map((issue, index) => (
                      <li key={`${issue}-${index}`}>{issue}</li>
                    ))}
                  </ul>
                ) : null}
                {review.next_task ? (
                  <p className="mt-3 font-medium">Next: {review.next_task}</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TutorStage({ course, dispatchError, onRetry }) {
  const { state, audioTrack, agent, agentTranscriptions } = useVoiceAssistant();
  const [agentTimedOut, setAgentTimedOut] = useState(false);
  const [kokoroStatus, setKokoroStatus] = useState('');
  const lastSpokenRef = useRef('');
  const label = stateLabels[state] || 'Connecting';

  useEffect(() => {
    if (agent || dispatchError) {
      setAgentTimedOut(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setAgentTimedOut(true);
    }, 30000);

    return () => window.clearTimeout(timeoutId);
  }, [agent, dispatchError]);

  const recentTranscript = useMemo(() => {
    return agentTranscriptions
      .filter((segment) => segment?.text)
      .slice(-4)
      .map((segment) => segment.text)
      .join(' ');
  }, [agentTranscriptions]);

  useEffect(() => {
    if (!recentTranscript) return;
    if (recentTranscript === lastSpokenRef.current) return;

    lastSpokenRef.current = recentTranscript;

    let cancelled = false;

    setKokoroStatus('Preparing voice...');

    speakWithKokoro(recentTranscript)
      .then(() => {
        if (!cancelled) setKokoroStatus('');
      })
      .catch((err) => {
        console.error('Kokoro TTS failed:', err);
        if (!cancelled) setKokoroStatus('Voice playback failed. Check console.');
      });

    return () => {
      cancelled = true;
    };
  }, [recentTranscript]);

  useEffect(() => {
    return () => {
      if (currentKokoroAudio) {
        currentKokoroAudio.pause();
        currentKokoroAudio = null;
      }
    };
  }, []);

  return (
    <div className="flex min-h-[520px] flex-col rounded-md border border-slate-800 bg-slate-950 text-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-sky-300" />
            <h1 className="truncate text-lg font-semibold">AI Tutor</h1>
            <Badge variant="outline" className="border-white/20 text-slate-200">
              {label}
            </Badge>
          </div>
          <p className="mt-1 truncate text-sm text-slate-300">
            {course?.name || 'Course doubt call'}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Sparkles className="h-4 w-4 text-sky-300" />
          <span>{agent ? agent.name || 'Tutor connected' : 'Waiting for tutor'}</span>
        </div>
      </div>

      {dispatchError ? (
        <div className="border-b border-amber-400/30 bg-amber-950/70 px-5 py-3 text-sm text-amber-100">
          {dispatchError}
        </div>
      ) : null}

      {kokoroStatus ? (
        <div className="border-b border-sky-400/30 bg-sky-950/60 px-5 py-3 text-sm text-sky-100">
          {kokoroStatus}
        </div>
      ) : null}

      {agentTimedOut ? (
        <div className="flex flex-col gap-3 border-b border-amber-400/30 bg-amber-950/70 px-5 py-3 text-sm text-amber-100 md:flex-row md:items-center md:justify-between">
          <span>
            The call room is open, but no AI tutor worker has joined yet. Make sure the
            LiveKit AI tutor worker is running with the same agent name as the backend.
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-fit border-amber-200/40 bg-amber-100/10 text-amber-50 hover:bg-amber-100/20"
            onClick={onRetry}
          >
            Retry
          </Button>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-5 py-8 text-center">
        <div className="grid size-32 place-items-center rounded-full border border-sky-300/30 bg-sky-400/10 shadow-[0_0_70px_rgba(56,189,248,0.16)]">
          <Bot className="h-16 w-16 text-sky-200" />
        </div>

        <div className="w-full max-w-2xl space-y-4">
          <BarVisualizer
            state={state}
            trackRef={audioTrack}
            barCount={28}
            className="mx-auto h-16 w-full max-w-xl"
          />
          <p className="text-sm text-slate-300">
            {state === 'listening'
              ? 'Ask your doubt clearly.'
              : state === 'thinking'
                ? 'Working through the answer.'
                : state === 'speaking'
                  ? 'Tutor is answering.'
                  : agent
                    ? 'Tutor is ready.'
                    : agentTimedOut
                      ? 'Waiting for the AI tutor worker.'
                      : 'Connecting the course tutor.'}
          </p>
        </div>

        {recentTranscript ? (
          <div className="w-full max-w-2xl rounded-md border border-white/10 bg-white/5 p-4 text-left">
            <div className="mb-2 text-xs font-semibold uppercase text-slate-400">
              Recent tutor transcript
            </div>
            <p className="max-h-32 overflow-y-auto text-sm leading-6 text-slate-100">
              {recentTranscript}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex justify-center border-t border-white/10 bg-slate-900 px-4 py-4">
        <VoiceAssistantControlBar className="lk-agent-control-bar" />
      </div>

      <RoomAudioRenderer />
    </div>
  );
}

export default function StudentAITutorCallPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId;

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roomError, setRoomError] = useState('');

  const loadSession = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      setRoomError('');
      const data = await aiTutorAPI.joinCourse(productId);
      setSession(data);
    } catch (err) {
      setError(errorText(err, 'Could not start this AI tutor call.'));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const dispatchError = session?.agent_dispatch?.ok === false
    ? 'The AI tutor could not join this room. Please try again shortly or contact support.'
    : '';

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="mx-auto max-w-2xl rounded-md border border-red-200 bg-red-50 p-5 text-red-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-none" />
          <div>
            <h1 className="text-lg font-semibold">Unable to start AI tutor call</h1>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
        <Button variant="outline" className="mt-5" onClick={() => router.push('/student/ai-tutor')}>
          Back to AI Tutor
        </Button>
      </div>
    );
  }

  return (
    <LiveKitRoom
      key={session?.room_name}
      serverUrl={session?.server_url}
      token={session?.token}
      connect
      audio
      video={false}
      data-lk-theme="default"
      onError={(err) => setRoomError(err?.message || 'LiveKit connection failed.')}
      onDisconnected={() => router.push('/student/ai-tutor')}
      className="block"
    >
      <SpacebarMicShortcut onError={setRoomError} />

      {roomError ? (
        <div className="mb-4 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{roomError}</span>
        </div>
      ) : null}

      <div className="mb-4 flex justify-end">
        <Button variant="outline" onClick={() => router.push('/student/ai-tutor')}>
          <PhoneOff className="h-4 w-4" />
          Leave
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]">
        <TutorStage course={session?.course} dispatchError={dispatchError} onRetry={loadSession} />
        <CodeTutorPanel productId={productId} />
      </div>
    </LiveKitRoom>
  );
}
