import type { ExtractionConfig, ProviderSection } from '../../core/provider.js'

const BASE_URL = 'https://docs.sqlalchemy.org/en/20'

/** All navigable sections of the SQLAlchemy 2.0 documentation site. */
export const SECTIONS: ProviderSection[] = [
  { name: 'orm', indexUrl: `${BASE_URL}/orm/index.html`, urlPrefix: 'orm' },
  { name: 'core', indexUrl: `${BASE_URL}/core/index.html`, urlPrefix: 'core' },
  { name: 'dialects', indexUrl: `${BASE_URL}/dialects/index.html`, urlPrefix: 'dialects' },
  { name: 'tutorial', indexUrl: `${BASE_URL}/tutorial/index.html`, urlPrefix: 'tutorial' },
  { name: 'faq', indexUrl: `${BASE_URL}/faq/index.html`, urlPrefix: 'faq' },
]

/** HTML extraction settings for docs.sqlalchemy.org (Sphinx). */
export const EXTRACTION: ExtractionConfig = {
  contentSelector: '#docs-body',
  baseUrl: BASE_URL,
  detectSection: (url: string) => {
    if (url.includes('/orm/')) return 'orm'
    if (url.includes('/core/')) return 'core'
    if (url.includes('/dialects/')) return 'dialects'
    if (url.includes('/tutorial/')) return 'tutorial'
    if (url.includes('/faq/')) return 'faq'
    return 'other'
  },
}

/** Maps shorthand names to full documentation URLs. */
export function buildPageUrl(target: string): string {
  if (target.startsWith('http')) return target

  const slugMap: Record<string, string> = {
    // ORM
    session: `${BASE_URL}/orm/session_api.html`,
    mapper: `${BASE_URL}/orm/mapping_api.html`,
    relationship: `${BASE_URL}/orm/relationship_api.html`,
    query: `${BASE_URL}/orm/queryguide/index.html`,
    declarative: `${BASE_URL}/orm/declarative_config.html`,
    column: `${BASE_URL}/orm/mapping_columns.html`,
    events: `${BASE_URL}/orm/events.html`,
    loading: `${BASE_URL}/orm/loading_relationships.html`,
    inheritance: `${BASE_URL}/orm/inheritance.html`,

    // Core
    engine: `${BASE_URL}/core/engines.html`,
    create_engine: `${BASE_URL}/core/engines.html`,
    connection: `${BASE_URL}/core/connections.html`,
    connections: `${BASE_URL}/core/connections.html`,
    metadata: `${BASE_URL}/core/metadata.html`,
    table: `${BASE_URL}/core/metadata.html`,
    select: `${BASE_URL}/core/selectable.html`,
    insert: `${BASE_URL}/core/dml.html`,
    update: `${BASE_URL}/core/dml.html`,
    delete: `${BASE_URL}/core/dml.html`,
    types: `${BASE_URL}/core/type_basics.html`,
    pool: `${BASE_URL}/core/pooling.html`,
    schema: `${BASE_URL}/core/schema.html`,
    functions: `${BASE_URL}/core/functions.html`,
    expression: `${BASE_URL}/core/expression_api.html`,

    // Dialects
    postgresql: `${BASE_URL}/dialects/postgresql.html`,
    mysql: `${BASE_URL}/dialects/mysql.html`,
    sqlite: `${BASE_URL}/dialects/sqlite.html`,
    oracle: `${BASE_URL}/dialects/oracle.html`,
    mssql: `${BASE_URL}/dialects/mssql.html`,
  }

  const key = target.toLowerCase().replace(/[\s-]/g, '_')
  if (slugMap[key]) return slugMap[key]

  // Fallback: try to find it in orm or core sections
  return `${BASE_URL}/orm/${key}.html`
}

/** Classifies a docs.sqlalchemy.org URL into a page kind for the search index. */
export function classifyPage(url: string): string {
  if (url.includes('/tutorial/')) return 'tutorial'
  if (url.includes('/dialects/')) return 'dialect'
  if (url.includes('/faq/')) return 'faq'
  if (url.match(/_api\.html/)) return 'api-reference'
  if (url.includes('mapping')) return 'mapping'
  if (url.includes('session')) return 'session'
  if (url.includes('query') || url.includes('select')) return 'querying'
  if (url.includes('relationship')) return 'relationships'
  if (url.includes('types') || url.includes('custom_types')) return 'types'
  if (url.includes('engine') || url.includes('connections')) return 'engine'
  if (url.includes('pool')) return 'engine'
  if (url.includes('event')) return 'events'
  return 'other'
}

export { BASE_URL }
