import { ComponentProps } from 'react';
import { router, Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Icon, shadow, T } from '../../components/ui';
import { C } from '../../theme';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: Record<string, { label: string; icon: string }> = {
  index: { label: 'Home', icon: 'home' },
  kitchen: { label: 'Kitchen', icon: 'kitchen' },
  list: { label: 'List', icon: 'shopping_basket' },
  cook: { label: 'Cook', icon: 'skillet' },
};

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tab = (i: number) => {
    const route = state.routes[i];
    const meta = TABS[route.name];
    const color = state.index === i ? C.green : C.tabOff;
    return (
      <Btn key={route.key} onPress={() => navigation.navigate(route.name)} style={{ width: 64, alignItems: 'center', gap: 3, paddingTop: 2 }}>
        <Icon name={meta.icon} size={26} color={color} />
        <T size={11} w={600} color={color}>{meta.label}</T>
      </Btn>
    );
  };
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: 8, paddingHorizontal: 4, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: 'rgba(255,255,255,0.96)', borderTopWidth: 1, borderTopColor: C.line }}>
      {tab(0)}
      {tab(1)}
      <Btn accessibilityLabel="Add food" onPress={() => router.push('/add')} style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginTop: -2, ...shadow(0.16, 12, 4) }}>
        <Icon name="add" size={30} color="#fff" />
      </Btn>
      {tab(2)}
      {tab(3)}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="kitchen" />
      <Tabs.Screen name="list" />
      <Tabs.Screen name="cook" />
    </Tabs>
  );
}
