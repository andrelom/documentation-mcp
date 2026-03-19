import type { FastMCP } from 'fastmcp'
import { z } from 'zod'
import type { ProviderServices } from '../../core/provider.js'
import { buildReferenceUrl } from './fastapi.config.js'

/**
 * Generates a Table of Contents from level-2 Markdown headings.
 */
function buildToc(markdown: string): string {
  const lines = markdown.split('\n')
  const tocEntries: string[] = []
  for (const line of lines) {
    const match = line.match(/^(##)\s+(.+)$/)
    if (match?.[2]) {
      const text = match[2].trim()
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
      tocEntries.push(`- [${text}](#${id})`)
    }
  }
  if (tocEntries.length === 0) return ''
  return `## Table of Contents\n\n${tocEntries.join('\n')}\n\n---\n\n`
}

/**
 * Registers FastAPI-specific tools that go beyond the generic factories:
 *
 * - `fastapi_get_reference_page` — resolves module/class shorthand + auto-generates TOC
 * - `fastapi_lookup` — searches index and returns top result's full content
 */
export function registerFastApiTools(server: FastMCP, services: ProviderServices): void {
  server.addTool({
    name: 'fastapi_get_reference_page',
    description:
      `ALWAYS USE THIS TOOL when you need to look up FastAPI API reference details — classes, functions, parameters, or status codes. ` +
      `Pass either a full URL (https://fastapi.tiangolo.com/reference/fastapi/) or a shorthand name (e.g. "FastAPI", "APIRouter", "Request", "Depends"). ` +
      `Use fastapi_list_index or fastapi_search to discover available pages. ` +
      `Returns the full mkdocstrings API reference page as Markdown with a Table of Contents.`,
    parameters: z.object({
      target: z
        .string()
        .describe("Full URL or shorthand name (e.g. 'FastAPI', 'APIRouter', 'Request', 'Depends')"),
      forceRefresh: z
        .boolean()
        .default(false)
        .describe('If true, bypass cache and fetch fresh content'),
    }),
    execute: async (params) => {
      const url = buildReferenceUrl(params.target)
      const { record, fromCache } = await services.scraper.scrapePage(url, params.forceRefresh)

      const toc = buildToc(record.markdown)
      const source = fromCache ? 'cached' : 'freshly scraped'

      return `# ${record.title}\n\n> Source: ${url} (${source})\n\n${toc}${record.markdown}`
    },
  })

  server.addTool({
    name: 'fastapi_lookup',
    description:
      'Quick lookup tool: searches the FastAPI documentation index for a term and returns the top result\'s full content. ' +
      'Use this for fast "what is X" or "how do I use X" questions. For browsing multiple results, use fastapi_search instead.',
    parameters: z.object({
      query: z.string().describe('The term or phrase to look up (e.g. "Depends", "HTTPException", "status codes")'),
      forceRefresh: z
        .boolean()
        .default(false)
        .describe('If true, bypass cache and fetch fresh content'),
    }),
    execute: async (params) => {
      const results = await services.search.search(params.query, 1)
      if (results.length === 0) {
        return (
          'No results found. The cache may be empty — try calling fastapi_reindex first, ' +
          'then search again.'
        )
      }

      const top = results[0]!
      const { record, fromCache } = await services.scraper.scrapePage(
        top.url,
        params.forceRefresh,
      )
      const source = fromCache ? 'cached' : 'freshly scraped'

      return `# ${record.title}\n\n> Source: ${top.url} (${source})\n\n${record.markdown}`
    },
  })
}
