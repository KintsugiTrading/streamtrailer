"use client"
import { TerrainMesh } from "./terrain-mesh"
import { WaterSystem } from "./water-system"
import { TrailerContainer } from "./trailer-container"
import { Vegetation } from "./vegetation"
import type { StreamState } from "./stream-trailer"

interface TrailerSceneProps {
  streamState: StreamState
  setStreamState?: (state: StreamState | ((prev: StreamState) => StreamState)) => void
}

import { useState, useCallback } from "react"

export function TrailerScene({ streamState, setStreamState }: TrailerSceneProps) {
  const [heightMap, setHeightMap] = useState<Float32Array | null>(null)

  const handleHeightMapChange = useCallback((heights: Float32Array) => {
    setHeightMap(heights)
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
      />
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
