import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import UserNavbar from '../components/UserNavbar'
import Sidebar from '../components/Sidebar'
import api from '../Api/Api.js'
import toast from 'react-hot-toast'
import { Users, UserPlus, UserCheck, Search } from 'lucide-react'

const GoldBadge = () => (
  <svg className="w-4 h-4 text-yellow-500 fill-current inline-block ml-1.5 shrink-0 align-middle" viewBox="0 0 24 24" title="Verified Artist">
    <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.69L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
  </svg>
)

function Artists() {
  const navigate = useNavigate()
  const currentUserId = localStorage.getItem("user_id")
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")

  useEffect(() => {
    fetchUsers()
  }, [query])

  const fetchUsers = async () => {
    try {
      const res = await api.get("/follow/search", {
        params: { q: query, user_id: currentUserId }
      })
      if (res.data.success) {
        setUsers(res.data.users)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollowToggle = async (e, targetUser) => {
    e.stopPropagation()
    if (!currentUserId) {
      toast.error("Please log in first.")
      return
    }

    const isFollowing = targetUser.is_following
    const targetId = targetUser.id

    setUsers(prev => prev.map(u => u.id === targetId ? { ...u, is_following: !isFollowing } : u))

    try {
      if (isFollowing) {
        await api.delete(`/follow/${targetId}`, { data: { user_id: currentUserId } })
        toast.success(`Unfollowed @${targetUser.username}`)
      } else {
        await api.post(`/follow/${targetId}`, { user_id: currentUserId })
        toast.success(`Following @${targetUser.username}`)
      }
    } catch {
      setUsers(prev => prev.map(u => u.id === targetId ? { ...u, is_following: isFollowing } : u))
      toast.error("Failed to update follow status.")
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <UserNavbar />
      <div className="flex">
        <Sidebar />
        <div className="ml-64 flex-1 p-8 pb-16">
          <div className="max-w-5xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold bg-linear-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-400" /> Featured Artists
            </h1>

            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search artists..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {users.map(u => (
                  <div
                    key={u.id}
                    onClick={() => {
                      if (String(u.id) === String(currentUserId)) navigate('/profile')
                      else navigate(`/profile?id=${u.id}`)
                    }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center hover:border-white/20 hover:-translate-y-1 transition duration-300 shadow-lg cursor-pointer"
                  >
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-800 border border-white/10 mb-3">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-950 text-indigo-400 font-bold text-2xl">
                          {u.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-1">
                      {u.display_name || u.username}
                      {u.is_founder && <GoldBadge />}
                    </h4>
                    <p className="text-xs text-gray-400">@{u.username}</p>
                    {u.role && (
                      <span className="mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {u.role}
                      </span>
                    )}
                    <button
                      onClick={e => handleFollowToggle(e, u)}
                      className={`mt-4 w-full py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                        u.is_following ? "bg-white/10 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"
                      }`}
                    >
                      {u.is_following ? <UserCheck size={12} /> : <UserPlus size={12} />}
                      {u.is_following ? "Following" : "Follow"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Artists