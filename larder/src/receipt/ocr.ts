// On-device text recognition (Apple Vision on iOS, Google ML Kit on Android) via expo-text-extractor.
// Free, offline, and the photo never leaves the phone. Needs the Larder development build:
// Expo Go and web don't include the native module, so `ocrAvailable` is false there.
import { requireOptionalNativeModule } from 'expo';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

type TextExtractor = { isSupported: boolean; extractTextFromImage(uri: string): Promise<string[]> };

const native = requireOptionalNativeModule<TextExtractor>('ExpoTextExtractor');

export const ocrAvailable = !!native?.isSupported;

// Re-encode first: this applies the photo's rotation (Vision reads raw pixels, so a sideways
// photo would read as noise) and shrinks huge camera images so recognition stays quick.
async function normalize(uri: string, width: number): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  if (width > 2400) ctx.resize({ width: 2400 });
  const img = await ctx.renderAsync();
  const saved = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
  return saved.uri;
}

export async function readReceiptText(uri: string, width = 0): Promise<string> {
  if (!native) throw new Error('Text recognition needs the Larder development build.');
  const lines = await native.extractTextFromImage(await normalize(uri, width));
  return lines.join('\n');
}
