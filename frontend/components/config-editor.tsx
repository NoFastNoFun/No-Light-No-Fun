"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, RefreshCw, Download, Upload } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import type { BackendConfig, MonitorSettings } from "@/types/led-config"
import { apiFetch } from "@/lib/api"

export function ConfigEditor() {
  const [config, setConfig] = useState<BackendConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [configJson, setConfigJson] = useState("")
  const { toast } = useToast()

  const loadConfig = async () => {
    setLoading(true)
    try {
      const data = await apiFetch<BackendConfig>("config")
      setConfig(data)
      setConfigJson(JSON.stringify(data, null, 2))
      toast({ title: "Configuration loaded successfully" })
    } catch (error) {
      toast({
        title: "Error loading configuration",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    if (!config) return

    setLoading(true)
    try {
      await apiFetch<void>("config", {
        method: "PUT",
        body: JSON.stringify(config),
      })
      toast({ title: "Configuration saved successfully" })
    } catch (error) {
      toast({
        title: "Error saving configuration",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveJsonConfig = async () => {
    try {
      const parsedConfig = JSON.parse(configJson)
      setLoading(true)
      await apiFetch<void>("config", {
        method: "PUT",
        body: JSON.stringify(parsedConfig),
      })
      setConfig(parsedConfig)
      toast({ title: "Configuration saved from JSON" })
    } catch (error) {
      toast({
        title: "Error saving JSON configuration",
        description: error instanceof Error ? error.message : "Invalid JSON format",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const exportConfig = () => {
    if (!config) return

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `led-config-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({ title: "Configuration exported successfully" })
  }

  const updateMonitorSettings = (settings: Partial<MonitorSettings>) => {
    if (!config) return
    setConfig({ ...config, ...settings })
  }

  const updateBasicSettings = (field: keyof BackendConfig, value: any) => {
    if (!config) return
    setConfig({ ...config, [field]: value })
  }

  useEffect(() => {
    loadConfig()
  }, [])

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading configuration...</p>
        </div>
      </div>
    )
  }

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
          <Button onClick={exportConfig} variant="outline" disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={saveConfig} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Save Config
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Settings</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="json">JSON Editor</TabsTrigger>
        </TabsList>

        {/* Basic Settings */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="max-fps">Max FPS</Label>
                  <Input
                    id="max-fps"
                    type="number"
                    min="1"
                    max="120"
                    value={config.max_fps}
                    onChange={(e) => updateBasicSettings("max_fps", Number.parseInt(e.target.value) || 40)}
                  />
                </div>
                <div>
                  <Label htmlFor="ehub-port">eHub Port</Label>
                  <Input
                    id="ehub-port"
                    type="number"
                    min="1"
                    max="65535"
                    value={config.ehub_port}
                    onChange={(e) => updateBasicSettings("ehub_port", Number.parseInt(e.target.value) || 7000)}
                  />
                </div>
                <div>
                  <Label htmlFor="artnet-port">Art-Net Port</Label>
                  <Input
                    id="artnet-port"
                    type="number"
                    min="1"
                    max="65535"
                    value={config.artnet_port}
                    onChange={(e) => updateBasicSettings("artnet_port", Number.parseInt(e.target.value) || 6454)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuration Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Routes</Label>
                  <div className="text-2xl font-bold">{config.routes?.length || 0}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Mappings</Label>
                  <div className="text-2xl font-bold">{config.mapping?.length || 0}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Patches</Label>
                  <div className="text-2xl font-bold">{config.patch?.length || 0}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Groups</Label>
                  <div className="text-2xl font-bold">{Object.keys(config.groups || {}).length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Settings */}
        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Monitoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="monitor-ehub">Monitor eHub</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable real-time monitoring of eHub updates via WebSocket
                    </p>
                  </div>
                  <Switch
                    id="monitor-ehub"
                    checked={config.monitor_ehub}
                    onCheckedChange={(checked) => updateMonitorSettings({ monitor_ehub: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="monitor-dmx">Monitor DMX Output</Label>
                    <p className="text-sm text-muted-foreground">
                      Monitor DMX frames sent by the router via WebSocket
                    </p>
                  </div>
                  <Switch
                    id="monitor-dmx"
                    checked={config.monitor_dmx}
                    onCheckedChange={(checked) => updateMonitorSettings({ monitor_dmx: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="monitor-artnet-rx">Monitor Art-Net Input</Label>
                    <p className="text-sm text-muted-foreground">
                      Monitor Art-Net frames received from other devices
                    </p>
                  </div>
                  <Switch
                    id="monitor-artnet-rx"
                    checked={config.monitor_artnet_rx}
                    onCheckedChange={(checked) => updateMonitorSettings({ monitor_artnet_rx: checked })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>WebSocket Endpoints:</strong>
                  <br />
                  • eHub: <code>/ws/ehub</code>
                  <br />
                  • DMX Output: <code>/ws/dmx</code>
                  <br />
                  • Art-Net Input: <code>/ws/artnet-in</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Groups Configuration</Label>
                <Textarea
                  value={JSON.stringify(config.groups, null, 2)}
                  onChange={(e) => {
                    try {
                      const groups = JSON.parse(e.target.value)
                      updateBasicSettings("groups", groups)
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  className="font-mono text-sm min-h-[100px]"
                  placeholder="Groups configuration (JSON)"
                />
              </div>

              <div>
                <Label>Universes Configuration</Label>
                <Textarea
                  value={JSON.stringify(config.universes, null, 2)}
                  onChange={(e) => {
                    try {
                      const universes = JSON.parse(e.target.value)
                      updateBasicSettings("universes", universes)
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  className="font-mono text-sm min-h-[100px]"
                  placeholder="Universes configuration (JSON)"
                />
              </div>

              <div>
                <Label>Routes Configuration</Label>
                <Textarea
                  value={JSON.stringify(config.routes, null, 2)}
                  onChange={(e) => {
                    try {
                      const routes = JSON.parse(e.target.value)
                      updateBasicSettings("routes", routes)
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  className="font-mono text-sm min-h-[150px]"
                  placeholder="Routes configuration (JSON)"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* JSON Editor */}
        <TabsContent value="json" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Complete Configuration (JSON)
                <Button onClick={saveJsonConfig} disabled={loading} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save JSON
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                className="font-mono text-sm min-h-[400px]"
                placeholder="Complete configuration in JSON format"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Edit the complete configuration in JSON format. Click "Save JSON" to apply changes.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
