import React, { useState, useEffect, useRef } from 'react'
import api from '../Api/Api.js'
import toast from 'react-hot-toast'
import { Plus, X, Trash2, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const GoldBadge = () => (
  <svg className="w-4 h-4 text-yellow-500 fill-current inline-block ml-1 shrink-0 align-middle" viewBox="0 0 24 24" title="Verified Artist">
    <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.69L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
  </svg>
)

export default function StoriesSection() {
  const navigate = useNavigate()
  const currentUserId = localStorage.getItem("user_id")
  const currentUserAvatar = localStorage.getItem("avatar")
  const currentUsername = localStorage.getItem("display_name") || "You"

  const [userStories, setUserStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  // Viewer Modal State
  const [activeUserIndex, setActiveUserIndex] = useState(null)
  const [activeStoryIndex, setActiveStoryIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    fetchStories()
  }, [currentUserId])

  const fetchStories = async () => {
    if (!currentUserId) {
      setLoading(false)
      return
    }
    try {
      const res = await api.get("/social/stories", {
        params: { user_id: currentUserId }
      })
      if (res.data.success) {
        setUserStories(res.data.userStories)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const isVideo = file.type.startsWith("video/")
    const formData = new FormData()
    formData.append("file", file)

    setUploading(true)
    try {
      const uploadRes = await api.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })

      if (uploadRes.data.success) {
        const media_url = uploadRes.data.url
        const res = await api.post("/social/stories", {
          user_id: currentUserId,
          media_url,
          media_type: isVideo ? "video" : "image"
        })
        if (res.data.success) {
          toast.success("Story posted!")
          fetchStories()
        }
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to post story.")
    } finally {
      setUploading(false)
    }
  }

  // Find own stories
  const ownStoryGroup = userStories.find(g => String(g.user_id) === String(currentUserId))

  // Open Viewer
  const openViewer = (userIdx) => {
    setActiveUserIndex(userIdx)
    setActiveStoryIndex(0)
    setProgress(0)
    setIsPaused(false)
    markCurrentViewed(userIdx, 0)
  }

  const markCurrentViewed = (userIdx, storyIdx) => {
    const storyGroup = userStories[userIdx]
    if (!storyGroup) return
    const currentStory = storyGroup.stories[storyIdx]
    if (currentStory && !currentStory.is_viewed) {
      api.post(`/social/stories/${currentStory.id}/view`, { user_id: currentUserId }).then(() => {
        // update local state
        setUserStories(prev => prev.map((g, i) => {
          if (i === userIdx) {
            const updatedStories = g.stories.map((s, j) => j === storyIdx ? { ...s, is_viewed: true } : s)
            const all_v = updatedStories.every(s => s.is_viewed)
            return { ...g, stories: updatedStories, all_viewed: all_v }
          }
          return g
        }))
      }).catch(console.error)
    }
  }

  // Progress Bar Auto-Advance Timer
  useEffect(() => {
    if (activeUserIndex === null) return
    if (isPaused) return

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNextStory()
          return 0
        }
        return prev + 2
      })
    }, 100)

    return () => clearInterval(interval)
  }, [activeUserIndex, activeStoryIndex, isPaused, userStories])

  const handleNextStory = () => {
    const currentGroup = userStories[activeUserIndex]
    if (!currentGroup) return

    if (activeStoryIndex < currentGroup.stories.length - 1) {
      const nextIdx = activeStoryIndex + 1
      setActiveStoryIndex(nextIdx)
      setProgress(0)
      markCurrentViewed(activeUserIndex, nextIdx)
    } else if (activeUserIndex < userStories.length - 1) {
      const nextUserIdx = activeUserIndex + 1
      setActiveUserIndex(nextUserIdx)
      setActiveStoryIndex(0)
      setProgress(0)
      markCurrentViewed(nextUserIdx, 0)
    } else {
      closeViewer()
    }
  }

  const handlePrevStory = () => {
    if (activeStoryIndex > 0) {
      const prevIdx = activeStoryIndex - 1
      setActiveStoryIndex(prevIdx)
      setProgress(0)
    } else if (activeUserIndex > 0) {
      const prevUserIdx = activeUserIndex - 1
      const prevGroup = userStories[prevUserIdx]
      setActiveUserIndex(prevUserIdx)
      setActiveStoryIndex(prevGroup.stories.length - 1)
      setProgress(0)
    }
  }

  const closeViewer = () => {
    setActiveUserIndex(null)
    setActiveStoryIndex(0)
    setProgress(0)
    setIsPaused(false)
  }

  const handleDeleteStory = async (storyId) => {
    try {
      const res = await api.delete(`/social/stories/${storyId}`, {
        data: { user_id: currentUserId }
      })
      if (res.data.success) {
        toast.success("Story deleted.")
        fetchStories()
        closeViewer()
      }
    } catch (error) {
      toast.error("Failed to delete story.")
    }
  }

  const activeGroup = activeUserIndex !== null ? userStories[activeUserIndex] : null
  const activeStory = activeGroup ? activeGroup.stories[activeStoryIndex] : null

  return (
    <div className="space-y-2">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* "+ Your Story" item */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 snap-start cursor-pointer group" onClick={handleUploadClick}>
          <div className="relative w-16 h-16 rounded-full p-0.5 border-2 border-dashed border-indigo-500/60 group-hover:border-indigo-400 transition flex items-center justify-center bg-slate-900 shadow-md">
            {currentUserAvatar ? (
              <img src={currentUserAvatar} alt="avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-indigo-950/50 flex items-center justify-center text-indigo-400 font-bold text-lg">
                {currentUsername?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg border-2 border-slate-950">
              <Plus size={12} />
            </div>
          </div>
          <span className="text-[10px] font-bold text-gray-300 truncate max-w-16 text-center">
            {uploading ? "Posting..." : "Your Story"}
          </span>
        </div>

        {/* User Story Circles */}
        {userStories.map((group, userIdx) => {
          const isOwn = String(group.user_id) === String(currentUserId)
          return (
            <div
              key={group.user_id}
              onClick={() => openViewer(userIdx)}
              className="flex flex-col items-center gap-1.5 shrink-0 snap-start cursor-pointer group"
            >
              <div className={`w-16 h-16 rounded-full p-0.5 transition duration-300 ${
                group.all_viewed
                  ? "bg-slate-700/60"
                  : "bg-linear-to-tr from-yellow-500 via-indigo-500 to-purple-600 animate-pulse"
              }`}>
                <div className="w-full h-full rounded-full p-0.5 bg-slate-950 overflow-hidden">
                  {group.avatar_url ? (
                    <img src={group.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-indigo-950/50 flex items-center justify-center text-indigo-400 font-bold text-base">
                      {group.display_name?.[0]?.toUpperCase() || group.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-semibold text-gray-300 truncate max-w-16 text-center">
                {isOwn ? "You" : (group.display_name || group.username)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Fullscreen Story Viewer Modal */}
      {activeStory && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          <div className="relative w-full max-w-sm h-[85vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between border border-white/10">
            {/* Top Progress Bars */}
            <div className="absolute top-0 left-0 right-0 p-3 z-30 space-y-2 bg-linear-to-b from-black/80 via-black/40 to-transparent">
              <div className="flex gap-1.5">
                {activeGroup.stories.map((s, idx) => (
                  <div key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-100 ease-linear"
                      style={{
                        width: idx < activeStoryIndex ? "100%" : idx === activeStoryIndex ? `${progress}%` : "0%"
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Story Header */}
              <div className="flex items-center justify-between">
                <div 
                  onClick={() => {
                    closeViewer()
                    if (String(activeGroup.user_id) === String(currentUserId)) navigate('/profile')
                    else navigate(`/profile?id=${activeGroup.user_id}`)
                  }}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 border border-white/20">
                    {activeGroup.avatar_url ? (
                      <img src={activeGroup.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-indigo-400">
                        {activeGroup.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-0.5">
                      {activeGroup.display_name || activeGroup.username}
                      {activeGroup.is_founder && <GoldBadge />}
                    </h5>
                    <p className="text-[9px] text-gray-400">
                      {new Date(activeStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {String(activeGroup.user_id) === String(currentUserId) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteStory(activeStory.id)
                      }}
                      className="text-gray-400 hover:text-red-400 transition p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button onClick={closeViewer} className="text-gray-400 hover:text-white transition p-1">
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Media Content */}
            <div className="w-full h-full flex items-center justify-center bg-black">
              {activeStory.media_type === "video" ? (
                <video
                  src={activeStory.media_url}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={activeStory.media_url}
                  alt="story"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Left / Right Nav Touch Controls */}
            <div
              onClick={handlePrevStory}
              className="absolute left-0 top-16 bottom-0 w-1/3 z-20 cursor-pointer"
            />
            <div
              onClick={handleNextStory}
              className="absolute right-0 top-16 bottom-0 w-2/3 z-20 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  )
}