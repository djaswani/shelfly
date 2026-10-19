import { useState } from 'react';
import { ActivityIndicator, Share, TextInput, View } from 'react-native';
import { BigBtn, Btn, Card, H1, Icon, RoundBtn, rowBorder, S, Screen, SectionLabel, T } from '../components/ui';
import { goBack } from '../nav';
import { useStore } from '../store';
import { friendly, useSync } from '../sync/SyncProvider';
import { C } from '../theme';

const field = [S.input, { flex: 0, height: 50, borderRadius: 14, backgroundColor: '#fff', paddingHorizontal: 14 }];

export default function Account() {
  const sync = useSync();
  return (
    <Screen gap={20} bottom={48}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <RoundBtn icon="arrow_back" onPress={() => goBack()} label="Back" />
        <H1 size={30}>Household</H1>
      </View>
      {!sync.enabled ? (
        <T color={C.muted}>Sync isn’t set up in this build. Add the Supabase settings to .env and rebuild.</T>
      ) : !sync.session ? <SignIn /> : !sync.household ? <SetUp /> : <Joined />}
    </Screen>
  );
}

function useBusy() {
  const { showToast } = useStore();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>, done?: string) => {
    setBusy(true);
    try { await fn(); if (done) showToast(done); } catch (e) { showToast(friendly(e)); } finally { setBusy(false); }
  };
  return { busy, run };
}

function SignIn() {
  const sync = useSync();
  const { busy, run } = useBusy();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <View style={{ gap: 14 }}>
      <T color={C.muted} style={{ lineHeight: 22 }}>Sign in to share your kitchen with your household and keep it in sync across phones. Your kitchen stays on this phone either way.</T>
      <TextInput value={email} onChangeText={setEmail} editable={!sent} placeholder="Email" placeholderTextColor={C.faint} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" style={field} />
      {sent && (
        <>
          <T size={14} color={C.muted} style={{ lineHeight: 20 }}>We emailed {email.trim()}. Enter the code, or copy the sign-in link from the email (press and hold it, don’t tap it) and paste it here.</T>
          <TextInput value={code} onChangeText={setCode} placeholder="Code or sign-in link" placeholderTextColor={C.faint} autoCapitalize="none" autoCorrect={false} textContentType="oneTimeCode" autoComplete="one-time-code" autoFocus style={field} />
        </>
      )}
      {busy ? <ActivityIndicator color={C.green} /> : sent ? (
        <>
          <BigBtn title="Sign in" onPress={() => code.trim() && run(() => sync.verifyCode(email, code))} />
          <Btn onPress={() => { setSent(false); setCode(''); }} style={{ alignItems: 'center' }}><T size={14} w={600} color={C.muted}>Use a different email</T></Btn>
        </>
      ) : (
        <BigBtn title="Email me a code" onPress={() => /\S+@\S+\.\S+/.test(email) && run(async () => { await sync.sendCode(email); setSent(true); })} />
      )}
    </View>
  );
}

function SetUp() {
  const sync = useSync();
  const { s } = useStore();
  const { busy, run } = useBusy();
  const [name, setName] = useState(s.members[0]?.n ?? '');
  const [code, setCode] = useState('');

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 8 }}>
        <SectionLabel>Your name</SectionLabel>
        <TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={C.faint} style={field} />
      </View>
      <Card style={{ padding: 16, gap: 10 }}>
        <T w={600}>Start a household</T>
        <T size={14} color={C.muted} style={{ lineHeight: 20 }}>Your current kitchen becomes the shared one. You’ll get a code to invite someone.</T>
        <BigBtn title="Start household" onPress={() => run(() => sync.createHousehold(`${name.trim() || 'Our'}’s kitchen`, name), 'Household created')} />
      </Card>
      <Card style={{ padding: 16, gap: 10 }}>
        <T w={600}>Join a household</T>
        <T size={14} color={C.muted} style={{ lineHeight: 20 }}>Enter the code from someone’s Larder. Their kitchen replaces what’s on this phone.</T>
        <TextInput value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="Invite code" placeholderTextColor={C.faint} autoCapitalize="characters" autoCorrect={false} maxLength={6} style={[field, { backgroundColor: C.bg, letterSpacing: 4, fontSize: 20 }]} />
        <BigBtn title="Join" bg={C.ink} onPress={() => code.trim().length >= 6 && run(() => sync.joinHousehold(code, name), 'Joined household')} />
      </Card>
      {busy && <ActivityIndicator color={C.green} />}
      <Btn onPress={() => run(sync.signOut)} style={{ alignItems: 'center' }}><T size={14} w={600} color={C.muted}>Sign out</T></Btn>
    </View>
  );
}

function Joined() {
  const sync = useSync();
  const { busy, run } = useBusy();
  const h = sync.household!;
  const me = sync.session?.user.id;
  const status = sync.status === 'offline' ? 'Offline. Changes will sync when you’re back online.'
    : sync.status === 'syncing' ? 'Syncing…'
    : sync.lastSynced ? `Synced at ${sync.lastSynced.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Synced';

  const invite = () => Share.share({ message: `Join my kitchen on Larder with code ${h.invite_code}` });

  return (
    <View style={{ gap: 18 }}>
      <Card style={{ padding: 18, gap: 6 }}>
        <T display size={24}>{h.name}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name={sync.status === 'offline' ? 'cloud_off' : 'cloud_done'} size={18} color={sync.status === 'offline' ? C.warn : C.green} />
          <T size={14} color={C.muted}>{status}</T>
        </View>
      </Card>
      <View style={{ gap: 8 }}>
        <SectionLabel>Invite code</SectionLabel>
        <Card style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <T size={28} w={700} style={{ flex: 1, letterSpacing: 6 }} selectable>{h.invite_code}</T>
          <Btn onPress={invite} style={{ height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: C.green, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="ios_share" size={18} color="#fff" />
            <T size={15} w={600} color="#fff">Share</T>
          </Btn>
        </Card>
        <T size={13} color={C.muted} style={{ paddingHorizontal: 4 }}>{h.plan === 'plus' ? 'Up to 6 members.' : 'The free plan includes 2 members.'}</T>
      </View>
      <View style={{ gap: 8 }}>
        <SectionLabel>Members</SectionLabel>
        <Card>
          {sync.members.map((m, i) => (
            <View key={m.user_id} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }, rowBorder(i)]}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: i ? C.warnSoft : C.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
                <T size={13} w={700} color={i ? C.warn : C.green}>{(m.display_name || '?').slice(0, 2).toUpperCase()}</T>
              </View>
              <T w={500} style={{ flex: 1 }}>{m.display_name || 'Member'}</T>
              <T size={14} color={C.muted}>{m.user_id === me ? 'You' : m.role === 'owner' ? 'Owner' : 'Member'}</T>
            </View>
          ))}
        </Card>
      </View>
      {busy && <ActivityIndicator color={C.green} />}
      <Card>
        <Btn onPress={() => run(sync.leaveHousehold, 'Left household')} style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
          <T color={C.warn}>Leave household</T>
        </Btn>
        <Btn onPress={() => run(sync.signOut, 'Signed out')} style={{ paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: C.line }}>
          <T>Sign out</T>
        </Btn>
      </Card>
      <T size={13} color={C.faint} style={{ paddingHorizontal: 4 }}>Signed in as {sync.session?.user.email}. Leaving or signing out keeps a copy of the kitchen on this phone.</T>
    </View>
  );
}
