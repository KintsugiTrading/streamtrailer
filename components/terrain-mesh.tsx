"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { StreamState } from "./stream-trailer"
import { createNoise2D } from "simplex-noise"

interface TerrainMeshProps {
  streamState: StreamState
  setStreamState?: (state: StreamState | ((prev: StreamState) => StreamState)) => void
}

const WIDTH = 64
const HEIGHT = 128
const SIZE_X = 9
const SIZE_Z = 15

export function TerrainMesh({ streamState, setStreamState }: TerrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const { geometry, heights } = useMemo(() => {
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

    return { geometry: geo, heights: heightData }
  }, [])

  // Erosion simulation
  useFrame((_, delta) => {
    if (!streamState.waterFlow || !geometry) return

    const positions = geometry.attributes.position
    const colorAttr = geometry.attributes.color
    if (!positions || !colorAttr) return

    const flowStrength = streamState.flowRate * delta * 3
    let changed = false

    for (let i = 0; i < heights.length; i++) {
      const x = i % WIDTH
      const y = Math.floor(i / WIDTH)

      if (x > 0 && x < WIDTH - 1 && y > 0 && y < HEIGHT - 1) {
        const currentH = heights[i]
        const neighbors = [i + 1, i - 1, i + WIDTH, i - WIDTH]
        const neighborIdx = neighbors[Math.floor(Math.random() * 4)]
        const neighborH = heights[neighborIdx]

        if (neighborH < currentH) {
          const diff = currentH - neighborH
          const transfer = Math.min(diff * 0.3, flowStrength)

          heights[i] -= transfer
          heights[neighborIdx] += transfer

          positions.setY(i, heights[i])
          positions.setY(neighborIdx, heights[neighborIdx])

          // Darken wet areas
          colorAttr.setXYZ(i, 0.55, 0.5, 0.35)

          changed = true
        }
      }
    }

    if (changed) {
      positions.needsUpdate = true
      colorAttr.needsUpdate = true
      geometry.computeVertexNormals()
    }
  })

  const handlePointerDown = (e: THREE.Event & { point: THREE.Vector3; stopPropagation: () => void }) => {
    if (streamState.selectedTool === "none") return
    e.stopPropagation()

    const point = e.point

    if (streamState.selectedTool === "plant" && setStreamState) {
      setStreamState((prev) => ({
        ...prev,
        plants: [
          ...prev.plants,
          {
            id: Math.random().toString(36).substring(2, 9),
            position: [point.x, point.y, point.z] as [number, number, number],
            type: Math.random() > 0.5 ? "tree" : "shrub",
            scale: 0.8 + Math.random() * 0.4,
          },
        ],
      }))
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
