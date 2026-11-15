import React from 'react';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConnectionBanner } from './components/ConnectionBanner';
import { AuthProvider, useAuth } from './lib/auth';
import { isSupabaseConfigured } from './lib/supabase';
import { AuthScreen } from './components/AuthScreen';
import { SetupNotice } from './components/SetupNotice';

const Splash: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-4 text-zinc-500 text-sm">
    <span className="text-2xl font-semibold text-white tracking-tight">Vanta</span>
    {children}
  </div>
);

const Gate: React.FC = () => {
  const { session, profile, booting, profileError, refreshProfile, signOut } = useAuth();

  if (booting) return <Splash>Cargando...</Splash>;
  if (!session) return <AuthScreen />;
  if (!profile) {
    return (
      <Splash>
        <p>{profileError ? 'No pudimos cargar tu perfil.' : 'Cargando perfil...'}</p>
        <div className="flex gap-2">
          <button onClick={refreshProfile} className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-semibold">
            Reintentar
          </button>
          <button onClick={signOut} className="px-4 py-1.5 rounded-full border border-white/15 text-xs text-zinc-300">
            Cerrar sesión
          </button>
        </div>
      </Splash>
    );
  }
  return <App key={profile.id} me={profile} onSignOut={signOut} onProfileUpdated={refreshProfile} />;
};

export default function Root() {
  if (!isSupabaseConfigured) return <SetupNotice />;
  return (
    <ErrorBoundary>
      <ConnectionBanner />
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ErrorBoundary>
  );
}
