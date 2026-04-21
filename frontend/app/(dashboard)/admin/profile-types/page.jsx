'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';

import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { profileTypeAPI } from '@/lib/lmsService';
import { defaultProfileHomeContent } from '@/app/data/homeContent';

const EMPTY_PROFILE = {
  slug: '',
  title: '',
  description: '',
  order: 1,
  is_active: true,
  home_content: {},
};

const createEmptyPrimaryLink = () => ({
  label: '',
  url: '',
  visibility: 'public',
});

const createEmptySubnavLink = () => ({
  label: '',
  url: '',
});

const createEmptySubnavGroup = () => ({
  label: '',
  items: [createEmptySubnavLink()],
});

const createEmptyTutorial = () => ({
  slug: '',
  title: '',
  description: '',
  pages: [
    {
      slug: '',
      title: '',
      shortDescription: '',
      overview: '',
      conceptsCovered: [
        {
          slug: '',
          title: '',
          noteUrl: '',
        },
      ],
      learnPoints: [''],
      scopeLabel: '',
    },
  ],
});

const createEmptyTutorialPage = () => ({
  slug: '',
  title: '',
  shortDescription: '',
  overview: '',
  conceptsCovered: [
    {
      slug: '',
      title: '',
      noteUrl: '',
    },
  ],
  learnPoints: [''],
  scopeLabel: '',
});

const createEmptyReview = () => ({
  name: '',
  course: '',
  text: '',
});

const ensureArray = (value, fallback) => (Array.isArray(value) ? value : fallback);

const getDefaultHomeContent = (slug) => {
  const base = defaultProfileHomeContent[slug] || defaultProfileHomeContent.college || {};
  return JSON.parse(JSON.stringify(base));
};

const buildManualHomeContent = (slug, incoming = {}) => {
  const defaults = getDefaultHomeContent(slug);
  const navigation = {
    ...defaults.navigation,
    ...(incoming.navigation || {}),
    primary_links: ensureArray(incoming.navigation?.primary_links, defaults.navigation?.primary_links || []),
    subnav_groups: ensureArray(incoming.navigation?.subnav_groups, defaults.navigation?.subnav_groups || []).map((group) => ({
      label: group?.label || '',
      items: ensureArray(group?.items, []).map((item) => ({
        label: item?.label || '',
        url: item?.url || '',
      })),
    })),
  };
  const tutorials = ensureArray(incoming.tutorials, defaults.tutorials || []).map((tutorial) => {
    const fallback = ensureArray(defaults.tutorials, []).find((item) => item.slug === tutorial.slug) || {};
    const fallbackPages = ensureArray(fallback.pages, fallback?.slug ? [fallback] : []);
    const pages = ensureArray(tutorial.pages, tutorial?.slug ? [tutorial] : []).map((page, pageIndex) => {
      const fallbackPage = fallbackPages.find((item) => item.slug === page.slug) || fallbackPages[pageIndex] || {};
      return {
        ...fallbackPage,
        ...page,
        conceptsCovered: ensureArray(page.conceptsCovered, fallbackPage.conceptsCovered || []).map((concept, index) => {
          if (typeof concept === 'string') {
            const fallbackConcept = ensureArray(fallbackPage.conceptsCovered, [])[index] || {};
            return {
              slug: fallbackConcept.slug || '',
              title: concept,
              noteUrl: fallbackConcept.noteUrl || '',
            };
          }

          return {
            slug: concept.slug || '',
            title: concept.title || '',
            noteUrl: concept.noteUrl || '',
          };
        }),
        learnPoints: ensureArray(page.learnPoints, fallbackPage.learnPoints || ['']),
      };
    });

    if (Array.isArray(tutorial.pages) || Array.isArray(fallback.pages)) {
      return {
        ...fallback,
        ...tutorial,
        description: tutorial.description || fallback.description || '',
        pages: pages.length ? pages : [createEmptyTutorialPage()],
      };
    }

    return {
      ...fallback,
      ...tutorial,
      description: tutorial.description || '',
      pages: pages.length ? pages : [{
        slug: tutorial.slug || '',
        title: tutorial.title || '',
        shortDescription: tutorial.shortDescription || '',
        overview: tutorial.overview || '',
        conceptsCovered: ensureArray(tutorial.conceptsCovered, fallback.conceptsCovered || []).map((concept, index) => {
          if (typeof concept === 'string') {
            const fallbackConcept = ensureArray(fallback.conceptsCovered, [])[index] || {};
            return {
              slug: fallbackConcept.slug || '',
              title: concept,
              noteUrl: fallbackConcept.noteUrl || '',
            };
          }

          return {
            slug: concept.slug || '',
            title: concept.title || '',
            noteUrl: concept.noteUrl || '',
          };
        }),
        learnPoints: ensureArray(tutorial.learnPoints, fallback.learnPoints || ['']),
        scopeLabel: tutorial.scopeLabel || fallback.scopeLabel || '',
      }],
    };
  });

  return {
    ...defaults,
    ...incoming,
    navigation,
    testimonials: {
      ...(defaults.testimonials || {}),
      ...(incoming.testimonials || {}),
      items: ensureArray(incoming.testimonials?.items, defaults.testimonials?.items || []).map((item) => ({
        name: item?.name || '',
        course: item?.course || '',
        text: item?.text || '',
      })),
    },
    tutorials,
  };
};

