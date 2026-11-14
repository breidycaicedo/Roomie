import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';

type Clan = {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  rules: string | null;
  max_members: number;
};

type PersonInfo = { username: string; full_name: string | null } | null;

type Member = { user_id: string; role: string; profiles: PersonInfo };
type JoinRequest = { id: string; message: string | null; profiles: PersonInfo };

export default function MiClan() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [clan, setClan] = useState<Clan | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [rules, setRules] = useState('');
  const [maxMembers, setMaxMembers] = useState('4');

  const load = useCallback(async () => {
    if (!session) {
      return;
    }

    const { data: mem, error } = await supabase
      .from('clan_members')
      .select('role, clans(*)')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
      return;
    }

    if (!mem) {
      setClan(null);
      setMembers([]);
      setRequests([]);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const myClan = mem.clans as unknown as Clan;
    const admin = mem.role === 'admin';

    setClan(myClan);
    setIsAdmin(admin);

    const { data: ms } = await supabase
      .from('clan_members')
      .select('user_id, role, profiles(username, full_name)')
      .eq('clan_id', myClan.id);

    setMembers((ms ?? []) as unknown as Member[]);

    if (admin) {
      const { data: rs } = await supabase
        .from('join_requests')
        .select('id, message, profiles(username, full_name)')
        .eq('clan_id', myClan.id)
        .eq('status', 'pendiente');

      setRequests((rs ?? []) as unknown as JoinRequest[]);
    } else {
      setRequests([]);
    }

    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function createClan() {
    if (!session) {
      return;
    }

    if (!name) {
      Alert.alert('Falta el nombre', 'Ponle un nombre a tu clan.');
      return;
    }

    const max = parseInt(maxMembers, 10);

    if (isNaN(max) || max < 2 || max > 12) {
      Alert.alert('Cupos inválidos', 'El máximo de miembros debe estar entre 2 y 12.');
      return;
    }

    setBusy(true);

    const { error } = await supabase.from('clans').insert({
      name: name,
      description: description,
      city: city,
      rules: rules,
      max_members: max,
      created_by: session.user.id,
    });

    setBusy(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setName('');
      setDescription('');
      setCity('');
      setRules('');
      setMaxMembers('4');
      load();
    }
  }

  async function decide(requestId: string, status: 'aceptada' | 'rechazada') {
    const { error } = await supabase
      .from('join_requests')
      .update({ status: status })
      .eq('id', requestId);

    if (error) {
      Alert.alert('Error', error.message);
    }

    load();
  }

  async function doLeave() {
    if (!session || !clan) {
      return;
    }

    if (isAdmin) {
      if (members.length > 1) {
        Alert.alert(
          'No puedes salir',
          'Eres el admin y todavía hay más miembros. Por ahora el admin solo puede salir cuando es el único.'
        );
        return;
      }

      const { error } = await supabase.from('clans').delete().eq('id', clan.id);

      if (error) {
        Alert.alert('Error', error.message);
      }
    } else {
      const { error } = await supabase
        .from('clan_members')
        .delete()
        .eq('clan_id', clan.id)
        .eq('user_id', session.user.id);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        await supabase
          .from('join_requests')
          .delete()
          .eq('clan_id', clan.id)
          .eq('user_id', session.user.id);
      }
    }

    load();
  }

  function leaveClan() {
    Alert.alert('Salir del clan', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: doLeave },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!clan) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Crea tu clan</Text>
        <Text style={styles.sub}>
          Aún no estás en ningún clan. Crea el tuyo o pide unirte a uno desde Explorar.
        </Text>

        <Text style={styles.label}>Nombre del clan</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ej: Los Del Apto 302"
          placeholderTextColor="#888"
        />

        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="¿Cómo es tu casa y tu gente?"
          placeholderTextColor="#888"
        />

        <Text style={styles.label}>Ciudad</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="Ej: Cali"
          placeholderTextColor="#888"
        />

        <Text style={styles.label}>Reglas de la casa</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={rules}
          onChangeText={setRules}
          multiline
          placeholder="Ej: Silencio después de las 10pm"
          placeholderTextColor="#888"
        />

        <Text style={styles.label}>Máximo de miembros</Text>
        <TextInput
          style={styles.input}
          value={maxMembers}
          onChangeText={setMaxMembers}
          keyboardType="number-pad"
          placeholderTextColor="#888"
        />

        <Pressable style={styles.button} onPress={createClan} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Crear clan</Text>
          )}
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <Text style={styles.title}>{clan.name}</Text>
      <Text style={styles.sub}>
        {clan.city ?? 'Sin ciudad'} · {members.length}/{clan.max_members} miembros
      </Text>

      {clan.description ? <Text style={styles.text}>{clan.description}</Text> : null}

      {clan.rules ? (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Reglas de la casa</Text>
          <Text style={styles.text}>{clan.rules}</Text>
        </View>
      ) : null}

      <Text style={styles.section}>Roomies</Text>
      {members.map((m) => (
        <View key={m.user_id} style={styles.row}>
          <Text style={styles.text}>
            {m.profiles?.full_name || m.profiles?.username}
            {m.user_id === session?.user.id ? ' (tú)' : ''}
          </Text>
          {m.role === 'admin' ? <Text style={styles.badge}>admin</Text> : null}
        </View>
      ))}

      {isAdmin && (
        <>
          <Text style={styles.section}>Solicitudes pendientes</Text>
          {requests.length === 0 ? (
            <Text style={styles.sub}>No hay solicitudes por ahora.</Text>
          ) : (
            requests.map((r) => (
              <View key={r.id} style={styles.box}>
                <Text style={styles.boxTitle}>
                  {r.profiles?.full_name || r.profiles?.username}
                </Text>
                {r.message ? <Text style={styles.text}>{r.message}</Text> : null}
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.small, styles.accept]}
                    onPress={() => decide(r.id, 'aceptada')}
                  >
                    <Text style={styles.buttonText}>Aceptar</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.small, styles.reject]}
                    onPress={() => decide(r.id, 'rechazada')}
                  >
                    <Text style={styles.buttonText}>Rechazar</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </>
      )}
      {isAdmin && (
        <Pressable
          style={styles.button}
          onPress={() => router.push('/nuevo-cuarto')}
        >
          <Text style={styles.buttonText}>Publicar un cuarto</Text>
        </Pressable>
      )}
      <Pressable style={styles.leave} onPress={leaveClan}>
        <Text style={styles.leaveText}>Salir del clan</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#000' },
  content: { padding: 24, paddingBottom: 48, gap: 6 },
  center: { flex: 1, justifyContent: 'center', backgroundColor: '#000' },
  title: { fontSize: 28, fontWeight: '700', color: '#fff' },
  sub: { color: '#888', marginBottom: 8 },
  text: { color: '#ddd' },
  section: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 20, marginBottom: 6 },
  label: { color: '#aaa', marginTop: 10, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    backgroundColor: '#111',
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  box: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 14,
    padding: 14,
    gap: 6,
    marginTop: 8,
  },
  boxTitle: { color: '#fff', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  badge: { color: '#3b82f6', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  small: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  accept: { backgroundColor: '#16a34a' },
  reject: { backgroundColor: '#dc2626' },
  leave: { padding: 16, alignItems: 'center', marginTop: 24 },
  leaveText: { color: '#ef4444', fontWeight: '600' },
});