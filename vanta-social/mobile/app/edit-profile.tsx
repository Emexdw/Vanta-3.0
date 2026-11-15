import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../src/auth/AuthProvider';
import { supabase } from '../src/lib/supabase';

const COLORS = ['#8b5cf6', '#ec4899', '#38bdf8', '#22c55e', '#f97316', '#fafafa'];

export default function EditProfileScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [banner, setBanner] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile?.display_name || '');
    setBio(profile?.bio || '');
    setBanner(profile?.banner_url || '');
    setColor(profile?.theme_color || COLORS[0]);
  }, [profile?.id]);

  const save = async () => {
    if (!session?.user.id || saving) return;
    const displayName = name.trim();
    const about = bio.trim();
    const bannerUrl = banner.trim();
    if (!displayName || displayName.length > 50) {
      Alert.alert('Nombre no válido', 'Ingresá un nombre de entre 1 y 50 caracteres.'); return;
    }
    if (about.length > 160) {
      Alert.alert('Biografía demasiado larga', 'La biografía admite hasta 160 caracteres.'); return;
    }
    if (bannerUrl && (!/^https:\/\//i.test(bannerUrl) || bannerUrl.length > 2048)) {
      Alert.alert('Portada no válida', 'Usá una URL HTTPS de imagen de hasta 2048 caracteres.'); return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        display_name: displayName,
        bio: about,
        banner_url: bannerUrl,
        theme_color: color
      }).eq('id', session.user.id);
      if (error) throw error;
      await refreshProfile();
      router.back();
    } catch (error) {
      Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Intentá nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} accessibilityRole="button"><Text style={styles.back}>‹ Volver</Text></Pressable>
          <Text style={styles.title}>Editar perfil</Text>
        </View>
        <View style={[styles.banner, { backgroundColor: color }]}>
          {banner.trim().startsWith('https://') && <Image source={{ uri: banner.trim() }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />}
        </View>
        <Text style={styles.label}>Nombre para mostrar</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={50} placeholder="Tu nombre" placeholderTextColor="#71717a" accessibilityLabel="Nombre para mostrar" />
        <Text style={styles.label}>Biografía · {bio.length}/160</Text>
        <TextInput style={[styles.input, styles.multiline]} value={bio} onChangeText={setBio} maxLength={160} multiline placeholder="Contá algo sobre vos" placeholderTextColor="#71717a" accessibilityLabel="Biografía" />
        <Text style={styles.label}>URL de portada (HTTPS)</Text>
        <TextInput style={styles.input} value={banner} onChangeText={setBanner} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://ejemplo.com/portada.jpg" placeholderTextColor="#71717a" accessibilityLabel="URL de portada" />
        <Text style={styles.hint}>En móvil podés usar una imagen alojada en HTTPS. Desde VANTA web también podés subir una portada.</Text>
        <Text style={styles.label}>Color del perfil</Text>
        <View style={styles.colors}>
          {COLORS.map((item) => <Pressable key={item} onPress={() => setColor(item)} accessibilityRole="radio" accessibilityState={{ selected: item === color }}
            accessibilityLabel={`Elegir color ${item}`} style={[styles.swatch, { backgroundColor: item }, item === color && styles.selected]} />)}
        </View>
        <Pressable style={[styles.save, saving && { opacity: 0.6 }]} onPress={save} disabled={saving} accessibilityRole="button">
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Guardar cambios</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#09090b' },
  body: { padding: 20, paddingTop: 56, paddingBottom: 64 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 22 },
  back: { color: '#c4b5fd', fontSize: 16 },
  title: { color: '#fafafa', fontSize: 23, fontWeight: '800' },
  banner: { height: 150, borderRadius: 18, overflow: 'hidden', marginBottom: 22 },
  label: { color: '#e4e4e7', fontWeight: '600', fontSize: 14, marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#18181b', borderColor: '#3f3f46', borderWidth: 1, borderRadius: 12, padding: 14, color: '#fafafa', fontSize: 15 },
  multiline: { height: 104, textAlignVertical: 'top' },
  hint: { color: '#a1a1aa', fontSize: 12, lineHeight: 18, marginTop: 8 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginVertical: 16 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#27272a' },
  selected: { borderColor: '#fff', borderWidth: 4 },
  save: { backgroundColor: '#7c3aed', padding: 17, borderRadius: 14, alignItems: 'center', marginTop: 18 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});
