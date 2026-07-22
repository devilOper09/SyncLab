import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import UserNavbar from '../components/UserNavbar'
import Sidebar from '../components/Sidebar'
import api from '../Api/Api.js'
import toast from 'react-hot-toast'
import { Search as SearchIcon, Users, UserPlus, UserCheck, Music } from 'lucide-react'

const ROLE_COLORS = {
  Producer: "bg-indigo-600/30 text-indigo-300 border-indigo-500/40",
  Rapper: "bg-red-600/20 text-red-300 border-red-500/40",
  Artist: "bg-purple-600/20 text-purple-300 border-purple-500/40",
  Vocalist: "bg-pink-600/20 text-pink-300 border-pink-500/40",
  "Mixing Engineer": "bg-green-600/20 text-green-300 border-green-500/40",
}

const ROLES = ["Producer", "Rapper", "Artist", "Vocalist", "Mixing Engineer"]

const GoldBadge = () => (
  <svg className="w-4 h-4 text-yellow-500 fill-current inline-block ml-1.5 shrink-0 align-middle" viewBox="0 0 24 24" title="Verified Artist">
    <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.69L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
  </svg>
)

function Search() {
  const navigate = useNavigate()
  const currentUserId = localStorage.getItem("user_id")

  const [query, setQuery] = useState("")
  const [selectedRole, setSelectedRole] = useState("")
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  // Debounced search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchUsers()
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [query, selectedRole])

  const fetchUsers = async () => {
    if (!currentUserId) return
    setLoading(true)
    try {
      const res = await api.get("/follow/search", {
        params: {
          q: query,
          role: selectedRole,
          user_id: currentUserId
        }
      })
      if (res.data.success) {
        setUsers(res.data.users)
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to search users.")
    } finally {
      setLoading(false)
    }
  }

  const handleFollowToggle = async (e, targetUser) => {
    e.stopPropagation() // Prevent navigating to profile when clicking follow button
    if (!currentUserId) {
      toast.error("Please log in first.")
      return
    }

    const isFollowing = targetUser.is_following
    const targetId = targetUser.id

    // Optimistic UI update
    setUsers(prevUsers =>
      prevUsers.map(u => {
        if (u.id === targetId) {
          return {
            ...u,
            is_following: !isFollowing,
            followers_count: isFollowing ? u.followers_count - 1 : u.followers_count + 1
          }
        }
        return u;
      })
    )

    try {
      if (isFollowing) {
        const res = await api.delete(`/follow/${targetId}`, {
          data: { user_id: currentUserId }
        })
        if (res.data.success) {
          toast.success(`Unfollowed @${targetUser.username}`)
        } else {
          throw new Error()
        }
      } else {
        const res = await api.post(`/follow/${targetId}`, {
          user_id: currentUserId
        })
        if (res.data.success) {
          toast.success(`Following @${targetUser.username}`)
        } else {
          throw new Error()
        }
      }
    } catch (error) {
      // Revert optimistic update on error
      setUsers(prevUsers =>
        prevUsers.map(u => {
          if (u.id === targetId) {
            return {
              ...u,
              is_following: isFollowing,
              followers_count: isFollowing ? u.followers_count + 1 : u.followers_count - 1
            }
          }
          return u;
        })
      )
      toast.error("Failed to update follow status.")
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <UserNavbar />

      <div className="flex">
        <Sidebar />

        {/* Main content — offset for sidebar */}
        <div className="ml-64 flex-1 p-8 pb-16">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 bg-linear-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
              Discover Creators
            </h1>

            {/* Search Input */}
            <div className="relative mb-6">
              <SearchIcon className="absolute left-4 top-3.5 text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by username, display name, or role..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200"
              />
            </div>

            {/* Role Filters */}
            <div className="flex flex-wrap gap-2 mb-8">
              <button
                onClick={() => setSelectedRole("")}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                  selectedRole === ""
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                    : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                All Roles
              </button>
              {ROLES.map(role => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                    selectedRole === role
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                      : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Results */}
            {loading && users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 text-sm">Searching creators...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white/5 border border-white/10 rounded-2xl">
                <Users size={40} className="text-gray-700 mb-3" />
                <p className="text-gray-400 text-sm font-medium">No users found</p>
                <p className="text-gray-600 text-xs mt-1">Try adjusting your search query or filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map(user => {
                  const avatarFallback = user.display_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || "?"
                  return (
                    <div
                      key={user.id}
                      onClick={() => {
                        if (String(user.id) === String(currentUserId)) {
                          navigate('/profile')
                        } else {
                          navigate(`/profile?id=${user.id}`)
                        }
                      }}
                      className="group bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start gap-4 hover:border-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.05)] transition-all duration-300 cursor-pointer"
                    >
                      {/* Avatar */}
                      <div className="w-14 h-14 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow-md">
                        {user.avatar_url
                          ? <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                          : <span className="text-xl font-bold text-indigo-400">{avatarFallback}</span>
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors duration-200 truncate">
                            {user.display_name || "Unknown Artist"}
                          </h3>
                          {user.is_founder === true && <GoldBadge />}
                        </div>
                        <p className="text-xs text-gray-500">@{user.username}</p>

                        {/* Role Tag */}
                        {user.role && (
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-1.5 ${ROLE_COLORS[user.role] || "bg-white/10 text-gray-300 border-white/10"}`}>
                            {user.role}
                          </span>
                        )}

                        {/* Bio */}
                        <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                          {user.bio || "No bio yet."}
                        </p>

                        {/* Followers Count */}
                        <p className="text-[10px] text-gray-500 mt-3 font-medium">
                          {user.followers_count || 0} {user.followers_count === 1 ? "follower" : "followers"}
                        </p>
                      </div>

                      {/* Follow Button */}
                      <button
                        onClick={(e) => handleFollowToggle(e, user)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 shrink-0 flex items-center gap-1.5 ${
                          user.is_following
                            ? "bg-white/10 text-white border border-white/10 hover:bg-red-600/20 hover:text-red-400 hover:border-red-500/30"
                            : "bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                        }`}
                      >
                        {user.is_following ? (
                          <>
                            <UserCheck size={13} />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlus size={13} />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
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

export default Search