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
    entityId: "",
    ip: "",
    universe: 1,
    startChannel: 1,
    flags: { r: true, g: true, b: true, w: false },
  })
  const { toast } = useToast()

  /**
   * Convert backend mapping format to frontend format
   */
  const convertBackendMapping = (backendMapping: BackendMapping): Mapping => {
    console.log("Converting backend mapping:", backendMapping)
    const converted = {
      entityId: backendMapping.entity_id || "",
      ip: backendMapping.controller_ip || "",
      universe: backendMapping.universe || 1,
      startChannel: backendMapping.channel_start || 1,
      flags: {
        r: backendMapping.use_r ?? true,
        g: backendMapping.use_g ?? true,
        b: backendMapping.use_b ?? true,
        w: backendMapping.use_w ?? false,
      },
    }
    console.log("Converted to frontend mapping:", converted)
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
      channel_count: 4, // Default RGBW channel count
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
    console.log("Converting backend config:", backendConfig)

    if (!backendConfig) {
      console.log("No backend config provided, returning empty config")
      return { mappings: [] }
    }

    const mappings = Array.isArray(backendConfig.mappings) ? backendConfig.mappings.map(convertBackendMapping) : []

    const converted = { mappings }
    console.log("Converted to frontend config:", converted)
    return converted
  }

  /**
   * Convert frontend config format to backend format
   */
  const convertFrontendConfig = (frontendConfig: Config): BackendConfig => {
    return {
      mappings: (frontendConfig?.mappings || []).map(convertFrontendMapping),
      patches: null,
      udp_port: 6454,
      default_universe: 1,
      max_fps: 30,
    }
  }

  const loadConfig = async () => {
    setLoading(true)
    try {
      console.log("Loading config from backend...")
      const backendData = await apiFetch<BackendConfig>("config")
      console.log("Raw backend response:", backendData)

      // Store debug info
      setDebugInfo({
        rawBackend: backendData,
        timestamp: new Date().toISOString(),
      })

      const frontendConfig = convertBackendConfig(backendData)
      console.log("Setting frontend config:", frontendConfig)

      setConfig(frontendConfig)
      toast({
        title: "Config loaded successfully",
        description: `Loaded ${frontendConfig.mappings.length} mappings`,
      })
    } catch (error) {
      console.error("Error loading config:", error)
      // Set safe default on error
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
      console.log("Saving backend config:", backendConfig)

      await apiFetch<void>("config", {
        method: "POST",
        body: JSON.stringify(backendConfig),
      })
      toast({ title: "Config saved successfully" })
    } catch (error) {
      console.error("Error saving config:", error)
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
    if (!newMapping.entityId || !newMapping.ip || !newMapping.universe || !newMapping.startChannel) {
      toast({ title: "Please fill all required fields", variant: "destructive" })
      return
    }

    if (!validateIp(newMapping.ip)) {
      toast({ title: "Invalid IP address format", variant: "destructive" })
      return
    }

    if (!validateUniverse(newMapping.universe)) {
      toast({ title: "Universe must be between 1-32768", variant: "destructive" })
      return
    }

    if (!validateChannel(newMapping.startChannel)) {
      toast({ title: "Start channel must be between 1-512", variant: "destructive" })
      return
    }

    const mapping: Mapping = {
      entityId: newMapping.entityId!,
      ip: newMapping.ip!,
      universe: newMapping.universe!,
      startChannel: newMapping.startChannel!,
      flags: newMapping.flags!,
    }

    console.log("Adding new mapping:", mapping)
    setConfig((prev) => {
      const newConfig = {
        mappings: [...(prev?.mappings || []), mapping],
      }
      console.log("New config state:", newConfig)
      return newConfig
    })

    setNewMapping({
      entityId: "",
      ip: "",
      universe: 1,
      startChannel: 1,
      flags: { r: true, g: true, b: true, w: false },
    })
  }

  const removeMapping = (index: number) => {
    console.log("Removing mapping at index:", index)
    setConfig((prev) => ({
      mappings: (prev?.mappings || []).filter((_, i) => i !== index),
    }))
  }

  const updateMapping = (index: number, updates: Partial<Mapping>) => {
    console.log("Updating mapping at index:", index, "with:", updates)
    setConfig((prev) => ({
      mappings: (prev?.mappings || []).map((mapping, i) => (i === index ? { ...mapping, ...updates } : mapping)),
    }))
  }

  useEffect(() => {
    loadConfig()
  }, [])

  // Safe access to mappings array
  const mappings = config?.mappings || []
  console.log("Current mappings in render:", mappings)

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

      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            <div>
              <strong>Current mappings count:</strong> {mappings.length}
            </div>
            <div>
              <strong>Config state:</strong>
              <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
            {debugInfo && (
              <div>
                <strong>Last API response ({debugInfo.timestamp}):</strong>
                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add New Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Mapping
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="entity-id">Entity ID</Label>
              <Input
                id="entity-id"
                placeholder="projecteur"
                value={newMapping.entityId || ""}
                onChange={(e) => setNewMapping((prev) => ({ ...prev, entityId: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="ip">Controller IP</Label>
              <Input
                id="ip"
                placeholder="192.168.1.45"
                value={newMapping.ip || ""}
                onChange={(e) => setNewMapping((prev) => ({ ...prev, ip: e.target.value }))}
                className={newMapping.ip && !validateIp(newMapping.ip) ? "border-red-500" : ""}
              />
            </div>
            <div>
              <Label htmlFor="universe">Universe</Label>
              <Input
                id="universe"
                type="number"
                min="1"
                max="32768"
                placeholder="200"
                value={newMapping.universe || ""}
                onChange={(e) => setNewMapping((prev) => ({ ...prev, universe: Number.parseInt(e.target.value) || 1 }))}
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
              {debugInfo?.rawBackend && (
                <p className="text-xs text-muted-foreground mt-2">
                  Backend returned{" "}
                  {Array.isArray(debugInfo.rawBackend.mappings) ? debugInfo.rawBackend.mappings.length : 0} mappings
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {mappings.map((mapping, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Entity ID</Label>
                      <Input
                        value={mapping?.entityId || ""}
                        onChange={(e) => updateMapping(index, { entityId: e.target.value })}
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
                        min="1"
                        max="32768"
                        value={mapping?.universe || ""}
                        onChange={(e) => updateMapping(index, { universe: Number.parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Start Channel</Label>
                      <Input
                        type="number"
                        min="1"
                        max="512"
                        value={mapping?.startChannel || ""}
                        onChange={(e) => updateMapping(index, { startChannel: Number.parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-xs text-muted-foreground">Channel Usage</Label>
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
