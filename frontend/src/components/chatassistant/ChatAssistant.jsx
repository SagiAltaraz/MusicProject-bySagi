import React, { useState } from 'react';
import './ChatAssistant.css';
import axios from 'axios';

const ChatAssistant = ({ setSearchResults }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastPrompt, setLastPrompt] = useState('');
  const [lastAIResponse, setLastAIResponse] = useState('');

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setLastPrompt(input);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:3000/askAI', {
        prompt: input
      });
      const result = response.data.response;
      setMessages(prev => [...prev, { sender: 'ai', text: result }]);
      setLastAIResponse(result);
    } catch (error) {
      console.error('Error with AI API:', error);
      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: 'Sorry, something went wrong with the AI. Please try again.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchFromPrompt = async () => {
    if (!lastPrompt.trim()) {
      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: 'No prompt to search from. Please enter a message first.' }
      ]);
      return;
    }
  
    setIsLoading(true);
    try {
      const searchQuery = lastPrompt; // just use the prompt directly
  
      const response = await axios.get('http://localhost:3000/searchSongs', {
        params: { searchQuery }
      });
  
      const results = response.data.items || [];
      if (results.length > 0) {
        setSearchResults(results);
        setMessages(prev => [
          ...prev,
          { sender: 'ai', text: 'Search songs!' }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { sender: 'ai', text: 'No results found!' }
        ]);
      }
    } catch (error) {
      console.error('Error during YouTube search:', error);
      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: "Sorry, I couldn't perform the search." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="chat-assistant">
      {!isOpen ? (
        <button onClick={() => setIsOpen(true)} className="chat-toggle-button">💬</button>
      ) : (
        <div className="chat-container">
          <div className="chat-header">
            <span>Song Search Assistant</span>
            <button onClick={() => setIsOpen(false)} className="chat-close-button">✕</button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>{msg.text}</div>
            ))}
            {lastAIResponse && !isLoading && (
              <div className="message ai">
                <button className="search-button" onClick={handleSearchFromPrompt}>
                  🎵 Find Songs Based on My Prompt
                </button>
              </div>
            )}
            {isLoading && <div className="message-loading">Loading...</div>}
          </div>

          <div className="chat-input-container">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask me for music suggestions..."
              className="chat-input"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatAssistant;
