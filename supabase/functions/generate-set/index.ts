// Серверна функція: генерує сет карток через Gemini API

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']

// Коди помилок, при яких є сенс повторити запит
const RETRYABLE_STATUSES = [500, 503]

// Скільки чекати відповіді Gemini на одну спробу (мс)
const ATTEMPT_TIMEOUT_MS = 30_000

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Схема відповіді: змушуємо Gemini повертати строго такий JSON
const responseSchema = {
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

Deno.serve(async (req) => {
  // Браузер спершу надсилає перевірочний запит OPTIONS (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    return json({ error: 'На сервері не налаштовано ключ ШІ' }, 500)
  }

  // Моделі можна змінити секретами без зміни коду
  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.8-flash'
  const fallbackModel = Deno.env.get('GEMINI_FALLBACK_MODEL')

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

  // ---------- Промпт ----------
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

  const requestBody = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.7,
      // Менше «роздумів» — швидша відповідь (для перекладу слів цього достатньо)
      thinkingConfig: { thinkingLevel: 'low' },
    },
  })

  function callGemini(modelName: string): Promise<Response> {
    return fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey!,
          },
          body: requestBody,
          // Не чекаємо вічно: після тайм-ауту запит обривається
          signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        },
    )
  }

  // ---------- Запит до Gemini з повторними спробами ----------
  // Дві спроби основною моделлю, потім (якщо задана) запасна модель
  const attempts = fallbackModel ? [model, model, fallbackModel] : [model, model]

  let geminiResponse: Response | null = null
  let timedOut = false

  for (let i = 0; i < attempts.length; i++) {
    const started = Date.now()
    try {
      geminiResponse = await callGemini(attempts[i])
      timedOut = false
      console.log(`Gemini (${attempts[i]}) відповів за ${Date.now() - started} мс, статус ${geminiResponse.status}`)
    } catch (err) {
      geminiResponse = null
      timedOut = err instanceof Error && err.name === 'TimeoutError'
      console.error(
          timedOut
              ? `Gemini (${attempts[i]}) не відповів за ${ATTEMPT_TIMEOUT_MS} мс`
              : `Gemini fetch failed: ${err}`,
      )
    }

    // Успіх або помилка, яку повтор не виправить, — виходимо з циклу
    if (geminiResponse && !RETRYABLE_STATUSES.includes(geminiResponse.status)) {
      break
    }

    if (i < attempts.length - 1) {
      console.warn(`Повторна спроба ${i + 2} з ${attempts.length}...`)
      await sleep(1500 * (i + 1))
    }
  }

  if (!geminiResponse) {
    return timedOut
        ? json({ error: 'ШІ відповідає занадто довго. Спробуй ще раз або зменш кількість слів.' }, 504)
        : json({ error: 'Не вдалося зв\'язатися з ШІ' }, 502)
  }
  if (geminiResponse.status === 429) {
    return json({ error: 'Перевищено ліміт запитів до ШІ. Спробуй за хвилину.' }, 429)
  }
  if (geminiResponse.status === 503) {
    return json({ error: 'ШІ зараз перевантажений. Спробуй ще раз за хвилину.' }, 503)
  }
  if (!geminiResponse.ok) {
    console.error('Gemini error:', geminiResponse.status, await geminiResponse.text())
    return json({ error: 'ШІ тимчасово недоступний. Спробуй пізніше.' }, 502)
  }

  // ---------- Розбір і очищення відповіді ----------
  const data = await geminiResponse.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

  let parsed: { title?: unknown; cards?: unknown }
  try {
    parsed = JSON.parse(text)
  } catch {
    console.error('Invalid JSON from Gemini:', text)
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