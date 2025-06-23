"use client"

import type React from "react"
import { createContext, useContext, useReducer, useCallback } from "react"
import type { SystemConfig, ReceiverConfig, EntityConfig, PatchMap, SystemSettings } from "@/types/led-config"

/**
 * LED Configuration Context State
 */
interface LEDConfigState {
  config: SystemConfig
  loading: boolean
  error: string | null
}

/**
 * LED Configuration Context Actions
 */
type LEDConfigAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_CONFIG"; payload: SystemConfig }
  | { type: "ADD_RECEIVER"; payload: ReceiverConfig }
  | { type: "UPDATE_RECEIVER"; payload: ReceiverConfig }
  | { type: "REMOVE_RECEIVER"; payload: string }
  | { type: "ADD_ENTITY"; payload: EntityConfig }
  | { type: "UPDATE_ENTITY"; payload: EntityConfig }
  | { type: "REMOVE_ENTITY"; payload: string }
  | { type: "ADD_PATCH_MAP"; payload: PatchMap }
  | { type: "UPDATE_PATCH_MAP"; payload: PatchMap }
  | { type: "REMOVE_PATCH_MAP"; payload: string }
  | { type: "SET_ACTIVE_PATCH_MAP"; payload: string | undefined }
  | { type: "UPDATE_SETTINGS"; payload: Partial<SystemSettings> }

/**
 * LED Configuration Context Value
 */
interface LEDConfigContextValue {
  state: LEDConfigState
  addReceiver: (receiver: ReceiverConfig) => void
  updateReceiver: (receiver: ReceiverConfig) => void
  removeReceiver: (id: string) => void
  addEntity: (entity: EntityConfig) => void
  updateEntity: (entity: EntityConfig) => void
  removeEntity: (id: string) => void
  addPatchMap: (patchMap: PatchMap) => void
  updatePatchMap: (patchMap: PatchMap) => void
  removePatchMap: (id: string) => void
  setActivePatchMap: (id: string | undefined) => void
  updateSettings: (settings: Partial<SystemSettings>) => void
  loadConfig: () => Promise<void>
  saveConfig: () => Promise<void>
}

const LEDConfigContext = createContext<LEDConfigContextValue | undefined>(undefined)

/**
 * Default system configuration
 */
const defaultConfig: SystemConfig = {
  receivers: [],
  entities: [],
  patchMaps: [],
  activePatchMapId: undefined,
  settings: {
    websocketUrl: "ws://localhost:8080/ws",
    apiBaseUrl: "http://localhost:8080/api",
    autoReconnect: true,
    monitoringInterval: 1000,
    maxLogEntries: 1000,
  },
}

/**
 * LED Configuration reducer
 */
