import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import api from '../Api/Api.js'

const NotificationContext = createContext()

export const useNotifications = () => useContext(NotificationContext)

export const NotificationProvider = ({ children }) => {
  const currentUserId = localStorage.getItem("user_id")
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [pulse, setPulse] = useState(false)
  const prevUnreadCountRef = useRef(0)
  const pollingIntervalRef = useRef(null)

  const fetchNotifications = async () => {
    if (!currentUserId) return
    try {
      const res = await api.get("/social/notifications", {
        params: { user_id: currentUserId }
      })
      if (res.data.success) {
        const list = res.data.notifications
        setNotifications(list)
        const count = list.filter(n => !n.is_read).length
        
        if (count > prevUnreadCountRef.current) {
          // New notification arrived! Trigger pulse animation
          setPulse(true)
          setTimeout(() => setPulse(false), 2500)
        }
        
        prevUnreadCountRef.current = count
        setUnreadCount(count)
      }
    } catch (error) {
      console.error("Failed to fetch notifications in context:", error)
    }
  }

  const markAllAsRead = async () => {
    if (!currentUserId) return
    try {
      // Optimistic update
      setUnreadCount(0)
      prevUnreadCountRef.current = 0
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      
      await api.put("/social/notifications/read", { user_id: currentUserId })
    } catch (error) {
      console.error("Failed to mark notifications as read:", error)
      // Re-fetch to restore correct state on error
      fetchNotifications()
    }
  }

  // Poll notifications every 5 seconds
  useEffect(() => {
    if (!currentUserId) {
      setNotifications([])
      setUnreadCount(0)
      prevUnreadCountRef.current = 0
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
      return
    }

    fetchNotifications()

    pollingIntervalRef.current = setInterval(() => {
      fetchNotifications()
    }, 5000)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [currentUserId])

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      pulse,
      fetchNotifications,
      markAllAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  )
}
