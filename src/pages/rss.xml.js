import { getCollection } from 'astro:content'
import rss from '@astrojs/rss'
import MarkdownIt from 'markdown-it'

export const prerender = true

const parser = new MarkdownIt()

export async function GET({ params }) {
  const blog = await getCollection(
    'posts',
    (i) => i.data.title && !i.data.isDraft && i.data.date,
  )
  const posts = blog
    .sort((a, b) => (a.data.date < b.data.date ? 1 : -1))
    .map((post) => {
      const content = post.description || post.body
      const html = parser.render(content)
      return {
        ...post.data,
        link: `/posts/${post.slug}/`,
        date: post.data.date,

        content: html,
      }
    })
  return new Response(
    (
      await rss({
        title: "Kratos's blog",
        description: 'A place to write down my tech life.',
        site: 'https://blantonbourbon.github.io',
        items: posts,
      })
    ).body,
    {
      headers: {
        'content-type': 'application/xml',
      },
    },
  )
}
