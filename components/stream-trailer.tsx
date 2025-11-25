"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, Grid } from "@react-three/drei"
import { Physics } from "@react-three/rapier"
import { TrailerScene } from "./trailer-scene"
import { StreamControls } from "./stream-controls"
import { useState } from "react"

export type Tool = "dig" | "fill" | "tree" | "grass" | "bridge" | "remove" | "none"

export interface StreamState {
  waterFlow: boolean
  flowRate: number
  slope: number
  selectedTool: Tool
  showGrid: boolean
  erosionRate: number // 0 to 1
  plants: PlantInstance[] // Added plants state to track vegetation
}

export interface PlantInstance {
  id: string
  position: [number, number, number]
  type: "tree" | "shrub" | "grass" | "bridge"
  scale: number
}

export function StreamTrailer() {
  const [streamState, setStreamState] = useState<StreamState>({
    waterFlow: false,
    flowRate: 0.5,
    slope: 0.02,
    selectedTool: "none",
    showGrid: true,
    erosionRate: 0.1,
    plants: [], // Initialize empty plants array
  })

  return (
    <div className="relative w-full h-full">
      <Canvas camera={{ position: [0, 8, 20], fov: 50 }} shadows gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={["#1e293b"]} />

        {/* Lighting setup */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
        />
        <pointLight position={[-10, 10, -10]} intensity={0.5} color="#a0c4ff" />

        {/* Environment and controls */}
        <Environment preset="sunset" />
        <OrbitControls
          makeDefault
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={5}
          maxDistance={30}
          enablePan={true}
        />

        {/* Physics-enabled scene */}
        <Physics gravity={[0, -9.81, 0]}>
          <TrailerScene streamState={streamState} setStreamState={setStreamState} />
        </Physics>

        {/* Optional grid for reference */}
        {streamState.showGrid && (
          <Grid
            args={[20, 20]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#475569"
            sectionSize={2}
            sectionThickness={1}
            sectionColor="#64748b"
            fadeDistance={25}
            fadeStrength={1}
            position={[0, -0.01, 0]}
          />
        )}
      </Canvas>

      {/* UI Controls Overlay */}
      <StreamControls streamState={streamState} setStreamState={setStreamState} />
    </div>
  )
}
