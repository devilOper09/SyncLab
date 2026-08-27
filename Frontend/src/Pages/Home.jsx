import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Play, Pause, Heart, MessageSquare, Repeat, Bookmark, Share2, UserPlus, UserCheck, Sparkles, Flame, Music, Users, ArrowRight, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserNavbar from '../components/UserNavbar';
import Sidebar from '../components/Sidebar';
import StoriesSection from '../components/Stories';
import { useAudioPlayer } from '../context/AudioPlayerContext.jsx';
import toast from 'react-hot-toast';
import api from '../Api/Api.js';
import WaveSurfer from 'wavesurfer.js';

const GoldBadge = () => (
  <svg className="w-4 h-4 text-yellow-500 fill-current inline-block ml-1.5 shrink-0 align-middle" viewBox="0 0 24 24" title="Verified Artist">
    <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.69L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
  </svg>
);

const WaveformPlayer = ({ post, isPlaying }) => {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const { seekTrack, audioRef, currentTime, duration } = useAudioPlayer();

  useEffect(() => {
    if (!waveformRef.current) return;
    const audio = audioRef?.current;
    if (!audio || !post.audio_url) return;

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: 'rgba(255, 255, 255, 0.18)',
      progressColor: '#6366f1',
      cursorColor: 'rgba(99,102,241,0.6)',
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      height: 48,
      normalize: true,
      interact: true,
      media: audio,
    });

    ws.on('seek', (progress) => {
      const dur = audio.duration;
      if (dur && isFinite(dur)) {
        seekTrack(progress * dur);
      }
    });

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [post._id || post.id, audioRef]);

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full flex flex-col gap-1">
      <div ref={waveformRef} className="w-full cursor-pointer" />
      <div className="flex items-center justify-between text-[9px] text-gray-500 px-0.5">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

const GENRES = [
  "All",
  "Trap",
  "Drill",
  "Hip-Hop",
  "R&B",
  "Boom Bap",
  "Jersey Club",
  "Afrobeats",
  "House",
  "Electronic"
];

