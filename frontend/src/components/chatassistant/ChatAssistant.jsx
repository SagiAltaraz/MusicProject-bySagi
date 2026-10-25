import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { FaTimes, FaHeadphones, FaPaperPlane, FaSearch, FaPlus, FaBroom, FaStop } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import api, { postEventStream } from '../../lib/api';
import { sessionId } from '../../lib/storage';
import useSearchStore from '../../stores/searchStore';
import useCrateStore from '../../stores/crateStore';
import usePlayerStore from '../../stores/playerStore';
import useTrackMetaStore from '../../stores/trackMetaStore';
import useUiStore from '../../stores/uiStore';
import { toast } from '../../stores/toastStore';
import { trackFields } from '../../lib/format';
import { parseTracks } from '../../lib/chat';
import { Popover, MenuItem, MenuLabel } from '../ui/Popover';
import { IconButton } from '../ui/Button';

const GREETING = { sender: 'ai', text: "Hey DJ! Ask me for track ideas, what to play next, or how to build a set. Every track I suggest gets **Search** and **Add** buttons." };
const STORAGE_KEY = 'dj-chat';

function quickPrompts() {
  const current = usePlayerStore.getState().currentTrack;
  const prompts = ['Warm-up set ideas for a deep house night', 'Peak-time techno bangers from 2025', 'How do I mix from 124 to 128 BPM smoothly?'];
  if (current) {
    const t = trackFields(current);
    const a = useTrackMetaStore.getState().meta[t.videoId]?.analysis;
    prompts.unshift(`What should I play after "${t.title}"${a?.bpm ? ` (${Math.round(a.bpm)} BPM, ${a.camelot})` : ''}?`);
  }
  return prompts;
}

/** Search and Add buttons for one suggested track. */
function TrackChip({ name }) {
  const search = useSearchStore((s) => s.search);
  const crates = useCrateStore((s) => s.crates);
  const navigate = useNavigate();

  const addTo = async (crate) => {
    try {
      const { data } = await api.get('/searchSongs', { params: { searchQuery: name, maxDuration: 1200 } });
      const top = data.items?.[0];
      if (!top) return toast({ tone: 'error', title: `No match for ${name}` });
      const added = useCrateStore.getState().addTrack(crate.id, top);
      toast({ tone: added ? 'success' : 'info', title: added ? `Added to ${crate.name}` : `Already in ${crate.name}`, message: trackFields(top).title });
    } catch (e) {
      toast({ tone: 'error', title: "Couldn't add track", message: e.message });
    }
  };

  return (
    <li className="flex items-center gap-1.5 py-1 border-t border-border/50 first:border-t-0">
      <span className="flex-1 min-w-0 text-xs text-text-primary truncate" title={name}>{name}</span>
      <button
        type="button"
        onClick={() => {
          search(name);
          navigate('/');
        }}
        aria-label={`Search ${name}`}
        className="flex items-center gap-1 text-[11px] text-neon hover:text-neon/80 bg-transparent border-none px-1"
      >
        <FaSearch className="text-[9px]" /> Search
      </button>
      <Popover
        side="top"
        className="w-48"
        renderTrigger={({ toggle, props }) => (
          <button type="button" onClick={toggle} aria-label={`Add ${name} to a crate`} className="flex items-center gap-1 text-[11px] text-accent hover:text-accent-hover bg-transparent border-none px-1" {...props}>
            <FaPlus className="text-[9px]" /> Add
          </button>
        )}
      >
        {(close) => (
          <>
            <MenuLabel>Top result into</MenuLabel>
            {crates.length === 0 && <p className="px-3 py-2 text-xs text-text-muted">Create a crate first.</p>}
            {crates.map((c) => <MenuItem key={c.id} onClick={() => { addTo(c); close(); }}>{c.name}</MenuItem>)}
          </>
        )}
      </Popover>
    </li>
  );
}

