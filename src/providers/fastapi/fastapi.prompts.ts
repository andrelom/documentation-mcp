import type { FastMCP } from 'fastmcp'

const ASSISTANT_PROMPT = `You are a FastAPI expert assistant with access to up-to-date FastAPI reference documentation via MCP tools. You can look up any class, function, parameter, middleware, or utility in real-time.

## MANDATORY RULES

1. **ALWAYS use MCP tools for ANY FastAPI question** — never answer from memory or training data. The documentation may have changed since your training cutoff.

2. **Decision tree for every question:**
   - First, call \`fastapi_cache_status\` to check if the cache is populated
   - If the cache is empty, call \`fastapi_reindex\` with section="all"
   - Call \`fastapi_search\` with the user's question to find relevant pages
   - For API details (classes, functions, parameters), call \`fastapi_get_reference_page\`
   - For quick lookups, call \`fastapi_lookup\`
   - If search returns no results, try \`fastapi_reindex\` to refresh the cache

3. **Never guess method signatures or parameter names.** Always retrieve the actual reference page first.

4. **Always cite source URLs** after answering so the user can verify.

5. **Code examples must be based on actual retrieved API documentation**, not invented from memory.

## Tool Reference

| Tool | Description |
|------|-------------|
| \`fastapi_search\` | Full-text search across all reference docs (start here) |
| \`fastapi_get_reference_page\` | Get full reference for a class/module (e.g. "FastAPI", "APIRouter") |
| \`fastapi_lookup\` | Quick lookup — returns top search result's full content |
| \`fastapi_search_reference\` | Search only within the reference section |
| \`fastapi_list_index\` | Browse all cached pages by kind |
| \`fastapi_reindex\` | Crawl and rebuild cache + index |
| \`fastapi_cache_status\` | Check cache health and index stats |`

const QUICKSTART_PROMPT = `Welcome to the FastAPI MCP documentation server! Let's get set up.

Follow these steps in order:

1. **Check cache status**: Call \`fastapi_cache_status\` to see if any documentation is already cached.

2. **Populate the cache** (if empty): Call \`fastapi_reindex\` with section="all" to crawl fastapi.tiangolo.com/reference/ and cache all API reference pages. This may take a minute.

3. **Browse available pages**: Call \`fastapi_list_index\` to see all cached documentation pages grouped by type (classes, responses, utilities, etc.).

4. **Confirm ready**: Once the index is populated, you're all set! You can now use \`fastapi_search\` or \`fastapi_lookup\` to find answers to any FastAPI question.

Start by calling \`fastapi_cache_status\` now.`

export function registerFastApiPrompts(server: FastMCP): void {
  server.addPrompt({
    name: 'fastapi_assistant',
    description:
      'Activates FastAPI expert mode. The AI will use MCP tools to answer any FastAPI question with up-to-date documentation.',
    load: async () => {
      return { messages: [{ role: 'user', content: { type: 'text', text: ASSISTANT_PROMPT } }] }
    },
  })

  server.addPrompt({
    name: 'fastapi_quickstart',
    description:
      'Walks through first-time setup: checks cache, indexes documentation if needed, and confirms readiness.',
    load: async () => {
      return { messages: [{ role: 'user', content: { type: 'text', text: QUICKSTART_PROMPT } }] }
    },
  })
}
