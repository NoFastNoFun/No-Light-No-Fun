"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { useLEDConfig } from "@/contexts/led-config-context"

/**
 * System settings configuration panel
 */
export function SystemSettingsPanel() {
  const { state, updateSettings, saveConfig } = useLEDConfig()
  const { settings } = state.config

  return (
    <div className="space-y-6">
      {/* Connection Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="websocket-url">WebSocket URL</Label>
              <Input
                id="websocket-url"
                value={settings.websocketUrl}
                onChange={(e) => updateSettings({ websocketUrl: e.target.value })}
                placeholder="ws://localhost:8080/ws"
              />
            </div>

            <div>
              <Label htmlFor="api-url">API Base URL</Label>
              <Input
                id="api-url"
                value={settings.apiBaseUrl}
                onChange={(e) => updateSettings({ apiBaseUrl: e.target.value })}
                placeholder="http://localhost:8080/api"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="auto-reconnect"
              checked={settings.autoReconnect}
              onCheckedChange={(checked) => updateSettings({ autoReconnect: checked })}
            />
            <Label htmlFor="auto-reconnect">Auto-reconnect WebSocket</Label>
          </div>
        </CardContent>
      </Card>

      {/* Performance Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Monitoring Update Interval: {settings.monitoringInterval}ms</Label>
            <Slider
              value={[settings.monitoringInterval]}
              onValueChange={([value]) => updateSettings({ monitoringInterval: value })}
              min={100}
              max={5000}
              step={100}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">How often to update monitoring displays</p>
          </div>

          <div>
            <Label>Maximum Log Entries: {settings.maxLogEntries}</Label>
            <Slider
              value={[settings.maxLogEntries]}
              onValueChange={([value]) => updateSettings({ maxLogEntries: value })}
              min={100}
              max={10000}
              step={100}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Maximum number of log entries to keep in memory</p>
          </div>
        </CardContent>
      </Card>

      {/* Save Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Save Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={saveConfig} disabled={state.loading}>
              Save All Settings
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                updateSettings({
                  websocketUrl: "ws://localhost:8080/ws",
                  apiBaseUrl: "http://localhost:8080/api",
                  autoReconnect: true,
                  monitoringInterval: 1000,
                  maxLogEntries: 1000,
                })
              }
            >
              Reset to Defaults
            </Button>
          </div>

          {state.loading && <p className="text-sm text-muted-foreground mt-2">Saving...</p>}

          {state.error && <p className="text-sm text-red-500 mt-2">{state.error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