const ChatAssistant = () => {
  const isOpen = useUiStore((s) => s.chatOpen);
  const setChat = useUiStore((s) => s.setChat);
  // The floating button would cover the bottom of side panels
  const panelOpen = useUiStore((s) => s.queueOpen || s.downloadsOpen || !!s.detailTrack);
  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || [GREETING];
    } catch {
      return [GREETING];
    }
  });
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      // Storage unavailable
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const send = async (text = input) => {
    const prompt = text.trim();
    if (!prompt || streaming) return;
    setInput('');
    setStreaming(true);
    setMessages((prev) => [...prev, { sender: 'user', text: prompt }, { sender: 'ai', text: '', pending: true }]);
    const appendToLast = (fn) => setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = fn(next[next.length - 1]);
      return next;
    });

    abortRef.current = new AbortController();
    try {
      await postEventStream('/askAI', { prompt, sessionId: sessionId() }, {
        signal: abortRef.current.signal,
        onEvent: (event, data) => {
          if (event === 'token') appendToLast((m) => ({ ...m, text: m.text + data }));
          if (event === 'error') appendToLast((m) => ({ ...m, text: m.text || data.error, error: true }));
        },
      });
    } catch (e) {
      appendToLast((m) => ({ ...m, text: e.message || 'Something went wrong. Please try again.', error: true }));
    } finally {
      appendToLast((m) => ({ ...m, pending: false }));
      setStreaming(false);
    }
  };

  const clear = async () => {
    abortRef.current?.abort();
    setMessages([GREETING]);
    api.post('/askAI/clear', { sessionId: sessionId() }).catch(() => {});
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && !panelOpen && (
          <motion.button
            type="button"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setChat(true)}
            aria-label="Open DJ assistant"
            title="DJ assistant"
            className="fixed bottom-24 right-5 w-12 h-12 rounded-full bg-accent hover:bg-accent-hover border-none text-white text-xl shadow-lg shadow-accent/30 z-100 flex items-center justify-center"
          >
            <FaHeadphones />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.section
            aria-label="DJ assistant"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-24 right-3 sm:right-5 w-[min(calc(100vw-1.5rem),24rem)] h-[min(calc(100vh-11rem),36rem)] bg-bg-secondary border border-border rounded-2xl shadow-pop z-100 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-linear-to-r from-accent to-[#ff9f43] shrink-0">
              <div className="flex items-center gap-2">
                <FaHeadphones className="text-white" aria-hidden />
                <span className="text-white font-semibold text-sm">DJ Assistant</span>
              </div>
              <div className="flex items-center">
                <IconButton size="sm" label="Clear chat" onClick={clear} className="text-white/80! hover:text-white! hover:bg-white/15!"><FaBroom /></IconButton>
                <IconButton size="sm" label="Close assistant" onClick={() => setChat(false)} className="text-white/80! hover:text-white! hover:bg-white/15!"><FaTimes /></IconButton>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3" aria-live="polite">
              {messages.map((msg, i) => {
                const tracks = msg.sender === 'ai' && !msg.pending ? parseTracks(msg.text) : [];
                return (
                  <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] px-3 py-2 rounded-2xl text-sm leading-relaxed
                      ${msg.sender === 'user' ? 'bg-accent/20 text-text-primary rounded-br-sm' : msg.error ? 'bg-danger/10 text-danger rounded-bl-sm' : 'bg-bg-card text-text-primary rounded-bl-sm'}`}
                    >
                      {msg.sender === 'ai' ? (
                        msg.text ? <div className="chat-md"><ReactMarkdown>{msg.text}</ReactMarkdown></div> : (
                          <div className="flex gap-1 py-1" aria-label="Thinking">
                            {[0, 150, 300].map((d) => <span key={d} className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                          </div>
                        )
                      ) : msg.text}
                      {tracks.length > 0 && (
                        <ul className="list-none mt-2 pt-2 border-t border-border">
                          {tracks.map((name) => <TrackChip key={name} name={name} />)}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
              {messages.length <= 1 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {quickPrompts().map((p) => (
                    <button key={p} type="button" onClick={() => send(p)} className="text-left text-xs px-3 py-1.5 rounded-full bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-accent/50">
                      {p}
                    </button>
                  ))}
                </div>
              )}
              <div ref={endRef} />
            </div>

            <form className="p-3 border-t border-border shrink-0 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setChat(false)}
                aria-label="Message the assistant"
                className="flex-1 h-10 px-3 bg-bg-input border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
                placeholder="Ask about tracks, BPM, keys…"
              />
              {streaming ? (
                <IconButton label="Stop" variant="secondary" onClick={() => abortRef.current?.abort()} className="rounded-lg!"><FaStop /></IconButton>
              ) : (
                <button type="submit" disabled={!input.trim()} aria-label="Send" className="w-10 h-10 flex items-center justify-center rounded-lg bg-accent hover:bg-accent-hover disabled:bg-bg-hover disabled:text-text-muted border-none text-white transition-colors">
                  <FaPaperPlane className="text-sm" />
                </button>
              )}
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatAssistant;
