import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme';

// Bottom sheet over a scrim, matching the design's 28px-radius sheets. It never grows past 88% of
// the screen; a ScrollView inside with flexShrink: 1 scrolls while the rest stays put.
export function Sheet({ onClose, children, z = 40, style }: { onClose: () => void; children: ReactNode; z?: number; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: z }}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.scrim }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%' }}>
        <View style={[{ flexShrink: 1, backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingHorizontal: 20, paddingBottom: 24 + insets.bottom, gap: 14 }, style]}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: C.grab, alignSelf: 'center' }} />
          {children}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
