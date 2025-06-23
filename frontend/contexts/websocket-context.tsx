"use client"

import type React from "react"

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react"
import type { WSMessage, ConfigPacketMessage, ArtNetMessage } from "@/types/led-config"

interface WebSocketContextValue {
  connected: boolean
  configPackets: ConfigPacketMessage[]
  artNetMessages: ArtNetMessage[]
  reconnect: () => void
  stats: {
    totalConfigPackets: number
    totalArtNetMessages: number
    lastConfigPacketSize: number
  }
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false)
  const [configPackets, setConfigPackets] = useState<ConfigPacketMessage[]>([])
  const [artNetMessages, setArtNetMessages] = useState<ArtNetMessage[]>([])
  const [stats, setStats] = useState({
    totalConfigPackets: 0,
    totalArtNetMessages: 0,
    lastConfigPacketSize: 0,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/api/ws"

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data)

          if (message.type === "cfg") {
            const configMsg = message as ConfigPacketMessage
            setConfigPackets((prev) => [configMsg, ...prev.slice(0, 99)]) // Keep last 100
            setStats((prev) => ({
              ...prev,
              totalConfigPackets: prev.totalConfigPackets + 1,
              lastConfigPacketSize: configMsg.len,
            }))
          } else {
            // Art-Net message (has ip, universe, channels, ts)
            const artNetMsg = message as ArtNetMessage
            setArtNetMessages((prev) => [artNetMsg, ...prev.slice(0, 99)]) // Keep last 100
            setStats((prev) => ({
              ...prev,
              totalArtNetMessages: prev.totalArtNetMessages + 1,
            }))
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error)
        }
      }

      ws.onclose = () => {
        setConnected(false)

        // Auto-reconnect with exponential backoff
        if (reconnectAttemptsRef.current < 10) {
          reconnectAttemptsRef.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
          reconnectTimeoutRef.current = setTimeout(connect, delay)
        }
      }

      ws.onerror = () => {
        setConnected(false)
      }
    } catch (error) {
      console.error("WebSocket connection error:", error)
      setConnected(false)
    }
  }, [])

  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
    }
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  return (
    <WebSocketContext.Provider
      value={{
        connected,
        configPackets,
        artNetMessages,
        reconnect,
        stats,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error("useWebSocket must be used within WebSocketProvider")
  }
  return context
}
