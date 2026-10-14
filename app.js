/**
 * Textile Factory Water & Cost Optimization System
 * Interactive Logic, Optimization Engine, Charting, and Multi-Step Workflow
 */

// Application State
const state = {
  currentStep: 1,
  user: {
    isLoggedIn: false,
    email: 'manager@abctextiles.com',
    factoryName: 'ABC Textiles'
  },
  factory: {
    name: 'ABC Textiles',
    capacity: 1000, // kg/day
    workingDays: 26, // days/month
    waterCost: 50, // ₹ per 1,000 L
    electricityCost: 7.1, // ₹ per kWh
    chemicalCost: 151, // avg ₹ per kg
    fabricType: 'Cotton',
    freshTds: 150, // mg/L
    freshHardness: 80, // mg/L as CaCO3
    treatedTds: 650, // mg/L
    treatedHardness: 200, // mg/L as CaCO3
    treatedAvailable: 7450 // L/day available from ETP
  },
  processes: [
    {
      id: 1,
      name: 'Fabric Preparation',
      water: 8000,
      electricity: 1200,
      chemical: 1500,
      other: 1300,
      savingPct: 0.15,
      maxTds: 375, // allows up to 45% treated blend by TDS
      maxHardness: 160,
      recommendation: 'Reuse rinse water, optimize chemical dose',
      priority: 'Medium',
      icon: 'fa-lightbulb'
    },
    {
      id: 2,
      name: 'Dyeing',
      water: 15000,
      electricity: 2500,
      chemical: 3000,
      other: 2000,
      savingPct: 0.15,
      maxTds: 250, // strict limit: allows only 16.7% by hardness, 20% by TDS
      maxHardness: 100,
      recommendation: 'Improve dyeing efficiency, use low-liquor ratio machines',
      priority: 'High',
      icon: 'fa-flask'
    },
    {
      id: 3,
      name: 'Washing & Rinsing',
      water: 10000,
      electricity: 1500,
      chemical: 800,
      other: 1200,
      savingPct: 0.30,
      maxTds: 700, // high tolerance: can take 100% treated blend
      maxHardness: 250,
      recommendation: 'Optimize rinse cycles, reuse suitable rinse water',
      priority: 'High',
      icon: 'fa-recycle'
    },
    {
      id: 4,
      name: 'Finishing',
      water: 4000,
      electricity: 800,
      chemical: 600,
      other: 1100,
      savingPct: 0.10,
      maxTds: 350,
      maxHardness: 120,
      recommendation: 'Use low-water finishing techniques',
      priority: 'Low',
      icon: 'fa-spray-can'
    },
    {
      id: 5,
      name: 'Machine Cleaning',
      water: 3000,
      electricity: 500,
      chemical: 300,
      other: 700,
      savingPct: 0.20,
      maxTds: 900,
      maxHardness: 300,
      recommendation: 'Use high-pressure low-flow cleaning systems',
      priority: 'Medium',
      icon: 'fa-faucet-drip'
    }
  ],
  scenario: 'standard', // 'standard' | 'advanced' | 'eco_max'
  targetReductionPct: 20,
  results: null
};

// Global chart references for updating
let barChartInstance = null;
let donutChartInstance = null;
let reportChartInstance = null;
let aiForecastChartInstance = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  loadSavedData();
  renderProcessTable();
  setupEventListeners();
  updateStepUI(1);
});

// Load state from localStorage if available
function loadSavedData() {
  try {
    const saved = localStorage.getItem('textile_water_optimizer_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.factory) {
        state.factory = {
          freshTds: 150,
          freshHardness: 80,
          treatedTds: 650,
          treatedHardness: 200,
          treatedAvailable: 7450,
          ...state.factory,
          ...parsed.factory
        };
      }
      if (parsed.processes && parsed.processes.length) {
        state.processes = parsed.processes.map(p => ({
          maxTds: p.maxTds || 500,
          maxHardness: p.maxHardness || 150,
          ...p
        }));
      }
      if (parsed.user) state.user = { ...state.user, ...parsed.user };
    }
  } catch (e) {
    console.error('Error loading saved state:', e);
  }
  syncFactoryInputsToUI();
}

// Sync state factory values to HTML form inputs
function syncFactoryInputsToUI() {
  const f = state.factory;
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
  };

  setVal('input-factory-name', f.name);
  setVal('input-capacity', f.capacity);
  setVal('input-working-days', f.workingDays);
  setVal('input-water-cost', f.waterCost);
  setVal('input-elec-cost', f.electricityCost);
  setVal('input-chem-cost', f.chemicalCost);
  setVal('input-fabric-type', f.fabricType);
  setVal('input-fresh-tds', f.freshTds || 150);
  setVal('input-fresh-hardness', f.freshHardness || 80);
  setVal('input-treated-tds', f.treatedTds || 650);
  setVal('input-treated-hardness', f.treatedHardness || 200);
  setVal('input-treated-available', f.treatedAvailable || 7450);
}

