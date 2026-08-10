import React, { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate, useParams } from 'react-router-dom'
import UserNavbar from '../components/UserNavbar'
import Sidebar from '../components/Sidebar'
import api from '../Api/Api.js'
import toast from 'react-hot-toast'
import { Music, Mic2, Plus, Play, Camera, Image, X, Heart, MessageSquare, Repeat, Bookmark, Share2, Volume2, Pause, MoreVertical, Trash2, UserPlus, UserCheck } from 'lucide-react'
import WaveSurfer from 'wavesurfer.js'
import { useAudioPlayer } from '../context/AudioPlayerContext.jsx'
import ImageCropper from '../components/ImageCropper.jsx'

const POST_TYPE_LABELS = {
  beat: "Beat",
  beat_snippet: "Snippet",
  song_snippet: "Song Snippet",
}

const ROLE_COLORS = {
  Producer: "bg-indigo-600/30 text-indigo-300 border-indigo-500/40",
  Rapper: "bg-red-600/20 text-red-300 border-red-500/40",
  Artist: "bg-purple-600/20 text-purple-300 border-purple-500/40",
  Vocalist: "bg-pink-600/20 text-pink-300 border-pink-500/40",
  "Mixing Engineer": "bg-green-600/20 text-green-300 border-green-500/40",
}

const ROLES = ["Producer", "Rapper", "Artist", "Vocalist", "Mixing Engineer"]
const GENRE_OPTIONS = ["Trap", "Drill", "R&B", "Hip-Hop", "Afrobeats", "Pop", "Lo-Fi", "Jazz", "Soul", "Electronic"]

const Visualizer = ({ isPlaying }) => {
  return (
    <div className="flex items-end gap-1 h-10 px-2 justify-center">
      {Array.from({ length: 24 }).map((_, i) => {
        const delay = (i * 0.04).toFixed(2)
        const duration = (0.6 + Math.random() * 0.6).toFixed(2)
        return (
          <div
            key={i}
            style={{
              animationDelay: `${delay}s`,
              animationDuration: isPlaying ? `${duration}s` : '0s',
              animationPlayState: isPlaying ? 'running' : 'paused',
            }}
            className="w-1 bg-indigo-500 rounded-t-full animate-soundwave h-1"
          />
        )
      })}
    </div>
  )
}

const WaveformPlayer = ({ post, isPlaying, handlePlayPause }) => {
  const waveformRef = useRef(null)
  const wavesurferRef = useRef(null)
  const { seekTrack, audioRef, currentTime, duration } = useAudioPlayer()

  // Build WaveSurfer once the container exists and the audio element has this post's src loaded.
  // We use `media:` so WaveSurfer reads peaks from the already-playing Audio element —
  // no separate CORS fetch needed, no blank waveform.
  useEffect(() => {
    if (!waveformRef.current) return
    const audio = audioRef?.current
    if (!audio || !post.audio_url) return

    // Destroy any previous instance first
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy()
      wavesurferRef.current = null
    }

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: 'rgba(255, 255, 255, 0.18)',
      progressColor: '#6366f1',
      cursorColor: 'rgba(99,102,241,0.6)',
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      height: 56,
      normalize: true,
      interact: true,
      media: audio,
    })

    // Waveform click → seek the shared audio element
    ws.on('seek', (progress) => {
      const dur = audio.duration
      if (dur && isFinite(dur)) {
        seekTrack(progress * dur)
      }
    })

    wavesurferRef.current = ws

    return () => {
      ws.destroy()
      wavesurferRef.current = null
    }
  // Re-run when the post changes (new track selected) or when the audio element is ready
  }, [post.id, audioRef])

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="w-full flex flex-col gap-1.5">
      {/* Waveform — full width, click to seek */}
      <div ref={waveformRef} className="w-full cursor-pointer" />
      {/* Time display only — play/pause lives on the artwork */}
      <div className="flex items-center justify-between text-[10px] text-gray-500 px-0.5">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}

const GoldBadge = () => (
  <svg className="w-4 h-4 text-yellow-500 fill-current inline-block ml-1.5 shrink-0 align-middle" viewBox="0 0 24 24" title="Verified Artist">
    <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.69L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
  </svg>
)

