'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, FileText, Loader2, Lock, Play, Terminal, Unlock } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { testAttemptAPI, testQuestionAPI } from '@/lib/lmsService';
import CodeEditor from '@/components/tests/CodeEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function statusVariant(status) {
  if (status === 'locked') return 'destructive';
  if (status === 'submitted') return 'secondary';
  return 'default';
}

function formatQuestionType(type) {
  return (type || '').replaceAll('_', ' ') || 'question';
}

function isMcqOptionCorrect(option, correctOptions) {
  return Array.isArray(correctOptions) && correctOptions.includes(option);
}

function formatExecutionTime(durationMs) {
  if (!Number.isFinite(Number(durationMs))) return '';
  if (Number(durationMs) >= 1000) {
    return `${(Number(durationMs) / 1000).toFixed(2)}s`;
  }
  return `${Number(durationMs)}ms`;
}

export default function TestAttemptReviewPage({ role }) {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [attempt, setAttempt] = useState(null);
  const [questionDetails, setQuestionDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [unlocking, setUnlocking] = useState(false);
  const [gradingState, setGradingState] = useState({});
  const [codeRuns, setCodeRuns] = useState({});
  const [savingQuestionId, setSavingQuestionId] = useState(null);

  useEffect(() => {
    if (!user || user.role !== role) {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [params.attemptId, role, router, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const attemptId = Array.isArray(params.attemptId) ? params.attemptId[0] : params.attemptId;
      const attemptData = await testAttemptAPI.getById(attemptId);
      setAttempt(attemptData);
      const initialGradingState = {};
      (attemptData.answers || []).forEach((answer) => {
        initialGradingState[answer.question] = {
          awarded_marks: answer.awarded_marks ?? '0',
          review_comment: answer.review_comment || '',
        };
      });
      setGradingState(initialGradingState);
      const testId = attemptData?.test;
      if (testId) {
        const questionData = await testQuestionAPI.getAll({ test: testId });
        setQuestionDetails(Array.isArray(questionData) ? questionData : []);
      } else {
        setQuestionDetails([]);
      }
    } catch (error) {
      console.error('Failed to load attempt review', error);
      setMessage({ type: 'error', text: 'Failed to load submitted answers.' });
    } finally {
      setLoading(false);
    }
  };

  const basePath = role === 'admin' ? '/admin/test-scores' : '/teacher/test-scores';
  const questionDetailMap = useMemo(
    () => new Map(questionDetails.map((question) => [question.id, question])),
    [questionDetails]
  );
  const answerMap = useMemo(
    () => new Map((attempt?.answers || []).map((answer) => [answer.question, answer])),
    [attempt?.answers]
  );
  const orderedQuestions = useMemo(
    () => [...(attempt?.questions || [])].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [attempt?.questions]
  );
  const totalPossibleMarks = useMemo(
    () => orderedQuestions.reduce((sum, question) => sum + Number(question.marks || 0), 0),
    [orderedQuestions]
  );

  const setQuestionGradeValue = (questionId, patch) => {
    setGradingState((prev) => ({
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

  const handleRunSubmittedCode = async (question, stdin) => {
    if (!attempt?.id || !question?.id) return;

    setCodeRunValue(question.id, { running: true, error: '', result: null });
    try {
      const result = await testAttemptAPI.runCode(attempt.id, {
        question: question.id,
        stdin: stdin || '',
      });
      setCodeRunValue(question.id, { running: false, result, error: '' });
    } catch (error) {
      console.error('Failed to run submitted code', error);
      setCodeRunValue(question.id, {
        running: false,
        result: null,
        error: error.response?.data?.detail || 'Failed to run submitted code.',
      });
    }
  };

  const handleSaveGrade = async (question) => {
    if (!attempt?.id) return;
    const gradeData = gradingState[question.id] || {};
    try {
      setSavingQuestionId(question.id);
      const savedAnswer = await testAttemptAPI.gradeAnswer(attempt.id, {
        question: question.id,
        awarded_marks: gradeData.awarded_marks ?? '0',
        review_comment: gradeData.review_comment || '',
      });
      setAttempt((prev) => {
        if (!prev) return prev;
        const existingAnswers = Array.isArray(prev.answers) ? prev.answers : [];
        const hasAnswer = existingAnswers.some((answer) => answer.question === question.id);
        const nextAnswers = hasAnswer
          ? existingAnswers.map((answer) => (answer.question === question.id ? savedAnswer : answer))
          : [...existingAnswers, savedAnswer];
        const totalAwardedMarks = nextAnswers.reduce((sum, answer) => sum + Number(answer.awarded_marks || 0), 0);
        const reviewedCount = nextAnswers.filter((answer) => answer.reviewed_at).length;
        return {
          ...prev,
          answers: nextAnswers,
          total_awarded_marks: totalAwardedMarks.toFixed(2),
          reviewed_count: reviewedCount,
          reviewed_at: reviewedCount ? savedAnswer.reviewed_at : prev.reviewed_at,
        };
      });
      setQuestionGradeValue(question.id, {
        awarded_marks: savedAnswer.awarded_marks ?? '0',
        review_comment: savedAnswer.review_comment || '',
      });
      setMessage({ type: 'success', text: `Marks saved for ${question.title || `Question ${question.order}`}.` });
    } catch (error) {
      console.error('Failed to save grade', error);
      setMessage({ type: 'error', text: error.response?.data?.awarded_marks?.[0] || error.response?.data?.detail || 'Failed to save marks.' });
    } finally {
      setSavingQuestionId(null);
    }
  };

  const handleUnlock = async () => {
    if (!attempt?.id) return;
    try {
      setUnlocking(true);
      const data = await testAttemptAPI.unlock(attempt.id);
      setAttempt(data);
      setMessage({ type: 'success', text: 'Attempt unlocked successfully.' });
    } catch (error) {
      console.error('Failed to unlock attempt', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to unlock attempt.' });
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading submitted answers...</div>;
  }

  if (!attempt) {
    return <div className="p-8">Attempt not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`${basePath}/${attempt.test}`}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Test
          </Link>
          <h1 className="mt-2 text-3xl font-bold">{attempt.test_title}</h1>
          <p className="mt-1 text-gray-600">
            {attempt.student_name} • {attempt.product_name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusVariant(attempt.status)}>{attempt.status}</Badge>
          {attempt.status === 'locked' && attempt.can_unlock && (
            <Button onClick={handleUnlock} disabled={unlocking}>
              <Unlock className="mr-2 h-4 w-4" />
              Unlock Attempt
            </Button>
          )}
        </div>
      </div>

      {message.text && (
        <Card className={`p-4 ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          {message.text}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs text-gray-500">Answered</div>
          <div className="mt-1 text-2xl font-semibold">{attempt.answered_count}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500">Score</div>
          <div className="mt-1 text-2xl font-semibold">
            {attempt.total_awarded_marks || '0.00'} / {totalPossibleMarks.toFixed(2)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500">Reviewed Answers</div>
          <div className="mt-1 text-2xl font-semibold">{attempt.reviewed_count || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500">Violations</div>
          <div className="mt-1 text-2xl font-semibold">{attempt.window_violation_count}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500">Current Question</div>
          <div className="mt-1 text-2xl font-semibold">{(attempt.current_question_index || 0) + 1}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500">Submitted At</div>
          <div className="mt-1 text-sm font-medium">{attempt.submitted_at || 'Not submitted yet'}</div>
        </Card>
      </div>

      {attempt.locked_reason && (
        <Card className="border-red-200 bg-red-50 p-4 text-red-800">
          <div className="flex items-center gap-2 font-medium">
            <Lock className="h-4 w-4" />
            Lock reason
          </div>
          <div className="mt-1 text-sm">{attempt.locked_reason}</div>
        </Card>
      )}

      <div className="space-y-4">
        {orderedQuestions.map((question, index) => {
          const answer = answerMap.get(question.id);
          const questionDetail = questionDetailMap.get(question.id);
          const correctOptions = questionDetail?.correct_options || [];
          const selectedOptions = answer?.selected_options || [];
          const gradeDraft = gradingState[question.id] || {
            awarded_marks: answer?.awarded_marks ?? '0',
            review_comment: answer?.review_comment || '',
          };
          const codeRunState = codeRuns[question.id] || {};
          const codeRunResult = codeRunState.result;
          const stdoutText = codeRunResult?.stdout || '';
          const stderrText = codeRunResult?.stderr || '';
          const hasStdout = stdoutText.trim().length > 0;
          const hasStderr = stderrText.trim().length > 0;
          const outputText = codeRunState.running
            ? 'Running...'
            : codeRunState.error
              ? codeRunState.error
              : codeRunResult
                ? hasStdout
                  ? stdoutText
                  : codeRunResult.success
                    ? 'Program finished with no output.'
                    : 'No standard output.'
                : 'No output yet.';

          return (
            <Card key={question.id} className="space-y-5 p-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Q{index + 1}</Badge>
                    <Badge variant="outline">{formatQuestionType(question.question_type)}</Badge>
                  </div>
                  <div className="text-sm text-gray-500">{question.marks} marks</div>
                </div>
                <h2 className="text-lg font-semibold">{question.title || `Question ${index + 1}`}</h2>
                <p className="whitespace-pre-wrap text-sm text-gray-700">{question.prompt}</p>
                {question.attachment_url && (
                  <a
                    href={question.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 underline"
                  >
                    <FileText className="h-4 w-4" />
                    Open question attachment
                  </a>
                )}
              </div>

              {question.question_type === 'multiple_choice' && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-900">Submitted answer</div>
                  <div className="space-y-2">
                    {(questionDetail?.options || question.options || []).map((option) => {
                      const isSelected = selectedOptions.includes(option);
                      const isCorrect = isMcqOptionCorrect(option, correctOptions);
                      const itemClass = isCorrect
                        ? 'border-green-200 bg-green-50'
                        : isSelected
                          ? 'border-red-200 bg-red-50'
                          : 'border-gray-200';

                      return (
                        <div key={option} className={`rounded-lg border p-3 ${itemClass}`}>
                          <div className="flex items-center justify-between gap-3">
                            <span>{option}</span>
                            <div className="flex items-center gap-2 text-xs">
                              {isSelected && <Badge variant="secondary">Selected</Badge>}
                              {isCorrect && <Badge>Correct</Badge>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!selectedOptions.length && (
                    <div className="text-sm text-gray-500">No option selected.</div>
                  )}
                </div>
              )}

              {question.question_type === 'subjective' && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-900">Submitted answer</div>
                  <Card className="bg-gray-50 p-4 text-sm whitespace-pre-wrap">
                    {answer?.subjective_answer || 'No answer submitted.'}
                  </Card>
                </div>
              )}

              {question.question_type === 'file_upload' && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-900">Submitted file</div>
                  {answer?.uploaded_file_url ? (
                    <a
                      href={answer.uploaded_file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open uploaded file
                    </a>
                  ) : (
                    <div className="text-sm text-gray-500">No file uploaded.</div>
                  )}
                </div>
              )}

              {question.question_type === 'coding' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-900">Language:</span>
                    <Badge variant="outline">{answer?.code_language || question.coding_language || 'Not selected'}</Badge>
                  </div>
                  {questionDetail?.starter_code && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-900">Starter code</div>
                      <CodeEditor
                        height={260}
                        language={answer?.code_language || question.coding_language || 'python'}
                        readOnly
                        title={`starter-q${index + 1}`}
                        value={questionDetail.starter_code}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-900">Submitted code</div>
                    <CodeEditor
                      height={320}
                      language={answer?.code_language || question.coding_language || 'python'}
                      readOnly
                      title={`submitted-q${index + 1}`}
                      value={answer?.code_answer || 'No code submitted.'}
                    />
                  </div>
                  <div className="rounded-lg border bg-white p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Terminal className="h-4 w-4" />
                        Output
                      </div>
                      {codeRunResult && (
                        <span className="shrink-0 text-xs text-gray-500">
                          {codeRunResult.timed_out ? 'Timed out' : `Exit ${codeRunResult.exit_code ?? '-'}`}
                          {codeRunResult.duration_ms !== undefined ? ` . ${formatExecutionTime(codeRunResult.duration_ms)}` : ''}
                        </span>
                      )}
                    </div>

                    <Textarea
                      className="mb-3 min-h-[96px] font-mono text-sm"
                      value={codeRunState.stdin || ''}
                      onChange={(event) => setCodeRunValue(question.id, { stdin: event.target.value })}
                      placeholder="Input (stdin)"
                    />

                    <Button
                      className="mb-3"
                      disabled={codeRunState.running || !(answer?.code_answer || '').trim()}
                      onClick={() => handleRunSubmittedCode(question, codeRunState.stdin)}
                    >
                      {codeRunState.running ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {codeRunState.running ? 'Running' : 'Run submitted code'}
                    </Button>

                    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                      <pre className="min-h-[120px] max-h-[260px] overflow-auto whitespace-pre-wrap break-words p-3 text-xs leading-5 text-slate-100">{outputText}</pre>
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
              )}

              <div className="space-y-3 border-t pt-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-gray-900">Teacher/Admin Review</div>
                  {answer?.reviewed_by_name && (
                    <div className="text-xs text-gray-500">
                      Reviewed by {answer.reviewed_by_name}
                    </div>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Awarded Marks</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      max={question.marks}
                      value={gradeDraft.awarded_marks}
                      onChange={(event) => setQuestionGradeValue(question.id, { awarded_marks: event.target.value })}
                    />
                    <div className="text-xs text-gray-500">Maximum: {question.marks}</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Review Comment</label>
                    <Textarea
                      rows={4}
                      value={gradeDraft.review_comment}
                      onChange={(event) => setQuestionGradeValue(question.id, { review_comment: event.target.value })}
                      placeholder="Add feedback or grading notes..."
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-500">
                    {answer?.reviewed_at ? `Last reviewed: ${answer.reviewed_at}` : 'Not reviewed yet'}
                  </div>
                  <Button onClick={() => handleSaveGrade(question)} disabled={savingQuestionId === question.id}>
                    {savingQuestionId === question.id ? 'Saving...' : 'Save Marks'}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
