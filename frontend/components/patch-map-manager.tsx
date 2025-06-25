"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Plus, Download, Upload, Save, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { PatchEntry } from "@/types/led-config"
import { downloadCsv, validateChannel } from "@/lib/utils"
import { apiFetch, apiUploadCSV } from "@/lib/api"

export function PatchMapManager() {
  const [patchMap, setPatchMap] = useState<PatchEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [csvData, setCsvData] = useState("")
  const [newEntry, setNewEntry] = useState({ from: 1, to: 1 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const loadPatchMap = async () => {
    setLoading(true)
    try {
      const data = await apiFetch<any>("config")
      const patches = Array.isArray(data?.patch) ? data.patch : []
      setPatchMap(patches)

      // Convert to CSV format for display
      const csvContent = patches.map((p: PatchEntry) => `${p.from},${p.to}`).join("\n")
      setCsvData(csvContent)

      toast({ title: "Patch map loaded successfully" })
    } catch (error) {
      setPatchMap([])
      setCsvData("")
      toast({
        title: "Error loading patch map",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const savePatchMapCSV = async () => {
    setLoading(true)
    try {
      await apiUploadCSV<void>("patch/csv", csvData)

      // Parse CSV to update local state
      const lines = csvData
        .trim()
        .split("\n")
        .filter((line) => line.trim())
      const patches = lines
        .map((line) => {
          const [from, to] = line.split(",").map((s) => Number.parseInt(s.trim()))
          return { from, to }
        })
        .filter((p) => !isNaN(p.from) && !isNaN(p.to))

      setPatchMap(patches)
      toast({ title: "Patch map saved successfully" })
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

  const clearPatchMap = async () => {
    setLoading(true)
    try {
      await apiUploadCSV<void>("patch/csv", "")
      setPatchMap([])
      setCsvData("")
      toast({ title: "Patch map cleared successfully" })
    } catch (error) {
      toast({
        title: "Error clearing patch map",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = () => {
    if (patchMap.length === 0) {
      toast({ title: "No patch data to export", variant: "destructive" })
      return
    }

    downloadCsv(patchMap, `patchmap-${new Date().toISOString().split("T")[0]}.csv`)
    toast({ title: "Patch map exported successfully" })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".csv")) {
      toast({ title: "Please select a CSV file", variant: "destructive" })
      return
    }

    try {
      const content = await file.text()
      setCsvData(content)
      toast({ title: "CSV file loaded. Click 'Save CSV' to apply changes." })
    } catch (error) {
      toast({
        title: "Error reading file",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const addEntry = () => {
    if (!validateChannel(newEntry.from) || !validateChannel(newEntry.to)) {
      toast({ title: "Channels must be between 1-512", variant: "destructive" })
      return
    }

    const newCsvLine = `${newEntry.from},${newEntry.to}`
    const updatedCsv = csvData ? `${csvData}\n${newCsvLine}` : newCsvLine
    setCsvData(updatedCsv)

    setPatchMap((prev) => [...prev, newEntry])
    setNewEntry({ from: 1, to: 1 })
  }

  const removeEntry = (index: number) => {
    const lines = csvData.split("\n").filter((line) => line.trim())
    lines.splice(index, 1)
    setCsvData(lines.join("\n"))

    setPatchMap((prev) => prev.filter((_, i) => i !== index))
  }

  const updateEntry = (index: number, updates: Partial<PatchEntry>) => {
    const lines = csvData.split("\n").filter((line) => line.trim())
    const updatedEntry = { ...patchMap[index], ...updates }
    lines[index] = `${updatedEntry.from},${updatedEntry.to}`
    setCsvData(lines.join("\n"))

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
          <Button onClick={exportCsv} variant="outline" disabled={loading || patchMap.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={savePatchMapCSV} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Save CSV
          </Button>
        </div>
      </div>

      {/* CSV Editor */}
      <Card>
        <CardHeader>
          <CardTitle>CSV Patch Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={() => fileInputRef.current?.click()} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Load CSV File
            </Button>
            <Button onClick={clearPatchMap} variant="outline" disabled={loading}>
              Clear All
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </div>

          <div>
            <Label htmlFor="csv-data">CSV Data (from,to format)</Label>
            <Textarea
              id="csv-data"
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="1,389&#10;2,390&#10;3,391"
              className="font-mono text-sm min-h-[200px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Format: one mapping per line as "from,to" (e.g., "1,389")
            </p>
          </div>
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
                value={newEntry.from}
                onChange={(e) => setNewEntry((prev) => ({ ...prev, from: Number.parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div>
              <Label htmlFor="to-channel">To Channel</Label>
              <Input
                id="to-channel"
                type="number"
                min="1"
                max="512"
                value={newEntry.to}
                onChange={(e) => setNewEntry((prev) => ({ ...prev, to: Number.parseInt(e.target.value) || 1 }))}
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

      {/* Current Patch Map */}
      <Card>
        <CardHeader>
          <CardTitle>Current Patch Map ({patchMap.length} entries)</CardTitle>
        </CardHeader>
        <CardContent>
          {patchMap.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No patch mappings configured. Add mappings using CSV data or the form above.
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
                    value={entry?.from || ""}
                    onChange={(e) => updateEntry(index, { from: Number.parseInt(e.target.value) || 1 })}
                  />
                  <Input
                    type="number"
                    min="1"
                    max="512"
                    value={entry?.to || ""}
                    onChange={(e) => updateEntry(index, { to: Number.parseInt(e.target.value) || 1 })}
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
