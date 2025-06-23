"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Wifi, WifiOff } from "lucide-react"
import { useLEDConfig } from "@/contexts/led-config-context"
import type { ReceiverConfig } from "@/types/led-config"

/**
 * Receiver configuration panel
 * Manages LED controller receiver IP addresses and settings
 */
export function ReceiverConfigPanel() {
  const { state, addReceiver, updateReceiver, removeReceiver } = useLEDConfig()
  const [newReceiver, setNewReceiver] = useState<Partial<ReceiverConfig>>({
    name: "",
    ipAddress: "",
    port: 6454,
  })

  /**
   * Add new receiver configuration
   */
  const handleAddReceiver = () => {
    if (!newReceiver.name || !newReceiver.ipAddress) {
      return
    }

    const receiver: ReceiverConfig = {
      id: crypto.randomUUID(),
      name: newReceiver.name,
      ipAddress: newReceiver.ipAddress,
      port: newReceiver.port || 6454,
      connected: false,
    }

    addReceiver(receiver)
    setNewReceiver({ name: "", ipAddress: "", port: 6454 })
  }

  /**
   * Validate IP address format
   */
  const isValidIP = (ip: string): boolean => {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    return ipRegex.test(ip)
  }

  return (
    <div className="space-y-6">
      {/* Add New Receiver */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Receiver
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="receiver-name">Name</Label>
              <Input
                id="receiver-name"
                placeholder="Receiver 1"
                value={newReceiver.name || ""}
                onChange={(e) => setNewReceiver((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="receiver-ip">IP Address</Label>
              <Input
                id="receiver-ip"
                placeholder="192.168.1.100"
                value={newReceiver.ipAddress || ""}
                onChange={(e) => setNewReceiver((prev) => ({ ...prev, ipAddress: e.target.value }))}
                className={newReceiver.ipAddress && !isValidIP(newReceiver.ipAddress) ? "border-red-500" : ""}
              />
            </div>
            <div>
              <Label htmlFor="receiver-port">Port</Label>
              <Input
                id="receiver-port"
                type="number"
                placeholder="6454"
                value={newReceiver.port || ""}
                onChange={(e) => setNewReceiver((prev) => ({ ...prev, port: Number.parseInt(e.target.value) || 6454 }))}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAddReceiver}
                disabled={!newReceiver.name || !newReceiver.ipAddress || !isValidIP(newReceiver.ipAddress || "")}
                className="w-full"
              >
                Add Receiver
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Receivers */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Configured Receivers ({state.config.receivers.length})</h3>

        {state.config.receivers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No receivers configured. Add a receiver to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {state.config.receivers.map((receiver) => (
              <Card key={receiver.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
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
                      </div>
                      <Badge variant={receiver.connected ? "default" : "secondary"}>
                        {receiver.connected ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      {receiver.lastSeen && (
                        <span className="text-xs text-muted-foreground">
                          Last seen: {receiver.lastSeen.toLocaleTimeString()}
                        </span>
                      )}
                      <Button variant="outline" size="sm" onClick={() => removeReceiver(receiver.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
