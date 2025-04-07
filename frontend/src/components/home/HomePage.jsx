import SongCard from "../songcard/SongCard"
import "./HomePage.css";

function HomePage({searchResults}){
   

    return (
        <div className="home">
            <div className="content-area">
                <h1>Good Afternoon</h1>
                <div className="search-results">
                    {searchResults.length > 0 ? (
                        searchResults.map((song, index) => (
                            <SongCard key={index} song={song} />
                        ))
                    ) : (
                        <div className="no-results">No results</div>
                    )}
                </div>
            </div>
        </div>
    );   
}
export default HomePage;