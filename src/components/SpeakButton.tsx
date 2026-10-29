import type { MouseEvent } from "react";
import { isSpeechSupported, speak } from "../lib/speech";

interface SpeakButtonProps {
  text: string;
  lang?: string;
  size?: "small" | "large";
}

export default function SpeakButton({
  text,
  lang = "en",
  size = "small",
}: SpeakButtonProps) {
  // Якщо браузер не вміє озвучувати, кнопку просто не показуємо
  if (!isSpeechSupported()) return null;

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation(); // щоб клік по кнопці не перевертав картку
    speak(text, lang);
    e.currentTarget.blur(); // щоб пробіл і далі перевертав картку
  }

  return (
    <button
      type="button"
      className={`speak-button ${size}`}
      onClick={handleClick}
      aria-label={`Озвучити: ${text}`}
      title="Озвучити"
    >
      🔊
    </button>
  );
}

