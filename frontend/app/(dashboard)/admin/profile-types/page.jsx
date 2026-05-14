'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Eye, FileText, HelpCircle, Link2, MessageSquare, Pencil, Plus, Search, Trash2 } from 'lucide-react';

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { profileTypeAPI } from '@/lib/lmsService';
import { defaultProfileHomeContent } from '@/app/data/homeContent';
import { normalizeSeoProfileContent } from '@/lib/seo';

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

const createEmptyFaq = () => ({
  question: '',
  answer: '',
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
    seo: normalizeSeoProfileContent(slug, incoming.seo || {}),
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
  const [manualDrawer, setManualDrawer] = useState({ type: '', data: {} });
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
    setManualDrawer({ type: '', data: {} });
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

  const handleBulkDelete = async (rows) => {
    const results = await Promise.allSettled(rows.map((row) => profileTypeAPI.delete(row.slug)));
    const failedCount = results.filter((result) => result.status === 'rejected').length;
    setMessage(
      failedCount > 0
        ? { type: 'error', text: `${failedCount} profile type(s) could not be deleted.` }
        : { type: 'success', text: `${rows.length} profile type(s) deleted successfully.` }
    );
    fetchProfiles();
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

  const seoContent = formState.home_content?.seo || normalizeSeoProfileContent(formState.slug || 'college', {});

  const openManualDrawer = (type, data = {}) => setManualDrawer({ type, data });
  const closeManualDrawer = () => setManualDrawer({ type: '', data: {} });

  const updateSeoSection = (sectionKey, patch) => {
    syncHomeContent((prev) => ({
      ...prev,
      seo: {
        ...prev.seo,
        [sectionKey]: {
          ...prev.seo?.[sectionKey],
          ...patch,
        },
      },
    }));
  };

  const updateTutorialAt = (tutorialIndex, patch) => {
    syncHomeContent((prev) => {
      const items = [...ensureArray(prev.tutorials, [])];
      items[tutorialIndex] = { ...items[tutorialIndex], ...patch };
      return { ...prev, tutorials: items };
    });
  };

  const updateTutorialPageAt = (tutorialIndex, pageIndex, patch) => {
    syncHomeContent((prev) => {
      const items = [...ensureArray(prev.tutorials, [])];
      const pages = [...ensureArray(items[tutorialIndex]?.pages, [])];
      pages[pageIndex] = { ...pages[pageIndex], ...patch };
      items[tutorialIndex] = { ...items[tutorialIndex], pages };
      return { ...prev, tutorials: items };
    });
  };

  const updatePageConceptAt = (tutorialIndex, pageIndex, conceptIndex, patch) => {
    syncHomeContent((prev) => {
      const items = [...ensureArray(prev.tutorials, [])];
      const pages = [...ensureArray(items[tutorialIndex]?.pages, [])];
      const conceptsCovered = [...ensureArray(pages[pageIndex]?.conceptsCovered, [])];
      conceptsCovered[conceptIndex] = { ...conceptsCovered[conceptIndex], ...patch };
      pages[pageIndex] = { ...pages[pageIndex], conceptsCovered };
      items[tutorialIndex] = { ...items[tutorialIndex], pages };
      return { ...prev, tutorials: items };
    });
  };

  const updatePageLearnPointAt = (tutorialIndex, pageIndex, pointIndex, value) => {
    syncHomeContent((prev) => {
      const items = [...ensureArray(prev.tutorials, [])];
      const pages = [...ensureArray(items[tutorialIndex]?.pages, [])];
      const learnPoints = [...ensureArray(pages[pageIndex]?.learnPoints, [])];
      learnPoints[pointIndex] = value;
      pages[pageIndex] = { ...pages[pageIndex], learnPoints };
      items[tutorialIndex] = { ...items[tutorialIndex], pages };
      return { ...prev, tutorials: items };
    });
  };

  const SummaryRow = ({ icon: Icon, title, meta, onEdit, onRemove, children }) => (
    <div className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3">
      <div className="flex min-w-0 flex-1 gap-3">
        {Icon && (
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-slate-950">{title || 'Untitled'}</div>
          {meta && <div className="mt-0.5 truncate text-xs text-slate-500">{meta}</div>}
          {children}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onEdit && (
          <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {onRemove && (
          <Button type="button" size="sm" variant="ghost" className="text-red-600" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  const renderManualDrawerContent = () => {
    const { type, data } = manualDrawer;

    if (type === 'primaryLink') {
      const index = data.index;
      const link = primaryLinks[index] || createEmptyPrimaryLink();

      return (
        <div className="space-y-4">
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
      );
    }

    if (type === 'subnavGroup') {
      const groupIndex = data.groupIndex;
      const group = subnavGroups[groupIndex] || createEmptySubnavGroup();
      const items = ensureArray(group.items, []);

      return (
        <div className="space-y-5">
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
                onClick={() => {
                  const itemIndex = items.length;
                  syncHomeContent((prev) => {
                    const groups = [...ensureArray(prev.navigation?.subnav_groups, [])];
                    const nextItems = [...ensureArray(groups[groupIndex]?.items, []), createEmptySubnavLink()];
                    groups[groupIndex] = { ...groups[groupIndex], items: nextItems };
                    return { ...prev, navigation: { ...prev.navigation, subnav_groups: groups } };
                  });
                  openManualDrawer('subnavItem', { groupIndex, itemIndex });
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>
            {items.map((item, itemIndex) => (
              <SummaryRow
                key={`drawer-subnav-item-${groupIndex}-${itemIndex}`}
                icon={Link2}
                title={item.label}
                meta={item.url || 'No URL'}
                onEdit={() => openManualDrawer('subnavItem', { groupIndex, itemIndex })}
                onRemove={() => syncHomeContent((prev) => {
                  const groups = [...ensureArray(prev.navigation?.subnav_groups, [])];
                  const nextItems = ensureArray(groups[groupIndex]?.items, []).filter((_, idx) => idx !== itemIndex);
                  groups[groupIndex] = { ...groups[groupIndex], items: nextItems };
                  return { ...prev, navigation: { ...prev.navigation, subnav_groups: groups } };
                })}
              />
            ))}
          </div>
        </div>
      );
    }

    if (type === 'subnavItem') {
      const { groupIndex, itemIndex } = data;
      const item = ensureArray(subnavGroups[groupIndex]?.items, [])[itemIndex] || createEmptySubnavLink();

      return (
        <div className="space-y-4">
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
        </div>
      );
    }

    if (type === 'testimonial') {
      const reviewIndex = data.reviewIndex;
      const review = testimonials[reviewIndex] || createEmptyReview();

      return (
        <div className="space-y-4">
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
          <div className="space-y-2">
            <label className="text-sm font-medium">Review Text</label>
            <Textarea
              rows={6}
              value={review.text || ''}
              onChange={(e) => syncHomeContent((prev) => {
                const items = [...ensureArray(prev.testimonials?.items, [])];
                items[reviewIndex] = { ...items[reviewIndex], text: e.target.value };
                return { ...prev, testimonials: { ...prev.testimonials, items } };
              })}
            />
          </div>
        </div>
      );
    }

    if (type === 'seoHomepage') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Homepage Section Title</label>
            <Input value={seoContent.homepage?.sectionTitle || ''} onChange={(e) => updateSeoSection('homepage', { sectionTitle: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Homepage FAQ Description</label>
            <Input value={seoContent.homepage?.faqDescription || ''} onChange={(e) => updateSeoSection('homepage', { faqDescription: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Homepage Section Description</label>
            <Textarea rows={6} value={seoContent.homepage?.sectionDescription || ''} onChange={(e) => updateSeoSection('homepage', { sectionDescription: e.target.value })} />
          </div>
        </div>
      );
    }

    if (type === 'seoCourses') {
      const introParagraphs = ensureArray(seoContent.courses?.introParagraphs, ['', '']);
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Courses H1</label>
              <Input value={seoContent.courses?.title || ''} onChange={(e) => updateSeoSection('courses', { title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Courses Subtitle</label>
              <Input value={seoContent.courses?.subtitle || ''} onChange={(e) => updateSeoSection('courses', { subtitle: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Courses Intro Title</label>
              <Input value={seoContent.courses?.introTitle || ''} onChange={(e) => updateSeoSection('courses', { introTitle: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Live Classes Section Title</label>
              <Input value={seoContent.courses?.liveTitle || ''} onChange={(e) => updateSeoSection('courses', { liveTitle: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Courses Intro Paragraph 1</label>
            <Textarea
              rows={4}
              value={introParagraphs[0] || ''}
              onChange={(e) => {
                const next = [...introParagraphs];
                next[0] = e.target.value;
                updateSeoSection('courses', { introParagraphs: next });
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Courses Intro Paragraph 2</label>
            <Textarea
              rows={4}
              value={introParagraphs[1] || ''}
              onChange={(e) => {
                const next = [...introParagraphs];
                next[1] = e.target.value;
                updateSeoSection('courses', { introParagraphs: next });
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Live Classes Description</label>
            <Textarea rows={4} value={seoContent.courses?.liveDescription || ''} onChange={(e) => updateSeoSection('courses', { liveDescription: e.target.value })} />
          </div>
        </div>
      );
    }

    if (type === 'seoPages') {
      return (
        <div className="space-y-6">
          {[
            ['questionBank', 'Question Bank'],
            ['notes', 'Notes'],
            ['masterclass', 'Masterclass'],
          ].map(([sectionKey, title]) => (
            <div key={sectionKey} className="space-y-3 rounded-lg border p-4">
              <h4 className="text-sm font-semibold">{title}</h4>
              <div className="space-y-2">
                <label className="text-sm font-medium">{title} H1</label>
                <Input value={seoContent[sectionKey]?.title || ''} onChange={(e) => updateSeoSection(sectionKey, { title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{title} Intro Description</label>
                <Textarea rows={3} value={seoContent[sectionKey]?.introDescription || ''} onChange={(e) => updateSeoSection(sectionKey, { introDescription: e.target.value })} />
              </div>
            </div>
          ))}
          <div className="space-y-2 rounded-lg border p-4">
            <label className="text-sm font-medium">Contact Description</label>
            <Input value={seoContent.contact?.rightDescription || ''} onChange={(e) => updateSeoSection('contact', { rightDescription: e.target.value })} />
          </div>
        </div>
      );
    }

    if (type === 'seoFaq') {
      const { sectionKey, faqIndex } = data;
      const section = seoContent?.[sectionKey] || {};
      const faq = ensureArray(section.faqs, [])[faqIndex] || createEmptyFaq();

      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Question</label>
            <Input
              value={faq.question || ''}
              onChange={(e) => syncHomeContent((prev) => {
                const nextSection = prev.seo?.[sectionKey] || {};
                const nextFaqs = [...ensureArray(nextSection.faqs, [])];
                nextFaqs[faqIndex] = { ...nextFaqs[faqIndex], question: e.target.value };
                return { ...prev, seo: { ...prev.seo, [sectionKey]: { ...nextSection, faqs: nextFaqs } } };
              })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Answer</label>
            <Textarea
              rows={6}
              value={faq.answer || ''}
              onChange={(e) => syncHomeContent((prev) => {
                const nextSection = prev.seo?.[sectionKey] || {};
                const nextFaqs = [...ensureArray(nextSection.faqs, [])];
                nextFaqs[faqIndex] = { ...nextFaqs[faqIndex], answer: e.target.value };
                return { ...prev, seo: { ...prev.seo, [sectionKey]: { ...nextSection, faqs: nextFaqs } } };
              })}
            />
          </div>
        </div>
      );
    }

    if (type === 'tutorial') {
      const tutorialIndex = data.tutorialIndex;
      const tutorial = tutorials[tutorialIndex] || createEmptyTutorial();
      const pages = ensureArray(tutorial.pages, []);

      return (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tutorial Group Title</label>
              <Input value={tutorial.title || ''} onChange={(e) => updateTutorialAt(tutorialIndex, { title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Group Slug</label>
              <Input value={tutorial.slug || ''} onChange={(e) => updateTutorialAt(tutorialIndex, { slug: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Group Description</label>
            <Textarea rows={4} value={tutorial.description || ''} onChange={(e) => updateTutorialAt(tutorialIndex, { description: e.target.value })} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Tutorial Pages</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const pageIndex = pages.length;
                  syncHomeContent((prev) => {
                    const items = [...ensureArray(prev.tutorials, [])];
                    const nextPages = [...ensureArray(items[tutorialIndex]?.pages, []), createEmptyTutorialPage()];
                    items[tutorialIndex] = { ...items[tutorialIndex], pages: nextPages };
                    return { ...prev, tutorials: items };
                  });
                  openManualDrawer('tutorialPage', { tutorialIndex, pageIndex });
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Page
              </Button>
            </div>
            {pages.map((page, pageIndex) => (
              <SummaryRow
                key={`drawer-page-${tutorialIndex}-${pageIndex}`}
                icon={FileText}
                title={page.title}
                meta={`${ensureArray(page.conceptsCovered, []).length} concepts · ${ensureArray(page.learnPoints, []).length} points`}
                onEdit={() => openManualDrawer('tutorialPage', { tutorialIndex, pageIndex })}
                onRemove={() => syncHomeContent((prev) => {
                  const items = [...ensureArray(prev.tutorials, [])];
                  const nextPages = ensureArray(items[tutorialIndex]?.pages, []).filter((_, idx) => idx !== pageIndex);
                  items[tutorialIndex] = { ...items[tutorialIndex], pages: nextPages };
                  return { ...prev, tutorials: items };
                })}
              />
            ))}
          </div>
        </div>
      );
    }

    if (type === 'tutorialPage') {
      const { tutorialIndex, pageIndex } = data;
      const page = ensureArray(tutorials[tutorialIndex]?.pages, [])[pageIndex] || createEmptyTutorialPage();
      const concepts = ensureArray(page.conceptsCovered, []);
      const learnPoints = ensureArray(page.learnPoints, []);

      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Page Title</label>
              <Input value={page.title || ''} onChange={(e) => updateTutorialPageAt(tutorialIndex, pageIndex, { title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Page Slug</label>
              <Input value={page.slug || ''} onChange={(e) => updateTutorialPageAt(tutorialIndex, pageIndex, { slug: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Short Description</label>
              <Input value={page.shortDescription || ''} onChange={(e) => updateTutorialPageAt(tutorialIndex, pageIndex, { shortDescription: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Scope Label</label>
              <Input value={page.scopeLabel || ''} onChange={(e) => updateTutorialPageAt(tutorialIndex, pageIndex, { scopeLabel: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Overview</label>
            <Textarea rows={5} value={page.overview || ''} onChange={(e) => updateTutorialPageAt(tutorialIndex, pageIndex, { overview: e.target.value })} />
          </div>
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Core Concepts</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const conceptIndex = concepts.length;
                  updateTutorialPageAt(tutorialIndex, pageIndex, {
                    conceptsCovered: [...concepts, { slug: '', title: '', noteUrl: '' }],
                  });
                  openManualDrawer('concept', { tutorialIndex, pageIndex, conceptIndex });
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Concept
              </Button>
            </div>
            {concepts.map((concept, conceptIndex) => (
              <SummaryRow
                key={`drawer-concept-${tutorialIndex}-${pageIndex}-${conceptIndex}`}
                icon={BookOpen}
                title={concept.title}
                meta={concept.noteUrl || concept.slug || 'No note linked'}
                onEdit={() => openManualDrawer('concept', { tutorialIndex, pageIndex, conceptIndex })}
                onRemove={() => updateTutorialPageAt(tutorialIndex, pageIndex, {
                  conceptsCovered: concepts.filter((_, idx) => idx !== conceptIndex),
                })}
              />
            ))}
          </div>
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Learning Points</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const pointIndex = learnPoints.length;
                  updateTutorialPageAt(tutorialIndex, pageIndex, { learnPoints: [...learnPoints, ''] });
                  openManualDrawer('learnPoint', { tutorialIndex, pageIndex, pointIndex });
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Point
              </Button>
            </div>
            {learnPoints.map((point, pointIndex) => (
              <SummaryRow
                key={`drawer-point-${tutorialIndex}-${pageIndex}-${pointIndex}`}
                title={point || `Point ${pointIndex + 1}`}
                meta={`Learning point ${pointIndex + 1}`}
                onEdit={() => openManualDrawer('learnPoint', { tutorialIndex, pageIndex, pointIndex })}
                onRemove={() => updateTutorialPageAt(tutorialIndex, pageIndex, {
                  learnPoints: learnPoints.filter((_, idx) => idx !== pointIndex),
                })}
              />
            ))}
          </div>
        </div>
      );
    }

    if (type === 'concept') {
      const { tutorialIndex, pageIndex, conceptIndex } = data;
      const page = ensureArray(tutorials[tutorialIndex]?.pages, [])[pageIndex] || {};
      const concept = ensureArray(page.conceptsCovered, [])[conceptIndex] || { slug: '', title: '', noteUrl: '' };

      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Concept Title</label>
            <Input value={concept.title || ''} onChange={(e) => updatePageConceptAt(tutorialIndex, pageIndex, conceptIndex, { title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Concept Slug</label>
            <Input value={concept.slug || ''} onChange={(e) => updatePageConceptAt(tutorialIndex, pageIndex, conceptIndex, { slug: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Note URL</label>
            <Input value={concept.noteUrl || ''} onChange={(e) => updatePageConceptAt(tutorialIndex, pageIndex, conceptIndex, { noteUrl: e.target.value })} />
          </div>
        </div>
      );
    }

    if (type === 'learnPoint') {
      const { tutorialIndex, pageIndex, pointIndex } = data;
      const page = ensureArray(tutorials[tutorialIndex]?.pages, [])[pageIndex] || {};
      const point = ensureArray(page.learnPoints, [])[pointIndex] || '';

      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">Learning Point</label>
          <Textarea rows={5} value={point} onChange={(e) => updatePageLearnPointAt(tutorialIndex, pageIndex, pointIndex, e.target.value)} />
        </div>
      );
    }

    return <div className="text-sm text-slate-500">Choose an item to edit.</div>;
  };

  const getDrawerTitle = () => {
    const titles = {
      primaryLink: 'Edit Primary Link',
      subnavGroup: 'Edit Dropdown',
      subnavItem: 'Edit Dropdown Item',
      testimonial: 'Edit Review',
      seoHomepage: 'Homepage SEO',
      seoCourses: 'Courses SEO',
      seoPages: 'Page SEO',
      seoFaq: 'Edit FAQ',
      tutorial: 'Edit Tutorial Topic',
      tutorialPage: 'Edit Tutorial Page',
      concept: 'Edit Concept',
      learnPoint: 'Edit Learning Point',
    };
    return titles[manualDrawer.type] || 'Manual Editor';
  };

  const renderManualEditor = () => {
    const faqSections = [
      ['homepage', 'Homepage FAQs'],
      ['courses', 'Courses FAQs'],
      ['questionBank', 'Question Bank FAQs'],
      ['notes', 'Notes FAQs'],
    ];

    return (
      <div className="space-y-6">
        <div className="rounded-lg border bg-slate-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Manual Content Workspace</h3>
              <p className="text-sm text-slate-600">Edit nested navigation, SEO, reviews, and tutorials from a right drawer.</p>
            </div>
            <Badge variant="secondary">{tutorials.length} tutorial groups</Badge>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.7fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
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
                  <div className="flex items-center gap-3 md:col-span-2">
                    <Switch
                      checked={!!formState.home_content.navigation?.tutorials_enabled}
                      onCheckedChange={(checked) => syncHomeContent((prev) => ({
                        ...prev,
                        navigation: { ...prev.navigation, tutorials_enabled: checked },
                      }))}
                    />
                    <span className="text-sm font-medium">Show topic subnav below navbar</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Primary Navbar Links</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const index = primaryLinks.length;
                        syncHomeContent((prev) => ({
                          ...prev,
                          navigation: {
                            ...prev.navigation,
                            primary_links: [...ensureArray(prev.navigation?.primary_links, []), createEmptyPrimaryLink()],
                          },
                        }));
                        openManualDrawer('primaryLink', { index });
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Link
                    </Button>
                  </div>
                  {primaryLinks.map((link, index) => (
                    <SummaryRow
                      key={`primary-link-${index}`}
                      icon={Link2}
                      title={link.label}
                      meta={`${link.url || 'No URL'} · ${link.visibility || 'public'}`}
                      onEdit={() => openManualDrawer('primaryLink', { index })}
                      onRemove={() => syncHomeContent((prev) => ({
                        ...prev,
                        navigation: {
                          ...prev.navigation,
                          primary_links: ensureArray(prev.navigation?.primary_links, []).filter((_, idx) => idx !== index),
                        },
                      }))}
                    />
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Subnavigation Dropdowns</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const groupIndex = subnavGroups.length;
                        syncHomeContent((prev) => ({
                          ...prev,
                          navigation: {
                            ...prev.navigation,
                            subnav_groups: [...ensureArray(prev.navigation?.subnav_groups, []), createEmptySubnavGroup()],
                          },
                        }));
                        openManualDrawer('subnavGroup', { groupIndex });
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Dropdown
                    </Button>
                  </div>
                  {subnavGroups.map((group, groupIndex) => (
                    <SummaryRow
                      key={`subnav-group-${groupIndex}`}
                      icon={ChevronRight}
                      title={group.label}
                      meta={`${ensureArray(group.items, []).length} items`}
                      onEdit={() => openManualDrawer('subnavGroup', { groupIndex })}
                      onRemove={() => syncHomeContent((prev) => ({
                        ...prev,
                        navigation: {
                          ...prev.navigation,
                          subnav_groups: ensureArray(prev.navigation?.subnav_groups, []).filter((_, idx) => idx !== groupIndex),
                        },
                      }))}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Tutorial Topics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-600">Open a topic, then manage its pages, concepts, and learning points in the drawer.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const tutorialIndex = tutorials.length;
                      syncHomeContent((prev) => ({
                        ...prev,
                        tutorials: [...ensureArray(prev.tutorials, []), createEmptyTutorial()],
                      }));
                      openManualDrawer('tutorial', { tutorialIndex });
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Topic
                  </Button>
                </div>
                {tutorials.map((tutorial, tutorialIndex) => (
                  <SummaryRow
                    key={`tutorial-${tutorialIndex}`}
                    icon={BookOpen}
                    title={tutorial.title}
                    meta={`${tutorial.slug || 'no-slug'} · ${ensureArray(tutorial.pages, []).length} pages`}
                    onEdit={() => openManualDrawer('tutorial', { tutorialIndex })}
                    onRemove={() => syncHomeContent((prev) => ({
                      ...prev,
                      tutorials: ensureArray(prev.tutorials, []).filter((_, idx) => idx !== tutorialIndex),
                    }))}
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">SEO Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <SummaryRow icon={Search} title="Homepage SEO" meta={seoContent.homepage?.sectionTitle || 'Section title and FAQ intro'} onEdit={() => openManualDrawer('seoHomepage')} />
                <SummaryRow icon={Search} title="Courses SEO" meta={seoContent.courses?.title || 'Course page copy'} onEdit={() => openManualDrawer('seoCourses')} />
                <SummaryRow icon={Search} title="Question Bank, Notes, Masterclass, Contact" meta="Page headings and intro copy" onEdit={() => openManualDrawer('seoPages')} />

                <div className="space-y-3 pt-2">
                  {faqSections.map(([sectionKey, title]) => {
                    const faqs = ensureArray(seoContent?.[sectionKey]?.faqs, []);
                    return (
                      <div key={sectionKey} className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold">{title}</div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const faqIndex = faqs.length;
                              syncHomeContent((prev) => {
                                const section = prev.seo?.[sectionKey] || {};
                                return {
                                  ...prev,
                                  seo: {
                                    ...prev.seo,
                                    [sectionKey]: {
                                      ...section,
                                      faqs: [...ensureArray(section.faqs, []), createEmptyFaq()],
                                    },
                                  },
                                };
                              });
                              openManualDrawer('seoFaq', { sectionKey, faqIndex });
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" /> Add
                          </Button>
                        </div>
                        {faqs.map((faq, faqIndex) => (
                          <SummaryRow
                            key={`${sectionKey}-faq-${faqIndex}`}
                            icon={HelpCircle}
                            title={faq.question}
                            meta={faq.answer || 'No answer'}
                            onEdit={() => openManualDrawer('seoFaq', { sectionKey, faqIndex })}
                            onRemove={() => syncHomeContent((prev) => {
                              const section = prev.seo?.[sectionKey] || {};
                              return {
                                ...prev,
                                seo: {
                                  ...prev.seo,
                                  [sectionKey]: {
                                    ...section,
                                    faqs: ensureArray(section.faqs, []).filter((_, idx) => idx !== faqIndex),
                                  },
                                },
                              };
                            })}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Student Success Stories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
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
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const reviewIndex = testimonials.length;
                      syncHomeContent((prev) => ({
                        ...prev,
                        testimonials: {
                          ...prev.testimonials,
                          items: [...ensureArray(prev.testimonials?.items, []), createEmptyReview()],
                        },
                      }));
                      openManualDrawer('testimonial', { reviewIndex });
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Review
                  </Button>
                </div>
                {testimonials.map((review, reviewIndex) => (
                  <SummaryRow
                    key={`review-${reviewIndex}`}
                    icon={MessageSquare}
                    title={review.name}
                    meta={review.course || review.text || 'No review text'}
                    onEdit={() => openManualDrawer('testimonial', { reviewIndex })}
                    onRemove={() => syncHomeContent((prev) => ({
                      ...prev,
                      testimonials: {
                        ...prev.testimonials,
                        items: ensureArray(prev.testimonials?.items, []).filter((_, idx) => idx !== reviewIndex),
                      },
                    }))}
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <Sheet open={!!manualDrawer.type} onOpenChange={(open) => !open && closeManualDrawer()}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
            <SheetHeader className="border-b px-6 py-5">
              <SheetTitle>{getDrawerTitle()}</SheetTitle>
              <SheetDescription>Changes save into the manual form immediately. Use the page save button when finished.</SheetDescription>
            </SheetHeader>
            <div className="px-6 pb-8">
              {renderManualDrawerContent()}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  };

  const renderSeoFaqEditor = (sectionKey, title) => {
    const faqs = ensureArray(seoContent?.[sectionKey]?.faqs, []);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">{title}</h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => syncHomeContent((prev) => {
              const section = prev.seo?.[sectionKey] || {};
              return {
                ...prev,
                seo: {
                  ...prev.seo,
                  [sectionKey]: {
                    ...section,
                    faqs: [...ensureArray(section.faqs, []), createEmptyFaq()],
                  },
                },
              };
            })}
          >
            <Plus className="mr-2 h-4 w-4" /> Add FAQ
          </Button>
        </div>

        {faqs.map((faq, faqIndex) => (
          <div key={`${sectionKey}-faq-${faqIndex}`} className="rounded-lg border p-4 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Question</label>
              <Input
                value={faq.question || ''}
                onChange={(e) => syncHomeContent((prev) => {
                  const section = prev.seo?.[sectionKey] || {};
                  const nextFaqs = [...ensureArray(section.faqs, [])];
                  nextFaqs[faqIndex] = { ...nextFaqs[faqIndex], question: e.target.value };
                  return {
                    ...prev,
                    seo: {
                      ...prev.seo,
                      [sectionKey]: { ...section, faqs: nextFaqs },
                    },
                  };
                })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Answer</label>
              <Textarea
                rows={3}
                value={faq.answer || ''}
                onChange={(e) => syncHomeContent((prev) => {
                  const section = prev.seo?.[sectionKey] || {};
                  const nextFaqs = [...ensureArray(section.faqs, [])];
                  nextFaqs[faqIndex] = { ...nextFaqs[faqIndex], answer: e.target.value };
                  return {
                    ...prev,
                    seo: {
                      ...prev.seo,
                      [sectionKey]: { ...section, faqs: nextFaqs },
                    },
                  };
                })}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                className="text-red-600"
                onClick={() => syncHomeContent((prev) => {
                  const section = prev.seo?.[sectionKey] || {};
                  return {
                    ...prev,
                    seo: {
                      ...prev.seo,
                      [sectionKey]: {
                        ...section,
                        faqs: ensureArray(section.faqs, []).filter((_, idx) => idx !== faqIndex),
                      },
                    },
                  };
                })}
              >
                Remove FAQ
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

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

                  <TabsContent value="manual" className="pt-4">
                    {renderManualEditor()}
                    <div className="hidden">
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
                        <CardTitle className="text-lg">SEO Content</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Homepage Section Title</label>
                            <Input
                              value={seoContent.homepage?.sectionTitle || ''}
                              onChange={(e) => syncHomeContent((prev) => ({
                                ...prev,
                                seo: {
                                  ...prev.seo,
                                  homepage: { ...prev.seo?.homepage, sectionTitle: e.target.value },
                                },
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Homepage FAQ Description</label>
                            <Input
                              value={seoContent.homepage?.faqDescription || ''}
                              onChange={(e) => syncHomeContent((prev) => ({
                                ...prev,
                                seo: {
                                  ...prev.seo,
                                  homepage: { ...prev.seo?.homepage, faqDescription: e.target.value },
                                },
                              }))}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">Homepage Section Description</label>
                            <Textarea
                              rows={4}
                              value={seoContent.homepage?.sectionDescription || ''}
                              onChange={(e) => syncHomeContent((prev) => ({
                                ...prev,
                                seo: {
                                  ...prev.seo,
                                  homepage: { ...prev.seo?.homepage, sectionDescription: e.target.value },
                                },
                              }))}
                            />
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Courses H1</label>
                            <Input
                              value={seoContent.courses?.title || ''}
                              onChange={(e) => syncHomeContent((prev) => ({
                                ...prev,
                                seo: {
                                  ...prev.seo,
                                  courses: { ...prev.seo?.courses, title: e.target.value },
                                },
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Courses Subtitle</label>
                            <Input
                              value={seoContent.courses?.subtitle || ''}
                              onChange={(e) => syncHomeContent((prev) => ({
                                ...prev,
                                seo: {
                                  ...prev.seo,
                                  courses: { ...prev.seo?.courses, subtitle: e.target.value },
                                },
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Courses Intro Title</label>
                            <Input
                              value={seoContent.courses?.introTitle || ''}
                              onChange={(e) => syncHomeContent((prev) => ({
                                ...prev,
                                seo: {
                                  ...prev.seo,
                                  courses: { ...prev.seo?.courses, introTitle: e.target.value },
                                },
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Live Classes Section Title</label>
                            <Input
                              value={seoContent.courses?.liveTitle || ''}
                              onChange={(e) => syncHomeContent((prev) => ({
                                ...prev,
                                seo: {
                                  ...prev.seo,
                                  courses: { ...prev.seo?.courses, liveTitle: e.target.value },
                                },
                              }))}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">Courses Intro Paragraph 1</label>
                            <Textarea
                              rows={3}
                              value={ensureArray(seoContent.courses?.introParagraphs, ['', ''])[0] || ''}
                              onChange={(e) => syncHomeContent((prev) => {
                                const introParagraphs = [...ensureArray(prev.seo?.courses?.introParagraphs, ['', ''])];
                                introParagraphs[0] = e.target.value;
                                return {
                                  ...prev,
                                  seo: {
                                    ...prev.seo,
                                    courses: { ...prev.seo?.courses, introParagraphs },
                                  },
                                };
                              })}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">Courses Intro Paragraph 2</label>
                            <Textarea
                              rows={3}
                              value={ensureArray(seoContent.courses?.introParagraphs, ['', ''])[1] || ''}
                              onChange={(e) => syncHomeContent((prev) => {
                                const introParagraphs = [...ensureArray(prev.seo?.courses?.introParagraphs, ['', ''])];
                                introParagraphs[1] = e.target.value;
                                return {
                                  ...prev,
                                  seo: {
                                    ...prev.seo,
                                    courses: { ...prev.seo?.courses, introParagraphs },
                                  },
                                };
                              })}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">Live Classes Description</label>
                            <Textarea
                              rows={3}
                              value={seoContent.courses?.liveDescription || ''}
                              onChange={(e) => syncHomeContent((prev) => ({
                                ...prev,
                                seo: {
                                  ...prev.seo,
                                  courses: { ...prev.seo?.courses, liveDescription: e.target.value },
                                },
                              }))}
                            />
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Question Bank H1</label>
                            <Input
                              value={seoContent.questionBank?.title || ''}
                              onChange={(e) => syncHomeContent((prev) => ({
                                ...prev,
                                seo: {
                                  ...prev.seo,
                                  questionBank: { ...prev.seo?.questionBank, title: e.target.value },
                                },
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Notes H1</label>
                            <Input
                              value={seoContent.notes?.title || ''}
                              onChange={(e) => syncHomeContent((prev) => ({
                                ...prev,
                                seo: {
                                  ...prev.seo,
                                  notes: { ...prev.seo?.notes, title: e.target.value },
                                },
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Masterclass H1</label>
                            <Input
                              value={seoContent.masterclass?.title || ''}
                              onChange={(e) => syncHomeContent((prev) => ({
                                ...prev,
                                seo: {
                                  ...prev.seo,
                                  masterclass: { ...prev.seo?.masterclass, title: e.target.value },
                                },
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Contact Description</label>
                            <Input
                              value={seoContent.contact?.rightDescription || ''}
                              onChange={(e) => syncHomeContent((prev) => ({
                                ...prev,
                                seo: {
                                  ...prev.seo,
                                  contact: { ...prev.seo?.contact, rightDescription: e.target.value },
                                },
                              }))}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">Question Bank Intro Description</label>
                            <Textarea
                              rows={3}
                              value={seoContent.questionBank?.introDescription || ''}
                              onChange={(e) => syncHomeContent((prev) => ({
                                ...prev,
                                seo: {
                                  ...prev.seo,
                                  questionBank: { ...prev.seo?.questionBank, introDescription: e.target.value },
                                },
                              }))}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">Notes Intro Description</label>
                            <Textarea
                              rows={3}
                              value={seoContent.notes?.introDescription || ''}
                              onChange={(e) => syncHomeContent((prev) => ({
                                ...prev,
                                seo: {
                                  ...prev.seo,
                                  notes: { ...prev.seo?.notes, introDescription: e.target.value },
                                },
                              }))}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">Masterclass Intro Description</label>
                            <Textarea
                              rows={3}
                              value={seoContent.masterclass?.introDescription || ''}
                              onChange={(e) => syncHomeContent((prev) => ({
                                ...prev,
                                seo: {
                                  ...prev.seo,
                                  masterclass: { ...prev.seo?.masterclass, introDescription: e.target.value },
                                },
                              }))}
                            />
                          </div>
                        </div>

                        {renderSeoFaqEditor('homepage', 'Homepage FAQs')}
                        {renderSeoFaqEditor('courses', 'Courses FAQs')}
                        {renderSeoFaqEditor('questionBank', 'Question Bank FAQs')}
                        {renderSeoFaqEditor('notes', 'Notes FAQs')}
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
                    </div>
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

        <DataTable
          columns={columns}
          data={profiles}
          onBulkDelete={handleBulkDelete}
          bulkDeleteLabel="Delete selected"
          getRowId={(row) => row.slug}
        />
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
