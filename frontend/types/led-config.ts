/**
 * Core types for LED routing configuration system
 */

/** RGB color values (0-255) */
export interface RGBColor {
  r: number
  g: number
  b: number
}

/** RGBW color values (0-255) */
export interface RGBWColor extends RGBColor {
  w: number
}

/** DMX universe and channel configuration */
export interface DMXConfig {
  /** DMX universe number (1-32768) */
  universe: number
  /** Starting channel (1-512) */
  startChannel: number
  /** Channel count for this entity */
  channelCount: number
  /** RGBW filter configuration */
  rgbwFilter: RGBWFilter
}

/** RGBW filter settings for color mapping */
export interface RGBWFilter {
  /** Red channel multiplier (0-1) */
  redMultiplier: number
  /** Green channel multiplier (0-1) */
  greenMultiplier: number
  /** Blue channel multiplier (0-1) */
  blueMultiplier: number
  /** White channel multiplier (0-1) */
  whiteMultiplier: number
  /** Enable/disable filter */
  enabled: boolean
}

/** LED controller receiver configuration */
export interface ReceiverConfig {
  /** Unique receiver identifier */
  id: string
  /** Receiver IP address */
  ipAddress: string
  /** Receiver port (default: 6454 for ArtNet) */
  port: number
  /** Receiver name/label */
  name: string
  /** Connection status */
  connected: boolean
  /** Last seen timestamp */
  lastSeen?: Date
}

/** Entity configuration for LED control */
export interface EntityConfig {
  /** Unique entity identifier */
  id: string
  /** Entity name/label */
  name: string
  /** Assigned receiver ID */
  receiverId: string
  /** DMX configuration */
  dmxConfig: DMXConfig
  /** Current color state */
  currentColor: RGBWColor
  /** Entity enabled state */
  enabled: boolean
  /** Entity type/category */
  type: string
}

/** Patch map entry for DMX rerouting */
export interface PatchMapEntry {
  /** Source universe */
  sourceUniverse: number
  /** Source channel */
  sourceChannel: number
  /** Target universe */
  targetUniverse: number
  /** Target channel */
  targetChannel: number
  /** Patch entry enabled */
  enabled: boolean
  /** Optional description */
  description?: string
}

/** Complete patch map configuration */
export interface PatchMap {
  /** Unique patch map identifier */
  id: string
  /** Patch map name */
  name: string
  /** Patch map entries */
  entries: PatchMapEntry[]
  /** Global enable/disable for entire patch map */
  enabled: boolean
  /** Creation timestamp */
  createdAt: Date
  /** Last modified timestamp */
  modifiedAt: Date
}

/** WebSocket message types */
export type WebSocketMessageType = "entity_update" | "receiver_status" | "artnet_packet" | "system_status" | "error"

/** WebSocket message structure */
export interface WebSocketMessage<T = any> {
  /** Message type */
  type: WebSocketMessageType
  /** Message payload */
  payload: T
  /** Message timestamp */
  timestamp: Date
  /** Optional message ID */
  id?: string
}

/** Entity update message payload */
export interface EntityUpdatePayload {
  /** Entity ID */
  entityId: string
  /** New color values */
  color: RGBWColor
  /** Update timestamp */
  timestamp: Date
}

/** ArtNet packet summary for monitoring */
export interface ArtNetPacketSummary {
  /** Target universe */
  universe: number
  /** Packet size in bytes */
  size: number
  /** Number of channels */
  channelCount: number
  /** Target IP address */
  targetIp: string
  /** Packet timestamp */
  timestamp: Date
  /** Sequence number */
  sequence: number
}

/** System configuration state */
export interface SystemConfig {
  /** All receiver configurations */
  receivers: ReceiverConfig[]
  /** All entity configurations */
  entities: EntityConfig[]
  /** Active patch maps */
  patchMaps: PatchMap[]
  /** Currently active patch map ID */
  activePatchMapId?: string
  /** Global system settings */
  settings: SystemSettings
}

/** Global system settings */
export interface SystemSettings {
  /** WebSocket connection URL */
  websocketUrl: string
  /** API base URL */
  apiBaseUrl: string
  /** Auto-reconnect WebSocket */
  autoReconnect: boolean
  /** Monitoring update interval (ms) */
  monitoringInterval: number
  /** Maximum log entries to keep */
  maxLogEntries: number
}

/** API response wrapper */
export interface ApiResponse<T = any> {
  /** Response success status */
  success: boolean
  /** Response data */
  data?: T
  /** Error message if failed */
  error?: string
  /** Response timestamp */
  timestamp: Date
}

/** Configuration export format */
export interface ConfigExport {
  /** Export format version */
  version: string
  /** Export timestamp */
  exportedAt: Date
  /** System configuration */
  config: SystemConfig
  /** Export metadata */
  metadata: {
    /** Total receivers */
    receiverCount: number
    /** Total entities */
    entityCount: number
    /** Total patch maps */
    patchMapCount: number
  }
}
