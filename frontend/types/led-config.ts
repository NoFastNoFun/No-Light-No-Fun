/**
 * Types for LED routing system configuration
 */

/** Base WebSocket message */
export interface WSMessage {
  type: string
}

/** Config packet message from eHub */
export interface ConfigPacketMessage extends WSMessage {
  type: "cfg"
  len: number
}

/** Art-Net message summary */
export interface ArtNetMessage extends WSMessage {
  ip: string
  universe: number
  channels: number
  ts: number
}

/** RGBW color values */
export interface RGBWColor {
  r: number
  g: number
  b: number
  w: number
}

/** Channel flags for RGBW */
export interface ChannelFlags {
  r: boolean
  g: boolean
  b: boolean
  w: boolean
}

/** Entity mapping configuration */
export interface Mapping {
  entityId: string
  ip: string
  universe: number
  startChannel: number
  flags: ChannelFlags
}

/** Complete configuration */
export interface Config {
  mappings: Mapping[]
}

/** Patch map entry */
export interface PatchEntry {
  fromChannel: number
  toChannel: number
}

/** Simulation payload */
export interface SimulatePayload {
  entityId: string
  color: RGBWColor
}

/** Configuration for a single receiver (LED controller) */
export interface ReceiverConfig {
  id: string
  name: string
  ipAddress: string
  port: number
  connected: boolean
  lastSeen?: Date
}

/** Configuration for a single controllable entity (LED strip, panel, etc.) */
export interface EntityConfig {
  id: string
  name: string
  receiverId: string
  type: string
  enabled: boolean
  dmxConfig: DMXConfig
  currentColor: RGBWColor
}

/** DMX configuration for an entity */
export interface DMXConfig {
  universe: number
  startChannel: number
  channelCount: number
  rgbwFilter: RGBWFilter
}

/** RGBW color filter */
export interface RGBWFilter {
  redMultiplier: number
  greenMultiplier: number
  blueMultiplier: number
  whiteMultiplier: number
  enabled: boolean
}

/** Patch map entry for channel remapping */
export interface PatchMap {
  id: string
  name: string
  entries: PatchEntry[]
}

/** System-wide settings */
export interface SystemSettings {
  websocketUrl: string
  apiBaseUrl: string
  autoReconnect: boolean
  monitoringInterval: number
  maxLogEntries: number
}

/** Complete system configuration */
export interface SystemConfig {
  receivers: ReceiverConfig[]
  entities: EntityConfig[]
  patchMaps: PatchMap[]
  activePatchMapId?: string
  settings: SystemSettings
}

export interface ConfigExport {
  version: string
  exportedAt: Date
  config: SystemConfig
  metadata: {
    receiverCount: number
    entityCount: number
    patchMapCount: number
  }
}
