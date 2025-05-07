import React, { useState } from 'react';
import './ChatAssistant.css';
import axios from 'axios';

const ChatAssistant = ({ setSearchResults }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastAIResponse, setLastAIResponse] = useState('');

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
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

  const handleSearchBasedOnAIResponse = async () => {
    if (!lastAIResponse.trim()) {
      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: 'No AI response to search for. Please ask a question first.' }
      ]);
      return;
    }
  
    setIsLoading(true);
    try {
      // Step 1: Extract potential song titles using various patterns
      const songPatterns = [
        /[""]([^"""]+)[""]/g,                    // Double quotes: "Song Title"
        /'([^']+)'/g,                            // Single quotes: 'Song Title'
        /- ([^-\n]+?)(?:\s+by\s+[^-\n]+|\s*\n|$)/g,  // Bullet points with artist: - Song Title by Artist
        /\d+\.\s+([^-\n]+?)(?:\s+by\s+[^-\n]+|\s*\n|$)/g, // Numbered list with artist: 1. Song Title by Artist
        /([^-\n,.]+)\s+by\s+([^-\n,.]+)/g,       // Format: Song Title by Artist Name
        /track(?:\s+called)?\s+["']([^"']+)["']/gi, // "track called 'Song Title'" format
      ];
      
      // Get all matches from all patterns
      let allExtractedSongs = [];
      
      for (const pattern of songPatterns) {
        const matches = Array.from(lastAIResponse.matchAll(pattern));
        if (matches.length > 0) {
          // Get the first capturing group from each match
          const songs = matches.map(match => match[1].trim());
          allExtractedSongs = [...allExtractedSongs, ...songs];
        }
      }
      
      // Remove duplicates
      const uniqueSongs = [...new Set(allExtractedSongs)];
      console.log('Extracted songs:', uniqueSongs);
      
      // Step 2: Construct the search query
      let searchQuery = '';
      
      if (uniqueSongs.length > 0) {
        // If we found songs, use them - limit to 3 songs maximum for best results
        const topSongs = uniqueSongs.slice(0, 3);
        
        // Check if the original query mentions a specific genre
        const genreMatches = input.toLowerCase().match(/(techno|house|trance|edm|electronic|dance|dubstep|drum and bass|dnb)/g);
        const genre = genreMatches ? genreMatches[0] : 'electronic';
        
        searchQuery = topSongs.join(' ') + ' ' + genre;
      } else {
        // If no songs were found, try to extract key terms from the AI response
        
        // Remove common words and keep only potential music-related terms
        const words = lastAIResponse.split(/\s+/).filter(word => 
          word.length > 3 && 
          !['this', 'that', 'with', 'from', 'have', 'there', 'your', 'about', 'what'].includes(word.toLowerCase())
        );
        
        // Use the top 5-7 most relevant words
        const keyTerms = words.slice(0, 6).join(' ');
        
        // Check if the original query mentions a specific genre
        const genreMatches = input.toLowerCase().match(/(techno|house|trance|edm|electronic|dance|dubstep|drum and bass|dnb)/g);
        const genre = genreMatches ? genreMatches[0] : 'music';
        
        searchQuery = keyTerms + ' ' + genre;
      }
  
      console.log('YouTube Search Query:', searchQuery);
  
      const response = await axios.get('http://localhost:3000/searchSongs', {
        params: { searchQuery }
      });
  
      const results = response.data.items || [];
      if (results.length > 0) {
        setSearchResults(results);
        setMessages(prev => [
          ...prev,
          { sender: 'ai', text: '🔊 Search results based on our conversation are now displayed on the homepage!' }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { sender: 'ai', text: 'No results found on YouTube for this query. Try asking for different songs or genres.' }
        ]);
      }
    } catch (error) {
      console.error('Error during YouTube search:', error);
      let errorMessage = "Sorry, I couldn't perform the search.";
      
      if (error.response) {
        if (error.response.status === 403) {
          errorMessage = 'YouTube API error: Check your API key or quota.';
        } else {
          errorMessage = `YouTube API error: ${error.response.status}`;
        }
      } else if (error.request) {
        errorMessage = 'Cannot connect to backend. Is the server running?';
      }
      
      setMessages(prev => [...prev, { sender: 'ai', text: errorMessage }]);
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
                <button className="search-button" onClick={handleSearchBasedOnAIResponse}>
                  🎵 Search this on YouTube
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
              placeholder="Search songs or ask me..."
              className="chat-input"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatAssistant;