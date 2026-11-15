import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
const tint = '#c4b5fd';
export default function TabsLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: '#101014', borderTopColor: '#27272a', height: 62, paddingTop: 7, paddingBottom: 7 }, tabBarActiveTintColor: tint, tabBarInactiveTintColor: '#71717a', tabBarLabelStyle: { fontSize: 10, fontWeight: '700' } }}>
    <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="clips" options={{ title: 'Clips', tabBarIcon: ({ color, size }) => <Ionicons name="play-circle-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="explore" options={{ title: 'Explorar', tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="create" options={{ title: 'Crear', tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" color={color} size={size + 4} /> }} />
    <Tabs.Screen name="activity" options={{ title: 'Actividad', tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} /> }} />
  </Tabs>;
}
