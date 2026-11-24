import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Palette } from 'lucide-react';
import { User } from '../types';
import * as api from '../lib/api';
import { compressImage } from '../utils/media';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface EditProfileModalProps {
  me: User;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

const field =
  'w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-colors';

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ me, onClose, onSaved, onDeleteAccount }) => {
  const [displayName, setDisplayName] = useState(me.displayName);
  const [username, setUsername] = useState(me.username);
  const [bio, setBio] = useState(me.bio);
  const [location, setLocation] = useState(me.location ?? '');
  const [themeColor, setThemeColor] = useState(me.themeColor || '#8b5cf6');
  const [websiteUrl, setWebsiteUrl] = useState(me.websiteUrl || '');
  const [profileStyle, setProfileStyle] = useState(me.profileStyle || 'classic');
  const [bannerStyle, setBannerStyle] = useState(me.bannerStyle || 'aurora');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState(me.bannerUrl || '');
  const bannerRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(me.avatar);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [blocked, setBlocked] = useState<User[]>([]);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  useModalBehavior(onClose, !deleting);

  useEffect(() => {
    api.fetchBlocked(me.id).then(setBlocked).catch(() => {});
  }, [me.id]);

  const unblock = async (user: User) => {
    try {
      await api.unblockUser(me.id, user.id);
      setBlocked((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo desbloquear.');
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onDeleteAccount();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la cuenta.');
      setDeleting(false);
    }
  };

  const pickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Elegí un archivo de imagen.');
    setError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const pickBanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError('La portada debe ser JPG, PNG o WebP de hasta 10 MB.');
      return;
    }
    setError(null);
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[a-z0-9_.]{3,24}$/.test(username)) {
      return setError('Usuario: 3 a 24 caracteres (minúsculas, números, punto o guion bajo).');
    }
    const link = websiteUrl.trim();
    if (link && (!/^https:\/\//i.test(link) || link.length > 200)) return setError('El enlace debe comenzar con https:// y tener como máximo 200 caracteres.');
    setBusy(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarFile) {
        const blob = await compressImage(avatarFile, 512, 0.85);
        avatarUrl = await api.uploadMedia(me.id, blob, 'jpg', 'image/jpeg');
      }
      let bannerUrl: string | undefined;
      if (bannerFile) {
        const blob = await compressImage(bannerFile, 1600, 0.82);
        bannerUrl = await api.uploadMedia(me.id, blob, 'jpg', 'image/jpeg');
      }
      await api.updateProfile(me.id, {
        username,
        displayName: displayName.trim() || username,
        bio: bio.trim(),
        location: location.trim(),
        avatarUrl,
        bannerUrl,
        themeColor,
        websiteUrl: link,
        profileStyle,
        bannerStyle
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el perfil.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Editar perfil"
        className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#111115] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Editar perfil</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <section aria-label="Personalización del perfil" className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300"><Palette className="w-4 h-4" /> Personalización</div>
          <button type="button" onClick={() => bannerRef.current?.click()} aria-label="Cambiar portada" className="relative w-full h-28 rounded-2xl overflow-hidden border border-white/10 bg-zinc-800">
            {bannerPreview ? <img src={bannerPreview} alt="Vista previa de portada" className="w-full h-full object-cover" /> : <div className="w-full h-full" style={{ background: `linear-gradient(120deg, ${themeColor}, #111115 85%)` }} />}
            <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white">Cambiar portada</span>
          </button>
          <input ref={bannerRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickBanner} className="hidden" />
          <p className="text-[11px] text-zinc-500">Portada horizontal · JPG, PNG o WebP · máximo 10 MB</p>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Color del perfil">
            {['#8b5cf6', '#ec4899', '#06b6d4', '#22c55e', '#f97316', '#e5e7eb'].map((color) => (
              <button type="button" key={color} aria-label={`Elegir color ${color}`} aria-pressed={themeColor === color} onClick={() => setThemeColor(color)}
                className={`w-9 h-9 rounded-full border-2 ${themeColor === color ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: color }} />
            ))}
          </div>
          <div className="space-y-2 pt-2">
            <label htmlFor="profile-style" className="text-xs font-semibold text-zinc-300">Diseño del perfil</label>
            <select id="profile-style" className={field} value={profileStyle} onChange={e => setProfileStyle(e.target.value as typeof profileStyle)}>
              <option value="classic">Clásico</option><option value="compact">Compacto</option><option value="spotlight">Destacado</option>
            </select>
            <label htmlFor="banner-style" className="block text-xs font-semibold text-zinc-300">Fondo de portada (sin imagen)</label>
            <select id="banner-style" className={field} value={bannerStyle} onChange={e => setBannerStyle(e.target.value as typeof bannerStyle)}>
              <option value="aurora">Aurora</option><option value="gradient">Degradado</option><option value="minimal">Minimalista</option>
            </select>
          </div>
        </section>
        <div className="flex justify-center">
          <button type="button" onClick={() => fileRef.current?.click()} className="relative group" aria-label="Cambiar foto">
            <img src={avatarPreview} alt="" className="w-24 h-24 rounded-full object-cover border border-white/15" />
            <span className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-5 h-5 text-white" />
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={pickAvatar} className="hidden" />
        </div>

        <input className={field} value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} placeholder="Nombre" />
        <input
          className={field}
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
          maxLength={24}
          placeholder="Usuario"
        />
        <textarea className={`${field} resize-none`} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} placeholder="Biografía" />
        <label htmlFor="website-url" className="block text-xs font-semibold text-zinc-300">Enlace de tu perfil</label>
        <input id="website-url" className={field} type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} maxLength={200} placeholder="https://tusitio.com" />
        <input className={field} value={location} onChange={(e) => setLocation(e.target.value)} maxLength={60} placeholder="Ubicación" />

        {error && (
          <p role="alert" className="text-xs text-rose-400">
            {error}
          </p>
        )}

        {blocked.length > 0 && (
          <div className="pt-2 border-t border-white/[0.08]">
            <p className="text-xs font-semibold text-white mb-2">Cuentas bloqueadas</p>
            <ul className="space-y-1.5">
              {blocked.map((u) => (
                <li key={u.id} className="flex items-center gap-2.5">
                  <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  <span className="flex-1 text-xs text-zinc-300 truncate">@{u.username}</span>
                  <button type="button" onClick={() => unblock(u)} className="px-3 py-1 rounded-full border border-white/15 text-[11px] text-zinc-300 hover:bg-white/5">Desbloquear</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="submit"
          disabled={busy || deleting}
          className="w-full py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-all"
        >
          {busy ? 'Guardando...' : 'Guardar cambios'}
        </button>

        <div className="pt-3 border-t border-white/[0.08] space-y-2">
          <p className="text-xs font-semibold text-rose-400">Eliminar mi cuenta</p>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Se borran tu perfil, publicaciones, mensajes y archivos. No se puede deshacer. Escribí tu usuario (<span className="text-zinc-300">{me.username}</span>) para confirmar.
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={me.username}
            autoComplete="off"
            className={field}
          />
          <button
            type="button"
            onClick={deleteAccount}
            disabled={confirmText !== me.username || deleting}
            className="w-full py-2.5 rounded-xl border border-rose-500/40 text-rose-400 text-sm font-semibold hover:bg-rose-950/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {deleting ? 'Eliminando...' : 'Eliminar cuenta definitivamente'}
          </button>
        </div>
      </form>
    </div>
  );
};
