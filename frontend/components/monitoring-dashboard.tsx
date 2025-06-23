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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Config Packets</p>
                <p className="text-2xl font-bold">{stats.totalConfigPackets}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Art-Net Messages</p>
                <p className="text-2xl font-bold">{stats.totalArtNetMessages}</p>
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
                <p className="text-2xl font-bold">{stats.lastConfigPacketSize} bytes</p>
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
            <CardTitle>Incoming eHub Config</CardTitle>
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
                {configPackets.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No config packets received yet</p>
                ) : (
                  configPackets.map((packet, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">CONFIG</Badge>
                        <span className="text-sm font-medium">{packet.len} bytes</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date().toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Outgoing Art-Net Pane */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Outgoing Art-Net</CardTitle>
            <div className="flex items-center space-x-2">
              <Switch id="auto-scroll-artnet" checked={autoScroll} onCheckedChange={setAutoScroll} />
              <Label htmlFor="auto-scroll-artnet" className="text-sm">
                Auto-scroll
              </Label>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {artNetMessages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No Art-Net messages sent yet</p>
                ) : (
                  <div className="space-y-1">
                    {/* Table Header */}
                    <div className="grid grid-cols-4 gap-2 p-2 bg-muted rounded text-xs font-semibold">
                      <div>Time</div>
                      <div>IP</div>
                      <div>Universe</div>
                      <div>Channels</div>
                    </div>
                    {/* Table Rows */}
                    {artNetMessages.map((message, index) => (
                      <div key={index} className="grid grid-cols-4 gap-2 p-2 border rounded text-sm">
                        <div className="text-xs text-muted-foreground">{formatTimestamp(message.ts)}</div>
                        <div className="font-mono text-xs">{message.ip}</div>
                        <div>
                          <Badge variant="outline" className="text-xs">
                            U{message.universe}
                          </Badge>
                        </div>
                        <div className="text-xs">{message.channels} ch</div>
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
