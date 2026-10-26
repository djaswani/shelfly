import { router } from 'expo-router';
import { View } from 'react-native';
import { ItemRow } from '../../components/ItemRow';
import { Btn, Card, H1, Icon, RecipePhoto, Screen, T } from '../../components/ui';
import { monthName, todayHeading } from '../../dates';
import { isOut, itemDays, monthRecap, needsSweep, SWEEP_MAX } from '../../logic';
import { byExpiring, cardText, visibleRecipes } from '../../recipes';
import { useStore } from '../../store';
import { C } from '../../theme';

// Home shows the most urgent few; "See all" opens the full kitchen.
const USE_SOON_MAX = 5;

export default function Home() {
  const { s, openReceipt } = useStore();
  const recap = monthRecap(s);
  const useSoon = s.items
    .filter((i) => itemDays(i) != null && itemDays(i)! <= 3 && !isOut(i))
    .sort((a, b) => itemDays(a)! - itemDays(b)!);
  const sweepCount = Math.min(SWEEP_MAX, s.items.filter(needsSweep).length);
  // Only suggest dinner when at least half of it is already in the kitchen.
  const tonight = visibleRecipes(s).filter((x) => x.haveN >= x.ings.length / 2).sort(byExpiring)[0];
  const t = tonight && cardText(tonight);
  const initials = s.members[0]?.i;

  return (
    <Screen gap={24}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T size={15} w={500} color={C.muted}>{todayHeading()}</T>
        <Btn onPress={() => router.push('/settings')} accessibilityLabel="Settings" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
          {initials ? <T size={14} w={700} color={C.green}>{initials}</T> : <Icon name="person" size={22} color={C.green} />}
        </Btn>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <H1>Use soon</H1>
          <Btn onPress={() => router.navigate('/kitchen')}><T size={15} w={600} color={C.green}>See all</T></Btn>
        </View>
        <Card>
          {useSoon.length ? useSoon.slice(0, USE_SOON_MAX).map((it, i) => <ItemRow key={it.id} it={it} index={i} withLoc />) : (
            <T color={C.muted} style={{ padding: 16 }}>Nothing expiring in the next 3 days.</T>
          )}
        </Card>
      </View>

      {sweepCount > 0 && (
        <View style={{ backgroundColor: C.green, borderRadius: 22, padding: 18, paddingLeft: 20, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="swipe" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={17} w={600} color="#fff">Quick check</T>
            <T size={14} color={C.greenText} style={{ marginTop: 2 }}>{sweepCount} thing{sweepCount === 1 ? '' : 's'} to double-check · about a minute</T>
          </View>
          <Btn onPress={() => router.push('/sweep')} style={{ height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center' }}>
            <T size={15} w={700} color={C.green}>Start</T>
          </Btn>
        </View>
      )}

      {tonight && (
        <View style={{ gap: 12 }}>
          <T display size={22}>Tonight</T>
          <Btn onPress={() => router.push(`/recipe/${tonight.r.id}`)} style={{ backgroundColor: '#fff', borderRadius: 20, padding: 12, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <RecipePhoto uri={tonight.r.image} title={tonight.r.title} height={92} width={92} radius={14} />
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <T size={17} w={600}>{tonight.r.title}</T>
              <T size={13.5} color={C.muted}>{t.meta}</T>
              {!!t.expText && <T size={13.5} w={500} color={C.warn}>{t.expText}</T>}
            </View>
          </Btn>
        </View>
      )}

      {s.items.length < 8 && (
        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 12 }}>
          <View style={{ gap: 3 }}>
            <T w={600}>Fill your kitchen in a minute</T>
            <T size={13.5} color={C.muted} style={{ lineHeight: 19 }}>Snap your last grocery receipt and Shelfly adds everything on it, with good-until dates.</T>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn onPress={openReceipt} style={{ flex: 1, height: 44, borderRadius: 14, backgroundColor: C.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="receipt_long" size={19} color="#fff" />
              <T size={15} w={600} color="#fff">Scan receipt</T>
            </Btn>
            <Btn onPress={() => router.push('/scan')} style={{ flex: 1, height: 44, borderRadius: 14, backgroundColor: C.btnSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="barcode_scanner" size={19} />
              <T size={15} w={600}>Barcode</T>
            </Btn>
          </View>
        </View>
      )}

      <Btn onPress={() => router.push('/recap')} style={{ backgroundColor: '#fff', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Icon name="bar_chart" size={24} color={C.green} />
        <View style={{ flex: 1 }}>
          <T w={600}>{monthName()}</T>
          <T size={13.5} color={C.muted} style={{ marginTop: 2 }}>{recap.used} used in time · {recap.tossed} tossed</T>
        </View>
        <Icon name="chevron_right" color={C.faint} />
      </Btn>
    </Screen>
  );
}
