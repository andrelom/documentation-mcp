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
import { BASE_URL, EXTRACTION, SECTIONS, buildApiUrl, classifyPage } from './fabricjs.config.js'
import { registerFabricJsPrompts } from './fabricjs.prompts.js'
import { registerFabricJsTools } from './fabricjs.tools.js'

const fabricjsProvider: Provider = {
  id: 'fabricjs',
  name: 'Fabric.js',
  baseUrl: BASE_URL,
  sections: SECTIONS,
  extraction: EXTRACTION,

  resolveTarget(target: string): string | null {
    if (!target) return null
    return buildApiUrl(target)
  },

  classifyPage,

  ownsUrl(url: string): boolean {
    return url.includes('fabricjs.com')
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
            const hrefs = await page.$$eval(`nav a[href^="/${s.urlPrefix}/"]`, (anchors) =>
              anchors.map((a) => a.getAttribute('href') ?? ''),
            )
            discovered = []
            for (const href of hrefs) {
              if (!href) continue
              const clean = href.split('#')[0]
              if (clean === `/${s.urlPrefix}/` || clean === `/${s.urlPrefix}`) continue
              const full = `${BASE_URL}${clean}`
              discovered.push(full.endsWith('/') ? full : full + '/')
            }
          } finally {
            await page.close()
          }
        } else {
          const { httpDiscoverUrls } = await import('../../infrastructure/scraper/http.service.js')
          discovered = await httpDiscoverUrls(s.indexUrl, s.urlPrefix, BASE_URL)
        }

        for (const u of discovered) urls.add(u)
      } catch (err) {
        logger.warn('url discovery failed for section', {
          provider: 'fabricjs',
          section: s.name,
          error: String(err),
        })
      }
    }

    const result = [...urls]
    logger.info('discovered urls', { provider: 'fabricjs', section, count: result.length })
    return result
  },

  transformMarkdown(markdown: string): string {
    // Strip TypeDoc [↩](#xxx) backlinks
    let md = markdown.replace(/\[↩\]\(#[^)]*\)/g, '')
    // Add typescript language tag to bare fenced code blocks
    md = md.replace(/^```\s*$/gm, '```typescript')
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

    // Fabric.js-specific custom tools
    registerFabricJsTools(server, services)
  },

  registerPrompts(server: FastMCP): void {
    registerFabricJsPrompts(server)
  },
}

export default fabricjsProvider
