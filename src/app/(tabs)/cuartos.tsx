import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

type Listing = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  city: string | null;
  neighborhood: string | null;
  photos: string[];
  available_from: string | null;
  clans: any;
};

function formatPrice(n: number): string {
  return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export default function Cuartos() {
  const insets = useSafeAreaInsets();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('listings')
      .select(
        'id, title, description, price, city, neighborhood, photos, available_from, clans(name)'
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setListings((data ?? []) as unknown as Listing[]);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function clanName(l: Listing): string {
    const c = Array.isArray(l.clans) ? l.clans[0] : l.clans;
    return c?.name ?? 'Clan';
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
      <Text style={styles.title}>Cuartos disponibles</Text>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
        contentContainerStyle={{ gap: 14, paddingBottom: 24 }}
        ListEmptyComponent={
          <Text style={styles.empty}>Todavía no hay cuartos publicados.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.photos.length > 0 ? (
              <Image source={{ uri: item.photos[0] }} style={styles.cover} />
            ) : null}
            <View style={styles.body}>
              <Text style={styles.price}>{formatPrice(item.price)} / mes</Text>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.meta}>
                {[item.neighborhood, item.city].filter((x) => x).join(', ') ||
                  'Sin ubicación'}
              </Text>
              <Text style={styles.meta}>Clan: {clanName(item)}</Text>
              {item.available_from ? (
                <Text style={styles.meta}>Disponible desde {item.available_from}</Text>
              ) : null}
              {item.description ? (
                <Text style={styles.desc}>{item.description}</Text>
              ) : null}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: 24 },
  center: { flex: 1, justifyContent: 'center', backgroundColor: '#000' },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 12 },
  empty: { color: '#888', textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 16,
    overflow: 'hidden',
  },
  cover: { width: '100%', height: 180 },
  body: { padding: 14, gap: 4 },
  price: { color: '#3b82f6', fontSize: 18, fontWeight: '700' },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  meta: { color: '#888' },
  desc: { color: '#ccc', marginTop: 4 },
});