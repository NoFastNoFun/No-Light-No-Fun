"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Edit, Copy } from "lucide-react"
import { useLEDConfig } from "@/contexts/led-config-context"
import type { PatchMap, PatchMapEntry } from "@/types/led-config"

/**
 * Patch map manager for DMX rerouting configuration
 */
export function PatchMapManager() {
  const { state, addPatchMap, updatePatchMap, removePatchMap, setActivePatchMap } = useLEDConfig()
  const [newPatchMap, setNewPatchMap] = useState<Partial<PatchMap>>({
    name: "",
    entries: [],
    enabled: true,
  })
  const [editingPatchMap, setEditingPatchMap] = useState<string | null>(null)
  const [newEntry, setNewEntry] = useState<Partial<PatchMapEntry>>({
    sourceUniverse: 1,
    sourceChannel: 1,
    targetUniverse: 1,
    targetChannel: 1,
    enabled: true,
    description: "",
  })

  /**
   * Create new patch map
   */
  const handleCreatePatchMap = () => {
    if (!newPatchMap.name) return

    const patchMap: PatchMap = {
      id: crypto.randomUUID(),
      name: newPatchMap.name,
      entries: [],
      enabled: newPatchMap.enabled ?? true,
      createdAt: new Date(),
      modifiedAt: new Date(),
    }

    addPatchMap(patchMap)
    setNewPatchMap({ name: "", entries: [], enabled: true })
  }

  /**
   * Add entry to patch map
   */
  const handleAddEntry = (patchMapId: string) => {
    const patchMap = state.config.patchMaps.find((p) => p.id === patchMapId)
    if (
      !patchMap ||
      !newEntry.sourceUniverse ||
      !newEntry.sourceChannel ||
      !newEntry.targetUniverse ||
      !newEntry.targetChannel
    )
      return

    const entry: PatchMapEntry = {
      sourceUniverse: newEntry.sourceUniverse,
      sourceChannel: newEntry.sourceChannel,
      targetUniverse: newEntry.targetUniverse,
      targetChannel: newEntry.targetChannel,
      enabled: newEntry.enabled ?? true,
      description: newEntry.description,
    }

    const updatedPatchMap: PatchMap = {
      ...patchMap,
      entries: [...patchMap.entries, entry],
      modifiedAt: new Date(),
    }

    updatePatchMap(updatedPatchMap)
    setNewEntry({
      sourceUniverse: 1,
      sourceChannel: 1,
      targetUniverse: 1,
      targetChannel: 1,
      enabled: true,
      description: "",
    })
  }

  /**
   * Remove entry from patch map
   */
  const handleRemoveEntry = (patchMapId: string, entryIndex: number) => {
    const patchMap = state.config.patchMaps.find((p) => p.id === patchMapId)
    if (!patchMap) return

    const updatedPatchMap: PatchMap = {
      ...patchMap,
      entries: patchMap.entries.filter((_, index) => index !== entryIndex),
      modifiedAt: new Date(),
    }

    updatePatchMap(updatedPatchMap)
  }

  /**
   * Toggle entry enabled state
   */
  const toggleEntryEnabled = (patchMapId: string, entryIndex: number) => {
    const patchMap = state.config.patchMaps.find((p) => p.id === patchMapId)
    if (!patchMap) return

    const updatedEntries = [...patchMap.entries]
    updatedEntries[entryIndex] = {
      ...updatedEntries[entryIndex],
      enabled: !updatedEntries[entryIndex].enabled,
    }

    const updatedPatchMap: PatchMap = {
      ...patchMap,
      entries: updatedEntries,
      modifiedAt: new Date(),
    }

    updatePatchMap(updatedPatchMap)
  }

  /**
   * Duplicate patch map
   */
  const duplicatePatchMap = (patchMap: PatchMap) => {
    const duplicated: PatchMap = {
      ...patchMap,
      id: crypto.randomUUID(),
      name: `${patchMap.name} (Copy)`,
      createdAt: new Date(),
      modifiedAt: new Date(),
    }

    addPatchMap(duplicated)
  }

  const activePatchMap = state.config.patchMaps.find((p) => p.id === state.config.activePatchMapId)

  return (
    <div className="space-y-6">
      {/* Active Patch Map Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Active Patch Map</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="active-patch-map">Select Active Patch Map</Label>
              <Select
                value={state.config.activePatchMapId || ""}
                onValueChange={(value) => setActivePatchMap(value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No active patch map" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {state.config.patchMaps.map((patchMap) => (
                    <SelectItem key={patchMap.id} value={patchMap.id}>
                      {patchMap.name} ({patchMap.entries.length} entries)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activePatchMap && (
              <div className="flex items-center gap-2">
                <Badge variant={activePatchMap.enabled ? "default" : "secondary"}>
                  {activePatchMap.enabled ? "Active" : "Disabled"}
                </Badge>
                <Switch
                  checked={activePatchMap.enabled}
                  onCheckedChange={(checked) =>
                    updatePatchMap({ ...activePatchMap, enabled: checked, modifiedAt: new Date() })
                  }
                />
              </div>
            )}
          </div>

          {activePatchMap && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-semibold">{activePatchMap.name}</h4>
              <p className="text-sm text-muted-foreground">
                {activePatchMap.entries.length} entries • Created: {activePatchMap.createdAt.toLocaleDateString()} •
                Modified: {activePatchMap.modifiedAt.toLocaleDateString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create New Patch Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Patch Map
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="patch-map-name">Patch Map Name</Label>
              <Input
                id="patch-map-name"
                placeholder="My Patch Map"
                value={newPatchMap.name || ""}
                onChange={(e) => setNewPatchMap((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreatePatchMap} disabled={!newPatchMap.name}>
                Create Patch Map
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Patch Maps */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Patch Maps ({state.config.patchMaps.length})</h3>

        {state.config.patchMaps.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No patch maps configured. Create a patch map to get started.
            </CardContent>
          </Card>
        ) : (
          state.config.patchMaps.map((patchMap) => (
            <Card key={patchMap.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <CardTitle className="text-lg">{patchMap.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {patchMap.entries.length} entries • Created: {patchMap.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={patchMap.enabled ? "default" : "secondary"}>
                      {patchMap.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    {state.config.activePatchMapId === patchMap.id && <Badge variant="outline">Active</Badge>}
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={patchMap.enabled}
                      onCheckedChange={(checked) =>
                        updatePatchMap({ ...patchMap, enabled: checked, modifiedAt: new Date() })
                      }
                    />
                    <Button variant="outline" size="sm" onClick={() => duplicatePatchMap(patchMap)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingPatchMap(editingPatchMap === patchMap.id ? null : patchMap.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => removePatchMap(patchMap.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Patch Map Entries */}
                {patchMap.entries.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No entries in this patch map</p>
                ) : (
                  <div className="space-y-2">
                    {patchMap.entries.map((entry, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <Switch
                            checked={entry.enabled}
                            onCheckedChange={() => toggleEntryEnabled(patchMap.id, index)}
                          />
                          <div className="text-sm">
                            <span className="font-medium">
                              U{entry.sourceUniverse}:Ch{entry.sourceChannel}
                            </span>
                            <span className="mx-2">→</span>
                            <span className="font-medium">
                              U{entry.targetUniverse}:Ch{entry.targetChannel}
                            </span>
                            {entry.description && (
                              <span className="ml-2 text-muted-foreground">({entry.description})</span>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleRemoveEntry(patchMap.id, index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Entry */}
                {editingPatchMap === patchMap.id && (
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-semibold">Add New Entry</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <Label>Source Universe</Label>
                        <Input
                          type="number"
                          min="1"
                          max="32768"
                          value={newEntry.sourceUniverse || ""}
                          onChange={(e) =>
                            setNewEntry((prev) => ({
                              ...prev,
                              sourceUniverse: Number.parseInt(e.target.value) || 1,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Source Channel</Label>
                        <Input
                          type="number"
                          min="1"
                          max="512"
                          value={newEntry.sourceChannel || ""}
                          onChange={(e) =>
                            setNewEntry((prev) => ({
                              ...prev,
                              sourceChannel: Number.parseInt(e.target.value) || 1,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Target Universe</Label>
                        <Input
                          type="number"
                          min="1"
                          max="32768"
                          value={newEntry.targetUniverse || ""}
                          onChange={(e) =>
                            setNewEntry((prev) => ({
                              ...prev,
                              targetUniverse: Number.parseInt(e.target.value) || 1,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Target Channel</Label>
                        <Input
                          type="number"
                          min="1"
                          max="512"
                          value={newEntry.targetChannel || ""}
                          onChange={(e) =>
                            setNewEntry((prev) => ({
                              ...prev,
                              targetChannel: Number.parseInt(e.target.value) || 1,
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-end">
                        <Button onClick={() => handleAddEntry(patchMap.id)} className="w-full">
                          Add Entry
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Description (Optional)</Label>
                      <Input
                        placeholder="Entry description"
                        value={newEntry.description || ""}
                        onChange={(e) => setNewEntry((prev) => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
