"use client"

import { useState } from "react"
import { WebSocketProvider } from "@/contexts/websocket-context"
import { SidebarNav } from "@/components/sidebar-nav"
import { ConfigEditor } from "@/components/config-editor"
import { PatchMapManager } from "@/components/patch-map-manager"
import { MonitoringDashboard } from "@/components/monitoring-dashboard"
import { FakerManager } from "@/components/faker-manager"
import { StreamManager } from "@/components/stream-manager"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export default function LEDRoutingApp() {
  const [activeTab, setActiveTab] = useState("config")

  const renderContent = () => {
    switch (activeTab) {
      case "config":
        return <ConfigEditor />
      case "patchmap":
        return <PatchMapManager />
      case "monitor":
        return <MonitoringDashboard />
      case "faker":
        return <FakerManager />
      case "stream":
        return <StreamManager />
      default:
        return <ConfigEditor />
    }
  }

  return (
    <WebSocketProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b">
          <div className="flex h-16 items-center px-6">
            <h1 className="text-xl font-bold">LED Router Controller</h1>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 border-r bg-muted/10 p-6">
            <SidebarNav activeTab={activeTab} onTabChange={setActiveTab} />
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6">{renderContent()}</main>
        </div>
      </div>
    </WebSocketProvider>
  )
}
