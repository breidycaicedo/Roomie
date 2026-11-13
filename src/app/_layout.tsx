import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AuthGate from '../components/AuthGate';
import { AuthProvider } from '../components/AuthProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGate>
    </AuthProvider>
  );
}