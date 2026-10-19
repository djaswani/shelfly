import { BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ItemSheet, Toast } from '../components/ItemSheet';
import { StoreProvider, useStore } from '../store';
import { C } from '../theme';

export default function RootLayout() {
  const [loaded] = useFonts({
    BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold,
    Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold,
    ...MaterialIcons.font, ...MaterialCommunityIcons.font,
  });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <SafeAreaProvider>
      <StoreProvider>
        {/* On web, keep the phone-width layout centered */}
        <View style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? '#E8E3D9' : C.bg, alignItems: 'center' }}>
          <View style={{ flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 440 : undefined, backgroundColor: C.bg, overflow: 'hidden' }}>
            <Gate />
          </View>
        </View>
        <StatusBar style="dark" />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function Gate() {
  const { ready } = useStore();
  if (!ready) return null;
  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="receipt" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="sweep" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="plus" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      </Stack>
      <ItemSheet />
      <Toast />
    </>
  );
}
