"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Wifi, WifiOff, RefreshCw, Trash2 } from "lucide-react"
import { useWebSocket } from "@/contexts/websocket-context"
import { useLEDConfig } from "@/contexts/led-config-context"
import type { ArtNetPacketSummary, EntityUpdatePayload } from "@/types/led-config"

/**
 * Real-time monitoring dashboard
 * Shows incoming WebSocket messages and outgoing ArtNet packet summaries
 */
export function MonitoringDashboard() {
  const { state: wsState, messages, stats, reconnect } = useWebSocket()
  const { state: configState } = useLEDConfig()
  const [artNetPackets, setArtNetPackets] = useState<ArtNetPacketSummary[]>([])
  const [entityUpdates, setEntityUpdates] = useState<EntityUpdatePayload[]>([])

  // Filter messages by type
  useEffect(() => {
    const artNetMessages = messages.filter((m) => m.type === "artnet_packet")
    const entityMessages = messages.filter((m) => m.type === "entity_update")

    setArtNetPackets(artNetMessages.map((m) => m.payload as ArtNetPacketSummary))
    setEntityUpdates(entityMessages.map((m) => m.payload as EntityUpdatePayload))
  }, [messages])

  /**
   * Get connection status color
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-500"
      case "connecting":
        return "bg-yellow-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  /**
   * Format message timestamp
   */
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    })
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(wsState)}`} />
              <div>
                <p className="text-sm font-medium">WebSocket</p>
                <p className="text-xs text-muted-foreground capitalize">{wsState}</p>
              </div>
              {wsState !== "connected" && (
                <Button size="sm" variant="outline" onClick={reconnect}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Messages Received</p>
                <p className="text-xs text-muted-foreground">{stats.messagesReceived}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Messages Sent</p>
                <p className="text-xs text-muted-foreground">{stats.messagesSent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Reconnect Attempts</p>
                <p className="text-xs text-muted-foreground">{stats.reconnectAttempts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monitoring Tabs */}
      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="messages">All Messages</TabsTrigger>
          <TabsTrigger value="artnet">ArtNet Packets</TabsTrigger>
          <TabsTrigger value="entities">Entity Updates</TabsTrigger>
          <TabsTrigger value="receivers">Receiver Status</TabsTrigger>
        </TabsList>

        {/* All Messages */}
        <TabsContent value="messages">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Messages ({messages.length})</CardTitle>
              <Button size="sm" variant="outline">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No messages received yet</p>
                  ) : (
                    messages.map((message, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                        <Badge variant="outline" className="text-xs">
                          {message.type}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
                          </div>
                          <pre className="text-xs mt-1 overflow-x-auto">{JSON.stringify(message.payload, null, 2)}</pre>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ArtNet Packets */}
        <TabsContent value="artnet">
          <Card>
            <CardHeader>
              <CardTitle>ArtNet Packet Summary ({artNetPackets.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {artNetPackets.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No ArtNet packets logged yet</p>
                  ) : (
                    artNetPackets.map((packet, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">Universe {packet.universe}</Badge>
                          <span className="text-sm">{packet.targetIp}</span>
                          <span className="text-xs text-muted-foreground">
                            {packet.channelCount} channels • {packet.size} bytes
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">{formatTime(packet.timestamp)}</div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Entity Updates */}
        <TabsContent value="entities">
          <Card>
            <CardHeader>
              <CardTitle>Entity Updates ({entityUpdates.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {entityUpdates.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No entity updates logged yet</p>
                  ) : (
                    entityUpdates.map((update, index) => {
                      const entity = configState.config.entities.find((e) => e.id === update.entityId)
                      return (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <span className="font-medium">{entity?.name || update.entityId}</span>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="text-xs">
                                R:{update.color.r}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                G:{update.color.g}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                B:{update.color.b}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                W:{update.color.w}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">{formatTime(update.timestamp)}</div>
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receiver Status */}
        <TabsContent value="receivers">
          <Card>
            <CardHeader>
              <CardTitle>Receiver Status ({configState.config.receivers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {configState.config.receivers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No receivers configured</p>
                ) : (
                  configState.config.receivers.map((receiver) => (
                    <div key={receiver.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        {receiver.connected ? (
                          <Wifi className="h-5 w-5 text-green-500" />
                        ) : (
                          <WifiOff className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <h4 className="font-semibold">{receiver.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {receiver.ipAddress}:{receiver.port}
                          </p>
                        </div>
                        <Badge variant={receiver.connected ? "default" : "secondary"}>
                          {receiver.connected ? "Connected" : "Disconnected"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {receiver.lastSeen ? `Last seen: ${receiver.lastSeen.toLocaleTimeString()}` : "Never connected"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
