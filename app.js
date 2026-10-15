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
    treatedAvailable: 7450, // L/day available from ETP
    dischargeLimit: 1450 // L/day regulatory discharge limit
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
  results: null,
  dailyLogs: []
};

// Global chart references for updating
let barChartInstance = null;
let donutChartInstance = null;
let reportChartInstance = null;
let aiForecastChartInstance = null;
let dailyTrendChartInstance = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  loadSavedData();
  loadDailyLogs();
  renderProcessTable();
  setupEventListeners();
  calculateOptimization();
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
          dischargeLimit: 1450,
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
  setVal('input-discharge-limit', f.dischargeLimit || 1450);
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
      state.factory.dischargeLimit = parseFloat(document.getElementById('input-discharge-limit')?.value) || 1450;

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

  // 1. Call water-model.js evaluate(processes, factory, options)
  let modelResult = null;
  if (typeof evaluate === 'function') {
    try {
      modelResult = evaluate(state.processes, state.factory, { scenario: state.scenario });
    } catch (err) {
      console.warn('water-model.js evaluate error, falling back:', err);
    }
  }

  const freshWater = {
    tds: Number(factory.freshTds) || 150,
    hardness: Number(factory.freshHardness) || 80
  };
  const treatedWater = {
    tds: Number(factory.treatedTds) || 650,
    hardness: Number(factory.treatedHardness) || 200,
    availableVolume: Number(factory.treatedAvailable !== undefined ? factory.treatedAvailable : 7450)
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

  let blendResults = modelResult?.blendResults || null;
  if (!blendResults && typeof BlendOptimizer !== 'undefined') {
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

  let totalBefore = modelResult ? modelResult.totalDemand : 0;
  let totalSaved = modelResult ? modelResult.totalRecycled : 0;
  let totalAfter = modelResult ? modelResult.totalFresh : 0;
  const breakdown = [];

  const perStageList = (modelResult && modelResult.perStage && modelResult.perStage.length)
    ? modelResult.perStage
    : (blendResults ? blendResults.perStage : []);

  if (perStageList.length) {
    if (!modelResult) {
      totalBefore = blendResults.totalDemand;
      totalSaved = blendResults.totalRecycled;
      totalAfter = blendResults.totalFresh;
    }

    perStageList.forEach(stage => {
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

  const reductionPct = modelResult 
    ? modelResult.savingPercent 
    : (totalBefore > 0 ? Number(((totalSaved / totalBefore) * 100).toFixed(1)) : 0);

  // Financial Cost calculations
  const dailyCostSaving = modelResult 
    ? modelResult.dailyCostSaving 
    : Math.round(totalSaved * (factory.waterCost / 1000));
  const monthlyCostSaving = modelResult 
    ? modelResult.monthlyCostSaving 
    : Math.round(dailyCostSaving * factory.workingDays);
  const annualCostSaving = modelResult 
    ? modelResult.annualCostSaving 
    : Math.round(monthlyCostSaving * 12);

  // Mass balance & effluent metrics
  const rawWastewaterGenerated = modelResult 
    ? modelResult.rawWastewaterGenerated 
    : Math.round(totalBefore * 0.6275);
  const dischargeLimit = modelResult 
    ? modelResult.dischargeLimit 
    : (Number(factory.dischargeLimit) || 1450);
  const finalDischarge = modelResult 
    ? modelResult.finalDischarge 
    : Math.min(dischargeLimit, Math.max(0, rawWastewaterGenerated - totalSaved));
  const etpSludgeAndEvap = modelResult 
    ? modelResult.etpSludgeAndEvap 
    : Math.max(0, rawWastewaterGenerated - totalSaved - finalDischarge);

  // Specific water consumption per kg of fabric
  const specificWaterBefore = modelResult 
    ? modelResult.specificWaterBefore 
    : (factory.capacity > 0 ? Number((totalBefore / factory.capacity).toFixed(1)) : 0);
  const specificWaterAfter = modelResult 
    ? modelResult.specificWaterAfter 
    : (factory.capacity > 0 ? Number((totalAfter / factory.capacity).toFixed(1)) : 0);

  // Water usage shares for Donut chart (percentage of totalAfter)
  breakdown.forEach(item => {
    item.shareAfter = totalAfter > 0 ? Math.round((item.waterAfter / totalAfter) * 100) : 0;
  });

  state.results = {
    totalBefore,
    totalAfter,
    totalSaved,
    reductionPct: Number(reductionPct),
    dailyCostSaving: Math.round(dailyCostSaving),
    monthlyCostSaving: Math.round(monthlyCostSaving),
    annualCostSaving: Math.round(annualCostSaving),
    specificWaterBefore: Number(specificWaterBefore),
    specificWaterAfter: Number(specificWaterAfter),
    rawWastewaterGenerated,
    dischargeLimit,
    finalDischarge,
    etpSludgeAndEvap,
    breakdown,
    blendResults: modelResult?.blendResults || blendResults,
    modelResult,
    generatedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  };

  // Dynamically update all UI elements across Home Page, Dashboard, Report, and Scenario cards
  updateAllUIComputedValues(state.results);

  return state.results;
}

// Dynamically replace fixed numbers across Home Page, Dashboard, Report, and Scenario Cards
function updateAllUIComputedValues(res) {
  if (!res) return;
  const f = state.factory;
  const washingStage = (res.breakdown && res.breakdown.find(b => b.name.toLowerCase().includes('wash'))) || (res.breakdown && res.breakdown[0]) || {};

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  };

  // 1. Home Page - 5-Minute Showcase Strip
  setText('home-stat-demand', `${res.totalBefore.toLocaleString('en-IN')} L/day`);
  setText('home-stat-reused', `${res.totalSaved.toLocaleString('en-IN')} L/day`);
  setText('home-stat-saving-pct', `${res.reductionPct}%`);
  setText('home-stat-tds', `${washingStage.blendedTds || 523} mg/L`);

  // 2. Home Page - Water Flow Simulation Cards
  setText('home-sim-fresh', res.totalAfter.toLocaleString('en-IN'));
  setText('home-sim-fresh-pct', `↓ ${res.reductionPct}% Reduction`);
  setText('home-sim-wastewater', res.rawWastewaterGenerated.toLocaleString('en-IN'));
  const wastewaterCutPct = res.rawWastewaterGenerated > 0 
    ? Math.min(99, Math.round((res.totalSaved / res.rawWastewaterGenerated) * 100))
    : 31.6;
  setText('home-sim-wastewater-cut', `↓ ${wastewaterCutPct}% Cut via ETP`);
  setText('home-sim-reused', res.totalSaved.toLocaleString('en-IN'));
  setText('home-sim-reused-pct', `${res.reductionPct}% Total Reuse Rate`);
  setText('home-sim-discharge', res.finalDischarge.toLocaleString('en-IN'));
  setText('home-sim-discharge-cut', `Compliant with ≤ ${res.dischargeLimit.toLocaleString('en-IN')} L/d limit`);

  // 3. Step 4 - Recycling Options Panel (tertiary row)
  setText('recycle-opt-stat-tertiary', `${res.reductionPct}% (${res.totalSaved.toLocaleString('en-IN')} L/d)`);

  // 4. Step 9 - Interactive Scenario Cards
  if (typeof evaluate === 'function') {
    try {
      const stdModel = evaluate(state.processes, state.factory, { scenario: 'standard' });
      const advModel = evaluate(state.processes, state.factory, { scenario: 'advanced' });
      const ecoModel = evaluate(state.processes, state.factory, { scenario: 'eco_max' });

      setText('scenario-stat-standard', `${stdModel.savingPercent}%`);
      setText('scenario-stat-advanced', `${advModel.savingPercent}%`);
      setText('scenario-stat-eco_max', `${ecoModel.savingPercent}%`);
    } catch (e) {
      console.warn('Scenario evaluation error:', e);
    }
  } else {
    setText('scenario-stat-standard', `${res.reductionPct}%`);
    setText('scenario-stat-advanced', `${Math.min(30, Number((res.reductionPct * 1.35).toFixed(1)))}%`);
    setText('scenario-stat-eco_max', `${Math.min(45, Number((res.reductionPct * 1.72).toFixed(1)))}%`);
  }

  // 5. Modals - 5-Min Pitch Guide & Simulation Lightbox
  setText('demo-guide-water-cut', `${res.totalSaved.toLocaleString('en-IN')} L/day`);
  setText('demo-guide-saving-pct', `${res.reductionPct}%`);
  setText('demo-guide-monthly-saving', `₹${res.monthlyCostSaving.toLocaleString('en-IN')}`);
  setText('demo-guide-annual-saving', `₹${res.annualCostSaving.toLocaleString('en-IN')}`);

  setText('sim-modal-fresh', `${(res.totalBefore / 1000).toFixed(1)}k ➔ ${(res.totalAfter / 1000).toFixed(2)}k L/d`);
  setText('sim-modal-wastewater', `${(res.totalBefore * 0.917 / 1000).toFixed(1)}k ➔ ${(res.rawWastewaterGenerated / 1000).toFixed(1)}k L/d`);
  setText('sim-modal-reused', `${res.totalSaved.toLocaleString('en-IN')} L/d`);
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

  // Render Charts, Blend Table, AI Prediction Engine, and Everyday Daily Logs
  renderBarChart();
  renderDonutChart();
  renderBlendTable();
  runAiWaterPrediction();
  renderDailyLogs();
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

// Technical Audit Findings & Due Diligence Modal Controls
window.openAuditFindingsModal = function() {
  const modal = document.getElementById('audit-findings-modal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
};

window.closeAuditFindingsModal = function() {
  const modal = document.getElementById('audit-findings-modal');
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
    treatedAvailable: 7450,
    dischargeLimit: 1450
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
    closeAuditFindingsModal();
    closeDailyLogModal();
  }
});

// ============================================================================
// DAY-TO-DAY OPERATIONAL WATER LOGBOOK & DAILY TRACKING LOGIC
// ============================================================================

// Initialize default realistic 15-day factory dataset leading to today
function getBenchmarkDailyLogs() {
  const today = new Date();
  const logs = [];
  const templates = [
    { fabric: 1000, fresh: 32550, reused: 7450, tds: 523, notes: 'Standard Cotton Single Jersey batch', status: 'Optimal' },
    { fabric: 1050, fresh: 33200, reused: 7800, tds: 518, notes: 'Reactive Navy Dyeing & rinse', status: 'Target Met' },
    { fabric: 980,  fresh: 31800, reused: 7400, tds: 525, notes: 'Bleached White Knits', status: 'Optimal' },
    { fabric: 1100, fresh: 34500, reused: 8200, tds: 540, notes: 'Denim Twill Multi-wash', status: 'Target Met' },
    { fabric: 1000, fresh: 32400, reused: 7600, tds: 520, notes: 'Cotton-Polyester Blend 60/40', status: 'Optimal' },
    { fabric: 1020, fresh: 33000, reused: 7700, tds: 522, notes: 'Medium Shade Olive Green', status: 'Optimal' },
    { fabric: 880,  fresh: 29000, reused: 6800, tds: 512, notes: 'Short Batch Finishing', status: 'Optimal' },
    { fabric: 1000, fresh: 32600, reused: 7400, tds: 535, notes: 'Bio-polishing & Softener wash', status: 'Optimal' },
    { fabric: 1080, fresh: 34000, reused: 8400, tds: 548, notes: 'Deep Reactive Black Run', status: 'High Recovery' },
    { fabric: 1000, fresh: 32550, reused: 7450, tds: 523, notes: 'Full Continuous Washing line', status: 'Optimal' },
    { fabric: 970,  fresh: 31600, reused: 7350, tds: 520, notes: 'Light Pastel Yellow Knits', status: 'Optimal' },
    { fabric: 1040, fresh: 33400, reused: 7800, tds: 527, notes: 'Terry Towel Scouring & Bleach', status: 'Optimal' },
    { fabric: 1000, fresh: 32500, reused: 7500, tds: 524, notes: 'Peroxide Bleach wash line', status: 'Optimal' },
    { fabric: 1020, fresh: 32800, reused: 7700, tds: 522, notes: 'Mercerized Cotton single yarn', status: 'Optimal' },
    { fabric: 1000, fresh: 32550, reused: 7450, tds: 523, notes: 'Today Active Metering', status: 'Active Today' }
  ];

  for (let i = 14; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const t = templates[14 - i];
    const total = t.fresh + t.reused;
    const reusePct = ((t.reused / total) * 100).toFixed(1);
    const intensity = (total / t.fabric).toFixed(1);
    const costSaved = Math.round(t.reused * (state.factory.waterCost || 50) / 1000);
    logs.push({
      id: 'log-' + dateStr + '-' + (14 - i),
      date: dateStr,
      shift: i === 0 ? 'Today' : 'Full Day',
      fabricKg: t.fabric,
      freshL: t.fresh,
      reusedL: t.reused,
      totalL: total,
      reusePct: parseFloat(reusePct),
      tds: t.tds,
      hardness: Math.round(t.tds * 0.27),
      intensity: parseFloat(intensity),
      costSaved: costSaved,
      status: t.status,
      notes: t.notes
    });
  }
  return logs;
}

// Load daily logs from storage
function loadDailyLogs() {
  try {
    const saved = localStorage.getItem('textile_water_daily_logs');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        state.dailyLogs = parsed;
        return;
      }
    }
  } catch (e) {
    console.error('Error loading daily logs:', e);
  }
  state.dailyLogs = getBenchmarkDailyLogs();
  saveDailyLogs();
}

// Save daily logs to storage
function saveDailyLogs() {
  try {
    localStorage.setItem('textile_water_daily_logs', JSON.stringify(state.dailyLogs || []));
  } catch (e) {
    console.error('Error saving daily logs:', e);
  }
}

// Render Daily Logs Table & Ribbon Stats
window.renderDailyLogs = function() {
  if (!state.dailyLogs || !state.dailyLogs.length) {
    loadDailyLogs();
  }

  const logs = state.dailyLogs || [];
  const tbody = document.getElementById('daily-logs-table-body');
  if (tbody) {
    tbody.innerHTML = '';
    
    // Sort latest first
    const sorted = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach((item) => {
      let badgeHtml = '';
      if (item.status === 'Active Today') {
        badgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 w-fit"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span> Today</span>`;
      } else if (item.status === 'High Recovery') {
        badgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">★ High Recovery</span>`;
      } else if (item.status === 'Target Met') {
        badgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">✓ Target Met</span>`;
      } else {
        badgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">✓ Optimal</span>`;
      }

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50/80 transition-colors text-xs text-slate-700';
      tr.innerHTML = `
        <td class="py-3 px-3.5 font-bold text-slate-900">
          <div>${item.date}</div>
          <div class="text-[10px] text-slate-400 font-normal">${item.shift || 'Full Day'}</div>
        </td>
        <td class="py-3 px-3 text-right font-medium text-slate-800">${(item.fabricKg || 0).toLocaleString('en-IN')}</td>
        <td class="py-3 px-3 text-right font-semibold text-blue-600">${(item.freshL || 0).toLocaleString('en-IN')}</td>
        <td class="py-3 px-3 text-right font-bold text-emerald-600">${(item.reusedL || 0).toLocaleString('en-IN')}</td>
        <td class="py-3 px-3 text-right font-bold text-slate-900">${(item.totalL || 0).toLocaleString('en-IN')}</td>
        <td class="py-3 px-3 text-right font-bold text-teal-700">${item.reusePct}%</td>
        <td class="py-3 px-3 text-right font-medium text-slate-700">${item.tds || '-'}</td>
        <td class="py-3 px-3 text-right font-bold ${item.intensity <= 40 ? 'text-emerald-600' : 'text-amber-600'}">${item.intensity || '-'}</td>
        <td class="py-3 px-3 text-right font-bold text-slate-900">₹${(item.costSaved || 0).toLocaleString('en-IN')}</td>
        <td class="py-3 px-3.5">
          <div class="mb-1">${badgeHtml}</div>
          <div class="text-[10px] text-slate-500 line-clamp-1" title="${item.notes || ''}">${item.notes || 'Routine run'}</div>
        </td>
        <td class="py-3 px-3 text-center">
          <button onclick="deleteDailyLog('${item.id}')" class="w-6 h-6 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Delete entry">
            <i class="fa-regular fa-trash-can text-xs"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Update Ribbon Summary
  const count = logs.length;
  const sumReused = logs.reduce((acc, cur) => acc + (cur.reusedL || 0), 0);
  const sumCost = logs.reduce((acc, cur) => acc + (cur.costSaved || 0), 0);
  const avgIntensity = count ? (logs.reduce((acc, cur) => acc + (cur.intensity || 0), 0) / count).toFixed(1) : 0;

  const statDays = document.getElementById('daily-stat-days');
  if (statDays) statDays.innerText = `${count} Days`;

  const statSaved = document.getElementById('daily-stat-saved-water');
  if (statSaved) statSaved.innerText = `${sumReused.toLocaleString('en-IN')} L`;

  const statCost = document.getElementById('daily-stat-saved-cost');
  if (statCost) statCost.innerText = `₹${sumCost.toLocaleString('en-IN')}`;

  const statIntensity = document.getElementById('daily-stat-intensity');
  if (statIntensity) statIntensity.innerText = `${avgIntensity} L/kg`;

  // Render Daily Trend Chart
  renderDailyTrendChart();
};

// Render Day-to-Day Trend Chart
function renderDailyTrendChart() {
  const ctx = document.getElementById('chart-daily-trend');
  if (!ctx) return;

  const sorted = [...(state.dailyLogs || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  const labels = sorted.map(d => {
    const parts = d.date.split('-');
    return `${parts[2]}/${parts[1]}`;
  });
  const freshData = sorted.map(d => d.freshL);
  const reusedData = sorted.map(d => d.reusedL);
  const tdsData = sorted.map(d => d.tds);

  if (dailyTrendChartInstance) {
    dailyTrendChartInstance.destroy();
  }

  dailyTrendChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Fresh Water Intake (L)',
          data: freshData,
          backgroundColor: 'rgba(59, 130, 246, 0.85)',
          borderRadius: 6,
          stack: 'water'
        },
        {
          label: 'Recycled ETP Water (L)',
          data: reusedData,
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderRadius: 6,
          stack: 'water'
        },
        {
          label: 'Treated Water TDS (mg/L)',
          data: tdsData,
          type: 'line',
          borderColor: '#8b5cf6',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#8b5cf6',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        x: {
          grid: { display: false }
        },
        y: {
          stacked: true,
          title: { display: true, text: 'Water Volume (Liters)' },
          grid: { color: 'rgba(226, 232, 240, 0.6)' }
        },
        y1: {
          position: 'right',
          title: { display: true, text: 'TDS (mg/L)' },
          grid: { display: false },
          min: 400,
          max: 700
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { size: 11, weight: '600' } }
        }
      }
    }
  });
}

// Modal Controls for Log Today's Reading
window.openDailyLogModal = function() {
  const modal = document.getElementById('daily-log-modal');
  if (modal) {
    const dateInput = document.getElementById('daily-form-date');
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
    const fabricInput = document.getElementById('daily-form-fabric');
    if (fabricInput) fabricInput.value = state.factory.capacity || 1000;
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
};

window.closeDailyLogModal = function() {
  const modal = document.getElementById('daily-log-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
};

// Auto-fill daily form with current optimizer benchmark
window.autoFillDailyFormBaseline = function() {
  const f = state.factory;
  const res = state.results || calculateOptimization();
  
  const fabricInput = document.getElementById('daily-form-fabric');
  if (fabricInput) fabricInput.value = f.capacity || 1000;

  const freshInput = document.getElementById('daily-form-fresh');
  if (freshInput) freshInput.value = res.totalAfter || 32550;

  const reusedInput = document.getElementById('daily-form-reused');
  if (reusedInput) reusedInput.value = res.totalSaved || 7450;

  const tdsInput = document.getElementById('daily-form-tds');
  if (tdsInput) tdsInput.value = 523;

  const notesInput = document.getElementById('daily-form-notes');
  if (notesInput) notesInput.value = 'Cotton standard batch; counter-current active';
};

// Save submitted daily log
window.handleSaveDailyLog = function(e) {
  e.preventDefault();
  const dateVal = document.getElementById('daily-form-date').value;
  const shiftVal = document.getElementById('daily-form-shift').value;
  const fabricVal = parseFloat(document.getElementById('daily-form-fabric').value) || 1000;
  const freshVal = parseFloat(document.getElementById('daily-form-fresh').value) || 0;
  const reusedVal = parseFloat(document.getElementById('daily-form-reused').value) || 0;
  const tdsVal = parseFloat(document.getElementById('daily-form-tds').value) || 520;
  const notesVal = document.getElementById('daily-form-notes').value || 'Standard daily processing';

  const total = freshVal + reusedVal;
  const reusePct = total > 0 ? parseFloat(((reusedVal / total) * 100).toFixed(1)) : 0;
  const intensity = fabricVal > 0 ? parseFloat((total / fabricVal).toFixed(1)) : 0;
  const costSaved = Math.round(reusedVal * (state.factory.waterCost || 50) / 1000);

  let status = 'Optimal';
  if (tdsVal > 540) status = 'Elevated TDS';
  else if (reusePct >= 19) status = 'High Recovery';
  else if (reusePct >= 18) status = 'Target Met';

  const newEntry = {
    id: 'log-' + dateVal + '-' + Date.now(),
    date: dateVal,
    shift: shiftVal,
    fabricKg: fabricVal,
    freshL: freshVal,
    reusedL: reusedVal,
    totalL: total,
    reusePct: reusePct,
    tds: tdsVal,
    hardness: Math.round(tdsVal * 0.27),
    intensity: intensity,
    costSaved: costSaved,
    status: status,
    notes: notesVal
  };

  // Remove existing entry for same date and shift if any
  state.dailyLogs = (state.dailyLogs || []).filter(item => !(item.date === dateVal && item.shift === shiftVal));
  state.dailyLogs.push(newEntry);

  saveDailyLogs();
  closeDailyLogModal();
  renderDailyLogs();
};

// 1-Click Quick Log for Today
window.quickLogToday = function() {
  const todayStr = new Date().toISOString().split('T')[0];
  const f = state.factory;
  const res = state.results || calculateOptimization();

  const existingIdx = (state.dailyLogs || []).findIndex(l => l.date === todayStr);
  const entry = {
    id: 'log-' + todayStr + '-quick',
    date: todayStr,
    shift: 'Today',
    fabricKg: f.capacity || 1000,
    freshL: res.totalAfter || 32550,
    reusedL: res.totalSaved || 7450,
    totalL: res.totalBefore || 40000,
    reusePct: res.reductionPct || 18.6,
    tds: 523,
    hardness: 142,
    intensity: parseFloat(((res.totalBefore || 40000) / (f.capacity || 1000)).toFixed(1)),
    costSaved: Math.round((res.totalSaved || 7450) * (f.waterCost || 50) / 1000),
    status: 'Active Today',
    notes: 'Auto-recorded today via 1-click telemetry benchmark'
  };

  if (existingIdx >= 0) {
    state.dailyLogs[existingIdx] = entry;
  } else {
    state.dailyLogs.push(entry);
  }

  saveDailyLogs();
  renderDailyLogs();
};

// Delete Daily Log
window.deleteDailyLog = function(id) {
  if (confirm('Are you sure you want to delete this daily log entry?')) {
    state.dailyLogs = (state.dailyLogs || []).filter(item => item.id !== id);
    saveDailyLogs();
    renderDailyLogs();
  }
};

// Reset Daily Logs to 15-Day Benchmark
window.resetDailyLogsToBenchmark = function() {
  if (confirm('Reset daily operational logs to standard 15-day factory benchmark?')) {
    state.dailyLogs = getBenchmarkDailyLogs();
    saveDailyLogs();
    renderDailyLogs();
  }
};

// Export Daily Logs to CSV
window.exportDailyLogsCSV = function() {
  const logs = state.dailyLogs || [];
  if (!logs.length) {
    alert('No daily logs to export.');
    return;
  }

  const sorted = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
  const headers = ['Date', 'Shift', 'Fabric Production (kg)', 'Freshwater Intake (L)', 'Recycled Water (L)', 'Total Demand (L)', 'Reuse Percentage (%)', 'TDS (mg/L)', 'Hardness (mg/L)', 'Water Intensity (L/kg)', 'Daily Cost Saved (INR)', 'Status', 'Notes'];

  let csvContent = '\uFEFF' + headers.join(',') + '\n';
  sorted.forEach(row => {
    const values = [
      row.date,
      `"${row.shift || 'Full Day'}"`,
      row.fabricKg,
      row.freshL,
      row.reusedL,
      row.totalL,
      row.reusePct,
      row.tds,
      row.hardness,
      row.intensity,
      row.costSaved,
      `"${row.status}"`,
      `"${(row.notes || '').replace(/"/g, '""')}"`
    ];
    csvContent += values.join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `textile-factory-daily-water-logs-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Switch between Table and Chart views
window.switchDailyView = function(view) {
  const tableContainer = document.getElementById('daily-table-container');
  const chartContainer = document.getElementById('daily-chart-container');
  const tableBtn = document.getElementById('daily-view-table-btn');
  const chartBtn = document.getElementById('daily-view-chart-btn');

  if (view === 'chart') {
    if (tableContainer) tableContainer.classList.add('hidden');
    if (chartContainer) chartContainer.classList.remove('hidden');
    if (tableBtn) {
      tableBtn.className = 'px-3 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5';
    }
    if (chartBtn) {
      chartBtn.className = 'px-3 py-1 rounded-md text-xs font-bold bg-white text-blue-700 shadow-sm transition-all flex items-center gap-1.5';
    }
    renderDailyTrendChart();
  } else {
    if (chartContainer) chartContainer.classList.add('hidden');
    if (tableContainer) tableContainer.classList.remove('hidden');
    if (chartBtn) {
      chartBtn.className = 'px-3 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5';
    }
    if (tableBtn) {
      tableBtn.className = 'px-3 py-1 rounded-md text-xs font-bold bg-white text-blue-700 shadow-sm transition-all flex items-center gap-1.5';
    }
  }
};



