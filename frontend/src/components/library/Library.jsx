import React, { useState } from 'react';
import './Library.css';
import axios from 'axios';

/**
 * Library component displaying DJ-relevant music genres for searching songs.
 * @param {Object} props - Component props
 * @param {Function} props.setSearchResults - Function to update search results in parent component
 * @returns {JSX.Element} Library UI with genre list
 */
const Library = ({ setSearchResults }) => {
  const [isLoading, setIsLoading] = useState(false);

  // Alphabetically sorted DJ-relevant genres
  const genres = [
    'Acid House', 'Afrobeat', 'Ambient', 'Big Room', 'Breakbeat', 'Chillout', 'Deep House',
    'Disco', 'Drum and Bass', 'Dub', 'Dubstep', 'Electro', 'Electronica', 'Funk', 'Future Bass',
    'Gabber', 'Garage', 'Glitch', 'Hard Techno', 'Hardstyle', 'Hip Hop', 'House', 'Jungle',
    'Minimal Techno', 'Progressive House', 'Psytrance', 'Reggae', 'Tech House', 'Techno',
    'Trance', 'Trap', 'Trip Hop', 'UK Garage'
  ];


  const handleGenreClick = async (genre) => {
    setIsLoading(true);
    try {
      const searchQuery = `${genre} music`;
      const { data } = await axios.get('http://localhost:3000/searchSongs', {
        params: { searchQuery }
      });
      const results = data.items || [];
      
      if (results.length) {
        setSearchResults(results);
      } else {
        console.warn(`No YouTube results for genre: ${genre}`);
      }
    } catch (error) {
      console.error('YouTube search error:', error);
      const errorMessage = error.response
        ? error.response.status === 403
          ? 'YouTube API error: Check your API key or quota.'
          : `YouTube API error: ${error.response.status}`
        : error.request
          ? 'Cannot connect to backend. Is the server running?'
          : 'Sorry, I couldn’t perform the search.';
      console.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="library-container">
      <h2 className="library-title">Genres</h2>
      {isLoading && <div className="library-loading">Loading...</div>}
      <ul className="genre-list">
        {genres.map((genre) => (
          <li
            key={genre}
            className="genre-item"
            onClick={() => handleGenreClick(genre)}
          >
            {genre}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Library;