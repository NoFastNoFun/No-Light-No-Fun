"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfigurationPanel } from "@/components/configuration-panel"
import { MonitoringDashboard } from "@/components/monitoring-dashboard"
import { EntitySimulator } from "@/components/entity-simulator"
import { ImportExportPanel } from "@/components/import-export-panel"
import { PatchMapManager } from "@/components/patch-map-manager"
import { LEDConfigProvider } from "@/contexts/led-config-context"
import { WebSocketProvider } from "@/contexts/websocket-context"

export default function LEDRoutingApp() {
  return (
    <LEDConfigProvider>
      <WebSocketProvider>
        <div className="min-h-screen bg-background">
          <header className="border-b">
            <div className="container mx-auto px-4 py-4">
              <h1 className="text-2xl font-bold">LED Routing Controller</h1>
              <p className="text-muted-foreground">Configure and monitor LED routing for lighting controller systems</p>
            </div>
          </header>

          <main className="container mx-auto px-4 py-6">
            <Tabs defaultValue="configuration" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="configuration">Configuration</TabsTrigger>
                <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                <TabsTrigger value="patch-map">Patch Map</TabsTrigger>
                <TabsTrigger value="simulator">Simulator</TabsTrigger>
                <TabsTrigger value="import-export">Import/Export</TabsTrigger>
              </TabsList>

              <TabsContent value="configuration">
                <Card>
                  <CardHeader>
                    <CardTitle>LED Routing Configuration</CardTitle>
                    <CardDescription>
                      Configure receiver IP addresses, entity assignments, and DMX parameters
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ConfigurationPanel />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="monitoring">
                <Card>
                  <CardHeader>
                    <CardTitle>Real-time Monitoring</CardTitle>
                    <CardDescription>Monitor incoming messages and outgoing ArtNet packets</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MonitoringDashboard />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="patch-map">
                <Card>
                  <CardHeader>
                    <CardTitle>Patch Map Management</CardTitle>
                    <CardDescription>Configure DMX rerouting and patch mappings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PatchMapManager />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="simulator">
                <Card>
                  <CardHeader>
                    <CardTitle>Entity Simulator</CardTitle>
                    <CardDescription>Simulate entity updates for testing configurations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EntitySimulator />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="import-export">
                <Card>
                  <CardHeader>
                    <CardTitle>Configuration Import/Export</CardTitle>
                    <CardDescription>Import and export configurations as CSV or Excel files</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ImportExportPanel />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </WebSocketProvider>
    </LEDConfigProvider>
  )
}
