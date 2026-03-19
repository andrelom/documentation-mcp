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
  buildPageUrl,
  classifyPage,
} from './sqlalchemy.config.js'
import { registerSqlAlchemyPrompts } from './sqlalchemy.prompts.js'
import { registerSqlAlchemyTools } from './sqlalchemy.tools.js'

const sqlalchemyProvider: Provider = {
  id: 'sqlalchemy',
  name: 'SQLAlchemy',
  baseUrl: BASE_URL,
  sections: SECTIONS,
  extraction: EXTRACTION,

  resolveTarget(target: string): string | null {
    if (!target) return null
    return buildPageUrl(target)
  },

  classifyPage,

  ownsUrl(url: string): boolean {
    return url.includes('docs.sqlalchemy.org')
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
            // Sphinx sidebar uses div.sphinxsidebar or nav elements
            const hrefs = await page.$$eval('div.sphinxsidebar a[href], nav a[href]', (anchors) =>
              anchors.map((a) => a.getAttribute('href') ?? ''),
            )

            const sectionBase = s.indexUrl.substring(0, s.indexUrl.lastIndexOf('/') + 1)

            discovered = []
            for (const href of hrefs) {
              if (!href) continue
              const clean = href.split('#')[0]
              if (!clean) continue

              let full: string
              if (clean.startsWith('http')) {
                full = clean
              } else if (clean.startsWith('/')) {
                full = `https://docs.sqlalchemy.org${clean}`
              } else {
                // Relative URL — resolve against the section's index directory
                full = new URL(clean, sectionBase).href
              }

              // Only include URLs under this section (skip cross-section ../links)
              if (full.startsWith(sectionBase) && full !== s.indexUrl) {
                discovered.push(full)
              }
            }
          } finally {
            await page.close()
          }
        } else {
          // Sphinx uses relative hrefs in sidebar nav — we must resolve them
          // against the index page URL, then filter by section prefix.
          const { httpFetchPage } = await import('../../infrastructure/scraper/http.service.js')
          const { JSDOM } = await import('jsdom')

          const html = await httpFetchPage(s.indexUrl)
          const dom = new JSDOM(html)
          const doc = dom.window.document

          // Sphinx sidebar: try sphinxsidebar first, fall back to nav
          let anchors = doc.querySelectorAll<HTMLAnchorElement>('div.sphinxsidebar a[href]')
          if (anchors.length === 0) {
            anchors = doc.querySelectorAll<HTMLAnchorElement>('nav a[href]')
          }

          // Section base is the directory containing the index page
          const sectionBase = s.indexUrl.substring(0, s.indexUrl.lastIndexOf('/') + 1)

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
              full = `https://docs.sqlalchemy.org${clean}`
            } else {
              // Relative URL — resolve against the section's index directory
              full = new URL(clean, sectionBase).href
            }

            // Only include URLs strictly under this section (skip cross-section ../links)
            // and exclude the index page itself
            if (full.startsWith(sectionBase) && full !== s.indexUrl) {
              discovered.push(full)
            }
          }
        }

        for (const u of discovered) urls.add(u)
      } catch (err) {
        logger.warn('url discovery failed for section', {
          provider: 'sqlalchemy',
          section: s.name,
          error: String(err),
        })
      }
    }

    const result = [...urls]
    logger.info('discovered urls', { provider: 'sqlalchemy', section, count: result.length })
    return result
  },

  transformMarkdown(markdown: string): string {
    let md = markdown
    // Remove Sphinx [source] links
    md = md.replace(/\[source\]/g, '')
    // Remove permalink markers ¶
    md = md.replace(/[¶]/g, '')
    // Add python language tag to bare fenced code blocks
    md = md.replace(/^```\s*$/gm, '```python')
    // Clean up "New in version X.Y" and "Deprecated since X.Y" noise
    md = md.replace(/New in version (\d+\.\d+[^.]*)\./g, '_New in $1._')
    md = md.replace(/Deprecated since version (\d+\.\d+[^.]*)\./g, '_Deprecated since $1._')
    md = md.replace(/Changed in version (\d+\.\d+[^.]*)\./g, '_Changed in $1._')
    // Clean up excessive whitespace
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

    // SQLAlchemy-specific custom tools
    registerSqlAlchemyTools(server, services)
  },

  registerPrompts(server: FastMCP): void {
    registerSqlAlchemyPrompts(server)
  },
}

export default sqlalchemyProvider
