"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Settings, Monitor, Map, Palette, Video } from 'lucide-react'

interface SidebarNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const navItems = [
  { id: "config", label: "Config Editor", icon: Settings },
  { id: "patchmap", label: "Patch Map", icon: Map },
  { id: "monitor", label: "Monitor", icon: Monitor },
  { id: "faker", label: "Faker Patterns", icon: Palette },
  { id: "stream", label: "Stream Manager", icon: Video },
]

export function SidebarNav({ activeTab, onTabChange }: SidebarNavProps) {
  return (
    <nav className="space-y-2">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "default" : "ghost"}
            className={cn("w-full justify-start", activeTab === item.id && "bg-primary text-primary-foreground")}
            onClick={() => onTabChange(item.id)}
          >
            <Icon className="mr-2 h-4 w-4" />
            {item.label}
          </Button>
        )
      })}
    </nav>
  )
}
