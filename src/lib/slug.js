// URL/id slug helper. Lowercases, replaces non-alphanumerics with `-`,
// trims leading/trailing dashes, caps at 60 chars.
export function slugify(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}