// Save state to localStorage
function saveStateToStorage() {
  try {
    localStorage.setItem('textile_water_optimizer_data', JSON.stringify({
      factory: state.factory,
      processes: state.processes,
      user: state.user,
      updatedAt: new Date().toISOString()
    }));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

// Navigation between steps
function goToStep(stepNumber) {
  if (stepNumber < 1 || stepNumber > 9) return;

  // If entering Factory step (3), ensure inputs reflect state
  if (stepNumber === 3) {
    syncFactoryInputsToUI();
  }

  // If going to Step 5 (Analysis), trigger animation then proceed
  if (stepNumber === 5) {
    calculateOptimization();
    state.currentStep = 5;
    updateStepUI(5);
    runAnalysisAnimation();
    return;
  }

  // If going to Step 6, make sure optimization results exist
  if (stepNumber >= 6 && !state.results) {
    calculateOptimization();
  }

  state.currentStep = stepNumber;
  updateStepUI(stepNumber);

  if (stepNumber === 6) {
    renderResultsDashboard();
  } else if (stepNumber === 7) {
    renderRecommendations();
  } else if (stepNumber === 8) {
    renderDetailedReport();
  } else if (stepNumber === 9) {
    renderFurtherActions();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Update the visible step view and stepper bar
function updateStepUI(stepNumber) {
  // Hide all step views
  document.querySelectorAll('.step-view').forEach(view => {
    view.classList.add('hidden');
    view.classList.remove('animate-fade-in');
  });

  // Show active step
  const activeView = document.getElementById(`step-${stepNumber}`);
  if (activeView) {
    activeView.classList.remove('hidden');
    activeView.classList.add('animate-fade-in');
  }

  // Update Stepper Navigation
  document.querySelectorAll('.step-nav-btn').forEach((btn, index) => {
    const s = index + 1;
    btn.classList.remove('active', 'completed');
    if (s === stepNumber) {
      btn.classList.add('active');
    } else if (s < stepNumber) {
      btn.classList.add('completed');
    }
  });

  // Update user header indicator
  const userBadge = document.getElementById('user-header-status');
  if (userBadge) {
    userBadge.innerText = state.user.isLoggedIn ? state.user.email : 'Guest Mode';
  }
}

// Set up form handlers and event listeners
function setupEventListeners() {
  // Login Form Handler
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      state.user.isLoggedIn = true;
      state.user.email = email || 'manager@abctextiles.com';
      saveStateToStorage();
      goToStep(3);
    });
  }

  // Factory Details Form Handler (Step 3)
  const factoryForm = document.getElementById('factory-details-form');
  if (factoryForm) {
    factoryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      state.factory.name = document.getElementById('input-factory-name')?.value || 'ABC Textiles';
      state.factory.capacity = parseFloat(document.getElementById('input-capacity')?.value) || 1000;
      state.factory.workingDays = parseFloat(document.getElementById('input-working-days')?.value) || 26;
      state.factory.waterCost = parseFloat(document.getElementById('input-water-cost')?.value) || 50;
      state.factory.electricityCost = parseFloat(document.getElementById('input-elec-cost')?.value) || 7.1;
      state.factory.chemicalCost = parseFloat(document.getElementById('input-chem-cost')?.value) || 151;
      state.factory.fabricType = document.getElementById('input-fabric-type')?.value || 'Cotton';
      state.factory.freshTds = parseFloat(document.getElementById('input-fresh-tds')?.value) || 150;
      state.factory.freshHardness = parseFloat(document.getElementById('input-fresh-hardness')?.value) || 80;
      state.factory.treatedTds = parseFloat(document.getElementById('input-treated-tds')?.value) || 650;
      state.factory.treatedHardness = parseFloat(document.getElementById('input-treated-hardness')?.value) || 200;
      state.factory.treatedAvailable = parseFloat(document.getElementById('input-treated-available')?.value) || 7450;

      saveStateToStorage();
      goToStep(4);
    });
  }

  // Add Process Button
  const addProcessBtn = document.getElementById('btn-add-process');
  if (addProcessBtn) {
    addProcessBtn.addEventListener('click', () => {
      const newId = state.processes.length ? Math.max(...state.processes.map(p => p.id)) + 1 : 1;
      state.processes.push({
        id: newId,
        name: `Custom Process ${newId}`,
        water: 2500,
        electricity: 500,
        chemical: 400,
        other: 500,
        savingPct: 0.15,
        maxTds: 500,
        maxHardness: 150,
        recommendation: 'Evaluate counter-current reuse and flow meter controls',
        priority: 'Medium',
        icon: 'fa-gears'
      });
      renderProcessTable();
    });
  }

  // Reset to default process data
  const resetProcessesBtn = document.getElementById('btn-reset-processes');
  if (resetProcessesBtn) {
    resetProcessesBtn.addEventListener('click', () => {
      if (confirm('Reset process data to default textile benchmark values?')) {
        state.processes = [
          { id: 1, name: 'Fabric Preparation', water: 8000, electricity: 1200, chemical: 1500, other: 1300, savingPct: 0.15, maxTds: 375, maxHardness: 160, recommendation: 'Reuse rinse water, optimize chemical dose', priority: 'Medium', icon: 'fa-lightbulb' },
          { id: 2, name: 'Dyeing', water: 15000, electricity: 2500, chemical: 3000, other: 2000, savingPct: 0.15, maxTds: 250, maxHardness: 100, recommendation: 'Improve dyeing efficiency, use low-liquor ratio machines', priority: 'High', icon: 'fa-flask' },
          { id: 3, name: 'Washing & Rinsing', water: 10000, electricity: 1500, chemical: 800, other: 1200, savingPct: 0.30, maxTds: 700, maxHardness: 250, recommendation: 'Optimize rinse cycles, reuse suitable rinse water', priority: 'High', icon: 'fa-recycle' },
          { id: 4, name: 'Finishing', water: 4000, electricity: 800, chemical: 600, other: 1100, savingPct: 0.10, maxTds: 350, maxHardness: 120, recommendation: 'Use low-water finishing techniques', priority: 'Low', icon: 'fa-spray-can' },
          { id: 5, name: 'Machine Cleaning', water: 3000, electricity: 500, chemical: 300, other: 700, savingPct: 0.20, maxTds: 900, maxHardness: 300, recommendation: 'Use high-pressure low-flow cleaning systems', priority: 'Medium', icon: 'fa-faucet-drip' }
        ];
        renderProcessTable();
      }
    });
  }
}

