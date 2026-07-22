import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import UserNavbar from '../components/UserNavbar'
import Sidebar from '../components/Sidebar'
import api from '../Api/Api.js'
import toast from 'react-hot-toast'
import { Bell, BellOff, Music } from 'lucide-react'

import { useNotifications } from '../context/NotificationContext.jsx'

const GoldBadge = () => (
  <svg className="w-4 h-4 text-yellow-500 fill-current inline-block ml-1.5 shrink-0 align-middle" viewBox="0 0 24 24" title="Verified Artist">
    <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.69L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
  </svg>
)

function Notifications() {
  const navigate = useNavigate()
  const currentUserId = localStorage.getItem("user_id")
  const { notifications, markAllAsRead, fetchNotifications } = useNotifications()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false)
      return
    }
    const init = async () => {
      await fetchNotifications()
      await markAllAsRead()
      setLoading(false)
    }
    init()
  }, [currentUserId])

  const formatTimestamp = (isoString) => {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <UserNavbar />

      <div className="flex">
        <Sidebar />

        {/* Main content — offset for sidebar */}
        <div className="ml-64 flex-1 p-8 pb-16">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 bg-linear-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
              <Bell className="w-6 h-6 text-indigo-400" /> Notifications
            </h1>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 text-sm">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white/5 border border-white/10 rounded-2xl">
                <BellOff size={40} className="text-gray-700 mb-3" />
                <p className="text-gray-400 text-sm font-medium">All caught up!</p>
                <p className="text-gray-600 text-xs mt-1">No new notifications at the moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map(n => {
                  const avatarFallback = n.display_name?.[0]?.toUpperCase() || n.username?.[0]?.toUpperCase() || "?"
                  return (
                    <div
                      key={n.id}
                      onClick={() => navigate(`/profile?id=${n.actor_id}`)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        !n.is_read
                          ? "bg-indigo-600/10 border-indigo-500/30 hover:bg-indigo-600/15"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {/* Actor Avatar */}
                      <div className="w-11 h-11 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow-md">
                        {n.avatar_url
                          ? <img src={n.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                          : <span className="text-lg font-bold text-indigo-400">{avatarFallback}</span>
                        }
                      </div>

                      {/* Notification Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 leading-relaxed">
                          <span 
                            onClick={(e) => {
                              e.stopPropagation()
                              if (String(n.actor_id) === String(currentUserId)) {
                                navigate('/profile')
                              } else {
                                navigate(`/profile?id=${n.actor_id}`)
                              }
                            }}
                            className="font-bold text-white hover:underline hover:text-indigo-400 inline-flex items-center gap-0.5"
                          >
                            {n.display_name || n.username || "Unknown Artist"}
                            {n.is_founder === true && <GoldBadge />}
                          </span>{" "}
                          <span className="text-gray-400">
                            {n.type === 'follow' ? "started following you." :
                             n.type === 'collab_request' ? "sent you a collaboration request." :
                             n.type === 'collab_accepted' ? "accepted your collaboration request." :
                             n.type === 'collab_declined' ? "declined your collaboration request." :
                             "sent you a message."}
                          </span>
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">
                          {formatTimestamp(n.created_at)}
                        </p>
                      </div>

                      {/* Unread Indicator Dot */}
                      {!n.is_read && (
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Notifications