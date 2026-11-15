import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

type Conv = {
  chat_id: string;
  other_clan_id: string;
  other_clan_name: string;
  last_message: string | null;
  last_at: string;
};

export default function ClanChats() {
  const insets = useSafeAreaInsets();

  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('my_clan_chats');

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setConvs((data ?? []) as Conv[]);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Volver</Text>
      </Pressable>
      <Text style={styles.title}>Chats con otros clanes</Text>

      <FlatList
        data={convs}
        keyExtractor={(item) => item.chat_id}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
        contentContainerStyle={{ gap: 10, paddingVertical: 12 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Aún no has hablado con otros clanes. Entra a un clan desde Explorar y
            toca "Chatear con este clan".
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(('/clan-chat/' + item.chat_id) as any)}
          >
            <Text style={styles.name}>{item.other_clan_name}</Text>
            <Text style={styles.last} numberOfLines={1}>
              {item.last_message ?? 'Sin mensajes todavía'}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: 24 },
  center: { flex: 1, justifyContent: 'center', backgroundColor: '#000' },
  back: { color: '#3b82f6', fontSize: 16, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff' },
  empty: { color: '#888', textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  name: { color: '#fff', fontSize: 17, fontWeight: '700' },
  last: { color: '#888' },
});