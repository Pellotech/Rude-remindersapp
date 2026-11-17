import { Capacitor } from '@capacitor/core';

type VoiceProfile = {
  rate: number;
  pitch: number;
  lang: string;
  // Voice names to look for, best first. Matched case-insensitively against each
  // installed voice's name. The names are the built-in voices on iOS (Samantha,
  // Daniel, Arthur, George), Chrome/Android (Google UK English Male, en-gb-x-rjs)
  // and Windows (Zira, George). Anything not found falls back to the device default.
  preferred: string[];
  // Used only when none of the preferred names are installed.
  fallback: 'female' | 'british-male';
};

const VOICE_PROFILES: Record<string, VoiceProfile> = {
  'default': {
    rate: 0.85, pitch: 0.9, lang: 'en-US',
    preferred: ['samantha', 'zira', 'aria', 'jenny', 'google us english'],
    fallback: 'female',
  },
  'confident-leader': {
    rate: 0.75, pitch: 0.35, lang: 'en-GB',
    preferred: ['daniel', 'google uk english male', 'ryan', 'en-gb-x-rjs'],
    fallback: 'british-male',
  },
  'british-butler': {
    rate: 0.55, pitch: 0.35, lang: 'en-GB',
    preferred: ['arthur', 'george', 'en-gb-x-gba', 'en-gb-x-rjs'],
    fallback: 'british-male',
  },
  'karen-nag': {
    rate: 0.95, pitch: 1.3, lang: 'en-US',
    preferred: ['karen', 'samantha', 'zira', 'google us english'],
    fallback: 'female',
  },
};

function getProfile(character: string): VoiceProfile {
  return VOICE_PROFILES[character] || VOICE_PROFILES['default'];
}

// Picks the best voice for a character from any list of voices that has a name and a lang.
// Returns undefined when nothing suitable is installed, so the device default is used.
function pickVoice<T extends { name: string; lang: string }>(voices: T[], profile: VoiceProfile): T | undefined {
  const english = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
  const pool = english.length > 0 ? english : voices;

  for (const wanted of profile.preferred) {
    const match = pool.find(v => v.name.toLowerCase().includes(wanted));
    if (match) return match;
  }

  if (profile.fallback === 'british-male') {
    return pool.find(v => v.lang.toLowerCase().startsWith('en-gb')) ||
      pool.find(v => v.name.toLowerCase().includes('daniel'));
  }
  return pool.find(v => v.name.toLowerCase().includes('female'));
}

async function chooseNativeVoice(
  TextToSpeech: typeof import('@capacitor-community/text-to-speech')['TextToSpeech'],
  profile: VoiceProfile,
): Promise<{ index: number; lang: string; name: string } | undefined> {
  try {
    const { voices } = await TextToSpeech.getSupportedVoices();
    const indexed = voices.map((v, index) => ({ name: v.name, lang: v.lang, index }));
    const best = pickVoice(indexed, profile);
    return best ? { index: best.index, lang: best.lang, name: best.name } : undefined;
  } catch {
    return undefined;
  }
}

function chooseBrowserVoice(profile: VoiceProfile): SpeechSynthesisVoice | undefined {
  if (!('speechSynthesis' in window)) return undefined;
  return pickVoice(window.speechSynthesis.getVoices(), profile);
}

async function speakNativeRaw(text: string, character: string): Promise<void> {
  const profile = getProfile(character);
  const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
  const chosen = await chooseNativeVoice(TextToSpeech, profile);
  await TextToSpeech.speak({
    text,
    lang: chosen?.lang ?? profile.lang,
    rate: profile.rate,
    pitch: profile.pitch,
    volume: 1.0,
    voice: chosen?.index,
    category: 'ambient',
  });
  console.log(`🎙️ [TTS] Native speak completed | character="${character}" | voice="${chosen?.name ?? 'device default'}"`);
}

async function speakNative(text: string, character: string): Promise<void> {
  try {
    await speakNativeRaw(text, character);
  } catch (error) {
    console.error(`🎙️ [TTS] Native speak failed, trying browser fallback:`, error);
    speakBrowser(text, character);
  }
}

function buildBrowserUtterance(text: string, character: string): SpeechSynthesisUtterance {
  const profile = getProfile(character);
  const voice = chooseBrowserVoice(profile);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = profile.rate;
  utterance.pitch = profile.pitch;
  utterance.lang = voice?.lang ?? profile.lang;
  if (voice) utterance.voice = voice;
  console.log(`🎙️ [TTS] Browser voice | character="${character}" | voice="${voice?.name ?? 'device default'}"`);
  return utterance;
}

function speakBrowser(text: string, character: string): void {
  if (!('speechSynthesis' in window)) {
    console.error(`🎙️ [TTS] speechSynthesis NOT available in this browser/WebView`);
    return;
  }
  const utterance = buildBrowserUtterance(text, character);
  utterance.onstart = () => console.log(`🎙️ [TTS] Browser utterance STARTED | character="${character}"`);
  utterance.onend = () => console.log(`🎙️ [TTS] Browser utterance ENDED`);
  utterance.onerror = (e) => console.error(`🎙️ [TTS] Browser utterance ERROR:`, e.error);
  window.speechSynthesis.speak(utterance);
  console.log(`🎙️ [TTS] Browser speechSynthesis.speak() called | character="${character}"`);
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
    speakNativeRaw(text, character).then(() => {
      onEnd?.();
    }).catch((err) => {
      console.error(`🎙️ [TTS] Native speak failed:`, err);
      onError?.();
    });
  } else {
    if (!('speechSynthesis' in window)) {
      console.error(`🎙️ [TTS] speechSynthesis NOT available`);
      onError?.();
      return;
    }
    const utterance = buildBrowserUtterance(text, character);
    utterance.onend = () => { console.log(`🎙️ [TTS] Browser utterance ENDED`); onEnd?.(); };
    utterance.onerror = () => { console.error(`🎙️ [TTS] Browser utterance ERROR`); onError?.(); };
    window.speechSynthesis.speak(utterance);
  }
}
