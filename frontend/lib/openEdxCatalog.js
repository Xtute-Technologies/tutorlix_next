export function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export function buildSearchHaystack(item) {
  return [
    item.title,
    item.shortDescription,
    item.fullDescription,
    item.partner,
    ...normalizeArray(item.subjects),
    ...normalizeArray(item.skills),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function normalizeOpenEdxCourses(items = []) {
  return items.map((item) => ({
    key: item.key,
    title: item.title || 'Untitled Open edX course',
    shortDescription: item.short_description || '',
    fullDescription: item.full_description || '',
    level: item.level_type || '',
    marketingUrl: item.marketing_url || '',
    imageUrl: item.image?.src || '',
    videoUrl: item.video?.src || '',
    partner: item.owners?.[0]?.name || item.sponsors?.[0]?.name || '',
    subjects: normalizeArray(item.subjects).map((subject) => subject.name || subject.slug).filter(Boolean),
    skills: normalizeArray(item.expected_learning_items),
    modified: item.modified || null,
    runs: normalizeArray(item.course_runs).map((run) => ({
      key: run.key,
      title: run.title,
      start: run.start || null,
      end: run.end || null,
      pacingType: run.pacing_type || '',
      availability: run.availability || '',
    })),
  }));
}

export function filterOpenEdxCourses(items, q, level) {
  return items
    .filter((item) => (q ? buildSearchHaystack(item).includes(q) : true))
    .filter((item) => (level ? String(item.level).toLowerCase() === level : true));
}

export function sortOpenEdxCourses(items) {
  return [...items].sort((left, right) => {
    const leftDate = left.modified ? new Date(left.modified).getTime() : 0;
    const rightDate = right.modified ? new Date(right.modified).getTime() : 0;
    return rightDate - leftDate;
  });
}

export function buildPagedPayload(items, page, pageSize, source, stale = false, cachedAt = null, catalog = null) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  return {
    items: items.slice(startIndex, startIndex + pageSize),
    total,
    page: currentPage,
    pageSize,
    totalPages,
    availableLevels: Array.from(new Set(items.map((item) => item.level).filter(Boolean))).sort(),
    source,
    stale,
    cachedAt,
    catalog,
  };
}
