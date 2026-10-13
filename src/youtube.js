// ---- A YouTube player, as the reel needs one ----------------------------------------
// YouTube's player lives in an <iframe> and is driven through its own script
// (the IFrame Player API), which is fetched once, when the first player is
// asked for. Here it is behind the few things the reel asks of a player; each
// answers with a promise, kept once the player has been told (it is not
// ready at once: what is asked before waits for it).
//   YOUTUBE_HOST   where the player is served from: the address that sets no
//                  cookies until the video plays
const YOUTUBE_HOST = "https://www.youtube-nocookie.com";
const YOUTUBE_API = "https://www.youtube.com/iframe_api";

// The address of the player for the video `id`: silent, with none of
// YouTube's controls, starting over when it ends (a list of that one video
// is what makes it loop) and playing in the page on a phone. It does not
// start by itself: play() does.
export function youTubeEmbedUrl(id) {
  const options = new URLSearchParams({
    enablejsapi: 1,
    origin: window.location.origin,
    mute: 1,
    controls: 0,
    loop: 1,
    playlist: id,
    playsinline: 1,
    rel: 0,
    fs: 0,
    disablekb: 1,
    iv_load_policy: 3,
  });
  return `${YOUTUBE_HOST}/embed/${id}?${options}`;
}

let api = null; // YouTube's script, once asked for
function loadApi() {
  api ||= new Promise((resolve, reject) => {
    const earlier = window.onYouTubeIframeAPIReady; // (the script calls this one name when it is in)
    window.onYouTubeIframeAPIReady = () => {
      if (earlier) earlier();
      resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = YOUTUBE_API;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return api;
}

// `frame`: an <iframe> whose src is youTubeEmbedUrl()'s. `onState` is told
// every time the video starts to move (true) or stops doing so (false: it is
// paused, waiting for data, or at its end and about to start over).
export function createYouTubePlayer(frame, onState) {
  const ready = loadApi().then(
    (YT) =>
      new Promise((resolve) => {
        const player = new YT.Player(frame, {
          events: {
            onReady: () => resolve(player),
            onStateChange: (event) => onState(event.data === YT.PlayerState.PLAYING),
          },
        });
      })
  );
  const tell = (what) => ready.then(what);
  return {
    play: () => tell((player) => player.playVideo()),
    pause: () => tell((player) => player.pauseVideo()),
    setMuted: (muted) => tell((player) => (muted ? player.mute() : player.unMute())),
    setVolume: (volume) => tell((player) => player.setVolume(volume * 100)), // 0..1
    timeLeft: () => tell((player) => player.getDuration() - player.getCurrentTime()), // seconds to its end
  };
}
