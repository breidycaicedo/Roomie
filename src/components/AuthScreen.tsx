import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (!email || !password || (isSignUp && !username)) {
      Alert.alert('Faltan datos', 'Completa todos los campos.');
      return;
    }

    setBusy(true);

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { username: username, full_name: fullName },
        },
      });

      if (error) {
        Alert.alert('Error al registrarte', error.message);
      } else if (!data.session) {
        Alert.alert('Revisa tu correo', 'Te enviamos un link para confirmar tu cuenta.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        Alert.alert('Error al iniciar sesión', error.message);
      }
    }

    setBusy(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Roomie</Text>
      <Text style={styles.subtitle}>
        {isSignUp ? 'Crea tu cuenta' : 'Inicia sesión'}
      </Text>

      {isSignUp && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Nombre de usuario"
            placeholderTextColor="#888"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Nombre completo"
            placeholderTextColor="#888"
            value={fullName}
            onChangeText={setFullName}
          />
        </>
      )}

      <TextInput
        style={styles.input}
        placeholder="Correo"
        placeholderTextColor="#888"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.button} onPress={handleSubmit} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {isSignUp ? 'Registrarme' : 'Entrar'}
          </Text>
        )}
      </Pressable>

      <Pressable onPress={() => setIsSignUp(!isSignUp)}>
        <Text style={styles.link}>
          {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#000',
  },
  title: { fontSize: 40, fontWeight: '700', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 18, color: '#aaa', textAlign: 'center', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    backgroundColor: '#111',
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { color: '#3b82f6', textAlign: 'center', marginTop: 12 },
});