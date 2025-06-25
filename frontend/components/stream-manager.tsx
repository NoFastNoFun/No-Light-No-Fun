"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Upload, Play, Square, Video, ImageIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiFetch, apiUpload } from "@/lib/api"

export function StreamManager() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [config, setConfig] = useState({
    fps: 30,
    brightness: 1.0,
    rotate: 90 as 0 | 90 | 180 | 270,
    serpentine: true,
    loop: true,
  })
  const [loading, setLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const supportedImageFormats = [".png", ".jpg", ".jpeg", ".gif", ".tiff", ".bmp"]
  const supportedVideoFormats = [".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv", ".wmv"]
  const allSupportedFormats = [...supportedImageFormats, ...supportedVideoFormats]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file size (32MB limit)
    const maxSize = 32 * 1024 * 1024 // 32MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "File size must be under 32MB",
        variant: "destructive",
      })
      return
    }

    // Check file format
    const extension = "." + file.name.split(".").pop()?.toLowerCase()
    if (!allSupportedFormats.includes(extension || "")) {
      toast({
        title: "Unsupported file format",
        description: `Supported formats: ${allSupportedFormats.join(", ")}`,
        variant: "destructive",
      })
      return
    }

    setSelectedFile(file)
    toast({
      title: "File selected",
      description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
    })
  }

  const startStream = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to stream",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("fps", config.fps.toString())
      formData.append("brightness", config.brightness.toString())
      formData.append("rotate", config.rotate.toString())
      formData.append("serpentine", config.serpentine.toString())
      formData.append("loop", config.loop.toString())

      // Simulate upload progress (since we can't track real progress with fetch)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      await apiUpload<void>("stream", formData)

      clearInterval(progressInterval)
      setUploadProgress(100)
      setIsStreaming(true)

      toast({
        title: "Stream started successfully",
        description: `Streaming ${selectedFile.name}`,
      })
    } catch (error) {
      toast({
        title: "Error starting stream",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setTimeout(() => setUploadProgress(0), 2000)
    }
  }

  const stopStream = async () => {
    setLoading(true)
    try {
      await apiFetch<void>("stream", {
        method: "DELETE",
      })

      setIsStreaming(false)
      toast({ title: "Stream stopped successfully" })
    } catch (error) {
      toast({
        title: "Error stopping stream",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getFileIcon = (file: File) => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase()
    return supportedImageFormats.includes(extension || "") ? ImageIcon : Video
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Stream Manager</h2>
        <div className="flex gap-2">
          <Button
            onClick={isStreaming ? stopStream : startStream}
            disabled={loading || (!selectedFile && !isStreaming)}
            variant={isStreaming ? "destructive" : "default"}
          >
            {isStreaming ? (
              <>
                <Square className="h-4 w-4 mr-2" />
                Stop Stream
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Stream
              </>
            )}
          </Button>
        </div>
      </div>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            File Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={() => fileInputRef.current?.click()} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Select File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept={allSupportedFormats.join(",")}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {selectedFile && (
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              {(() => {
                const FileIcon = getFileIcon(selectedFile)
                return <FileIcon className="h-8 w-8 text-muted-foreground" />
              })()}
              <div className="flex-1">
                <h4 className="font-semibold">{selectedFile.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type || "Unknown type"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedFile(null)}>
                Remove
              </Button>
            </div>
          )}

          {uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Supported formats:</strong>
            </p>
            <p>
              <strong>Images:</strong> {supportedImageFormats.join(", ")}
            </p>
            <p>
              <strong>Videos:</strong> {supportedVideoFormats.join(", ")}
            </p>
            <p>
              <strong>Max file size:</strong> 32MB
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stream Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Stream Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fps">Frame Rate (FPS)</Label>
              <Input
                id="fps"
                type="number"
                min="1"
                max="120"
                value={config.fps}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    fps: Number.parseInt(e.target.value) || 30,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="rotate">Rotation</Label>
              <Select
                value={config.rotate.toString()}
                onValueChange={(value) =>
                  setConfig((prev) => ({ ...prev, rotate: Number.parseInt(value) as 0 | 90 | 180 | 270 }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0° (No rotation)</SelectItem>
                  <SelectItem value="90">90° (Clockwise)</SelectItem>
                  <SelectItem value="180">180° (Upside down)</SelectItem>
                  <SelectItem value="270">270° (Counter-clockwise)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Brightness Control */}
          <div>
            <Label>Brightness: {(config.brightness * 100).toFixed(0)}%</Label>
            <Slider
              value={[config.brightness]}
              onValueChange={([value]) => setConfig((prev) => ({ ...prev, brightness: value }))}
              max={1}
              step={0.01}
              className="mt-2"
            />
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="serpentine">Serpentine Layout</Label>
                <p className="text-sm text-muted-foreground">Flip every odd LED row for serpentine wiring</p>
              </div>
              <Switch
                id="serpentine"
                checked={config.serpentine}
                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, serpentine: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="loop">Loop Video</Label>
                <p className="text-sm text-muted-foreground">Restart video when it reaches the end</p>
              </div>
              <Switch
                id="loop"
                checked={config.loop}
                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, loop: checked }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stream Status */}
      {isStreaming && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-green-500" />
              Stream Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">File:</span>
                <span className="text-sm font-medium">{selectedFile?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">FPS:</span>
                <span className="text-sm font-medium">{config.fps}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Brightness:</span>
                <span className="text-sm font-medium">{(config.brightness * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Rotation:</span>
                <span className="text-sm font-medium">{config.rotate}°</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • <strong>Images:</strong> Will be displayed as static content on the LED wall
          </p>
          <p>
            • <strong>Videos:</strong> Will play continuously with the specified frame rate
          </p>
          <p>
            • <strong>Rotation:</strong> Use 90° for portrait content on landscape displays
          </p>
          <p>
            • <strong>Serpentine:</strong> Enable if your LED strips are wired in a zigzag pattern
          </p>
          <p>
            • <strong>Brightness:</strong> Adjust to prevent overloading your power supply
          </p>
          <p>
            • <strong>Loop:</strong> Videos will restart automatically when enabled
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
