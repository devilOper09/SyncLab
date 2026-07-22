import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import UserNavbar from '../components/UserNavbar'
import Sidebar from '../components/Sidebar'
import api from '../Api/Api.js'
import toast from 'react-hot-toast'
import { Users, Send, CheckCircle2, XCircle, Clock, MessageSquare, Plus, Trash2 } from 'lucide-react'

const GoldBadge = () => (
  <svg className="w-4 h-4 text-yellow-500 fill-current inline-block ml-1.5 shrink-0 align-middle" viewBox="0 0 24 24" title="Verified Artist">
    <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.69L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
  </svg>
)

const ROLES = ["Producer", "Rapper", "Singer", "Mixing Engineer", "Mastering Engineer", "Artist"]

function CollabRequests() {
  const navigate = useNavigate()
  const currentUserId = localStorage.getItem("user_id")
  const [tab, setTab] = useState("incoming") // 'incoming' | 'outgoing'
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSendModal, setShowSendModal] = useState(false)

  // Send collab modal state
  const [searchUserQuery, setSearchUserQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [beatName, setBeatName] = useState("")
  const [message, setMessage] = useState("")
  const [role, setRole] = useState("Producer")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false)
      return
    }
    fetchCollabs()
  }, [currentUserId])

  const fetchCollabs = async () => {
    try {
      const res = await api.get("/social/collabs", {
        params: { user_id: currentUserId }
      })
      if (res.data.success) {
        setIncoming(res.data.incoming)
        setOutgoing(res.data.outgoing)
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to load collaboration requests.")
    } finally {
      setLoading(false)
    }
  }

  // User search for new collab modal
  useEffect(() => {
    if (!searchUserQuery.trim()) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get("/follow/search", {
          params: { q: searchUserQuery, user_id: currentUserId }
        })
        if (res.data.success) {
          setSearchResults(res.data.users)
        }
      } catch (err) {
        console.error(err)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchUserQuery, currentUserId])

  const handleUpdateStatus = async (requestId, status) => {
    try {
      const res = await api.put(`/social/collabs/${requestId}/status`, {
        user_id: currentUserId,
        status
      })
      if (res.data.success) {
        toast.success(`Request ${status.toLowerCase()}!`)
        fetchCollabs()
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to update status.")
    }
  }

  const handleCancelRequest = async (requestId) => {
    try {
      const res = await api.delete(`/social/collabs/${requestId}`, {
        data: { user_id: currentUserId }
      })
      if (res.data.success) {
        toast.success("Request cancelled.")
        fetchCollabs()
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to cancel request.")
    }
  }

  const handleSendRequest = async (e) => {
    e.preventDefault()
    if (!selectedUser) {
      toast.error("Please select a user to send request to.")
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post("/social/collabs", {
        sender_id: currentUserId,
        receiver_id: selectedUser.id,
        beat_name: beatName,
        message,
        role
      })
      if (res.data.success) {
        toast.success(`Collab request sent to @${selectedUser.username}!`)
        setShowSendModal(false)
        setSelectedUser(null)
        setBeatName("")
        setMessage("")
        setSearchUserQuery("")
        fetchCollabs()
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to send collab request.")
    } finally {
      setSubmitting(false)
    }
  }

  const navigateProfile = (targetUserId) => {
    if (String(targetUserId) === String(currentUserId)) {
      navigate('/profile')
    } else {
      navigate(`/profile?id=${targetUserId}`)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <UserNavbar />

      <div className="flex">
        <Sidebar />

        <div className="ml-64 flex-1 p-8 pb-16">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold bg-linear-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
                  <Users className="w-6 h-6 text-indigo-400" /> Collaboration Requests
                </h1>
                <p className="text-xs text-gray-400 mt-1">
                  Connect with producers, rappers, singers, and engineers to create music together.
                </p>
              </div>

              <button
                onClick={() => setShowSendModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <Plus size={16} /> New Request
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 gap-6">
              <button
                onClick={() => setTab("incoming")}
                className={`pb-3 text-sm font-bold transition-colors relative ${
                  tab === "incoming" ? "text-indigo-400" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Incoming ({incoming.length})
                {tab === "incoming" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setTab("outgoing")}
                className={`pb-3 text-sm font-bold transition-colors relative ${
                  tab === "outgoing" ? "text-indigo-400" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Outgoing ({outgoing.length})
                {tab === "outgoing" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                )}
              </button>
            </div>

            {/* List Content */}
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : tab === "incoming" ? (
              incoming.length === 0 ? (
                <div className="py-16 text-center bg-white/5 border border-white/10 rounded-2xl">
                  <p className="text-gray-400 text-sm">No incoming collaboration requests.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {incoming.map((req) => (
                    <div key={req.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => navigateProfile(req.sender_id)}
                            className="w-12 h-12 rounded-full bg-slate-800 border border-white/10 overflow-hidden cursor-pointer hover:opacity-80 transition shrink-0"
                          >
                            {req.avatar_url ? (
                              <img src={req.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-indigo-950/40 text-indigo-400 font-bold">
                                {req.display_name?.[0]?.toUpperCase() || req.username?.[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 
                              onClick={() => navigateProfile(req.sender_id)}
                              className="font-bold text-white text-sm cursor-pointer hover:text-indigo-400 transition flex items-center gap-1"
                            >
                              {req.display_name || req.username}
                              {req.is_founder && <GoldBadge />}
                            </h4>
                            <p className="text-xs text-gray-400">@{req.username}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            Role: {req.role}
                          </span>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            req.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                            req.status === 'Accepted' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                            'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      </div>

                      {req.beat_name && (
                        <p className="text-xs font-semibold text-indigo-300">
                          Track / Beat: <span className="text-white">{req.beat_name}</span>
                        </p>
                      )}

                      {req.message && (
                        <p className="text-xs text-gray-300 bg-white/5 p-3 rounded-xl border border-white/5 italic">
                          "{req.message}"
                        </p>
                      )}

                      {req.status === 'Pending' && (
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'Accepted')}
                            className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <CheckCircle2 size={14} /> Accept
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'Declined')}
                            className="px-4 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <XCircle size={14} /> Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              outgoing.length === 0 ? (
                <div className="py-16 text-center bg-white/5 border border-white/10 rounded-2xl">
                  <p className="text-gray-400 text-sm">No outgoing collaboration requests.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {outgoing.map((req) => (
                    <div key={req.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => navigateProfile(req.receiver_id)}
                            className="w-12 h-12 rounded-full bg-slate-800 border border-white/10 overflow-hidden cursor-pointer hover:opacity-80 transition shrink-0"
                          >
                            {req.avatar_url ? (
                              <img src={req.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-indigo-950/40 text-indigo-400 font-bold">
                                {req.display_name?.[0]?.toUpperCase() || req.username?.[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 
                              onClick={() => navigateProfile(req.receiver_id)}
                              className="font-bold text-white text-sm cursor-pointer hover:text-indigo-400 transition flex items-center gap-1"
                            >
                              {req.display_name || req.username}
                              {req.is_founder && <GoldBadge />}
                            </h4>
                            <p className="text-xs text-gray-400">@{req.username}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            Role: {req.role}
                          </span>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            req.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                            req.status === 'Accepted' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                            'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      </div>

                      {req.beat_name && (
                        <p className="text-xs font-semibold text-indigo-300">
                          Track / Beat: <span className="text-white">{req.beat_name}</span>
                        </p>
                      )}

                      {req.message && (
                        <p className="text-xs text-gray-300 bg-white/5 p-3 rounded-xl border border-white/5 italic">
                          "{req.message}"
                        </p>
                      )}

                      {req.status === 'Pending' && (
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            onClick={() => handleCancelRequest(req.id)}
                            className="px-4 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <Trash2 size={14} /> Cancel Request
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

          </div>
        </div>
      </div>

      {/* Send Collab Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4 relative">
            <h3 className="text-xl font-bold text-white">Send Collaboration Request</h3>

            {/* Select User */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400">Search Artist / Producer</label>
              {selectedUser ? (
                <div className="flex items-center justify-between p-3 bg-indigo-600/10 border border-indigo-500/30 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 shrink-0">
                      {selectedUser.avatar_url ? (
                        <img src={selectedUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-950 text-indigo-400 text-xs font-bold">
                          {selectedUser.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">@{selectedUser.username}</h5>
                      <p className="text-[10px] text-gray-400">{selectedUser.role}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="text-gray-400 hover:text-white text-xs"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type username..."
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-white/10 rounded-xl shadow-xl max-h-40 overflow-y-auto z-10">
                      {searchResults.map(u => (
                        <div
                          key={u.id}
                          onClick={() => {
                            setSelectedUser(u)
                            setSearchResults([])
                            setSearchUserQuery("")
                          }}
                          className="p-2.5 hover:bg-white/10 cursor-pointer flex items-center gap-2 text-xs"
                        >
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-800">
                            {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : null}
                          </div>
                          <span className="font-bold text-white">@{u.username}</span>
                          <span className="text-[10px] text-gray-400">({u.role})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Beat Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Track / Beat Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Dark Trap Beat 140BPM"
                value={beatName}
                onChange={(e) => setBeatName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Requested Role */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Requested Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Message</label>
              <textarea
                placeholder="Describe what you want to collaborate on..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 h-24 resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSendRequest}
                disabled={submitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-xl text-xs font-bold transition"
              >
                {submitting ? "Sending..." : "Send Request"}
              </button>
              <button
                onClick={() => setShowSendModal(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2 rounded-xl text-xs font-bold border border-white/10 transition"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

export default CollabRequests