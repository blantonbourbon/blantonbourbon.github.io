/**
 * 计算文本的字数和阅读时间
 */

interface ReadingStats {
  wordCount: number
  chineseCharCount: number
  englishWordCount: number
  readingTime: number // 分钟
  displayText: string
}

const hanRegex = /\p{Script=Han}/gu
const englishTokenRegex =
  /\p{Script=Latin}+(?:['’]\p{Script=Latin}+)*|\p{Number}+(?:[.,:-]\p{Number}+)*/gu

/**
 * 计算中文字符数
 */
function countChineseChars(text: string): number {
  return (text.match(hanRegex) || []).length
}

/**
 * 计算英文单词和数字 token 数
 */
function countEnglishWords(text: string): number {
  const words = text.match(englishTokenRegex)
  return words ? words.length : 0
}

/**
 * 清理 Markdown 内容
 */
function cleanMarkdown(content: string): string {
  return (
    content
      // 移除 frontmatter
      .replace(/^---[\s\S]*?---\s*/g, '')
      // 移除代码块
      .replace(/```[\s\S]*?```/g, '')
      // 移除行内代码
      .replace(/`[^`]*`/g, '')
      // 移除图片
      .replace(/!\[[^\]]*]\([^)]*\)/g, '')
      // 保留链接文本
      .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]*)]\[[^\]]*]/g, '$1')
      // 移除裸链接和 HTML 标签
      .replace(/https?:\/\/\S+/g, '')
      .replace(/<[^>]*>/g, '')
      // 移除标题标记
      .replace(/^#{1,6}\s+/gm, '')
      // 移除列表标记
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      // 移除引用标记
      .replace(/^>\s+/gm, '')
      // 移除常见 Markdown 控制字符
      .replace(/[*_~|]/g, ' ')
      // 移除多余空白
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function formatCountText(totalCount: number, locale: string): string {
  if (locale === 'zh') {
    return `${totalCount} 字`
  }

  return totalCount === 1 ? '1 word' : `${totalCount} words`
}

/**
 * 计算阅读统计信息
 */
export function calculateReadingStats(
  content: string,
  locale = 'zh',
): ReadingStats {
  const cleanContent = cleanMarkdown(content)

  const chineseChars = countChineseChars(cleanContent)
  const englishWords = countEnglishWords(cleanContent)

  // 中文阅读速度：300-500字/分钟，取400
  // 英文阅读速度：200-300词/分钟，取250
  const chineseReadingSpeed = 400
  const englishReadingSpeed = 250

  const chineseReadingTime = chineseChars / chineseReadingSpeed
  const englishReadingTime = englishWords / englishReadingSpeed
  const totalReadingTime = Math.ceil(chineseReadingTime + englishReadingTime)
  const totalCount = chineseChars + englishWords

  return {
    wordCount: totalCount,
    chineseCharCount: chineseChars,
    englishWordCount: englishWords,
    readingTime: Math.max(1, totalReadingTime), // 至少1分钟
    displayText: formatCountText(totalCount, locale),
  }
}

/**
 * 格式化阅读时间显示
 */
export function formatReadingTime(minutes: number, locale = 'zh'): string {
  if (locale === 'zh') {
    return `${minutes} 分钟`
  } else {
    return minutes === 1 ? '1 min' : `${minutes} mins`
  }
}
