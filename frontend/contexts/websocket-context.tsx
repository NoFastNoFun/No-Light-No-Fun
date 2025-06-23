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

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || ""
    const wsUrl = baseUrl
      ? `${baseUrl.replace(/^http/, "ws")}/api/ws`
      : process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/api/ws"

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

          // Handle null/undefined message or missing properties
          if (!message || typeof message !== "object") {
            console.warn("Received invalid WebSocket message:", message)
            return
          }

          if (message.type === "cfg") {
            const configMsg = message as ConfigPacketMessage
            const safeConfigMsg: ConfigPacketMessage = {
              type: "cfg",
              len: configMsg?.len || 0,
            }
            setConfigPackets((prev) => [safeConfigMsg, ...(prev || []).slice(0, 99)])
            setStats((prev) => ({
              ...prev,
              totalConfigPackets: (prev?.totalConfigPackets || 0) + 1,
              lastConfigPacketSize: safeConfigMsg.len,
            }))
          } else {
            const artNetMsg = message as ArtNetMessage
            const safeArtNetMsg: ArtNetMessage = {
              ip: artNetMsg?.ip || "unknown",
              universe: artNetMsg?.universe || 0,
              channels: artNetMsg?.channels || 0,
              ts: artNetMsg?.ts || Date.now(),
            }
            setArtNetMessages((prev) => [safeArtNetMsg, ...(prev || []).slice(0, 99)])
            setStats((prev) => ({
              ...prev,
              totalArtNetMessages: (prev?.totalArtNetMessages || 0) + 1,
            }))
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error)
        }
      }

      ws.onclose = () => {
        setConnected(false)

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
        configPackets: configPackets || [],
        artNetMessages: artNetMessages || [],
        reconnect,
        stats: stats || { totalConfigPackets: 0, totalArtNetMessages: 0, lastConfigPacketSize: 0 },
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
