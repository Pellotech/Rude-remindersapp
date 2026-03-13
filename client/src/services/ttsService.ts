import { Capacitor } from '@capacitor/core';

const VOICE_SETTINGS: Record<string, { rate: number; pitch: number; lang: string; voiceType: string }> = {
  'default': { rate: 0.85, pitch: 0.9, lang: 'en-US', voiceType: 'female' },
  'confident-leader': { rate: 0.9, pitch: 0.6, lang: 'en-US', voiceType: 'male' },
  'british-butler': { rate: 0.7, pitch: 0.2, lang: 'en-GB', voiceType: 'british-male' },
  'karen-nag': { rate: 1.2, pitch: 1.3, lang: 'en-US', voiceType: 'female' },
};

function getSettings(character: string) {
  return VOICE_SETTINGS[character] || VOICE_SETTINGS['default'];
}

function findPreferredVoice(voices: SpeechSynthesisVoice[], voiceType: string): SpeechSynthesisVoice | undefined {
  if (voiceType === 'british-male') {
    return voices.find(v => v.lang.startsWith('en-GB') && v.name.toLowerCase().includes('male')) ||
      voices.find(v => v.lang.startsWith('en-GB')) ||
      voices.find(v => v.name.toLowerCase().includes('daniel')) ||
      voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male'));
  }
  if (voiceType === 'male') {
    return voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male')) ||
      voices.find(v => v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('alex'));
  }
  return voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
    voices.find(v => v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('karen'));
}

async function speakNative(text: string, character: string): Promise<void> {
  const settings = getSettings(character);
  try {
    const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
    await TextToSpeech.speak({
      text,
      lang: settings.lang,
      rate: settings.rate,
      pitch: settings.pitch,
      volume: 1.0,
      category: 'ambient',
    });
    console.log(`🎙️ [TTS] Native speak completed | character="${character}" | lang=${settings.lang}`);
  } catch (error) {
    console.error(`🎙️ [TTS] Native speak failed, trying browser fallback:`, error);
    speakBrowser(text, character);
  }
}

function speakBrowser(text: string, character: string): void {
  if (!('speechSynthesis' in window)) {
    console.error(`🎙️ [TTS] speechSynthesis NOT available in this browser/WebView`);
    return;
  }
  const settings = getSettings(character);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = settings.rate;
  utterance.pitch = settings.pitch;
  utterance.lang = settings.lang;
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = findPreferredVoice(voices, settings.voiceType);
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  utterance.onstart = () => console.log(`🎙️ [TTS] Browser utterance STARTED | character="${character}"`);
  utterance.onend = () => console.log(`🎙️ [TTS] Browser utterance ENDED`);
  utterance.onerror = (e) => console.error(`🎙️ [TTS] Browser utterance ERROR:`, e.error);
  window.speechSynthesis.speak(utterance);
  console.log(`🎙️ [TTS] Browser speechSynthesis.speak() called | character="${character}" | lang=${settings.lang}`);
}

export async function speak(text: string, character: string = 'default'): Promise<void> {
  console.log(`🎙️ [TTS] speak() called | native=${Capacitor.isNativePlatform()} | character="${character}" | textLen=${text.length}`);
  if (Capacitor.isNativePlatform()) {
    await speakNative(text, character);
  } else {
    speakBrowser(text, character);
  }
}

export async function stop(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
      await TextToSpeech.stop();
    } catch {
      // ignore
    }
  } else if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function speakWithCallback(
  text: string,
  character: string = 'default',
  onEnd?: () => void,
  onError?: () => void
): void {
  if (Capacitor.isNativePlatform()) {
    const settings = getSettings(character);
    import('@capacitor-community/text-to-speech').then(({ TextToSpeech }) => {
      TextToSpeech.speak({
        text,
        lang: settings.lang,
        rate: settings.rate,
        pitch: settings.pitch,
        volume: 1.0,
        category: 'ambient',
      }).then(() => {
        console.log(`🎙️ [TTS] Native speak completed | character="${character}"`);
        onEnd?.();
      }).catch((err) => {
        console.error(`🎙️ [TTS] Native speak failed:`, err);
        onError?.();
      });
    }).catch(() => {
      onError?.();
    });
  } else {
    if (!('speechSynthesis' in window)) {
      console.error(`🎙️ [TTS] speechSynthesis NOT available`);
      onError?.();
      return;
    }
    const settings = getSettings(character);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.lang = settings.lang;
    const voices = window.speechSynthesis.getVoices();
    const preferred = findPreferredVoice(voices, settings.voiceType);
    if (preferred) utterance.voice = preferred;
    utterance.onend = () => { console.log(`🎙️ [TTS] Browser utterance ENDED`); onEnd?.(); };
    utterance.onerror = () => { console.error(`🎙️ [TTS] Browser utterance ERROR`); onError?.(); };
    window.speechSynthesis.speak(utterance);
  }
}
