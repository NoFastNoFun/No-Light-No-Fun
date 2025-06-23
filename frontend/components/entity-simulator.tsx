"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Send, Palette } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { RGBWColor } from "@/types/led-config"
import { toRgbwHex, fromRgbwHex } from "@/lib/utils"
import { apiFetch } from "@/lib/api"

// Backend simulation payload format
interface BackendSimulatePayload {
  entity_id: string
  r: number
  g: number
  b: number
  w: number
}

export function EntitySimulator() {
  const [entityId, setEntityId] = useState("")
  const [color, setColor] = useState<RGBWColor>({ r: 255, g: 0, b: 0, w: 0 })
  const [hexColor, setHexColor] = useState("#FF000000")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const updateColorFromHex = (hex: string) => {
    setHexColor(hex)
    setColor(fromRgbwHex(hex))
  }

  const updateColorFromSliders = (newColor: RGBWColor) => {
    setColor(newColor)
    setHexColor(toRgbwHex(newColor))
  }

  const sendSimulation = async () => {
    if (!entityId.trim()) {
      toast({ title: "Please enter an Entity ID", variant: "destructive" })
      return
    }

    // Convert to backend format
    const payload: BackendSimulatePayload = {
      entity_id: entityId.trim(),
      r: color.r,
      g: color.g,
      b: color.b,
      w: color.w,
    }

    setLoading(true)
    try {
      await apiFetch<void>("simulate", {
        method: "POST",
        body: JSON.stringify(payload),
      })
      toast({ title: `Simulation sent for ${entityId}` })
    } catch (error) {
      toast({
        title: "Error sending simulation",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const presetColors = [
    { name: "Red", color: { r: 255, g: 0, b: 0, w: 0 } },
    { name: "Green", color: { r: 0, g: 255, b: 0, w: 0 } },
    { name: "Blue", color: { r: 0, g: 0, b: 255, w: 0 } },
    { name: "White", color: { r: 0, g: 0, b: 0, w: 255 } },
    { name: "Yellow", color: { r: 255, g: 255, b: 0, w: 0 } },
    { name: "Cyan", color: { r: 0, g: 255, b: 255, w: 0 } },
    { name: "Magenta", color: { r: 255, g: 0, b: 255, w: 0 } },
    { name: "Warm White", color: { r: 255, g: 200, b: 100, w: 100 } },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Entity Simulator</h2>
      </div>

      {/* Simulator Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Color Update
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Entity ID */}
          <div>
            <Label htmlFor="entity-id">Entity ID</Label>
            <Input
              id="entity-id"
              placeholder="projecteur"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Use the same entity ID as configured in your mappings</p>
          </div>

          {/* Color Picker */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="hex-color">Hex Color (RGBW)</Label>
              <Input
                id="hex-color"
                type="text"
                placeholder="#FF000000"
                value={hexColor}
                onChange={(e) => updateColorFromHex(e.target.value)}
                className="w-32 font-mono"
              />
              <div
                className="w-12 h-8 border rounded"
                style={{
                  backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                  opacity: color.w > 0 ? 0.7 + (color.w / 255) * 0.3 : 1,
                }}
              />
            </div>

            {/* RGBW Sliders */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Red ({color.r})</Label>
                <Slider
                  value={[color.r]}
                  onValueChange={([value]) => updateColorFromSliders({ ...color, r: value })}
                  max={255}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Green ({color.g})</Label>
                <Slider
                  value={[color.g]}
                  onValueChange={([value]) => updateColorFromSliders({ ...color, g: value })}
                  max={255}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Blue ({color.b})</Label>
                <Slider
                  value={[color.b]}
                  onValueChange={([value]) => updateColorFromSliders({ ...color, b: value })}
                  max={255}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>White ({color.w})</Label>
                <Slider
                  value={[color.w]}
                  onValueChange={([value]) => updateColorFromSliders({ ...color, w: value })}
                  max={255}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          {/* Send Button */}
          <Button onClick={sendSimulation} disabled={loading || !entityId.trim()} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {loading ? "Sending..." : "Send Color Update"}
          </Button>

          {/* Backend Format Info */}
          {process.env.NODE_ENV === "development" && (
            <div className="text-xs text-muted-foreground p-3 bg-muted rounded">
              <p>
                <strong>Backend payload:</strong>
              </p>
              <pre>
                {JSON.stringify(
                  {
                    entity_id: entityId || "projecteur",
                    r: color.r,
                    g: color.g,
                    b: color.b,
                    w: color.w,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Color Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Presets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {presetColors.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={() => updateColorFromSliders(preset.color)}
                className="h-16 flex flex-col gap-1"
              >
                <div
                  className="w-6 h-3 rounded border"
                  style={{
                    backgroundColor: `rgb(${preset.color.r}, ${preset.color.g}, ${preset.color.b})`,
                    opacity: preset.color.w > 0 ? 0.7 + (preset.color.w / 255) * 0.3 : 1,
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
