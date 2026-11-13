import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';

export default function Perfil() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [schedule, setSchedule] = useState('');
  const [smoker, setSmoker] = useState(false);
  const [hasPets, setHasPets] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!session) {
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) {
      Alert.alert('Error', error.message);
    } else if (data) {
      setUsername(data.username ?? '');
      setFullName(data.full_name ?? '');
      setBio(data.bio ?? '');
      setCity(data.city ?? '');
      setBudgetMin(data.budget_min != null ? String(data.budget_min) : '');
      setBudgetMax(data.budget_max != null ? String(data.budget_max) : '');
      setSchedule(data.schedule ?? '');
      setSmoker(data.smoker);
      setHasPets(data.has_pets);
    }

    setLoading(false);
  }, [session]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function toNumber(value: string): number | null {
    const n = parseInt(value, 10);
    if (isNaN(n)) {
      return null;
    }
    return n;
  }

  async function saveProfile() {
    if (!session) {
      return;
    }

    if (!username) {
      Alert.alert('Falta el usuario', 'El nombre de usuario es obligatorio.');
      return;
    }

    const min = toNumber(budgetMin);
    const max = toNumber(budgetMax);

    if (min != null && max != null && min > max) {
      Alert.alert('Presupuesto inválido', 'El mínimo no puede ser mayor que el máximo.');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        username: username,
        full_name: fullName,
        bio: bio,
        city: city,
        budget_min: min,
        budget_max: max,
        schedule: schedule,
        smoker: smoker,
        has_pets: hasPets,
      })
      .eq('id', session.user.id);

    setSaving(false);

    if (error) {
      if (error.code === '23505') {
        Alert.alert('Usuario ocupado', 'Ese nombre de usuario ya existe, prueba con otro.');
      } else {
        Alert.alert('Error', error.message);
      }
    } else {
      Alert.alert('Listo', 'Perfil actualizado.');
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Mi perfil</Text>
      <Text style={styles.email}>{session?.user.email}</Text>

      <Text style={styles.label}>Usuario</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>Nombre completo</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>Sobre mí</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={bio}
        onChangeText={setBio}
        multiline
        placeholder="Cuéntales a tus futuros roomies cómo eres"
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

      <Text style={styles.label}>Presupuesto mensual (COP)</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.half]}
          value={budgetMin}
          onChangeText={setBudgetMin}
          keyboardType="number-pad"
          placeholder="Mínimo"
          placeholderTextColor="#888"
        />
        <TextInput
          style={[styles.input, styles.half]}
          value={budgetMax}
          onChangeText={setBudgetMax}
          keyboardType="number-pad"
          placeholder="Máximo"
          placeholderTextColor="#888"
        />
      </View>

      <Text style={styles.label}>Horario</Text>
      <TextInput
        style={styles.input}
        value={schedule}
        onChangeText={setSchedule}
        placeholder="Ej: Madrugador, estudio de noche..."
        placeholderTextColor="#888"
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>Fumo</Text>
        <Switch value={smoker} onValueChange={setSmoker} />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>Tengo mascotas</Text>
        <Switch value={hasPets} onValueChange={setHasPets} />
      </View>

      <Pressable style={styles.button} onPress={saveProfile} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Guardar cambios</Text>
        )}
      </Pressable>

      <Pressable style={styles.logout} onPress={signOut}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#000' },
  content: { padding: 24, paddingBottom: 48, gap: 6 },
  center: { flex: 1, justifyContent: 'center', backgroundColor: '#000' },
  title: { fontSize: 28, fontWeight: '700', color: '#fff' },
  email: { color: '#888', marginBottom: 12 },
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
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  switchText: { color: '#fff', fontSize: 16 },
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  logout: { padding: 16, alignItems: 'center', marginTop: 4 },
  logoutText: { color: '#ef4444', fontWeight: '600' },
});
