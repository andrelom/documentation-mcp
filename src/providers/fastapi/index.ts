import type { FastMCP } from 'fastmcp'
import { config } from '../../core/config.js'
import { logger } from '../../core/logger.js'
import type { Provider, ProviderServices } from '../../core/provider.js'
import {
  createCacheStatusTool,
  createListIndexTool,
  createReindexTool,
  createSearchTool,
  createSectionSearchTool,
} from '../../core/tool-factories.js'
import {
  BASE_URL,
  EXTRACTION,
  SECTIONS,
  buildReferenceUrl,
  classifyPage,
} from './fastapi.config.js'
import { registerFastApiPrompts } from './fastapi.prompts.js'
import { registerFastApiTools } from './fastapi.tools.js'

const fastapiProvider: Provider = {
  id: 'fastapi',
  name: 'FastAPI',
  baseUrl: BASE_URL,
  sections: SECTIONS,
  extraction: EXTRACTION,

  resolveTarget(target: string): string | null {
    if (!target) return null
    return buildReferenceUrl(target)
  },

  classifyPage,

  ownsUrl(url: string): boolean {
    return url.includes('fastapi.tiangolo.com')
  },

  async discoverUrls(section?: string): Promise<string[]> {
    const urls = new Set<string>()
    const sectionsToDiscover = section ? SECTIONS.filter((s) => s.name === section) : SECTIONS

    for (const s of sectionsToDiscover) {
      let discovered: string[]

      try {
        if (config.scraper.usePlaywright) {
          const { openPage } = await import('../../infrastructure/scraper/browser.service.js')
          const page = await openPage(s.indexUrl)
          try {
            const hrefs = await page.$$eval(`nav a[href*="/${s.urlPrefix}/"]`, (anchors) =>
              anchors.map((a) => a.getAttribute('href') ?? ''),
            )
            discovered = []
            for (const href of hrefs) {
              if (!href) continue
              const clean = href.split('#')[0] ?? ''
              if (!clean || clean === `/${s.urlPrefix}/` || clean === `/${s.urlPrefix}`) continue
              // Handle both absolute and relative URLs
              const full = href.startsWith('http')
                ? clean
                : `${BASE_URL}${clean.startsWith('/') ? clean : `/${clean}`}`
              discovered.push(full.endsWith('/') ? full : full + '/')
            }
          } finally {
            await page.close()
          }
        } else {
          // FastAPI (Material for MkDocs) uses relative hrefs like "fastapi/", "apirouter/"
          // in the nav — they don't contain the section prefix, so we must select all nav
          // anchors and resolve each href against the index URL, then filter by prefix.
          const { httpFetchPage } = await import('../../infrastructure/scraper/http.service.js')
          const { JSDOM } = await import('jsdom')

          const html = await httpFetchPage(s.indexUrl)
          const dom = new JSDOM(html)
          const doc = dom.window.document

          const anchors = doc.querySelectorAll<HTMLAnchorElement>('nav a[href]')
          const sectionBase = s.indexUrl.endsWith('/') ? s.indexUrl : s.indexUrl + '/'

          discovered = []
          for (const a of anchors) {
            const href = a.getAttribute('href')
            if (!href) continue

            const clean = href.split('#')[0]
            if (!clean) continue

            let full: string
            if (clean.startsWith('http')) {
              full = clean
            } else if (clean.startsWith('/')) {
              full = `${BASE_URL}${clean}`
            } else {
              // Relative URL — resolve against the index page URL
              full = new URL(clean, sectionBase).href
            }

            // Normalize: ensure trailing slash
            full = full.endsWith('/') ? full : full + '/'

            // Only include URLs strictly under the reference section (not the index itself)
            if (full.startsWith(sectionBase) && full !== sectionBase) {
              discovered.push(full)
            }
          }
        }

        for (const u of discovered) urls.add(u)
      } catch (err) {
        logger.warn('url discovery failed for section', {
          provider: 'fastapi',
          section: s.name,
          error: String(err),
        })
      }
    }

    const result = [...urls]
    logger.info('discovered urls', { provider: 'fastapi', section, count: result.length })
    return result
  },

  transformMarkdown(markdown: string): string {
    let md = markdown
    // Strip mkdocstrings "Source code in ..." references
    md = md.replace(/Source code in `[^`]+`/g, '')
    // Add python language tag to bare fenced code blocks
    md = md.replace(/^```\s*$/gm, '```python')
    // Clean up excessive whitespace left by stripping
    md = md.replace(/\n{4,}/g, '\n\n\n')
    return md
  },

  registerTools(server: FastMCP, services: ProviderServices): void {
    // Generic tools from factories
    createSearchTool(server, this, services)
    for (const section of SECTIONS) {
      createSectionSearchTool(server, this, services, section.name)
    }
    createListIndexTool(server, this, services)
    createReindexTool(server, this, services)
    createCacheStatusTool(server, this, services)

    // FastAPI-specific custom tools
    registerFastApiTools(server, services)
  },

  registerPrompts(server: FastMCP): void {
    registerFastApiPrompts(server)
  },
}

export default fastapiProvider
