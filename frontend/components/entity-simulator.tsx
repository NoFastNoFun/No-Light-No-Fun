"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, Square, Shuffle } from "lucide-react"
import { useLEDConfig } from "@/contexts/led-config-context"
import { useWebSocket } from "@/contexts/websocket-context"
import type { RGBWColor, EntityUpdatePayload } from "@/types/led-config"

/**
 * Entity simulator for testing configurations
 * Simulates color/state changes and entity updates
 */
export function EntitySimulator() {
  const { state: configState, updateEntity } = useLEDConfig()
  const { sendMessage } = useWebSocket()
  const [selectedEntityId, setSelectedEntityId] = useState<string>("")
  const [simulationRunning, setSimulationRunning] = useState(false)
  const [simulationMode, setSimulationMode] = useState<"manual" | "rainbow" | "strobe" | "fade">("manual")
  const [simulationSpeed, setSimulationSpeed] = useState(1000)
  const [currentColor, setCurrentColor] = useState<RGBWColor>({ r: 255, g: 0, b: 0, w: 0 })

  /**
   * Send entity update via WebSocket
   */
  const sendEntityUpdate = (entityId: string, color: RGBWColor) => {
    const payload: EntityUpdatePayload = {
      entityId,
      color,
      timestamp: new Date(),
    }

    sendMessage("entity_update", payload)

    // Also update local state
    const entity = configState.config.entities.find((e) => e.id === entityId)
    if (entity) {
      updateEntity({ ...entity, currentColor: color })
    }
  }

  /**
   * Generate rainbow color based on time
   */
  const generateRainbowColor = (time: number): RGBWColor => {
    const hue = (time / 1000) % 360
    const saturation = 1
    const lightness = 0.5

    const c = (1 - Math.abs(2 * lightness - 1)) * saturation
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
    const m = lightness - c / 2

    let r = 0,
      g = 0,
      b = 0

    if (hue >= 0 && hue < 60) {
      r = c
      g = x
      b = 0
    } else if (hue >= 60 && hue < 120) {
      r = x
      g = c
      b = 0
    } else if (hue >= 120 && hue < 180) {
      r = 0
      g = c
      b = x
    } else if (hue >= 180 && hue < 240) {
      r = 0
      g = x
      b = c
    } else if (hue >= 240 && hue < 300) {
      r = x
      g = 0
      b = c
    } else if (hue >= 300 && hue < 360) {
      r = c
      g = 0
      b = x
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
      w: 0,
    }
  }

  /**
   * Generate strobe color (alternating on/off)
   */
  const generateStrobeColor = (time: number): RGBWColor => {
    const isOn = Math.floor(time / simulationSpeed) % 2 === 0
    return isOn ? { r: 255, g: 255, b: 255, w: 255 } : { r: 0, g: 0, b: 0, w: 0 }
  }

  /**
   * Generate fade color (breathing effect)
   */
  const generateFadeColor = (time: number): RGBWColor => {
    const intensity = (Math.sin(time / simulationSpeed) + 1) / 2
    return {
      r: Math.round(currentColor.r * intensity),
      g: Math.round(currentColor.g * intensity),
      b: Math.round(currentColor.b * intensity),
      w: Math.round(currentColor.w * intensity),
    }
  }

  /**
   * Simulation loop
   */
  useEffect(() => {
    if (!simulationRunning || !selectedEntityId) {
      return
    }

    const interval = setInterval(
      () => {
        const time = Date.now()
        let color: RGBWColor

        switch (simulationMode) {
          case "rainbow":
            color = generateRainbowColor(time)
            break
          case "strobe":
            color = generateStrobeColor(time)
            break
          case "fade":
            color = generateFadeColor(time)
            break
          default:
            color = currentColor
        }

        sendEntityUpdate(selectedEntityId, color)
      },
      Math.max(16, simulationSpeed / 10),
    ) // Minimum 16ms for smooth animation

    return () => clearInterval(interval)
  }, [simulationRunning, selectedEntityId, simulationMode, simulationSpeed, currentColor])

  /**
   * Apply color to selected entity
   */
  const applyColor = () => {
    if (selectedEntityId) {
      sendEntityUpdate(selectedEntityId, currentColor)
    }
  }

  /**
   * Apply color to all entities
   */
  const applyToAll = () => {
    configState.config.entities.forEach((entity) => {
      if (entity.enabled) {
        sendEntityUpdate(entity.id, currentColor)
      }
    })
  }

  /**
   * Generate random color
   */
  const randomizeColor = () => {
    const newColor: RGBWColor = {
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256),
      w: Math.floor(Math.random() * 256),
    }
    setCurrentColor(newColor)
  }

  /**
   * Turn off selected entity
   */
  const turnOff = () => {
    if (selectedEntityId) {
      sendEntityUpdate(selectedEntityId, { r: 0, g: 0, b: 0, w: 0 })
    }
  }

  /**
   * Turn off all entities
   */
  const turnOffAll = () => {
    configState.config.entities.forEach((entity) => {
      sendEntityUpdate(entity.id, { r: 0, g: 0, b: 0, w: 0 })
    })
  }

  const selectedEntity = configState.config.entities.find((e) => e.id === selectedEntityId)

  return (
    <div className="space-y-6">
      {/* Entity Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Entity Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="entity-select">Select Entity</Label>
            <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an entity to simulate" />
              </SelectTrigger>
              <SelectContent>
                {configState.config.entities.map((entity) => {
                  const receiver = configState.config.receivers.find((r) => r.id === entity.receiverId)
                  return (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name} ({receiver?.name || "Unknown Receiver"})
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedEntity && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{selectedEntity.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    Universe {selectedEntity.dmxConfig.universe} • Channels {selectedEntity.dmxConfig.startChannel}-
                    {selectedEntity.dmxConfig.startChannel + selectedEntity.dmxConfig.channelCount - 1}
                  </p>
                </div>
                <Badge variant={selectedEntity.enabled ? "default" : "secondary"}>
                  {selectedEntity.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              <div className="mt-3 flex gap-2">
                <Badge variant="outline" className="text-xs">
                  R:{selectedEntity.currentColor.r}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  G:{selectedEntity.currentColor.g}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  B:{selectedEntity.currentColor.b}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  W:{selectedEntity.currentColor.w}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Color Control */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Color Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Red ({currentColor.r})</Label>
              <Slider
                value={[currentColor.r]}
                onValueChange={([value]) => setCurrentColor((prev) => ({ ...prev, r: value }))}
                max={255}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Green ({currentColor.g})</Label>
              <Slider
                value={[currentColor.g]}
                onValueChange={([value]) => setCurrentColor((prev) => ({ ...prev, g: value }))}
                max={255}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Blue ({currentColor.b})</Label>
              <Slider
                value={[currentColor.b]}
                onValueChange={([value]) => setCurrentColor((prev) => ({ ...prev, b: value }))}
                max={255}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label>White ({currentColor.w})</Label>
              <Slider
                value={[currentColor.w]}
                onValueChange={([value]) => setCurrentColor((prev) => ({ ...prev, w: value }))}
                max={255}
                step={1}
                className="mt-2"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={applyColor} disabled={!selectedEntityId}>
              Apply to Selected
            </Button>
            <Button onClick={applyToAll} variant="outline">
              Apply to All
            </Button>
            <Button onClick={randomizeColor} variant="outline">
              <Shuffle className="h-4 w-4 mr-2" />
              Random
            </Button>
            <Button onClick={turnOff} variant="outline" disabled={!selectedEntityId}>
              <Square className="h-4 w-4 mr-2" />
              Turn Off
            </Button>
            <Button onClick={turnOffAll} variant="destructive">
              Turn Off All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Automated Simulation */}
      <Card>
        <CardHeader>
          <CardTitle>Automated Simulation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="simulation-mode">Simulation Mode</Label>
              <Select value={simulationMode} onValueChange={(value: any) => setSimulationMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="rainbow">Rainbow Cycle</SelectItem>
                  <SelectItem value="strobe">Strobe</SelectItem>
                  <SelectItem value="fade">Fade/Breathing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Speed (ms): {simulationSpeed}</Label>
              <Slider
                value={[simulationSpeed]}
                onValueChange={([value]) => setSimulationSpeed(value)}
                min={100}
                max={5000}
                step={100}
                className="mt-2"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="simulation-running"
                checked={simulationRunning}
                onCheckedChange={setSimulationRunning}
                disabled={!selectedEntityId || simulationMode === "manual"}
              />
              <Label htmlFor="simulation-running">Enable Simulation</Label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setSimulationRunning(!simulationRunning)}
                disabled={!selectedEntityId || simulationMode === "manual"}
                variant="outline"
                size="sm"
              >
                {simulationRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>

              <Button
                onClick={() => setSimulationRunning(false)}
                disabled={!simulationRunning}
                variant="outline"
                size="sm"
              >
                <Square className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {simulationRunning && (
            <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Simulation running: {simulationMode} mode</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Updates every {simulationSpeed}ms for {selectedEntity?.name}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Presets */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Color Presets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { name: "Red", color: { r: 255, g: 0, b: 0, w: 0 } },
              { name: "Green", color: { r: 0, g: 255, b: 0, w: 0 } },
              { name: "Blue", color: { r: 0, g: 0, b: 255, w: 0 } },
              { name: "White", color: { r: 0, g: 0, b: 0, w: 255 } },
              { name: "Yellow", color: { r: 255, g: 255, b: 0, w: 0 } },
              { name: "Cyan", color: { r: 0, g: 255, b: 255, w: 0 } },
              { name: "Magenta", color: { r: 255, g: 0, b: 255, w: 0 } },
              { name: "Warm White", color: { r: 255, g: 200, b: 100, w: 100 } },
            ].map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={() => setCurrentColor(preset.color)}
                className="h-12 flex flex-col gap-1"
              >
                <div
                  className="w-4 h-2 rounded border"
                  style={{
                    backgroundColor: `rgb(${preset.color.r}, ${preset.color.g}, ${preset.color.b})`,
                  }}
                />
                <span className="text-xs">{preset.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