// Render dynamic table of processes in Step 4
function renderProcessTable() {
  const tbody = document.getElementById('process-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  let totalWater = 0;
  let totalElec = 0;
  let totalChem = 0;
  let totalOther = 0;

  state.processes.forEach((proc, index) => {
    totalWater += Number(proc.water) || 0;
    totalElec += Number(proc.electricity) || 0;
    totalChem += Number(proc.chemical) || 0;
    totalOther += Number(proc.other) || 0;

    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-100 hover:bg-slate-50 transition-colors text-xs';
    tr.innerHTML = `
      <td class="py-2.5 px-3 font-medium text-slate-800">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
            <i class="fa-solid ${proc.icon || 'fa-industry'}"></i>
          </span>
          <input type="text" value="${proc.name}" class="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 font-medium w-full text-xs"
            onchange="updateProcessField(${proc.id}, 'name', this.value)" />
        </div>
      </td>
      <td class="py-2.5 px-3">
        <div class="flex items-center">
          <input type="number" min="0" step="50" value="${proc.water}" class="w-24 px-2 py-1 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 text-xs"
            onchange="updateProcessField(${proc.id}, 'water', this.value)" />
          <span class="text-[10px] text-slate-400 ml-1">L/d</span>
        </div>
      </td>
      <td class="py-2.5 px-3">
        <div class="flex items-center">
          <input type="number" min="50" step="25" value="${proc.maxTds || 500}" class="w-20 px-2 py-1 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 text-xs"
            onchange="updateProcessField(${proc.id}, 'maxTds', this.value)" />
          <span class="text-[10px] text-slate-400 ml-1">mg/L</span>
        </div>
      </td>
      <td class="py-2.5 px-3">
        <div class="flex items-center">
          <input type="number" min="10" step="10" value="${proc.maxHardness || 150}" class="w-20 px-2 py-1 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 text-xs"
            onchange="updateProcessField(${proc.id}, 'maxHardness', this.value)" />
          <span class="text-[10px] text-slate-400 ml-1">mg/L</span>
        </div>
      </td>
      <td class="py-2.5 px-3">
        <div class="flex items-center">
          <span class="text-[10px] text-slate-400 mr-1">₹</span>
          <input type="number" min="0" step="10" value="${proc.electricity}" class="w-16 px-2 py-1 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 text-slate-700 text-xs"
            onchange="updateProcessField(${proc.id}, 'electricity', this.value)" />
        </div>
      </td>
      <td class="py-2.5 px-3">
        <div class="flex items-center">
          <span class="text-[10px] text-slate-400 mr-1">₹</span>
          <input type="number" min="0" step="10" value="${proc.chemical}" class="w-16 px-2 py-1 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 text-slate-700 text-xs"
            onchange="updateProcessField(${proc.id}, 'chemical', this.value)" />
        </div>
      </td>
      <td class="py-2.5 px-3">
        <div class="flex items-center">
          <span class="text-[10px] text-slate-400 mr-1">₹</span>
          <input type="number" min="0" step="10" value="${proc.other}" class="w-16 px-2 py-1 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 text-slate-700 text-xs"
            onchange="updateProcessField(${proc.id}, 'other', this.value)" />
        </div>
      </td>
      <td class="py-2.5 px-3 text-center">
        <button type="button" onclick="deleteProcess(${proc.id})" class="text-slate-400 hover:text-red-600 transition-colors p-1" title="Delete process">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Update total preview footer
  const totalWaterDisplay = document.getElementById('total-water-preview');
  if (totalWaterDisplay) {
    totalWaterDisplay.innerText = `${totalWater.toLocaleString('en-IN')} L/day`;
  }
  const totalCostDisplay = document.getElementById('total-cost-preview');
  if (totalCostDisplay) {
    const dailyWaterCost = (totalWater / 1000) * state.factory.waterCost;
    const dailyTotalCost = dailyWaterCost + totalElec + totalChem + totalOther;
    totalCostDisplay.innerText = `₹${Math.round(dailyTotalCost).toLocaleString('en-IN')} / day`;
  }
}

// Update single field in process array
window.updateProcessField = function(id, field, value) {
  const proc = state.processes.find(p => p.id === id);
  if (proc) {
    if (field === 'name') {
      proc.name = value;
    } else {
      proc[field] = parseFloat(value) || 0;
    }
    renderProcessTable();
    saveStateToStorage();
  }
};

// Delete process from array
window.deleteProcess = function(id) {
  if (state.processes.length <= 1) {
    alert('At least one process must be configured.');
    return;
  }
  state.processes = state.processes.filter(p => p.id !== id);
  renderProcessTable();
  saveStateToStorage();
};

// STEP 5: Animation Engine Simulation
function runAnalysisAnimation() {
  const steps = [
    { id: 'engine-step-1', delay: 400 },
    { id: 'engine-step-2', delay: 800 },
    { id: 'engine-step-3', delay: 1200 },
    { id: 'engine-step-4', delay: 1600 },
    { id: 'engine-step-5', delay: 2000 },
    { id: 'engine-step-6', delay: 2400 }
  ];

  // Reset status badges
  steps.forEach(s => {
    const el = document.getElementById(s.id);
    if (el) {
      el.className = 'flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white text-slate-600';
      const badge = el.querySelector('.step-status-badge');
      if (badge) badge.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-slate-400"></i>';
    }
  });

  const progressBar = document.getElementById('engine-progress-bar');
  if (progressBar) progressBar.style.width = '0%';

  steps.forEach((s, idx) => {
    setTimeout(() => {
      const el = document.getElementById(s.id);
      if (el) {
        el.className = 'flex items-center justify-between p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 font-medium transition-all';
        const badge = el.querySelector('.step-status-badge');
        if (badge) badge.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-600"></i>';
      }
      if (progressBar) {
        const pct = Math.round(((idx + 1) / steps.length) * 100);
        progressBar.style.width = `${pct}%`;
      }
    }, s.delay);
  });

  // Auto transition to Step 6 after animation finishes
  setTimeout(() => {
    const proceedBtn = document.getElementById('btn-proceed-results');
    if (proceedBtn) {
      proceedBtn.classList.remove('opacity-50', 'pointer-events-none');
      proceedBtn.classList.add('glow-blue');
    }
  }, 2700);
}

// Core Optimization Calculation Engine
function calculateOptimization() {
  const factory = state.factory;
  const freshWater = {
    tds: Number(factory.freshTds) || 150,
    hardness: Number(factory.freshHardness) || 80
  };
  const treatedWater = {
    tds: Number(factory.treatedTds) || 650,
    hardness: Number(factory.treatedHardness) || 200,
    availableVolume: Number(factory.treatedAvailable) || 7450
  };

  // Scenario Multiplier:
  // standard: 1.0 (benchmark allocations: 18.6% headline saving)
  // advanced: 1.35 (+35% extra recycling via counter-current rinsing & filtration)
  // eco_max: 1.70 (+70% ultra-low liquor ratio & closed loop membrane polishing)
  let multiplier = 1.0;
  if (state.scenario === 'advanced') multiplier = 1.35;
  if (state.scenario === 'eco_max') multiplier = 1.70;

  const adjustedTreatedWater = {
    ...treatedWater,
    availableVolume: Math.round(treatedWater.availableVolume * multiplier)
  };

  let blendResults = null;
  if (typeof BlendOptimizer !== 'undefined') {
    blendResults = BlendOptimizer.allocateTreatedWater({
      freshWater,
      treatedWater: adjustedTreatedWater,
      stages: state.processes.map(proc => ({
        id: proc.id,
        name: proc.name,
        water: Number(proc.water) || 0,
        demand: Number(proc.water) || 0,
        maxTds: Number(proc.maxTds) || 600,
        maxHardness: Number(proc.maxHardness) || 200,
        recommendation: proc.recommendation,
        priority: proc.priority,
        icon: proc.icon
      }))
    });
  }

  let totalBefore = 0;
  let totalSaved = 0;
  let totalAfter = 0;
  const breakdown = [];

  if (blendResults) {
    totalBefore = blendResults.totalDemand;
    totalSaved = blendResults.totalRecycled;
    totalAfter = blendResults.totalFresh;

    blendResults.perStage.forEach(stage => {
      const origProc = state.processes.find(p => p.id === stage.id) || {};
      
      // Formulate dynamic recommendation reflecting limitedBy
      let dynamicRec = origProc.recommendation || 'Optimize process water flow';
      if (stage.limitedBy === 'supply') {
        dynamicRec = `${stage.name} could take up to ${stage.maxFraction}% treated water, but supply is exhausted. Adding RO capacity would unlock more savings.`;
      } else if (stage.limitedBy === 'quality') {
        dynamicRec = `${stage.name} reuse is restricted by strict ${stage.limitingConstraint} quality limits. Nanofiltration or RO polishing required to increase reuse fraction.`;
      } else if (stage.limitedBy === 'demand') {
        dynamicRec = `${stage.name} water demand is 100% met by treated blend within safe quality limits.`;
      }

      breakdown.push({
        id: stage.id,
        name: stage.name,
        waterBefore: stage.demand,
        waterAfter: stage.freshVolume,
        waterSaved: stage.recycledVolume,
        savingPct: stage.savingPercent,
        blendedTds: stage.blendedTds,
        blendedHardness: stage.blendedHardness,
        maxFraction: stage.maxFraction,
        limitedBy: stage.limitedBy,
        limitingConstraint: stage.limitingConstraint,
        recommendation: dynamicRec,
        priority: origProc.priority || 'Medium',
        icon: origProc.icon || 'fa-droplet'
      });
    });
  } else {
    // Fallback if BlendOptimizer is not loaded
    state.processes.forEach(proc => {
      const waterBefore = Number(proc.water) || 0;
      totalBefore += waterBefore;
      const effectiveSavingRate = Math.min(0.60, (proc.savingPct || 0.15) * multiplier);
      const waterSaved = Math.round(waterBefore * effectiveSavingRate);
      const waterAfter = waterBefore - waterSaved;
      totalSaved += waterSaved;

      breakdown.push({
        id: proc.id,
        name: proc.name,
        waterBefore,
        waterAfter,
        waterSaved,
        savingPct: Math.round((waterSaved / (waterBefore || 1)) * 100),
        blendedTds: 450,
        blendedHardness: 120,
        maxFraction: 50,
        limitedBy: 'supply',
        limitingConstraint: 'TDS',
        recommendation: proc.recommendation || 'Optimize process flow',
        priority: proc.priority || 'Medium',
        icon: proc.icon || 'fa-water'
      });
    });
    totalAfter = totalBefore - totalSaved;
  }

  const reductionPct = totalBefore > 0 ? (totalSaved / totalBefore) * 100 : 0;

  // Cost calculations
  const costPerLiter = factory.waterCost / 1000;
  const dailyCostSaving = totalSaved * costPerLiter;
  const monthlyCostSaving = dailyCostSaving * factory.workingDays;
  const annualCostSaving = monthlyCostSaving * 12;

  // Specific water consumption per kg of fabric
  const specificWaterBefore = factory.capacity > 0 ? (totalBefore / factory.capacity) : 0;
  const specificWaterAfter = factory.capacity > 0 ? (totalAfter / factory.capacity) : 0;

  // Water usage shares for Donut chart (percentage of totalAfter)
  breakdown.forEach(item => {
    item.shareAfter = totalAfter > 0 ? Math.round((item.waterAfter / totalAfter) * 100) : 0;
  });

  state.results = {
    totalBefore,
    totalAfter,
    totalSaved,
    reductionPct: Number(reductionPct.toFixed(1)),
    dailyCostSaving: Math.round(dailyCostSaving),
    monthlyCostSaving: Math.round(monthlyCostSaving),
    annualCostSaving: Math.round(annualCostSaving),
    specificWaterBefore: Number(specificWaterBefore.toFixed(1)),
    specificWaterAfter: Number(specificWaterAfter.toFixed(1)),
    breakdown,
    blendResults,
    generatedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  };

  return state.results;
}

// STEP 6: Render Results Dashboard and Charts
function renderResultsDashboard() {
  if (!state.results) calculateOptimization();
  const res = state.results;

  // Update KPI Cards
  document.getElementById('kpi-total-before').innerText = `${res.totalBefore.toLocaleString('en-IN')} L/day`;
  document.getElementById('kpi-total-after').innerText = `${res.totalAfter.toLocaleString('en-IN')} L/day`;
  document.getElementById('kpi-reduction-pct').innerText = `${res.reductionPct}%`;
  document.getElementById('kpi-monthly-saving').innerText = `₹${res.monthlyCostSaving.toLocaleString('en-IN')}`;

  // Sub-badges
  const specificEl = document.getElementById('kpi-specific-water');
  if (specificEl) {
    specificEl.innerText = `${res.specificWaterAfter} L/kg fabric (was ${res.specificWaterBefore} L/kg)`;
  }
  const annualEl = document.getElementById('kpi-annual-saving');
  if (annualEl) {
    annualEl.innerText = `₹${res.annualCostSaving.toLocaleString('en-IN')} / year`;
  }

  // Render Charts, Blend Table, and AI Prediction Engine
  renderBarChart();
  renderDonutChart();
  renderBlendTable();
  runAiWaterPrediction();
}

// Render Per-Stage Water Blend Optimization Table in Step 6
function renderBlendTable() {
  const tbody = document.getElementById('blend-optimization-table-body');
  if (!tbody || !state.results) return;

  const res = state.results;
  const f = state.factory;
  tbody.innerHTML = '';

  const washingStage = res.breakdown.find(b => b.name.toLowerCase().includes('wash')) || res.breakdown[0] || {};

  // Update strip summary
  const stripFresh = document.getElementById('blend-strip-fresh');
  if (stripFresh) stripFresh.innerText = `${f.freshTds || 150} mg/L TDS · ${f.freshHardness || 80} mg/L Hardness`;

  const stripTreated = document.getElementById('blend-strip-treated');
  if (stripTreated) stripTreated.innerText = `${f.treatedTds || 650} mg/L TDS · ${f.treatedHardness || 200} mg/L Hardness · ${(f.treatedAvailable || 7450).toLocaleString('en-IN')} L/d`;

  const stripWashingTds = document.getElementById('blend-strip-washing-tds');
  if (stripWashingTds) stripWashingTds.innerText = `${washingStage.blendedTds || 523} mg/L`;

  const stripUnused = document.getElementById('blend-strip-unused');
  if (stripUnused) {
    const unused = res.blendResults ? res.blendResults.unusedTreatedWater : 0;
    stripUnused.innerText = `${unused.toLocaleString('en-IN')} L/day`;
  }

  // Populate per-stage rows
  res.breakdown.forEach(stage => {
    let statusBadge = '';
    if (stage.limitedBy === 'supply') {
      statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200" title="Quality allows up to ${stage.maxFraction}%, but supply was exhausted"><i class="fa-solid fa-battery-empty mr-1"></i> Supply Exhausted</span>`;
    } else if (stage.limitedBy === 'quality') {
      statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200" title="Capped by strict ${stage.limitingConstraint || 'quality'} threshold"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Quality Limit (${stage.limitingConstraint || 'TDS'})</span>`;
    } else if (stage.limitedBy === 'demand') {
      statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><i class="fa-solid fa-circle-check mr-1"></i> 100% Demand Met</span>`;
    } else {
      statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">None</span>`;
    }

    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-100 hover:bg-slate-50/80 transition-colors text-xs';
    tr.innerHTML = `
      <td class="py-3 px-4 font-semibold text-slate-800">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
            <i class="fa-solid ${stage.icon || 'fa-droplet'}"></i>
          </span>
          <span>${stage.name}</span>
        </div>
      </td>
      <td class="py-3 px-4 text-right font-medium text-slate-700">${stage.waterBefore.toLocaleString('en-IN')}</td>
      <td class="py-3 px-4 text-right font-semibold text-blue-600">${stage.waterAfter.toLocaleString('en-IN')}</td>
      <td class="py-3 px-4 text-right font-bold text-emerald-600">${stage.waterSaved.toLocaleString('en-IN')}</td>
      <td class="py-3 px-4 text-right font-medium text-slate-700">${stage.blendedTds} mg/L</td>
      <td class="py-3 px-4 text-right font-medium text-slate-700">${stage.blendedHardness} mg/L</td>
      <td class="py-3 px-4 text-center font-semibold text-slate-700">${stage.maxFraction}%</td>
      <td class="py-3 px-4 text-center">${statusBadge}</td>
      <td class="py-3 px-4 text-right font-bold ${stage.savingPct > 0 ? 'text-emerald-600' : 'text-slate-400'}">${stage.savingPct}%</td>
    `;
    tbody.appendChild(tr);
  });

  // Update table totals
  const totalDemandEl = document.getElementById('blend-total-demand');
  if (totalDemandEl) totalDemandEl.innerText = `${res.totalBefore.toLocaleString('en-IN')} L/d`;

  const totalFreshEl = document.getElementById('blend-total-fresh');
  if (totalFreshEl) totalFreshEl.innerText = `${res.totalAfter.toLocaleString('en-IN')} L/d`;

  const totalRecycledEl = document.getElementById('blend-total-recycled');
  if (totalRecycledEl) totalRecycledEl.innerText = `${res.totalSaved.toLocaleString('en-IN')} L/d`;

  const totalSavingPctEl = document.getElementById('blend-total-saving-pct');
  if (totalSavingPctEl) totalSavingPctEl.innerText = `${res.reductionPct}%`;
}

