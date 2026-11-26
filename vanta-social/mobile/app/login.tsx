import { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native';
import { useAuth } from '../src/auth/AuthProvider';
import { isSupabaseConfigured } from '../src/lib/supabase';

export default function LoginScreen() {
  const { signIn, signUp, verifyEmailCode, resendEmailCode } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'verify'>('login');
  const [code,setCode]=useState('');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [username, setUsername] = useState(''); const [displayName, setDisplayName] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!isSupabaseConfigured) { Alert.alert('Falta configurar Supabase', 'Copiá mobile/.env.example a mobile/.env y completá las credenciales.'); return; }
    setBusy(true);
    try {
      if (mode === 'login') await signIn(email, password);
      else if (mode === 'verify') await verifyEmailCode(email, code);
      else { if(password.length < 8) throw new Error('Usá al menos 8 caracteres.'); const confirmation = await signUp(email, password, username, displayName); if (confirmation) setMode('verify'); }
    } catch (e) { Alert.alert('No se pudo continuar', e instanceof Error ? e.message : 'Intentá nuevamente.'); }
    finally { setBusy(false); }
  };
  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
    <View style={s.logoMark}><Image source={require("../assets/icon.png")} style={{width:96,height:96,marginBottom:12}} /><Text style={s.logo}>VANTA</Text><Text style={s.tag}>YOUR WORLD. YOUR FRAME.</Text></View>
    <View style={s.panel}><Text style={s.heading}>{mode === 'login' ? 'Volvé a conectar.' : 'Creá tu espacio.'}</Text><Text style={s.sub}>{mode === 'login' ? 'Entrá a tu mundo.' : 'Un lugar para compartir lo que sos.'}</Text>
      {mode === 'signup' && <><TextInput style={s.input} placeholder="Nombre para mostrar" placeholderTextColor="#71717a" value={displayName} onChangeText={setDisplayName} /><TextInput style={s.input} placeholder="Nombre de usuario" placeholderTextColor="#71717a" autoCapitalize="none" value={username} onChangeText={setUsername} /></>}
      <TextInput style={s.input} placeholder="Correo electrónico" placeholderTextColor="#71717a" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      {mode === "verify" ? <><TextInput style={s.input} placeholder="Código de 6 dígitos" placeholderTextColor="#71717a" keyboardType="number-pad" maxLength={6} value={code} onChangeText={v=>setCode(v.replace(/\D/g,""))}/><Pressable disabled={busy} onPress={async()=>{setBusy(true);try{await resendEmailCode(email);Alert.alert("Código solicitado");}catch(e){Alert.alert("Error",String(e));}finally{setBusy(false);}}}><Text style={s.switch}>Reenviar código</Text></Pressable></> : <TextInput style={s.input} placeholder="Contraseña" placeholderTextColor="#71717a" secureTextEntry value={password} onChangeText={setPassword} />}
      <Pressable style={[s.primary, busy && { opacity: .65 }]} onPress={submit} disabled={busy}>{busy ? <ActivityIndicator color="#09090b" /> : <Text style={s.primaryText}>{mode === 'login' ? 'Iniciar sesión' : mode === 'verify' ? 'Verificar correo' : 'Crear cuenta'}</Text>}</Pressable>
      {mode === "login" && <Pressable onPress={()=>setMode("verify")}><Text style={s.switch}>Ya tengo un código</Text></Pressable>}
      <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}><Text style={s.switch}>{mode === 'login' ? '¿No tenés cuenta? ' : '¿Ya tenés cuenta? '}<Text style={{ color: '#c4b5fd', fontWeight: '800' }}>{mode === 'login' ? 'Registrate' : 'Iniciá sesión'}</Text></Text></Pressable>
    </View><Text style={s.foot}>Al continuar aceptás las normas de convivencia y la política de privacidad de VANTA.</Text>
  </ScrollView></KeyboardAvoidingView>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: '#09090b' }, wrap: { flexGrow: 1, justifyContent: 'center', padding: 24 }, logoMark: { alignItems: 'center', marginBottom: 42 }, logo: { color: '#fafafa', fontSize: 42, fontWeight: '900', letterSpacing: 9 }, tag: { color: '#71717a', fontSize: 9, letterSpacing: 4, marginTop: 7 }, panel: { backgroundColor: '#111114', borderColor: '#27272a', borderWidth: 1, borderRadius: 22, padding: 22 }, heading: { color: '#fafafa', fontSize: 25, fontWeight: '800' }, sub: { color: '#a1a1aa', marginTop: 7, marginBottom: 24 }, input: { backgroundColor: '#09090b', color: '#fafafa', borderColor: '#303036', borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 15, marginBottom: 12 }, primary: { backgroundColor: '#c4b5fd', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 7 }, primaryText: { color: '#09090b', fontWeight: '900' }, switch: { color: '#a1a1aa', textAlign: 'center', marginTop: 22 }, foot: { color: '#52525b', textAlign: 'center', fontSize: 11, lineHeight: 17, marginTop: 22 } });
