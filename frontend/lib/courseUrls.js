export function slugifyCourseName(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getCoursePath(product) {
  if (!product) return '/courses';
  const slug = product.slug || slugifyCourseName(product.name) || product.id;
  return `/courses/${slug}`;
}
