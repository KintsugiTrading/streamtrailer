"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

interface WaterSystemProps {
  flowRate: number
  slope: number
}

const PARTICLE_COUNT = 500

export function WaterSystem({ flowRate, slope }: WaterSystemProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const particlesRef = useRef<Array<{
    position: THREE.Vector3
    velocity: THREE.Vector3
  }> | null>(null)

  // Initialize particles lazily
  if (!particlesRef.current) {
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      position: new THREE.Vector3((Math.random() - 0.5) * 2, 1.5, -7.5 + Math.random() * 0.5),
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
      if (particle.position.z > 8 || particle.position.y < -0.5) {
        particle.position.set((Math.random() - 0.5) * 2, 1.5, -7.8)
        particle.velocity.set(0, 0, 0)
      }

      // Physics
      particle.velocity.y -= 9.8 * delta * 0.3
      particle.velocity.z += (slope * 3 + flowRate * 2) * delta

      // Apply velocity
      particle.position.x += particle.velocity.x * delta
      particle.position.y += particle.velocity.y * delta
      particle.position.z += particle.velocity.z * delta

      // Ground collision
      if (particle.position.y < 0.1) {
        particle.position.y = 0.1
        particle.velocity.y *= -0.1
        particle.velocity.x += (Math.random() - 0.5) * delta * 2
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
