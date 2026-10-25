// Loads the YouTube IFrame API once and resolves with window.YT.
let ready = null;

export function loadYouTubeApi() {
  if (ready) return ready;
  ready = new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    document.head.appendChild(tag);
  });
  return ready;
}

// Player error codes → message (https://developers.google.com/youtube/iframe_api_reference#onError)
export const YT_ERRORS = {
  2: 'Invalid video id.',
  5: "This video can't be played in the browser.",
  100: 'Video not found or private.',
  101: "The owner doesn't allow playback outside YouTube.",
  150: "The owner doesn't allow playback outside YouTube.",
};