function ledConfigReducer(state: LEDConfigState, action: LEDConfigAction): LEDConfigState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload }

    case "SET_ERROR":
      return { ...state, error: action.payload }

    case "SET_CONFIG":
      return { ...state, config: action.payload, loading: false, error: null }

    case "ADD_RECEIVER":
      return {
        ...state,
        config: {
          ...state.config,
          receivers: [...state.config.receivers, action.payload],
        },
      }

    case "UPDATE_RECEIVER":
      return {
        ...state,
        config: {
          ...state.config,
          receivers: state.config.receivers.map((r) => (r.id === action.payload.id ? action.payload : r)),
        },
      }

    case "REMOVE_RECEIVER":
      return {
        ...state,
        config: {
          ...state.config,
          receivers: state.config.receivers.filter((r) => r.id !== action.payload),
          entities: state.config.entities.filter((e) => e.receiverId !== action.payload),
        },
      }

    case "ADD_ENTITY":
      return {
        ...state,
        config: {
          ...state.config,
          entities: [...state.config.entities, action.payload],
        },
      }

    case "UPDATE_ENTITY":
      return {
        ...state,
        config: {
          ...state.config,
          entities: state.config.entities.map((e) => (e.id === action.payload.id ? action.payload : e)),
        },
      }

    case "REMOVE_ENTITY":
      return {
        ...state,
        config: {
          ...state.config,
          entities: state.config.entities.filter((e) => e.id !== action.payload),
        },
      }

    case "ADD_PATCH_MAP":
      return {
        ...state,
        config: {
          ...state.config,
          patchMaps: [...state.config.patchMaps, action.payload],
        },
      }

    case "UPDATE_PATCH_MAP":
      return {
        ...state,
        config: {
          ...state.config,
          patchMaps: state.config.patchMaps.map((p) => (p.id === action.payload.id ? action.payload : p)),
        },
      }

    case "REMOVE_PATCH_MAP":
      return {
        ...state,
        config: {
          ...state.config,
          patchMaps: state.config.patchMaps.filter((p) => p.id !== action.payload),
          activePatchMapId:
            state.config.activePatchMapId === action.payload ? undefined : state.config.activePatchMapId,
        },
      }

    case "SET_ACTIVE_PATCH_MAP":
      return {
        ...state,
        config: {
          ...state.config,
          activePatchMapId: action.payload,
        },
      }

    case "UPDATE_SETTINGS":
      return {
        ...state,
        config: {
          ...state.config,
          settings: { ...state.config.settings, ...action.payload },
        },
      }

    default:
      return state
  }
}

/**
 * LED Configuration Provider Component
 */
export function LEDConfigProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(ledConfigReducer, {
    config: defaultConfig,
    loading: false,
    error: null,
  })

  /**
   * Load configuration from API
   */
  const loadConfig = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true })
    try {
      const response = await fetch(`${state.config.settings.apiBaseUrl}/config`)
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`)
      }
      const data = await response.json()
      dispatch({ type: "SET_CONFIG", payload: data })
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Unknown error" })
    }
  }, [state.config.settings.apiBaseUrl])

  /**
   * Save configuration to API
   */
  const saveConfig = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true })
    try {
      const response = await fetch(`${state.config.settings.apiBaseUrl}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.config),
      })
      if (!response.ok) {
        throw new Error(`Failed to save config: ${response.statusText}`)
      }
      dispatch({ type: "SET_LOADING", payload: false })
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Unknown error" })
    }
  }, [state.config])

  const contextValue: LEDConfigContextValue = {
    state,
    addReceiver: (receiver) => dispatch({ type: "ADD_RECEIVER", payload: receiver }),
    updateReceiver: (receiver) => dispatch({ type: "UPDATE_RECEIVER", payload: receiver }),
    removeReceiver: (id) => dispatch({ type: "REMOVE_RECEIVER", payload: id }),
    addEntity: (entity) => dispatch({ type: "ADD_ENTITY", payload: entity }),
    updateEntity: (entity) => dispatch({ type: "UPDATE_ENTITY", payload: entity }),
    removeEntity: (id) => dispatch({ type: "REMOVE_ENTITY", payload: id }),
    addPatchMap: (patchMap) => dispatch({ type: "ADD_PATCH_MAP", payload: patchMap }),
    updatePatchMap: (patchMap) => dispatch({ type: "UPDATE_PATCH_MAP", payload: patchMap }),
    removePatchMap: (id) => dispatch({ type: "REMOVE_PATCH_MAP", payload: id }),
    setActivePatchMap: (id) => dispatch({ type: "SET_ACTIVE_PATCH_MAP", payload: id }),
    updateSettings: (settings) => dispatch({ type: "UPDATE_SETTINGS", payload: settings }),
    loadConfig,
    saveConfig,
  }

  return <LEDConfigContext.Provider value={contextValue}>{children}</LEDConfigContext.Provider>
}

/**
 * Hook to use LED Configuration context
 */
export function useLEDConfig() {
  const context = useContext(LEDConfigContext)
  if (context === undefined) {
    throw new Error("useLEDConfig must be used within a LEDConfigProvider")
  }
  return context
}