const stringifyHomeContent = (value) => JSON.stringify(value || {}, null, 2);

export default function ProfileTypesPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editorMode, setEditorMode] = useState('manual');
  const [jsonError, setJsonError] = useState('');
  const [formState, setFormState] = useState(() => ({
    ...EMPTY_PROFILE,
    home_content: buildManualHomeContent('college', {}),
  }));
  const [jsonText, setJsonText] = useState(stringifyHomeContent(buildManualHomeContent('college', {})));
  const [editingSlug, setEditingSlug] = useState(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const data = await profileTypeAPI.getAll();
      setProfiles(Array.isArray(data) ? data : []);
    } catch (error) {
      setProfiles([]);
      setMessage({ type: 'error', text: 'Failed to fetch profile types.' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (profile = null) => {
    const nextBase = profile || EMPTY_PROFILE;
    const nextSlug = nextBase.slug || 'college';
    const nextHomeContent = buildManualHomeContent(nextSlug, nextBase.home_content || {});

    setEditingSlug(profile?.slug || null);
    setFormState({
      slug: nextBase.slug || '',
      title: nextBase.title || '',
      description: nextBase.description || '',
      order: nextBase.order ?? 1,
      is_active: nextBase.is_active ?? true,
      home_content: nextHomeContent,
    });
    setJsonText(stringifyHomeContent(nextHomeContent));
    setJsonError('');
    setEditorMode('manual');
  };

  const syncHomeContent = (updater) => {
    setFormState((prev) => {
      const nextHomeContent = typeof updater === 'function' ? updater(prev.home_content) : updater;
      setJsonText(stringifyHomeContent(nextHomeContent));
      return { ...prev, home_content: nextHomeContent };
    });
  };

  const updateFormField = (field, value) => {
    setFormState((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'slug') {
        const nextHomeContent = buildManualHomeContent(value || 'college', prev.home_content);
        setJsonText(stringifyHomeContent(nextHomeContent));
        return { ...next, home_content: nextHomeContent };
      }
      return next;
    });
  };

  const handleEditorModeChange = (mode) => {
    if (mode === 'manual') {
      try {
        const parsed = jsonText.trim() ? JSON.parse(jsonText) : {};
        const normalized = buildManualHomeContent(formState.slug || 'college', parsed);
        setFormState((prev) => ({ ...prev, home_content: normalized }));
        setJsonText(stringifyHomeContent(normalized));
        setJsonError('');
      } catch {
        setJsonError('Fix the JSON before switching back to manual mode.');
        return;
      }
    } else {
      setJsonText(stringifyHomeContent(formState.home_content));
      setJsonError('');
    }

    setEditorMode(mode);
  };

  const validateForm = () => {
    if (!formState.slug.trim()) return 'Slug is required.';
    if (!formState.title.trim()) return 'Title is required.';
    if (!Number.isInteger(Number(formState.order)) || Number(formState.order) < 0) {
      return 'Order must be a non-negative integer.';
    }

    if (editorMode === 'json') {
      try {
        JSON.parse(jsonText || '{}');
      } catch {
        return 'Home content JSON is invalid.';
      }
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errorText = validateForm();
    if (errorText) {
      setMessage({ type: 'error', text: errorText });
      return;
    }

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      const homeContent = editorMode === 'json'
        ? JSON.parse(jsonText || '{}')
        : formState.home_content;

      const payload = {
        slug: formState.slug.trim(),
        title: formState.title.trim(),
        description: formState.description,
        home_content: homeContent,
        order: Number(formState.order),
        is_active: !!formState.is_active,
      };

      if (editingSlug) {
        await profileTypeAPI.update(editingSlug, payload);
        setMessage({ type: 'success', text: 'Profile type updated successfully.' });
      } else {
        await profileTypeAPI.create(payload);
        setMessage({ type: 'success', text: 'Profile type created successfully.' });
      }

      setShowForm(false);
      resetForm();
      fetchProfiles();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save profile type.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (slug) => {
    if (!confirm('Are you sure you want to delete this profile type?')) return;
    try {
      await profileTypeAPI.delete(slug);
      fetchProfiles();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete profile type.' });
    }
  };

  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'slug', header: 'Slug' },
    { accessorKey: 'order', header: 'Order' },
    {
      id: 'reviews_count',
      header: 'Reviews',
      cell: ({ row }) => ensureArray(row.original.home_content?.testimonials?.items, []).filter((item) => item?.text).length,
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setViewingProfile(row.original)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              resetForm(row.original);
              setShowForm(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(row.original.slug)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const primaryLinks = useMemo(
    () => ensureArray(formState.home_content?.navigation?.primary_links, []),
    [formState.home_content],
  );

  const subnavGroups = useMemo(
    () => ensureArray(formState.home_content?.navigation?.subnav_groups, []),
    [formState.home_content],
  );

  const tutorials = useMemo(
    () => ensureArray(formState.home_content?.tutorials, []),
    [formState.home_content],
  );

  const testimonials = useMemo(
    () => ensureArray(formState.home_content?.testimonials?.items, []),
    [formState.home_content],
  );

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" /></div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between">
          <h1 className="text-3xl font-bold">Profile Types</h1>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Profile Type
          </Button>
        </div>

        {message.text && (
          <div className={`rounded-lg p-4 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingSlug ? 'Edit Profile Type' : 'Add Profile Type'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Slug</label>
                    <Input value={formState.slug} onChange={(e) => updateFormField('slug', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input value={formState.title} onChange={(e) => updateFormField('title', e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea value={formState.description || ''} onChange={(e) => updateFormField('description', e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Order</label>
                    <Input type="number" value={formState.order} onChange={(e) => updateFormField('order', e.target.value)} />
                  </div>
                  <div className="flex items-center gap-3 pt-8">
                    <Switch checked={!!formState.is_active} onCheckedChange={(checked) => updateFormField('is_active', checked)} />
                    <span className="text-sm font-medium">Active</span>
                  </div>
                </div>

                <Tabs value={editorMode} onValueChange={handleEditorModeChange}>
                  <TabsList>
                    <TabsTrigger value="manual">Manual</TabsTrigger>
                    <TabsTrigger value="json">JSON</TabsTrigger>
                  </TabsList>

                  <TabsContent value="manual" className="space-y-6 pt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Navigation</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Question Banks Label</label>
                            <Input
                              value={formState.home_content.navigation?.question_banks_label || ''}
                              onChange={(e) => syncHomeContent((prev) => ({
                                ...prev,
                                navigation: { ...prev.navigation, question_banks_label: e.target.value },
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Question Banks URL</label>
                            <Input
                              value={formState.home_content.navigation?.question_banks_url || ''}
                              onChange={(e) => syncHomeContent((prev) => ({
                                ...prev,
                                navigation: { ...prev.navigation, question_banks_url: e.target.value },
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Show Topic Subnav</label>
                            <div className="flex items-center gap-3 pt-2">
                              <Switch
                                checked={!!formState.home_content.navigation?.tutorials_enabled}
                                onCheckedChange={(checked) => syncHomeContent((prev) => ({
                                  ...prev,
                                  navigation: { ...prev.navigation, tutorials_enabled: checked },
                                }))}
                              />
                              <span className="text-sm text-slate-600">Enable topic tabs below navbar</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">Primary Navbar Links</h3>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => syncHomeContent((prev) => ({
                                ...prev,
                                navigation: {
                                  ...prev.navigation,
                                  primary_links: [...ensureArray(prev.navigation?.primary_links, []), createEmptyPrimaryLink()],
                                },
                              }))}
                            >
                              <Plus className="mr-2 h-4 w-4" /> Add New
                            </Button>
                          </div>

                          {primaryLinks.map((link, index) => (
                            <div key={`${link.url}-${index}`} className="rounded-lg border p-4 space-y-3">
                              <div className="grid gap-3 md:grid-cols-3">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Label</label>
                                  <Input
                                    value={link.label || ''}
                                    onChange={(e) => syncHomeContent((prev) => {
                                      const items = [...ensureArray(prev.navigation?.primary_links, [])];
                                      items[index] = { ...items[index], label: e.target.value };
                                      return { ...prev, navigation: { ...prev.navigation, primary_links: items } };
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">URL</label>
                                  <Input
                                    value={link.url || ''}
                                    onChange={(e) => syncHomeContent((prev) => {
                                      const items = [...ensureArray(prev.navigation?.primary_links, [])];
                                      items[index] = { ...items[index], url: e.target.value };
                                      return { ...prev, navigation: { ...prev.navigation, primary_links: items } };
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Visibility</label>
                                  <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={link.visibility || 'public'}
                                    onChange={(e) => syncHomeContent((prev) => {
                                      const items = [...ensureArray(prev.navigation?.primary_links, [])];
                                      items[index] = { ...items[index], visibility: e.target.value };
                                      return { ...prev, navigation: { ...prev.navigation, primary_links: items } };
                                    })}
                                  >
                                    <option value="public">Public</option>
                                    <option value="auth">Auth Only</option>
                                    <option value="both">Both</option>
                                  </select>
                                </div>
                              </div>
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => syncHomeContent((prev) => ({
                                    ...prev,
                                    navigation: {
                                      ...prev.navigation,
                                      primary_links: ensureArray(prev.navigation?.primary_links, []).filter((_, idx) => idx !== index),
                                    },
                                  }))}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-semibold">Subnavigation Dropdowns</h3>
                              <p className="text-sm text-slate-600">Each group becomes one dropdown in the subnavigation bar.</p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => syncHomeContent((prev) => ({
                                ...prev,
                                navigation: {
                                  ...prev.navigation,
                                  subnav_groups: [...ensureArray(prev.navigation?.subnav_groups, []), createEmptySubnavGroup()],
                                },
                              }))}
                            >
                              <Plus className="mr-2 h-4 w-4" /> Add Group
                            </Button>
                          </div>

                          {subnavGroups.map((group, groupIndex) => (
                            <div key={`subnav-group-${groupIndex}`} className="rounded-lg border p-4 space-y-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Dropdown Label</label>
                                <Input
                                  value={group.label || ''}
                                  onChange={(e) => syncHomeContent((prev) => {
                                    const groups = [...ensureArray(prev.navigation?.subnav_groups, [])];
                                    groups[groupIndex] = { ...groups[groupIndex], label: e.target.value };
                                    return { ...prev, navigation: { ...prev.navigation, subnav_groups: groups } };
                                  })}
                                />
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-semibold">Dropdown Items</h4>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => syncHomeContent((prev) => {
                                      const groups = [...ensureArray(prev.navigation?.subnav_groups, [])];
                                      const items = [...ensureArray(groups[groupIndex]?.items, []), createEmptySubnavLink()];
                                      groups[groupIndex] = { ...groups[groupIndex], items };
                                      return { ...prev, navigation: { ...prev.navigation, subnav_groups: groups } };
                                    })}
                                  >
                                    <Plus className="mr-2 h-4 w-4" /> Add Item
                                  </Button>
                                </div>

                                {ensureArray(group.items, []).map((item, itemIndex) => (
                                  <div key={`${groupIndex}-${itemIndex}`} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_1fr_auto]">
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Item Label</label>
                                      <Input
                                        value={item.label || ''}
                                        onChange={(e) => syncHomeContent((prev) => {
                                          const groups = [...ensureArray(prev.navigation?.subnav_groups, [])];
                                          const items = [...ensureArray(groups[groupIndex]?.items, [])];
                                          items[itemIndex] = { ...items[itemIndex], label: e.target.value };
                                          groups[groupIndex] = { ...groups[groupIndex], items };
                                          return { ...prev, navigation: { ...prev.navigation, subnav_groups: groups } };
                                        })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Item URL</label>
                                      <Input
                                        value={item.url || ''}
                                        onChange={(e) => syncHomeContent((prev) => {
                                          const groups = [...ensureArray(prev.navigation?.subnav_groups, [])];
                                          const items = [...ensureArray(groups[groupIndex]?.items, [])];
                                          items[itemIndex] = { ...items[itemIndex], url: e.target.value };
                                          groups[groupIndex] = { ...groups[groupIndex], items };
                                          return { ...prev, navigation: { ...prev.navigation, subnav_groups: groups } };
                                        })}
                                      />
                                    </div>
                                    <div className="flex items-end">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        className="text-red-600"
                                        onClick={() => syncHomeContent((prev) => {
                                          const groups = [...ensureArray(prev.navigation?.subnav_groups, [])];
                                          const items = ensureArray(groups[groupIndex]?.items, []).filter((_, idx) => idx !== itemIndex);
                                          groups[groupIndex] = { ...groups[groupIndex], items };
                                          return { ...prev, navigation: { ...prev.navigation, subnav_groups: groups } };
                                        })}
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="text-red-600"
                                  onClick={() => syncHomeContent((prev) => ({
                                    ...prev,
                                    navigation: {
                                      ...prev.navigation,
                                      subnav_groups: ensureArray(prev.navigation?.subnav_groups, []).filter((_, idx) => idx !== groupIndex),
                                    },
                                  }))}
                                >
                                  Remove Group
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Student Success Stories</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Section Title</label>
                            <Input
                              value={formState.home_content.testimonials?.title || ''}
                              onChange={(e) => syncHomeContent((prev) => ({
                                ...prev,
                                testimonials: { ...prev.testimonials, title: e.target.value },
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Section Subtitle</label>
                            <Input
                              value={formState.home_content.testimonials?.subtitle || ''}
                              onChange={(e) => syncHomeContent((prev) => ({
                                ...prev,
                                testimonials: { ...prev.testimonials, subtitle: e.target.value },
                              }))}
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">Reviews</h3>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => syncHomeContent((prev) => ({
                                ...prev,
                                testimonials: {
                                  ...prev.testimonials,
                                  items: [...ensureArray(prev.testimonials?.items, []), createEmptyReview()],
                                },
                              }))}
                            >
                              <Plus className="mr-2 h-4 w-4" /> Add Review
                            </Button>
                          </div>

                          {testimonials.map((review, reviewIndex) => (
                            <div key={`${review.name}-${reviewIndex}`} className="rounded-lg border p-4 space-y-3">
                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Student Name</label>
                                  <Input
                                    value={review.name || ''}
                                    onChange={(e) => syncHomeContent((prev) => {
                                      const items = [...ensureArray(prev.testimonials?.items, [])];
                                      items[reviewIndex] = { ...items[reviewIndex], name: e.target.value };
                                      return { ...prev, testimonials: { ...prev.testimonials, items } };
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Course / Label</label>
                                  <Input
                                    value={review.course || ''}
                                    onChange={(e) => syncHomeContent((prev) => {
                                      const items = [...ensureArray(prev.testimonials?.items, [])];
                                      items[reviewIndex] = { ...items[reviewIndex], course: e.target.value };
                                      return { ...prev, testimonials: { ...prev.testimonials, items } };
                                    })}
                                  />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                  <label className="text-sm font-medium">Review Text</label>
                                  <Textarea
                                    rows={3}
                                    value={review.text || ''}
                                    onChange={(e) => syncHomeContent((prev) => {
                                      const items = [...ensureArray(prev.testimonials?.items, [])];
                                      items[reviewIndex] = { ...items[reviewIndex], text: e.target.value };
                                      return { ...prev, testimonials: { ...prev.testimonials, items } };
                                    })}
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="text-red-600"
                                  onClick={() => syncHomeContent((prev) => ({
                                    ...prev,
                                    testimonials: {
                                      ...prev.testimonials,
                                      items: ensureArray(prev.testimonials?.items, []).filter((_, idx) => idx !== reviewIndex),
                                    },
                                  }))}
                                >
                                  Remove Review
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Tutorial Topics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-600">Each tutorial group becomes one header tab. Inside it, add tutorial pages that appear in the tutorial subnavigation.</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => syncHomeContent((prev) => ({
                              ...prev,
                              tutorials: [...ensureArray(prev.tutorials, []), createEmptyTutorial()],
                            }))}
                          >
                            <Plus className="mr-2 h-4 w-4" /> Add New
                          </Button>
                        </div>

                        {tutorials.map((tutorial, tutorialIndex) => (
                          <div key={`${tutorial.slug}-${tutorialIndex}`} className="rounded-lg border p-4 space-y-4">
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Tutorial Group Title</label>
                                <Input
                                  value={tutorial.title || ''}
                                  onChange={(e) => syncHomeContent((prev) => {
                                    const items = [...ensureArray(prev.tutorials, [])];
                                    items[tutorialIndex] = { ...items[tutorialIndex], title: e.target.value };
                                    return { ...prev, tutorials: items };
                                  })}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Group Slug</label>
                                <Input
                                  value={tutorial.slug || ''}
                                  onChange={(e) => syncHomeContent((prev) => {
                                    const items = [...ensureArray(prev.tutorials, [])];
                                    items[tutorialIndex] = { ...items[tutorialIndex], slug: e.target.value };
                                    return { ...prev, tutorials: items };
                                  })}
                                />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Group Description</label>
                                <Textarea
                                  rows={3}
                                  value={tutorial.description || ''}
                                  onChange={(e) => syncHomeContent((prev) => {
                                    const items = [...ensureArray(prev.tutorials, [])];
                                    items[tutorialIndex] = { ...items[tutorialIndex], description: e.target.value };
                                    return { ...prev, tutorials: items };
                                  })}
                                />
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold">Tutorial Pages</h4>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => syncHomeContent((prev) => {
                                    const items = [...ensureArray(prev.tutorials, [])];
                                    const pages = [
                                      ...ensureArray(items[tutorialIndex]?.pages, []),
                                      createEmptyTutorialPage(),
                                    ];
                                    items[tutorialIndex] = { ...items[tutorialIndex], pages };
                                    return { ...prev, tutorials: items };
                                  })}
                                >
                                  <Plus className="mr-2 h-4 w-4" /> Add New
                                </Button>
                              </div>

                              {ensureArray(tutorial.pages, []).map((page, pageIndex) => (
                                <div key={`${tutorial.slug}-page-${pageIndex}`} className="rounded-lg border p-4 space-y-4">
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Page Title</label>
                                      <Input
                                        value={page.title || ''}
                                        onChange={(e) => syncHomeContent((prev) => {
                                          const items = [...ensureArray(prev.tutorials, [])];
                                          const pages = [...ensureArray(items[tutorialIndex]?.pages, [])];
                                          pages[pageIndex] = { ...pages[pageIndex], title: e.target.value };
                                          items[tutorialIndex] = { ...items[tutorialIndex], pages };
                                          return { ...prev, tutorials: items };
                                        })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Page Slug</label>
                                      <Input
                                        value={page.slug || ''}
                                        onChange={(e) => syncHomeContent((prev) => {
                                          const items = [...ensureArray(prev.tutorials, [])];
                                          const pages = [...ensureArray(items[tutorialIndex]?.pages, [])];
                                          pages[pageIndex] = { ...pages[pageIndex], slug: e.target.value };
                                          items[tutorialIndex] = { ...items[tutorialIndex], pages };
                                          return { ...prev, tutorials: items };
                                        })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Short Description</label>
                                      <Input
                                        value={page.shortDescription || ''}
                                        onChange={(e) => syncHomeContent((prev) => {
                                          const items = [...ensureArray(prev.tutorials, [])];
                                          const pages = [...ensureArray(items[tutorialIndex]?.pages, [])];
                                          pages[pageIndex] = { ...pages[pageIndex], shortDescription: e.target.value };
                                          items[tutorialIndex] = { ...items[tutorialIndex], pages };
                                          return { ...prev, tutorials: items };
                                        })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Scope Label</label>
                                      <Input
                                        value={page.scopeLabel || ''}
                                        onChange={(e) => syncHomeContent((prev) => {
                                          const items = [...ensureArray(prev.tutorials, [])];
                                          const pages = [...ensureArray(items[tutorialIndex]?.pages, [])];
                                          pages[pageIndex] = { ...pages[pageIndex], scopeLabel: e.target.value };
                                          items[tutorialIndex] = { ...items[tutorialIndex], pages };
                                          return { ...prev, tutorials: items };
                                        })}
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Overview</label>
                                    <Textarea
                                      rows={4}
                                      value={page.overview || ''}
                                      onChange={(e) => syncHomeContent((prev) => {
                                        const items = [...ensureArray(prev.tutorials, [])];
                                        const pages = [...ensureArray(items[tutorialIndex]?.pages, [])];
                                        pages[pageIndex] = { ...pages[pageIndex], overview: e.target.value };
                                        items[tutorialIndex] = { ...items[tutorialIndex], pages };
                                        return { ...prev, tutorials: items };
                                      })}
                                    />
                                  </div>

                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h5 className="text-sm font-semibold">Core Concepts</h5>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => syncHomeContent((prev) => {
                                          const items = [...ensureArray(prev.tutorials, [])];
                                          const pages = [...ensureArray(items[tutorialIndex]?.pages, [])];
                                          const conceptsCovered = [
                                            ...ensureArray(pages[pageIndex]?.conceptsCovered, []),
                                            { slug: '', title: '', noteUrl: '' },
                                          ];
                                          pages[pageIndex] = { ...pages[pageIndex], conceptsCovered };
                                          items[tutorialIndex] = { ...items[tutorialIndex], pages };
                                          return { ...prev, tutorials: items };
                                        })}
                                      >
                                        <Plus className="mr-2 h-4 w-4" /> Add Concept
                                      </Button>
                                    </div>

                                    {ensureArray(page.conceptsCovered, []).map((concept, conceptIndex) => (
                                      <div key={`${tutorial.slug}-page-${pageIndex}-concept-${conceptIndex}`} className="rounded-lg border p-4 space-y-3">
                                        <div className="grid gap-3 md:grid-cols-2">
                                          <div className="space-y-2">
                                            <label className="text-sm font-medium">Concept Title</label>
                                            <Input
                                              value={concept.title || ''}
                                              onChange={(e) => syncHomeContent((prev) => {
                                                const items = [...ensureArray(prev.tutorials, [])];
                                                const pages = [...ensureArray(items[tutorialIndex]?.pages, [])];
                                                const conceptsCovered = [...ensureArray(pages[pageIndex]?.conceptsCovered, [])];
                                                conceptsCovered[conceptIndex] = { ...conceptsCovered[conceptIndex], title: e.target.value };
                                                pages[pageIndex] = { ...pages[pageIndex], conceptsCovered };
                                                items[tutorialIndex] = { ...items[tutorialIndex], pages };
                                                return { ...prev, tutorials: items };
                                              })}
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <label className="text-sm font-medium">Concept Slug</label>
                                            <Input
                                              value={concept.slug || ''}
                                              onChange={(e) => syncHomeContent((prev) => {
                                                const items = [...ensureArray(prev.tutorials, [])];
                                                const pages = [...ensureArray(items[tutorialIndex]?.pages, [])];
                                                const conceptsCovered = [...ensureArray(pages[pageIndex]?.conceptsCovered, [])];
                                                conceptsCovered[conceptIndex] = { ...conceptsCovered[conceptIndex], slug: e.target.value };
                                                pages[pageIndex] = { ...pages[pageIndex], conceptsCovered };
                                                items[tutorialIndex] = { ...items[tutorialIndex], pages };
                                                return { ...prev, tutorials: items };
                                              })}
                                            />
                                          </div>
                                          <div className="space-y-2 md:col-span-2">
                                            <label className="text-sm font-medium">Note URL</label>
                                            <Input
                                              value={concept.noteUrl || ''}
                                              onChange={(e) => syncHomeContent((prev) => {
                                                const items = [...ensureArray(prev.tutorials, [])];
                                                const pages = [...ensureArray(items[tutorialIndex]?.pages, [])];
                                                const conceptsCovered = [...ensureArray(pages[pageIndex]?.conceptsCovered, [])];
                                                conceptsCovered[conceptIndex] = { ...conceptsCovered[conceptIndex], noteUrl: e.target.value };
                                                pages[pageIndex] = { ...pages[pageIndex], conceptsCovered };
                                                items[tutorialIndex] = { ...items[tutorialIndex], pages };
                                                return { ...prev, tutorials: items };
                                              })}
                                            />
                                          </div>
                                        </div>

                                        <div className="flex justify-end">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            className="text-red-600"
                                            onClick={() => syncHomeContent((prev) => {
                                              const items = [...ensureArray(prev.tutorials, [])];
                                              const pages = [...ensureArray(items[tutorialIndex]?.pages, [])];
                                              const conceptsCovered = ensureArray(pages[pageIndex]?.conceptsCovered, []).filter((_, idx) => idx !== conceptIndex);
                                              pages[pageIndex] = { ...pages[pageIndex], conceptsCovered };
                                              items[tutorialIndex] = { ...items[tutorialIndex], pages };
                                              return { ...prev, tutorials: items };
                                            })}
                                          >
                                            Remove Concept
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h5 className="text-sm font-semibold">Learning Points</h5>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => syncHomeContent((prev) => {
                                          const items = [...ensureArray(prev.tutorials, [])];
                                          const pages = [...ensureArray(items[tutorialIndex]?.pages, [])];
                                          const learnPoints = [...ensureArray(pages[pageIndex]?.learnPoints, []), ''];
                                          pages[pageIndex] = { ...pages[pageIndex], learnPoints };
                                          items[tutorialIndex] = { ...items[tutorialIndex], pages };
                                          return { ...prev, tutorials: items };
                                        })}
                                      >
                                        <Plus className="mr-2 h-4 w-4" /> Add Point
                                      </Button>
                                    </div>

                                    {ensureArray(page.learnPoints, []).map((point, pointIndex) => (
                                      <div key={`${tutorial.slug}-page-${pageIndex}-point-${pointIndex}`} className="flex gap-2">
                                        <Input
                                          value={point || ''}
                                          onChange={(e) => syncHomeContent((prev) => {
                                            const items = [...ensureArray(prev.tutorials, [])];
                                            const pages = [...ensureArray(items[tutorialIndex]?.pages, [])];
                                            const learnPoints = [...ensureArray(pages[pageIndex]?.learnPoints, [])];
                                            learnPoints[pointIndex] = e.target.value;
                                            pages[pageIndex] = { ...pages[pageIndex], learnPoints };
                                            items[tutorialIndex] = { ...items[tutorialIndex], pages };
                                            return { ...prev, tutorials: items };
                                          })}
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          className="text-red-600"
                                          onClick={() => syncHomeContent((prev) => {
                                            const items = [...ensureArray(prev.tutorials, [])];
                                            const pages = [...ensureArray(items[tutorialIndex]?.pages, [])];
                                            const learnPoints = ensureArray(pages[pageIndex]?.learnPoints, []).filter((_, idx) => idx !== pointIndex);
                                            pages[pageIndex] = { ...pages[pageIndex], learnPoints };
                                            items[tutorialIndex] = { ...items[tutorialIndex], pages };
                                            return { ...prev, tutorials: items };
                                          })}
                                        >
                                          Remove
                                        </Button>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="flex justify-end">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="text-red-600"
                                      onClick={() => syncHomeContent((prev) => {
                                        const items = [...ensureArray(prev.tutorials, [])];
                                        const pages = ensureArray(items[tutorialIndex]?.pages, []).filter((_, idx) => idx !== pageIndex);
                                        items[tutorialIndex] = { ...items[tutorialIndex], pages };
                                        return { ...prev, tutorials: items };
                                      })}
                                    >
                                      Remove Page
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                className="text-red-600"
                                onClick={() => syncHomeContent((prev) => ({
                                  ...prev,
                                  tutorials: ensureArray(prev.tutorials, []).filter((_, idx) => idx !== tutorialIndex),
                                }))}
                              >
                                Remove Topic
                              </Button>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="json" className="space-y-3 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Home Content JSON</label>
                      <Textarea
                        rows={28}
                        value={jsonText}
                        onChange={(e) => {
                          setJsonText(e.target.value);
                          setJsonError('');
                        }}
                      />
                    </div>
                    {jsonError && <div className="text-sm text-red-600">{jsonError}</div>}
                  </TabsContent>
                </Tabs>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : editingSlug ? 'Update Profile Type' : 'Create Profile Type'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <DataTable columns={columns} data={profiles} />
      </div>

      <Dialog open={!!viewingProfile} onOpenChange={() => setViewingProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewingProfile?.title}</DialogTitle>
            <DialogDescription>{viewingProfile?.description}</DialogDescription>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
            {JSON.stringify(viewingProfile?.home_content || {}, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
