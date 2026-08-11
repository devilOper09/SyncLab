import { Routes, Route, useNavigate, useLocation, Link } from "react-router-dom"
import { useEffect, useMemo } from "react"
import { useAudioPlayer } from "./context/AudioPlayerContext.jsx"
import { Play, Pause, X, Volume2 } from "lucide-react"

import Login from "./Pages/login"
import SignUp from "./Pages/SignUp"
import Home from "./Pages/Home"
import PublicHome from "./Pages/PublicHome"
import Artists from "./Pages/Artists"
import Search from "./Pages/Search"
import Notifications from "./Pages/Notifications"
// import Snippets from "./Pages/Snippets"
import YourProfile from "./Pages/YourProfile"
import SetUpProfile from "./Pages/setUpProfile"
import Messages from "./Pages/Messages"
import CollabRequests from "./Pages/Collabs"
import Trending from "./Pages/Trending"

// Handles the redirect from Google OAuth — reads query params, stores in localStorage, redirects
function GoogleAuthCallback() {
  const navigate = useNavigate()
  const { search } = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(search)
    const user_id = params.get("user_id")
    const profile_complete = params.get("profile_complete")
    const is_founder = params.get("is_founder")
    const name = params.get("name")
    const email = params.get("email")
    const avatar = params.get("avatar")

    if (user_id) {
      localStorage.setItem("user_id", user_id)
      localStorage.setItem("profile_complete", profile_complete)
      if (is_founder !== null) localStorage.setItem("is_founder", is_founder)
      if (name)   localStorage.setItem("display_name", name)
      if (email)  localStorage.setItem("user", email)
      if (avatar) localStorage.setItem("avatar", avatar)
    }

    if (profile_complete === "false") {
      navigate("/setup-profile", { replace: true })
    } else {
      navigate("/home", { replace: true })
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function MiniWaveform({ isPlaying }) {
  const barDurations = useMemo(
    () => [0.45, 0.55, 0.4, 0.6, 0.5, 0.45, 0.55],
    []
  )

  return (
    <div className="flex items-end gap-0.75 h-5 px-1 shrink-0">
      {barDurations.map((dur, i) => (
        <div
          key={i}
          style={{
            animationDelay: `${(i * 0.12).toFixed(2)}s`,
            animationDuration: isPlaying ? `${dur}s` : '0s',
            animationPlayState: isPlaying ? 'running' : 'paused',
          }}
          className="w-0.75 bg-indigo-400 rounded-full animate-soundwave h-1"
        />
      ))}
    </div>
  )
}

function MiniPlayer() {
  const { activeTrack, isPlaying, playTrack, stopTrack } = useAudioPlayer()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Don't show mini player while the expanded player is visible on the profile page or home page
  if (!activeTrack || pathname === '/profile' || pathname === '/home') return null

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-2xl flex items-center gap-3">
      {/* Cover Art */}
      <div 
        onClick={() => navigate("/profile")} 
        className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 shrink-0 cursor-pointer hover:opacity-80 transition aspect-square"
      >
        {activeTrack.cover_url ? (
          <img src={activeTrack.cover_url} alt="cover" className="w-full h-full object-cover aspect-square" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-indigo-900/40 text-indigo-400 font-bold">
            🎵
          </div>
        )}
      </div>

      {/* Mini Waveform */}
      <MiniWaveform isPlaying={isPlaying} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-semibold text-white truncate">{activeTrack.caption || "Untitled Track"}</h4>
        <p className="text-[10px] text-gray-400 truncate">{activeTrack.artistName || "Unknown Artist"}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => playTrack(activeTrack)}
          className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center hover:bg-indigo-500 transition text-white"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
        </button>
        <button
          onClick={stopTrack}
          className="text-gray-500 hover:text-white transition"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

function App() {
  return (
    <div className="bg-black min-h-screen text-white">

      <Routes>
        <Route path="/" element={<PublicHome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/home" element={<Home />}/>
        <Route path="/setup-profile" element={<SetUpProfile />}/>
        <Route path="/auth/callback" element={<GoogleAuthCallback />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/search" element={<Search />} />
        <Route path="/notification" element={<Notifications />} />
        {/* <Route path="/snippets" element={<Snippets />} /> */}
        <Route path="/profile" element={<YourProfile />} />
        <Route path="/user/:username" element={<YourProfile />} />
        <Route path="/message" element={<Messages />} />
        <Route path="/collabs" element={<CollabRequests />} />
        <Route path="/trending" element={<Trending />} />
      </Routes>

      <MiniPlayer />

    </div>
  )
}

export default App
