// Відповідність коду мови в базі та мовного стандарту для синтезу мовлення
const LOCALES: Record<string, string> = {
    en: 'en-US',
    uk: 'uk-UA',
    de: 'de-DE',
    fr: 'fr-FR',
    es: 'es-ES',
    it: 'it-IT',
    pl: 'pl-PL',
}

export function isSpeechSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// Деякі браузери завантажують список голосів не одразу, тому «будимо» його заздалегідь
if (isSpeechSupported()) {
    window.speechSynthesis.getVoices()
}

function pickVoice(locale: string): SpeechSynthesisVoice | undefined {
    const voices = window.speechSynthesis.getVoices()
    const language = locale.split('-')[0]
    return voices.find((v) => v.lang === locale) ?? voices.find((v) => v.lang.startsWith(language))
}

export function speak(text: string, lang = 'en'): void {
    if (!isSpeechSupported() || !text.trim()) return

    const locale = LOCALES[lang] ?? lang

    // Зупиняємо попереднє озвучення, щоб слова не накладалися
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = locale
    utterance.rate = 0.9 // трохи повільніше за звичайне, щоб краще чути вимову

    const voice = pickVoice(locale)
    if (voice) utterance.voice = voice

    window.speechSynthesis.speak(utterance)
}