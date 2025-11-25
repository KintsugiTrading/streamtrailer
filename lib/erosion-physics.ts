// Utility logic for heightmap operations
// Implements hydraulic erosion based on Shallow Water Equations (SWE) and pipe model

export class ErosionSystem {
  width: number
  height: number

  // Simulation state
  waterHeight: Float32Array
  sediment: Float32Array

  // Flux maps (Left, Right, Top, Bottom)
  fluxL: Float32Array
  fluxR: Float32Array
  fluxT: Float32Array
  fluxB: Float32Array

  // Velocity field
  velocityX: Float32Array
  velocityY: Float32Array

  // Constants
  GRAVITY = 9.81
  PIPE_LENGTH = 1.0 // Distance between grid cells
  CELL_AREA = 1.0   // PIPE_LENGTH * PIPE_LENGTH

  // Erosion parameters
  KC = 0.5  // Sediment capacity constant
  KS = 0.3  // Dissolving constant (Erosion rate)
  KD = 0.3  // Deposition constant
  KE = 0.015 // Evaporation constant

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    const size = width * height

    this.waterHeight = new Float32Array(size)
    this.sediment = new Float32Array(size)

    this.fluxL = new Float32Array(size)
    this.fluxR = new Float32Array(size)
    this.fluxT = new Float32Array(size)
    this.fluxB = new Float32Array(size)

