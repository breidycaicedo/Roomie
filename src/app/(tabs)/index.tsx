import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';

type ClanCard = {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  max_members: number;
  member_count: number;
  my_request: string | null;
};

export default function Explorar() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const [clans, setClans] = useState<ClanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [inClan, setInClan] = useState(false);

  const load = useCallback(async () => {
    if (!session) {
      return;
    }

    const { data: mine } = await supabase
      .from('clan_members')
      .select('clan_id')
      .eq('user_id', session.user.id)
      .maybeSingle();

    setInClan(mine != null);

    const { data, error } = await supabase.rpc('explore_clans', { p_city: query });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setClans(data ?? []);
    }

    setLoading(false);
    setRefreshing(false);
  }, [session, query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function requestJoin(clanId: string) {
    if (!session) {
      return;
    }

    const { error } = await supabase
      .from('join_requests')
      .insert({ clan_id: clanId, user_id: session.user.id });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Listo', 'Solicitud enviada. El admin del clan la va a revisar.');
      load();
    }
  }

  function renderAction(c: ClanCard) {
    if (c.my_request === 'pendiente') {
      return <Text style={styles.status}>Solicitud enviada ⏳</Text>;
    }

    if (c.my_request === 'rechazada') {
      return <Text style={styles.statusBad}>Solicitud rechazada</Text>;
    }

    if (c.member_count >= c.max_members) {
      return <Text style={styles.statusBad}>Clan lleno</Text>;
    }

    if (inClan) {
      return null;
    }

    return (
      <Pressable style={styles.button} onPress={() => requestJoin(c.id)}>
        <Text style={styles.buttonText}>Solicitar unirme</Text>
      </Pressable>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title}>Explorar</Text>

      <TextInput
        style={styles.search}
        value={input}
        onChangeText={setInput}
        onSubmitEditing={() => setQuery(input)}
        placeholder="Buscar por ciudad (Enter para buscar)"
        placeholderTextColor="#888"
        returnKeyType="search"
      />

      {inClan && (
        <Text style={styles.banner}>
          Ya perteneces a un clan, así que no puedes solicitar otro.
        </Text>
      )}

      <FlatList
        data={clans}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay clanes abiertos por ahora.</Text>
        }
                renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(('/clan-perfil/' + item.id) as any)}
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>
              {item.city ?? 'Sin ciudad'} · {item.member_count}/{item.max_members} miembros
            </Text>
            {item.description ? (
              <Text style={styles.cardDesc}>{item.description}</Text>
            ) : null}
            {renderAction(item)}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: 24 },
  center: { flex: 1, justifyContent: 'center', backgroundColor: '#000' },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 12 },
  search: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    backgroundColor: '#111',
    marginBottom: 12,
  },
  banner: { color: '#f59e0b', marginBottom: 12 },
  empty: { color: '#888', textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cardMeta: { color: '#888' },
  cardDesc: { color: '#ccc', marginTop: 4 },
  button: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  status: { color: '#f59e0b', marginTop: 8 },
  statusBad: { color: '#ef4444', marginTop: 8 },
});