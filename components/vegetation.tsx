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

  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const foliageRef = useRef<THREE.InstancedMesh>(null)
  const shrubRef = useRef<THREE.InstancedMesh>(null)

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
    </group>
  )
}