    this.velocityX = new Float32Array(size)
    this.velocityY = new Float32Array(size)
  }

  reset() {
    const size = this.width * this.height
    this.waterHeight.fill(0)
    this.sediment.fill(0)
    this.fluxL.fill(0)
    this.fluxR.fill(0)
    this.fluxT.fill(0)
    this.fluxB.fill(0)
    this.velocityX.fill(0)
    this.velocityY.fill(0)
  }

  simulate(terrainHeight: Float32Array, dt: number, flowRate: number, isRaining: boolean, erosionRateMultiplier: number = 1.0) {
    // 1. Add Water (Rain/Source)
    this.addWater(dt, flowRate, isRaining)

    // 2. Compute Flux (Outflow)
    this.computeFlux(terrainHeight, dt)

    // 3. Update Water Volume & Velocity
    this.updateWaterAndVelocity(dt)

    // 4. Erosion and Deposition
    this.erosionDeposition(terrainHeight, dt, erosionRateMultiplier)

    // 5. Sediment Transport (Advection)
    this.transportSediment(dt)

    // 6. Evaporation
    this.evaporate(dt)

    return terrainHeight
  }

  private addWater(dt: number, flowRate: number, isRaining: boolean) {
    if (!isRaining) return

    // Add rain uniformly or at source
    // For this simulation, we'll assume rain over the whole terrain or a source at the top
    // Let's do a source at the top (z=0 in 3D, which corresponds to y=0 or y=height-1 depending on mapping)
    // In TerrainMesh: geo.rotateX(-Math.PI / 2), so Z maps to Y in grid.
    // Slope is from back to front. Back is usually -Z or +Z.
    // TerrainMesh: slopeHeight = (-z / SIZE_Z + 0.5) * 1.5. 
    // If z goes from -SIZE_Z/2 to SIZE_Z/2.
    // Let's assume we want water at the "high" end.

    // Adding rain everywhere for general erosion
    const rainAmount = flowRate * dt * 0.1
    for (let i = 0; i < this.waterHeight.length; i++) {
      this.waterHeight[i] += rainAmount
    }

    // Optional: Add a river source at the top
    const sourceWidth = Math.floor(this.width * 0.2)
    const startX = Math.floor((this.width - sourceWidth) / 2)
    const startY = 2 // Near the top edge (High ground)

    for (let y = startY; y < startY + 5; y++) {
      for (let x = startX; x < startX + sourceWidth; x++) {
        const idx = y * this.width + x
        if (idx < this.waterHeight.length) {
          this.waterHeight[idx] += flowRate * dt * 5.0
        }
      }
    }
  }

  private computeFlux(terrainHeight: Float32Array, dt: number) {
    const size = this.width * this.height

    for (let i = 0; i < size; i++) {
      const x = i % this.width
      const y = Math.floor(i / this.width)

      // Boundaries
      if (x <= 0 || x >= this.width - 1 || y <= 0 || y >= this.height - 1) {
        this.fluxL[i] = 0
        this.fluxR[i] = 0
        this.fluxT[i] = 0
        this.fluxB[i] = 0
        continue
      }

      const h = terrainHeight[i] + this.waterHeight[i]

      // Neighbors: Left, Right, Top (Up), Bottom (Down)
      // Note: y+1 is "up" in grid index, but might be "down" in world space depending on orientation
      // We'll treat indices: L=x-1, R=x+1, T=y+1, B=y-1

      const idxL = i - 1
      const idxR = i + 1
      const idxT = i + this.width
      const idxB = i - this.width

      const hL = terrainHeight[idxL] + this.waterHeight[idxL]
      const hR = terrainHeight[idxR] + this.waterHeight[idxR]
      const hT = terrainHeight[idxT] + this.waterHeight[idxT]
      const hB = terrainHeight[idxB] + this.waterHeight[idxB]

      // Hydrostatic pressure differences
      const valL = Math.max(0, h - hL)
      const valR = Math.max(0, h - hR)
      const valT = Math.max(0, h - hT)
      const valB = Math.max(0, h - hB)

      // Update fluxes
      // F_new = max(0, F_old + dt * A * (g * deltaH) / L)
      const factor = dt * this.CELL_AREA * this.GRAVITY / this.PIPE_LENGTH

      let fL = Math.max(0, this.fluxL[i] + factor * valL)
      let fR = Math.max(0, this.fluxR[i] + factor * valR)
      let fT = Math.max(0, this.fluxT[i] + factor * valT)
      let fB = Math.max(0, this.fluxB[i] + factor * valB)

      // Scaling to not exceed water volume
      const sumFlux = fL + fR + fT + fB
      if (sumFlux > 0) {
        const K = Math.min(1, (this.waterHeight[i] * this.CELL_AREA) / (sumFlux * dt))
        fL *= K
        fR *= K
        fT *= K
        fB *= K
      }

      this.fluxL[i] = fL
      this.fluxR[i] = fR
      this.fluxT[i] = fT
      this.fluxB[i] = fB
    }
  }

  private updateWaterAndVelocity(dt: number) {
    const size = this.width * this.height

    for (let i = 0; i < size; i++) {
      const x = i % this.width
      const y = Math.floor(i / this.width)

      if (x <= 0 || x >= this.width - 1 || y <= 0 || y >= this.height - 1) {
        this.velocityX[i] = 0
        this.velocityY[i] = 0
        continue
      }

      // Inflows
      const idxL = i - 1
      const idxR = i + 1
      const idxT = i + this.width
      const idxB = i - this.width

      const inflow =
        this.fluxR[idxL] + // In from Left
        this.fluxL[idxR] + // In from Right
        this.fluxB[idxT] + // In from Top
        this.fluxT[idxB]   // In from Bottom

      const outflow = this.fluxL[i] + this.fluxR[i] + this.fluxT[i] + this.fluxB[i]

      const volumeChange = dt * (inflow - outflow)
      this.waterHeight[i] += volumeChange / this.CELL_AREA

      if (this.waterHeight[i] < 0) this.waterHeight[i] = 0

      // Calculate Velocity
      // Average flux through the cell
      // u = (fluxR_in - fluxL_out + fluxR_out - fluxL_in) / 2 ... simplified
      // Standard approximation:
      // u = ( (fR[i-1] - fL[i]) + (fR[i] - fL[i+1]) ) / 2
      // But we have stored fluxes differently.
      // fluxL[i] is flow OUT to Left.
      // fluxR[i-1] is flow IN from Left.

      const flowInL = this.fluxR[idxL]
      const flowOutL = this.fluxL[i]
      const flowInR = this.fluxL[idxR]
      const flowOutR = this.fluxR[i]

      const flowInT = this.fluxB[idxT]
      const flowOutT = this.fluxT[i]
      const flowInB = this.fluxT[idxB]
      const flowOutB = this.fluxB[i]

      // X velocity (Left-Right)
      // Net flow in X direction?
      // Average flow passing through
      const u = (flowInL - flowOutL + flowOutR - flowInR) / 2

      // Y velocity (Top-Bottom)
      const v = (flowInB - flowOutB + flowOutT - flowInT) / 2

      // Convert flux to velocity: v = flux / (d * width) ? 
      // Actually v = Q / A_cross. A_cross = waterHeight * PIPE_LENGTH
      // Avoid division by zero
      const avgWaterHeight = this.waterHeight[i] // Simplified

      if (avgWaterHeight > 0.0001) {
        this.velocityX[i] = u / (this.CELL_AREA * avgWaterHeight) // Simplified scaling
        this.velocityY[i] = v / (this.CELL_AREA * avgWaterHeight)
      } else {
        this.velocityX[i] = 0
        this.velocityY[i] = 0
      }
    }
  }

  private erosionDeposition(terrainHeight: Float32Array, dt: number, erosionRateMultiplier: number) {
    const size = this.width * this.height

    for (let i = 0; i < size; i++) {
      const x = i % this.width
      const y = Math.floor(i / this.width)

      if (x <= 0 || x >= this.width - 1 || y <= 0 || y >= this.height - 1) continue

      // Calculate tilt/slope
      const idxL = i - 1
      const idxR = i + 1
      const idxT = i + this.width
      const idxB = i - this.width

      const h = terrainHeight[i]
      const hL = terrainHeight[idxL]
      const hR = terrainHeight[idxR]
      const hT = terrainHeight[idxT]
      const hB = terrainHeight[idxB]

      // Gradient
      const dHdX = (hR - hL) / (2 * this.CELL_AREA) // Simplified
      const dHdY = (hT - hB) / (2 * this.CELL_AREA)

      const slope = Math.sqrt(dHdX * dHdX + dHdY * dHdY)
      const velocity = Math.sqrt(this.velocityX[i] ** 2 + this.velocityY[i] ** 2)

      // Sediment Capacity C = Kc * v * slope (or v^2, etc)
      // Using v * slope is common
      const capacity = Math.max(0.01, this.KC * velocity * slope * 5.0) // Scaling factor

      const currentSediment = this.sediment[i]

      if (capacity > currentSediment) {
        // Erode
        const erodeAmount = this.KS * (capacity - currentSediment) * dt * erosionRateMultiplier
        // Don't erode more than available soil (and maybe don't dig too deep?)
        const actualErode = Math.min(erodeAmount, 0.05) // Cap per step

        terrainHeight[i] -= actualErode

        // Clamp height to prevent spikes through the bottom
        // Assuming base is around 0 or slightly positive. Let's clamp to 0.01
        if (terrainHeight[i] < 0.01) terrainHeight[i] = 0.01

        this.sediment[i] += actualErode
      } else {
        // Deposit
        const depositAmount = this.KD * (currentSediment - capacity) * dt
        const actualDeposit = Math.min(depositAmount, currentSediment)

        terrainHeight[i] += actualDeposit
        this.sediment[i] -= actualDeposit
      }
    }
  }

  private transportSediment(dt: number) {
    // Semi-Lagrangian Advection
    // Backtrack where the sediment came from
    const newSediment = new Float32Array(this.sediment)

    for (let i = 0; i < this.sediment.length; i++) {
      const x = i % this.width
      const y = Math.floor(i / this.width)

      if (x <= 0 || x >= this.width - 1 || y <= 0 || y >= this.height - 1) continue

      // Backtrack
      const u = this.velocityX[i]
      const v = this.velocityY[i]

      const srcX = x - u * dt
      const srcY = y - v * dt

      // Bilinear interpolation
      newSediment[i] = this.sampleBilinear(this.sediment, srcX, srcY)
    }

    this.sediment = newSediment
  }

  private evaporate(dt: number) {
    for (let i = 0; i < this.waterHeight.length; i++) {
      this.waterHeight[i] *= (1 - this.KE * dt)
      if (this.waterHeight[i] < 0.0001) this.waterHeight[i] = 0
    }
  }

  private sampleBilinear(map: Float32Array, x: number, y: number): number {
    if (x < 0 || x >= this.width - 1 || y < 0 || y >= this.height - 1) {
      return 0 // Boundary condition
    }

    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const x1 = x0 + 1
    const y1 = y0 + 1

    const ax = x - x0
    const ay = y - y0

    const v00 = map[y0 * this.width + x0]
    const v10 = map[y0 * this.width + x1]
    const v01 = map[y1 * this.width + x0]
    const v11 = map[y1 * this.width + x1]

    const v0 = v00 * (1 - ax) + v10 * ax
    const v1 = v01 * (1 - ax) + v11 * ax

    return v0 * (1 - ay) + v1 * ay
  }
}
