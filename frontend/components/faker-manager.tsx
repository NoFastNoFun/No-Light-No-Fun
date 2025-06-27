"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Play, Square, Palette, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { FakerConfig, FakerMode } from "@/types/led-config"
import { apiFetch } from "@/lib/api"

export function FakerManager() {
  const [config, setConfig] = useState<FakerConfig>({
    mode: "solid",
    from: 100,
    to: 19858,
    color: [255, 0, 0],
    brightness: 1.0,
    fps: 25,
    multi: [],
  })
  const [loading, setLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [multiRanges, setMultiRanges] = useState<Array<{ from: number; to: number }>>([])
  const [useMultiRange, setUseMultiRange] = useState(false)
  const { toast } = useToast()

  const startPattern = async () => {
    setLoading(true)
    try {
      const payload: FakerConfig = {
        ...config,
        multi: useMultiRange && multiRanges.length > 0 ? multiRanges : undefined,
      }

      await apiFetch<void>("faker", {
        method: "POST",
        body: JSON.stringify(payload),
      })

      setIsRunning(true)
      toast({
        title: "Pattern started successfully",
        description: `${config.mode} pattern with ${config.color.join(", ")} RGB`,
      })
    } catch (error) {
      toast({
        title: "Error starting pattern",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const stopPattern = async () => {
    setLoading(true)
    try {
      await apiFetch<void>("faker", {
        method: "DELETE",
      })

      setIsRunning(false)
      toast({ title: "Pattern stopped successfully" })
    } catch (error) {
      toast({
        title: "Error stopping pattern",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateColor = (index: number, value: number) => {
    const newColor = [...config.color] as [number, number, number]
    newColor[index] = value
    setConfig((prev) => ({ ...prev, color: newColor }))
  }

  const addMultiRange = () => {
    setMultiRanges((prev) => [...prev, { from: 100, to: 500 }])
  }

  const removeMultiRange = (index: number) => {
    setMultiRanges((prev) => prev.filter((_, i) => i !== index))
  }

  const updateMultiRange = (index: number, field: "from" | "to", value: number) => {
    setMultiRanges((prev) => prev.map((range, i) => (i === index ? { ...range, [field]: value } : range)))
  }

  const presetColors = [
    { name: "Red", color: [255, 0, 0] as [number, number, number] },
    { name: "Green", color: [0, 255, 0] as [number, number, number] },
    { name: "Blue", color: [0, 0, 255] as [number, number, number] },
    { name: "White", color: [255, 255, 255] as [number, number, number] },
    { name: "Yellow", color: [255, 255, 0] as [number, number, number] },
    { name: "Cyan", color: [0, 255, 255] as [number, number, number] },
    { name: "Magenta", color: [255, 0, 255] as [number, number, number] },
    { name: "Orange", color: [255, 165, 0] as [number, number, number] },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Faker Pattern Manager</h2>
        <div className="flex gap-2">
          <Button
            onClick={isRunning ? stopPattern : startPattern}
            disabled={loading}
            variant={isRunning ? "destructive" : "default"}
          >
            {isRunning ? (
              <>
                <Square className="h-4 w-4 mr-2" />
                Stop Pattern
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Pattern
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Pattern Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Pattern Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="mode">Pattern Mode</Label>
              <Select
                value={config.mode}
                onValueChange={(value: FakerMode) => setConfig((prev) => ({ ...prev, mode: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="chase">Chase</SelectItem>
                  <SelectItem value="fill">Fill</SelectItem>
                  <SelectItem value="gradient">Gradient</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="from">From Entity</Label>
              <Input
                id="from"
                type="number"
                min="1"
                value={config.from}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    from: Number.parseInt(e.target.value) || 100,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="to">To Entity</Label>
              <Input
                id="to"
                type="number"
                min="1"
                value={config.to}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    to: Number.parseInt(e.target.value) || 19858,
                  }))
                }
              />
            </div>

            {(config.mode === "chase" || config.mode === "fill" || config.mode === "gradient") && (
              <div>
                <Label htmlFor="fps">FPS</Label>
                <Input
                  id="fps"
                  type="number"
                  min="1"
                  max="120"
                  value={config.fps || 25}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      fps: Number.parseInt(e.target.value) || 25,
                    }))
                  }
                />
              </div>
            )}
          </div>

          {/* Brightness Control */}
          <div>
            <Label>Brightness: {(config.brightness * 100).toFixed(0)}%</Label>
            <Slider
              value={[config.brightness]}
              onValueChange={([value]) => setConfig((prev) => ({ ...prev, brightness: value }))}
              max={1}
              step={0.01}
              className="mt-2"
            />
          </div>

          {/* Color Controls */}
          {config.mode !== "gradient" && (
            <div className="space-y-4">
              <Label>RGB Color</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Red ({config.color[0]})</Label>
                  <Slider
                    value={[config.color[0]]}
                    onValueChange={([value]) => updateColor(0, value)}
                    max={255}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Green ({config.color[1]})</Label>
                  <Slider
                    value={[config.color[1]]}
                    onValueChange={([value]) => updateColor(1, value)}
                    max={255}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Blue ({config.color[2]})</Label>
                  <Slider
                    value={[config.color[2]]}
                    onValueChange={([value]) => updateColor(2, value)}
                    max={255}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Color Preview */}
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-8 border rounded"
                  style={{
                    backgroundColor: `rgb(${config.color[0]}, ${config.color[1]}, ${config.color[2]})`,
                  }}
                />
                <span className="font-mono text-sm">
                  RGB({config.color[0]}, {config.color[1]}, {config.color[2]})
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Color Presets */}
      {config.mode !== "gradient" && (
        <Card>
          <CardHeader>
            <CardTitle>Color Presets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
              {presetColors.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  onClick={() => setConfig((prev) => ({ ...prev, color: preset.color }))}
                  className="h-16 flex flex-col gap-1"
                >
                  <div
                    className="w-6 h-3 rounded border"
                    style={{
                      backgroundColor: `rgb(${preset.color[0]}, ${preset.color[1]}, ${preset.color[2]})`,
                    }}
                  />
                  <span className="text-xs">{preset.name}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Multi-Range Configuration (Solid mode only) */}
      {config.mode === "solid" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Multi-Range Configuration
              <Switch checked={useMultiRange} onCheckedChange={setUseMultiRange} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Define multiple entity ranges for solid patterns. When disabled, uses the single range above.
            </p>

            {useMultiRange && (
              <>
                <Button onClick={addMultiRange} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Range
                </Button>

                {multiRanges.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No ranges defined. Add a range to get started.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-4 p-3 bg-muted rounded-lg font-semibold text-sm">
                      <div>From Entity</div>
                      <div>To Entity</div>
                      <div>Actions</div>
                    </div>
                    {multiRanges.map((range, index) => (
                      <div key={index} className="grid grid-cols-3 gap-4 p-3 border rounded-lg items-center">
                        <Input
                          type="number"
                          min="1"
                          value={range.from}
                          onChange={(e) => updateMultiRange(index, "from", Number.parseInt(e.target.value) || 1)}
                        />
                        <Input
                          type="number"
                          min="1"
                          value={range.to}
                          onChange={(e) => updateMultiRange(index, "to", Number.parseInt(e.target.value) || 1)}
                        />
                        <Button variant="outline" size="sm" onClick={() => removeMultiRange(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current Configuration Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={JSON.stringify(
              {
                ...config,
                multi: useMultiRange && multiRanges.length > 0 ? multiRanges : undefined,
              },
              null,
              2,
            )}
            readOnly
            className="font-mono text-sm min-h-[150px]"
          />
        </CardContent>
      </Card>
    </div>
  )
}
