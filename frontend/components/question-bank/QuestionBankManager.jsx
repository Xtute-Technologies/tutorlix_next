'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, LibraryBig, ListTree, CircleHelp } from 'lucide-react';

import {
  questionBankCourseAPI,
  questionBankQuestionAPI,
  questionBankTopicAPI,
  profileTypeAPI,
} from '@/lib/lmsService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const emptyCourseForm = {
  title: '',
  subject: 'Mathematics',
  grade_label: '',
  class_label: '',
  description: '',
  syllabus_label: '',
  syllabus_source_url: '',
  is_active: true,
};

const emptyTopicForm = {
  title: '',
  summary: '',
  order: 1,
  is_active: true,
};

const emptyQuestionForm = {
  question: '',
  answer: '',
  source_label: '',
  source_url: '',
  order: 1,
  is_active: true,
};

function PanelHeader({ icon: Icon, title, action }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function CheckboxField({ id, checked, onChange, label }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

export default function QuestionBankManager({ roleLabel = 'Question Bank' }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourseSlug, setSelectedCourseSlug] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profileTypeOptions, setProfileTypeOptions] = useState([]);

  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [courseDialogMode, setCourseDialogMode] = useState('create');
  const [courseForm, setCourseForm] = useState(emptyCourseForm);

  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [topicDialogMode, setTopicDialogMode] = useState('create');
  const [topicEditingId, setTopicEditingId] = useState(null);
  const [topicForm, setTopicForm] = useState(emptyTopicForm);

  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionDialogMode, setQuestionDialogMode] = useState('create');
  const [questionEditingId, setQuestionEditingId] = useState(null);
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);

  const selectedTopic = useMemo(
    () => selectedCourse?.topics?.find((item) => item.id === selectedTopicId) ?? null,
    [selectedCourse, selectedTopicId]
  );

  const loadCourses = async (preferredSlug) => {
    try {
      setLoading(true);
      const data = await questionBankCourseAPI.getAll();
      const nextCourses = Array.isArray(data) ? data : [];
      setCourses(nextCourses);

      const nextSlug =
        preferredSlug ||
        selectedCourseSlug ||
        nextCourses[0]?.slug ||
        '';

      if (nextSlug) {
        await loadCourseDetail(nextSlug);
      } else {
        setSelectedCourseSlug('');
        setSelectedCourse(null);
        setSelectedTopicId(null);
        setQuestions([]);
      }
    } catch (error) {
      console.error('Failed to load question bank courses:', error);
      setMessage({ type: 'error', text: 'Failed to load question bank data.' });
    } finally {
      setLoading(false);
    }
  };

  const loadCourseDetail = async (slug) => {
    try {
      const data = await questionBankCourseAPI.getBySlug(slug);
      setSelectedCourseSlug(slug);
      setSelectedCourse(data);

      const nextTopicId = data.topics?.find((item) => item.id === selectedTopicId)?.id
        ?? data.topics?.[0]?.id
        ?? null;

      setSelectedTopicId(nextTopicId);

      if (nextTopicId) {
        await loadQuestions(nextTopicId);
      } else {
        setQuestions([]);
      }
    } catch (error) {
      console.error('Failed to load course detail:', error);
      setMessage({ type: 'error', text: 'Failed to load selected course.' });
    }
  };

  const loadQuestions = async (topicId) => {
    try {
      const data = await questionBankQuestionAPI.getAll({ topic: topicId });
      setQuestions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load questions:', error);
      setMessage({ type: 'error', text: 'Failed to load questions.' });
    }
  };

  useEffect(() => {
    loadCourses();
    const loadProfileTypes = async () => {
      try {
        const data = await profileTypeAPI.getAll();
        setProfileTypeOptions(Array.isArray(data) ? data.map((item) => ({
          label: item.title,
          value: item.slug,
        })) : []);
      } catch (error) {
        setProfileTypeOptions([]);
      }
    };
    loadProfileTypes();
  }, []);

  const handleSelectCourse = async (slug) => {
    await loadCourseDetail(slug);
  };

  const handleSelectTopic = async (topicId) => {
    setSelectedTopicId(topicId);
    await loadQuestions(topicId);
  };

  const openCreateCourse = () => {
    setCourseDialogMode('create');
    setCourseForm(emptyCourseForm);
    setCourseDialogOpen(true);
  };

  const openEditCourse = () => {
    if (!selectedCourse) return;
    setCourseDialogMode('edit');
    setCourseForm({
      title: selectedCourse.title || '',
      subject: selectedCourse.subject || 'Mathematics',
      profileTypes: selectedCourse.profileTypes || [],
      grade_label: selectedCourse.grade_label || '',
      class_label: selectedCourse.class_label || '',
      description: selectedCourse.description || '',
      syllabus_label: selectedCourse.syllabus_label || '',
      syllabus_source_url: selectedCourse.syllabus_source_url || '',
      is_active: selectedCourse.is_active ?? true,
    });
    setCourseDialogOpen(true);
  };

  const submitCourse = async () => {
    try {
      if (courseDialogMode === 'create') {
        const created = await questionBankCourseAPI.create(courseForm);
        await loadCourses(created.slug);
        setMessage({ type: 'success', text: 'Question bank course created.' });
      } else if (selectedCourse) {
        const updated = await questionBankCourseAPI.update(selectedCourse.slug, courseForm);
        await loadCourses(updated.slug);
        setMessage({ type: 'success', text: 'Question bank course updated.' });
      }
      setCourseDialogOpen(false);
    } catch (error) {
      console.error('Failed to save course:', error);
      setMessage({ type: 'error', text: 'Failed to save question bank course.' });
    }
  };

  const deleteCourse = async () => {
    if (!selectedCourse || !confirm(`Delete ${selectedCourse.title}?`)) return;
    try {
      await questionBankCourseAPI.delete(selectedCourse.slug);
      await loadCourses();
      setMessage({ type: 'success', text: 'Question bank course deleted.' });
    } catch (error) {
      console.error('Failed to delete course:', error);
      setMessage({ type: 'error', text: 'Failed to delete question bank course.' });
    }
  };

  const openCreateTopic = () => {
    setTopicDialogMode('create');
    setTopicEditingId(null);
    setTopicForm({
      ...emptyTopicForm,
      order: (selectedCourse?.topics?.length || 0) + 1,
    });
    setTopicDialogOpen(true);
  };

  const openEditTopic = (topic) => {
    setTopicDialogMode('edit');
    setTopicEditingId(topic.id);
    setTopicForm({
      title: topic.title || '',
      summary: topic.summary || '',
      order: topic.order || 1,
      is_active: topic.is_active ?? true,
    });
    setTopicDialogOpen(true);
  };

  const submitTopic = async () => {
    if (!selectedCourse) return;

    try {
      const payload = {
        ...topicForm,
        course: selectedCourse.id,
        order: Number(topicForm.order) || 1,
      };

      if (topicDialogMode === 'create') {
        await questionBankTopicAPI.create(payload);
        setMessage({ type: 'success', text: 'Topic created.' });
      } else if (topicEditingId) {
        await questionBankTopicAPI.update(topicEditingId, payload);
        setMessage({ type: 'success', text: 'Topic updated.' });
      }

      await loadCourseDetail(selectedCourse.slug);
      setTopicDialogOpen(false);
    } catch (error) {
      console.error('Failed to save topic:', error);
      setMessage({ type: 'error', text: 'Failed to save topic.' });
    }
  };

  const deleteTopic = async (topic) => {
    if (!confirm(`Delete ${topic.title}?`)) return;
    try {
      await questionBankTopicAPI.delete(topic.id);
      await loadCourseDetail(selectedCourse.slug);
      setMessage({ type: 'success', text: 'Topic deleted.' });
    } catch (error) {
      console.error('Failed to delete topic:', error);
      setMessage({ type: 'error', text: 'Failed to delete topic.' });
    }
  };

  const openCreateQuestion = () => {
    setQuestionDialogMode('create');
    setQuestionEditingId(null);
    setQuestionForm({
      ...emptyQuestionForm,
      order: questions.length + 1,
    });
    setQuestionDialogOpen(true);
  };

  const openEditQuestion = (item) => {
    setQuestionDialogMode('edit');
    setQuestionEditingId(item.id);
    setQuestionForm({
      question: item.question || '',
      answer: item.answer || '',
      source_label: item.source_label || '',
      source_url: item.source_url || '',
      order: item.order || 1,
      is_active: item.is_active ?? true,
    });
    setQuestionDialogOpen(true);
  };

  const submitQuestion = async () => {
    if (!selectedTopicId) return;

    try {
      const payload = {
        ...questionForm,
        topic: selectedTopicId,
        order: Number(questionForm.order) || 1,
      };

      if (questionDialogMode === 'create') {
        await questionBankQuestionAPI.create(payload);
        setMessage({ type: 'success', text: 'Question created.' });
      } else if (questionEditingId) {
        await questionBankQuestionAPI.update(questionEditingId, payload);
        setMessage({ type: 'success', text: 'Question updated.' });
      }

      await loadQuestions(selectedTopicId);
      await loadCourseDetail(selectedCourse.slug);
      setQuestionDialogOpen(false);
    } catch (error) {
      console.error('Failed to save question:', error);
      setMessage({ type: 'error', text: 'Failed to save question.' });
    }
  };

  const deleteQuestion = async (item) => {
    if (!confirm('Delete this question?')) return;
    try {
      await questionBankQuestionAPI.delete(item.id);
      await loadQuestions(selectedTopicId);
      await loadCourseDetail(selectedCourse.slug);
      setMessage({ type: 'success', text: 'Question deleted.' });
    } catch (error) {
      console.error('Failed to delete question:', error);
      setMessage({ type: 'error', text: 'Failed to delete question.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{roleLabel}</h1>
          <p className="text-muted-foreground mt-1">
            Manage question bank courses, syllabus topics, and questions from the database.
          </p>
        </div>
        <Button onClick={openCreateCourse}>
          <Plus className="mr-2 h-4 w-4" />
          Add Course
        </Button>
      </div>

      {message.text && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[320px_320px_minmax(0,1fr)]">
        <Card className="p-5 space-y-4">
          <PanelHeader
            icon={LibraryBig}
            title="Courses"
            action={
              courses.length > 0 ? (
                <Badge variant="outline">{courses.length}</Badge>
              ) : null
            }
          />

          <div className="space-y-3">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading courses...</div>
            ) : courses.length > 0 ? (
              courses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => handleSelectCourse(course.slug)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedCourseSlug === course.slug
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{course.title}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {course.class_label} • {course.grade_label}
                      </div>
                    </div>
                    <Badge variant="outline">{course.topic_count || 0}</Badge>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                No courses yet.
              </div>
            )}
          </div>

          {selectedCourse && (
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button variant="outline" size="sm" onClick={openEditCourse}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={deleteCourse}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-4">
          <PanelHeader
            icon={ListTree}
            title="Topics"
            action={
              <Button size="sm" variant="outline" disabled={!selectedCourse} onClick={openCreateTopic}>
                <Plus className="mr-2 h-4 w-4" />
                Add Topic
              </Button>
            }
          />

          {selectedCourse ? (
            <div className="space-y-3">
              {selectedCourse.topics?.length > 0 ? (
                selectedCourse.topics.map((topic) => (
                  <div
                    key={topic.id}
                    className={`rounded-xl border p-4 ${
                      selectedTopicId === topic.id ? 'border-primary bg-primary/5' : 'border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectTopic(topic.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{topic.title}</div>
                          <div className="mt-1 text-sm text-slate-500 line-clamp-2">
                            {topic.summary}
                          </div>
                        </div>
                        <Badge variant="outline">{topic.question_count || 0}</Badge>
                      </div>
                    </button>

                    <div className="mt-3 flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditTopic(topic)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteTopic(topic)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  No topics added for this course.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Select a course first.
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-4">
          <PanelHeader
            icon={CircleHelp}
            title="Questions"
            action={
              <Button size="sm" variant="outline" disabled={!selectedTopicId} onClick={openCreateQuestion}>
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            }
          />

          {selectedTopic ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-semibold text-slate-900">{selectedTopic.title}</div>
                <div className="mt-1 text-sm text-slate-500">{selectedTopic.summary}</div>
              </div>

              {questions.length > 0 ? (
                questions.map((item, index) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="secondary">Q{index + 1}</Badge>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditQuestion(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteQuestion(item)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 font-medium text-slate-900">{item.question}</div>
                    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                      {item.answer}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  No questions added for this topic.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Select a topic first.
            </div>
          )}
        </Card>
      </div>

      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{courseDialogMode === 'create' ? 'Add Course' : 'Edit Course'}</DialogTitle>
            <DialogDescription>
              Define the public question bank course and syllabus source.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="course-title">Title</Label>
              <Input id="course-title" value={courseForm.title} onChange={(e) => setCourseForm((prev) => ({ ...prev, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-subject">Subject</Label>
              <Input id="course-subject" value={courseForm.subject} onChange={(e) => setCourseForm((prev) => ({ ...prev, subject: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-profiles">Profile Types</Label>
              <select
                id="course-profiles"
                multiple
                value={(courseForm.profileTypes || []).map((item) => item.toString())}
                onChange={(event) => {
                  const values = Array.from(event.target.selectedOptions, (option) => option.value);
                  setCourseForm((prev) => ({ ...prev, profileTypes: values }));
                }}
                className="min-h-[120px] w-full rounded-md border p-2"
              >
                {profileTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-grade">Grade Label</Label>
              <Input id="course-grade" value={courseForm.grade_label} onChange={(e) => setCourseForm((prev) => ({ ...prev, grade_label: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-class">Class Label</Label>
              <Input id="course-class" value={courseForm.class_label} onChange={(e) => setCourseForm((prev) => ({ ...prev, class_label: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-syllabus">Syllabus Label</Label>
              <Input id="course-syllabus" value={courseForm.syllabus_label} onChange={(e) => setCourseForm((prev) => ({ ...prev, syllabus_label: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="course-source">Syllabus Source URL</Label>
              <Input id="course-source" value={courseForm.syllabus_source_url} onChange={(e) => setCourseForm((prev) => ({ ...prev, syllabus_source_url: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="course-description">Description</Label>
              <Textarea id="course-description" value={courseForm.description} onChange={(e) => setCourseForm((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <CheckboxField
                id="course-active"
                checked={courseForm.is_active}
                onChange={(checked) => setCourseForm((prev) => ({ ...prev, is_active: checked }))}
                label="Course is active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourseDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitCourse}>Save Course</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{topicDialogMode === 'create' ? 'Add Topic' : 'Edit Topic'}</DialogTitle>
            <DialogDescription>
              Add syllabus topics under the selected course.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic-title">Title</Label>
              <Input id="topic-title" value={topicForm.title} onChange={(e) => setTopicForm((prev) => ({ ...prev, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic-summary">Summary</Label>
              <Textarea id="topic-summary" value={topicForm.summary} onChange={(e) => setTopicForm((prev) => ({ ...prev, summary: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic-order">Order</Label>
              <Input id="topic-order" type="number" value={topicForm.order} onChange={(e) => setTopicForm((prev) => ({ ...prev, order: e.target.value }))} />
            </div>
            <CheckboxField
              id="topic-active"
              checked={topicForm.is_active}
              onChange={(checked) => setTopicForm((prev) => ({ ...prev, is_active: checked }))}
              label="Topic is active"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopicDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitTopic}>Save Topic</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{questionDialogMode === 'create' ? 'Add Question' : 'Edit Question'}</DialogTitle>
            <DialogDescription>
              Add question and answer content under the selected topic.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question-text">Question</Label>
              <Textarea id="question-text" value={questionForm.question} onChange={(e) => setQuestionForm((prev) => ({ ...prev, question: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer-text">Answer</Label>
              <Textarea id="answer-text" value={questionForm.answer} onChange={(e) => setQuestionForm((prev) => ({ ...prev, answer: e.target.value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="source-label">Source Label</Label>
                <Input id="source-label" value={questionForm.source_label} onChange={(e) => setQuestionForm((prev) => ({ ...prev, source_label: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source-url">Source URL</Label>
                <Input id="source-url" value={questionForm.source_url} onChange={(e) => setQuestionForm((prev) => ({ ...prev, source_url: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="question-order">Order</Label>
              <Input id="question-order" type="number" value={questionForm.order} onChange={(e) => setQuestionForm((prev) => ({ ...prev, order: e.target.value }))} />
            </div>
            <CheckboxField
              id="question-active"
              checked={questionForm.is_active}
              onChange={(checked) => setQuestionForm((prev) => ({ ...prev, is_active: checked }))}
              label="Question is active"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitQuestion}>Save Question</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
