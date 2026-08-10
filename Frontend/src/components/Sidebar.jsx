import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { User, Users, Bell, TrendingUp, Music, Search, Handshake } from 'lucide-react'
import { useNotifications } from '../context/NotificationContext.jsx'

function Sidebar() {
  const { pathname } = useLocation()
  const { unreadCount, pulse } = useNotifications()

  const sidebarLink = (to, label, Icon) => {
    const isActive = pathname === to
    const isNotification = to === "/notification"

    return (
      <li>
        <Link
          to={to}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
            ${isActive
              ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
              : "text-gray-400 hover:bg-white/5 hover:text-indigo-300 border border-transparent"
            }`}
        >
          <div className="relative flex items-center justify-center">
            <Icon size={18} />
          </div>
          <span>{label}</span>
          {isNotification && unreadCount > 0 && (
            <span
              className={`ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center transition-all duration-300 scale-100 shadow-md shadow-red-500/20 ${
                pulse ? "animate-pulse scale-110" : ""
              }`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      </li>
    )
  }

  return (
    <div className="w-64 h-[calc(100vh-65px)] bg-black/90 backdrop-blur-md text-white p-4 flex flex-col fixed left-0 top-[65px] border-r border-white/10 z-40">
      <ul className="space-y-2">
        {sidebarLink("/profile", "Your Profile", User)}
        {sidebarLink("/collabs", "Collab Requests", Handshake)}
        {sidebarLink("/artists", "Artists", Users)}
        {sidebarLink("/notification", "Notifications", Bell)}
        {sidebarLink("/trending", "Trending", TrendingUp)}
        {/* {sidebarLink("/snippets", "Snippets", Music)} */}
        {sidebarLink("/search", "Search", Search)}
      </ul>
    </div>
  )
}

export default Sidebar