import { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from './AuthProvider';
import AuthScreen from './AuthScreen';

export default function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return <>{children}</>;
}