import * as drafts from '../lib/drafts';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, ImagePlus, Film } from 'lucide-react';
import { useModalBehavior } from '../hooks/useModalBehavior';

export type CreateType = 'post' | 'clip' | 'story';

export interface CreateInput {
  type: CreateType;
  files: File[];
  caption: string;
  location: string;
  sound: string;
}

interface CrearModalProps {
  initialType: CreateType;
  userId: string;
  onClose: () => void;
  onPublish: (input: CreateInput) => Promise<void>;
}

const TYPE_LABELS: Record<CreateType, string> = { post: 'Publicación', clip: 'Clip', story: 'Historia' };
const MAX_IMAGES = 10;
const MAX_IMAGE_MB = 20;
const MAX_VIDEO_MB = 50;

const field =
  'w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-colors';

export const CrearModal: React.FC<CrearModalProps> = ({ initialType, userId, onClose, onPublish }) => {
  const [type, setType] = useState<CreateType>(initialType);
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [sound, setSound] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useModalBehavior(onClose, !busy);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const draftKey = `vanta:draft:${userId}:${type}`;
  const saveDraft = async () => {setBusy(true);try {await drafts.saveDraft(draftKey,{caption,location,sound,files});setError('Borrador guardado en este dispositivo.');}catch{setError('No se pudo guardar el borrador.');}finally{setBusy(false);}};
  const loadDraft = async () => {setBusy(true);try {const d=await drafts.loadDraft(draftKey) || JSON.parse(localStorage.getItem(draftKey)||'null');if(!d){setError('No hay borrador');return;}setCaption(d.caption||'');setLocation(d.location||'');setSound(d.sound||'');setFiles(d.files||[]);setError(null);}catch{setError('No se pudo abrir el borrador');}finally{setBusy(false);}};
  const maxFiles = type === 'post' ? MAX_IMAGES : 1;

  const changeType = (next: CreateType) => {
    if (busy) return;
    setType(next);
    setFiles([]);
    setError(null);
  };

  const pickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    setError(null);
    const wanted = type === 'clip' ? 'video/' : 'image/';
    const valid = picked.filter((f) => f.type.startsWith(wanted));
    if (valid.length !== picked.length) setError(type === 'clip' ? 'Elegí un archivo de video.' : 'Elegí archivos de imagen.');
    const limitMb = type === 'clip' ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    const sized = valid.filter((f) => f.size <= limitMb * 1024 * 1024);
    if (sized.length !== valid.length) setError(`Cada archivo debe pesar menos de ${limitMb} MB.`);
    setFiles((prev) => (type === 'post' ? [...prev, ...sized] : sized).slice(0, maxFiles));
  };

  const publish = async () => {
    if (files.length === 0) return setError(type === 'clip' ? 'Elegí un video.' : 'Elegí al menos una imagen.');
    setBusy(true);
    setError(null);
    try {
      await onPublish({ type, files, caption: caption.trim(), location: location.trim(), sound: sound.trim() });
      try {await drafts.deleteDraft(draftKey);localStorage.removeItem(draftKey);} catch {}
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar. Probá de nuevo.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => !busy && onClose()}>
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Crear"
        className="w-full max-w-md max-h-[92vh] overflow-y-auto no-scrollbar bg-[#111115] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#111115]/95 backdrop-blur-xl border-b border-white/[0.08]">
          <button onClick={onClose} disabled={busy} aria-label="Cerrar" className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold text-white">Crear {TYPE_LABELS[type].toLowerCase()}</h2>
          <button
            onClick={publish}
            disabled={busy || files.length === 0}
            className="px-3.5 py-1.5 rounded-full bg-white text-black text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-200 active:scale-95 transition-all"
          >
            {busy ? 'Subiendo...' : 'Publicar'}
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex gap-2"><button type="button" disabled={busy} onClick={saveDraft} className="flex-1 rounded-xl bg-zinc-800 p-2 text-xs">Guardar borrador</button><button type="button" disabled={busy} onClick={loadDraft} className="flex-1 rounded-xl bg-zinc-800 p-2 text-xs">Recuperar borrador</button></div>
          <div className="flex bg-[#18181b] p-1 rounded-full border border-white/[0.08]">
            {(Object.keys(TYPE_LABELS) as CreateType[]).map((t) => (
              <button
                key={t}
                onClick={() => changeType(t)}
                aria-pressed={type === t}
                className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all ${
                  type === t ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <input ref={fileRef} type="file" accept={type === 'clip' ? 'video/*' : 'image/*'} multiple={type === 'post'} onChange={pickFiles} className="hidden" />

          {files.length > 0 && type === 'clip' && (
            <video src={previews[0]} muted playsInline loop autoPlay className="w-full max-h-72 rounded-xl bg-black object-contain border border-white/10" />
          )}

          {files.length > 0 && type !== 'clip' && (
            <div className="grid grid-cols-4 gap-2">
              {previews.map((url, idx) => (
                <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-white/10">
                  <img src={url} alt={`Seleccionada ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={busy}
                    aria-label="Quitar imagen"
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy || (type !== 'clip' && files.length >= maxFiles)}
            className="w-full py-6 rounded-xl border border-dashed border-white/20 hover:border-white/40 text-zinc-300 flex flex-col items-center gap-1.5 disabled:opacity-40 transition-colors"
          >
            {type === 'clip' ? <Film className="w-6 h-6" /> : <ImagePlus className="w-6 h-6" />}
            <span className="text-xs font-medium">
              {type === 'clip'
                ? files.length ? 'Cambiar video' : `Elegir un video (hasta ${MAX_VIDEO_MB} MB)`
                : type === 'post'
                  ? `Elegir imágenes (${files.length}/${MAX_IMAGES})`
                  : files.length ? 'Cambiar imagen' : 'Elegir una imagen'}
            </span>
          </button>

          <div className="space-y-2.5">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={type === 'story' ? 200 : 500}
              rows={3}
              placeholder={type === 'story' ? 'Texto de la historia (opcional)' : 'Escribí un pie de foto. Usá #etiquetas'}
              className={`${field} resize-none`}
            />
            {type === 'post' && <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={60} placeholder="Ubicación (opcional)" className={field} />}
            {type !== 'post' && <input value={sound} onChange={(e) => setSound(e.target.value)} maxLength={60} placeholder="Título del sonido (opcional)" className={field} />}
          </div>

          {busy && <p className="text-xs text-zinc-400">Subiendo tu contenido, no cierres esta ventana...</p>}
          {error && (
            <p role="alert" className="text-xs text-rose-400">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
