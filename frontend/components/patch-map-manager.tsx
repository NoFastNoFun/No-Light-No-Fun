"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Plus, Download, Upload, Save, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { PatchEntry } from "@/types/led-config"
import { downloadCsv, validateChannel } from "@/lib/utils"

export function PatchMapManager() {
  const [patchMap, setPatchMap] = useState<PatchEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [newEntry, setNewEntry] = useState({ fromChannel: 1, toChannel: 1 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const loadPatchMap = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/patchmap")
      if (response.ok) {
        const data = await response.json()
        setPatchMap(data)
        toast({ title: "Patch map loaded successfully" })
      } else {
        throw new Error("Failed to load patch map")
      }
    } catch (error) {
      toast({
        title: "Error loading patch map",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const savePatchMap = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/patchmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchMap),
      })

      if (response.ok) {
        toast({ title: "Patch map saved successfully" })
      } else {
        throw new Error("Failed to save patch map")
      }
    } catch (error) {
      toast({
        title: "Error saving patch map",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = async () => {
    try {
      const response = await fetch("/api/patchmap")
      if (response.ok) {
        const data = await response.json()
        downloadCsv(data, `patchmap-${new Date().toISOString().split("T")[0]}.csv`)
        toast({ title: "Patch map exported successfully" })
      } else {
        throw new Error("Failed to export patch map")
      }
    } catch (error) {
      toast({
        title: "Error exporting patch map",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".csv")) {
      toast({ title: "Please select a CSV file", variant: "destructive" })
      return
    }

    const formData = new FormData()
    formData.append("file", file)

    setLoading(true)
    try {
      const response = await fetch("/api/config", {
        method: "PUT",
        body: formData,
      })

      if (response.ok) {
        await loadPatchMap() // Reload to show imported data
        toast({ title: "CSV imported successfully" })
      } else {
        throw new Error("Failed to import CSV")
      }
    } catch (error) {
      toast({
        title: "Error importing CSV",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const addEntry = () => {
    if (!validateChannel(newEntry.fromChannel) || !validateChannel(newEntry.toChannel)) {
      toast({ title: "Channels must be between 1-512", variant: "destructive" })
      return
    }

    setPatchMap((prev) => [...prev, newEntry])
    setNewEntry({ fromChannel: 1, toChannel: 1 })
  }

  const removeEntry = (index: number) => {
    setPatchMap((prev) => prev.filter((_, i) => i !== index))
  }

  const updateEntry = (index: number, updates: Partial<PatchEntry>) => {
    setPatchMap((prev) => prev.map((entry, i) => (i === index ? { ...entry, ...updates } : entry)))
  }

  useEffect(() => {
    loadPatchMap()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Patch Map Manager</h2>
        <div className="flex gap-2">
          <Button onClick={loadPatchMap} variant="outline" disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload
          </Button>
          <Button onClick={exportCsv} variant="outline" disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={savePatchMap} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Import/Export */}
      <Card>
        <CardHeader>
          <CardTitle>Import/Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={() => fileInputRef.current?.click()} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </div>
          <p className="text-sm text-muted-foreground">CSV format: fromChannel,toChannel (one mapping per line)</p>
        </CardContent>
      </Card>

      {/* Add New Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Mapping
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="from-channel">From Channel</Label>
              <Input
                id="from-channel"
                type="number"
                min="1"
                max="512"
                value={newEntry.fromChannel}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, fromChannel: Number.parseInt(e.target.value) || 1 }))
                }
              />
            </div>
            <div>
              <Label htmlFor="to-channel">To Channel</Label>
              <Input
                id="to-channel"
                type="number"
                min="1"
                max="512"
                value={newEntry.toChannel}
                onChange={(e) => setNewEntry((prev) => ({ ...prev, toChannel: Number.parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addEntry} className="w-full">
                Add Mapping
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patch Map Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Patch Map ({patchMap.length} entries)</CardTitle>
        </CardHeader>
        <CardContent>
          {patchMap.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No patch mappings configured. Add a mapping or import a CSV file.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-4 p-3 bg-muted rounded-lg font-semibold text-sm">
                <div>From Channel</div>
                <div>To Channel</div>
                <div>Actions</div>
              </div>
              {patchMap.map((entry, index) => (
                <div key={index} className="grid grid-cols-3 gap-4 p-3 border rounded-lg items-center">
                  <Input
                    type="number"
                    min="1"
                    max="512"
                    value={entry.fromChannel}
                    onChange={(e) => updateEntry(index, { fromChannel: Number.parseInt(e.target.value) || 1 })}
                  />
                  <Input
                    type="number"
                    min="1"
                    max="512"
                    value={entry.toChannel}
                    onChange={(e) => updateEntry(index, { toChannel: Number.parseInt(e.target.value) || 1 })}
                  />
                  <Button variant="outline" size="sm" onClick={() => removeEntry(index)}>
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
