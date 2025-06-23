"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReceiverConfigPanel } from "./receiver-config-panel"
import { EntityConfigPanel } from "./entity-config-panel"
import { SystemSettingsPanel } from "./system-settings-panel"

/**
 * Main configuration panel with tabbed interface
 */
export function ConfigurationPanel() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="receivers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="receivers">Receivers</TabsTrigger>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="receivers" className="space-y-4">
          <ReceiverConfigPanel />
        </TabsContent>

        <TabsContent value="entities" className="space-y-4">
          <EntityConfigPanel />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SystemSettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
