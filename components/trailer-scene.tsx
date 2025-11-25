"use client"
import { TerrainMesh } from "./terrain-mesh"
import { WaterSystem } from "./water-system"
import { WaterSurface } from "./water-surface"
import { TrailerContainer } from "./trailer-container"
import { Vegetation } from "./vegetation"
import type { StreamState } from "./stream-trailer"
import type { ErosionSystem } from "../lib/erosion-physics"

interface TrailerSceneProps {
  streamState: StreamState
  setStreamState?: (state: StreamState | ((prev: StreamState) => StreamState)) => void
}

import { useState, useCallback } from "react"

export function TrailerScene({ streamState, setStreamState }: TrailerSceneProps) {
  const [heightMap, setHeightMap] = useState<Float32Array | null>(null)
  const [erosionSystem, setErosionSystem] = useState<ErosionSystem | null>(null)

  const handleHeightMapChange = useCallback((heights: Float32Array) => {
    setHeightMap(heights)
  }, [])

  const handleErosionSystemChange = useCallback((system: ErosionSystem) => {
    setErosionSystem(system)
  }, [])

  return (
    <group>
      {/* Physical trailer container */}
      <TrailerContainer />
      {/* Interactive terrain */}
      <TerrainMesh
        streamState={streamState}
        setStreamState={setStreamState} // Pass setter to terrain
        onHeightMapChange={handleHeightMapChange}
        onErosionSystemChange={handleErosionSystemChange}
      />
      {/* Water surface layer */}
      <WaterSurface erosionSystem={erosionSystem} terrainHeights={heightMap} />
      {/* Water simulation */}
      {streamState.waterFlow && (
        <WaterSystem
          flowRate={streamState.flowRate}
          slope={streamState.slope}
          heightMap={heightMap}
          plants={streamState.plants}
        />
      )}
      {/* Vegetation markers */}
      <Vegetation plants={streamState.plants} /> {/* Pass plants data */}
    </group>
  )
}