function YourProfile() {
  const navigate = useNavigate()
  const loggedInUserId = localStorage.getItem("user_id")
  const { username: usernameParam } = useParams()
  const [searchParams] = useSearchParams()
  const profileIdParam = searchParams.get("id")

  const [targetUserIdResolved, setTargetUserIdResolved] = useState(profileIdParam || loggedInUserId)

  // If URL has /user/:username, resolve username to user id
  useEffect(() => {
    if (usernameParam) {
      api.get(`/follow/search?q=${usernameParam}`).then(res => {
        if (res.data.success && res.data.users.length > 0) {
          const matched = res.data.users.find(u => u.username.toLowerCase() === usernameParam.toLowerCase())
          if (matched) {
            setTargetUserIdResolved(String(matched.id))
          }
        }
      }).catch(console.error)
    } else if (profileIdParam) {
      setTargetUserIdResolved(profileIdParam)
    } else {
      setTargetUserIdResolved(loggedInUserId)
    }
  }, [usernameParam, profileIdParam, loggedInUserId])

  const user_id = targetUserIdResolved || loggedInUserId
  const isOwnProfile = !usernameParam && (!profileIdParam || profileIdParam === loggedInUserId) || (user_id === loggedInUserId)

  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [showPostForm, setShowPostForm] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)

  // Followers/Following modal state
  const [showFollowModal, setShowFollowModal] = useState(null) // 'followers' | 'following' | null
  const [followModalUsers, setFollowModalUsers] = useState([])
  const [followModalSearch, setFollowModalSearch] = useState("")
  const [loadingFollowModal, setLoadingFollowModal] = useState(false)

  // New post form state
  const [postCaption, setPostCaption] = useState("")
  const [postGenre, setPostGenre] = useState("")
  const [postType, setPostType] = useState("beat")
  const [postAudioUrl, setPostAudioUrl] = useState("")
  const [postCoverUrl, setPostCoverUrl] = useState("")
  const [postVisibility, setPostVisibility] = useState("public")
  const [submittingPost, setSubmittingPost] = useState(false)

  // Edit profile state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState("")
  const [editUsername, setEditUsername] = useState("")
  const [editBio, setEditBio] = useState("")
  const [editRole, setEditRole] = useState("")
  const [editGenres, setEditGenres] = useState([])
  const [editAvatarUrl, setEditAvatarUrl] = useState("")
  const [editCoverUrl, setEditCoverUrl] = useState("")
  const [uploadingFile, setUploadingFile] = useState(false)
  const [updatingProfile, setUpdatingProfile] = useState(false)
  const [activeMenuPostId, setActiveMenuPostId] = useState(null)

  // Cropper state
  const [cropperImage, setCropperImage] = useState(null)
  const [cropperAspect, setCropperAspect] = useState(1)
  const [cropperCallback, setCropperCallback] = useState(null)

  const handleImageSelect = (e, aspect, callback) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCropperImage(reader.result)
      setCropperAspect(aspect)
      setCropperCallback(() => callback)
    }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = async (croppedBlob) => {
    setCropperImage(null)
    const file = new File([croppedBlob], "cropped-image.jpg", { type: "image/jpeg" })
    if (cropperCallback) {
      await handleFileUpload(file, cropperCallback)
    }
  }

  // Audio player global context
  const { activeTrack, isPlaying, currentTime, duration, volume, playTrack, seekTrack, changeVolume, setActiveTrack } = useAudioPlayer()
  const activePostId = activeTrack?.id

  // Which post card is currently expanded (UI only — independent of playback state)
  const [expandedPostId, setExpandedPostId] = useState(null)

  // Collapse on Escape key — music keeps playing
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setExpandedPostId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Social & Comments state
  const [likedPosts, setLikedPosts] = useState({})
  const [savedPosts, setSavedPosts] = useState({})
  const [repostedPosts, setRepostedPosts] = useState({})
  const [showCommentsId, setShowCommentsId] = useState(null)
  const [postComments, setPostComments] = useState({}) // { postId: [comments] }
  const [commentText, setCommentText] = useState("")

  const handlePlayPause = (post) => {
    // Expand the card when a new track starts
    setExpandedPostId(post.id)
    playTrack({
      ...post,
      artistName: profile?.display_name || profile?.username || "Unknown Artist"
    })
  }

  const handleSeek = (e) => {
    seekTrack(parseFloat(e.target.value))
  }

  const handleVolumeChange = (e) => {
    changeVolume(parseFloat(e.target.value))
  }

  const toggleLike = (postId) => {
    setLikedPosts(prev => ({ ...prev, [postId]: !prev[postId] }))
    toast.success(likedPosts[postId] ? "Unliked" : "Liked!")
  }

  const toggleSave = (postId) => {
    setSavedPosts(prev => ({ ...prev, [postId]: !prev[postId] }))
    toast.success(savedPosts[postId] ? "Removed from saves" : "Saved to library!")
  }

  const toggleRepost = (postId) => {
    setRepostedPosts(prev => ({ ...prev, [postId]: !prev[postId] }))
    toast.success(repostedPosts[postId] ? "Repost removed" : "Reposted!")
  }

  const handleAddComment = (postId) => {
    if (!commentText.trim()) return
    const newComment = {
      id: Date.now(),
      username: profile?.username || "anonymous",
      text: commentText.trim(),
      created_at: new Date().toISOString()
    }
    setPostComments(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newComment]
    }))
    setCommentText("")
    toast.success("Comment posted!")
  }

  const formatTime = (secs) => {
    if (isNaN(secs)) return "0:00"
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  const handleFileUpload = async (file, setUrl) => {
    const formData = new FormData()
    formData.append("file", file)
    setUploadingFile(true)
    try {
      const res = await api.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      if (res.data.success) {
        setUrl(res.data.url)
        toast.success("File uploaded successfully!")
      }
    } catch (error) {
      toast.error("Failed to upload file.")
    } finally {
      setUploadingFile(false)
    }
  }

  const handleEditProfileSubmit = async (e) => {
    e.preventDefault()
    if (!editUsername.trim() || !editRole) {
      toast.error("Username and role are required.")
      return
    }
    setUpdatingProfile(true)
    try {
      const res = await api.put("/profile/update", {
        user_id,
        display_name: editDisplayName,
        username: editUsername,
        role: editRole,
        bio: editBio,
        genres: editGenres,
        avatar_url: editAvatarUrl,
        cover_url: editCoverUrl,
      })
      if (res.data.success) {
        toast.success("Profile updated successfully!")
        setShowEditModal(false)
        fetchProfile()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile.")
    } finally {
      setUpdatingProfile(false)
    }
  }

  const openEditModal = () => {
    if (!profile) return
    setEditDisplayName(profile.display_name || "")
    setEditUsername(profile.username || "")
    setEditBio(profile.bio || "")
    setEditRole(profile.role || "")
    setEditGenres(profile.genres || [])
    setEditAvatarUrl(profile.avatar_url || "")
    setEditCoverUrl(profile.cover_url || "")
    setShowEditModal(true)
  }

  const toggleEditGenre = (g) => {
    setEditGenres(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    )
  }

  useEffect(() => {
    if (!user_id) {
      setLoadingProfile(false)
      return
    }
    fetchProfile()
    fetchPosts()
    if (!isOwnProfile) {
      fetchFollowStatus()
    }
  }, [user_id, isOwnProfile])

  const fetchFollowStatus = async () => {
    if (!loggedInUserId || !user_id) return
    try {
      const res = await api.get(`/follow/status/${user_id}`, {
        params: { user_id: loggedInUserId }
      })
      setIsFollowing(res.data.isFollowing)
    } catch (error) {
      console.error(error)
    }
  }

  const handleFollowToggle = async () => {
    if (!loggedInUserId) {
      toast.error("Please log in first.")
      return
    }

    const prevFollowing = isFollowing
    setIsFollowing(!prevFollowing)
    setProfile(prev => {
      if (!prev) return prev
      return {
        ...prev,
        followers_count: prevFollowing
          ? Math.max(0, parseInt(prev.followers_count || 0, 10) - 1)
          : parseInt(prev.followers_count || 0, 10) + 1
      }
    })

    try {
      if (prevFollowing) {
        const res = await api.delete(`/follow/${user_id}`, {
          data: { user_id: loggedInUserId }
        })
        if (res.data.success) {
          toast.success(`Unfollowed @${profile?.username}`)
        } else {
          throw new Error()
        }
      } else {
        const res = await api.post(`/follow/${user_id}`, {
          user_id: loggedInUserId
        })
        if (res.data.success) {
          toast.success(`Following @${profile?.username}`)
        } else {
          throw new Error()
        }
      }
    } catch (error) {
      // Revert optimistic update
      setIsFollowing(prevFollowing)
      setProfile(prev => {
        if (!prev) return prev
        return {
          ...prev,
          followers_count: prevFollowing
            ? parseInt(prev.followers_count || 0, 10) + 1
            : Math.max(0, parseInt(prev.followers_count || 0, 10) - 1)
        }
      })
      toast.error("Failed to update follow status.")
    }
  }

  const handleMessageClick = async () => {
    if (!loggedInUserId) {
      toast.error("Please log in first.")
      return
    }
    try {
      const res = await api.post("/social/conversations", {
        user_id: loggedInUserId,
        target_id: user_id
      })
      if (res.data.success) {
        navigate(`/message?convId=${res.data.conversationId}`)
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to start conversation.")
    }
  }

  const fetchProfile = async () => {
    try {
      const res = await api.get(`/profile/${user_id}`)
      setProfile(res.data.profile)
    } catch {
      toast.error("Could not load profile.")
    } finally {
      setLoadingProfile(false)
    }
  }

  const fetchPosts = async () => {
    try {
      const res = await api.get(`/profile/${user_id}/posts`, {
        params: { viewer_id: loggedInUserId }
      })
      setPosts(res.data.posts)
    } catch {
      // silently fail — posts section just stays empty
    }
  }

  const openFollowModal = async (type) => {
    setShowFollowModal(type)
    setLoadingFollowModal(true)
    setFollowModalSearch("")
    try {
      const endpoint = type === "followers" ? `/follow/followers/${user_id}` : `/follow/following/${user_id}`
      const res = await api.get(endpoint, {
        params: { user_id: loggedInUserId }
      })
      if (res.data.success) {
        setFollowModalUsers(res.data.users)
      }
    } catch (error) {
      console.error(error)
      toast.error(`Failed to load ${type}.`)
    } finally {
      setLoadingFollowModal(false)
    }
  }

  const handleFollowModalToggle = async (targetUser) => {
    if (!loggedInUserId) {
      toast.error("Please log in first.")
      return
    }

    const isFollowingTarget = targetUser.is_following
    const targetId = targetUser.id

    // Optimistic UI update inside modal
    setFollowModalUsers(prev =>
      prev.map(u => {
        if (u.id === targetId) {
          return { ...u, is_following: !isFollowingTarget }
        }
        return u
      })
    )

    // If we are viewing our own profile, we also need to update the following count
    if (isOwnProfile && showFollowModal === "following") {
      setProfile(prev => {
        if (!prev) return prev
        return {
          ...prev,
          following_count: isFollowingTarget
            ? Math.max(0, parseInt(prev.following_count || 0, 10) - 1)
            : parseInt(prev.following_count || 0, 10) + 1
        }
      })
    }

    try {
      if (isFollowingTarget) {
        const res = await api.delete(`/follow/${targetId}`, {
          data: { user_id: loggedInUserId }
        })
        if (res.data.success) {
          toast.success(`Unfollowed @${targetUser.username}`)
        } else {
          throw new Error()
        }
      } else {
        const res = await api.post(`/follow/${targetId}`, {
          user_id: loggedInUserId
        })
        if (res.data.success) {
          toast.success(`Following @${targetUser.username}`)
        } else {
          throw new Error()
        }
      }
    } catch (error) {
      // Revert optimistic update
      setFollowModalUsers(prev =>
        prev.map(u => {
          if (u.id === targetId) {
            return { ...u, is_following: isFollowingTarget }
          }
          return u
        })
      )
      if (isOwnProfile && showFollowModal === "following") {
        setProfile(prev => {
          if (!prev) return prev
          return {
            ...prev,
            following_count: isFollowingTarget
              ? parseInt(prev.following_count || 0, 10) + 1
              : Math.max(0, parseInt(prev.following_count || 0, 10) - 1)
          }
        })
      }
      toast.error("Failed to update follow status.")
    }
  }

  const handleCreatePost = async (e) => {
    e.preventDefault()
    if (!postAudioUrl) {
      toast.error("Audio file is required to post.")
      return
    }
    setSubmittingPost(true)
    try {
      await api.post("/profile/post", {
        user_id,
        caption: postCaption,
        genre: postGenre,
        post_type: postType,
        audio_url: postAudioUrl,
        cover_url: postCoverUrl || null,
        visibility: postVisibility,
      })
      toast.success("Post uploaded!")
      setShowPostForm(false)
      setPostCaption(""); setPostGenre(""); setPostAudioUrl(""); setPostCoverUrl(""); setPostVisibility("public")
      fetchPosts()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to post.")
    } finally {
      setSubmittingPost(false)
    }
  }

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return
    try {
      const res = await api.delete(`/profile/post/${postId}`, {
        data: { user_id }
      })
      if (res.data.success) {
        toast.success("Post deleted successfully!")
        if (activePostId === postId) {
          setActiveTrack(null)
        }
        if (expandedPostId === postId) {
          setExpandedPostId(null)
        }
        fetchPosts()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete post.")
    }
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user_id) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-gray-500 text-sm">
        Not logged in. <a href="/login" className="text-indigo-400 ml-1 hover:underline">Go to login</a>
      </div>
    )
  }

  const avatarFallback = profile?.display_name?.[0]?.toUpperCase() || "?"

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <UserNavbar />

      <div className="flex">
        <Sidebar />

        {/* Main content — offset for sidebar */}
        <div className="ml-64 flex-1 pb-16">

          {/* Cover Banner */}
          <div className="relative h-48 bg-gradient-to-br from-indigo-900/60 via-slate-900 to-blue-900/40 border-b border-white/5">
            {profile?.cover_url && (
              <img src={profile.cover_url} alt="cover" className="w-full h-full object-cover opacity-40" />
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
          </div>

          {/* Profile Header */}
          <div className="px-8 -mt-14 relative z-10">
            <div className="flex items-end justify-between">

              {/* Avatar */}
              <div className="w-28 h-28 rounded-full border-4 border-slate-950 bg-slate-800 overflow-hidden flex items-center justify-center shadow-xl">
                {(profile?.avatar_url || profile?.avatar)
                  ? <img src={profile.avatar_url || profile.avatar} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-4xl font-bold text-indigo-400">{avatarFallback}</span>
                }
              </div>

              {/* Edit / Post / Follow buttons */}
              <div className="flex gap-3 mb-2">
                {isOwnProfile ? (
                  <>
                    <button
                      onClick={() => setShowPostForm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500
                        text-white text-sm font-semibold rounded-xl transition-all duration-200
                        hover:shadow-[0_0_16px_rgba(99,102,241,0.4)]"
                    >
                      <Plus size={15} /> New Post
                    </button>
                    <button
                      onClick={openEditModal}
                      className="px-4 py-2 border border-white/10 text-gray-400 text-sm rounded-xl
                        hover:border-white/20 hover:text-white transition-all duration-200"
                    >
                      Edit Profile
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleFollowToggle}
                      className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                        isFollowing
                          ? "bg-white/10 text-white border border-white/10 hover:bg-red-600/20 hover:text-red-400 hover:border-red-500/30"
                          : "bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-[0_0_16px_rgba(99,102,241,0.4)]"
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck size={15} />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={15} />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleMessageClick}
                      className="px-5 py-2 border border-white/10 text-gray-400 text-sm font-semibold rounded-xl hover:border-white/20 hover:text-white transition-all duration-200 cursor-pointer"
                    >
                      Message
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Name / Username / Role */}
            <div className="mt-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold flex items-center gap-1">
                  <span>{profile?.display_name || "Unknown Artist"}</span>
                  {profile?.is_founder === true && <GoldBadge />}
                </h1>
                {profile?.role && (
                  <span className={`text-xs font-semibold px-3 py-0.5 rounded-full border ${ROLE_COLORS[profile.role] || "bg-white/10 text-gray-300 border-white/10"}`}>
                    {profile.role}
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm mt-0.5">@{profile?.username || "—"}</p>
            </div>

            {/* Bio */}
            {profile?.bio && (
              <p className="mt-3 text-gray-300 text-sm max-w-lg leading-relaxed">{profile.bio}</p>
            )}

            {/* Genres */}
            {profile?.genres?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {profile.genres.map(g => (
                  <span key={g} className="text-xs px-3 py-0.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300">
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="flex gap-8 mt-5 border-t border-white/5 pt-5">
              <div className="text-center">
                <p className="text-xl font-bold text-white">{posts.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Posts</p>
              </div>
              <button
                onClick={() => openFollowModal("followers")}
                className="text-center hover:opacity-80 transition focus:outline-none cursor-pointer"
              >
                <p className="text-xl font-bold text-white">{profile?.followers_count ?? 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">Followers</p>
              </button>
              <button
                onClick={() => openFollowModal("following")}
                className="text-center hover:opacity-80 transition focus:outline-none cursor-pointer"
              >
                <p className="text-xl font-bold text-white">{profile?.following_count ?? 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">Following</p>
              </button>
            </div>
          </div>

          {/* Posts Grid */}
          <div className="px-8 mt-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Music size={14} /> Music
            </h2>

            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Mic2 size={40} className="text-gray-700 mb-3" />
                <p className="text-gray-600 text-sm">No posts yet. Share your first beat or snippet.</p>
                <button
                  onClick={() => setShowPostForm(true)}
                  className="mt-4 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm
                    rounded-xl transition-all duration-200 hover:shadow-[0_0_16px_rgba(99,102,241,0.4)]"
                >
                  Upload Now
                </button>
              </div>
            ) : (
              <>
                {/* Click-outside backdrop — collapses expanded card, music keeps playing */}
                {expandedPostId && (
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setExpandedPostId(null)}
                  />
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-20">
                {posts.map(post => (
                  <div
                    key={post.id}
                    className={`group bg-white/5 border border-white/10 rounded-2xl overflow-hidden
                      hover:border-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]
                      transition-all duration-300 ${expandedPostId === post.id ? "col-span-full border-indigo-500/40 shadow-[0_0_24px_rgba(99,102,241,0.15)]" : ""}`}
                  >
                    {expandedPostId === post.id ? (
                      /* Expanded Player Card */
                      <div
                        className="relative flex flex-row overflow-hidden"
                        onClick={(e) => {
                          // Collapse when clicking the backdrop area (not interactive children)
                          if (e.target === e.currentTarget) setExpandedPostId(null)
                        }}
                      >
                        {/* Three-dot Menu */}
                        {isOwnProfile && (
                          <div className="absolute top-4 right-4 z-20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id)
                              }}
                              className="p-1.5 bg-black/40 hover:bg-black/60 text-gray-400 hover:text-white rounded-full transition"
                            >
                              <MoreVertical size={18} />
                            </button>
                            {activeMenuPostId === post.id && (
                              <div className="absolute right-0 mt-1 w-28 bg-slate-900 border border-white/10 rounded-xl shadow-xl py-1 z-30">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActiveMenuPostId(null)
                                    handleDeletePost(post.id)
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-white/5 transition text-left"
                                >
                                  <Trash2 size={12} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Blurred Background Extension */}
                        <div
                          className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 scale-110 pointer-events-none"
                          style={{ backgroundImage: `url(${post.cover_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150'})` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/80 to-indigo-950/40 pointer-events-none" />

                        {/* Cover Art — click to play/pause */}
                        <button
                          onClick={() => handlePlayPause(post)}
                          className="relative w-44 h-44 flex-shrink-0 bg-slate-900 flex items-center justify-center overflow-hidden z-10 self-center ml-4 rounded-xl group/art focus:outline-none"
                        >
                          {post.cover_url ? (
                            <img src={post.cover_url} alt="cover" className="w-full h-full object-cover" />
                          ) : (
                            <Music size={32} className="text-indigo-700" />
                          )}
                          {/* Play/Pause overlay — always visible, dims on hover */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/art:bg-black/50 transition-all duration-200">
                            <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center shadow-xl">
                              {isPlaying && activePostId === post.id
                                ? <Pause size={20} className="text-white" />
                                : <Play size={20} className="text-white ml-0.5" />
                              }
                            </div>
                          </div>
                        </button>

                        {/* Player Controls & Info */}
                        <div className="flex-1 p-4 flex flex-col gap-2 z-10 relative min-w-0">
                          {/* Track meta */}
                          <div className="flex items-center justify-between pr-10">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                                {POST_TYPE_LABELS[post.post_type] || post.post_type}
                              </span>
                              {post.visibility === 'private' && (
                                <span className="text-[9px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  Private
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
                              {post.genre || "General"}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-white line-clamp-1">{post.caption || "Untitled Track"}</h3>

                          {/* Waveform + play/pause + time */}
                          <WaveformPlayer post={post} isPlaying={isPlaying} handlePlayPause={() => handlePlayPause(post)} />

                          {/* Social actions + volume on one row */}
                          <div className="flex items-center justify-between pt-1 border-t border-white/5">
                            <div className="flex items-center gap-4">
                              <button onClick={() => toggleLike(post.id)} className={`flex items-center gap-1.5 text-xs font-medium transition ${likedPosts[post.id] ? "text-red-500" : "text-gray-400 hover:text-white"}`}>
                                <Heart size={15} fill={likedPosts[post.id] ? "currentColor" : "none"} />
                                <span>{likedPosts[post.id] ? 1 : 0}</span>
                              </button>
                              <button onClick={() => setShowCommentsId(showCommentsId === post.id ? null : post.id)} className={`flex items-center gap-1.5 text-xs font-medium transition ${showCommentsId === post.id ? "text-indigo-400" : "text-gray-400 hover:text-white"}`}>
                                <MessageSquare size={15} />
                                <span>{(postComments[post.id] || []).length}</span>
                              </button>
                              <button onClick={() => toggleRepost(post.id)} className={`flex items-center gap-1.5 text-xs font-medium transition ${repostedPosts[post.id] ? "text-green-500" : "text-gray-400 hover:text-white"}`}>
                                <Repeat size={15} />
                              </button>
                              <button onClick={() => toggleSave(post.id)} className={`flex items-center gap-1.5 text-xs font-medium transition ${savedPosts[post.id] ? "text-yellow-500" : "text-gray-400 hover:text-white"}`}>
                                <Bookmark size={15} fill={savedPosts[post.id] ? "currentColor" : "none"} />
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <Volume2 size={14} className="text-gray-400" />
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={volume}
                                onChange={handleVolumeChange}
                                className="w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Standard Grid Card — compact horizontal layout */
                      <div
                        className="flex items-center gap-3 p-3 relative cursor-pointer"
                        onClick={() => {
                          // If this post is already playing, just expand it without restarting
                          if (activePostId === post.id) {
                            setExpandedPostId(post.id)
                          } else {
                            handlePlayPause(post)
                          }
                        }}
                      >
                        {/* Square thumbnail — fixed 44×44, artwork is the play control */}
                        <div className="relative w-11 h-11 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-indigo-900/60 to-slate-800 flex items-center justify-center group/thumb">
                          {post.cover_url ? (
                            <img src={post.cover_url} alt="cover" className="w-full h-full object-cover" />
                          ) : (
                            <Music size={16} className="text-indigo-600" />
                          )}
                          {/* Play/Pause overlay on the thumbnail */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-all duration-200">
                            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md">
                              {activePostId === post.id && isPlaying
                                ? <Pause size={10} className="text-white" />
                                : <Play size={10} className="text-white ml-0.5" />
                              }
                            </div>
                          </div>
                        </div>

                        {/* Text info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide leading-none">
                              {POST_TYPE_LABELS[post.post_type] || post.post_type}
                            </span>
                            {post.visibility === 'private' && (
                              <span className="text-[9px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-1 rounded uppercase tracking-wider leading-none">
                                Private
                              </span>
                            )}
                            {post.genre && (
                              <span className="text-[10px] text-gray-600 leading-none">· {post.genre}</span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-200 truncate leading-snug">
                            {post.caption || "Untitled Track"}
                          </p>
                          <p className="text-[10px] text-gray-600 mt-0.5 leading-none">
                            {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>

                        {/* Three-dot menu — top-right of card */}
                        {isOwnProfile && (
                          <div className="relative flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id)
                              }}
                              className="p-1 text-gray-600 hover:text-gray-300 rounded-full transition"
                            >
                              <MoreVertical size={15} />
                            </button>
                            {activeMenuPostId === post.id && (
                              <div className="absolute right-0 mt-1 w-28 bg-slate-900 border border-white/10 rounded-xl shadow-xl py-1 z-30">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActiveMenuPostId(null)
                                    handleDeletePost(post.id)
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-white/5 transition text-left"
                                >
                                  <Trash2 size={12} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Comments Section (Expanded below the player) */}
                    {expandedPostId === post.id && showCommentsId === post.id && (
                      <div className="border-t border-white/5 bg-black/40 p-6 z-10 relative">
                        <h4 className="text-sm font-semibold text-gray-400 mb-4">Comments</h4>
                        <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
                          {(postComments[post.id] || []).length === 0 ? (
                            <p className="text-xs text-gray-600">No comments yet. Be the first to comment!</p>
                          ) : (
                            (postComments[post.id] || []).map(c => (
                              <div key={c.id} className="text-sm">
                                <span className="font-semibold text-indigo-400 mr-2">@{c.username}</span>
                                <span className="text-gray-300">{c.text}</span>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Write a comment..."
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            className="flex-1 border border-white/10 rounded-xl px-4 py-2 bg-white/5 text-slate-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 text-sm"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* New Post Modal */}
      {showPostForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-5 bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
              Upload Music
            </h3>

            <form onSubmit={handleCreatePost} className="flex flex-col gap-4">

              {/* Post type */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Type *</label>
                <div className="flex gap-2">
                  {[["beat", "Beat"], ["beat_snippet", "Snippet"], ["song_snippet", "Song Snippet"]].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPostType(val)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200
                        ${postType === val
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "border-white/10 text-gray-500 hover:border-indigo-500/40 hover:text-indigo-300"
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visibility */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Visibility</label>
                <div className="flex gap-2">
                  {[["public", "Public"], ["private", "Private"]].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPostVisibility(val)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200
                        ${postVisibility === val
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "border-white/10 text-gray-500 hover:border-indigo-500/40 hover:text-indigo-300"
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                placeholder="Caption"
                value={postCaption}
                onChange={e => setPostCaption(e.target.value)}
                className="border border-white/10 rounded-xl px-4 py-2.5 bg-white/5 text-slate-200
                  placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70
                  focus:border-transparent transition-all duration-200 text-sm"
              />

              <input
                type="text"
                placeholder="Genre (e.g. Trap)"
                value={postGenre}
                onChange={e => setPostGenre(e.target.value)}
                className="border border-white/10 rounded-xl px-4 py-2.5 bg-white/5 text-slate-200
                  placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70
                  focus:border-transparent transition-all duration-200 text-sm"
              />

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Audio File *</label>
                <label className="w-full flex items-center gap-3 px-4 py-2.5 bg-white/5 text-slate-300 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition duration-200 text-sm">
                  <Music size={16} className="text-gray-500" />
                  <span className="truncate">{uploadingFile ? "Uploading..." : postAudioUrl ? "Audio Uploaded ✓" : "Choose Audio File *"}</span>
                  <input
                    type="file"
                    accept="audio/*"
                    disabled={uploadingFile}
                    onChange={e => {
                      if (e.target.files[0]) handleFileUpload(e.target.files[0], setPostAudioUrl)
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Cover Image (optional)</label>
                <label className="w-full flex items-center gap-3 px-4 py-2.5 bg-white/5 text-slate-300 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition duration-200 text-sm">
                  <Image size={16} className="text-gray-500" />
                  <span className="truncate">{uploadingFile ? "Uploading..." : postCoverUrl ? "Cover Image Uploaded ✓" : "Choose Cover Image"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingFile}
                    onChange={e => handleImageSelect(e, 1, setPostCoverUrl)}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setShowPostForm(false)}
                  className="flex-1 border border-white/10 text-gray-400 hover:text-white
                    hover:border-white/20 py-2.5 rounded-xl transition-all duration-200 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPost}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50
                    disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl
                    transition-all duration-200 hover:shadow-[0_0_16px_rgba(99,102,241,0.4)] text-sm"
                >
                  {submittingPost ? "Uploading…" : "Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4 overflow-y-auto py-10">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl my-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
                Edit Profile
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-white transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditProfileSubmit} className="flex flex-col gap-4">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-full border-2 border-indigo-500/50 overflow-hidden bg-white/10 flex items-center justify-center">
                  {editAvatarUrl ? (
                    <img src={editAvatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl text-gray-600">👤</span>
                  )}
                </div>
                <label className="px-4 py-1.5 bg-white/5 text-slate-300 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition duration-200 text-xs">
                  <span>{uploadingFile ? "Uploading..." : "Change Profile Picture"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingFile}
                    onChange={e => handleImageSelect(e, 1, setEditAvatarUrl)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Banner Upload */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Profile Banner</label>
                <div className="h-24 w-full rounded-xl overflow-hidden bg-gradient-to-br from-indigo-900/60 via-slate-900 to-blue-900/40 border border-white/10 flex items-center justify-center relative">
                  {editCoverUrl && (
                    <img src={editCoverUrl} alt="banner" className="w-full h-full object-cover absolute inset-0 opacity-60" />
                  )}
                  <label className="relative z-10 px-4 py-1.5 bg-black/60 text-slate-300 rounded-xl border border-white/10 cursor-pointer hover:bg-black/80 transition duration-200 text-xs">
                    <span>{uploadingFile ? "Uploading..." : "Upload Banner Image"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingFile}
                      onChange={e => handleImageSelect(e, 3, setEditCoverUrl)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Display Name</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={e => setEditDisplayName(e.target.value)}
                  className="w-full border border-white/10 rounded-xl px-4 py-2 bg-white/5 text-slate-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 text-sm"
                />
              </div>

              {/* Username */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Username *</label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={e => setEditUsername(e.target.value.replace(/\s/g, "").toLowerCase())}
                  className="w-full border border-white/10 rounded-xl px-4 py-2 bg-white/5 text-slate-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 text-sm"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Bio</label>
                <textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  maxLength={200}
                  rows={2}
                  className="w-full border border-white/10 rounded-xl px-4 py-2 bg-white/5 text-slate-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 text-sm resize-none"
                />
              </div>

              {/* Role */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Role *</label>
                <div className="flex flex-wrap gap-1.5">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditRole(r)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200
                        ${editRole === r
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "border-white/10 text-gray-400 hover:border-indigo-500/50 hover:text-indigo-300"
                        }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genres */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Genres</label>
                <div className="flex flex-wrap gap-1.5">
                  {GENRE_OPTIONS.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleEditGenre(g)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-all duration-200
                        ${editGenres.includes(g)
                          ? "bg-blue-600/30 border-blue-500/60 text-blue-300"
                          : "border-white/10 text-gray-500 hover:border-blue-500/40 hover:text-blue-400"
                        }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 py-2 rounded-xl transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingProfile || uploadingFile}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-xl transition text-sm"
                >
                  {updatingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cropperImage && (
        <ImageCropper
          imageSrc={cropperImage}
          aspect={cropperAspect}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropperImage(null)}
        />
      )}

      {/* Followers / Following Modal */}
      {showFollowModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold capitalize text-white">
                {showFollowModal}
              </h3>
              <button
                onClick={() => setShowFollowModal(null)}
                className="text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search inside modal */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search..."
                value={followModalSearch}
                onChange={(e) => setFollowModalSearch(e.target.value)}
                className="w-full pl-4 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition"
              />
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingFollowModal ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-gray-500 text-xs">Loading...</p>
                </div>
              ) : followModalUsers.filter(u =>
                u.username.toLowerCase().includes(followModalSearch.toLowerCase()) ||
                (u.display_name && u.display_name.toLowerCase().includes(followModalSearch.toLowerCase()))
              ).length === 0 ? (
                <p className="text-center text-gray-500 text-xs py-10">No users found.</p>
              ) : (
                followModalUsers
                  .filter(u =>
                    u.username.toLowerCase().includes(followModalSearch.toLowerCase()) ||
                    (u.display_name && u.display_name.toLowerCase().includes(followModalSearch.toLowerCase()))
                  )
                  .map(u => {
                    const avatarFallback = u.display_name?.[0]?.toUpperCase() || u.username?.[0]?.toUpperCase() || "?"
                    const isSelf = u.id === parseInt(loggedInUserId, 10)
                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          setShowFollowModal(null)
                          if (String(u.id) === String(loggedInUserId)) {
                            navigate('/profile')
                          } else {
                            navigate(`/profile?id=${u.id}`)
                          }
                        }}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-white/10">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-indigo-400">{avatarFallback}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-bold text-white truncate">
                                {u.display_name || "Unknown Artist"}
                              </p>
                              {u.is_founder === true && <GoldBadge />}
                            </div>
                            <p className="text-[10px] text-gray-500">@{u.username}</p>
                          </div>
                        </div>

                        {/* Follow/Following & Message button inside modal */}
                        {!isSelf && (
                          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setShowFollowModal(null)
                                api.post("/social/conversations", {
                                  user_id: loggedInUserId,
                                  target_id: u.id
                                }).then(res => {
                                  if (res.data.success) {
                                    navigate(`/message?convId=${res.data.conversationId}`)
                                  }
                                }).catch(() => toast.error("Failed to start conversation."))
                              }}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 transition"
                            >
                              Message
                            </button>
                            <button
                              onClick={() => handleFollowModalToggle(u)}
                              className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                                u.is_following
                                  ? "bg-white/10 text-white border border-white/10 hover:bg-red-600/20 hover:text-red-400 hover:border-red-500/30"
                                  : "bg-indigo-600 text-white hover:bg-indigo-500"
                              }`}
                            >
                              {u.is_following ? "Following" : "Follow"}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default YourProfile