// AI Predictive Water Demand & Next-Shift Forecasting Engine
window.runAiWaterPrediction = function() {
  const batchInput = document.getElementById('ai-input-batch-kg');
  const fabricInput = document.getElementById('ai-input-fabric');
  const shadeInput = document.getElementById('ai-input-shade');
  const shiftsInput = document.getElementById('ai-input-shifts');

  const batchKg = batchInput ? parseFloat(batchInput.value) || 1000 : 1000;
  const fabric = fabricInput ? fabricInput.value : 'cotton';
  const shade = shadeInput ? shadeInput.value : 'medium';
  const shifts = shiftsInput ? shiftsInput.value : '2';

  // Specific water intensity factors per fabric type (Liters per kg of fabric)
  const fabricFactors = {
    cotton: 40,    // Standard combed cotton wet-processing
    denim: 48,     // Heavy denim stone-washing, enzyme abrasion, tinting
    polyester: 26, // High-temperature pressure jet dyeing
    blend: 32      // Cotton-polyester blend
  };

  // Liquor ratio shade intensity multipliers
  const shadeFactors = {
    light: 0.88,   // Pastel / Pale: 1:6 liquor ratio, fewer wash-off baths
    medium: 1.00,  // Standard shades: 1:8 liquor ratio
    dark: 1.25     // Deep Reactive Black / Navy: 1:12 ratio, multiple boiling wash-offs
  };

  // Operating shift multipliers
  const shiftFactors = {
    '1': 0.65, // Single shift (8 hours)
    '2': 1.00, // Two shifts (16 hours standard)
    '3': 1.45  // Three continuous shifts (24 hours)
  };

  const baseLitersPerKg = fabricFactors[fabric] || 40;
  const shadeMult = shadeFactors[shade] || 1.0;
  const shiftMult = shiftFactors[shifts] || 1.0;

  // AI Predicted Total Water Demand (L/day)
  const predictedDemand = Math.round(batchKg * baseLitersPerKg * shadeMult * shiftMult);

  // Reclaimed Water Blend Prediction (approx 19.3% to 22.5% recovered from ETP)
  const reclaimFraction = fabric === 'denim' ? 0.22 : (shade === 'dark' ? 0.21 : 0.193);
  const predictedRecycled = Math.round(predictedDemand * reclaimFraction);
  const predictedFresh = Math.max(0, predictedDemand - predictedRecycled);

  // Cost estimates (Water Cost is ₹ per 1,000 L)
  const waterCostPerLiter = (state.factory.waterCost || 50) / 1000;
  const predictedCost = Math.round(predictedFresh * waterCostPerLiter);
  const predictedCostSaved = Math.round(predictedRecycled * waterCostPerLiter);

  // Delta vs today's baseline
  const baseline = (state.results && state.results.totalBefore) ? state.results.totalBefore : 40000;
  const deltaPct = Number((((predictedDemand - baseline) / baseline) * 100).toFixed(1));
  const deltaSign = deltaPct >= 0 ? '+' : '';

  // Update DOM Output Cards
  const totalDemandEl = document.getElementById('ai-pred-total-demand');
  if (totalDemandEl) {
    totalDemandEl.innerHTML = `${predictedDemand.toLocaleString('en-IN')} <span class="text-xs font-normal text-slate-400">L/d</span>`;
  }

  const deltaEl = document.getElementById('ai-pred-demand-delta');
  if (deltaEl) {
    const isUp = deltaPct > 0;
    const colorClass = isUp ? 'text-amber-600' : 'text-emerald-600';
    const icon = isUp ? '↑' : '↓';
    deltaEl.innerHTML = `<span class="${colorClass} font-bold">${icon} ${deltaSign}${deltaPct}%</span> vs Today's Baseline`;
  }

  const recycledEl = document.getElementById('ai-pred-recycled');
  if (recycledEl) {
    recycledEl.innerHTML = `${predictedRecycled.toLocaleString('en-IN')} <span class="text-xs font-normal text-slate-400">L/d</span>`;
  }

  const recycleRateEl = document.getElementById('ai-pred-recycle-rate');
  if (recycleRateEl) {
    const rate = ((predictedRecycled / predictedDemand) * 100).toFixed(1);
    recycleRateEl.innerText = `${rate}% Automated Reclaim Rate`;
  }

  const freshEl = document.getElementById('ai-pred-fresh');
  if (freshEl) {
    freshEl.innerHTML = `${predictedFresh.toLocaleString('en-IN')} <span class="text-xs font-normal text-slate-400">L/d</span>`;
  }

  const freshSavingEl = document.getElementById('ai-pred-fresh-saving');
  if (freshSavingEl) {
    freshSavingEl.innerText = `Saved ${predictedRecycled.toLocaleString('en-IN')} L via Blend Engine`;
  }

  const costEl = document.getElementById('ai-pred-cost');
  if (costEl) {
    costEl.innerHTML = `₹${predictedCost.toLocaleString('en-IN')} <span class="text-xs font-normal text-slate-400">/day</span>`;
  }

  const costSavingEl = document.getElementById('ai-pred-cost-saving');
  if (costSavingEl) {
    costSavingEl.innerText = `₹${predictedCostSaved.toLocaleString('en-IN')}/day saved vs Unmanaged`;
  }

  // Update AI Prescriptive Insights based on selection
  const insight1 = document.getElementById('ai-insight-text-1');
  const insight2 = document.getElementById('ai-insight-text-2');
  const insight3 = document.getElementById('ai-insight-text-3');

  if (shade === 'dark') {
    if (insight1) insight1.innerText = `Deep Reactive Dyeing surge detected (~${Math.round(predictedDemand * 0.38).toLocaleString('en-IN')} L in Dyeing). Recommend pre-buffering 4,500 L of treated water overnight during off-peak power hours.`;
    if (insight2) insight2.innerText = `Hydrolyzed dye effluent will increase secondary clarifier COD. Automatic polymer coagulant dosing increased to 58 ppm.`;
    if (insight3) insight3.innerText = `Activating counter-current wash cascades on rinsing jigs will prevent shade bleeding while saving ~2,400 L tomorrow.`;
  } else if (fabric === 'denim') {
    if (insight1) insight1.innerText = `Heavy Denim processing requires extra pumice rinsing. Total forecasted demand is ${predictedDemand.toLocaleString('en-IN')} L/day across 5 wash stages.`;
    if (insight2) insight2.innerText = `High lint and suspended solids expected. Automatic micro-strainer backwash interval adjusted to every 2.5 hours.`;
    if (insight3) insight3.innerText = `Denim desize rinse effluent can be directly redirected to machine wash lines, saving up to ₹620/day.`;
  } else if (fabric === 'polyester') {
    if (insight1) insight1.innerText = `Polyester high-pressure jet dyeing consumes less water (26 L/kg). Projected freshwater draw reduced to ${predictedFresh.toLocaleString('en-IN')} L/day.`;
    if (insight2) insight2.innerText = `Disperse dye reduction clearing generates alkaline effluent. Acid neutralization dosing automatically set to pH 7.2.`;
    if (insight3) insight3.innerText = `Heat recovery exchanger will preheat cooling water to 60°C, lowering thermal boiler energy by 18%.`;
  } else {
    if (insight1) insight1.innerText = `Standard cotton batch (${batchKg} kg). Forecasted water demand is ${predictedDemand.toLocaleString('en-IN')} L/day with ${predictedRecycled.toLocaleString('en-IN')} L met via recycled blend.`;
    if (insight2) insight2.innerText = `Clarifier effluent TDS predicted at 640 mg/L. Washing stage blend ratio will safely operate at 74.5% recycled water.`;
    if (insight3) insight3.innerText = `Counter-current rinse staging on lines 1 & 2 recommended to maintain specific water consumption below 33 L/kg fabric.`;
  }

  // Render 7-Day Actual vs AI Forecast Chart
  renderAiForecastChart(baseline, predictedDemand, predictedRecycled, predictedFresh);
};