function Home() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [likedPosts, setLikedPosts] = useState({});
  const [savedPosts, setSavedPosts] = useState({});
  const [repostedPosts, setRepostedPosts] = useState({});
  const [followingStatus, setFollowingStatus] = useState({});

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loggedInUserId = localStorage.getItem("user_id");

  const { activeTrack, isPlaying, playTrack } = useAudioPlayer();

  const [expandedPostId, setExpandedPostId] = useState(null);

  const handlePlayPause = (post) => {
    const postId = post._id || post.id;
    setExpandedPostId(postId);
    playTrack({
      id: postId,
      caption: post.caption,
      audio_url: post.audio_url,
      cover_url: post.cover_url,
      artistName: post.userName
    });
    // Track view once per session
    if (!viewedPosts.current.has(postId)) {
      viewedPosts.current.add(postId);
      api.post(`/api/posts/${postId}/view`).catch(() => {});
    }
  };

  const fetchPosts = async () => {
    try {
      const params = loggedInUserId ? { user_id: loggedInUserId } : {};
      const res = await api.get("/api/posts", { params });
      return res.data;
    } catch (err) {
      console.error("Failed to fetch posts:", err);
      return [];
    }
  };

  const fetchUsers = async () => {
    if (!loggedInUserId) return;
    try {
      const res = await api.get("/follow/search", {
        params: {
          q: "",
          role: "",
          user_id: loggedInUserId
        }
      });
      if (res.data.success) {
        setUsers(res.data.users);
        // Initialize following status map
        const status = {};
        res.data.users.forEach(u => {
          status[u.id] = u.is_following;
        });
        setFollowingStatus(status);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchPosts().then(data => {
      setPosts(data);
      setHasMore(false);
      setLoading(false);
      // Initialize liked state from backend
      const likedMap = {};
      data.forEach(p => {
        if (p.liked_by_me) likedMap[p._id || p.id] = true;
      });
      setLikedPosts(likedMap);
    });
    void fetchUsers();
  }, []);

  const handlePost = async () => {
    if (!caption.trim()) return;
    if (!loggedInUserId) {
      toast.error("Please log in first.");
      return;
    }
    try {
      await api.post("/api/posts", {
        user_id: loggedInUserId,
        caption,
      });
      setCaption("");
      setShowForm(false);
      const latestPosts = await fetchPosts();
      setPosts(latestPosts);
      toast.success("Post created successfully!");
    } catch (err) {
      console.error("Failed to create post:", err);
      const msg = err.response?.data?.message || err.response?.data?.error || "Failed to create post.";
      toast.error(msg);
    }
  };

  const handleFollowToggle = async (targetUser) => {
    if (!loggedInUserId) {
      toast.error("Please log in first.");
      return;
    }

    const isFollowing = followingStatus[targetUser.id];
    const targetId = targetUser.id;

    // Optimistic UI update
    setFollowingStatus(prev => ({ ...prev, [targetId]: !isFollowing }));

    try {
      if (isFollowing) {
        const res = await api.delete(`/follow/${targetId}`, {
          data: { user_id: loggedInUserId }
        });
        if (res.data.success) {
          toast.success(`Unfollowed @${targetUser.username}`);
        } else {
          throw new Error();
        }
      } else {
        const res = await api.post(`/follow/${targetId}`, {
          user_id: loggedInUserId
        });
        if (res.data.success) {
          toast.success(`Following @${targetUser.username}`);
        } else {
          throw new Error();
        }
      }
    } catch (error) {
      // Revert optimistic update
      setFollowingStatus(prev => ({ ...prev, [targetId]: isFollowing }));
      toast.error("Failed to update follow status.");
    }
  };

  const toggleLike = async (postId) => {
    if (!loggedInUserId) {
      toast.error("Please log in first.");
      return;
    }
    // Optimistic update
    const wasLiked = likedPosts[postId];
    setLikedPosts(prev => ({ ...prev, [postId]: !wasLiked }));
    try {
      const res = await api.post(`/api/posts/${postId}/like`, {
        user_id: loggedInUserId
      });
      const { liked, likes_count } = res.data;
      setLikedPosts(prev => ({ ...prev, [postId]: liked }));
      setPosts(prev => prev.map(p =>
        (p._id || p.id) === postId ? { ...p, likes_count } : p
      ));
      toast.success(liked ? "Liked!" : "Unliked");
    } catch (err) {
      // Revert optimistic update
      setLikedPosts(prev => ({ ...prev, [postId]: wasLiked }));
      toast.error("Failed to update like.");
    }
  };

  const toggleSave = (postId) => {
    setSavedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
    toast.success(savedPosts[postId] ? "Removed from saves" : "Saved to library!");
  };

  const toggleRepost = (postId) => {
    setRepostedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
    toast.success(repostedPosts[postId] ? "Repost removed" : "Reposted!");
  };

  const viewedPosts = useRef(new Set());

  // Filter posts by genre
  const filteredPosts = posts.filter(post => {
    if (selectedGenre === "All") return true;
    return post.genre?.toLowerCase() === selectedGenre.toLowerCase();
  });

  // Trending Beats: post_type === 'beat' or has audio_url, sorted by engagement
  const trendingBeats = posts
    .filter(post => post.audio_url && (post.post_type === 'beat' || !post.post_type))
    .sort((a, b) => ((b.likes_count || 0) * 2 + (b.views_count || 0)) - ((a.likes_count || 0) * 2 + (a.views_count || 0)));

  // New Snippets: post_type === 'beat_snippet' or 'song_snippet'
  const newSnippets = posts.filter(post => post.audio_url && (post.post_type === 'beat_snippet' || post.post_type === 'song_snippet'));

  // Suggested Collaborations: posts with collaboration requests or just general posts that have collaboration potential
  const suggestedCollabs = posts.filter(post => post.caption?.toLowerCase().includes("need") || post.caption?.toLowerCase().includes("collab"));

  // For You Section: Featured trending beat or recently played track
  const featuredBeat = trendingBeats[0] || posts[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <UserNavbar />
      <div className="flex">
        <Sidebar />

        {/* 3-Column Layout Grid */}
        <div className="ml-64 flex-1 p-6 pb-24 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
          
          {/* Center Feed Area */}
          <div className="space-y-6 min-w-0">

            {/* Stories Component */}
            <StoriesSection />
            
            {/* 1. Hero / For You Section */}
            {featuredBeat && (
              <section className="relative overflow-hidden rounded-2xl bg-linear-to-r from-indigo-950/80 via-slate-900 to-slate-950 border border-white/10 p-6 flex flex-col md:flex-row items-center gap-6 shadow-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
                
                {/* Artwork */}
                <div className="relative group w-36 h-36 md:w-40 md:h-40 rounded-xl overflow-hidden bg-slate-800 shrink-0 shadow-lg border border-white/5">
                  {featuredBeat.cover_url ? (
                    <img 
                      src={featuredBeat.cover_url} 
                      alt={featuredBeat.caption} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-950/50 text-indigo-400 text-4xl font-bold">
                      🎵
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <button 
                      onClick={() => handlePlayPause(featuredBeat)}
                      className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 hover:scale-105 transition-all duration-300 shadow-lg shadow-indigo-600/30"
                    >
                      {activeTrack?.id === (featuredBeat._id || featuredBeat.id) && isPlaying ? (
                        <Pause size={20} />
                      ) : (
                        <Play size={20} className="ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 text-center md:text-left space-y-2 z-10">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-semibold tracking-wide uppercase">
                    <Sparkles size={10} />
                    For You
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white line-clamp-2">
                    {featuredBeat.caption || "Featured Track"}
                  </h2>
                  <p className="text-gray-400 text-sm flex items-center justify-center md:justify-start gap-1.5">
                    by <span className="text-indigo-400 font-semibold">@{featuredBeat.userName}</span>
                    {featuredBeat.is_founder && <GoldBadge />}
                  </p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
                    <button 
                      onClick={() => handlePlayPause(featuredBeat)}
                      className="px-6 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold flex items-center gap-2 hover:scale-105 transition-all duration-300 shadow-lg shadow-indigo-600/20"
                    >
                      {activeTrack?.id === (featuredBeat._id || featuredBeat.id) && isPlaying ? (
                        <>
                          <Pause size={14} />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play size={14} className="ml-0.5" />
                          Play Now
                        </>
                      )}
                    </button>
                    {featuredBeat.genre && (
                      <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs font-medium">
                        {featuredBeat.genre}
                      </span>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* 2. Genre Chips */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                  <Music size={14} className="text-indigo-400" />
                  Explore Genres
                </h3>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 border snap-start ${
                      selectedGenre === genre
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20 scale-105"
                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/20"
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </section>

            {/* 3. Trending Beats Carousel */}
            {trendingBeats.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Flame size={18} className="text-orange-500" />
                    Trending Beats
                  </h3>
                  <span className="text-[10px] text-gray-500 hover:text-indigo-400 cursor-pointer flex items-center gap-1 transition-colors">
                    See all <ArrowRight size={10} />
                  </span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {trendingBeats.map((beat) => {
                    const isCurrent = activeTrack?.id === (beat._id || beat.id);
                    return (
                      <div 
                        key={beat._id || beat.id} 
                        className="group relative w-40 bg-white/5 border border-white/10 rounded-xl p-2.5 shrink-0 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 transition-all duration-300 shadow-lg snap-start"
                      >
                        {/* Artwork */}
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-800 mb-2 shadow-md">
                          {beat.cover_url ? (
                            <img 
                              src={beat.cover_url} 
                              alt={beat.caption} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-indigo-950/40 text-indigo-400 text-2xl font-bold">
                              🎵
                            </div>
                          )}
                          {/* Play Button Overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <button 
                              onClick={() => handlePlayPause(beat)}
                              className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 hover:scale-105 transition-all duration-300 shadow-lg"
                            >
                              {isCurrent && isPlaying ? (
                                <Pause size={16} />
                              ) : (
                                <Play size={16} className="ml-0.5" />
                              )}
                            </button>
                          </div>
                        </div>
                        {/* Details */}
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-white text-xs truncate group-hover:text-indigo-400 transition-colors">
                            {beat.caption || "Untitled Beat"}
                          </h4>
                          <p className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                            @{beat.userName}
                            {beat.is_founder && <GoldBadge />}
                          </p>
                          {beat.genre && (
                            <span className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {beat.genre}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 4. New Snippets Carousel */}
            {newSnippets.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Music size={18} className="text-indigo-400" />
                    New Snippets
                  </h3>
                  <span className="text-[10px] text-gray-500 hover:text-indigo-400 cursor-pointer flex items-center gap-1 transition-colors">
                    See all <ArrowRight size={10} />
                  </span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {newSnippets.map((snippet) => {
                    const isCurrent = activeTrack?.id === (snippet._id || snippet.id);
                    return (
                      <div 
                        key={snippet._id || snippet.id} 
                        className="group relative w-40 bg-white/5 border border-white/10 rounded-xl p-2.5 shrink-0 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 transition-all duration-300 shadow-lg snap-start"
                      >
                        {/* Artwork */}
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-800 mb-2 shadow-md">
                          {snippet.cover_url ? (
                            <img 
                              src={snippet.cover_url} 
                              alt={snippet.caption} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-indigo-950/40 text-indigo-400 text-2xl font-bold">
                              🎵
                            </div>
                          )}
                          {/* Play Button Overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <button 
                              onClick={() => handlePlayPause(snippet)}
                              className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 hover:scale-105 transition-all duration-300 shadow-lg"
                            >
                              {isCurrent && isPlaying ? (
                                <Pause size={16} />
                              ) : (
                                <Play size={16} className="ml-0.5" />
                              )}
                            </button>
                          </div>
                        </div>
                        {/* Details */}
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-white text-xs truncate group-hover:text-indigo-400 transition-colors">
                            {snippet.caption || "Untitled Snippet"}
                          </h4>
                          <p className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                            @{snippet.userName}
                            {snippet.is_founder && <GoldBadge />}
                          </p>
                          {snippet.genre && (
                            <span className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {snippet.genre}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 5. Suggested Collaborations Carousel */}
            {suggestedCollabs.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users size={18} className="text-indigo-400" />
                    Suggested Collaborations
                  </h3>
                  <span className="text-[10px] text-gray-500 hover:text-indigo-400 cursor-pointer flex items-center gap-1 transition-colors">
                    See all <ArrowRight size={10} />
                  </span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {suggestedCollabs.map((collab) => (
                    <div 
                      key={collab._id || collab.id} 
                      className="group relative w-56 bg-white/5 border border-white/10 rounded-xl p-3 shrink-0 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 transition-all duration-300 shadow-lg flex flex-col justify-between snap-start"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
                            {collab.userName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-xs flex items-center gap-1">
                              @{collab.userName}
                              {collab.is_founder && <GoldBadge />}
                            </h4>
                            <p className="text-[9px] text-gray-500">Collab Opportunity</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-300 line-clamp-2 italic">
                          "{collab.caption}"
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                        {collab.genre ? (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {collab.genre}
                          </span>
                        ) : (
                          <span className="text-[9px] text-gray-500">Any Genre</span>
                        )}
                        <button 
                          onClick={() => toast.success("Collaboration request sent!")}
                          className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 6. Suggested Artists Section */}
            {users.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users size={18} className="text-indigo-400" />
                    Artists You Should Follow
                  </h3>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {users.slice(0, 8).map((user) => (
                    <div 
                      key={user.id} 
                      className="group relative w-40 bg-white/5 border border-white/10 rounded-xl p-3 shrink-0 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 transition-all duration-300 shadow-lg flex flex-col items-center text-center snap-start"
                    >
                      {/* Avatar */}
                      <div 
                        onClick={() => {
                          if (String(user.id) === String(loggedInUserId)) navigate('/profile')
                          else navigate(`/profile?id=${user.id}`)
                        }}
                        className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-800 mb-2 border border-white/10 shadow-md cursor-pointer hover:border-indigo-400 transition"
                      >
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={user.display_name} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-indigo-950/40 text-indigo-400 text-xl font-bold">
                            {user.display_name?.substring(0, 1).toUpperCase() || user.username?.substring(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* Details */}
                      <div className="space-y-0.5 w-full">
                        <h4 
                          onClick={() => {
                            if (String(user.id) === String(loggedInUserId)) navigate('/profile')
                            else navigate(`/profile?id=${user.id}`)
                          }}
                          className="font-bold text-white text-xs truncate flex items-center justify-center gap-0.5 cursor-pointer hover:text-indigo-400 transition"
                        >
                          {user.display_name || user.username}
                          {user.is_founder && <GoldBadge />}
                        </h4>
                        <p className="text-[10px] text-gray-400 truncate">@{user.username}</p>
                        {user.role && (
                          <span className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {user.role}
                          </span>
                        )}
                      </div>
                      {/* Follow Button */}
                      <button
                        onClick={() => handleFollowToggle(user)}
                        className={`mt-3 w-full py-1 rounded-lg text-[10px] font-bold transition-all duration-300 flex items-center justify-center gap-1 ${
                          followingStatus[user.id]
                            ? "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10"
                        }`}
                      >
                        {followingStatus[user.id] ? (
                          <>
                            <UserCheck size={10} />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus size={10} />
                            Follow
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 7. Feed Section */}
            <section className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Music size={18} className="text-indigo-400" />
                  Recent Activity
                </h3>
              </div>

              {loading && posts.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-white/10" />
                          <div className="space-y-1">
                            <div className="w-20 h-3 bg-white/10 rounded" />
                            <div className="w-12 h-2 bg-white/10 rounded" />
                          </div>
                        </div>
                        <div className="w-10 h-4 bg-white/10 rounded" />
                      </div>
                      <div className="space-y-2">
                        <div className="w-full h-3 bg-white/10 rounded" />
                        <div className="w-full aspect-square bg-white/10 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-xl">
                    🎵
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">No tracks found</h4>
                    <p className="text-xs text-gray-400">Be the first to upload a track in this genre!</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPosts.map((post) => {
                    const isCurrent = activeTrack?.id === (post._id || post.id);
                    const isExpanded = expandedPostId === (post._id || post.id);
                    const uploadTime = post.created_at ? new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recently';
                    return (
                      <div 
                        key={post._id || post.id} 
                        className={`group bg-white/5 border rounded-xl p-4 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 transition-all duration-300 shadow-lg flex flex-col justify-between space-y-3 ${
                          isCurrent && isPlaying ? "border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]" : "border-white/10"
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div 
                            onClick={() => {
                              if (String(post.user_id) === String(loggedInUserId)) navigate('/profile')
                              else navigate(`/profile?id=${post.user_id}`)
                            }}
                            className="flex items-center gap-2.5 min-w-0 cursor-pointer group/user"
                          >
                            <div className="w-8 h-8 rounded-full bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0 group-hover/user:border-indigo-400 transition overflow-hidden">
                              {post.avatar_url ? (
                                <img src={post.avatar_url} alt={post.userName} className="w-full h-full object-cover" />
                              ) : (
                                post.userName.substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-white text-xs flex items-center gap-1 truncate group-hover/user:text-indigo-400 transition">
                                @{post.userName}
                                {post.is_founder && <GoldBadge />}
                              </h4>
                              <p className="text-[9px] text-gray-500">{uploadTime}</p>
                            </div>
                          </div>
                          {post.genre && (
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                              {post.genre}
                            </span>
                          )}
                        </div>

                        {/* Content / Artwork / Waveform */}
                        <div className="space-y-2">
                          <p className="text-xs text-gray-300 line-clamp-2">
                            {post.caption}
                          </p>
                          {post.audio_url && (
                            <div className="flex flex-col gap-3">
                              {isExpanded ? (
                                <div className="flex gap-4 items-center bg-black/20 p-3 rounded-lg border border-white/5">
                                  {/* Artwork on the left */}
                                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-800 shrink-0 shadow-md">
                                    {post.cover_url ? (
                                      <img 
                                        src={post.cover_url} 
                                        alt={post.caption} 
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-indigo-950/40 text-indigo-400 text-xl font-bold">
                                        🎵
                                      </div>
                                    )}
                                    {/* Play/Pause Overlay */}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                      <button 
                                        onClick={() => handlePlayPause(post)}
                                        className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 transition-colors"
                                      >
                                        {isCurrent && isPlaying ? (
                                          <Pause size={14} />
                                        ) : (
                                          <Play size={14} className="ml-0.5" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                  {/* Waveform on the right */}
                                  <div className="flex-1 min-w-0">
                                    <WaveformPlayer post={post} isPlaying={isCurrent && isPlaying} />
                                  </div>
                                  {/* Collapse Button */}
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedPostId(null);
                                    }}
                                    className="text-gray-500 hover:text-white transition-colors shrink-0"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : post.cover_url ? (
                                <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-800 border border-white/5 shadow-inner flex items-center justify-center">
                                  <img 
                                    src={post.cover_url} 
                                    alt={post.caption} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                  {/* Play Button Overlay - Show only on hover */}
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <button 
                                      onClick={() => handlePlayPause(post)}
                                      className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 hover:scale-105 transition-all duration-300 shadow-lg"
                                    >
                                      <Play size={20} className="ml-0.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                // Audio-only post: compact play button row, no blank artwork area
                                <button
                                  onClick={() => handlePlayPause(post)}
                                  className="flex items-center gap-3 w-full bg-black/20 border border-white/5 rounded-lg px-4 py-3 hover:bg-black/30 transition-colors"
                                >
                                  <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                                    <Play size={16} className="ml-0.5" />
                                  </div>
                                  <div className="flex flex-col items-start min-w-0">
                                    <span className="text-xs font-semibold text-white truncate w-full">Play Track</span>
                                    <span className="text-[10px] text-gray-500">Tap to listen</span>
                                  </div>
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-gray-400 text-[10px]">
                          <button 
                            onClick={() => toggleLike(post._id || post.id)}
                            className={`flex items-center gap-1 hover:text-red-500 transition-colors ${likedPosts[post._id || post.id] ? "text-red-500" : ""}`}
                          >
                            <Heart size={14} className={likedPosts[post._id || post.id] ? "fill-current" : ""} />
                            <span>{(post.likes_count || 0)}</span>
                          </button>
                          <button 
                            onClick={() => toast.success("Comments section coming soon!")}
                            className="flex items-center gap-1 hover:text-indigo-400 transition-colors"
                          >
                            <MessageSquare size={14} />
                            <span>0</span>
                          </button>
                          <button 
                            onClick={() => toggleRepost(post._id || post.id)}
                            className={`flex items-center gap-1 hover:text-green-500 transition-colors ${repostedPosts[post._id || post.id] ? "text-green-500" : ""}`}
                          >
                            <Repeat size={14} />
                            <span>{repostedPosts[post._id || post.id] ? 1 : 0}</span>
                          </button>
                          <button 
                            onClick={() => toggleSave(post._id || post.id)}
                            className={`flex items-center gap-1 hover:text-indigo-400 transition-colors ${savedPosts[post._id || post.id] ? "text-indigo-400" : ""}`}
                          >
                            <Bookmark size={14} className={savedPosts[post._id || post.id] ? "fill-current" : ""} />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Infinite Scroll Loader */}
              {loading && posts.length > 0 && (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </section>

          </div>

          {/* Right Sidebar Widgets */}
          <div className="hidden xl:flex flex-col gap-8 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent w-[320px] shrink-0">
            
            {/* Widget 1: Suggested Artists */}
            {users.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg w-full">
                <h4 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                  <Users size={14} className="text-indigo-400" />
                  Suggested Artists
                </h4>
                <div className="space-y-3">
                  {users.slice(0, 4).map((user) => (
                    <div key={user.id} className="flex items-center justify-between gap-4 p-2 rounded-xl hover:bg-white/5 transition-all duration-200">
                      <div 
                        onClick={() => {
                          if (String(user.id) === String(loggedInUserId)) navigate('/profile')
                          else navigate(`/profile?id=${user.id}`)
                        }}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group/sub"
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-white/10 shrink-0 group-hover/sub:border-indigo-400 transition">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-indigo-950/40 text-indigo-400 text-sm font-bold">
                              {user.display_name?.substring(0, 1).toUpperCase() || user.username?.substring(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bold text-white truncate flex items-center gap-1 group-hover/sub:text-indigo-400 transition">
                            <span className="truncate">{user.display_name || user.username}</span>
                            {user.is_founder && <GoldBadge />}
                          </h5>
                          <p className="text-[10px] text-gray-400 truncate">@{user.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleFollowToggle(user)}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 shrink-0 ${
                          followingStatus[user.id]
                            ? "bg-white/10 text-white border border-white/10 hover:bg-white/20"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10 hover:scale-105"
                        }`}
                      >
                        {followingStatus[user.id] ? "Following" : "Follow"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Widget 2: Trending Tags */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg w-full">
              <h4 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                <Flame size={14} className="text-orange-500" />
                Trending Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {["#trap", "#jerseyclub", "#drill", "#rage", "#phonk", "#lofi", "#boombap", "#afrobeats"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      const cleanTag = tag.replace("#", "");
                      setSelectedGenre(cleanTag.charAt(0).toUpperCase() + cleanTag.slice(1));
                      toast.success(`Filtering by ${tag}`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-200 hover:scale-105"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Widget 3: Recent Activity */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg w-full">
              <h4 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                <Sparkles size={14} className="text-indigo-400" />
                Recent Activity
              </h4>
              <div className="space-y-3">
                {[
                  { user: "Harshit", action: "uploaded a beat", time: "2m ago" },
                  { user: "ogTensu", action: "followed you", time: "15m ago" },
                  { user: "decimal", action: "commented on your snippet", time: "1h ago" },
                  { user: "googleuser", action: "liked your track", time: "3h ago" }
                ].map((act, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs p-2 rounded-xl hover:bg-white/5 transition-all duration-200">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-300">
                        <span className="font-bold text-white">@{act.user}</span> {act.action}
                      </p>
                      <span className="text-[10px] text-gray-500">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Floating Upload Button */}
      <button
        className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-500 text-white w-14 h-14 rounded-full text-3xl flex items-center justify-center shadow-lg shadow-indigo-600/30 hover:scale-105 transition-all duration-300 z-50"
        onClick={() => setShowForm(true)}
      >
        <Plus size={24} />
      </button>

      {/* Post Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4 relative">
            <button 
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-white">Create a Post</h3>
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors h-32 resize-none"
              placeholder="What's on your mind? Share a beat, snippet, or collaboration request..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-bold transition-colors"
                onClick={handlePost}
              >
                Post
              </button>
              <button
                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl font-bold transition-colors border border-white/10"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;