import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../src/auth/AuthProvider';
export default function Index() {
  const { session, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#a78bfa" /></View>;
  return <Redirect href={session ? '/(tabs)' : '/login'} />;
}
