"use client"

import { useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import type { PlantInstance } from "./stream-trailer"

interface VegetationProps {
  plants: PlantInstance[]
}

const MAX_INSTANCES = 500

export function Vegetation({ plants }: VegetationProps) {
  const trees = useMemo(() => plants.filter((p) => p.type === "tree"), [plants])
  const shrubs = useMemo(() => plants.filter((p) => p.type === "shrub"), [plants])
  const grass = useMemo(() => plants.filter((p) => p.type === "grass"), [plants])
  const bridges = useMemo(() => plants.filter((p) => p.type === "bridge"), [plants])

  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const foliageRef = useRef<THREE.InstancedMesh>(null)
  const shrubRef = useRef<THREE.InstancedMesh>(null)
  const grassRef = useRef<THREE.InstancedMesh>(null)
  const bridgeRef = useRef<THREE.InstancedMesh>(null)

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    const trunk = trunkRef.current
    const foliage = foliageRef.current

    if (!trunk?.instanceMatrix || !foliage?.instanceMatrix) return

    // Update tree instances
    trees.forEach((tree, i) => {
      if (i >= MAX_INSTANCES) return

      // Trunk
      dummy.position.set(tree.position[0], tree.position[1] + 0.4, tree.position[2])
      dummy.scale.set(tree.scale * 0.5, tree.scale, tree.scale * 0.5)
      dummy.updateMatrix()
      trunk.setMatrixAt(i, dummy.matrix)

      // Foliage
      dummy.position.set(tree.position[0], tree.position[1] + 1.2 * tree.scale, tree.position[2])
      dummy.scale.setScalar(tree.scale)
      dummy.updateMatrix()
      foliage.setMatrixAt(i, dummy.matrix)
    })

    // Hide unused instances by scaling to 0
    for (let i = trees.length; i < MAX_INSTANCES; i++) {
      dummy.scale.set(0, 0, 0)
      dummy.updateMatrix()
      trunk.setMatrixAt(i, dummy.matrix)
      foliage.setMatrixAt(i, dummy.matrix)
    }

    trunk.instanceMatrix.needsUpdate = true
    foliage.instanceMatrix.needsUpdate = true
  }, [trees, dummy])

  useEffect(() => {
    const shrub = shrubRef.current

    if (!shrub?.instanceMatrix) return

    shrubs.forEach((s, i) => {
      if (i >= MAX_INSTANCES) return

      dummy.position.set(s.position[0], s.position[1] + 0.2, s.position[2])
      dummy.scale.setScalar(s.scale * 0.6)
      dummy.updateMatrix()
      shrub.setMatrixAt(i, dummy.matrix)
    })

    // Hide unused
    for (let i = shrubs.length; i < MAX_INSTANCES; i++) {
      dummy.scale.set(0, 0, 0)
      dummy.updateMatrix()
      shrub.setMatrixAt(i, dummy.matrix)
    }

    shrub.instanceMatrix.needsUpdate = true
  }, [shrubs, dummy])

  useEffect(() => {
    const grassMesh = grassRef.current

    if (!grassMesh?.instanceMatrix) return

    grass.forEach((g, i) => {
      if (i >= MAX_INSTANCES) return

      dummy.position.set(g.position[0], g.position[1] + 0.05, g.position[2])
      dummy.scale.set(g.scale * 0.3, g.scale * 0.1, g.scale * 0.3)
      dummy.updateMatrix()
      grassMesh.setMatrixAt(i, dummy.matrix)
    })

    // Hide unused
    for (let i = grass.length; i < MAX_INSTANCES; i++) {
      dummy.scale.set(0, 0, 0)
      dummy.updateMatrix()
      grassMesh.setMatrixAt(i, dummy.matrix)
    }

    grassMesh.instanceMatrix.needsUpdate = true
  }, [grass, dummy])

  useEffect(() => {
    const bridgeMesh = bridgeRef.current

    if (!bridgeMesh?.instanceMatrix) return

    bridges.forEach((b, i) => {
      if (i >= MAX_INSTANCES) return

      dummy.position.set(b.position[0], b.position[1] + 0.1, b.position[2])
      dummy.scale.set(b.scale * 2, b.scale * 0.1, b.scale * 0.5)
      dummy.updateMatrix()
      bridgeMesh.setMatrixAt(i, dummy.matrix)
    })

    // Hide unused
    for (let i = bridges.length; i < MAX_INSTANCES; i++) {
      dummy.scale.set(0, 0, 0)
      dummy.updateMatrix()
      bridgeMesh.setMatrixAt(i, dummy.matrix)
    }

    bridgeMesh.instanceMatrix.needsUpdate = true
  }, [bridges, dummy])

  return (
    <group>
      {/* Tree Trunks */}
      <instancedMesh ref={trunkRef} args={[undefined, undefined, MAX_INSTANCES]} frustumCulled={false}>
        <cylinderGeometry args={[0.08, 0.15, 0.8, 6]} />
        <meshStandardMaterial color="#5D4037" roughness={0.9} />
      </instancedMesh>

      {/* Tree Foliage */}
      <instancedMesh ref={foliageRef} args={[undefined, undefined, MAX_INSTANCES]} frustumCulled={false}>
        <coneGeometry args={[0.5, 1, 6]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.8} />
      </instancedMesh>

      {/* Shrubs */}
      <instancedMesh ref={shrubRef} args={[undefined, undefined, MAX_INSTANCES]} frustumCulled={false}>
        <sphereGeometry args={[0.5, 6, 6]} />
        <meshStandardMaterial color="#4a7c42" roughness={0.9} />
      </instancedMesh>

      {/* Grass */}
      <instancedMesh ref={grassRef} args={[undefined, undefined, MAX_INSTANCES]} frustumCulled={false}>
        <cylinderGeometry args={[0.3, 0.3, 0.1, 8]} />
        <meshStandardMaterial color="#6b8e23" roughness={0.95} />
      </instancedMesh>

      {/* Bridges */}
      <instancedMesh ref={bridgeRef} args={[undefined, undefined, MAX_INSTANCES]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </instancedMesh>
    </group>
  )
}
