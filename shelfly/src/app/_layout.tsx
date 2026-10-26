import { BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ItemSheet, Toast } from '../components/ItemSheet';
import { PlusGate } from '../components/PlusGate';
import { notificationsAllowed, scheduleDigest } from '../notifications';
import { normalizeUrl } from '../recipeImport';
import { StoreProvider, useStore } from '../store';
import { SyncProvider } from '../sync/SyncProvider';
import { C } from '../theme';

export default function RootLayout() {
  const [loaded] = useFonts({
    BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold,
    Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold,
    ...MaterialIcons.font, ...MaterialCommunityIcons.font,
  });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <ShareIntentProvider options={{ disabled: Platform.OS === 'web' }}>
      <SafeAreaProvider>
        <StoreProvider>
          {/* On web, keep the phone-width layout centered */}
          <View style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? '#E8E3D9' : C.bg, alignItems: 'center' }}>
            <View style={{ flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 440 : undefined, backgroundColor: C.bg, overflow: 'hidden' }}>
              <SyncProvider>
                <Gate />
              </SyncProvider>
            </View>
          </View>
          <StatusBar style="dark" />
        </StoreProvider>
      </SafeAreaProvider>
    </ShareIntentProvider>
  );
}

function Gate() {
  const { ready } = useStore();
  if (!ready) return null;
  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="add" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="receipt" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="import" options={{ presentation: 'modal', gestureEnabled: false }} />
        <Stack.Screen name="sweep" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="plus" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      </Stack>
      <ItemSheet />
      <PlusGate />
      <Toast />
      <DigestScheduler />
      <ShareHandler />
    </>
  );
}

// Keeps the next week of digest notifications in step with the inventory.
function DigestScheduler() {
  const { s } = useStore();
  const { items, recipes, digest, digestTime } = s;
  useEffect(() => {
    const t = setTimeout(() => {
      // The digest is on by default, so ask for permission once, shortly after the first launch.
      (digest ? notificationsAllowed(true) : Promise.resolve())
        .then(() => scheduleDigest(items, recipes, digest, digestTime))
        .catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [items, recipes, digest, digestTime]);
  return null;
}

// "Share to Shelfly" from Safari, Instagram, TikTok…: open the shared link on the import screen.
function ShareHandler() {
  const { s, showToast } = useStore();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  useEffect(() => {
    // Wait until setup is done; the share stays pending until then.
    if (!hasShareIntent || !s.onboarded) return;
    const url = shareIntent.webUrl ?? normalizeUrl(shareIntent.text ?? '');
    resetShareIntent();
    if (url) setTimeout(() => router.push({ pathname: '/import', params: { url } }), 300);
    else showToast('Share a link to a recipe to save it');
  }, [hasShareIntent, shareIntent, s.onboarded, resetShareIntent, showToast]);
  return null;
}
