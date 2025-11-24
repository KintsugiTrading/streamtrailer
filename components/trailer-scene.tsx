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

export function TrailerScene({ streamState, setStreamState }: TrailerSceneProps) {
  return (
    <group>
      {/* Physical trailer container */}
      <TrailerContainer />
      {/* Interactive terrain */}
      <TerrainMesh
        streamState={streamState}
        setStreamState={setStreamState} // Pass setter to terrain
      />
      {/* Water simulation */}
      {streamState.waterFlow && <WaterSystem flowRate={streamState.flowRate} slope={streamState.slope} />}
      {/* Vegetation markers */}
      <Vegetation plants={streamState.plants} /> {/* Pass plants data */}
    </group>
  )
}
