import { useState, useRef, useEffect } from 'react';
import { FaTimes, FaHeadphones, FaPaperPlane, FaSearch } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import useSearchStore from '../../stores/searchStore';

const ChatAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'ai', text: "Hey DJ! I'm your AI assistant. Ask me for track suggestions, set building tips, or help finding the perfect vibe for your next gig." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { search } = useSearchStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/askAI`, { prompt: userText });
      const aiText = response.data.response;
      setMessages((prev) => [...prev, { sender: 'ai', text: aiText }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchFromMessage = (text) => {
    search(text);
    setIsOpen(false);
  };

  return (
    <>
      {/* Toggle button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-5 w-12 h-12 rounded-full bg-accent hover:bg-accent-hover border-none text-white text-xl cursor-pointer shadow-lg shadow-accent/30 z-100 flex items-center justify-center"
          >
            <FaHeadphones />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-5 w-80 h-112 bg-bg-secondary border border-border rounded-xl shadow-2xl z-100 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-linear-to-r from-accent to-[#ff9f43] shrink-0">
              <div className="flex items-center gap-2">
                <FaHeadphones className="text-white" />
                <span className="text-white font-semibold text-sm">DJ Assistant</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white bg-transparent border-none cursor-pointer text-lg"
              >
                <FaTimes />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed
                      ${msg.sender === 'user'
                        ? 'bg-accent/20 text-text-primary rounded-br-sm'
                        : 'bg-bg-card text-text-primary rounded-bl-sm'
                      }`}
                  >
                    {msg.text}
                    {msg.sender === 'ai' && i > 0 && (
                      <button
                        onClick={() => handleSearchFromMessage(messages[i - 1]?.text || msg.text)}
                        className="flex items-center gap-1 mt-2 text-xs text-neon hover:text-neon/80 bg-transparent border-none cursor-pointer transition-colors"
                      >
                        <FaSearch className="text-[10px]" /> Search this
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-bg-card px-4 py-3 rounded-xl rounded-bl-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border shrink-0">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask for track suggestions..."
                  className="flex-1 px-3 py-2 bg-bg-input border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent hover:bg-accent-hover disabled:bg-bg-hover disabled:text-text-muted border-none text-white cursor-pointer disabled:cursor-default transition-colors text-sm"
                >
                  <FaPaperPlane />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatAssistant;
