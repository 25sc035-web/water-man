# Textile Factory Water & Cost Optimization System

An engineering web application implementing the 9-stage **Textile Factory Water & Cost Optimization Workflow** for industrial wet-processing mills.

---

## Architecture & 9-Step Workflow Overview

| Step | Module | Functionality |
|---|---|---|
| **1** | **Home Page** | Project introduction, benefits, industry selection (Textile & Apparel), and quick CTA. |
| **2** | **Login / Sign Up** | Factory user authentication, session state management, and quick demo guest access. |
| **3** | **Factory Details Input** | Configuration of factory name, daily capacity (kg/day), operating days/month, water/electricity/chemical rates, and fabric type. |
| **4** | **Process-wise Data Input** | Dynamic input table for Fabric Preparation, Dyeing, Washing & Rinsing, Finishing, and Machine Cleaning. Custom processes can be added dynamically. |
| **5** | **Analysis & Optimization Engine** | Automated 6-step algorithmic solver identifying high-consumption streams, wastewater recycling opportunities, and running counter-current reduction algorithms. |
| **6** | **Results Dashboard** | Interactive KPI metrics (40,000 L/day $\to$ 32,550 L/day, 18.6% reduction, ₹9,685/mo saving) with Chart.js Before vs. After bar charts and pie charts. |
| **7** | **Recommendations** | Actionable engineering interventions with priority flags (e.g. low-liquor ratio dyeing, rinse water reuse, low-water finishing). |
| **8** | **Detailed Report** | Print-ready and PDF-exportable executive audit report with payback calculations, data tables, and mini charts. |
| **9** | **Further Actions** | Scenario simulator (Standard vs. Advanced Counter-Current vs. ZLD), target reduction slider, JSON project export, and anomaly alerts. |

---

## Mathematical Validation (Matching Diagram)

$$\text{Total Water Before} = 8,000 + 15,000 + 10,000 + 4,000 + 3,000 = \mathbf{40,000\text{ L/day}}$$

$$\text{Total Water Saved} = 1,200 + 2,250 + 3,000 + 400 + 600 = \mathbf{7,450\text{ L/day}}$$

$$\text{Total Water After} = 40,000 - 7,450 = \mathbf{32,550\text{ L/day}}$$

$$\text{Reduction Percentage} = \frac{7,450}{40,000} \times 100\% = \mathbf{18.625\% \approx 18.6\%}$$

$$\text{Cost per Liter} = \frac{₹50}{1,000\text{ L}} = ₹0.05/\text{L}$$

$$\text{Daily Water Cost Saved} = 7,450\text{ L} \times ₹0.05 = ₹372.50/\text{day}$$

$$\text{Monthly Cost Saved (26 working days)} = ₹372.50 \times 26 = \mathbf{₹9,685/\text{month}}$$

$$\text{Annual Cost Saved} = ₹9,685 \times 12 = \mathbf{₹1,16,220/\text{year}}$$

---

## How to Run

### Method 1: Instant Local Browser (No installation required)
Simply double-click or open [index.html](file:///C:/Users/Pranesh/.gemini/antigravity/scratch/textile-water-optimizer/index.html) in any modern browser (Chrome, Edge, Firefox).

### Method 2: Python Local Server
Run the included Python server:
```powershell
cd C:\Users\Pranesh\.gemini\antigravity\scratch\textile-water-optimizer
python server.py
```
Then visit **`http://localhost:5000`** in your browser.
