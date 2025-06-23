"use client"

import type React from "react"
import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react"
import type { WebSocketMessage, WebSocketMessageType } from "@/types/led-config"
import { useLEDConfig } from "./led-config-context"

/**
 * WebSocket connection states
 */
type WebSocketState = "connecting" | "connected" | "disconnected" | "error"

/**
 * WebSocket context value
 */
interface WebSocketContextValue {
  /** Current connection state */
  state: WebSocketState
  /** Recent messages (limited by maxLogEntries) */
  messages: WebSocketMessage[]
  /** Send message through WebSocket */
  sendMessage: <T>(type: WebSocketMessageType, payload: T) => void
  /** Subscribe to specific message types */
  subscribe: (type: WebSocketMessageType, callback: (message: WebSocketMessage) => void) => () => void
  /** Manually reconnect */
  reconnect: () => void
  /** Connection statistics */
  stats: {
    messagesReceived: number
    messagesSent: number
    reconnectAttempts: number
    lastConnected?: Date
  }
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined)

/**
 * WebSocket Provider Component
 * Manages WebSocket connection and message handling
 */
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { state: configState } = useLEDConfig()
  const [wsState, setWsState] = useState<WebSocketState>("disconnected")
  const [messages, setMessages] = useState<WebSocketMessage[]>([])
  const [stats, setStats] = useState({
    messagesReceived: 0,
    messagesSent: 0,
    reconnectAttempts: 0,
    lastConnected: undefined as Date | undefined,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const subscribersRef = useRef<Map<WebSocketMessageType, Set<(message: WebSocketMessage) => void>>>(new Map())
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setWsState("connecting")

    try {
      const ws = new WebSocket(configState.config.settings.websocketUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setWsState("connected")
        reconnectAttemptsRef.current = 0
        setStats((prev) => ({
          ...prev,
          lastConnected: new Date(),
          reconnectAttempts: reconnectAttemptsRef.current,
        }))
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          message.timestamp = new Date(message.timestamp)

          // Add to messages list (limited by maxLogEntries)
          setMessages((prev) => {
            const newMessages = [message, ...prev]
            return newMessages.slice(0, configState.config.settings.maxLogEntries)
          })

          // Update stats
          setStats((prev) => ({ ...prev, messagesReceived: prev.messagesReceived + 1 }))

          // Notify subscribers
          const subscribers = subscribersRef.current.get(message.type)
          if (subscribers) {
            subscribers.forEach((callback) => callback(message))
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error)
        }
      }

      ws.onclose = () => {
        setWsState("disconnected")

        // Auto-reconnect if enabled
        if (configState.config.settings.autoReconnect && reconnectAttemptsRef.current < 10) {
          reconnectAttemptsRef.current++
          setStats((prev) => ({ ...prev, reconnectAttempts: reconnectAttemptsRef.current }))

          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
          reconnectTimeoutRef.current = setTimeout(connect, delay)
        }
      }

      ws.onerror = () => {
        setWsState("error")
      }
    } catch (error) {
      setWsState("error")
      console.error("WebSocket connection error:", error)
    }
  }, [
    configState.config.settings.websocketUrl,
    configState.config.settings.autoReconnect,
    configState.config.settings.maxLogEntries,
  ])

  /**
   * Send message through WebSocket
   */
  const sendMessage = useCallback(<T,>(type: WebSocketMessageType, payload: T) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage<T> = {
        type,
        payload,
        timestamp: new Date(),
        id: crypto.randomUUID(),
      }

      wsRef.current.send(JSON.stringify(message))
      setStats((prev) => ({ ...prev, messagesSent: prev.messagesSent + 1 }))
    }
  }, [])

  /**
   * Subscribe to specific message types
   */
  const subscribe = useCallback((type: WebSocketMessageType, callback: (message: WebSocketMessage) => void) => {
    if (!subscribersRef.current.has(type)) {
      subscribersRef.current.set(type, new Set())
    }
    subscribersRef.current.get(type)!.add(callback)

    // Return unsubscribe function
    return () => {
      const subscribers = subscribersRef.current.get(type)
      if (subscribers) {
        subscribers.delete(callback)
        if (subscribers.size === 0) {
          subscribersRef.current.delete(type)
        }
      }
    }
  }, [])

  /**
   * Manually reconnect
   */
  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
    }

    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])

  // Connect on mount and when WebSocket URL changes
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

  const contextValue: WebSocketContextValue = {
    state: wsState,
    messages,
    sendMessage,
    subscribe,
    reconnect,
    stats,
  }

  return <WebSocketContext.Provider value={contextValue}>{children}</WebSocketContext.Provider>
}

/**
 * Hook to use WebSocket context
 */
export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider")
  }
  return context
}
