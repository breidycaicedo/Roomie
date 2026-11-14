import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabase';

const MAX_PHOTOS = 5;

export default function NuevoCuarto() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function pickPhotos() {
    const remaining = MAX_PHOTOS - photos.length;

    if (remaining <= 0) {
      Alert.alert('Máximo de fotos', 'Puedes subir hasta ' + MAX_PHOTOS + ' fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
    });

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setPhotos([...photos, ...uris].slice(0, MAX_PHOTOS));
    }
  }

  function removePhoto(uri: string) {
    setPhotos(photos.filter((p) => p !== uri));
  }

  async function uploadPhoto(uri: string, userId: string): Promise<string | null> {
    const res = await fetch(uri);
    const buffer = await res.arrayBuffer();
    const path =
      userId + '/' + Date.now() + '_' + Math.floor(Math.random() * 100000) + '.jpg';

    const { error } = await supabase.storage
      .from('listing-photos')
      .upload(path, buffer, { contentType: 'image/jpeg' });

    if (error) {
      Alert.alert('Error subiendo foto', error.message);
      return null;
    }

    const { data } = supabase.storage.from('listing-photos').getPublicUrl(path);
    return data.publicUrl;
  }

  async function publish() {
    if (!session) {
      return;
    }

    if (!title) {
      Alert.alert('Falta el título', 'Ponle un título al cuarto.');
      return;
    }

    const priceNumber = parseInt(price, 10);

    if (isNaN(priceNumber) || priceNumber < 0) {
      Alert.alert('Precio inválido', 'Escribe el precio mensual en números.');
      return;
    }

    if (availableFrom && !/^\d{4}-\d{2}-\d{2}$/.test(availableFrom)) {
      Alert.alert('Fecha inválida', 'Usa el formato AAAA-MM-DD, por ejemplo 2026-12-01.');
      return;
    }

    setBusy(true);

    const { data: mem, error: memError } = await supabase
      .from('clan_members')
      .select('clan_id, role')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (memError || !mem || mem.role !== 'admin') {
      setBusy(false);
      Alert.alert('Sin permiso', 'Solo el admin de un clan puede publicar cuartos.');
      return;
    }

    const urls: string[] = [];

    for (let i = 0; i < photos.length; i++) {
      const url = await uploadPhoto(photos[i], session.user.id);

      if (url == null) {
        setBusy(false);
        return;
      }

      urls.push(url);
    }

    const { error } = await supabase.from('listings').insert({
      clan_id: mem.clan_id,
      title: title,
      description: description,
      price: priceNumber,
      city: city,
      neighborhood: neighborhood,
      photos: urls,
      available_from: availableFrom ? availableFrom : null,
      created_by: session.user.id,
    });

    setBusy(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Listo', 'Tu cuarto ya está publicado.');
      router.back();
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Volver</Text>
      </Pressable>

      <Text style={styles.title}>Publicar un cuarto</Text>

      <Text style={styles.label}>Título</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Ej: Cuarto amplio con baño propio"
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>Descripción</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Servicios incluidos, tipo de cama, reglas..."
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>Precio mensual (COP)</Text>
      <TextInput
        style={styles.input}
        value={price}
        onChangeText={setPrice}
        keyboardType="number-pad"
        placeholder="Ej: 650000"
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

      <Text style={styles.label}>Barrio</Text>
      <TextInput
        style={styles.input}
        value={neighborhood}
        onChangeText={setNeighborhood}
        placeholder="Ej: Pance"
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>Disponible desde (opcional)</Text>
      <TextInput
        style={styles.input}
        value={availableFrom}
        onChangeText={setAvailableFrom}
        placeholder="AAAA-MM-DD"
        placeholderTextColor="#888"
        autoCapitalize="none"
      />

      <Text style={styles.label}>
        Fotos ({photos.length}/{MAX_PHOTOS})
      </Text>
      <View style={styles.photos}>
        {photos.map((uri) => (
          <Pressable key={uri} onPress={() => removePhoto(uri)}>
            <Image source={{ uri: uri }} style={styles.photo} />
            <Text style={styles.remove}>Quitar</Text>
          </Pressable>
        ))}
        {photos.length < MAX_PHOTOS && (
          <Pressable style={styles.add} onPress={pickPhotos}>
            <Text style={styles.addText}>+</Text>
          </Pressable>
        )}
      </View>

      <Pressable style={styles.button} onPress={publish} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Publicar</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#000' },
  content: { padding: 24, paddingBottom: 48, gap: 6 },
  back: { color: '#3b82f6', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 8 },
  label: { color: '#aaa', marginTop: 10, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    backgroundColor: '#111',
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { width: 90, height: 90, borderRadius: 12 },
  remove: { color: '#ef4444', fontSize: 12, textAlign: 'center', marginTop: 2 },
  add: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addText: { color: '#3b82f6', fontSize: 32 },
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});