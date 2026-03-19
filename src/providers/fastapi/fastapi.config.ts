import type { ExtractionConfig, ProviderSection } from '../../core/provider.js'

const BASE_URL = 'https://fastapi.tiangolo.com'

/** All navigable sections of the FastAPI documentation site. */
export const SECTIONS: ProviderSection[] = [
  { name: 'reference', indexUrl: `${BASE_URL}/reference/`, urlPrefix: 'reference' },
]

/** HTML extraction settings for fastapi.tiangolo.com (Material for MkDocs / mkdocstrings). */
export const EXTRACTION: ExtractionConfig = {
  contentSelector: 'article',
  baseUrl: BASE_URL,
  detectSection: () => 'reference',
}

/** Builds a full reference URL from a module/class name shorthand. */
export function buildReferenceUrl(target: string): string {
  if (target.startsWith('http')) return target

  // Map common shorthand names to their URL slugs
  const slugMap: Record<string, string> = {
    fastapi: 'fastapi',
    apirouter: 'apirouter',
    request: 'request',
    response: 'response',
    responses: 'responses',
    websockets: 'websockets',
    websocket: 'websockets',
    httpconnection: 'httpconnection',
    parameters: 'parameters',
    status: 'status',
    uploadfile: 'uploadfile',
    exceptions: 'exceptions',
    httpexception: 'exceptions',
    dependencies: 'dependencies',
    depends: 'dependencies',
    background: 'background',
    backgroundtasks: 'background',
    middleware: 'middleware',
    security: 'security',
    openapi: 'openapi',
    encoders: 'encoders',
    staticfiles: 'staticfiles',
    templating: 'templating',
    testclient: 'testclient',
  }

  const slug = slugMap[target.toLowerCase()] ?? target.toLowerCase()
  return `${BASE_URL}/reference/${slug}/`
}

/** Classifies a fastapi.tiangolo.com URL into a page kind for the search index. */
export function classifyPage(url: string): string {
  if (url.includes('/reference/fastapi/')) return 'class'
  if (url.includes('/reference/apirouter/')) return 'class'
  if (url.includes('/reference/request/')) return 'class'
  if (url.includes('/reference/websockets/')) return 'class'
  if (url.includes('/reference/httpconnection/')) return 'class'
  if (url.includes('/reference/uploadfile/')) return 'class'
  if (url.includes('/reference/background/')) return 'class'
  if (url.includes('/reference/response/')) return 'response'
  if (url.includes('/reference/responses/')) return 'response'
  if (url.includes('/reference/parameters/')) return 'parameters'
  if (url.includes('/reference/status/')) return 'status-codes'
  if (url.includes('/reference/exceptions/')) return 'exceptions'
  if (url.includes('/reference/security/')) return 'security'
  if (url.includes('/reference/middleware/')) return 'middleware'
  if (url.includes('/reference/openapi/')) return 'openapi'
  if (url.includes('/reference/dependencies/')) return 'dependencies'
  if (url.includes('/reference/encoders/')) return 'utility'
  if (url.includes('/reference/staticfiles/')) return 'utility'
  if (url.includes('/reference/templating/')) return 'utility'
  if (url.includes('/reference/testclient/')) return 'testing'
  return 'other'
}

export { BASE_URL }
