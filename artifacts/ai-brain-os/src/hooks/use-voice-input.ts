import { useCallback, useEffect, useRef, useState } from "react";

const VOICE_LANG_KEY = "ai-brain-os:voice-lang";

export type VoiceError =
  | "no-speech"
  | "audio-capture"
  | "not-allowed"
  | "network"
  | "aborted"
  | "unsupported"
  | "unknown";

export const VOICE_ERROR_MESSAGES: Record<VoiceError, string> = {
  "no-speech": "No speech detected. Try speaking a little louder or closer to the mic.",
  "audio-capture": "No microphone found. Please connect or enable a microphone.",
  "not-allowed": "Microphone access denied. Allow mic access in your browser settings.",
  "network": "Speech recognition network error. Please check your connection and try again.",
  "aborted": "Listening stopped.",
  "unsupported": "Voice input is not supported in this browser. Try Chrome or Edge.",
  "unknown": "Speech recognition failed. Please try again.",
};

export const VOICE_LANGUAGES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "hi-IN", label: "Hindi" },
  { value: "es-ES", label: "Spanish" },
  { value: "fr-FR", label: "French" },
  { value: "de-DE", label: "German" },
  { value: "ja-JP", label: "Japanese" },
  { value: "zh-CN", label: "Chinese (Simplified)" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "ar-SA", label: "Arabic" },
];

export interface UseVoiceInputOptions {
  /** Called when a final transcript is confirmed by the speech recogniser. */
  onFinalTranscript?: (transcript: string) => void;
}

export interface UseVoiceInputReturn {
  /** Interim + final transcript text being recognised right now. */
  transcript: string;
  isListening: boolean;
  voiceSupported: boolean;
  error: VoiceError | null;
  lang: string;
  setLang: (lang: string) => void;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
}

export function useVoiceInput({
  onFinalTranscript,
}: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [error, setError] = useState<VoiceError | null>(null);
  const [lang, setLangState] = useState<string>(
    () => localStorage.getItem(VOICE_LANG_KEY) ?? "en-US",
  );

  const recognitionRef = useRef<any>(null);
  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;
  const langRef = useRef(lang);
  langRef.current = lang;

  const setLang = useCallback((newLang: string) => {
    localStorage.setItem(VOICE_LANG_KEY, newLang);
    setLangState(newLang);
    if (recognitionRef.current) {
      recognitionRef.current.lang = newLang;
    }
  }, []);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setVoiceSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = langRef.current;

    recognition.onresult = (event: any) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript as string;
        if (event.results[i].isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }
      const current = finalText || interimText;
      setTranscript(current);
      if (finalText) {
        onFinalRef.current?.(finalText);
      }
    };

    recognition.onerror = (event: any) => {
      const code = event.error as string;
      if (code === "aborted") {
        // Silently ignore user-initiated abort
        setIsListening(false);
        return;
      }
      const errorMap: Record<string, VoiceError> = {
        "no-speech": "no-speech",
        "audio-capture": "audio-capture",
        "not-allowed": "not-allowed",
        network: "network",
      };
      setError(errorMap[code] ?? "unknown");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    setTranscript("");
    recognitionRef.current.lang = langRef.current;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // Already started — ignore
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return {
    transcript,
    isListening,
    voiceSupported,
    error,
    lang,
    setLang,
    startListening,
    stopListening,
    clearTranscript,
  };
}
