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
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipRegex.test(ip)
}

/**
 * Convert RGBW to hex string
 */
export function toRgbwHex(color: RGBWColor): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0")
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}${toHex(color.w)}`
}

/**
 * Convert hex string to RGBW
 */
export function fromRgbwHex(hex: string): RGBWColor {
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
  const headers = ["fromChannel", "toChannel"]
  const rows = data.map((entry) => [entry.fromChannel, entry.toChannel])
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
  const lines = csvContent.trim().split("\n")
  const entries: PatchEntry[] = []

  // Skip header row if present
  const startIndex = lines[0]?.toLowerCase().includes("channel") ? 1 : 0

  for (let i = startIndex; i < lines.length; i++) {
    const [fromChannel, toChannel] = lines[i].split(",").map((s) => Number.parseInt(s.trim()))
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
  return new Date(ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  })
}

/**
 * Validate DMX universe (1-32768)
 */
export function validateUniverse(universe: number): boolean {
  return Number.isInteger(universe) && universe >= 1 && universe <= 32768
}

/**
 * Validate DMX channel (1-512)
 */
export function validateChannel(channel: number): boolean {
  return Number.isInteger(channel) && channel >= 1 && channel <= 512
}
