import { getCollection } from 'astro:content';

export async function publishedEntries(collection: 'writings' | 'projects') {
  return (await getCollection(collection, ({ data }) => !data.draft)).sort((a, b) => {
    const featured = Number('featured' in b.data && b.data.featured) - Number('featured' in a.data && a.data.featured);
    return featured || b.data.date.valueOf() - a.data.date.valueOf() || a.id.localeCompare(b.id);
  });
}

export function entryHref(collection: string, id: string) {
  return `/${collection}/${id.split('/').map(encodeURIComponent).join('/')}/`;
}

export const formatDate = (date: Date) => new Intl.DateTimeFormat('en', {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
}).format(date);
