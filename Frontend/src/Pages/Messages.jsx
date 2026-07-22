import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import UserNavbar from '../components/UserNavbar'
import Sidebar from '../components/Sidebar'
import api from '../Api/Api.js'
import toast from 'react-hot-toast'
import { Send, MessageSquare, User, Music, Check, CheckCheck } from 'lucide-react'

const GoldBadge = () => (
  <svg className="w-4 h-4 text-yellow-500 fill-current inline-block ml-1.5 shrink-0 align-middle" viewBox="0 0 24 24" title="Verified Artist">
    <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.69L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
  </svg>
)

function Messages() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentUserId = localStorage.getItem("user_id")
  const convIdParam = searchParams.get("convId")

  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [errorMsgs, setErrorMsgs] = useState(false)
  const [sending, setSending] = useState(false)

  const messagesEndRef = useRef(null)
  const pollingIntervalRef = useRef(null)

  // Fetch conversations on mount
  useEffect(() => {
    if (!currentUserId) {
      setLoadingConvs(false)
      return
    }
    fetchConversations()
  }, [currentUserId])

  // Handle active conversation selection based on query param or manual click
  useEffect(() => {
    if (convIdParam && conversations.length > 0) {
      const found = conversations.find(c => c.conversation_id === parseInt(convIdParam, 10))
      if (found) {
        if (!activeConv || activeConv.conversation_id !== found.conversation_id) {
          setActiveConv(found)
        }
      } else {
        // If not found in list, fetch conversations again to see if it was just created
        fetchConversations()
      }
    }
  }, [convIdParam, conversations, activeConv?.conversation_id])

  // Poll messages when active conversation changes
  useEffect(() => {
    const convId = activeConv?.conversation_id
    if (!convId) {
      setMessages([])
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
      return
    }

    fetchMessages(convId, true)

    // Set up polling every 3 seconds
    pollingIntervalRef.current = setInterval(() => {
      fetchMessages(convId, false)
    }, 3000)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [activeConv?.conversation_id])

  // Auto scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchConversations = async () => {
    try {
      const res = await api.get("/social/conversations", {
        params: { user_id: currentUserId }
      })
      if (res.data.success) {
        setConversations(res.data.conversations)
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to load conversations.")
    } finally {
      setLoadingConvs(false)
    }
  }

  const fetchMessages = async (convId, showLoading = false) => {
    if (showLoading) {
      setLoadingMsgs(true)
      setErrorMsgs(false)
    }
    try {
      const res = await api.get(`/social/conversations/${convId}/messages`, {
        params: { user_id: currentUserId }
      })
      if (res.data.success) {
        setMessages(res.data.messages)
        // Clear unread count locally for active conversation
        setConversations(prev =>
          prev.map(c =>
            c.conversation_id === convId ? { ...c, unread_count: 0 } : c
          )
        )
      } else {
        if (showLoading) setErrorMsgs(true)
      }
    } catch (error) {
      console.error(error)
      if (showLoading) setErrorMsgs(true)
    } finally {
      if (showLoading) setLoadingMsgs(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeConv || sending) return

    const text = newMessage.trim()
    setNewMessage("")
    setSending(true)

    // Optimistic message update
    const tempMsg = {
      id: Date.now(),
      conversation_id: activeConv.conversation_id,
      sender_id: parseInt(currentUserId, 10),
      message: text,
      created_at: new Date().toISOString(),
      is_read: false
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      const res = await api.post(`/social/conversations/${activeConv.conversation_id}/messages`, {
        sender_id: currentUserId,
        message: text
      })
      if (res.data.success) {
        // Replace optimistic message with real one
        setMessages(prev =>
          prev.map(m => m.id === tempMsg.id ? res.data.message : m)
        )
        // Update last message in conversation list
        setConversations(prev =>
          prev.map(c =>
            c.conversation_id === activeConv.conversation_id
              ? { ...c, last_message: text, last_message_time: res.data.message.created_at }
              : c
          ).sort((a, b) => new Date(b.last_message_time || 0) - new Date(a.last_message_time || 0))
        )
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to send message.")
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
    } finally {
      setSending(false)
    }
  }

  const formatTime = (isoString) => {
    if (!isoString) return ""
    const date = new Date(isoString)
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }

  const formatTimestamp = (isoString) => {
    if (!isoString) return ""
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "long" })
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      <UserNavbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main content — offset for sidebar */}
        <div className="ml-64 flex-1 flex overflow-hidden h-[calc(100vh-65px)]">
          {/* Left Sidebar: Conversations List */}
          <div className="w-80 border-r border-white/10 bg-black/40 flex flex-col shrink-0">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Messages</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingConvs ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-gray-500 text-xs">Loading chats...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <MessageSquare size={32} className="text-gray-700 mb-2" />
                  <p className="text-gray-500 text-xs font-medium">No conversations yet</p>
                  <p className="text-gray-600 text-[10px] mt-1">Search creators and click Message to start chatting.</p>
                </div>
              ) : (
                conversations.map(c => {
                  const avatarFallback = c.display_name?.[0]?.toUpperCase() || c.username?.[0]?.toUpperCase() || "?"
                  const isActive = activeConv?.conversation_id === c.conversation_id
                  return (
                    <div
                      key={c.conversation_id}
                      onClick={() => {
                        setActiveConv(c)
                        setSearchParams({ convId: c.conversation_id })
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        isActive
                          ? "bg-indigo-600/20 border border-indigo-500/30 text-white"
                          : "hover:bg-white/5 border border-transparent text-gray-300"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-white/10">
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-indigo-400">{avatarFallback}</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="font-bold text-xs truncate text-white">
                              {c.display_name || "Unknown Artist"}
                            </span>
                            {c.is_founder === true && <GoldBadge />}
                          </div>
                          {c.last_message_time && (
                            <span className="text-[9px] text-gray-500 shrink-0">
                              {formatTime(c.last_message_time)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-xs truncate ${c.unread_count > 0 ? "text-white font-semibold" : "text-gray-500"}`}>
                            {c.last_message || "No messages yet"}
                          </p>
                          {c.unread_count > 0 && (
                            <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.5)]">
                              {c.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Side: Active Chat Screen */}
          <div className="flex-1 flex flex-col bg-slate-950/40">
            {activeConv ? (
              <>
                {/* Chat Header */}
                <div
                  onClick={() => navigate(`/profile?id=${activeConv.user_id}`)}
                  className="p-4 border-b border-white/10 flex items-center gap-3 bg-black/20 cursor-pointer hover:bg-black/30 transition"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-white/10">
                    {activeConv.avatar_url ? (
                      <img src={activeConv.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-md font-bold text-indigo-400">
                        {activeConv.display_name?.[0]?.toUpperCase() || activeConv.username?.[0]?.toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <h3 className="text-sm font-bold text-white">
                        {activeConv.display_name || "Unknown Artist"}
                      </h3>
                      {activeConv.is_founder === true && <GoldBadge />}
                    </div>
                    <p className="text-[10px] text-gray-500">@{activeConv.username}</p>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {errorMsgs ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <p className="text-red-400 text-sm font-medium mb-3">Failed to load messages.</p>
                      <button
                        onClick={() => fetchMessages(activeConv.conversation_id, true)}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                      >
                        Retry
                      </button>
                    </div>
                  ) : loadingMsgs ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-gray-500 text-xs">Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <MessageSquare size={32} className="text-indigo-400 mb-2" />
                      <p className="text-gray-400 text-sm font-medium">Start the conversation.</p>
                    </div>
                  ) : (
                    messages.map((m, index) => {
                      const isMe = m.sender_id === parseInt(currentUserId, 10)
                      const prevMsg = messages[index - 1]
                      const showDateHeader = !prevMsg || formatTimestamp(prevMsg.created_at) !== formatTimestamp(m.created_at)

                      return (
                        <div key={m.id} className="flex flex-col">
                          {showDateHeader && (
                            <div className="flex justify-center my-4">
                              <span className="text-[9px] font-semibold text-gray-500 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                                {formatTimestamp(m.created_at)}
                              </span>
                            </div>
                          )}

                          <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-md ${
                              isMe
                                ? "bg-indigo-600 text-white rounded-tr-none"
                                : "bg-white/5 border border-white/10 text-gray-200 rounded-tl-none"
                            }`}>
                              <p className="leading-relaxed break-words">{m.message}</p>
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className="text-[8px] text-white/60">
                                  {formatTime(m.created_at)}
                                </span>
                                {isMe && (
                                  m.is_read ? (
                                    <CheckCheck size={10} className="text-indigo-300" />
                                  ) : (
                                    <Check size={10} className="text-white/40" />
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Form */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-black/20 flex gap-2">
                  <input
                    type="text"
                    placeholder="Message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 border border-white/10 rounded-xl px-4 py-2.5 bg-white/5 text-slate-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                  <MessageSquare size={32} className="text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Your Messages</h3>
                <p className="text-gray-500 text-sm max-w-xs mt-1">
                  Send private photos and messages to a friend or group.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Messages
