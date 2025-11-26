"use client"

import { useRef, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { StreamState } from "./stream-trailer"
import { createNoise2D } from "simplex-noise"
import { ErosionSystem, sampleBilinear } from "../lib/erosion-physics"

interface TerrainMeshProps {
  streamState: StreamState
  setStreamState?: (state: StreamState | ((prev: StreamState) => StreamState)) => void
  setIsInteracting?: (interacting: boolean) => void
  onHeightMapChange?: (heights: Float32Array) => void
  onErosionSystemChange?: (erosionSystem: ErosionSystem) => void
}

export const WIDTH = 64
export const HEIGHT = 128
export const SIZE_X = 9
export const SIZE_Z = 15

export function TerrainMesh({ streamState, setStreamState, setIsInteracting, onHeightMapChange, onErosionSystemChange }: TerrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const { geometry, heights, baseColors } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE_X, SIZE_Z, WIDTH - 1, HEIGHT - 1)
    geo.rotateX(-Math.PI / 2)

    const positions = geo.attributes.position
    const vertexCount = positions.count
    const heightData = new Float32Array(vertexCount)
    const colors = new Float32Array(vertexCount * 3)

    const noise2D = createNoise2D()

    for (let i = 0; i < vertexCount; i++) {
      const x = positions.getX(i)
      const z = positions.getZ(i)

      // Slope from back to front
      const slopeHeight = (-z / SIZE_Z + 0.5) * 1.5
      const noise = noise2D(x * 0.5, z * 0.5) * 0.3

      // Channel in middle
      const channel = Math.exp(-(x * x) / 3) * 0.4

      const h = Math.max(0.05, slopeHeight + noise - channel)
      heightData[i] = h
      positions.setY(i, h)

      // Sand colors
      colors[i * 3] = 0.76 + Math.random() * 0.05
      colors[i * 3 + 1] = 0.7 + Math.random() * 0.05
      colors[i * 3 + 2] = 0.5 + Math.random() * 0.05
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()

    // Store base colors for restoration when dry
    const baseColors = new Float32Array(colors)

    return { geometry: geo, heights: heightData, baseColors }
  }, [])

  // Initialize Erosion System
  const erosionSystem = useMemo(() => new ErosionSystem(WIDTH, HEIGHT), [])

  // Expose erosion system
  useEffect(() => {
    if (onErosionSystemChange) {
      onErosionSystemChange(erosionSystem)
    }
  }, [onErosionSystemChange, erosionSystem])

  // Initial height map update
  useEffect(() => {
    if (onHeightMapChange && heights) {
      onHeightMapChange(heights)
    }
  }, [onHeightMapChange, heights])

  // Erosion simulation
  useFrame((_, delta) => {
    if (!geometry) return

    // Run simulation
    // Clamp delta to avoid instability
    const dt = Math.min(delta, 0.05)

    // We run simulation even if waterFlow is false, to allow water to drain/evaporate
    // Only stop if no water and no flow? For now, just run it.
    erosionSystem.simulate(heights, dt, streamState.flowRate, streamState.waterFlow, streamState.erosionRate)

    const positions = geometry.attributes.position
    const colorAttr = geometry.attributes.color
    if (!positions || !colorAttr) return

    let changed = true // Always update for animation

    for (let i = 0; i < heights.length; i++) {
      // Update height
      positions.setY(i, heights[i])

      // Always restore base sand color (no more blue spiky vertices)
      if (baseColors) {
        colorAttr.setXYZ(i, baseColors[i * 3], baseColors[i * 3 + 1], baseColors[i * 3 + 2])
      }
    }

    if (changed) {
      positions.needsUpdate = true
      colorAttr.needsUpdate = true
      geometry.computeVertexNormals()
      if (onHeightMapChange) {
        onHeightMapChange(heights)
      }
    }
  })

  const handlePointerDown = (e: THREE.Event & { point: THREE.Vector3; stopPropagation: () => void }) => {
    if (streamState.selectedTool === "none") return
    e.stopPropagation()

    // Notify parent that interaction started
    if (setIsInteracting) {
      setIsInteracting(true)
    }

    const point = e.point

    if ((streamState.selectedTool === "tree" || streamState.selectedTool === "grass" || streamState.selectedTool === "bridge") && setStreamState) {

      const getWorldHeight = (wx: number, wz: number) => {
        // Map world coordinates to grid coordinates
        // World X: [-SIZE_X/2, SIZE_X/2] -> Grid X: [0, WIDTH-1]
        // World Z: [-SIZE_Z/2, SIZE_Z/2] -> Grid Y: [0, HEIGHT-1]

        // Note: PlaneGeometry vertices are created row by row.
        // Usually row 0 corresponds to -Z (top) or +Z (bottom) depending on rotation.
        // With rotateX(-PI/2), the plane faces up.
        // Let's assume standard mapping where (0,0) index is at (-SIZE_X/2, -SIZE_Z/2).

        const gridX = ((wx + SIZE_X / 2) / SIZE_X) * (WIDTH - 1)
        const gridY = ((wz + SIZE_Z / 2) / SIZE_Z) * (HEIGHT - 1)

        return sampleBilinear(heights, gridX, gridY, WIDTH, HEIGHT)
      }

      // For grass, create multiple instances in a radius for larger paint effect
      if (streamState.selectedTool === "grass") {
        const grassCount = 15 + Math.floor(Math.random() * 10) // 15-25 grass patches
        const grassRadius = 0.5 // Smaller radius for denser painting
        const newGrass: Array<{
          id: string
          position: [number, number, number]
          type: "grass"
          scale: number
        }> = []

        for (let i = 0; i < grassCount; i++) {
          const angle = Math.random() * Math.PI * 2
          const radius = Math.random() * grassRadius
          const offsetX = Math.cos(angle) * radius
          const offsetZ = Math.sin(angle) * radius

          const gx = point.x + offsetX
          const gz = point.z + offsetZ

          // Check bounds
          if (Math.abs(gx) < SIZE_X / 2 - 0.2 && Math.abs(gz) < SIZE_Z / 2 - 0.2) {
            const gy = getWorldHeight(gx, gz)
            newGrass.push({
              id: Math.random().toString(36).substring(2, 9),
              position: [gx, gy, gz] as [number, number, number],
              type: "grass" as const,
              scale: (0.8 + Math.random() * 0.4),
            })
          }
        }

        setStreamState((prev) => ({
          ...prev,
          plants: [...prev.plants, ...newGrass],
        }))
      } else {
        // Single instance for trees and bridges
        // Check bounds
        if (Math.abs(point.x) < SIZE_X / 2 - 0.2 && Math.abs(point.z) < SIZE_Z / 2 - 0.2) {
          const py = getWorldHeight(point.x, point.z)
          setStreamState((prev) => ({
            ...prev,
            plants: [
              ...prev.plants,
              {
                id: Math.random().toString(36).substring(2, 9),
                position: [point.x, py, point.z] as [number, number, number],
                type: streamState.selectedTool as "tree" | "grass" | "bridge",
                scale: 0.8 + Math.random() * 0.4,
              },
            ],
          }))
        }
      }
      return
    }

    if (streamState.selectedTool === "remove" && setStreamState) {
      setStreamState((prev) => ({
        ...prev,
        plants: prev.plants.filter((p) => {
          const dx = p.position[0] - point.x
          const dz = p.position[2] - point.z
          return Math.sqrt(dx * dx + dz * dz) > 0.8
        }),
      }))
      return
    }

    // Dig or fill
    const positions = geometry.attributes.position
    if (!positions) return

    const brushRadius = 0.8

    for (let i = 0; i < heights.length; i++) {
      const vx = positions.getX(i)
      const vz = positions.getZ(i)

      const dx = vx - point.x
      const dz = vz - point.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < brushRadius) {
        const influence = (1 - dist / brushRadius) * 0.15

        if (streamState.selectedTool === "dig") {
          heights[i] = Math.max(0, heights[i] - influence)
        } else if (streamState.selectedTool === "fill") {
          heights[i] += influence
        }

        positions.setY(i, heights[i])
      }
    }

    positions.needsUpdate = true
    geometry.computeVertexNormals()
    if (onHeightMapChange) {
      onHeightMapChange(heights)
    }
  }

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      receiveShadow
      castShadow
      onPointerDown={handlePointerDown}
      onPointerUp={() => {
        if (setIsInteracting) setIsInteracting(false)
      }}
      onPointerLeave={() => {
        if (setIsInteracting) setIsInteracting(false)
      }}
      onPointerMove={(e) => {
        if ((e as any).buttons === 1) handlePointerDown(e as any)
      }}
    >
      <meshStandardMaterial vertexColors roughness={0.85} metalness={0.05} />
    </mesh>
  )
}
