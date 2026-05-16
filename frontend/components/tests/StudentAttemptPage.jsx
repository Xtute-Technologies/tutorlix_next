'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Loader2, Lock, Play, Terminal, Upload } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { testAttemptAPI } from '@/lib/lmsService';
import CodeEditor from '@/components/tests/CodeEditor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TIMER_WARNING_SECONDS = 5 * 60;

function parseDateMs(value) {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatExecutionTime(durationMs) {
  if (!Number.isFinite(Number(durationMs))) return '';
  if (Number(durationMs) >= 1000) {
    return `${(Number(durationMs) / 1000).toFixed(2)}s`;
  }
  return `${Number(durationMs)}ms`;
}

function getAttemptTimer(attempt, nowMs) {
  const startedMs = parseDateMs(attempt?.started_at);
  const storedElapsedSeconds = Math.max(0, Math.floor(Number(attempt?.time_spent_seconds || 0)));
  const durationSeconds = Math.max(0, Number(attempt?.test_detail?.duration_minutes || 0) * 60);
  let elapsedSeconds = storedElapsedSeconds;

  if (attempt?.status === 'in_progress') {
    const resumedMs = parseDateMs(attempt?.last_resumed_at);
    if (resumedMs) {
      elapsedSeconds += Math.max(0, Math.floor((nowMs - resumedMs) / 1000));
    } else if (!startedMs && storedElapsedSeconds === 0) {
      return null;
    }
  } else if (storedElapsedSeconds === 0 && startedMs) {
    const submittedMs = parseDateMs(attempt?.submitted_at);
    const lockedMs = attempt?.status === 'locked' ? parseDateMs(attempt?.locked_at) : null;
    const endMs = submittedMs || lockedMs;
    if (endMs) {
      elapsedSeconds = Math.max(0, Math.floor((endMs - startedMs) / 1000));
    }
  } else if (!startedMs && storedElapsedSeconds === 0) {
    return null;
  }

  const remainingSeconds = durationSeconds ? Math.max(0, durationSeconds - elapsedSeconds) : null;

  return {
    elapsedSeconds,
    remainingSeconds,
    isOverdue: Boolean(durationSeconds && elapsedSeconds >= durationSeconds),
    isWarning: remainingSeconds !== null && remainingSeconds <= TIMER_WARNING_SECONDS,
  };
}

export default function StudentAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [attempt, setAttempt] = useState(null);
  const [draftAnswers, setDraftAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [codeRuns, setCodeRuns] = useState({});
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const autosaveTimer = useRef(null);
  const lockingRef = useRef(false);
  const lockSuppressionUntilRef = useRef(0);
  const autoSubmitRef = useRef(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!user || user.role !== 'student') {
      router.push('/dashboard');
      return;
    }
    fetchAttempt();
  }, [params.attemptId, router, user]);

  const fetchAttempt = async () => {
    try {
      setLoading(true);
      const id = Array.isArray(params.attemptId) ? params.attemptId[0] : params.attemptId;
      const data = await testAttemptAPI.getById(id);
      setAttempt(data);
      const answers = {};
      (data.answers || []).forEach((answer) => {
        answers[answer.question] = {
          selected_options: answer.selected_options || [],
          subjective_answer: answer.subjective_answer || '',
          code_answer: answer.code_answer || '',
          code_language: answer.code_language || '',
          uploaded_file_url: answer.uploaded_file_url || '',
          awarded_marks: answer.awarded_marks ?? '0',
          review_comment: answer.review_comment || '',
          reviewed_at: answer.reviewed_at || '',
        };
      });
      setDraftAnswers(answers);
    } catch (error) {
      console.error('Failed to fetch attempt', error);
      setMessage({ type: 'error', text: 'Failed to load test attempt.' });
    } finally {
      setLoading(false);
    }
  };

  const questions = attempt?.questions || [];
  const currentQuestion = questions[attempt?.current_question_index || 0];
  const currentAnswer = currentQuestion ? draftAnswers[currentQuestion.id] || {} : {};
  const timerStats = useMemo(() => getAttemptTimer(attempt, nowMs), [attempt, nowMs]);

  const persistAnswer = async (question, answerOverride = null, currentQuestionIndexOverride = null) => {
    if (!attempt || !question || attempt.status !== 'in_progress') return;
    const answer = answerOverride || draftAnswers[question.id] || {};
    const currentIndexValue = currentQuestionIndexOverride ?? attempt.current_question_index ?? 0;
    const payload = new FormData();
    payload.append('question', String(question.id));
    payload.append('current_question_index', String(currentIndexValue));
    (answer.selected_options || []).forEach((option) => payload.append('selected_options', option));
    payload.append('subjective_answer', answer.subjective_answer || '');
    payload.append('code_answer', answer.code_answer || '');
    payload.append('code_language', answer.code_language || '');
    if (answer.uploaded_file instanceof File) {
      payload.append('uploaded_file', answer.uploaded_file);
    }

    const saved = await testAttemptAPI.saveAnswer(attempt.id, payload);
    setDraftAnswers((prev) => ({
      ...prev,
      [question.id]: (() => {
        const nextAnswer = {
          ...prev[question.id],
          ...saved,
          uploaded_file_url: saved.uploaded_file_url || prev[question.id]?.uploaded_file_url || '',
        };
        delete nextAnswer.uploaded_file;
        return nextAnswer;
      })(),
    }));
  };

  const lockAttempt = async (reason) => {
    if (!attempt || lockingRef.current || attempt.status !== 'in_progress') return;
    lockingRef.current = true;
    setLocking(true);
    try {
      if (currentQuestion) {
        await persistAnswer(currentQuestion);
      }
      const locked = await testAttemptAPI.lock(attempt.id, reason);
      setAttempt(locked);
    } catch (error) {
      console.error('Failed to lock attempt', error);
    } finally {
      setLocking(false);
      lockingRef.current = false;
    }
  };

  const suppressLockTemporarily = (durationMs = 5000) => {
    lockSuppressionUntilRef.current = Date.now() + durationMs;
  };

  const shouldSuppressLock = () => Date.now() < lockSuppressionUntilRef.current;

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !shouldSuppressLock()) {
        lockAttempt('Window or tab switch detected.');
      }
    };
    const handleBlur = () => {
      if (shouldSuppressLock()) return;
      lockAttempt('Window or tab switch detected.');
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [attempt, currentQuestion, draftAnswers]);

  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress' || !currentQuestion) return;
    if (!['subjective', 'coding'].includes(currentQuestion.question_type)) return;

    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }

    autosaveTimer.current = setTimeout(() => {
      persistAnswer(currentQuestion).catch((error) => console.error('Autosave failed', error));
    }, 900);

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [
    attempt?.id,
    attempt?.status,
    attempt?.current_question_index,
    currentQuestion?.id,
    currentQuestion?.question_type,
    currentAnswer.subjective_answer,
    currentAnswer.code_answer,
    currentAnswer.code_language,
  ]);

  useEffect(() => {
    if (!attempt?.started_at || attempt.status !== 'in_progress') return;

    setNowMs(Date.now());
    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [attempt?.started_at, attempt?.status]);

  const updateAttemptIndex = (nextIndex) => {
    setAttempt((prev) => ({ ...prev, current_question_index: nextIndex }));
  };

  const handleQuestionSelect = (nextIndex) => {
    if (attempt?.status === 'in_progress') {
      saveAndNavigate(nextIndex);
      return;
    }
    updateAttemptIndex(nextIndex);
  };

  const saveAndNavigate = async (nextIndex) => {
    try {
      if (currentQuestion) {
        const payload = {
          ...(draftAnswers[currentQuestion.id] || {}),
        };
        await persistAnswer(currentQuestion, payload, nextIndex);
      }
      updateAttemptIndex(nextIndex);
    } catch (error) {
      console.error('Failed to save answer', error);
      setMessage({ type: 'error', text: 'Failed to save answer.' });
    }
  };

  const handleSubmit = async ({ automatic = false } = {}) => {
    if (!attempt || attempt.status !== 'in_progress' || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
        autosaveTimer.current = null;
      }
      if (currentQuestion) {
        try {
          await persistAnswer(currentQuestion);
        } catch (error) {
          console.error('Failed to save answer before submit', error);
          if (!automatic) {
            throw error;
          }
        }
      }
      const submitted = await testAttemptAPI.submit(attempt.id);
      setAttempt(submitted);
      setMessage({
        type: 'success',
        text: automatic
          ? 'Time is up. Your test was submitted automatically.'
          : 'Test submitted successfully.',
      });
    } catch (error) {
      console.error('Failed to submit attempt', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || (
          automatic
            ? 'Time is up, but automatic submission failed. Please submit the test now.'
            : 'Failed to submit test.'
        ),
      });
      if (automatic) {
        autoSubmitRef.current = false;
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  useEffect(() => {
    autoSubmitRef.current = false;
    submittingRef.current = false;
  }, [attempt?.id]);

  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress') return;
    if (timerStats?.remainingSeconds !== 0) return;
    if (autoSubmitRef.current) return;

    autoSubmitRef.current = true;
    handleSubmit({ automatic: true });
  }, [attempt?.id, attempt?.status, timerStats?.remainingSeconds]);

  const setAnswerValue = (questionId, patch) => {
    setDraftAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        ...patch,
      },
    }));
  };

  const setCodeRunValue = (questionId, patch) => {
    setCodeRuns((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        ...patch,
      },
    }));
  };

  const handleRunCode = async (question, codeValue, codeLanguage, stdin) => {
    if (!attempt || !question || attempt.status !== 'in_progress') return;

    setCodeRunValue(question.id, { running: true, error: '', result: null });
    try {
      await persistAnswer(question, {
        ...(draftAnswers[question.id] || {}),
        code_answer: codeValue || '',
        code_language: codeLanguage || '',
      });
      const result = await testAttemptAPI.runCode(attempt.id, {
        question: question.id,
        code: codeValue || '',
        language: codeLanguage || '',
        stdin: stdin || '',
      });
      setCodeRunValue(question.id, { running: false, result, error: '' });
    } catch (error) {
      console.error('Failed to run code', error);
      setCodeRunValue(question.id, {
        running: false,
        result: null,
        error: error.response?.data?.detail || 'Failed to run code.',
      });
    }
  };

  const renderQuestionBody = () => {
    if (!currentQuestion) return null;

    if (currentQuestion.question_type === 'multiple_choice') {
      const selectedOptions = currentAnswer.selected_options || [];
      return (
        <div className="space-y-3">
          {(currentQuestion.options || []).map((option) => (
            <label key={option} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer">
              <Checkbox
                checked={selectedOptions.includes(option)}
                disabled={attempt?.status !== 'in_progress'}
                onCheckedChange={async (checked) => {
                  const next = checked
                    ? [...selectedOptions, option]
                    : selectedOptions.filter((item) => item !== option);
                  setAnswerValue(currentQuestion.id, { selected_options: next });
                  try {
                    await persistAnswer(currentQuestion, { ...currentAnswer, selected_options: next });
                  } catch (error) {
                    console.error('Failed to save MCQ answer', error);
                  }
                }}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      );
    }

    if (currentQuestion.question_type === 'subjective') {
      return (
        <Textarea
          rows={10}
          value={currentAnswer.subjective_answer || ''}
          readOnly={attempt?.status !== 'in_progress'}
          onChange={(event) => setAnswerValue(currentQuestion.id, { subjective_answer: event.target.value })}
          placeholder="Write your answer here..."
        />
      );
    }

    if (currentQuestion.question_type === 'coding') {
      const codeLanguage = currentAnswer.code_language || currentQuestion.coding_language || 'python';
      const hasDraftCode = Object.prototype.hasOwnProperty.call(currentAnswer, 'code_answer');
      const codeValue = hasDraftCode ? currentAnswer.code_answer || '' : currentQuestion.starter_code || '';
      const runState = codeRuns[currentQuestion.id] || {};
      const runResult = runState.result;
      const stdoutText = runResult?.stdout || '';
      const stderrText = runResult?.stderr || '';
      const hasStdout = stdoutText.trim().length > 0;
      const hasStderr = stderrText.trim().length > 0;
      const outputText = runState.running
        ? 'Running...'
        : runState.error
          ? runState.error
          : runResult
            ? hasStdout
              ? stdoutText
              : runResult.success
                ? 'Program finished with no output.'
                : 'No standard output.'
            : 'No output yet.';

      return (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <Select
              value={codeLanguage}
              disabled={attempt?.status !== 'in_progress'}
              onValueChange={(value) => setAnswerValue(currentQuestion.id, { code_language: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {['python', 'javascript', 'java', 'cpp', 'c'].map((language) => (
                  <SelectItem key={language} value={language}>{language}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <CodeEditor
              height={520}
              language={codeLanguage}
              readOnly={attempt?.status !== 'in_progress'}
              title={`question-${(attempt.current_question_index || 0) + 1}`}
              value={codeValue}
              onChange={(value) => setAnswerValue(currentQuestion.id, { code_answer: value })}
            />
            <Textarea
              className="sr-only"
              value={codeValue}
              readOnly={attempt?.status !== 'in_progress'}
              onChange={(event) => setAnswerValue(currentQuestion.id, { code_answer: event.target.value })}
              aria-label="Code answer"
            />
          </div>

          <div className="min-w-0 rounded-lg border bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Terminal className="h-4 w-4" />
                Output
              </div>
              {runResult && (
                <span className="shrink-0 text-xs text-gray-500">
                  {runResult.timed_out ? 'Timed out' : `Exit ${runResult.exit_code ?? '-'}`}
                  {runResult.duration_ms !== undefined ? ` . ${formatExecutionTime(runResult.duration_ms)}` : ''}
                </span>
              )}
            </div>

            <Textarea
              className="mb-3 min-h-[110px] font-mono text-sm"
              value={runState.stdin || ''}
              readOnly={attempt?.status !== 'in_progress'}
              onChange={(event) => setCodeRunValue(currentQuestion.id, { stdin: event.target.value })}
              placeholder="Input (stdin)"
            />

            <Button
              className="mb-3 w-full"
              disabled={attempt?.status !== 'in_progress' || runState.running}
              onClick={() => handleRunCode(currentQuestion, codeValue, codeLanguage, runState.stdin)}
            >
              {runState.running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {runState.running ? 'Running' : 'Run code'}
            </Button>

            <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
              <pre className="min-h-[150px] max-h-[260px] overflow-auto whitespace-pre-wrap break-words p-3 text-xs leading-5 text-slate-100">{outputText}</pre>
              {hasStderr && (
                <div className="border-t border-slate-800">
                  <div className="px-3 pt-3 text-xs font-semibold uppercase tracking-wide text-red-300">
                    Errors
                  </div>
                  <pre className="max-h-[180px] overflow-auto whitespace-pre-wrap break-words p-3 text-xs leading-5 text-red-100">{stderrText}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (currentQuestion.question_type === 'file_upload') {
      const pendingFileName = currentAnswer.uploaded_file instanceof File ? currentAnswer.uploaded_file.name : '';

      return (
        <div className="space-y-4">
          <Input
            key={`file-upload-${currentQuestion.id}`}
            id={`file-upload-${currentQuestion.id}`}
            name={`file-upload-${currentQuestion.id}`}
            type="file"
            disabled={attempt?.status !== 'in_progress'}
            onClick={() => suppressLockTemporarily()}
            onKeyDown={() => suppressLockTemporarily()}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              suppressLockTemporarily();
              setAnswerValue(currentQuestion.id, { uploaded_file: file });
              try {
                await persistAnswer(currentQuestion, { ...currentAnswer, uploaded_file: file });
              } catch (error) {
                console.error('Failed to upload answer file', error);
                setMessage({ type: 'error', text: 'Failed to upload file.' });
              }
            }}
          />
          {pendingFileName && (
            <p className="text-xs text-gray-500">Selected for this question: {pendingFileName}</p>
          )}
          {currentAnswer.uploaded_file_url && (
            <a href={currentAnswer.uploaded_file_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline inline-flex items-center gap-2">
              <Upload className="h-4 w-4" />
              View this question&apos;s uploaded file
            </a>
          )}
          {currentQuestion.allowed_file_types && (
            <p className="text-xs text-gray-500">Allowed file types: {currentQuestion.allowed_file_types}</p>
          )}
        </div>
      );
    }

    return null;
  };

  const statusBadge = useMemo(() => {
    const status = attempt?.status || 'not_started';
    const variant = status === 'locked' ? 'destructive' : status === 'submitted' ? 'secondary' : 'default';
    return <Badge variant={variant}>{status.replace('_', ' ')}</Badge>;
  }, [attempt?.status]);
  const totalPossibleMarks = useMemo(
    () => questions.reduce((sum, question) => sum + Number(question.marks || 0), 0),
    [questions]
  );
  const reviewedCount = Number(attempt?.reviewed_count || 0);
  const hasVisibleReview = attempt?.status === 'submitted' || reviewedCount > 0;

  if (loading) {
    return <div className="p-8">Loading test...</div>;
  }

  if (!attempt) {
    return <div className="p-8">Attempt not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/student/scores" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Tests
          </Link>
          <h1 className="text-3xl font-bold mt-2">{attempt.test_detail?.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            {statusBadge}
            <span className="text-sm text-gray-500">{attempt.test_detail?.product_name}</span>
          </div>
        </div>
        {timerStats && (
          <Card
            className={`w-full p-4 lg:w-[300px] ${
              timerStats.isOverdue
                ? 'border-red-200 bg-red-50'
                : timerStats.isWarning
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-blue-100 bg-blue-50'
            }`}
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
              <Clock className="h-4 w-4" />
              Test Timer
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500">
                  {attempt.status === 'in_progress' ? 'Remaining' : 'Remaining at close'}
                </div>
                <div className={`mt-1 text-2xl font-semibold ${timerStats.isOverdue ? 'text-red-700' : 'text-gray-950'}`}>
                  {timerStats.remainingSeconds === null ? '-' : formatDuration(timerStats.remainingSeconds)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Elapsed</div>
                <div className="mt-1 text-2xl font-semibold text-gray-950">
                  {formatDuration(timerStats.elapsedSeconds)}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {message.text && (
        <Card className={`p-4 ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          {message.text}
        </Card>
      )}

      {attempt.status === 'locked' && (
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-3 text-red-700">
            <Lock className="h-5 w-5" />
            <div>
              <div className="font-semibold">This test is locked.</div>
              <div className="text-sm mt-1">
                {attempt.locked_reason || 'Window/tab switch detected.'} Only the creating teacher or admin can unlock it.
              </div>
            </div>
          </div>
        </Card>
      )}

      {attempt.status === 'submitted' && (
        <Card className="p-6 bg-green-50 border-green-200 text-green-800">
          <div className="font-medium">This test has been submitted successfully.</div>
          <div className="text-sm mt-1">
            {attempt.reviewed_at
              ? `Reviewed score: ${attempt.total_awarded_marks || '0.00'} / ${totalPossibleMarks.toFixed(2)}`
              : 'Your answers are submitted. Marks will appear here after review.'}
          </div>
        </Card>
      )}

      {hasVisibleReview && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <div className="text-xs text-gray-500">Score</div>
            <div className="mt-1 text-2xl font-semibold">
              {attempt.total_awarded_marks || '0.00'} / {totalPossibleMarks.toFixed(2)}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-gray-500">Reviewed Answers</div>
            <div className="mt-1 text-2xl font-semibold">{reviewedCount}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-gray-500">Reviewed At</div>
            <div className="mt-1 text-sm font-medium">{attempt.reviewed_at || 'Pending review'}</div>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <Card className="p-4 space-y-3 h-fit">
          <div className="text-sm font-semibold">Questions</div>
          {questions.map((question, index) => (
            <Button
              key={question.id}
              variant={index === (attempt.current_question_index || 0) ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => handleQuestionSelect(index)}
            >
              Q{index + 1}
            </Button>
          ))}
        </Card>

        <Card className="p-6 space-y-6">
          {currentQuestion ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{currentQuestion.question_type.replace('_', ' ')}</Badge>
                  <span className="text-sm text-gray-500">{currentQuestion.marks} marks</span>
                </div>
                <h2 className="text-xl font-semibold">{currentQuestion.title || `Question ${attempt.current_question_index + 1}`}</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{currentQuestion.prompt}</p>
                {currentQuestion.attachment_url && (
                  <a
                    href={currentQuestion.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 underline"
                    onClick={() => suppressLockTemporarily()}
                    onMouseDown={() => suppressLockTemporarily()}
                    onKeyDown={() => suppressLockTemporarily()}
                  >
                    Open question attachment
                  </a>
                )}
              </div>

              {renderQuestionBody()}

              {hasVisibleReview && (
                <Card className="border-blue-200 bg-blue-50 p-4">
                  <div className="text-sm font-medium text-blue-900">Review</div>
                  <div className="mt-2 text-sm text-blue-900">
                    Awarded marks: {currentAnswer.awarded_marks || '0.00'} / {currentQuestion.marks}
                  </div>
                  <div className="mt-2 text-sm text-blue-900 whitespace-pre-wrap">
                    {currentAnswer.review_comment || 'No review comment added yet.'}
                  </div>
                </Card>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  disabled={(attempt.current_question_index || 0) === 0}
                  onClick={() => handleQuestionSelect((attempt.current_question_index || 0) - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  {(attempt.current_question_index || 0) < questions.length - 1 ? (
                    <Button onClick={() => handleQuestionSelect((attempt.current_question_index || 0) + 1)}>
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    attempt.status === 'in_progress' ? (
                      <Button disabled={locking || submitting} onClick={() => handleSubmit()}>
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Test'
                        )}
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={() => router.push('/student/scores')}>
                        Back to Tests
                      </Button>
                    )
                  )}
                </div>
              </div>
            </>
          ) : (
            <div>No questions available.</div>
          )}
        </Card>
      </div>
    </div>
  );
}
