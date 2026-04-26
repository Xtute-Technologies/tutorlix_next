const TYPE_LABELS = {
  modules: 'Module',
  learningPaths: 'Learning Path',
  courses: 'Instructor-Led Course',
  certifications: 'Certification',
  appliedSkills: 'Applied Skill',
};

export function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export function buildSearchHaystack(item) {
  return [
    item.title,
    item.summary,
    item.subtitle,
    item.display_name,
    ...normalizeArray(item.roles),
    ...normalizeArray(item.levels),
    ...normalizeArray(item.products),
    ...normalizeArray(item.subjects),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function normalizeCatalogItems(data, selectedTypes) {
  return selectedTypes.flatMap((typeKey) => {
    const records = Array.isArray(data?.[typeKey]) ? data[typeKey] : [];

    return records.map((item) => ({
      uid: item.uid,
      title: item.title || item.display_name || 'Untitled Microsoft Learn item',
      summary: item.summary || item.subtitle || '',
      url: item.url || '',
      icon_url: item.icon_url || item.social_image_url || '',
      duration_in_minutes: item.duration_in_minutes || 0,
      levels: normalizeArray(item.levels),
      roles: normalizeArray(item.roles),
      products: normalizeArray(item.products),
      subjects: normalizeArray(item.subjects),
      last_modified: item.last_modified || null,
      type: typeKey,
      typeLabel: TYPE_LABELS[typeKey] || typeKey,
      popularity: typeof item.popularity === 'number' ? item.popularity : 0,
      locale: item.locale || 'en-us',
    }));
  });
}

export function sortCatalogItems(items) {
  return [...items].sort((left, right) => {
    if (right.popularity !== left.popularity) {
      return right.popularity - left.popularity;
    }

    const leftDate = left.last_modified ? new Date(left.last_modified).getTime() : 0;
    const rightDate = right.last_modified ? new Date(right.last_modified).getTime() : 0;
    return rightDate - leftDate;
  });
}

export function filterCatalogItems(items, q, level) {
  return items
    .filter((item) => (q ? buildSearchHaystack(item).includes(q) : true))
    .filter((item) => (level ? item.levels.some((itemLevel) => itemLevel.toLowerCase() === level) : true));
}

export function buildPayloadFromFilteredItems(items, page, pageSize, effectiveTypes, source, stale = false, cachedAt = null) {
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
    availableLevels: Array.from(new Set(items.flatMap((item) => item.levels))).sort(),
    requestedTypes: effectiveTypes,
    source,
    stale,
    cachedAt,
  };
}
