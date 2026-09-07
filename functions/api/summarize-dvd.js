import { requireBearerToken } from '../lib/auth'
import { generateClaudeSummary } from '../lib/claude-summary'
import { getDocument, patchDocument } from '../lib/firebase-rest'

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
}

async function summarize({ dvdId, token, env }) {
  const projectId = env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || 'racherbaumer-dvd-collection'
  try {
    const dvd = await getDocument(projectId, `dvds/${encodeURIComponent(dvdId)}`, token)
    if (!dvd) throw Object.assign(new Error('DVD not found.'), { status: 404 })
    const result = await generateClaudeSummary(dvd, env)
    await patchDocument(projectId, `dvds/${encodeURIComponent(dvdId)}`, {
      aiSummary: result.summary,
      aiSummaryStatus: result.status,
      aiSummaryModel: env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
      aiSummaryUpdatedAt: new Date(),
    }, token)
  } catch (error) {
    console.error('DVD summary generation failed', error?.message || 'Unknown error')
    try {
      await patchDocument(projectId, `dvds/${encodeURIComponent(dvdId)}`, {
        aiSummaryStatus: 'failed',
        aiSummaryUpdatedAt: new Date(),
      }, token)
    } catch (patchError) {
      console.error('Could not store failed summary status', patchError?.message || 'Unknown error')
    }
  }
}

export async function onRequestPost(context) {
  try {
    const projectId = context.env.FIREBASE_PROJECT_ID || context.env.VITE_FIREBASE_PROJECT_ID || 'racherbaumer-dvd-collection'
    const apiKey = context.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return json({ error: 'Summary service is missing ANTHROPIC_API_KEY in Cloudflare Pages environment variables. Add it and redeploy.' }, 503)
    }
    const token = requireBearerToken(context.request)
    const body = await context.request.json()
    if (!body?.dvdId || typeof body.dvdId !== 'string') return json({ error: 'dvdId is required.' }, 400)

    const profile = await getDocument(projectId, `users/${encodeURIComponent(body.uid || '')}`, token)
    if (!profile || profile.role !== 'admin') return json({ error: 'Admin access is required.' }, 403)

    context.waitUntil(summarize({ dvdId: body.dvdId, token, env: { ...context.env, FIREBASE_PROJECT_ID: projectId } }))
    return json({ accepted: true }, 202)
  } catch (error) {
    return json({ error: error?.status === 401 ? error.message : 'Unable to start summary generation.' }, error?.status || 500)
  }
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  return onRequestPost(context)
}
