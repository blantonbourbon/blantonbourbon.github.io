import { existsSync, readdirSync } from 'node:fs'
import { defineCollection, z } from 'astro:content'

const postSchema = z.object({
  title: z.string().optional(),
  'title-en': z.string().optional(),
  tags: z.array(z.string()).optional(),
  date: z.string(),
  lastModified: z.date().optional(),
  notificationTypes: z.array(z.string()).optional(),
  isDraft: z.boolean().optional(),
  url: z.string().optional(),
})

const postsDirectory = new URL('./content/posts/', import.meta.url)

// src/content is a submodule; fresh checkouts may not have post files.
function hasContentFiles(directory: URL): boolean {
  if (!existsSync(directory)) return false

  return readdirSync(directory, { withFileTypes: true }).some((entry) => {
    if (entry.isDirectory()) {
      return hasContentFiles(new URL(`${entry.name}/`, directory))
    }
    return /\.(md|mdx)$/i.test(entry.name)
  })
}

const posts = hasContentFiles(postsDirectory)
  ? defineCollection({
      type: 'content',
      schema: postSchema,
    })
  : defineCollection({
      loader: () => [],
      schema: postSchema,
    })

export const collections = {
  posts,
}
