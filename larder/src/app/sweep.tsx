import { goBack } from '../nav';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BigBtn, Btn, Icon, RoundBtn, shadow, T } from '../components/ui';
import { answerSweep, daysSince, levelText, locName, SweepAnswer, sweepQueue } from '../logic';
import { useStore } from '../store';
import { C } from '../theme';

export default function Sweep() {
  const { s, set } = useStore();
  const insets = useSafeAreaInsets();
  const [queue] = useState(() => sweepQueue(s.items));
  const [idx, setIdx] = useState(0);
  const [res, setRes] = useState({ have: 0, low: 0, gone: 0 });
  const [pos] = useState(() => new Animated.ValueXY());
  const busy = useRef(false);

  const cur = s.items.find((i) => i.id === queue[idx]);
  const hasNext = !!s.items.find((i) => i.id === queue[idx + 1]);
  const total = queue.length;

  const answer = (kind: SweepAnswer) => {
    if (busy.current || !cur) return;
    busy.current = true;
    const to = kind === 'have' ? { x: 520, y: 0 } : kind === 'gone' ? { x: -520, y: 0 } : { x: 0, y: 760 };
    Animated.timing(pos, { toValue: to, duration: 230, useNativeDriver: false }).start(() => {
      set((st) => answerSweep(st, cur.id, kind));
      setRes((r) => ({ ...r, [kind]: r[kind] + 1 }));
      setIdx((i) => i + 1);
      pos.setValue({ x: 0, y: 0 });
      busy.current = false;
    });
  };
  const answerRef = useRef(answer);
  useEffect(() => { answerRef.current = answer; });

  // Handlers read the refs only during a gesture, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !busy.current,
    onMoveShouldSetPanResponder: () => !busy.current,
    onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      if (g.dx > 90) answerRef.current('have');
      else if (g.dx < -90) answerRef.current('gone');
      else if (g.dy > 80) answerRef.current('low');
      else Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
    },
    onPanResponderTerminate: () => Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start(),
  }));

  const rotate = pos.x.interpolate({ inputRange: [-160, 160], outputRange: ['-10deg', '10deg'] });
  const haveOp = pos.x.interpolate({ inputRange: [0, 90], outputRange: [0, 1], extrapolate: 'clamp' });
  const goneOp = pos.x.interpolate({ inputRange: [-90, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const lowOp = pos.y.interpolate({ inputRange: [0, 80], outputRange: [0, 1], extrapolate: 'clamp' });
  const close = () => goBack();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }}>
        <RoundBtn icon="close" onPress={close} label="Close" />
        <T w={600}>Quick check</T>
        <T size={14} w={600} color={C.muted} style={{ width: 40, textAlign: 'right' }}>{Math.min(idx + 1, total)}/{total}</T>
      </View>
      <View style={{ marginTop: 16, marginHorizontal: 20, height: 4, borderRadius: 2, backgroundColor: C.meterOff, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${total ? (idx / total) * 100 : 0}%`, backgroundColor: C.green, borderRadius: 2 }} />
      </View>

      {cur ? (
        <>
          <View style={{ flex: 1, marginTop: 20, marginHorizontal: 24, marginBottom: 12 }}>
            {hasNext && <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, transform: [{ translateY: 14 }, { scale: 0.93 }], backgroundColor: '#fff', borderRadius: 30, opacity: 0.7 }} />}
            <Animated.View
              {...pan.panHandlers}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderRadius: 30, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 28, ...shadow(0.1, 32, 12), transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }] }}
            >
              <Stamp text="STILL HAVE" color={C.green} op={haveOp} style={{ top: 26, left: 24, transform: [{ rotate: '-12deg' }] }} />
              <Stamp text="GONE" color={C.warnBar} op={goneOp} style={{ top: 26, right: 24, transform: [{ rotate: '12deg' }] }} />
              <Stamp text="LOW" color={C.ink} op={lowOp} style={{ bottom: 28, alignSelf: 'center' }} />
              <T size={14} w={600} color={C.muted}>{locName(s, cur.loc)}</T>
              <T display size={38} style={{ textAlign: 'center', lineHeight: 40 }}>{cur.name}</T>
              <T size={15} color={C.muted}>Last checked {daysSince(cur.checkedAt)} days ago</T>
              <View style={{ marginTop: 8, backgroundColor: C.chip, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 }}>
                <T size={14} w={600}>{levelText(cur)}</T>
              </View>
            </Animated.View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 30, paddingTop: 12, paddingBottom: 32 + insets.bottom }}>
            <SwipeBtn icon="close" label="Gone" color={C.warnBar} onPress={() => answer('gone')} />
            <SwipeBtn icon="south" label="Low" color={C.ink} onPress={() => answer('low')} />
            <SwipeBtn icon="check" label="Still have" color="#fff" bg={C.green} onPress={() => answer('have')} />
          </View>
        </>
      ) : (
        <>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={46} color={C.green} />
            </View>
            <T display size={32} style={{ marginTop: 6 }}>All caught up</T>
            <T color={C.muted} style={{ textAlign: 'center', lineHeight: 24 }}>{res.have} still here, {res.low} running low, {res.gone} gone.</T>
          </View>
          <View style={{ paddingHorizontal: 20, paddingBottom: 32 + insets.bottom, gap: 10 }}>
            {res.gone + res.low > 0 && <BigBtn title="Review list" bg={C.btnSoft} color={C.ink} onPress={() => { goBack(); router.navigate('/list'); }} />}
            <BigBtn title="Done" onPress={close} />
          </View>
        </>
      )}
    </View>
  );
}

function Stamp({ text, color, op, style }: { text: string; color: string; op: Animated.AnimatedInterpolation<number>; style: object }) {
  return (
    <Animated.View style={[{ position: 'absolute', borderWidth: 3, borderColor: color, borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10, opacity: op }, style]}>
      <T size={20} w={700} color={color}>{text}</T>
    </Animated.View>
  );
}

function SwipeBtn({ icon, label, color, bg = '#fff', onPress }: { icon: string; label: string; color: string; bg?: string; onPress: () => void }) {
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <Btn accessibilityLabel={label} onPress={onPress} style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', ...shadow(0.08, 10, 2) }}>
        <Icon name={icon} size={32} color={color} />
      </Btn>
      <T size={13} w={600} color={C.muted}>{label}</T>
    </View>
  );
}
