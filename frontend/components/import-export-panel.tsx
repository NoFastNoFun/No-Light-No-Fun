"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Upload, FileText, AlertCircle, CheckCircle } from "lucide-react"
import { useLEDConfig } from "@/contexts/led-config-context"
import type { ConfigExport } from "@/types/led-config"

/**
 * Import/Export panel for configuration management
 * Supports CSV and Excel formats
 */
export function ImportExportPanel() {
  const { state, loadConfig, saveConfig } = useLEDConfig()
  const [importData, setImportData] = useState("")
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json")
  const [status, setStatus] = useState<{ type: "success" | "error" | "info" | null; message: string }>({
    type: null,
    message: "",
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * Export configuration as JSON
   */
  const exportAsJSON = () => {
    try {
      const exportData: ConfigExport = {
        version: "1.0.0",
        exportedAt: new Date(),
        config: state.config,
        metadata: {
          receiverCount: state.config.receivers.length,
          entityCount: state.config.entities.length,
          patchMapCount: state.config.patchMaps.length,
        },
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
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

      setStatus({ type: "success", message: "Configuration exported successfully" })
    } catch (error) {
      setStatus({ type: "error", message: "Failed to export configuration" })
    }
  }

  /**
   * Export configuration as CSV
   */
  const exportAsCSV = () => {
    try {
      // Export entities as CSV
      const headers = [
        "Entity ID",
        "Entity Name",
        "Entity Type",
        "Receiver ID",
        "Receiver Name",
        "Receiver IP",
        "DMX Universe",
        "DMX Start Channel",
        "DMX Channel Count",
        "Current R",
        "Current G",
        "Current B",
        "Current W",
        "Enabled",
        "RGBW Filter Enabled",
        "Red Multiplier",
        "Green Multiplier",
        "Blue Multiplier",
        "White Multiplier",
      ]

      const rows = state.config.entities.map((entity) => {
        const receiver = state.config.receivers.find((r) => r.id === entity.receiverId)
        return [
          entity.id,
          entity.name,
          entity.type,
          entity.receiverId,
          receiver?.name || "",
          receiver?.ipAddress || "",
          entity.dmxConfig.universe,
          entity.dmxConfig.startChannel,
          entity.dmxConfig.channelCount,
          entity.currentColor.r,
          entity.currentColor.g,
          entity.currentColor.b,
          entity.currentColor.w,
          entity.enabled,
          entity.dmxConfig.rgbwFilter.enabled,
          entity.dmxConfig.rgbwFilter.redMultiplier,
          entity.dmxConfig.rgbwFilter.greenMultiplier,
          entity.dmxConfig.rgbwFilter.blueMultiplier,
          entity.dmxConfig.rgbwFilter.whiteMultiplier,
        ]
      })

      const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `led-entities-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setStatus({ type: "success", message: "Entities exported as CSV successfully" })
    } catch (error) {
      setStatus({ type: "error", message: "Failed to export CSV" })
    }
  }

  /**
   * Import configuration from JSON
   */
  const importFromJSON = () => {
    try {
      if (!importData.trim()) {
        setStatus({ type: "error", message: "Please paste configuration data" })
        return
      }

      const parsed = JSON.parse(importData)

      // Validate structure
      if (!parsed.config || !parsed.version) {
        throw new Error("Invalid configuration format")
      }

      // TODO: In a real app, you'd want to validate the entire structure
      // and potentially merge with existing config rather than replace

      setStatus({ type: "info", message: "Configuration validation not fully implemented in demo" })
    } catch (error) {
      setStatus({ type: "error", message: "Invalid JSON format or structure" })
    }
  }

  /**
   * Handle file upload
   */
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setImportData(content)

      if (file.type === "application/json" || file.name.endsWith(".json")) {
        setStatus({ type: "info", message: "JSON file loaded. Click Import to apply changes." })
      } else if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        setStatus({ type: "info", message: "CSV import not fully implemented in demo" })
      }
    }
    reader.readAsText(file)
  }

  /**
   * Generate sample configuration
   */
  const generateSampleConfig = () => {
    const sampleConfig: ConfigExport = {
      version: "1.0.0",
      exportedAt: new Date(),
      config: {
        receivers: [
          {
            id: "sample-receiver-1",
            name: "Main Controller",
            ipAddress: "192.168.1.100",
            port: 6454,
            connected: false,
          },
        ],
        entities: [
          {
            id: "sample-entity-1",
            name: "LED Strip 1",
            receiverId: "sample-receiver-1",
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
            currentColor: { r: 255, g: 0, b: 0, w: 0 },
          },
        ],
        patchMaps: [],
        settings: state.config.settings,
      },
      metadata: {
        receiverCount: 1,
        entityCount: 1,
        patchMapCount: 0,
      },
    }

    setImportData(JSON.stringify(sampleConfig, null, 2))
    setStatus({ type: "info", message: "Sample configuration generated" })
  }

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      {status.type && (
        <Alert variant={status.type === "error" ? "destructive" : "default"}>
          {status.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      {/* Export Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Current Configuration</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Receivers: {state.config.receivers.length}</div>
                <div>Entities: {state.config.entities.length}</div>
                <div>Patch Maps: {state.config.patchMaps.length}</div>
              </div>
            </div>

            <div className="space-y-2">
              <Button onClick={exportAsJSON} className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Export as JSON
              </Button>
              <p className="text-xs text-muted-foreground">Complete configuration with all settings</p>
            </div>

            <div className="space-y-2">
              <Button onClick={exportAsCSV} variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Export Entities as CSV
              </Button>
              <p className="text-xs text-muted-foreground">Entity data only, suitable for spreadsheet editing</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => fileInputRef.current?.click()} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </Button>
            <Button onClick={generateSampleConfig} variant="outline">
              Generate Sample
            </Button>
            <input ref={fileInputRef} type="file" accept=".json,.csv" onChange={handleFileUpload} className="hidden" />
          </div>

          <div>
            <Label htmlFor="import-data">Configuration Data</Label>
            <Textarea
              id="import-data"
              placeholder="Paste JSON configuration data here..."
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={importFromJSON} disabled={!importData.trim()}>
              Import Configuration
            </Button>
            <Button
              onClick={() => {
                setImportData("")
                setStatus({ type: null, message: "" })
              }}
              variant="outline"
            >
              Clear
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Importing will replace your current configuration. Make sure to export your
              current settings first if you want to keep them.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Configuration Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Basic Setup</h4>
              <p className="text-sm text-muted-foreground mb-3">Single receiver with 4 LED strips</p>
              <Button size="sm" variant="outline" className="w-full">
                Load Template
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Multi-Universe</h4>
              <p className="text-sm text-muted-foreground mb-3">Multiple receivers across different universes</p>
              <Button size="sm" variant="outline" className="w-full">
                Load Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup & Restore */}
      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={saveConfig} disabled={state.loading}>
              Save to Server
            </Button>
            <Button onClick={loadConfig} variant="outline" disabled={state.loading}>
              Load from Server
            </Button>
          </div>

          {state.loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Syncing with server...
            </div>
          )}

          {state.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
