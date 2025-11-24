"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Play, Pause, Mountain, Waves, Shovel, Trees as Tree, Trash2, Grid3x3, RotateCcw, Menu, EyeOff, Sprout, Bridge } from "lucide-react"
import type { StreamState, Tool } from "./stream-trailer"

interface StreamControlsProps {
  streamState: StreamState
  setStreamState: (state: StreamState | ((prev: StreamState) => StreamState)) => void
}

export function StreamControls({ streamState, setStreamState }: StreamControlsProps) {
  const [isVisible, setIsVisible] = useState(true)

  const tools: { id: Tool; icon: typeof Shovel; label: string }[] = [
    { id: "dig", icon: Shovel, label: "Dig Channel" },
    { id: "fill", icon: Mountain, label: "Add Terrain" },
    { id: "tree", icon: Tree, label: "Trees" },
    { id: "grass", icon: Sprout, label: "Grass" },
    { id: "bridge", icon: Bridge, label: "Bridge" },
    { id: "remove", icon: Trash2, label: "Remove Plants" },
  ]

  return (
    <div className="absolute top-4 left-4 right-4 pointer-events-none flex flex-col gap-4 items-start z-50">
      {/* Toggle Button */}
      <div className="pointer-events-auto">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setIsVisible(!isVisible)}
          className="bg-slate-800/95 border-slate-700 backdrop-blur-sm text-white hover:bg-slate-700"
        >
          {isVisible ? (
            <>
              <EyeOff className="w-4 h-4 mr-2" />
              Hide Controls
            </>
          ) : (
            <>
              <Menu className="w-4 h-4 mr-2" />
              Show Controls
            </>
          )}
        </Button>
      </div>

      {/* Main Controls Container */}
      {isVisible && (
        <div className="flex flex-col gap-4 w-full max-w-md animate-in fade-in slide-in-from-top-4 duration-200">
          {/* Title */}
          <Card className="pointer-events-auto bg-slate-800/95 border-slate-700 backdrop-blur-sm p-4">
            <div className="flex items-center gap-3">
              <Waves className="w-6 h-6 text-blue-400" />
              <div>
                <h1 className="text-xl font-bold text-white">Stream Trailer Simulator</h1>
                <p className="text-sm text-slate-300">Interactive Hydrology Education Tool</p>
              </div>
            </div>
          </Card>

          <div className="flex gap-4 flex-wrap max-w-full">
            {/* Water Controls */}
            <Card className="pointer-events-auto bg-slate-800/95 border-slate-700 backdrop-blur-sm p-4 min-w-[280px] flex-1">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Waves className="w-4 h-4 text-blue-400" />
                Water Flow
              </h2>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={streamState.waterFlow ? "default" : "outline"}
                    onClick={() => setStreamState({ ...streamState, waterFlow: !streamState.waterFlow })}
                    className="flex-1"
                  >
                    {streamState.waterFlow ? (
                      <>
                        <Pause className="w-4 h-4 mr-1" />
                        Stop Flow
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1" />
                        Start Flow
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Flow Rate: {streamState.flowRate.toFixed(2)}</Label>
                  <Slider
                    value={[streamState.flowRate]}
                    onValueChange={([value]) => setStreamState({ ...streamState, flowRate: value })}
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">
                    Terrain Slope: {(streamState.slope * 100).toFixed(1)}%
                  </Label>
                  <Slider
                    value={[streamState.slope]}
                    onValueChange={([value]) => setStreamState({ ...streamState, slope: value })}
                    min={0.01}
                    max={0.1}
                    step={0.005}
                    className="w-full"
                  />
                </div>
              </div>
            </Card>

            {/* Tool Selection */}
            <Card className="pointer-events-auto bg-slate-800/95 border-slate-700 backdrop-blur-sm p-4 flex-1 min-w-[280px]">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Shovel className="w-4 h-4 text-amber-400" />
                Terrain Tools
              </h2>

              <div className="grid grid-cols-2 gap-2">
                {tools.map((tool) => {
                  const Icon = tool.icon
                  const isSelected = streamState.selectedTool === tool.id

                  return (
                    <Button
                      key={tool.id}
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() =>
                        setStreamState({
                          ...streamState,
                          selectedTool: isSelected ? "none" : tool.id,
                        })
                      }
                      className={`flex items-center gap-1 ${isSelected ? "ring-2 ring-blue-500" : ""}`}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="text-xs">{tool.label}</span>
                    </Button>
                  )
                })}
              </div>
            </Card>

            {/* View Options */}
            <Card className="pointer-events-auto bg-slate-800/95 border-slate-700 backdrop-blur-sm p-4 w-full sm:w-auto">
              <h2 className="text-sm font-semibold text-white mb-3">View Options</h2>

              <div className="flex flex-row sm:flex-col gap-2">
                <Button
                  size="sm"
                  variant={streamState.showGrid ? "default" : "outline"}
                  onClick={() => setStreamState({ ...streamState, showGrid: !streamState.showGrid })}
                  className="flex-1"
                >
                  <Grid3x3 className="w-4 h-4 mr-1" />
                  {streamState.showGrid ? "Hide Grid" : "Show Grid"}
                </Button>

                <Button size="sm" variant="outline" onClick={() => window.location.reload()} className="flex-1">
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset Scene
                </Button>
              </div>
            </Card>
          </div>

          {/* Instructions */}
          <Card className="pointer-events-auto bg-slate-800/95 border-slate-700 backdrop-blur-sm p-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white">Controls:</strong> Drag to rotate view, scroll to zoom, right-click to pan.
              Select a tool and click on the terrain to modify it. Start water flow to observe erosion and deposition
              patterns.
            </p>
          </Card>
        </div>
      )}
    </div>
  )
}
