import { useState } from 'react';
import { View } from 'react-native';
import { Btn, Card, H1, Icon, RoundBtn, rowBorder, Screen, T } from '../components/ui';
import { goBack } from '../nav';
import { C } from '../theme';

const FAQ = [
  {
    q: 'How does Larder know when food goes off?',
    a: 'Dates come from the USDA FoodKeeper guide when it knows the food and where you keep it. Otherwise Larder uses a rough typical value and labels it "Rough estimate". Tap any date to change it. Always check food before eating it.',
  },
  {
    q: 'What does "Probably low" mean?',
    a: 'Larder gets less sure about an item the longer it goes without anyone checking it. Fresh food fades fastest. Once it is unsure, it says "Probably", and the Sunday sweep asks you about it.',
  },
  {
    q: 'What is the Sunday sweep?',
    a: 'A quick check of the items Larder is least sure about, at most 15. Answer "Still have", "Low" or "Gone" for each one. It takes about a minute and keeps the whole kitchen accurate.',
  },
  {
    q: 'How does receipt scanning work?',
    a: 'Take a photo of the receipt, or pick one from your photos. Larder reads it on your phone, so the photo never leaves your device. Check the names, fix any it got wrong, and Larder remembers your fixes for next time.',
  },
  {
    q: 'How do I share with my household?',
    a: 'Go to Settings, then "Share this kitchen". Sign in with your email, start a household, and send the invite code. Everyone sees the same kitchen and list, and changes sync live.',
  },
  {
    q: 'What happens when I cook a recipe?',
    a: 'Tap "I cooked this" and Larder suggests how much of each ingredient you used. Adjust it if needed and your kitchen updates in one step.',
  },
  {
    q: 'Can I get my data out?',
    a: 'Yes. Settings > Your data exports everything as CSV or JSON. You can save it to Files or send it anywhere.',
  },
];

export default function Help() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Screen gap={20} bottom={48}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <RoundBtn icon="arrow_back" onPress={() => goBack()} label="Back" />
        <H1 size={30}>Help &amp; FAQ</H1>
      </View>
      <Card>
        {FAQ.map((f, i) => (
          <Btn key={f.q} onPress={() => setOpen(open === i ? null : i)} style={[{ paddingVertical: 14, paddingHorizontal: 16, gap: 8 }, rowBorder(i)]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <T w={600} style={{ flex: 1 }}>{f.q}</T>
              <Icon name={open === i ? 'expand_less' : 'expand_more'} color={C.faint} />
            </View>
            {open === i && <T size={15} color={C.muted} style={{ lineHeight: 22 }}>{f.a}</T>}
          </Btn>
        ))}
      </Card>
    </Screen>
  );
}
