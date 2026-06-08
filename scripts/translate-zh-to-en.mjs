#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const DEFAULT_SOURCE_DIR = 'src/content/posts/zh'
const DEFAULT_TARGET_DIR = 'src/content/posts/en'
const MAX_CHARS = 4500

function parseArgs(argv) {
  const options = {
    sourceDir: DEFAULT_SOURCE_DIR,
    targetDir: DEFAULT_TARGET_DIR,
    endpoint: process.env.DEEPLX_API_URL,
    force: false,
    dryRun: false,
    limit: undefined,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--') continue

    const next = () => {
      index += 1
      const value = argv[index]
      if (!value) throw new Error(`${arg} requires a value`)
      return value
    }

    if (arg === '--source') options.sourceDir = next()
    else if (arg === '--target') options.targetDir = next()
    else if (arg === '--endpoint') options.endpoint = next()
    else if (arg === '--force') options.force = true
    else if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--limit') options.limit = Number.parseInt(next(), 10)
    else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown option: ${arg}`)
    }
  }

  if (options.limit !== undefined && !Number.isFinite(options.limit)) {
    throw new Error('--limit must be a number')
  }

  return options
}

function printHelp() {
  console.log(`Usage:
  DEEPLX_API_URL=<endpoint> pnpm translate:zh-en

Options:
  --source <dir>     Source directory. Default: ${DEFAULT_SOURCE_DIR}
  --target <dir>     Target directory. Default: ${DEFAULT_TARGET_DIR}
  --endpoint <url>   DeepLX translate endpoint. Defaults to DEEPLX_API_URL.
  --force            Overwrite existing translated files.
  --dry-run          Show planned writes without calling the API.
  --limit <n>        Translate at most n files.
`)
}

async function listMarkdownFiles(directory) {
  if (!existsSync(directory)) return []

  const files = []
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(entryPath)))
    } else if (/\.(md|mdx)$/i.test(entry.name)) {
      files.push(entryPath)
    }
  }

  return files.sort()
}

function splitFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { frontmatter: '', body: source }

  return {
    frontmatter: match[1],
    body: source.slice(match[0].length),
  }
}

function getYamlScalar(frontmatter, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = frontmatter.match(new RegExp(`^${escapedKey}:\\s*(.*)$`, 'm'))
  if (!match) return undefined

  const value = match[1].trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function quoteYaml(value) {
  return `'${value.replaceAll("'", "''")}'`
}

function setYamlScalar(frontmatter, key, value, afterKey) {
  const line = `${key}: ${quoteYaml(value)}`
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const keyPattern = new RegExp(`^${escapedKey}:.*$`, 'm')

  if (keyPattern.test(frontmatter)) {
    return frontmatter.replace(keyPattern, line)
  }

  const afterPattern = new RegExp(`^${afterKey}:.*$`, 'm')
  if (afterKey && afterPattern.test(frontmatter)) {
    return frontmatter.replace(afterPattern, (match) => `${match}\n${line}`)
  }

  return `${frontmatter.trimEnd()}\n${line}`
}

function protectMarkdown(text) {
  const protectedValues = []

  const protect = (match) => {
    const token = `__DEEPLX_KEEP_${protectedValues.length}__`
    protectedValues.push(match)
    return token
  }

  const protectedText = text
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1\s*$/gm, protect)
    .replace(/^import\s.+$/gm, protect)
    .replace(/^export\s.+$/gm, protect)
    .replace(/<!--[\s\S]*?-->/g, protect)
    .replace(/!\[[^\]]*]\([^)]*\)/g, protect)
    .replace(/`[^`\n]+`/g, protect)
    .replace(/https?:\/\/[^\s)<]+/g, protect)

  return {
    text: protectedText,
    restore(value) {
      return protectedValues.reduce(
        (result, original, index) =>
          result.replaceAll(`__DEEPLX_KEEP_${index}__`, original),
        value,
      )
    },
  }
}

function isMarkdownStructure(block) {
  return block.split('\n').some((line) => {
    return /^\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|~~~|\|)/.test(line)
  })
}

function normalizeProseLineBreaks(text) {
  return text
    .split(/(\n{2,})/)
    .map((block) => {
      if (/^\n+$/.test(block)) return block
      if (!block.includes('\n')) return block
      if (isMarkdownStructure(block)) return block
      return block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join(' ')
    })
    .join('')
}

function splitIntoChunks(text, maxChars = MAX_CHARS) {
  const paragraphs = text.split(/(\n{2,})/)
  const chunks = []
  let current = ''

  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length > maxChars) {
      chunks.push(current)
      current = paragraph
    } else {
      current += paragraph
    }
  }

  if (current) chunks.push(current)
  return chunks
}

function extractTranslation(payload) {
  if (typeof payload?.data === 'string') return payload.data
  if (typeof payload?.translation === 'string') return payload.translation
  if (typeof payload?.text === 'string') return payload.text

  const translation =
    payload?.data?.translations?.[0]?.text ?? payload?.translations?.[0]?.text
  if (typeof translation === 'string') return translation

  throw new Error(`Unexpected translation response: ${JSON.stringify(payload)}`)
}

async function translateText(text, endpoint) {
  if (!text.trim()) return text

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      text,
      source_lang: 'ZH',
      target_lang: 'EN',
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`DeepLX request failed: ${response.status} ${body}`)
  }

  return extractTranslation(await response.json())
}

async function translateMarkdown(text, endpoint) {
  const { text: protectedText, restore } = protectMarkdown(text)
  const normalizedText = normalizeProseLineBreaks(protectedText)
  const translatedChunks = []

  for (const chunk of splitIntoChunks(normalizedText)) {
    translatedChunks.push(await translateText(chunk, endpoint))
  }

  return restore(translatedChunks.join(''))
}

async function translateDocument(source, endpoint) {
  const { frontmatter, body } = splitFrontmatter(source)
  const sourceTitle = getYamlScalar(frontmatter, 'title')
  const translatedTitle = sourceTitle
    ? await translateText(sourceTitle, endpoint)
    : undefined
  const sourceSummary = getYamlScalar(frontmatter, 'summary')
  const translatedSummary = sourceSummary?.trim()
    ? await translateText(sourceSummary, endpoint)
    : undefined
  const translatedBody = await translateMarkdown(body, endpoint)

  if (!frontmatter) return translatedBody

  let nextFrontmatter = frontmatter
  if (translatedTitle) {
    nextFrontmatter = setYamlScalar(nextFrontmatter, 'title', translatedTitle)
    nextFrontmatter = setYamlScalar(
      nextFrontmatter,
      'title-en',
      translatedTitle,
      'title',
    )
  }
  if (translatedSummary) {
    nextFrontmatter = setYamlScalar(
      nextFrontmatter,
      'summary',
      translatedSummary,
    )
  }

  return `---\n${nextFrontmatter.trimEnd()}\n---\n\n${translatedBody.trimStart()}`
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const sourceFiles = await listMarkdownFiles(options.sourceDir)
  const files =
    options.limit === undefined
      ? sourceFiles
      : sourceFiles.slice(0, options.limit)

  if (files.length === 0) {
    console.log(`No markdown files found in ${options.sourceDir}`)
    return
  }

  if (!options.endpoint && !options.dryRun) {
    throw new Error('Set DEEPLX_API_URL or pass --endpoint')
  }

  for (const sourcePath of files) {
    const relativePath = path.relative(options.sourceDir, sourcePath)
    const targetPath = path.join(options.targetDir, relativePath)

    if (existsSync(targetPath) && !options.force) {
      console.log(`skip existing: ${targetPath}`)
      continue
    }

    if (options.dryRun) {
      console.log(`would translate: ${sourcePath} -> ${targetPath}`)
      continue
    }

    const source = await readFile(sourcePath, 'utf8')
    const translated = await translateDocument(source, options.endpoint)
    await mkdir(path.dirname(targetPath), { recursive: true })
    await writeFile(targetPath, translated, 'utf8')
    console.log(`translated: ${sourcePath} -> ${targetPath}`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
