"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

import { WIDTH, HEIGHT, SIZE_X, SIZE_Z } from "./terrain-mesh"
import type { PlantInstance } from "./stream-trailer"

interface WaterSystemProps {
  flowRate: number
  slope: number
  heightMap: Float32Array | null
  plants: PlantInstance[]
}

const PARTICLE_COUNT = 500

export function WaterSystem({ flowRate, slope, heightMap, plants }: WaterSystemProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const particlesRef = useRef<Array<{
    position: THREE.Vector3
    velocity: THREE.Vector3
  }> | null>(null)

  // Initialize particles lazily
  if (!particlesRef.current) {
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      position: new THREE.Vector3((Math.random() - 0.5) * 0.5, 2, -7.5 + Math.random() * 0.5),
      velocity: new THREE.Vector3(0, 0, 0),
    }))
  }

  useFrame((_, delta) => {
    const mesh = meshRef.current
    const particles = particlesRef.current

    if (!mesh || !mesh.instanceMatrix || !particles) return

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const particle = particles[i]

      // Reset if off screen
      if (particle.position.z > 8 || particle.position.y < -0.5 || Math.abs(particle.position.x) > 5) {
        // Spawn at "garden hose" location: Top Center
        particle.position.set((Math.random() - 0.5) * 0.5, 2, -7.8)
        particle.velocity.set(0, 0, 0)
      }

      // Physics
      particle.velocity.y -= 9.8 * delta // Gravity

      // Terrain interaction
      let groundHeight = 0
      if (heightMap) {
        // Map position to grid coordinates
        const x = particle.position.x
        const z = particle.position.z

        // Convert world coords to grid coords
        // World X: [-4.5, 4.5] -> Grid X: [0, WIDTH]
        // World Z: [-7.5, 7.5] -> Grid Y: [0, HEIGHT]
        const gridX = Math.floor(((x + SIZE_X / 2) / SIZE_X) * (WIDTH - 1))
        const gridY = Math.floor(((z + SIZE_Z / 2) / SIZE_Z) * (HEIGHT - 1))

        if (gridX >= 0 && gridX < WIDTH - 1 && gridY >= 0 && gridY < HEIGHT - 1) {
          const idx = gridY * WIDTH + gridX
          groundHeight = heightMap[idx]

          // Calculate gradient (slope)
          const hL = heightMap[idx - 1] || groundHeight
          const hR = heightMap[idx + 1] || groundHeight
          const hU = heightMap[idx - WIDTH] || groundHeight
          const hD = heightMap[idx + WIDTH] || groundHeight

          const dx = (hR - hL) * 0.5
          const dz = (hD - hU) * 0.5 // Down is positive Z in world space

          // Apply force based on slope (gradient descent)
          particle.velocity.x -= dx * 10 * delta
          particle.velocity.z -= dz * 10 * delta
        }
      }

      // Base flow (simulating water pressure/volume)
      particle.velocity.z += (slope * 5 + flowRate * 2) * delta

      // Vegetation resistance
      for (const plant of plants) {
        const dx = particle.position.x - plant.position[0]
        const dz = particle.position.z - plant.position[2]
        const distSq = dx * dx + dz * dz

        if (distSq < 0.2) {
          // Slow down near plants
          particle.velocity.multiplyScalar(0.9)
          // Divert slightly
          particle.velocity.x += (dx / (distSq + 0.01)) * delta * 2
          particle.velocity.z += (dz / (distSq + 0.01)) * delta * 2
        }
      }

      // Apply velocity
      particle.position.add(particle.velocity.clone().multiplyScalar(delta))

      // Ground collision
      if (particle.position.y < groundHeight + 0.1) {
        particle.position.y = groundHeight + 0.1
        particle.velocity.y = 0
        // Friction
        particle.velocity.multiplyScalar(0.95)
      }

      // Update matrix
      dummy.position.copy(particle.position)
      dummy.scale.setScalar(0.08 + flowRate * 0.02)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial color="#4299e1" transparent opacity={0.7} roughness={0.2} />
    </instancedMesh>
  )
}
