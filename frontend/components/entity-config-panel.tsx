"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Trash2, Plus, Settings } from "lucide-react"
import { useLEDConfig } from "@/contexts/led-config-context"
import type { EntityConfig, RGBWColor, RGBWFilter } from "@/types/led-config"

/**
 * Entity configuration panel
 * Manages entity assignments to LED controllers and DMX parameters
 */
export function EntityConfigPanel() {
  const { state, addEntity, updateEntity, removeEntity } = useLEDConfig()
  const [newEntity, setNewEntity] = useState<Partial<EntityConfig>>({
    name: "",
    receiverId: "",
    type: "LED Strip",
    enabled: true,
    dmxConfig: {
      universe: 1,
      startChannel: 1,
      channelCount: 4,
      rgbwFilter: {
        redMultiplier: 1,
        greenMultiplier: 1,
        blueMultiplier: 1,
        whiteMultiplier: 1,
        enabled: false,
      },
    },
    currentColor: { r: 0, g: 0, b: 0, w: 0 },
  })
  const [showAdvanced, setShowAdvanced] = useState<string | null>(null)

  /**
   * Add new entity configuration
   */
  const handleAddEntity = () => {
    if (!newEntity.name || !newEntity.receiverId || !newEntity.dmxConfig) {
      return
    }

    const entity: EntityConfig = {
      id: crypto.randomUUID(),
      name: newEntity.name,
      receiverId: newEntity.receiverId,
      type: newEntity.type || "LED Strip",
      enabled: newEntity.enabled ?? true,
      dmxConfig: newEntity.dmxConfig,
      currentColor: newEntity.currentColor || { r: 0, g: 0, b: 0, w: 0 },
    }

    addEntity(entity)
    setNewEntity({
      name: "",
      receiverId: "",
      type: "LED Strip",
      enabled: true,
      dmxConfig: {
        universe: 1,
        startChannel: 1,
        channelCount: 4,
        rgbwFilter: {
          redMultiplier: 1,
          greenMultiplier: 1,
          blueMultiplier: 1,
          whiteMultiplier: 1,
          enabled: false,
        },
      },
      currentColor: { r: 0, g: 0, b: 0, w: 0 },
    })
  }

  /**
   * Update entity color
   */
  const updateEntityColor = (entityId: string, color: Partial<RGBWColor>) => {
    const entity = state.config.entities.find((e) => e.id === entityId)
    if (entity) {
      updateEntity({
        ...entity,
        currentColor: { ...entity.currentColor, ...color },
      })
    }
  }

  /**
   * Update RGBW filter
   */
  const updateRGBWFilter = (entityId: string, filter: Partial<RGBWFilter>) => {
    const entity = state.config.entities.find((e) => e.id === entityId)
    if (entity) {
      updateEntity({
        ...entity,
        dmxConfig: {
          ...entity.dmxConfig,
          rgbwFilter: { ...entity.dmxConfig.rgbwFilter, ...filter },
        },
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Add New Entity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Entity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="entity-name">Entity Name</Label>
              <Input
                id="entity-name"
                placeholder="LED Strip 1"
                value={newEntity.name || ""}
                onChange={(e) => setNewEntity((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="entity-receiver">Receiver</Label>
              <Select
                value={newEntity.receiverId || ""}
                onValueChange={(value) => setNewEntity((prev) => ({ ...prev, receiverId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select receiver" />
                </SelectTrigger>
                <SelectContent>
                  {state.config.receivers.map((receiver) => (
                    <SelectItem key={receiver.id} value={receiver.id}>
                      {receiver.name} ({receiver.ipAddress})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="entity-type">Type</Label>
              <Select
                value={newEntity.type || "LED Strip"}
                onValueChange={(value) => setNewEntity((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LED Strip">LED Strip</SelectItem>
                  <SelectItem value="LED Panel">LED Panel</SelectItem>
                  <SelectItem value="LED Fixture">LED Fixture</SelectItem>
                  <SelectItem value="RGB Light">RGB Light</SelectItem>
                  <SelectItem value="RGBW Light">RGBW Light</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleAddEntity}
                disabled={!newEntity.name || !newEntity.receiverId || state.config.receivers.length === 0}
                className="w-full"
              >
                Add Entity
              </Button>
            </div>
          </div>

          {/* DMX Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <Label htmlFor="dmx-universe">DMX Universe</Label>
              <Input
                id="dmx-universe"
                type="number"
                min="1"
                max="32768"
                value={newEntity.dmxConfig?.universe || 1}
                onChange={(e) =>
                  setNewEntity((prev) => ({
                    ...prev,
                    dmxConfig: {
                      ...prev.dmxConfig!,
                      universe: Number.parseInt(e.target.value) || 1,
                    },
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="dmx-channel">Start Channel</Label>
              <Input
                id="dmx-channel"
                type="number"
                min="1"
                max="512"
                value={newEntity.dmxConfig?.startChannel || 1}
                onChange={(e) =>
                  setNewEntity((prev) => ({
                    ...prev,
                    dmxConfig: {
                      ...prev.dmxConfig!,
                      startChannel: Number.parseInt(e.target.value) || 1,
                    },
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="dmx-count">Channel Count</Label>
              <Input
                id="dmx-count"
                type="number"
                min="1"
                max="512"
                value={newEntity.dmxConfig?.channelCount || 4}
                onChange={(e) =>
                  setNewEntity((prev) => ({
                    ...prev,
                    dmxConfig: {
                      ...prev.dmxConfig!,
                      channelCount: Number.parseInt(e.target.value) || 4,
                    },
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Entities */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Configured Entities ({state.config.entities.length})</h3>

        {state.config.entities.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No entities configured. Add an entity to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {state.config.entities.map((entity) => {
              const receiver = state.config.receivers.find((r) => r.id === entity.receiverId)
              return (
                <Card key={entity.id}>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {/* Entity Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <h4 className="font-semibold">{entity.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {receiver?.name || "Unknown Receiver"} • Universe {entity.dmxConfig.universe} • Ch{" "}
                              {entity.dmxConfig.startChannel}-
                              {entity.dmxConfig.startChannel + entity.dmxConfig.channelCount - 1}
                            </p>
                          </div>
                          <Badge variant="outline">{entity.type}</Badge>
                          <Badge variant={entity.enabled ? "default" : "secondary"}>
                            {entity.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={entity.enabled}
                            onCheckedChange={(checked) => updateEntity({ ...entity, enabled: checked })}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAdvanced(showAdvanced === entity.id ? null : entity.id)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => removeEntity(entity.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Color Controls */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Red ({entity.currentColor.r})</Label>
                          <Slider
                            value={[entity.currentColor.r]}
                            onValueChange={([value]) => updateEntityColor(entity.id, { r: value })}
                            max={255}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>Green ({entity.currentColor.g})</Label>
                          <Slider
                            value={[entity.currentColor.g]}
                            onValueChange={([value]) => updateEntityColor(entity.id, { g: value })}
                            max={255}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>Blue ({entity.currentColor.b})</Label>
                          <Slider
                            value={[entity.currentColor.b]}
                            onValueChange={([value]) => updateEntityColor(entity.id, { b: value })}
                            max={255}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>White ({entity.currentColor.w})</Label>
                          <Slider
                            value={[entity.currentColor.w]}
                            onValueChange={([value]) => updateEntityColor(entity.id, { w: value })}
                            max={255}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      {/* Advanced Settings */}
                      {showAdvanced === entity.id && (
                        <div className="border-t pt-4 space-y-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={entity.dmxConfig.rgbwFilter.enabled}
                              onCheckedChange={(checked) => updateRGBWFilter(entity.id, { enabled: checked })}
                            />
                            <Label>Enable RGBW Filter</Label>
                          </div>

                          {entity.dmxConfig.rgbwFilter.enabled && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <Label>Red Multiplier ({entity.dmxConfig.rgbwFilter.redMultiplier.toFixed(2)})</Label>
                                <Slider
                                  value={[entity.dmxConfig.rgbwFilter.redMultiplier]}
                                  onValueChange={([value]) => updateRGBWFilter(entity.id, { redMultiplier: value })}
                                  max={2}
                                  step={0.01}
                                  className="mt-2"
                                />
                              </div>
                              <div>
                                <Label>
                                  Green Multiplier ({entity.dmxConfig.rgbwFilter.greenMultiplier.toFixed(2)})
                                </Label>
                                <Slider
                                  value={[entity.dmxConfig.rgbwFilter.greenMultiplier]}
                                  onValueChange={([value]) => updateRGBWFilter(entity.id, { greenMultiplier: value })}
                                  max={2}
                                  step={0.01}
                                  className="mt-2"
                                />
                              </div>
                              <div>
                                <Label>Blue Multiplier ({entity.dmxConfig.rgbwFilter.blueMultiplier.toFixed(2)})</Label>
                                <Slider
                                  value={[entity.dmxConfig.rgbwFilter.blueMultiplier]}
                                  onValueChange={([value]) => updateRGBWFilter(entity.id, { blueMultiplier: value })}
                                  max={2}
                                  step={0.01}
                                  className="mt-2"
                                />
                              </div>
                              <div>
                                <Label>
                                  White Multiplier ({entity.dmxConfig.rgbwFilter.whiteMultiplier.toFixed(2)})
                                </Label>
                                <Slider
                                  value={[entity.dmxConfig.rgbwFilter.whiteMultiplier]}
                                  onValueChange={([value]) => updateRGBWFilter(entity.id, { whiteMultiplier: value })}
                                  max={2}
                                  step={0.01}
                                  className="mt-2"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
