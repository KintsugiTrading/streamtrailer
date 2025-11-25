"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { WIDTH, HEIGHT, SIZE_X, SIZE_Z } from "./terrain-mesh"
import type { ErosionSystem } from "../lib/erosion-physics"

interface WaterSurfaceProps {
    erosionSystem: ErosionSystem | null
    terrainHeights: Float32Array | null
}

export function WaterSurface({ erosionSystem, terrainHeights }: WaterSurfaceProps) {
    const meshRef = useRef<THREE.Mesh>(null)

    const { geometry } = useMemo(() => {
        const geo = new THREE.PlaneGeometry(SIZE_X, SIZE_Z, WIDTH - 1, HEIGHT - 1)
        geo.rotateX(-Math.PI / 2)
        return { geometry: geo }
    }, [])

    useFrame(() => {
        if (!meshRef.current || !erosionSystem || !terrainHeights) return

        const positions = geometry.attributes.position
        if (!positions) return

        let hasWater = false

        for (let i = 0; i < positions.count; i++) {
            const waterDepth = erosionSystem.waterHeight[i]
            const terrainHeight = terrainHeights[i]

            if (waterDepth > 0.01) {
                // Set water surface height = terrain + water depth
                positions.setY(i, terrainHeight + waterDepth)
                hasWater = true
            } else {
                // No water, hide below terrain
                positions.setY(i, terrainHeight - 0.1)
            }
        }

        positions.needsUpdate = true
        geometry.computeVertexNormals()

        // Show/hide water mesh based on presence of water
        if (meshRef.current) {
            meshRef.current.visible = hasWater
        }
    })

    return (
        <mesh ref={meshRef} geometry={geometry} receiveShadow>
            <meshStandardMaterial
                color="#4299e1"
                transparent
                opacity={0.6}
                roughness={0.2}
                metalness={0.1}
                side={THREE.DoubleSide}
            />
        </mesh>
    )
}
