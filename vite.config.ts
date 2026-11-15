import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const codexExecutable = process.env.CODEX_CLI || '/home/yasser/.local/bin/codex'
const projectRoot = fileURLToPath(new URL('.', import.meta.url))
const requestWindowMs = 60_000
const requestLimitPerWindow = 8
const requestWindow = new Map<string, { startedAt: number; count: number }>()
let activeCodexRequest = false
let authStatusCache: { checkedAt: number; authenticated: boolean } | undefined

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(body))
}

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > 24_000) throw new Error('body-too-large')
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

function runCodex(args: string[], input = '', timeoutMs = 50_000) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(codexExecutable, args, {
      cwd: tmpdir(),
      env: {
        PATH: process.env.PATH || '/usr/bin:/bin',
        HOME: process.env.HOME,
        CODEX_HOME: process.env.CODEX_HOME,
        TMPDIR: tmpdir(),
        LANG: process.env.LANG || 'C.UTF-8',
        NO_COLOR: '1',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    const timeout = setTimeout(() => {
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 2_000).unref()
      reject(new Error('codex-timeout'))
    }, timeoutMs)
    child.stdout.on('data', chunk => stdout.push(Buffer.from(chunk)))
    child.stderr.on('data', chunk => stderr.push(Buffer.from(chunk)))
    child.once('error', error => {
      clearTimeout(timeout)
      reject(error)
    })
    child.once('close', code => {
      clearTimeout(timeout)
      resolve({ code, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8') })
    })
    child.stdin.end(input)
  })
}

async function isCodexAuthenticated() {
  if (authStatusCache && Date.now() - authStatusCache.checkedAt < 15_000) return authStatusCache.authenticated
  try {
    const status = await runCodex(['login', 'status'], '', 5_000)
    const authenticated = status.code === 0 && /logged in/i.test(`${status.stdout}\n${status.stderr}`)
    authStatusCache = { checkedAt: Date.now(), authenticated }
    return authenticated
  } catch {
    authStatusCache = { checkedAt: Date.now(), authenticated: false }
    return false
  }
}

function requestOriginAllowed(request: IncomingMessage) {
  const origin = request.headers.origin
  const host = request.headers.host
  if (!origin || !host) return request.method !== 'POST'
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

function codexDemoPlugin() {
  return {
    name: 'fieldnova-codex-cli-demo',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use(async (request, response, next) => {
        const path = request.url?.split('?')[0]
        if (path !== '/api/codex/status' && path !== '/api/codex/reply') return next()
        if (!requestOriginAllowed(request)) return sendJson(response, 403, { error: 'Origine de requête refusée.' })

        if (path === '/api/codex/status') {
          if (request.method !== 'GET') return sendJson(response, 405, { error: 'Méthode non autorisée.' })
          const authenticated = await isCodexAuthenticated()
          return sendJson(response, 200, { available: authenticated, provider: 'Codex CLI' })
        }

        if (request.method !== 'POST') return sendJson(response, 405, { error: 'Méthode non autorisée.' })
        const clientKey = request.socket.remoteAddress || 'local'
        const now = Date.now()
        const window = requestWindow.get(clientKey)
        if (!window || now - window.startedAt >= requestWindowMs) requestWindow.set(clientKey, { startedAt: now, count: 1 })
        else if (window.count >= requestLimitPerWindow) return sendJson(response, 429, { error: 'Limite de démonstration atteinte. Réessayez dans une minute.' })
        else window.count += 1
        if (activeCodexRequest) return sendJson(response, 429, { error: 'Une réponse Codex est déjà en cours.' })

        let body: unknown
        try {
          body = await readJsonBody(request)
        } catch (error) {
          return sendJson(response, error instanceof Error && error.message === 'body-too-large' ? 413 : 400, { error: 'Requête invalide ou trop volumineuse.' })
        }
        const payload = body as { question?: unknown; history?: unknown; evidence?: unknown }
        const question = typeof payload.question === 'string' ? payload.question.trim().slice(0, 2_000) : ''
        const history = Array.isArray(payload.history)
          ? payload.history.slice(-6).flatMap(item => {
            if (!item || typeof item !== 'object') return []
            const entry = item as { role?: unknown; text?: unknown }
            return (entry.role === 'assistant' || entry.role === 'user') && typeof entry.text === 'string'
              ? [`${entry.role === 'user' ? 'Agriculteur' : 'Assistant'}: ${entry.text.slice(0, 800)}`]
              : []
          })
          : []
        const evidence = typeof payload.evidence === 'string' ? payload.evidence.slice(0, 6_000) : ''
        if (!question) return sendJson(response, 400, { error: 'La question est vide.' })
        if (activeCodexRequest) return sendJson(response, 429, { error: 'Une réponse Codex est déjà en cours.' })
        activeCodexRequest = true
        let temporaryDirectory = ''
        try {
          if (!(await isCodexAuthenticated())) return sendJson(response, 503, { error: 'Codex CLI est indisponible ou déconnecté sur le serveur local.' })
          temporaryDirectory = await mkdtemp(join(tmpdir(), 'fieldnova-codex-'))
          const prompt = [
            'Tu es l’assistant agricole de démonstration FieldNova. Réponds en français, clairement et de façon concise, comme dans une conversation de chat.',
            'Commence chaque réponse par une seule ligne « En bref : … » de 20 mots maximum. Réponds directement avec le résultat principal et les valeurs disponibles; n’invente jamais une valeur pour rendre ce résumé plus précis. Après une ligne vide, explique les éléments et leurs limites.',
            'Tu ne disposes d’aucun outil FieldNova dans cette requête. Ne lance aucune commande et n’essaie pas de lire des fichiers. Utilise uniquement l’historique et le contexte fourni ci-dessous.',
            'Sépare les faits tirés du contexte des conseils généraux. Ne fabrique aucune mesure, prévision, source, action réalisée ou résultat de parcelle. Si les données manquent, dis-le et indique quelle donnée demander ou saisir. Les données NASA mensuelles ou régionales ne constituent pas une prévision ni un diagnostic parcellaire.',
            history.length ? `Historique récent:\n${history.join('\n')}` : '',
            evidence ? `Résultats vérifiés des outils FieldNova pour ce tour:\n${evidence}` : 'Aucun outil de données FieldNova n’a été exécuté pour cette question.',
            `Question actuelle de l’agriculteur:\n${question}`,
          ].filter(Boolean).join('\n\n')
          const result = await runCodex([
            'exec', '--ephemeral', '--sandbox', 'read-only', '--cd', temporaryDirectory,
            '--skip-git-repo-check', '--ignore-user-config', '--ignore-rules', '--color', 'never',
            '-',
          ], prompt)
          if (result.code !== 0) throw new Error('codex-execution-failed')
          const answer = result.stdout.trim()
          if (!answer) throw new Error('codex-empty-response')
          return sendJson(response, 200, { answer })
        } catch {
          return sendJson(response, 503, { error: 'Codex CLI n’a pas pu répondre. La réponse locale de FieldNova reste disponible.' })
        } finally {
          activeCodexRequest = false
          if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true }).catch(() => undefined)
        }
      })
    },
  }
}

export default defineConfig({
  root: projectRoot,
  plugins: [codexDemoPlugin(), react(), tailwindcss()],
})
