import { useState, useEffect } from 'react';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  results: {
    length: number;
    item(index: number): {
      length: number;
      item(index: number): {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface Window {
  SpeechRecognition: {
    new(): SpeechRecognition;
  };
  webkitSpeechRecognition: {
    new(): SpeechRecognition;
  };
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    let mounted = true;

    const initializeRecognition = () => {
      if (typeof window === 'undefined') return;

      const SpeechRecognition = (window as unknown as Window).SpeechRecognition || (window as unknown as Window).webkitSpeechRecognition;
      if (SpeechRecognition && mounted) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'zh-TW';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          if (event.results.length > 0 && event.results.item(0).length > 0) {
            const transcript = event.results.item(0).item(0).transcript;
            setTranscript(transcript);
            setIsListening(false);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        setRecognition(recognition);
      }
    };

    initializeRecognition();

    return () => {
      mounted = false;
      if (recognition) {
        recognition.abort();
      }
    };
  }, [recognition]);

  const toggleListening = () => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  return {
    isListening,
    toggleListening,
    transcript,
    setTranscript
  };
}