// Render 7-Day Trend Chart: Past 4 Days Actual vs Next 3 Days AI Prediction
function renderAiForecastChart(todayBaseline, predTomorrow, predRecycled, predFresh) {
  const ctx = document.getElementById('chart-ai-forecast');
  if (!ctx) return;

  const day1 = Math.round(todayBaseline * 0.94);
  const day2 = Math.round(todayBaseline * 0.98);
  const day3 = Math.round(todayBaseline * 1.03);
  const day4 = todayBaseline; // Today

  const day5 = predTomorrow; // Tomorrow (AI)
  const day6 = Math.round(predTomorrow * 1.02); // Day +2 (AI)
  const day7 = Math.round(predTomorrow * 0.96); // Day +3 (AI)

  const recDay1 = Math.round(day1 * 0.186);
  const recDay2 = Math.round(day2 * 0.186);
  const recDay3 = Math.round(day3 * 0.186);
  const recDay4 = Math.round(todayBaseline * 0.186);
  const recDay5 = predRecycled;
  const recDay6 = Math.round(predRecycled * 1.02);
  const recDay7 = Math.round(predRecycled * 0.96);

  if (aiForecastChartInstance) {
    aiForecastChartInstance.destroy();
  }

  aiForecastChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['3 Days Ago', '2 Days Ago', 'Yesterday', 'Today', 'Tomorrow (AI)', 'Day +2 (AI)', 'Day +3 (AI)'],
      datasets: [
        {
          label: 'Historical Actual (L/d)',
          data: [day1, day2, day3, day4, null, null, null],
          borderColor: '#2563eb', // Blue
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          borderWidth: 2.5,
          pointBackgroundColor: '#2563eb',
          pointRadius: 4,
          tension: 0.3,
          fill: false
        },
        {
          label: 'AI Forecast Demand (L/d)',
          data: [null, null, null, day4, day5, day6, day7],
          borderColor: '#10b981', // Emerald
          backgroundColor: 'rgba(16, 185, 129, 0.10)',
          borderWidth: 2.5,
          borderDash: [6, 4],
          pointBackgroundColor: '#10b981',
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.3,
          fill: true
        },
        {
          label: 'Recycled Reclaim (L/d)',
          data: [recDay1, recDay2, recDay3, recDay4, recDay5, recDay6, recDay7],
          borderColor: '#818cf8', // Indigo
          backgroundColor: 'transparent',
          borderWidth: 1.8,
          borderDash: [3, 3],
          pointRadius: 3,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.parsed.y;
              if (val === null || val === undefined) return '';
              return ` ${context.dataset.label}: ${val.toLocaleString('en-IN')} L/day`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: Math.floor(Math.min(recDay1, recDay5) * 0.8),
          grid: { color: '#f1f5f9' },
          ticks: {
            callback: value => value.toLocaleString('en-IN')
          }
        },
        x: {
          grid: { display: false },
          ticks: { font: { weight: '600', size: 10 } }
        }
      }
    }
  });
}

