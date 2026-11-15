import React from 'react';

export const SetupNotice: React.FC = () => (
  <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6">
    <div className="max-w-md w-full bg-[#111115] border border-white/10 rounded-2xl p-6 space-y-4">
      <h1 className="text-xl font-semibold">Falta conectar Vanta a Supabase</h1>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Creá un archivo <code className="text-zinc-200">.env</code> en la raíz del proyecto con estas dos variables y
        reiniciá <code className="text-zinc-200">npm run dev</code>:
      </p>
      <pre className="text-xs bg-black/50 border border-white/10 rounded-xl p-3 overflow-x-auto text-zinc-300">
{`VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key`}
      </pre>
      <p className="text-xs text-zinc-500">
        Los pasos completos (crear el proyecto y ejecutar <code>supabase/schema.sql</code>) están en el README.
      </p>
    </div>
  </div>
);
