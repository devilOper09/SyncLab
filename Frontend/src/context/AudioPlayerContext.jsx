import React, { createContext, useContext, useState, useEffect, useRef } from 'react'

const AudioPlayerContext = createContext()

export const useAudioPlayer = () => useContext(AudioPlayerContext)

export const AudioPlayerProvider = ({ children }) => {
  const [activeTrack, setActiveTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const audioRef = useRef(null)

  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.volume = volume

    const handleTimeUpdate = () => {
      setCurrentTime(audioRef.current.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(audioRef.current.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audioRef.current.addEventListener("timeupdate", handleTimeUpdate)
    audioRef.current.addEventListener("loadedmetadata", handleLoadedMetadata)
    audioRef.current.addEventListener("ended", handleEnded)

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.removeEventListener("timeupdate", handleTimeUpdate)
        audioRef.current.removeEventListener("loadedmetadata", handleLoadedMetadata)
        audioRef.current.removeEventListener("ended", handleEnded)
      }
    }
  }, [])

  const playTrack = (track) => {
    if (!audioRef.current) return

    if (activeTrack?.id === track.id) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play().catch(err => console.log("Playback failed:", err))
        setIsPlaying(true)
      }
    } else {
      audioRef.current.pause()
      audioRef.current.src = track.audio_url
      audioRef.current.load()
      audioRef.current.play().catch(err => console.log("Playback failed:", err))
      setActiveTrack(track)
      setIsPlaying(true)
    }
  }

  const pauseTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const resumeTrack = () => {
    if (audioRef.current && activeTrack) {
      audioRef.current.play().catch(err => console.log("Playback failed:", err))
      setIsPlaying(true)
    }
  }

  const seekTrack = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const changeVolume = (vol) => {
    setVolume(vol)
    if (audioRef.current) {
      audioRef.current.volume = vol
    }
  }

  // Fully stops playback, resets position, and clears all state.
  // Use this for the X button — never just setActiveTrack(null).
  const stopTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current.src = ''
    }
    setActiveTrack(null)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }

  return (
    <AudioPlayerContext.Provider
      value={{
        activeTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        audioRef,
        playTrack,
        pauseTrack,
        resumeTrack,
        seekTrack,
        changeVolume,
        setActiveTrack,
        stopTrack,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  )
}
