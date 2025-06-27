/**
 * Types for LED routing system configuration
 */

/** Base WebSocket message */
export interface WSMessage {
  type: string;
}

/** Config packet message from eHub */
export interface ConfigPacketMessage extends WSMessage {
  type: "cfg";
  len: number;
}

/** Art-Net message summary */
export interface ArtNetMessage extends WSMessage {
  ip: string;
  universe: number;
  channels: number;
  ts: number;
}

/** RGBW color values */
export interface RGBWColor {
  r: number;
  g: number;
  b: number;
  w: number;
}

/** RGB color values (for faker) */
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/** Channel flags for RGBW */
export interface ChannelFlags {
  r: boolean;
  g: boolean;
  b: boolean;
  w: boolean;
}

/** Group configuration */
export interface Group {
  [key: string]: any;
}

/** Universe configuration */
export interface Universe {
  [key: string]: any;
}

/** Route configuration */
export interface Route {
  [key: string]: any;
}

/** Mapping entry (auto-generated) */
export interface MappingEntry {
  [key: string]: any;
}

/** Patch entry */
export interface PatchEntry {
  from: number;
  to: number;
}

/** Complete backend configuration */
export interface BackendConfig {
  groups: Group;
  universes: Universe;
  routes: Route[];
  mapping: MappingEntry[];
  patch: PatchEntry[];
  max_fps: number;
  ehub_port: number;
  artnet_port: number;
  monitor_ehub: boolean;
  monitor_dmx: boolean;
  monitor_artnet_rx: boolean;
}

/** Stream configuration */
export interface StreamConfig {
  file: File;
  fps?: number;
  brightness?: number;
  rotate?: 0 | 90 | 180 | 270;
  serpentine?: boolean;
  loop?: boolean;
}

/** Monitor settings */
export interface MonitorSettings {
  monitor_ehub: boolean;
  monitor_dmx: boolean;
  monitor_artnet_rx: boolean;
}

/** Legacy types for compatibility */
export interface Mapping {
  entityId: number;
  name: string;
  ip: string;
  universe: number;
  startChannel: number;
  channelCount: number;
  flags: ChannelFlags;
}

export interface Config {
  mappings: Mapping[];
  udpPort?: number;
  defaultUniverse?: number;
  maxFps?: number;
}

/** Simulation payload */
export interface SimulatePayload {
  entityId: string;
  color: RGBWColor;
}

/** Configuration for a single receiver (LED controller) */
export interface ReceiverConfig {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  connected: boolean;
  lastSeen?: Date;
}

/** Configuration for a single controllable entity (LED strip, panel, etc.) */
export interface EntityConfig {
  id: string;
  name: string;
  receiverId: string;
  type: string;
  enabled: boolean;
  dmxConfig: DMXConfig;
  currentColor: RGBWColor;
}

/** DMX configuration for an entity */
export interface DMXConfig {
  universe: number;
  startChannel: number;
  channelCount: number;
  rgbwFilter: RGBWFilter;
}

/** RGBW color filter */
export interface RGBWFilter {
  redMultiplier: number;
  greenMultiplier: number;
  blueMultiplier: number;
  whiteMultiplier: number;
  enabled: boolean;
}

/** Patch map entry for channel remapping */
export interface PatchMap {
  id: string;
  name: string;
  entries: PatchEntry[];
}

/** System-wide settings */
export interface SystemSettings {
  websocketUrl: string;
  apiBaseUrl: string;
  autoReconnect: boolean;
  monitoringInterval: number;
  maxLogEntries: number;
}

/** Complete system configuration */
export interface SystemConfig {
  receivers: ReceiverConfig[];
  entities: EntityConfig[];
  patchMaps: PatchMap[];
  activePatchMapId?: string;
  settings: SystemSettings;
}

export interface ConfigExport {
  version: string;
  exportedAt: Date;
  config: SystemConfig;
  metadata: {
    receiverCount: number;
    entityCount: number;
    patchMapCount: number;
  };
}

/**
 * Available faker pattern modes.
 */
export type FakerMode = "solid" | "chase" | "fill" | "gradient";

/**
 * Inclusive LED-entity range.
 */
export interface Range {
  from: number;
  to: number;
}

/**
 * Payload accepted by the backend `/api/faker` endpoint.
 */
export interface FakerConfig {
  mode: FakerMode;
  from: number;
  to: number;
  color: [number, number, number];
  brightness: number;
  fps?: number;
  multi?: Array<Range>;
}
