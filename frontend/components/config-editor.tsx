"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, Plus, Save, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Config, Mapping, BackendConfig, BackendMapping } from "@/types/led-config"
import { validateIp, validateUniverse, validateChannel } from "@/lib/utils"
import { apiFetch } from "@/lib/api"

export function ConfigEditor() {
  const [config, setConfig] = useState<Config>({ mappings: [] })
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [newMapping, setNewMapping] = useState<Partial<Mapping>>({
    entityId: 1,
    name: "",
    ip: "",
    universe: 0,
    startChannel: 1,
    channelCount: 4,
    flags: { r: true, g: true, b: true, w: false },
  })
  const { toast } = useToast()

  /**
   * Generate a name from entity ID if not provided
   */
  const generateNameFromEntityId = (entityId: number | string): string => {
    if (typeof entityId === "string") {
      // If it's already a descriptive string, use it
      return entityId
    }
    return `Entity ${entityId}`
  }

  /**
   * Convert backend mapping format to frontend format
   */
  const convertBackendMapping = (backendMapping: BackendMapping): Mapping => {
    console.log("🔄 Converting backend mapping:", backendMapping)

    // Convert entity_id to integer
    let entityId: number
    if (typeof backendMapping.entity_id === "string") {
      // Try to parse as number, if it fails, generate a hash or use index
      const parsed = Number.parseInt(backendMapping.entity_id, 10)
      if (isNaN(parsed)) {
        // Generate a simple hash from string
        entityId = Math.abs(
          backendMapping.entity_id.split("").reduce((a, b) => {
            a = (a << 5) - a + b.charCodeAt(0)
            return a & a
          }, 0),
        )
      } else {
        entityId = parsed
      }
    } else {
      entityId = backendMapping.entity_id || 1
    }

    const converted: Mapping = {
      entityId: entityId,
      name: generateNameFromEntityId(backendMapping.entity_id),
      ip: backendMapping.controller_ip || "",
      universe: backendMapping.universe ?? 0,
      startChannel: backendMapping.channel_start ?? 1,
      channelCount: backendMapping.channel_count ?? 4,
      flags: {
        r: backendMapping.use_r ?? true,
        g: backendMapping.use_g ?? true,
        b: backendMapping.use_b ?? true,
        w: backendMapping.use_w ?? false,
      },
    }

    console.log("✅ Converted to frontend mapping:", converted)
    return converted
  }

  /**
   * Convert frontend mapping format to backend format
   */
  const convertFrontendMapping = (frontendMapping: Mapping): BackendMapping => {
    return {
      entity_id: frontendMapping.entityId,
      controller_ip: frontendMapping.ip,
      universe: frontendMapping.universe,
      channel_start: frontendMapping.startChannel,
      channel_count: frontendMapping.channelCount,
      use_r: frontendMapping.flags.r,
      use_g: frontendMapping.flags.g,
      use_b: frontendMapping.flags.b,
      use_w: frontendMapping.flags.w,
    }
  }

  /**
   * Convert backend config format to frontend format
   */
  const convertBackendConfig = (backendConfig: BackendConfig): Config => {
    console.log("🔄 Converting backend config:", backendConfig)

    if (!backendConfig) {
      console.log("❌ No backend config provided, returning empty config")
      return { mappings: [] }
    }

    console.log("📋 Backend mappings:", backendConfig.mappings)
    console.log("📋 Is mappings an array?", Array.isArray(backendConfig.mappings))

    if (!Array.isArray(backendConfig.mappings)) {
      console.log("❌ Backend mappings is not an array")
      return {
        mappings: [],
        udpPort: backendConfig.udp_port,
        defaultUniverse: backendConfig.default_universe,
        maxFps: backendConfig.max_fps,
      }
    }

    const mappings = backendConfig.mappings.map((mapping, index) => {
      console.log(`🔄 Converting mapping ${index}:`, mapping)
      return convertBackendMapping(mapping)
    })

    const converted: Config = {
      mappings,
      udpPort: backendConfig.udp_port,
      defaultUniverse: backendConfig.default_universe,
      maxFps: backendConfig.max_fps,
    }

    console.log("✅ Final converted frontend config:", converted)
    return converted
  }

  /**
   * Convert frontend config format to backend format
   */
  const convertFrontendConfig = (frontendConfig: Config): BackendConfig => {
    return {
      mappings: (frontendConfig?.mappings || []).map(convertFrontendMapping),
      patches: null,
      udp_port: frontendConfig.udpPort || 6454,
      default_universe: frontendConfig.defaultUniverse || 0,
      max_fps: frontendConfig.maxFps || 30,
    }
  }

  const loadConfig = async () => {
    console.log("🚀 Starting config load...")
    setLoading(true)
    try {
      console.log("📡 Fetching config from backend...")
      const backendData = await apiFetch<BackendConfig>("config")
      console.log("📦 Raw backend response:", backendData)

      // Store debug info
      setDebugInfo({
        rawBackend: backendData,
        timestamp: new Date().toISOString(),
        responseType: typeof backendData,
        responseKeys: Object.keys(backendData || {}),
      })

      console.log("🔄 Starting conversion...")
      const frontendConfig = convertBackendConfig(backendData)
      console.log("✅ Conversion complete. Frontend config:", frontendConfig)

      console.log("💾 Setting config state...")
      setConfig(frontendConfig)
      console.log("✅ Config state set successfully")

      toast({
        title: "Config loaded successfully",
        description: `Loaded ${frontendConfig.mappings.length} mappings`,
      })
    } catch (error) {
      console.error("❌ Error loading config:", error)
      setConfig({ mappings: [] })
      setDebugInfo({
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      })
      toast({
        title: "Error loading config",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    setLoading(true)
    try {
      const backendConfig = convertFrontendConfig(config)
      console.log("💾 Saving backend config:", backendConfig)

      await apiFetch<void>("config", {
        method: "POST",
        body: JSON.stringify(backendConfig),
      })
      toast({ title: "Config saved successfully" })
    } catch (error) {
      console.error("❌ Error saving config:", error)
      toast({
        title: "Error saving config",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addMapping = () => {
    if (
      !newMapping.entityId ||
      !newMapping.name ||
      !newMapping.ip ||
      newMapping.universe === undefined ||
      !newMapping.startChannel
    ) {
      toast({ title: "Please fill all required fields", variant: "destructive" })
      return
    }

    if (!validateIp(newMapping.ip)) {
      toast({ title: "Invalid IP address format", variant: "destructive" })
      return
    }

    if (!validateUniverse(newMapping.universe)) {
      toast({ title: "Universe must be between 0-200", variant: "destructive" })
      return
    }

    if (!validateChannel(newMapping.startChannel)) {
      toast({ title: "Start channel must be between 1-512", variant: "destructive" })
      return
    }

    const mapping: Mapping = {
      entityId: newMapping.entityId!,
      name: newMapping.name!,
      ip: newMapping.ip!,
      universe: newMapping.universe!,
      startChannel: newMapping.startChannel!,
      channelCount: newMapping.channelCount || 4,
      flags: newMapping.flags!,
    }

    setConfig((prev) => ({
      ...prev,
      mappings: [...(prev?.mappings || []), mapping],
    }))

    // Generate next entity ID
    const nextEntityId = Math.max(...(config.mappings.map((m) => m.entityId) || [0])) + 1

    setNewMapping({
      entityId: nextEntityId,
      name: "",
      ip: "",
      universe: 0,
      startChannel: 1,
      channelCount: 4,
      flags: { r: true, g: true, b: true, w: false },
    })
  }

  const removeMapping = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      mappings: (prev?.mappings || []).filter((_, i) => i !== index),
    }))
  }

  const updateMapping = (index: number, updates: Partial<Mapping>) => {
    setConfig((prev) => ({
      ...prev,
      mappings: (prev?.mappings || []).map((mapping, i) => (i === index ? { ...mapping, ...updates } : mapping)),
    }))
  }

  useEffect(() => {
    loadConfig()
  }, [])

  // Safe access to mappings array
  const mappings = config?.mappings || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Configuration Editor</h2>
        <div className="flex gap-2">
          <Button onClick={loadConfig} variant="outline" disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload
          </Button>
          <Button onClick={saveConfig} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Save Config
          </Button>
        </div>
      </div>

      {/* Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Mappings</Label>
              <div className="text-2xl font-bold">{mappings.length}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">UDP Port</Label>
              <div className="text-2xl font-bold">{config.udpPort || "N/A"}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Default Universe</Label>
              <div className="text-2xl font-bold">{config.defaultUniverse ?? "N/A"}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Max FPS</Label>
              <div className="text-2xl font-bold">{config.maxFps || "N/A"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Info */}
      {process.env.NODE_ENV === "development" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">🔍 Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div>
                <strong>Frontend mappings count:</strong> {mappings.length}
              </div>
              {debugInfo && (
                <div>
                  <strong>Backend response ({debugInfo.timestamp}):</strong>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(debugInfo.rawBackend, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Mapping
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="entity-id">Entity ID</Label>
              <Input
                id="entity-id"
                type="number"
                min="1"
                placeholder="1"
                value={newMapping.entityId || ""}
                onChange={(e) => setNewMapping((prev) => ({ ...prev, entityId: Number.parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div>
              <Label htmlFor="entity-name">Name</Label>
              <Input
                id="entity-name"
                placeholder="Projecteur"
                value={newMapping.name || ""}
                onChange={(e) => setNewMapping((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="ip">Controller IP</Label>
              <Input
                id="ip"
                placeholder="198.168.1.45"
                value={newMapping.ip || ""}
                onChange={(e) => setNewMapping((prev) => ({ ...prev, ip: e.target.value }))}
                className={newMapping.ip && !validateIp(newMapping.ip) ? "border-red-500" : ""}
              />
            </div>
            <div>
              <Label htmlFor="universe">Universe (0-200)</Label>
              <Input
                id="universe"
                type="number"
                min="0"
                max="200"
                placeholder="200"
                value={newMapping.universe ?? ""}
                onChange={(e) => setNewMapping((prev) => ({ ...prev, universe: Number.parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="start-channel">Start Channel</Label>
              <Input
                id="start-channel"
                type="number"
                min="1"
                max="512"
                placeholder="1"
                value={newMapping.startChannel || ""}
                onChange={(e) =>
                  setNewMapping((prev) => ({ ...prev, startChannel: Number.parseInt(e.target.value) || 1 }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="channel-count">Channel Count</Label>
              <Input
                id="channel-count"
                type="number"
                min="1"
                max="512"
                placeholder="4"
                value={newMapping.channelCount || ""}
                onChange={(e) =>
                  setNewMapping((prev) => ({ ...prev, channelCount: Number.parseInt(e.target.value) || 4 }))
                }
              />
            </div>
            <div>
              <Label>Channel Usage</Label>
              <div className="flex gap-4 mt-2">
                {(["r", "g", "b", "w"] as const).map((flag) => (
                  <div key={flag} className="flex items-center space-x-2">
                    <Checkbox
                      id={`flag-${flag}`}
                      checked={newMapping.flags?.[flag] || false}
                      onCheckedChange={(checked) =>
                        setNewMapping((prev) => ({
                          ...prev,
                          flags: { ...prev.flags!, [flag]: checked },
                        }))
                      }
                    />
                    <Label htmlFor={`flag-${flag}`} className="uppercase">
                      {flag === "r" ? "Red" : flag === "g" ? "Green" : flag === "b" ? "Blue" : "White"}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={addMapping} className="w-full">
            Add Mapping
          </Button>
        </CardContent>
      </Card>

      {/* Existing Mappings */}
      <Card>
        <CardHeader>
          <CardTitle>Current Mappings ({mappings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {mappings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No mappings configured. Add a mapping to get started.</p>
              {debugInfo?.rawBackend?.mappings && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  <p className="font-semibold text-yellow-800">⚠️ Debug Info:</p>
                  <p className="text-yellow-700">
                    Backend returned {debugInfo.rawBackend.mappings.length} mappings, but frontend shows 0.
                  </p>
                  <p className="text-yellow-700">Check the console logs for conversion details.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {mappings.map((mapping, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Entity ID</Label>
                      <Input
                        type="number"
                        min="1"
                        value={mapping?.entityId || ""}
                        onChange={(e) => updateMapping(index, { entityId: Number.parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Name</Label>
                      <Input
                        value={mapping?.name || ""}
                        onChange={(e) => updateMapping(index, { name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Controller IP</Label>
                      <Input
                        value={mapping?.ip || ""}
                        onChange={(e) => updateMapping(index, { ip: e.target.value })}
                        className={mapping?.ip && !validateIp(mapping.ip) ? "border-red-500" : ""}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Universe</Label>
                      <Input
                        type="number"
                        min="0"
                        max="200"
                        value={mapping?.universe ?? ""}
                        onChange={(e) => updateMapping(index, { universe: Number.parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Start Ch</Label>
                      <Input
                        type="number"
                        min="1"
                        max="512"
                        value={mapping?.startChannel || ""}
                        onChange={(e) => updateMapping(index, { startChannel: Number.parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Ch Count</Label>
                      <Input
                        type="number"
                        min="1"
                        max="512"
                        value={mapping?.channelCount || ""}
                        onChange={(e) => updateMapping(index, { channelCount: Number.parseInt(e.target.value) || 4 })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-xs text-muted-foreground">Channels</Label>
                    <div className="flex gap-2">
                      {(["r", "g", "b", "w"] as const).map((flag) => (
                        <div key={flag} className="flex items-center space-x-1">
                          <Checkbox
                            checked={mapping?.flags?.[flag] || false}
                            onCheckedChange={(checked) =>
                              updateMapping(index, {
                                flags: { ...mapping?.flags, [flag]: checked },
                              })
                            }
                          />
                          <Label className="text-xs uppercase">{flag}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button variant="outline" size="sm" onClick={() => removeMapping(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
