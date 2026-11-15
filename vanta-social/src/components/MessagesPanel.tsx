import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, MoreHorizontal, Send, Search, SquarePen, X } from 'lucide-react';
import { ChatMessage, Conversation, User } from '../types';
import * as api from '../lib/api';
import { supabase } from '../lib/supabase';
import { soundEngine } from '../utils/audioSynth';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface MessagesPanelProps {
  me: User;
  startWithUserId: string | null;
  onClose: () => void;
  onUnreadChange: () => void;
  onOpenProfile: (username: string) => void;
  onBlocked: (user: User) => void;
}

type View = 'list' | 'thread' | 'new';
type ListTab = 'inbox' | 'requests';

const timeShort = (iso: string) => {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
};

export const MessagesPanel: React.FC<MessagesPanelProps> = ({ me, startWithUserId, onClose, onUnreadChange, onOpenProfile, onBlocked }) => {
  const [view, setView] = useState<View>('list');
  const [tab, setTab] = useState<ListTab>('inbox');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [active, setActive] = useState<{ id: string; other: User } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<User[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  });
  useModalBehavior(onClose);

  const refreshList = useCallback(async () => {
    try {
      setConversations(await api.fetchConversations(me.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los chats.');
    } finally {
      setLoadingList(false);
    }
  }, [me.id]);

  const openThread = useCallback(
    async (conversationId: string, other: User) => {
      setActive({ id: conversationId, other });
      setView('thread');
      setMessages([]);
      setError(null);
      setMenuOpen(false);
      setLoadingThread(true);
      try {
        const list = await api.fetchMessages(conversationId);
        setMessages(list);
        setHasOlder(list.length === 40);
        await api.markConversationRead(conversationId);
        onUnreadChange();
        void refreshList();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la conversación.');
      } finally {
        setLoadingThread(false);
      }
    },
    [onUnreadChange, refreshList]
  );

  const startChatWith = useCallback(
    async (user: User) => {
      setError(null);
      try {
        const id = await api.openConversation(user.id);
        await openThread(id, user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo abrir el chat.');
        setView('list');
      }
    },
    [openThread]
  );

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  // Abrir chat directo desde un perfil
  useEffect(() => {
    if (!startWithUserId) return;
    (async () => {
      try {
        const user = await api.fetchProfileById(startWithUserId);
        if (user) await startChatWith(user);
      } catch {
        setError('No se pudo abrir el chat.');
      }
    })();
  }, [startWithUserId, startChatWith]);

  // Mensajes nuevos en tiempo real (la base de datos solo envía los de mis conversaciones)
  useEffect(() => {
    const channel = supabase
      .channel(`chat-panel:${me.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = api.toMessage(payload.new as Parameters<typeof api.toMessage>[0]);
        const current = activeRef.current;
        if (current && msg.conversationId === current.id) {
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          if (msg.senderId !== me.id) {
            void api.markConversationRead(msg.conversationId).then(onUnreadChange);
            soundEngine.playTap();
          }
        }
        void refreshList();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me.id, refreshList, onUnreadChange]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, view]);

  // Buscar personas para un chat nuevo
  useEffect(() => {
    if (view !== 'new') return;
    const t = window.setTimeout(async () => {
      try {
        const list = query.trim() ? await api.searchProfiles(query.trim().replace(/^@/, '')) : await api.suggestedProfiles(10);
        setPeople(list.filter((u) => u.id !== me.id));
      } catch {
        setPeople([]);
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [query, view, me.id]);

  const loadOlder = async () => {
    if (!active || messages.length === 0) return;
    try {
      const older = await api.fetchMessages(active.id, messages[0].createdAt);
      setMessages((prev) => [...older, ...prev]);
      setHasOlder(older.length === 40);
    } catch {
      setError('No se pudieron cargar los mensajes anteriores.');
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !active || sending) return;
    setSending(true);
    setError(null);
    try {
      const msg = await api.sendMessage(active.id, me.id, body);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setDraft('');
      soundEngine.playPublish();
      void refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  const removeMessage = async (id: string) => {
    if (!window.confirm('¿Eliminar este mensaje? Se borra para ambas personas.')) return;
    try {
      await api.deleteMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      void refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar.');
    }
  };

  const blockActive = async () => {
    if (!active) return;
    if (!window.confirm(`¿Bloquear a @${active.other.username}? No podrán escribirse ni ver el contenido del otro.`)) return;
    try {
      await api.blockUser(me.id, active.other.id);
      onBlocked(active.other);
      setActive(null);
      setView('list');
      void refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo bloquear.');
    }
  };

  const reportActive = async () => {
    if (!active) return;
    setMenuOpen(false);
    try {
      await api.reportUser(me.id, active.other.id, 'chat');
      setError(null);
      window.alert('Gracias por avisarnos. Revisaremos este perfil.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el reporte.');
    }
  };

  const shown = conversations.filter((c) => (tab === 'requests' ? c.isRequest : !c.isRequest));
  const requestCount = conversations.filter((c) => c.isRequest).length;
  const isRequestThread = active ? conversations.find((c) => c.id === active.id)?.isRequest : false;

  return (
    <div className="fixed inset-0 z-[55] bg-[#09090b] flex flex-col sm:items-center" role="dialog" aria-label="Mensajes">
      <div className="w-full max-w-md h-full flex flex-col bg-[#09090b] sm:border-x sm:border-white/10">
        {/* Cabecera */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-white/[0.08]">
          {view !== 'list' ? (
            <button onClick={() => { setView('list'); setActive(null); setError(null); void refreshList(); }} aria-label="Volver" className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:bg-white/5">
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <button onClick={onClose} aria-label="Cerrar mensajes" className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:bg-white/5">
              <X className="w-5 h-5" />
            </button>
          )}

          {view === 'thread' && active ? (
            <>
              <button onClick={() => onOpenProfile(active.other.username)} className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                <img src={active.other.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{active.other.displayName}</p>
                  <p className="text-[11px] text-zinc-500 truncate">@{active.other.username}</p>
                </div>
              </button>
              <div className="relative">
                <button onClick={() => setMenuOpen((v) => !v)} aria-label="Más opciones" className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-9 z-20 w-44 rounded-xl bg-zinc-900 border border-white/10 shadow-2xl p-1">
                      <button onClick={() => { setMenuOpen(false); onOpenProfile(active.other.username); }} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 rounded-lg">Ver perfil</button>
                      <button onClick={reportActive} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 rounded-lg">Reportar</button>
                      <button onClick={blockActive} className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/30 rounded-lg">Bloquear</button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-white flex-1">{view === 'new' ? 'Nuevo mensaje' : 'Mensajes'}</h2>
              {view === 'list' && (
                <button onClick={() => { setQuery(''); setView('new'); }} aria-label="Nuevo mensaje" className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:bg-white/5">
                  <SquarePen className="w-4.5 h-4.5" />
                </button>
              )}
            </>
          )}
        </div>

        {error && (
          <p role="alert" className="px-4 py-2 text-xs text-rose-400 bg-rose-950/20 border-b border-rose-900/30">{error}</p>
        )}

        {/* Lista */}
        {view === 'list' && (
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="flex px-3 pt-2 border-b border-white/[0.06]" role="tablist">
              {(['inbox', 'requests'] as ListTab[]).map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${tab === t ? 'text-white border-white' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}>
                  {t === 'inbox' ? 'Chats' : `Solicitudes${requestCount ? ` (${requestCount})` : ''}`}
                </button>
              ))}
            </div>

            {loadingList ? (
              <p className="py-12 text-center text-xs text-zinc-500">Cargando...</p>
            ) : shown.length === 0 ? (
              <div className="py-16 px-8 text-center">
                <p className="text-sm font-medium text-zinc-200">{tab === 'requests' ? 'Sin solicitudes' : 'Todavía no tenés chats'}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {tab === 'requests' ? 'Acá aparecen mensajes de personas que no seguís.' : 'Tocá el lápiz para escribirle a alguien.'}
                </p>
              </div>
            ) : (
              <ul>
                {shown.map((c) => (
                  <li key={c.id}>
                    <button onClick={() => openThread(c.id, c.other)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] text-left transition-colors">
                      <img src={c.other.avatar} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate ${c.unread ? 'font-semibold text-white' : 'text-zinc-200'}`}>{c.other.displayName}</p>
                          <span className="text-[10px] text-zinc-500 shrink-0">{timeShort(c.lastAt)}</span>
                        </div>
                        <p className={`text-xs truncate ${c.unread ? 'text-zinc-200' : 'text-zinc-500'}`}>
                          {c.lastFromMe ? 'Vos: ' : ''}{c.lastBody}
                        </p>
                      </div>
                      {c.unread > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-[10px] font-semibold text-white flex items-center justify-center">{c.unread > 9 ? '9+' : c.unread}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Nuevo mensaje */}
        {view === 'new' && (
          <div className="flex-1 overflow-y-auto no-scrollbar p-3">
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} maxLength={50} placeholder="Buscar personas" className="w-full bg-[#111115] border border-white/10 rounded-full pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30" />
            </div>
            <ul className="space-y-1">
              {people.map((u) => (
                <li key={u.id}>
                  <button onClick={() => startChatWith(u)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] text-left transition-colors">
                    <img src={u.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{u.displayName}</p>
                      <p className="text-[11px] text-zinc-500 truncate">@{u.username}</p>
                    </div>
                  </button>
                </li>
              ))}
              {people.length === 0 && <p className="py-10 text-center text-xs text-zinc-500">No encontramos a nadie.</p>}
            </ul>
          </div>
        )}

        {/* Conversación */}
        {view === 'thread' && active && (
          <>
            <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-1.5">
              {isRequestThread && (
                <p className="text-center text-[11px] text-zinc-500 bg-zinc-900/60 border border-white/[0.06] rounded-xl px-3 py-2 mb-2">
                  Esta persona no te sigue. Si respondés, aceptás recibir sus mensajes. Podés bloquearla o reportarla desde el menú.
                </p>
              )}
              {hasOlder && (
                <div className="flex justify-center pb-2">
                  <button onClick={loadOlder} className="px-3 py-1 rounded-full border border-white/10 text-[11px] text-zinc-400 hover:text-white">Ver mensajes anteriores</button>
                </div>
              )}
              {loadingThread ? (
                <p className="py-12 text-center text-xs text-zinc-500">Cargando...</p>
              ) : messages.length === 0 ? (
                <p className="py-12 text-center text-xs text-zinc-500">Escribí el primer mensaje.</p>
              ) : (
                messages.map((m) => {
                  const mine = m.senderId === me.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        onContextMenu={(e) => { if (mine) { e.preventDefault(); void removeMessage(m.id); } }}
                        className={`group max-w-[78%] px-3.5 py-2 rounded-2xl text-[13px] leading-snug break-words whitespace-pre-wrap ${mine ? 'bg-white text-black rounded-br-md' : 'bg-[#18181b] text-zinc-100 border border-white/[0.06] rounded-bl-md'}`}
                      >
                        {m.body}
                        <span className={`block text-[10px] mt-1 ${mine ? 'text-zinc-500' : 'text-zinc-500'}`}>
                          {timeShort(m.createdAt)}{mine && m.readAt ? ' · Visto' : ''}
                          {mine && (
                            <button onClick={() => removeMessage(m.id)} className="ml-2 underline opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" aria-label="Eliminar mensaje">eliminar</button>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={send} className="flex items-end gap-2 p-3 border-t border-white/[0.08] bg-zinc-950/90">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                rows={1}
                maxLength={1000}
                placeholder="Escribí un mensaje..."
                className="flex-1 max-h-28 resize-none bg-zinc-900 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
              />
              <button type="submit" disabled={!draft.trim() || sending} aria-label="Enviar mensaje" className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-30 hover:bg-zinc-200 active:scale-95 transition-all shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
