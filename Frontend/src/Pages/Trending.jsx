import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Play, Pause, Heart, MessageSquare, Repeat, Bookmark, Flame, Music, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserNavbar from '../components/UserNavbar';
import Sidebar from '../components/Sidebar';
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

function Trending() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState({});
  const [savedPosts, setSavedPosts] = useState({});
  const [repostedPosts, setRepostedPosts] = useState({});
  const [loading, setLoading] = useState(true);

  const loggedInUserId = localStorage.getItem("user_id");
  const { activeTrack, isPlaying, playTrack } = useAudioPlayer();
  const [expandedPostId, setExpandedPostId] = useState(null);
  const viewedPosts = useRef(new Set());

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

  const fetchTrendingPosts = async () => {
    try {
      const params = loggedInUserId ? { user_id: loggedInUserId } : {};
      const res = await api.get("/api/posts/trending", { params });
      return res.data;
    } catch (err) {
      console.error("Failed to fetch trending posts:", err);
      return [];
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTrendingPosts().then(data => {
      setPosts(data);
      setLoading(false);
      // Initialize liked state from backend
      const likedMap = {};
      data.forEach(p => {
        if (p.liked_by_me) likedMap[p._id || p.id] = true;
      });
      setLikedPosts(likedMap);
    });
  }, []);

  const toggleLike = async (postId) => {
    if (!loggedInUserId) {
      toast.error("Please log in first.");
      return;
    }
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
      setLikedPosts(prev => ({ ...prev, [postId]: wasLiked }));
      toast.error("Failed to update like.");
    }
  };

  const toggleSave = (postId) => {
    setSavedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
    toast.success(savedPosts[postId] ? "Removed from saved" : "Saved to library!");
  };

  const toggleRepost = (postId) => {
    setRepostedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
    toast.success(repostedPosts[postId] ? "Repost removed" : "Reposted!");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <UserNavbar />
      <div className="flex">
        <Sidebar />
        <div className="ml-64 flex-1 p-8 pb-16">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold bg-linear-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
                <Flame className="w-6 h-6 text-orange-500 fill-current animate-pulse" /> Trending Tracks
              </h1>
              <span className="text-xs text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                Based on likes & views
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-xl">
                  🔥
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">No trending tracks yet</h4>
                  <p className="text-xs text-gray-400">Interact with posts to see them trend here!</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {posts.map((post, index) => {
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
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0 group-hover/user:border-indigo-400 transition overflow-hidden">
                              {post.avatar_url ? (
                                <img src={post.avatar_url} alt={post.userName} className="w-full h-full object-cover" />
                              ) : (
                                post.userName?.substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-[10px] font-bold text-indigo-400">
                              #{index + 1}
                            </div>
                          </div>
                          <div className="min-w-0 ml-1">
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
                              <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg border border-white/5">
                                <button 
                                  onClick={() => handlePlayPause(post)}
                                  className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 transition shrink-0"
                                >
                                  {isCurrent && isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                                </button>
                                <WaveformPlayer post={post} isPlaying={isCurrent && isPlaying} />
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
                            ) : (
                              <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-800 border border-white/5 shadow-inner flex items-center justify-center">
                                {post.cover_url ? (
                                  <img 
                                    src={post.cover_url} 
                                    alt={post.caption} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="text-indigo-400 text-3xl">🎵</div>
                                )}
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default Trending;