// 通用类型定义

export interface Post {
  title?: string
  'title-en'?: string
  displayTitle: string
  tags: string[]
  date: string
  lastModified?: Date
  notificationTypes?: string[]
  isDraft?: boolean
  url: string
  slug: string
  routeSlug: string
  locale: SupportedLocale
}

export interface PostTag {
  name: string
  slug: string
  labelKey: string
  url: string
}

export interface PostFeedItem extends Post {
  body: string
  link: string
}

export interface PostCollection {
  posts: Post[]
  tags: PostTag[]
  activeTag?: PostTag
}

export interface LocaleConfig {
  path: (path: string) => string
  t: (key: string) => string
  locale: string
}

export type SupportedLocale = 'zh' | 'en'

export interface ReadingStats {
  wordCount: number
  chineseCharCount: number
  englishWordCount: number
  readingTime: number // 分钟
  displayText: string
}