// Bar Chart: Process-wise Before vs After
function renderBarChart() {
  const ctx = document.getElementById('chart-process-bar');
  if (!ctx) return;

  const labels = state.results.breakdown.map(b => b.name);
  const dataBefore = state.results.breakdown.map(b => b.waterBefore);
  const dataAfter = state.results.breakdown.map(b => b.waterAfter);

  if (barChartInstance) {
    barChartInstance.destroy();
  }

  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Before Optimization',
          data: dataBefore,
          backgroundColor: '#f87171', // Red / Coral
          borderColor: '#ef4444',
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.65
        },
        {
          label: 'After Optimization',
          data: dataAfter,
          backgroundColor: '#34d399', // Emerald / Green
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.65
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600' } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` ${context.dataset.label}: ${context.parsed.y.toLocaleString('en-IN')} L/day`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Water Usage (L/day)', font: { weight: 'bold' } },
          grid: { color: '#f1f5f9' },
          ticks: {
            callback: value => value.toLocaleString('en-IN')
          }
        },
        x: {
          grid: { display: false },
          ticks: { font: { weight: '500' } }
        }
      }
    }
  });
}

// Donut Chart: Water Usage Share (After)
function renderDonutChart() {
  const ctx = document.getElementById('chart-share-donut');
  if (!ctx) return;

  const labels = state.results.breakdown.map(b => b.name);
  const dataShares = state.results.breakdown.map(b => b.waterAfter);

  // Palette matching diagram: Blue, Red, Green, Yellow/Orange, Purple
  const colorPalette = ['#38bdf8', '#f87171', '#4ade80', '#fbbf24', '#c084fc', '#94a3b8', '#a78bfa'];

  if (donutChartInstance) {
    donutChartInstance.destroy();
  }

  donutChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [
        {
          data: dataShares,
          backgroundColor: colorPalette.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '500' }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const val = context.parsed;
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return ` ${context.label}: ${val.toLocaleString('en-IN')} L/day (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// STEP 7: Render Recommendations
function renderRecommendations() {
  if (!state.results) calculateOptimization();
  const container = document.getElementById('recommendations-list');
  if (!container) return;

  container.innerHTML = '';

  state.results.breakdown.forEach(proc => {
    let priorityBadge = '';
    if (proc.priority === 'High') {
      priorityBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">High Priority</span>';
    } else if (proc.priority === 'Medium') {
      priorityBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Medium Priority</span>';
    } else {
      priorityBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Standard / Low</span>';
    }

    let limitedByBadge = '';
    if (proc.limitedBy === 'supply') {
      limitedByBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200"><i class="fa-solid fa-battery-empty mr-1"></i> Supply Limited</span>';
    } else if (proc.limitedBy === 'quality') {
      limitedByBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Quality Capped (${proc.limitingConstraint || 'TDS'})</span>`;
    } else if (proc.limitedBy === 'demand') {
      limitedByBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><i class="fa-solid fa-circle-check mr-1"></i> 100% Demand Met</span>';
    }

    const card = document.createElement('div');
    card.className = 'glass-card p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow';
    card.innerHTML = `
      <div class="flex items-start gap-3.5">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
          <i class="fa-solid ${proc.icon}"></i>
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <h4 class="font-bold text-slate-800 text-base">${proc.name}</h4>
            ${priorityBadge}
            ${limitedByBadge}
          </div>
          <p class="text-sm text-slate-600 font-medium">${proc.recommendation}</p>
          <div class="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
            <span>Baseline: <strong class="text-slate-600">${proc.waterBefore.toLocaleString('en-IN')} L/d</strong></span>
            <span>Target: <strong class="text-emerald-600">${proc.waterAfter.toLocaleString('en-IN')} L/d</strong></span>
            <span>Blended TDS: <strong class="text-purple-600">${proc.blendedTds || '-'} mg/L</strong></span>
            <span>Quality Cap: <strong class="text-blue-600">${proc.maxFraction || 0}%</strong></span>
          </div>
        </div>
      </div>
      <div class="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
        <div class="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl text-sm border border-emerald-200 flex items-center gap-1.5 whitespace-nowrap">
          <i class="fa-solid fa-droplet text-emerald-500"></i>
          Save ${proc.waterSaved.toLocaleString('en-IN')} L/day
        </div>
        <span class="text-xs text-slate-400 mt-1">-${proc.savingPct}% reduction</span>
      </div>
    `;
    container.appendChild(card);
  });

  // Summary footer in recommendations
  const totalSavedBadge = document.getElementById('rec-total-saved-badge');
  if (totalSavedBadge) {
    totalSavedBadge.innerText = `Total Water Saved: ${state.results.totalSaved.toLocaleString('en-IN')} L/day (${state.results.reductionPct}% overall)`;
  }
}

