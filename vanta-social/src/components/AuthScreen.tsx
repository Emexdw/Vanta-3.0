import React, { useState } from 'react';
import { useAuth } from '../lib/auth';

type Mode = 'login' | 'register' | 'verify';

const inputClass =
  'w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-colors';

export const AuthScreen: React.FC = () => {
  const { signIn, signUp, verifyEmailCode, resendEmailCode } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (mode === 'register' && password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'verify') {
        await verifyEmailCode(email, code);
        setInfo('Correo verificado correctamente.');
        setMode('login');
      } else if (mode === 'login') {
        await signIn(email, password);
      } else {
        const { needsConfirmation } = await signUp({ email, password, username, displayName });
        if (needsConfirmation) {
          setInfo('Ingresá el código de 6 dígitos que enviamos a tu correo.');
          setMode('verify');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="" className="w-24 h-24 mx-auto mb-4" /><h1 className="text-4xl font-semibold tracking-tight text-white">Vanta</h1>
          <p className="text-sm text-zinc-500 mt-2">Fotos y clips, sin ruido.</p>
        </div>

        <div className="bg-[#111115] border border-white/10 rounded-2xl p-5">
          {mode === 'verify' && <p className="text-sm text-zinc-300 mb-4">Verificá tu correo: <strong>{email}</strong></p>}
          <div className="flex bg-[#18181b] p-1 rounded-full border border-white/[0.08] mb-5">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                aria-pressed={mode === m}
                className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all ${
                  mode === m ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'verify' && <>
              <input className={inputClass} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="Código de 6 dígitos" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
              <button type="button" disabled={busy} className="text-xs text-violet-300 underline" onClick={async () => { setBusy(true); setError(null); setInfo(null); try { await resendEmailCode(email); setInfo('Código reenviado. Revisá tu correo.'); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo reenviar.'); } finally { setBusy(false); } }}>Reenviar código</button>
            </>}
            {mode === 'verify' && <input className={inputClass} type="email" aria-label="Correo a verificar" value={email} onChange={e=>setEmail(e.target.value)} required />}
            {mode !== 'verify' && <>
            {mode === 'register' && (
              <>
                <input
                  className={inputClass}
                  placeholder="Nombre"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                  autoComplete="name"
                />
                <input
                  className={inputClass}
                  placeholder="Usuario (ej. luna.rivera)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                  maxLength={24}
                  required
                  autoComplete="username"
                />
              </>
            )}
            <input
              className={inputClass}
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              className={inputClass}
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />

            </>}
            {error && (
              <p role="alert" className="text-xs text-rose-400">
                {error}
              </p>
            )}
            {info && <p className="text-xs text-emerald-400">{info}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all"
            >
              {busy ? 'Un momento...' : mode === 'login' ? 'Entrar' : mode === 'verify' ? 'Verificar correo' : 'Crear cuenta'}
            </button>
          </form>
          {mode === "login" && <button type="button" disabled={busy} className="mt-4 text-sm text-violet-300" onClick={()=>{setMode("verify");setError(null);setInfo(null);}}>Ya tengo un código de verificación</button>}
        </div>

        {mode === 'register' && (
          <p className="text-[11px] text-zinc-600 text-center mt-4 leading-relaxed">
            Al crear una cuenta aceptás los términos y la política de privacidad de Vanta.
          </p>
        )}
      </div>
    </div>
  );
};
