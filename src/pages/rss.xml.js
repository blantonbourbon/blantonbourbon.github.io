import rss from '@astrojs/rss'
import { getFeedPosts } from '@utils/content'
import MarkdownIt from 'markdown-it'

export const prerender = true

const parser = new MarkdownIt()

export async function GET() {
  const feedPosts = await getFeedPosts()
  const posts = feedPosts.map((post) => {
    const content = post.body
    const html = parser.render(content)
    return {
      ...post,
      title: post.displayTitle,
      link: post.link,
      date: post.date,

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
