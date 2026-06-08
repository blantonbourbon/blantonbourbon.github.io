import { getCollection, type CollectionEntry } from 'astro:content'
import { DateTime } from 'luxon'
import type {
  Post,
  PostCollection,
  PostFeedItem,
  PostTag,
  SupportedLocale,
} from '../types'
import { slugifySpace } from './format'

type PostEntry = CollectionEntry<'posts'>

interface PostCatalogOptions {
  tag?: string
}

const DEFAULT_LOCALE: SupportedLocale = 'zh'

function normalizeLocale(locale?: string): SupportedLocale {
  return locale === 'en' ? 'en' : DEFAULT_LOCALE
}

function getEntryLocale(slug: string): SupportedLocale | undefined {
  if (slug.startsWith('zh/')) return 'zh'
  if (slug.startsWith('en/')) return 'en'
}

function getEntrySlug(entry: PostEntry): string {
  if ('slug' in entry && typeof entry.slug === 'string') {
    return entry.slug
  }
  return entry.id
}

function getRouteSlug(slug: string): string {
  return slug.replace(/^(zh|en)\//, '')
}

function getTagSlug(tag: string): string {
  return slugifySpace(tag) ?? tag
}

export function getPostUrl(locale: string, routeSlug: string): string {
  const normalizedLocale = normalizeLocale(locale)
  return `/${normalizedLocale}/posts/${routeSlug}/`
}

export function getTagUrl(locale: string, tag: string): string {
  const normalizedLocale = normalizeLocale(locale)
  return `/${normalizedLocale}/tags/${getTagSlug(tag)}/`
}

function isVisiblePost(entry: PostEntry): boolean {
  return Boolean(!entry.data.isDraft && entry.data.date)
}

function getDisplayTitle(entry: PostEntry, locale: SupportedLocale): string {
  const routeSlug = getRouteSlug(getEntrySlug(entry))
  if (locale === 'en')
    return entry.data['title-en'] || entry.data.title || routeSlug
  return entry.data.title || entry.data['title-en'] || routeSlug
}

function getDateMillis(date: string): number {
  const isoDate = DateTime.fromISO(date)
  if (isoDate.isValid) return isoDate.toMillis()
  return DateTime.fromJSDate(new Date(date)).toMillis()
}

function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort(
    (a, b) => getDateMillis(b.date) - getDateMillis(a.date),
  )
}

function toCatalogPost(entry: PostEntry): Post | undefined {
  const slug = getEntrySlug(entry)
  const locale = getEntryLocale(slug)
  if (!locale || !isVisiblePost(entry)) return

  const routeSlug = getRouteSlug(slug)
  const tags = entry.data.tags ?? []

  return {
    ...entry.data,
    displayTitle: getDisplayTitle(entry, locale),
    tags,
    url: getPostUrl(locale, routeSlug),
    slug,
    routeSlug,
    locale,
  }
}

function toTag(locale: SupportedLocale, tag: string): PostTag {
  return {
    name: tag,
    slug: getTagSlug(tag),
    labelKey: `tags.${tag}`,
    url: getTagUrl(locale, tag),
  }
}

function collectTags(posts: Post[], locale: SupportedLocale): PostTag[] {
  const seen = new Set<string>()
  const tags: PostTag[] = []
  for (const post of posts) {
    for (const tag of post.tags) {
      if (seen.has(tag)) continue
      seen.add(tag)
      tags.push(toTag(locale, tag))
    }
  }
  return tags
}

function findTag(tags: PostTag[], tag: string): PostTag | undefined {
  return tags.find((item) => item.name === tag || item.slug === tag)
}

export const getPostCatalog = async (
  locale: string = DEFAULT_LOCALE,
  options: PostCatalogOptions = {},
): Promise<PostCollection> => {
  const normalizedLocale = normalizeLocale(locale)
  const allPosts = await getCollection('posts')
  const localePosts = sortPosts(
    allPosts.map(toCatalogPost).filter((post): post is Post => {
      if (!post) return false
      return post.locale === normalizedLocale
    }),
  )
  const tags = collectTags(localePosts, normalizedLocale)
  const activeTag = options.tag ? findTag(tags, options.tag) : undefined
  const posts = activeTag
    ? localePosts.filter((post) => post.tags.includes(activeTag.name))
    : localePosts

  return {
    posts,
    tags,
    activeTag,
  }
}

export async function getTagStaticPaths(locale: string) {
  const { tags } = await getPostCatalog(locale)
  return tags.map((tag) => ({
    params: { tag: tag.slug },
  }))
}

export async function getPostStaticPaths(locale: string) {
  const { posts } = await getPostCatalog(locale)
  return posts.map((post) => ({
    params: { slug: post.routeSlug },
  }))
}

export async function getFeedPosts(): Promise<PostFeedItem[]> {
  const allPosts = await getCollection('posts')
  return sortPosts(
    allPosts.map(toCatalogPost).filter((post): post is Post => Boolean(post)),
  ).map((post) => {
    const entry = allPosts.find((item) => getEntrySlug(item) === post.slug)
    return {
      ...post,
      body: entry?.body ?? '',
      link: post.url,
    }
  })
}
