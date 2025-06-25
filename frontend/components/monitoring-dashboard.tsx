"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Activity, Wifi, WifiOff } from "lucide-react"
import { useWebSocket } from "@/contexts/websocket-context"
import { formatTimestamp } from "@/lib/utils"

export function MonitoringDashboard() {
  const { connected, configPackets, artNetMessages, reconnect, stats } = useWebSocket()
  const [autoScroll, setAutoScroll] = useState(true)

  // Safe access to arrays with null/undefined checks
  const safeConfigPackets = configPackets || []
  const safeArtNetMessages = artNetMessages || []
  const safeStats = stats || {
    totalConfigPackets: 0,
    totalArtNetMessages: 0,
    lastConfigPacketSize: 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Real-time Monitor</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {connected ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
            <Badge variant={connected ? "default" : "secondary"}>{connected ? "Connected" : "Disconnected"}</Badge>
          </div>
          {!connected && (
            <Button onClick={reconnect} variant="outline" size="sm">
              Reconnect
            </Button>
          )}
        </div>
      </div>

      {/* Connection Info */}
      <Card>
        <CardHeader>
          <CardTitle>WebSocket Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Endpoint:</span>
              <span className="font-mono">/ws/ehub</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={connected ? "default" : "secondary"}>{connected ? "Connected" : "Disconnected"}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Enable monitoring in the Configuration Editor to receive real-time data. Available endpoints: /ws/ehub
              (JSON), /ws/dmx (binary), /ws/artnet-in (binary)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Config Packets</p>
                <p className="text-2xl font-bold">{safeStats.totalConfigPackets}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Binary Messages</p>
                <p className="text-2xl font-bold">{safeStats.totalArtNetMessages}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Last Config Size</p>
                <p className="text-2xl font-bold">{safeStats.lastConfigPacketSize} bytes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monitor Panes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incoming eHub Config Pane */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>eHub Messages (JSON)</CardTitle>
            <div className="flex items-center space-x-2">
              <Switch id="auto-scroll-config" checked={autoScroll} onCheckedChange={setAutoScroll} />
              <Label htmlFor="auto-scroll-config" className="text-sm">
                Auto-scroll
              </Label>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {safeConfigPackets.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No config packets received yet</p>
                ) : (
                  safeConfigPackets.map((packet, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">CONFIG</Badge>
                        <span className="text-sm font-medium">{packet?.len || 0} bytes</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date().toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Binary Data Pane */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Binary Messages (DMX/Art-Net)</CardTitle>
            <div className="flex items-center space-x-2">
              <Switch id="auto-scroll-binary" checked={autoScroll} onCheckedChange={setAutoScroll} />
              <Label htmlFor="auto-scroll-binary" className="text-sm">
                Auto-scroll
              </Label>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {safeArtNetMessages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No binary messages received yet</p>
                ) : (
                  <div className="space-y-1">
                    {/* Table Header */}
                    <div className="grid grid-cols-4 gap-2 p-2 bg-muted rounded text-xs font-semibold">
                      <div>Time</div>
                      <div>Source</div>
                      <div>Universe</div>
                      <div>Channels</div>
                    </div>
                    {/* Table Rows */}
                    {safeArtNetMessages.map((message, index) => (
                      <div key={index} className="grid grid-cols-4 gap-2 p-2 border rounded text-sm">
                        <div className="text-xs text-muted-foreground">
                          {message?.ts ? formatTimestamp(message.ts) : "N/A"}
                        </div>
                        <div className="font-mono text-xs">{message?.ip || "N/A"}</div>
                        <div>
                          <Badge variant="outline" className="text-xs">
                            U{message?.universe || 0}
                          </Badge>
                        </div>
                        <div className="text-xs">{message?.channels || 0} ch</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
