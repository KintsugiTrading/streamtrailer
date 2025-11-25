"use client"

import { useRef, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { StreamState } from "./stream-trailer"
import { createNoise2D } from "simplex-noise"
import { ErosionSystem } from "../lib/erosion-physics"

interface TerrainMeshProps {
  streamState: StreamState
  setStreamState?: (state: StreamState | ((prev: StreamState) => StreamState)) => void
  onHeightMapChange?: (heights: Float32Array) => void
}

export const WIDTH = 64
export const HEIGHT = 128
export const SIZE_X = 9
export const SIZE_Z = 15

export function TerrainMesh({ streamState, setStreamState, onHeightMapChange }: TerrainMeshProps) {
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

    let changed = true // Always update for water animation

    for (let i = 0; i < heights.length; i++) {
      // Update height
      positions.setY(i, heights[i])

      // Update color based on water depth
      const waterDepth = erosionSystem.waterHeight[i]

      if (waterDepth > 0.005) {
        // Water visualization
        // Deep water = Darker Blue
        // Shallow water = Lighter Blue / White foam
        const depthFactor = Math.min(1, waterDepth * 10)

        // Mix between base color (underwater) and water color
        // Simple blue for now:
        colorAttr.setXYZ(
          i,
          0.2 * (1 - depthFactor) + 0.1 * depthFactor,
          0.5 * (1 - depthFactor) + 0.3 * depthFactor,
          0.8 * (1 - depthFactor) + 0.6 * depthFactor
        )
      } else {
        // Dry - restore base color
        // We need to access the base colors. 
        // Since we didn't store baseColors in a ref that is accessible here easily without re-creating logic,
        // we added it to the useMemo return.
        // We need to access it from the useMemo result.
        // But useMemo result is destructured above.
        // We need to update the destructuring.

        // Accessing baseColors from the closure of useMemo might be tricky if we don't capture it.
        // Actually, we returned `baseColors` from useMemo, but we need to capture it in the component scope.
        // Let's fix the destructuring in the next step or assume it's available?
        // No, I need to update the destructuring line too.

        // I will assume I can access `baseColors` if I update the destructuring line.
        // Wait, I can't update the destructuring line in this chunk because it's far away.
        // I should have included it in the previous chunk or made a separate chunk.
        // I will use `baseColors` here, and I MUST ensure I update the destructuring in the other chunk.

        // Actually, I can just read the current color? No, it might be blue from previous frame.
        // I'll use a fixed sand color for now if I can't access baseColors, 
        // OR I will update the destructuring line in a separate chunk.
        // I'll update the destructuring line in a separate chunk.

        // For now, let's assume `baseColors` is available.
        if (baseColors) {
          colorAttr.setXYZ(i, baseColors[i * 3], baseColors[i * 3 + 1], baseColors[i * 3 + 2])
        }
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

    const point = e.point

    if ((streamState.selectedTool === "tree" || streamState.selectedTool === "grass" || streamState.selectedTool === "bridge") && setStreamState) {
      // For grass, create multiple instances in a radius for larger paint effect
      if (streamState.selectedTool === "grass") {
        const grassCount = 8 + Math.floor(Math.random() * 5) // 8-12 grass patches
        const grassRadius = 1.5 // Larger radius for grass painting
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

          newGrass.push({
            id: Math.random().toString(36).substring(2, 9),
            position: [point.x + offsetX, point.y, point.z + offsetZ] as [number, number, number],
            type: "grass" as const,
            scale: 0.8 + Math.random() * 0.4,
          })
        }

        setStreamState((prev) => ({
          ...prev,
          plants: [...prev.plants, ...newGrass],
        }))
      } else {
        // Single instance for trees and bridges
        setStreamState((prev) => ({
          ...prev,
          plants: [
            ...prev.plants,
            {
              id: Math.random().toString(36).substring(2, 9),
              position: [point.x, point.y, point.z] as [number, number, number],
              type: streamState.selectedTool as "tree" | "grass" | "bridge",
              scale: 0.8 + Math.random() * 0.4,
            },
          ],
        }))
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
      onPointerMove={(e) => {
        if ((e as any).buttons === 1) handlePointerDown(e as any)
      }}
    >
      <meshStandardMaterial vertexColors roughness={0.85} metalness={0.05} />
    </mesh>
  )
}
