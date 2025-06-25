import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PatchEntry, RGBWColor } from "@/types/led-config"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validate IP address format
 */
export function validateIp(ip: string): boolean {
  if (!ip || typeof ip !== "string") return false
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipRegex.test(ip)
}

/**
 * Convert RGBW to hex string
 */
export function toRgbwHex(color: RGBWColor): string {
  if (!color || typeof color !== "object") {
    return "#00000000"
  }
  const toHex = (n: number) => {
    const safe = Math.max(0, Math.min(255, n || 0))
    return safe.toString(16).padStart(2, "0")
  }
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}${toHex(color.w)}`
}

/**
 * Convert hex string to RGBW
 */
export function fromRgbwHex(hex: string): RGBWColor {
  if (!hex || typeof hex !== "string") {
    return { r: 0, g: 0, b: 0, w: 0 }
  }
  const clean = hex.replace("#", "")
  return {
    r: Number.parseInt(clean.substr(0, 2), 16) || 0,
    g: Number.parseInt(clean.substr(2, 2), 16) || 0,
    b: Number.parseInt(clean.substr(4, 2), 16) || 0,
    w: Number.parseInt(clean.substr(6, 2), 16) || 0,
  }
}

/**
 * Download data as CSV file
 */
export function downloadCsv(data: PatchEntry[], filename: string): void {
  if (!Array.isArray(data)) {
    console.warn("downloadCsv: data is not an array")
    return
  }

  const headers = ["fromChannel", "toChannel"]
  const rows = data
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => [entry.fromChannel || 0, entry.toChannel || 0])
  const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n")

  const blob = new Blob([csvContent], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Parse CSV content to patch entries
 */
export function parseCsv(csvContent: string): PatchEntry[] {
  if (!csvContent || typeof csvContent !== "string") {
    return []
  }

  const lines = csvContent.trim().split("\n")
  const entries: PatchEntry[] = []

  // Skip header row if present
  const startIndex = lines[0]?.toLowerCase().includes("channel") ? 1 : 0

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]
    if (!line || typeof line !== "string") continue

    const [fromChannel, toChannel] = line.split(",").map((s) => Number.parseInt(s.trim()))
    if (!isNaN(fromChannel) && !isNaN(toChannel)) {
      entries.push({ fromChannel, toChannel })
    }
  }

  return entries
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(ts: number): string {
  if (!ts || typeof ts !== "number") {
    return "N/A"
  }
  return new Date(ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  })
}

/**
 * Validate DMX universe (0-200 for this system)
 */
export function validateUniverse(universe: number): boolean {
  return Number.isInteger(universe) && universe >= 0 && universe <= 200
}

/**
 * Validate DMX channel (1-512)
 */
export function validateChannel(channel: number): boolean {
  return Number.isInteger(channel) && channel >= 1 && channel <= 512
}