// STEP 8: Render Detailed Executive Report
function renderDetailedReport() {
  if (!state.results) calculateOptimization();
  const res = state.results;
  const f = state.factory;

  document.getElementById('report-factory-name').innerText = f.name;
  document.getElementById('report-capacity').innerText = `${f.capacity.toLocaleString('en-IN')} kg/day`;
  document.getElementById('report-fabric').innerText = f.fabricType;
  document.getElementById('report-date').innerText = res.generatedAt;

  document.getElementById('report-total-saved').innerText = `${res.totalSaved.toLocaleString('en-IN')} L/day`;
  document.getElementById('report-reduction-pct').innerText = `${res.reductionPct}%`;
  document.getElementById('report-monthly-saving').innerText = `₹${res.monthlyCostSaving.toLocaleString('en-IN')}`;
  document.getElementById('report-annual-saving').innerText = `₹${res.annualCostSaving.toLocaleString('en-IN')}`;

  // Populate report table
  const tbody = document.getElementById('report-table-body');
  if (tbody) {
    tbody.innerHTML = '';
    res.breakdown.forEach(proc => {
      const dailySavingCost = Math.round((proc.waterSaved / 1000) * f.waterCost);
      const monthlySavingCost = dailySavingCost * f.workingDays;

      const tr = document.createElement('tr');
      tr.className = 'border-b border-slate-200 text-xs';
      tr.innerHTML = `
        <td class="py-2.5 px-3 font-semibold text-slate-800">${proc.name}</td>
        <td class="py-2.5 px-3 text-right text-slate-600">${proc.waterBefore.toLocaleString('en-IN')}</td>
        <td class="py-2.5 px-3 text-right text-emerald-700 font-semibold">${proc.waterAfter.toLocaleString('en-IN')}</td>
        <td class="py-2.5 px-3 text-right text-blue-600 font-bold">${proc.waterSaved.toLocaleString('en-IN')}</td>
        <td class="py-2.5 px-3 text-right text-slate-600">${proc.savingPct}%</td>
        <td class="py-2.5 px-3 text-right font-medium text-slate-700">₹${monthlySavingCost.toLocaleString('en-IN')}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Render Mini Chart for Report
  renderReportChart();
}

// Mini Chart in Report
function renderReportChart() {
  const ctx = document.getElementById('report-mini-chart');
  if (!ctx) return;

  if (reportChartInstance) {
    reportChartInstance.destroy();
  }

  reportChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: state.results.breakdown.map(b => b.name),
      datasets: [
        {
          label: 'Baseline (L/day)',
          data: state.results.breakdown.map(b => b.waterBefore),
          backgroundColor: '#f87171',
          borderRadius: 4
        },
        {
          label: 'Optimized (L/day)',
          data: state.results.breakdown.map(b => b.waterAfter),
          backgroundColor: '#10b981',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 } } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { font: { size: 9 } } },
        x: { ticks: { font: { size: 9 } } }
      }
    }
  });
}

// Print / PDF Export
window.downloadReportPDF = function() {
  window.print();
};

// STEP 9: Further Actions & Interactive Scenarios
function renderFurtherActions() {
  const targetSlider = document.getElementById('target-reduction-slider');
  const targetDisplay = document.getElementById('target-reduction-val');

  if (targetSlider && targetDisplay) {
    targetSlider.value = state.targetReductionPct;
    targetDisplay.innerText = `${state.targetReductionPct}%`;
  }
}

// Scenario comparison change
window.setOptimizationScenario = function(scenarioName) {
  state.scenario = scenarioName;

  // Update UI buttons
  document.querySelectorAll('.scenario-btn').forEach(btn => {
    btn.classList.remove('bg-blue-600', 'text-white', 'shadow-md');
    btn.classList.add('bg-slate-100', 'text-slate-700');
  });
  const activeBtn = document.getElementById(`scenario-${scenarioName}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-blue-600', 'text-white', 'shadow-md');
    activeBtn.classList.remove('bg-slate-100', 'text-slate-700');
  }

  // Recalculate
  calculateOptimization();
  renderResultsDashboard();
  renderRecommendations();
  renderDetailedReport();
};

// Target reduction slider update
window.updateTargetReduction = function(val) {
  state.targetReductionPct = parseInt(val);
  const display = document.getElementById('target-reduction-val');
  if (display) display.innerText = `${val}%`;

  const targetLiters = Math.round(state.results.totalBefore * (1 - (val / 100)));
  const targetDailySavings = Math.round(state.results.totalBefore * (val / 100));
  const targetMonthlySaving = Math.round((targetDailySavings / 1000) * state.factory.waterCost * state.factory.workingDays);

  const feedback = document.getElementById('target-impact-feedback');
  if (feedback) {
    feedback.innerHTML = `
      Target Consumption: <strong class="text-blue-600">${targetLiters.toLocaleString('en-IN')} L/day</strong> |
      Required Saving: <strong class="text-emerald-600">${targetDailySavings.toLocaleString('en-IN')} L/day</strong> |
      Estimated Monthly Cost Saving: <strong class="text-emerald-700">₹${targetMonthlySaving.toLocaleString('en-IN')}</strong>
    `;
  }
};

// Export project data as downloadable JSON
window.exportProjectJSON = function() {
  const data = {
    factory: state.factory,
    processes: state.processes,
    results: state.results,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `water-optimization-${state.factory.name.toLowerCase().replace(/\s+/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// Quick guest demo starter
window.startQuickDemo = function() {
  state.user.isLoggedIn = true;
  state.user.email = 'demo@abctextiles.com';
  goToStep(3);
};

// Flowchart Lightbox Modal Controls
window.openFlowchartModal = function() {
  const modal = document.getElementById('flowchart-modal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
};

window.closeFlowchartModal = function() {
  const modal = document.getElementById('flowchart-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
};

// Simulation Lightbox Modal Controls
window.openSimulationModal = function() {
  const modal = document.getElementById('simulation-modal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
};

window.closeSimulationModal = function() {
  const modal = document.getElementById('simulation-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
};

// 5-Minute Presentation Demo Guide Modal Controls
window.openDemoGuideModal = function() {
  const modal = document.getElementById('demo-guide-modal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
};

window.closeDemoGuideModal = function() {
  const modal = document.getElementById('demo-guide-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
};

// Load sample factory benchmark data (40,000 L/d demand, 7,450 L/d treated supply)
window.loadSampleFactory = function() {
  state.user.isLoggedIn = true;
  state.user.email = 'manager@abctextiles.com';
  state.factory = {
    name: 'ABC Textiles',
    capacity: 1000,
    workingDays: 26,
    waterCost: 50,
    electricityCost: 7.1,
    chemicalCost: 151,
    fabricType: 'Cotton',
    freshTds: 150,
    freshHardness: 80,
    treatedTds: 650,
    treatedHardness: 200,
    treatedAvailable: 7450
  };
  state.processes = [
    {
      id: 1,
      name: 'Fabric Preparation',
      water: 8000,
      electricity: 1200,
      chemical: 1500,
      other: 1300,
      savingPct: 0.15,
      maxTds: 375,
      maxHardness: 160,
      recommendation: 'Reuse rinse water, optimize chemical dose',
      priority: 'Medium',
      icon: 'fa-lightbulb'
    },
    {
      id: 2,
      name: 'Dyeing',
      water: 15000,
      electricity: 2500,
      chemical: 3000,
      other: 2000,
      savingPct: 0.15,
      maxTds: 250,
      maxHardness: 100,
      recommendation: 'Improve dyeing efficiency, use low-liquor ratio machines',
      priority: 'High',
      icon: 'fa-flask'
    },
    {
      id: 3,
      name: 'Washing & Rinsing',
      water: 10000,
      electricity: 1500,
      chemical: 800,
      other: 1200,
      savingPct: 0.30,
      maxTds: 700,
      maxHardness: 250,
      recommendation: 'Optimize rinse cycles, reuse suitable rinse water',
      priority: 'High',
      icon: 'fa-recycle'
    },
    {
      id: 4,
      name: 'Finishing',
      water: 4000,
      electricity: 800,
      chemical: 600,
      other: 1100,
      savingPct: 0.10,
      maxTds: 350,
      maxHardness: 120,
      recommendation: 'Use low-water finishing techniques',
      priority: 'Low',
      icon: 'fa-spray-can'
    },
    {
      id: 5,
      name: 'Machine Cleaning',
      water: 3000,
      electricity: 500,
      chemical: 300,
      other: 700,
      savingPct: 0.20,
      maxTds: 900,
      maxHardness: 300,
      recommendation: 'Use high-pressure low-flow cleaning systems',
      priority: 'Medium',
      icon: 'fa-faucet-drip'
    }
  ];
  state.scenario = 'standard';
  saveStateToStorage();
  syncFactoryInputsToUI();
  renderProcessTable();
  calculateOptimization();
  goToStep(6);
};

// Global escape key listener to close active modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDemoGuideModal();
    closeFlowchartModal();
    closeSimulationModal();
  }
});



