// Серверна функція: генерує сет карток за допомогою ШІ.
// Ланцюжок провайдерів: Gemini → Groq → запасна модель Gemini.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']

// Скільки чекати відповіді від кожного провайдера (мс).
// Сума має бути меншою за ліміт Supabase у 150 секунд.
const GEMINI_TIMEOUT_MS = 25_000
const GROQ_TIMEOUT_MS = 30_000

// ---------- Спільний формат результату для всіх провайдерів ----------

type FailReason = 'timeout' | 'overloaded' | 'rate_limit' | 'error'

type AttemptResult = { ok: true; text: string } | { ok: false; reason: FailReason }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function reasonFromStatus(status: number): FailReason {
  if (status === 429) return 'rate_limit'
  if (status >= 500) return 'overloaded'
  return 'error'
}

function reasonFromError(err: unknown, label: string): FailReason {
  if (err instanceof Error && err.name === 'TimeoutError') {
    console.error(`${label}: не відповів вчасно`)
    return 'timeout'
  }
  console.error(`${label}: помилка з'єднання`, err)
  return 'error'
}

// ---------- Провайдер 1: Google Gemini ----------

const geminiSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    cards: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          term: { type: 'STRING' },
          definition: { type: 'STRING' },
        },
        required: ['term', 'definition'],
      },
    },
  },
  required: ['title', 'cards'],
}

async function callGemini(model: string, apiKey: string, prompt: string): Promise<AttemptResult> {
  const label = `Gemini (${model})`
  try {
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: geminiSchema,
              temperature: 0.7,
              thinkingConfig: { thinkingLevel: 'low' },
            },
          }),
          signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
        },
    )

    if (!res.ok) {
      console.error(`${label}: помилка ${res.status}`, await res.text())
      return { ok: false, reason: reasonFromStatus(res.status) }
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof text !== 'string') {
      console.error(`${label}: порожня відповідь`, JSON.stringify(data).slice(0, 500))
      return { ok: false, reason: 'error' }
    }
    return { ok: true, text }
  } catch (err) {
    return { ok: false, reason: reasonFromError(err, label) }
  }
}

// ---------- Провайдер 2: Groq (сумісний з OpenAI API) ----------

async function callGroq(model: string, apiKey: string, prompt: string): Promise<AttemptResult> {
  const label = `Groq (${model})`

  const body: Record<string, unknown> = {
    model,
    messages: [
      {
        role: 'system',
        content:
            'You create vocabulary flashcards. Reply with JSON only, in this exact format: ' +
            '{"title": string, "cards": [{"term": string, "definition": string}]}',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  }

  // Моделі gpt-oss «думають» перед відповіддю — просимо думати менше, щоб було швидше
  if (model.startsWith('openai/gpt-oss')) {
    body.reasoning_effort = 'low'
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
    })

    if (!res.ok) {
      console.error(`${label}: помилка ${res.status}`, await res.text())
      return { ok: false, reason: reasonFromStatus(res.status) }
    }

    const data = await res.json()
    const text = data?.choices?.[0]?.message?.content
    if (typeof text !== 'string') {
      console.error(`${label}: порожня відповідь`, JSON.stringify(data).slice(0, 500))
      return { ok: false, reason: 'error' }
    }
    return { ok: true, text }
  } catch (err) {
    return { ok: false, reason: reasonFromError(err, label) }
  }
}

// ---------- Основний обробник ----------

