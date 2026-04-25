'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Globe,
  Download,
  ExternalLink,
  FileText,
  OctagonX,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { approvedResourceDomainAPI, resourceAPI, resourceImportJobAPI } from '@/lib/lmsService';

const EMPTY_FORM = {
  title: '',
  description: '',
  subject: '',
  curriculum: '',
  grade_or_course: '',
  topic: '',
  resource_type: 'pdf',
  tags: '',
  external_url: '',
  visibility: 'teacher',
  file: null,
};

const RESOURCE_TYPE_OPTIONS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'worksheet', label: 'Worksheet' },
  { value: 'video', label: 'Video' },
  { value: 'link', label: 'Link' },
  { value: 'notes', label: 'Notes' },
  { value: 'question_bank', label: 'Question Bank' },
  { value: 'lesson_plan', label: 'Lesson Plan' },
];

const VISIBILITY_OPTIONS = [
  { value: 'teacher', label: 'Teacher Only' },
  { value: 'admin', label: 'Admin Only' },
];

const getFilenameFromDisposition = (contentDisposition, fallback = 'resource') => {
  if (!contentDisposition) return fallback;
  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
};

export default function ResourcesManager({ role }) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = role === 'admin';

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [domains, setDomains] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const [newDomainDescription, setNewDomainDescription] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [activeImportJob, setActiveImportJob] = useState(null);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const importCompletionHandledRef = useRef(null);
  const [abortingImport, setAbortingImport] = useState(false);

  const [subjectFilter, setSubjectFilter] = useState('all');
  const [curriculumFilter, setCurriculumFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [topicFilter, setTopicFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    if (!user || user.role !== role) {
      router.push('/dashboard');
      return;
    }
    fetchResources();
    if (role === 'admin') {
      fetchDomains();
      fetchLatestImportJob();
    }
  }, [user, role, router]);

  useEffect(() => {
    if (!isAdmin || !activeImportJob?.id || activeImportJob?.is_finished) {
      return undefined;
    }

    const intervalId = setInterval(async () => {
      try {
        const job = await resourceImportJobAPI.getById(activeImportJob.id);
        setActiveImportJob(job);
        fetchResources();
      } catch (error) {
        console.error('Failed to poll import job:', error);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [isAdmin, activeImportJob?.id, activeImportJob?.is_finished]);

  useEffect(() => {
    if (!activeImportJob?.id || !activeImportJob?.is_finished) {
      return;
    }
    if (importCompletionHandledRef.current === activeImportJob.id) {
      return;
    }

    importCompletionHandledRef.current = activeImportJob.id;
    setImporting(false);

    if (activeImportJob.status === 'completed') {
      setMessage({
        type: 'success',
        text: `Import completed. ${activeImportJob.created_resources_count || 0} resource(s) created.`,
      });
      fetchResources();
    } else if (activeImportJob.status === 'aborted') {
      setMessage({
        type: 'success',
        text: `Import aborted. ${activeImportJob.created_resources_count || 0} resource(s) were imported before stopping.`,
      });
      fetchResources();
    } else if (activeImportJob.status === 'failed') {
      setMessage({
        type: 'error',
        text: activeImportJob.error_message || 'Import failed.',
      });
    }
  }, [activeImportJob]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const data = await resourceAPI.getAll();
      setResources(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
      setMessage({ type: 'error', text: 'Failed to load resources.' });
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDomains = async () => {
    try {
      const data = await approvedResourceDomainAPI.getAll();
      setDomains(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch approved domains:', error);
    }
  };

  const fetchLatestImportJob = async () => {
    try {
      const data = await resourceImportJobAPI.getAll({ ordering: '-created_at' });
      setActiveImportJob(Array.isArray(data) && data.length > 0 ? data[0] : null);
    } catch (error) {
      console.error('Failed to fetch import jobs:', error);
    }
  };

  const uniqueOptions = (key) =>
    Array.from(new Set(resources.map((item) => item[key]).filter(Boolean))).sort((a, b) => a.localeCompare(b));

  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      if (subjectFilter !== 'all' && item.subject !== subjectFilter) return false;
      if (curriculumFilter !== 'all' && item.curriculum !== curriculumFilter) return false;
      if (gradeFilter !== 'all' && item.grade_or_course !== gradeFilter) return false;
      if (topicFilter !== 'all' && item.topic !== topicFilter) return false;
      if (typeFilter !== 'all' && item.resource_type !== typeFilter) return false;
      return true;
    });
  }, [resources, subjectFilter, curriculumFilter, gradeFilter, topicFilter, typeFilter]);

  const resetForm = () => {
    setEditingResource(null);
    setFormData(EMPTY_FORM);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const handleOpenEdit = (resource) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title || '',
      description: resource.description || '',
      subject: resource.subject || '',
      curriculum: resource.curriculum || '',
      grade_or_course: resource.grade_or_course || '',
      topic: resource.topic || '',
      resource_type: resource.resource_type || 'pdf',
      tags: Array.isArray(resource.tags) ? resource.tags.join(', ') : '',
      external_url: resource.external_url || '',
      visibility: resource.visibility || 'teacher',
      file: null,
    });
    setShowForm(true);
  };

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = new FormData();
    payload.append('title', formData.title);
    payload.append('subject', formData.subject);
    payload.append('curriculum', formData.curriculum);
    payload.append('grade_or_course', formData.grade_or_course);
    payload.append('topic', formData.topic);
    payload.append('resource_type', formData.resource_type);
    payload.append('visibility', formData.visibility);

    if (formData.description) payload.append('description', formData.description);
    if (formData.tags) payload.append('tags', formData.tags);
    if (formData.external_url) payload.append('external_url', formData.external_url);
    if (formData.file) payload.append('file', formData.file);

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      if (editingResource) {
        await resourceAPI.update(editingResource.id, payload);
        setMessage({ type: 'success', text: 'Resource updated successfully.' });
      } else {
        await resourceAPI.create(payload);
        setMessage({ type: 'success', text: 'Resource created successfully.' });
      }
      setShowForm(false);
      resetForm();
      fetchResources();
    } catch (error) {
      console.error('Failed to save resource:', error);
      const details = error.response?.data;
      const firstError = typeof details === 'object'
        ? Object.values(details)[0]
        : null;
      setMessage({
        type: 'error',
        text: Array.isArray(firstError) ? firstError[0] : firstError || 'Failed to save resource.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (resourceId) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      await resourceAPI.delete(resourceId);
      setMessage({ type: 'success', text: 'Resource deleted successfully.' });
      fetchResources();
    } catch (error) {
      console.error('Failed to delete resource:', error);
      setMessage({ type: 'error', text: 'Failed to delete resource.' });
    }
  };

  const handleBulkDelete = async (rows) => {
    const results = await Promise.allSettled(rows.map((row) => resourceAPI.delete(row.id)));
    const failedCount = results.filter((result) => result.status === 'rejected').length;
    setMessage(
      failedCount > 0
        ? { type: 'error', text: `${failedCount} resource(s) could not be deleted.` }
        : { type: 'success', text: `${rows.length} resource(s) deleted successfully.` }
    );
    fetchResources();
  };

  const handleCreateDomain = async () => {
    if (!newDomain.trim()) return;
    try {
      await approvedResourceDomainAPI.create({
        domain: newDomain.trim(),
        description: newDomainDescription.trim(),
        is_active: true,
      });
      setNewDomain('');
      setNewDomainDescription('');
      fetchDomains();
      setMessage({ type: 'success', text: 'Approved domain added.' });
    } catch (error) {
      console.error('Failed to add domain:', error);
      setMessage({ type: 'error', text: 'Failed to add approved domain.' });
    }
  };

  const handleDeleteDomain = async (id) => {
    if (!confirm('Remove this approved domain?')) return;
    try {
      await approvedResourceDomainAPI.delete(id);
      fetchDomains();
      setMessage({ type: 'success', text: 'Approved domain removed.' });
    } catch (error) {
      console.error('Failed to delete domain:', error);
      setMessage({ type: 'error', text: 'Failed to remove approved domain.' });
    }
  };

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    try {
      setImporting(true);
      setMessage({ type: '', text: '' });
      importCompletionHandledRef.current = null;
      const job = await resourceAPI.importFromUrl({
        url: importUrl.trim(),
        subject: formData.subject || 'General',
        curriculum: formData.curriculum || 'General',
        grade_or_course: formData.grade_or_course || 'General',
        topic: formData.topic || 'Imported',
        visibility: 'teacher',
        resource_type: 'pdf',
      });
      setActiveImportJob(job);
      setShowLogsDialog(true);
      setImportUrl('');
    } catch (error) {
      console.error('Failed to import resource URL:', error);
      const details = error.response?.data;
      const firstError = typeof details === 'object' ? Object.values(details)[0] : null;
      setMessage({
        type: 'error',
        text: Array.isArray(firstError) ? firstError[0] : firstError || 'Failed to import approved URL.',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDownload = async (resource) => {
    try {
      setDownloadingId(resource.id);
      const { blob, contentDisposition } = await resourceAPI.download(resource.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = getFilenameFromDisposition(contentDisposition, `${resource.title || 'resource'}`);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download resource:', error);
      setMessage({ type: 'error', text: 'Failed to download resource.' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleAbortImport = async () => {
    if (!activeImportJob?.id || !activeImportJob?.can_abort) return;

    try {
      setAbortingImport(true);
      const job = await resourceImportJobAPI.abort(activeImportJob.id);
      setActiveImportJob(job);
      setImporting(false);
      setMessage({
        type: 'success',
        text: 'Import abort requested.',
      });
    } catch (error) {
      console.error('Failed to abort import job:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to abort import.',
      });
    } finally {
      setAbortingImport(false);
    }
  };

  const columns = [
    {
      accessorKey: 'title',
      header: 'Resource',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.title}</div>
          <div className="text-sm text-gray-600">{row.original.description || 'No description'}</div>
        </div>
      ),
    },
    { accessorKey: 'subject', header: 'Subject' },
    { accessorKey: 'curriculum', header: 'Curriculum' },
    { accessorKey: 'grade_or_course', header: 'Grade / Course' },
    { accessorKey: 'topic', header: 'Topic' },
    {
      accessorKey: 'resource_type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline">
          {RESOURCE_TYPE_OPTIONS.find((item) => item.value === row.original.resource_type)?.label || row.original.resource_type}
        </Badge>
      ),
    },
    {
      accessorKey: 'visibility',
      header: 'Visibility',
      cell: ({ row }) => (
        <Badge variant={row.original.visibility === 'admin' ? 'secondary' : 'default'}>
          {row.original.visibility === 'admin' ? 'Admin Only' : 'Teacher Only'}
        </Badge>
      ),
    },
    { accessorKey: 'uploaded_by_name', header: 'Uploaded By' },
    {
      id: 'dates',
      header: 'Dates',
      cell: ({ row }) => (
        <div className="text-sm">
          <div>Created: {new Date(row.original.created_at).toLocaleDateString()}</div>
          <div className="text-gray-600">Updated: {new Date(row.original.updated_at).toLocaleDateString()}</div>
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.has_file && (
            <Button
              variant="ghost"
              size="sm"
              disabled={downloadingId === row.original.id}
              onClick={() => handleDownload(row.original)}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          {row.original.has_external_url && (
            <Button variant="ghost" size="sm" asChild>
              <a href={row.original.external_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          {isAdmin && (
            <>
              <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(row.original)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => handleDelete(row.original.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (!user || user.role !== role) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resources</h1>
          <p className="mt-1 text-gray-600">
            {isAdmin
              ? 'Manage teacher and admin-only resources.'
              : 'Browse teacher-only resources shared by the admin team.'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Resource
          </Button>
        )}
      </div>

      {message.text && (
        <Card className={`p-4 ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          {message.text}
        </Card>
      )}

      {isAdmin && (
        <Card className="space-y-4 p-4">
          <div>
            <h2 className="text-lg font-semibold">Approved Domain Importer</h2>
            <p className="text-sm text-gray-600">
              Import PDFs only from allowlisted domains. Imported files are stored in protected server storage.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-medium">Approved Domains</h3>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com"
                />
                <Input
                  value={newDomainDescription}
                  onChange={(e) => setNewDomainDescription(e.target.value)}
                  placeholder="Optional description"
                />
                <Button type="button" onClick={handleCreateDomain}>
                  Add
                </Button>
              </div>

              <div className="space-y-2">
                {domains.length === 0 ? (
                  <p className="text-sm text-gray-500">No approved domains added yet.</p>
                ) : (
                  domains.map((domain) => (
                    <div key={domain.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div>
                        <div className="font-medium">{domain.domain}</div>
                        <div className="text-sm text-gray-600">{domain.description || 'No description'}</div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteDomain(domain.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-medium">Import from Approved URL</h3>
              <Input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://approved-domain.com/path"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={formData.subject}
                  onChange={(e) => updateField('subject', e.target.value)}
                  placeholder="Subject"
                />
                <Input
                  value={formData.curriculum}
                  onChange={(e) => updateField('curriculum', e.target.value)}
                  placeholder="Curriculum"
                />
                <Input
                  value={formData.grade_or_course}
                  onChange={(e) => updateField('grade_or_course', e.target.value)}
                  placeholder="Grade / Course"
                />
                <Input
                  value={formData.topic}
                  onChange={(e) => updateField('topic', e.target.value)}
                  placeholder="Topic"
                />
              </div>
              <p className="text-xs text-gray-500">
                The importer downloads PDF files only and saves them to protected storage so Resources use your server download endpoint.
              </p>
              {activeImportJob && (
                <div className="space-y-3 rounded-md border bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium capitalize">
                        Import Status: {activeImportJob.status.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-gray-600">
                        {activeImportJob.progress_current} / {activeImportJob.progress_total || 0} files processed
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLogsDialog(true)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View Logs
                    </Button>
                  </div>
                  <Progress value={activeImportJob.progress_percent || 0} className="h-2 w-full" />
                  <div className="text-xs text-gray-600">
                    {activeImportJob.progress_percent || 0}% complete
                    {typeof activeImportJob.created_resources_count === 'number'
                      ? ` • ${activeImportJob.created_resources_count} imported`
                      : ''}
                  </div>
                  {activeImportJob.can_abort && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={abortingImport}
                      onClick={handleAbortImport}
                    >
                      <OctagonX className="mr-2 h-4 w-4" />
                      {abortingImport ? 'Aborting...' : 'Abort Import'}
                    </Button>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={handleImport} disabled={importing}>
                  <Globe className="mr-2 h-4 w-4" />
                  {importing ? 'Importing...' : 'Import URL'}
                </Button>
                {activeImportJob && (
                  <Button type="button" variant="outline" onClick={() => setShowLogsDialog(true)}>
                    <FileText className="mr-2 h-4 w-4" />
                    Open Logs
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger><SelectValue placeholder="Filter by subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {uniqueOptions('subject').map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={curriculumFilter} onValueChange={setCurriculumFilter}>
            <SelectTrigger><SelectValue placeholder="Filter by curriculum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Curricula</SelectItem>
              {uniqueOptions('curriculum').map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger><SelectValue placeholder="Filter by grade/course" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades / Courses</SelectItem>
              {uniqueOptions('grade_or_course').map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger><SelectValue placeholder="Filter by topic" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              {uniqueOptions('topic').map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue placeholder="Filter by type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {RESOURCE_TYPE_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {!loading && resources.length === 0 ? (
        <Card className="p-10 text-center text-gray-600">No resources added yet.</Card>
      ) : (
        <DataTable
          columns={columns}
          data={filteredResources}
          searchPlaceholder="Search resources..."
          onBulkDelete={handleBulkDelete}
          bulkDeleteLabel="Delete selected"
        />
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingResource ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
            <DialogDescription>
              Only upload materials you own, created, or are licensed to use.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={formData.title} onChange={(e) => updateField('title', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={formData.subject} onChange={(e) => updateField('subject', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="curriculum">Curriculum</Label>
                <Input id="curriculum" value={formData.curriculum} onChange={(e) => updateField('curriculum', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade_or_course">Grade / Course</Label>
                <Input id="grade_or_course" value={formData.grade_or_course} onChange={(e) => updateField('grade_or_course', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Input id="topic" value={formData.topic} onChange={(e) => updateField('topic', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.resource_type} onValueChange={(value) => updateField('resource_type', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPE_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={3} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input id="tags" value={formData.tags} onChange={(e) => updateField('tags', e.target.value)} placeholder="Comma-separated tags" />
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select value={formData.visibility} onValueChange={(value) => updateField('visibility', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VISIBILITY_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="external_url">External URL</Label>
                <Input id="external_url" type="url" value={formData.external_url} onChange={(e) => updateField('external_url', e.target.value)} placeholder="https://example.com/resource" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="file">Upload File</Label>
                <Input id="file" type="file" onChange={(e) => updateField('file', e.target.files?.[0] || null)} />
                <p className="text-xs text-gray-500">
                  Add either a protected file upload or a licensed external URL.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingResource ? 'Update Resource' : 'Create Resource'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Importer Logs</DialogTitle>
            <DialogDescription>
              Review progress and server-side logs for the latest approved-domain import job.
            </DialogDescription>
          </DialogHeader>

          {!activeImportJob ? (
            <p className="text-sm text-gray-500">No import job has started yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <Card className="p-3">
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="font-medium capitalize">{activeImportJob.status.replace('_', ' ')}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-gray-500">Progress</div>
                  <div className="font-medium">
                    {activeImportJob.progress_current} / {activeImportJob.progress_total || 0}
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-gray-500">Imported</div>
                  <div className="font-medium">{activeImportJob.created_resources_count || 0}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-gray-500">Source</div>
                  <div className="truncate text-sm font-medium">{activeImportJob.source_url}</div>
                </Card>
              </div>

              <Progress value={activeImportJob.progress_percent || 0} className="h-2 w-full" />

              {activeImportJob.can_abort && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={abortingImport}
                    onClick={handleAbortImport}
                  >
                    <OctagonX className="mr-2 h-4 w-4" />
                    {abortingImport ? 'Aborting...' : 'Abort Import'}
                  </Button>
                </div>
              )}

              <div className="max-h-[42vh] overflow-y-auto rounded-md border bg-black p-3 font-mono text-xs text-green-300">
                {activeImportJob.log_lines?.length ? (
                  activeImportJob.log_lines.map((line, index) => (
                    <div key={`${index}-${line}`} className="whitespace-pre-wrap break-words">
                      {line}
                    </div>
                  ))
                ) : (
                  <div>No logs yet.</div>
                )}
              </div>

              {activeImportJob.error_message && (
                <Card className="bg-red-50 p-3 text-sm text-red-800">
                  {activeImportJob.error_message}
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
