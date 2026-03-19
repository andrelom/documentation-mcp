import type { FastMCP } from 'fastmcp'
import { z } from 'zod'
import type { ProviderServices } from '../../core/provider.js'
import { buildPageUrl } from './sqlalchemy.config.js'

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
 * Registers SQLAlchemy-specific tools:
 *
 * - `sqlalchemy_get_page` — resolves shorthand name + auto-generates TOC
 * - `sqlalchemy_lookup` — searches index and returns top result's full content
 */
export function registerSqlAlchemyTools(server: FastMCP, services: ProviderServices): void {
  server.addTool({
    name: 'sqlalchemy_get_page',
    description:
      `ALWAYS USE THIS TOOL when you need to look up SQLAlchemy API reference details — classes, functions, configuration, or dialect-specific features. ` +
      `Pass either a full URL (https://docs.sqlalchemy.org/en/20/orm/session_api.html) or a shorthand name (e.g. "Session", "Engine", "relationship", "postgresql"). ` +
      `Use sqlalchemy_list_index or sqlalchemy_search to discover available pages. ` +
      `Returns the full Sphinx API reference page as Markdown with a Table of Contents.`,
    parameters: z.object({
      target: z
        .string()
        .describe("Full URL or shorthand name (e.g. 'Session', 'Engine', 'relationship', 'postgresql')"),
      forceRefresh: z
        .boolean()
        .default(false)
        .describe('If true, bypass cache and fetch fresh content'),
    }),
    execute: async (params) => {
      const url = buildPageUrl(params.target)
      const { record, fromCache } = await services.scraper.scrapePage(url, params.forceRefresh)

      const toc = buildToc(record.markdown)
      const source = fromCache ? 'cached' : 'freshly scraped'

      return `# ${record.title}\n\n> Source: ${url} (${source})\n\n${toc}${record.markdown}`
    },
  })

  server.addTool({
    name: 'sqlalchemy_lookup',
    description:
      'Quick lookup tool: searches the SQLAlchemy documentation index for a term and returns the top result\'s full content. ' +
      'Use this for fast "what is X" or "how do I use X" questions. For browsing multiple results, use sqlalchemy_search instead.',
    parameters: z.object({
      query: z.string().describe('The term or phrase to look up (e.g. "create_engine", "Session.commit", "relationship lazy loading")'),
      forceRefresh: z
        .boolean()
        .default(false)
        .describe('If true, bypass cache and fetch fresh content'),
    }),
    execute: async (params) => {
      const results = await services.search.search(params.query, 1)
      if (results.length === 0) {
        return (
          'No results found. The cache may be empty — try calling sqlalchemy_reindex first, ' +
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