Deno.serve(async (req) => {
  // Браузер спершу надсилає перевірочний запит OPTIONS (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // Ключі та моделі задаються секретами Supabase, без зміни коду
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  const geminiModel = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.8-flash'
  const geminiFallbackModel = Deno.env.get('GEMINI_FALLBACK_MODEL')
  const groqKey = Deno.env.get('GROQ_API_KEY')
  const groqModel = Deno.env.get('GROQ_MODEL') ?? 'openai/gpt-oss-120b'

  if (!geminiKey && !groqKey) {
    return json({ error: 'На сервері не налаштовано ключі ШІ' }, 500)
  }

  // ---------- Перевірка вхідних даних ----------
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Некоректний запит' }, 400)
  }

  const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
  const level = LEVELS.includes(body.level as string) ? (body.level as string) : 'B1'
  const count = Math.min(Math.max(Number(body.count) || 15, 5), 30)

  if (!topic) {
    return json({ error: 'Опиши тему сету' }, 400)
  }
  if (topic.length > 300) {
    return json({ error: 'Опис теми задовгий (максимум 300 символів)' }, 400)
  }

  // ---------- Промпт (спільний для всіх провайдерів) ----------
  const prompt = `You are helping a Ukrainian-speaking learner of English build a vocabulary flashcard set.

Learner's request: "${topic}"
Learner's level (CEFR): ${level}
Create exactly ${count} flashcards.

Rules:
- "term": an English word or short phrase that fits the topic and the ${level} level.
- "definition": a natural, accurate Ukrainian translation (the most common meaning in this context).
- No duplicates. Mix nouns, verbs, adjectives and useful phrases where the topic allows.
- Nouns without articles; verbs in the base form without "to" (phrasal verbs are fine).
- "title": a short set title in Ukrainian (2–5 words).
- If the request is unclear, create a vocabulary set loosely related to it.`

  // ---------- Ланцюжок провайдерів ----------
  const attempts: { label: string; run: () => Promise<AttemptResult> }[] = []

  if (geminiKey) {
    attempts.push({
      label: `Gemini (${geminiModel})`,
      run: () => callGemini(geminiModel, geminiKey, prompt),
    })
  }
  if (groqKey) {
    attempts.push({
      label: `Groq (${groqModel})`,
      run: () => callGroq(groqModel, groqKey, prompt),
    })
  }
  if (geminiKey && geminiFallbackModel) {
    attempts.push({
      label: `Gemini (${geminiFallbackModel})`,
      run: () => callGemini(geminiFallbackModel, geminiKey, prompt),
    })
  }

  let text: string | null = null
  let lastReason: FailReason = 'error'

  for (const attempt of attempts) {
    const started = Date.now()
    const result = await attempt.run()
    const elapsed = Date.now() - started

    if (result.ok) {
      console.log(`${attempt.label}: успіх за ${elapsed} мс`)
      text = result.text
      break
    }

    console.warn(`${attempt.label}: невдача (${result.reason}) за ${elapsed} мс, пробую наступного`)
    lastReason = result.reason
  }

  if (text === null) {
    const messages: Record<FailReason, string> = {
      timeout: 'ШІ відповідає занадто довго. Спробуй ще раз або зменш кількість слів.',
      overloaded: 'ШІ зараз перевантажений. Спробуй ще раз за хвилину.',
      rate_limit: 'Перевищено ліміт запитів до ШІ. Спробуй за хвилину.',
      error: 'ШІ тимчасово недоступний. Спробуй пізніше.',
    }
    const statuses: Record<FailReason, number> = {
      timeout: 504,
      overloaded: 503,
      rate_limit: 429,
      error: 502,
    }
    return json({ error: messages[lastReason] }, statuses[lastReason])
  }

  // ---------- Розбір і очищення відповіді ----------
  let parsed: { title?: unknown; cards?: unknown }
  try {
    // Деякі моделі загортають JSON у ```json ... ``` — прибираємо це
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    parsed = JSON.parse(cleaned)
  } catch {
    console.error('Некоректний JSON від ШІ:', text.slice(0, 500))
    return json({ error: 'ШІ повернув некоректну відповідь. Спробуй ще раз.' }, 502)
  }

  const rawCards = Array.isArray(parsed.cards) ? parsed.cards : []
  const seen = new Set<string>()
  const cards: { term: string; definition: string }[] = []

  for (const item of rawCards) {
    const term = String(item?.term ?? '').trim()
    const definition = String(item?.definition ?? '').trim()
    const key = term.toLowerCase()

    if (term && definition && !seen.has(key)) {
      seen.add(key)
      cards.push({ term, definition })
    }
  }

  if (cards.length === 0) {
    return json({ error: 'ШІ не зміг створити картки. Спробуй переформулювати тему.' }, 502)
  }

  const title =
      typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : topic.slice(0, 50)

  return json({ title, cards: cards.slice(0, count) })
})