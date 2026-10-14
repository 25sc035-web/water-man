/**
 * blend-optimizer.js
 * Water Blend Optimization Engine for Textile Mills
 *
 * Uses the water blend conservation equation to determine the maximum volume of
 * ETP treated water that can be blended into each textile process stage without
 * violating Total Dissolved Solids (TDS) or Hardness threshold limits.
 *
 * Governing Equation:
 * C_blend = (V_fresh * C_fresh + V_treated * C_treated) / V_demand
 * => max_fraction = min( (Limit_TDS - TDS_fresh) / (TDS_treated - TDS_fresh),
 *                        (Limit_Hardness - Hardness_fresh) / (Hardness_treated - Hardness_fresh) )
 */

const BlendOptimizer = {
  /**
   * Default water quality benchmarks (mg/L or ppm)
   */
  defaultConfig: {
    freshWater: {
      tds: 150,       // mg/L (clean river / municipal baseline)
      hardness: 80     // mg/L as CaCO3
    },
    treatedWater: {
      tds: 650,        // mg/L (tertiary ETP effluent - yields 523 mg/L blended TDS in washing)
      hardness: 200,   // mg/L as CaCO3
      availableVolume: 7450 // L/day (treated water available for reuse)
    }
  },

  /**
   * Calculate maximum allowable fraction of treated water for a stage
   * @param {Object} stage { maxTds, maxHardness, demand }
   * @param {Object} fresh { tds, hardness }
   * @param {Object} treated { tds, hardness }
   * @returns {Object} { maxFraction, constraint: 'tds' | 'hardness' | 'none' }
   */
  calculateMaxFraction(stage, fresh, treated) {
    let fTds = 1.0;
    let fHardness = 1.0;

    // TDS Constraint
    if (treated.tds > fresh.tds && stage.maxTds) {
      if (stage.maxTds <= fresh.tds) {
        fTds = 0; // Fresh water already at or above limit
      } else {
        fTds = (stage.maxTds - fresh.tds) / (treated.tds - fresh.tds);
      }
    }

    // Hardness Constraint
    if (treated.hardness > fresh.hardness && stage.maxHardness) {
      if (stage.maxHardness <= fresh.hardness) {
        fHardness = 0;
      } else {
        fHardness = (stage.maxHardness - fresh.hardness) / (treated.hardness - fresh.hardness);
      }
    }

    // The strictest quality limit wins
    const maxFraction = Math.max(0, Math.min(1.0, fTds, fHardness));
    const constraint = fTds < fHardness ? 'TDS' : 'Hardness';

    return { maxFraction, constraint };
  },

  /**
   * Allocates available treated water to stages in order of water quality tolerance.
   * Gives treated water first to stages that tolerate the highest limits (e.g. Washing & Rinsing).
   *
   * @param {Object} params
   * @param {Object} params.freshWater { tds, hardness }
   * @param {Object} params.treatedWater { tds, hardness, availableVolume }
   * @param {Array}  params.stages Array of process stages
   * @returns {Object} Allocation results
   */
  allocateTreatedWater({ freshWater, treatedWater, stages }) {
    const fresh = freshWater || this.defaultConfig.freshWater;
    const treated = treatedWater || this.defaultConfig.treatedWater;
    
    let remainingTreatedVolume = Number(treated.availableVolume) || 0;
    const initialTreatedSupply = remainingTreatedVolume;

    // Calculate maximum allowable fraction and tolerated volume for each stage
    const enrichedStages = stages.map(stage => {
      const demand = Number(stage.water || stage.demand) || 0;
      const { maxFraction, constraint } = this.calculateMaxFraction(stage, fresh, treated);
      const qualityCapVolume = Math.round(demand * maxFraction);

      return {
        ...stage,
        demand,
        maxFraction,
        constraint,
        qualityCapVolume
      };
    });

    // Sort stages by tolerance (highest maxFraction first, e.g. Washing > Prep > Finishing > Dyeing)
    // Stable sort preserves order for equal fractions
    const sortedStages = [...enrichedStages].sort((a, b) => b.maxFraction - a.maxFraction);

    const perStageAllocations = {};

    sortedStages.forEach(stage => {
      const neededByQuality = stage.qualityCapVolume;
      let allocatedRecycled = 0;
      let limitedBy = 'none';

      if (neededByQuality <= 0) {
        allocatedRecycled = 0;
        limitedBy = 'quality'; // Cannot accept treated water due to strict quality
      } else if (remainingTreatedVolume >= neededByQuality) {
        // Can take full quality-allowed volume
        allocatedRecycled = neededByQuality;
        remainingTreatedVolume -= neededByQuality;
        limitedBy = stage.maxFraction >= 1.0 ? 'demand' : 'quality';
      } else if (remainingTreatedVolume > 0) {
        // Limited by remaining supply
        allocatedRecycled = remainingTreatedVolume;
        remainingTreatedVolume = 0;
        limitedBy = 'supply';
      } else {
        // Supply already exhausted
        allocatedRecycled = 0;
        limitedBy = 'supply';
      }

      const freshVolume = Math.max(0, stage.demand - allocatedRecycled);
      
      // Calculate resulting blended concentration
      const blendedTds = stage.demand > 0
        ? Math.round((freshVolume * fresh.tds + allocatedRecycled * treated.tds) / stage.demand)
        : fresh.tds;

      const blendedHardness = stage.demand > 0
        ? Math.round((freshVolume * fresh.hardness + allocatedRecycled * treated.hardness) / stage.demand)
        : fresh.hardness;

      const savingPercent = stage.demand > 0
        ? Number(((allocatedRecycled / stage.demand) * 100).toFixed(1))
        : 0;

      perStageAllocations[stage.id] = {
        id: stage.id,
        name: stage.name,
        demand: stage.demand,
        recycledVolume: allocatedRecycled,
        freshVolume: freshVolume,
        maxFraction: Number((stage.maxFraction * 100).toFixed(1)),
        blendedTds,
        blendedHardness,
        limitedBy, // 'quality' | 'supply' | 'demand' | 'none'
        limitingConstraint: stage.constraint,
        savingPercent,
        recommendation: stage.recommendation
      };
    });

    // Reconstruct results in original stage order
    const perStage = enrichedStages.map(s => perStageAllocations[s.id]);

    const totalDemand = perStage.reduce((acc, s) => acc + s.demand, 0);
    const totalRecycled = perStage.reduce((acc, s) => acc + s.recycledVolume, 0);
    const totalFresh = totalDemand - totalRecycled;
    const savingPercent = totalDemand > 0 ? Number(((totalRecycled / totalDemand) * 100).toFixed(1)) : 0;
    const unusedTreatedWater = Math.max(0, remainingTreatedVolume);

    return {
      freshWater: fresh,
      treatedWater: { ...treated, initialSupply: initialTreatedSupply },
      totalDemand,
      totalRecycled,
      totalFresh,
      savingPercent, // Headline number (e.g. 18.6%)
      unusedTreatedWater,
      perStage
    };
  }
};

// Export for Node, CommonJS or browser window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BlendOptimizer;
} else if (typeof window !== 'undefined') {
  window.BlendOptimizer = BlendOptimizer;
}
