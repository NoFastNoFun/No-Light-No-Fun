"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, Plus, Save, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Config, Mapping } from "@/types/led-config"
import { validateIp, validateUniverse, validateChannel } from "@/lib/utils"

export function ConfigEditor() {
  const [config, setConfig] = useState<Config>({ mappings: [] })
  const [loading, setLoading] = useState(false)
  const [newMapping, setNewMapping] = useState<Partial<Mapping>>({
    entityId: "",
    ip: "",
    universe: 1,
    startChannel: 1,
    flags: { r: true, g: true, b: true, w: false },
  })
  const { toast } = useToast()

  const loadConfig = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/config")
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
        toast({ title: "Config loaded successfully" })
      } else {
        throw new Error("Failed to load config")
      }
    } catch (error) {
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
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (response.ok) {
        toast({ title: "Config saved successfully" })
      } else {
        throw new Error("Failed to save config")
      }
    } catch (error) {
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

    setConfig((prev) => ({
      mappings: [...prev.mappings, mapping],
    }))

    setNewMapping({
      entityId: "",
      ip: "",
      universe: 1,
      startChannel: 1,
      flags: { r: true, g: true, b: true, w: false },
    })
  }

  const removeMapping = (index: number) => {
    setConfig((prev) => ({
      mappings: prev.mappings.filter((_, i) => i !== index),
    }))
  }

  const updateMapping = (index: number, updates: Partial<Mapping>) => {
    setConfig((prev) => ({
      mappings: prev.mappings.map((mapping, i) => (i === index ? { ...mapping, ...updates } : mapping)),
    }))
  }

  useEffect(() => {
    loadConfig()
  }, [])

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
                placeholder="entity_001"
                value={newMapping.entityId || ""}
                onChange={(e) => setNewMapping((prev) => ({ ...prev, entityId: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="ip">IP Address</Label>
              <Input
                id="ip"
                placeholder="192.168.1.100"
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
                value={newMapping.startChannel || ""}
                onChange={(e) =>
                  setNewMapping((prev) => ({ ...prev, startChannel: Number.parseInt(e.target.value) || 1 }))
                }
              />
            </div>
          </div>

          <div>
            <Label>Channel Flags</Label>
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
                    {flag}
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
          <CardTitle>Current Mappings ({config.mappings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {config.mappings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No mappings configured. Add a mapping to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {config.mappings.map((mapping, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Entity ID</Label>
                      <Input
                        value={mapping.entityId}
                        onChange={(e) => updateMapping(index, { entityId: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">IP Address</Label>
                      <Input
                        value={mapping.ip}
                        onChange={(e) => updateMapping(index, { ip: e.target.value })}
                        className={!validateIp(mapping.ip) ? "border-red-500" : ""}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Universe</Label>
                      <Input
                        type="number"
                        min="1"
                        max="32768"
                        value={mapping.universe}
                        onChange={(e) => updateMapping(index, { universe: Number.parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Start Channel</Label>
                      <Input
                        type="number"
                        min="1"
                        max="512"
                        value={mapping.startChannel}
                        onChange={(e) => updateMapping(index, { startChannel: Number.parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-xs text-muted-foreground">Flags</Label>
                    <div className="flex gap-2">
                      {(["r", "g", "b", "w"] as const).map((flag) => (
                        <div key={flag} className="flex items-center space-x-1">
                          <Checkbox
                            checked={mapping.flags[flag]}
                            onCheckedChange={(checked) =>
                              updateMapping(index, {
                                flags: { ...mapping.flags, [flag]: checked },
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
