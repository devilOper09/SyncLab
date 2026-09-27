import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../Api/Api.js'
import toast from 'react-hot-toast'
import { Music, Mic2, Image, SkipForward } from 'lucide-react'
import ImageCropper from '../components/ImageCropper.jsx'

const ROLES = ["Producer", "Rapper", "Artist", "Vocalist", "Mixing Engineer"]
const GENRE_OPTIONS = ["Trap", "Drill", "R&B", "Hip-Hop", "Afrobeats", "Pop", "Lo-Fi", "Jazz", "Soul", "Electronic"]

function SetUpProfile() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Prefill from Google OAuth if available
  const user_id       = localStorage.getItem("user_id")
  const googleName    = localStorage.getItem("display_name") || ""
  const googleAvatar  = localStorage.getItem("avatar") || ""

  // Step 1 & 2 — profile fields
  const [displayName, setDisplayName] = useState(googleName)
  const [username, setUsername]       = useState("")
  const [role, setRole]               = useState("")
  const [bio, setBio]                 = useState("")
  const [genres, setGenres]           = useState([])
  const [avatarUrl, setAvatarUrl]     = useState(googleAvatar)
  const [avatarFile, setAvatarFile]   = useState(null)

  // Step 3 — first post fields
  const [postCaption,  setPostCaption]  = useState("")
  const [postGenre,    setPostGenre]    = useState("")
  const [postType,     setPostType]     = useState("beat")
  const [postAudioUrl, setPostAudioUrl] = useState("")
  const [postCoverUrl, setPostCoverUrl] = useState("")
  const [postVisibility, setPostVisibility] = useState("public")
  const [uploadingFile, setUploadingFile] = useState(false)

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
    if (cropperCallback === setAvatarUrl) {
      setAvatarFile(file)
      setAvatarUrl(URL.createObjectURL(file))
    } else if (cropperCallback) {
      await handleFileUpload(file, cropperCallback)
    }
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

  const toggleGenre = (g) => {
    setGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim()) {
      toast.error("Username is required.")
      return
    }
    if (!role) {
      toast.error("Role is required.")
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("user_id", user_id)
      formData.append("display_name", displayName.trim() || username)
      formData.append("username", username)
      formData.append("role", role)
      formData.append("bio", bio)
      formData.append("genres", JSON.stringify(genres))
      formData.append("avatar_url", avatarUrl && !avatarUrl.startsWith("blob:") ? avatarUrl : "")
      if (avatarFile) {
        formData.append("profilePicture", avatarFile)
      }
      const res = await api.post("/profile/setup", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      if (res.data.success) {
        localStorage.setItem("profile_complete", "true")
        localStorage.setItem("username", username)
        if (avatarUrl) localStorage.setItem("avatar", avatarUrl)
        if (displayName.trim()) localStorage.setItem("display_name", displayName.trim())
        toast.success("Profile saved!")
        setStep(3)
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to save profile."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleFirstPost = async (e) => {
    e.preventDefault()
    if (!postAudioUrl) {
      toast.error("Audio file is required to post. Or click 'Skip for now'.")
      return
    }
    setLoading(true)
    try {
      await api.post("/profile/post", {
        user_id,
        caption:   postCaption,
        genre:     postGenre,
        post_type: postType,
        audio_url: postAudioUrl,
        cover_url: postCoverUrl || null,
        visibility: postVisibility,
      })
      toast.success("First post uploaded! Welcome to SyncLab 🎵")
      navigate("/home")
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to post.")
    } finally {
      setLoading(false)
    }
  }

  const TOTAL_STEPS = 3
  const stepLabels = ["Identity", "Role & Bio", "First Post"]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
            {step === 3 ? "Share Your First Beat" : "Set Up Your Profile"}
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            {step === 3 ? "Let the community hear what you make" : "Tell the community who you are"}
          </p>

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mt-5">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`h-1.5 w-14 rounded-full transition-all duration-300 ${
                  step > i + 1 ? "bg-indigo-400" : step === i + 1 ? "bg-indigo-500" : "bg-white/10"
                }`} />
                <span className={`text-[10px] transition-colors duration-200 ${
                  step === i + 1 ? "text-indigo-400" : "text-gray-700"
                }`}>{stepLabels[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/60">

          {/* ── STEP 1 ── Identity */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              {/* Avatar preview */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-full border-2 border-indigo-500/50 overflow-hidden bg-white/10 flex items-center justify-center">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" onError={() => setAvatarUrl("")} />
                    : <span className="text-4xl text-gray-600">👤</span>
                  }
                </div>
                <label className="w-full flex flex-col items-center px-4 py-2 bg-white/5 text-slate-300 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition duration-200 text-sm">
                  <span>{uploadingFile ? "Uploading..." : avatarUrl ? "Change Profile Picture *" : "Upload Profile Picture *"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingFile}
                    onChange={e => handleImageSelect(e, 1, setAvatarUrl)}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Display Name <span className="text-gray-600">(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g. Tensick"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full border border-white/10 rounded-xl px-4 py-2.5 bg-white/5
                    text-slate-200 placeholder-gray-500 focus:outline-none focus:ring-2
                    focus:ring-indigo-500/70 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Username *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 select-none">@</span>
                  <input
                    type="text"
                    placeholder="tensick"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value.replace(/\s/g, "").toLowerCase())}
                    className="w-full border border-white/10 rounded-xl pl-8 pr-4 py-2.5 bg-white/5
                      text-slate-200 placeholder-gray-500 focus:outline-none focus:ring-2
                      focus:ring-indigo-500/70 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!username.trim()) { toast.error("Username is required."); return }
                  setStep(2)
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-500 transition-all duration-200
                  text-white font-semibold py-2.5 rounded-xl shadow-md
                  hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 2 ── Role & Bio */}
          {step === 2 && (
            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-5">
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Your Role *</label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200
                        ${role === r
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                          : "border-white/10 text-gray-400 hover:border-indigo-500/50 hover:text-indigo-300"
                        }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Bio <span className="text-gray-600">(optional)</span></label>
                <textarea
                  placeholder="Tell the world what you create…"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  maxLength={200}
                  rows={3}
                  className="w-full border border-white/10 rounded-xl px-4 py-2.5 bg-white/5
                    text-slate-200 placeholder-gray-500 focus:outline-none focus:ring-2
                    focus:ring-indigo-500/70 focus:border-transparent transition-all duration-200
                    resize-none text-sm"
                />
                <p className="text-right text-xs text-gray-600 mt-1">{bio.length}/200</p>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-2 block">Genres <span className="text-gray-600">(pick any)</span></label>
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGenre(g)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200
                        ${genres.includes(g)
                          ? "bg-blue-600/30 border-blue-500/60 text-blue-300"
                          : "border-white/10 text-gray-500 hover:border-blue-500/40 hover:text-blue-400"
                        }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border border-white/10 text-gray-400 hover:border-white/20
                    hover:text-white py-2.5 rounded-xl transition-all duration-200 text-sm"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !role}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50
                    disabled:cursor-not-allowed transition-all duration-200 text-white font-semibold
                    py-2.5 rounded-xl shadow-md hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                >
                  {loading ? "Saving…" : "Save Profile →"}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3 ── First Post */}
          {step === 3 && (
            <form onSubmit={handleFirstPost} className="flex flex-col gap-4">

              {/* Post type */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">What are you sharing?</label>
                <div className="flex gap-2">
                  {[["beat", "Beat"], ["beat_snippet", "Snippet"], ["song_snippet", "Song"]].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPostType(val)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all duration-200
                        ${postType === val
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]"
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
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all duration-200
                        ${postVisibility === val
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]"
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
                placeholder="Caption (optional)"
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

              <div className="flex flex-col gap-2">
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

              <div className="flex flex-col gap-2">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50
                  disabled:cursor-not-allowed transition-all duration-200 text-white font-semibold
                  py-2.5 rounded-xl shadow-md hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
              >
                {loading ? "Uploading…" : "Post & Enter SyncLab"}
              </button>

              {/* Skip */}
              <button
                type="button"
                onClick={() => { toast("You can post anytime from your profile."); navigate("/home") }}
                className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300
                  text-sm py-2 transition-colors duration-200"
              >
                <SkipForward size={14} /> Skip for now
              </button>
            </form>
          )}

        </div>
      </div>

      {cropperImage && (
        <ImageCropper
          imageSrc={cropperImage}
          aspect={cropperAspect}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropperImage(null)}
        />
      )}
    </div>
  )
}

export default SetUpProfile
