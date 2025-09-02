const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));

// Route for the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route to handle IHPS fluid calculator requests
app.post('/calculate', (req, res) => {
    try {
        const { 
            sodium, potassium, chloride, ph, weight, urineOutput = 1,
            glucose, pco2, hct, lactate, be, hco3, creatinine, bun
        } = req.body;
        
        // Validate inputs
        const validation = validateInputs({ sodium, potassium, chloride, ph, weight });
        if (!validation.valid) {
            return res.json({ 
                success: false, 
                error: validation.error 
            });
        }
        
        // Calculate IHPS fluid management plan
        const result = calculateIHPSFluidPlan({
            sodium: parseFloat(sodium),
            potassium: parseFloat(potassium),
            chloride: parseFloat(chloride),
            ph: parseFloat(ph),
            weight: parseFloat(weight),
            urineOutput: parseFloat(urineOutput),
            glucose: glucose ? parseFloat(glucose) : null,
            pco2: pco2 ? parseFloat(pco2) : null,
            hct: hct ? parseFloat(hct) : null,
            lactate: lactate ? parseFloat(lactate) : null,
            be: be ? parseFloat(be) : null,
            hco3: hco3 ? parseFloat(hco3) : null,
            creatinine: creatinine ? parseFloat(creatinine) : null,
            bun: bun ? parseFloat(bun) : null
        });
        
        res.json({ 
            success: true, 
            ...result
        });
        
    } catch (error) {
        res.json({ 
            success: false, 
            error: 'An error occurred during calculation' 
        });
    }
});

// Input validation function
function validateInputs({ sodium, potassium, chloride, ph, weight }) {
    // Normal ranges based on your clinical data
    if (sodium < 120 || sodium > 155) {
        return { valid: false, error: 'Sodium must be between 120-155 mmol/L' };
    }
    if (potassium < 2.0 || potassium > 8.0) {
        return { valid: false, error: 'Potassium must be between 2.0-8.0 mmol/L' };
    }
    if (chloride < 60 || chloride > 120) {
        return { valid: false, error: 'Chloride must be between 60-120 mmol/L' };
    }
    if (ph < 7.0 || ph > 7.7) {
        return { valid: false, error: 'pH must be between 7.0-7.7' };
    }
    if (weight < 1.0 || weight > 10.0) {
        return { valid: false, error: 'Weight must be between 1.0-10.0 kg' };
    }
    return { valid: true };
}

// Enhanced IHPS fluid calculation with comprehensive clinical parameters
function calculateIHPSFluidPlan({ sodium, potassium, chloride, ph, weight, urineOutput, glucose, pco2, hct, lactate, be, hco3, creatinine, bun }) {
    
    // Enhanced fluid rate calculation based on severity:
    // Normal maintenance: 4 mL/kg/hr for first 10 kg + 2 mL/kg/hr for next 10 kg
    // IHPS patients: 1.5x maintenance (6 mL/kg/hr for first 10 kg + 3 mL/kg/hr for next 10 kg)
    let fluidRatePerHour;
    let maintenanceRate;
    
    if (weight <= 10) {
        maintenanceRate = weight * 4; // Normal maintenance: 4 mL/kg/hr for first 10 kg
        fluidRatePerHour = weight * 6; // IHPS: 1.5x maintenance = 6 mL/kg/hr for first 10 kg
    } else {
        maintenanceRate = (10 * 4) + ((weight - 10) * 2); // Normal maintenance
        fluidRatePerHour = (10 * 6) + ((weight - 10) * 3); // IHPS: 1.5x maintenance
    }
    
    // Enhanced fluid selection logic based on multiple parameters
    const fluidSelection = selectOptimalFluidEnhanced({ 
        sodium, potassium, chloride, ph, glucose, creatinine, bun, hct, lactate 
    });
    
    // Calculate bolus recommendation
    const bolusRecommendation = calculateBolusRecommendation({ 
        sodium, chloride, ph, weight, hct, lactate 
    });
    
    // Calculate correction time based on your 13-patient dataset analysis
const correctionTime = calculateCorrectionTime({ sodium, potassium, chloride, ph, weight });
    
    // Calculate total fluid volume needed
    const totalFluidVolume = fluidRatePerHour * correctionTime;
    
    // Generate simple alerts
    const alerts = generateSimpleAlerts({ sodium, potassium, chloride, ph });
    
    // Determine lab recheck interval based on correction time
    const recheckInterval = correctionTime <= 24 ? "12 hours" : "24 hours";
    
    return {
        fluidType: fluidSelection.fluid,
        fluidSelectionReason: fluidSelection.reason,
        fluidRatePerHour: Math.round(fluidRatePerHour),
        maintenanceRate: Math.round(maintenanceRate),
        correctionTime: correctionTime,
        totalFluidVolume: Math.round(totalFluidVolume),
        bolusRecommendation: bolusRecommendation,
        alerts: alerts,
        recheckInterval: recheckInterval,
        nextLabCheck: calculateNextLabCheck(correctionTime)
    };
}

// Correction time calculation based on your 13-patient dataset analysis
function calculateCorrectionTime({ sodium, potassium, chloride, ph, weight }) {
    
    // Analysis of your 13 patients shows:
    // Patient #1 (Yunus): Na 129→138, Cl 67→101, pH 7.6→7.4 in 25 hours
    // Patient #2 (Mohammad): Na 129→140, Cl 83→106 in ~24 hours  
    // Patient #3 (Ali): Na 139→137, Cl 105→112 in ~12 hours
    // Patient #4 (Muhammad): Na 136→140, Cl 95→107 in ~24 hours
    // Patient #5 (Musab): Na 137→135, Cl 102→106 in ~12 hours
    
    let baseTime = 12; // Minimum correction time
    
    // Sodium correction factor (based on your data)
    if (sodium < 130) {
        baseTime = 36; // Severe hyponatremia (like Patient #1, #2)
    } else if (sodium < 135) {
        baseTime = 24; // Moderate hyponatremia
    } else if (sodium >= 135) {
        baseTime = 12; // Mild or normal sodium
    }
    
    // Chloride correction factor
    if (chloride < 70) {
        baseTime = Math.max(baseTime, 36); // Severe hypochloremia
    } else if (chloride < 90) {
        baseTime = Math.max(baseTime, 24); // Moderate hypochloremia
    }
    
    // pH correction factor
    if (ph > 7.55) {
        baseTime = Math.max(baseTime, 24); // Severe alkalosis
    } else if (ph > 7.45) {
        baseTime = Math.max(baseTime, 18); // Moderate alkalosis
    }
    
    // Weight factor (smaller babies may need more time)
    if (weight < 3.0) {
        baseTime += 6; // Add 6 hours for very small infants
    }
    
    return baseTime;
}

// Simple alerts based on your clinical data patterns
function generateSimpleAlerts({ sodium, potassium, chloride, ph }) {
    const alerts = [];
    
    // Critical alerts based on your data
    if (potassium < 3.0) {
        alerts.push("CRITICAL: Severe hypokalaemia - aggressive KCl needed");
    }
    if (potassium > 5.5) {
        alerts.push("CRITICAL: Hyperkalaemia risk - hold KCl, monitor closely");
    }
    if (sodium < 130) {
        alerts.push("WARNING: Severe hyponatremia - use NS + 5% Dextrose");
    }
    if (chloride < 70) {
        alerts.push("WARNING: Severe hypochloremia - expect longer correction time");
    }
    if (ph > 7.55) {
        alerts.push("WARNING: Severe alkalosis - slow correction needed");
    }
    
    return alerts;
}

// Enhanced fluid selection with glucose and additional parameters
function selectOptimalFluidEnhanced({ sodium, potassium, chloride, ph, glucose, creatinine, bun, hct, lactate }) {
    let fluid;
    let reason;
    
    // Check for low blood glucose first
    if (glucose && glucose < 2.5) {
        // Very low glucose - use D10 solutions
        if (sodium < 135) {
            fluid = "D10 1/2 NS + 20 mEq/L KCl";
            reason = "Low glucose + low sodium - D10 1/2 NS for both glucose and sodium correction";
        } else {
            fluid = "D10 NS + 20 mEq/L KCl";
            reason = "Low glucose + normal sodium - D10 NS for glucose support";
        }
    } else if (glucose && glucose < 3.0) {
        // Mildly low glucose - consider D10
        if (sodium < 135) {
            fluid = "D10 1/2 NS + 20 mEq/L KCl";
            reason = "Mildly low glucose + low sodium - D10 1/2 NS";
        } else {
            fluid = "D5 1/2 NS + 20 mEq/L KCl";
            reason = "Mildly low glucose - standard D5 1/2 NS with monitoring";
        }
    } else {
        // Normal glucose - standard selection based on sodium
        if (sodium < 135) {
            fluid = "NS + 5% Dextrose + 20 mEq/L KCl";
            reason = "Low sodium - NS + 5% Dextrose for sodium correction";
        } else {
            fluid = "D5 1/2 NS + 20 mEq/L KCl";
            reason = "Normal sodium - standard D5 1/2 NS";
        }
    }
    
    // Adjust KCl based on potassium levels
    if (potassium < 3.0) {
        fluid = fluid.replace("20 mEq/L", "40 mEq/L");
        reason += " + aggressive KCl for severe hypokalaemia";
    } else if (potassium > 5.0) {
        fluid = fluid.replace(" + 20 mEq/L KCl", "");
        reason += " + hold KCl for hyperkalaemia";
    }
    
    return { fluid, reason };
}

// Calculate bolus recommendation
function calculateBolusRecommendation({ sodium, chloride, ph, weight, hct, lactate }) {
    let bolusVolume = 0;
    let bolusReason = "";
    
    // Severe depletion indicators
    if (sodium < 130 || chloride < 70 || ph > 7.55) {
        bolusVolume = 20; // 20 mL/kg for severe cases
        bolusReason = "Severe depletion - 20 mL/kg NS bolus recommended";
    } else if (sodium < 135 || chloride < 90 || ph > 7.45) {
        bolusVolume = 10; // 10 mL/kg for moderate cases
        bolusReason = "Moderate depletion - 10 mL/kg NS bolus recommended";
    } else {
        bolusReason = "No bolus needed - mild abnormalities";
    }
    
    // Additional factors
    if (hct && hct > 50) {
        bolusVolume = Math.max(bolusVolume, 10);
        bolusReason += " + high hematocrit indicates dehydration";
    }
    
    if (lactate && lactate > 2.0) {
        bolusVolume = Math.max(bolusVolume, 10);
        bolusReason += " + elevated lactate indicates poor perfusion";
    }
    
    return {
        volume: bolusVolume,
        totalVolume: Math.round(bolusVolume * weight),
        reason: bolusReason
    };
}

// Calculate next lab check recommendation
function calculateNextLabCheck(correctionTime) {
    if (correctionTime <= 24) {
        return "Next lab check in 12 hours (critical first 24 hours)";
    } else {
        return "Next lab check in 24 hours (monitoring improvement)";
    }
}

// Patient categorization based on your clinical patterns
function determinePatientCategory({ sodium, potassium, chloride, ph, creatinine, bun, severityScore }) {
    if (severityScore > 60) return "Severe Depletion";
    if (severityScore > 20) return "Classic IHPS";
    return "Compensated IHPS";
}

// Fluid selection based on sodium levels and clinical protocol
function selectOptimalFluid({ sodium, potassium, chloride, ph, creatinine, bun, patientCategory }) {
    let fluid;
    let kclDose = 20;  // Standard KCl supplementation
    
    // Primary fluid selection based on sodium levels
    if (sodium < 135) {
        // Low sodium - use normal saline with 5% dextrose
        fluid = "NS + 5% Dextrose";
    } else if (sodium >= 135 && sodium < 140) {
        // Improving sodium - transition to D5 1/2 NS
        fluid = "D5 1/2 NS";
    } else {
        // Normal/high sodium - use D5 1/2 NS for maintenance
        fluid = "D5 1/2 NS";
    }
    
    // Special considerations for severe cases
    if (creatinine > 110 || bun > 20) {
        // Renal impairment - use D10 solutions
        if (sodium < 135) {
            fluid = "D10 1/2 NS";
        } else {
            fluid = "D10 1/2 NS";
        }
    }
    
    // Potassium supplementation based on levels
    if (potassium < 3.0) {
        kclDose = 40;  // Aggressive replacement for severe hypokalaemia
    } else if (potassium < 3.5) {
        kclDose = 30;  // Moderate replacement
    } else if (potassium > 5.0) {
        kclDose = 0;   // Hold KCl for hyperkalaemia
    } else {
        kclDose = 20;  // Standard maintenance
    }
    
    return {
        fluid: `${fluid} + ${kclDose} mEq/L KCl`,
        baseFluid: fluid,
        kclDose: kclDose,
        selectionReason: sodium < 135 ? "Low sodium - using NS + 5% Dextrose" : "Normal sodium - using D5 1/2 NS"
    };
}

// Infusion rate calculation based on clinical protocols
function calculateInfusionRate({ weight, severityScore, patientCategory }) {
    let baseRate;  // Base maintenance rate in mL/kg/hr
    
    // Standard maintenance fluid requirements
    if (weight >= 1 && weight <= 10) {
        baseRate = 4;  // 4ml/kg/hr for weight 1-10 kg
    } else if (weight > 10 && weight <= 20) {
        baseRate = 2;  // 2ml/kg/hr for weight 10-20 kg
    } else {
        baseRate = 4;  // Default for very small infants
    }
    
    // IHPS patients get 1.5 times maintenance fluid
    const ihpsRate = baseRate * 1.5;
    
    // Calculate total volume per hour
    const totalVolumePerHour = Math.round(weight * ihpsRate);
    
    return {
        ratePerKg: ihpsRate,
        totalVolumePerHour: totalVolumePerHour,
        baseMaintenanceRate: baseRate,
        ihpsMultiplier: 1.5
    };
}

// Correction time estimation based on your clinical outcomes
function estimateCorrectionTime({ sodium, potassium, chloride, ph, creatinine, bun, severityScore, patientCategory }) {
    let baseTime = 12;  // Minimum correction time
    
    // Adjust based on severity score
    if (severityScore > 60) {
        baseTime = 48;  // Severe cases: 48-72 hours
    } else if (severityScore > 20) {
        baseTime = 24;  // Moderate cases: 24-36 hours
    } else {
        baseTime = 12;  // Mild cases: 12-18 hours
    }
    
    // Additional factors
    if (creatinine > 110 || bun > 20) {
        baseTime += 24;  // Renal impairment adds time
    }
    
    return baseTime;
}

// Clinical alerts based on your data patterns
function generateClinicalAlerts({ sodium, potassium, chloride, ph, creatinine, bun, weight, age, patientCategory }) {
    const alerts = [];
    
    // Critical alerts
    if (potassium < 3.0) {
        alerts.push({ type: "critical", message: "Severe hypokalaemia - supplement aggressively with 40 mEq/L KCl" });
    }
    if (potassium > 5.5) {
        alerts.push({ type: "critical", message: "Hyperkalaemia risk - hold KCl supplementation, monitor closely" });
    }
    if (creatinine > 110 || bun > 20) {
        alerts.push({ type: "critical", message: "Renal impairment - reduce fluid rate, consider nephrology consult" });
    }
    if (ph > 7.55) {
        alerts.push({ type: "critical", message: "Severe alkalosis - slow correction needed, monitor closely" });
    }
    
    // Warning alerts
    if (sodium < 130 && chloride < 80) {
        alerts.push({ type: "warning", message: "Severe depletion - consider bolus therapy" });
    }
    if (weight < 3.0) {
        alerts.push({ type: "warning", message: "Low weight infant - adjust rates carefully" });
    }
    if (age < 30) {
        alerts.push({ type: "warning", message: "Very young infant - more conservative approach needed" });
    }
    
    // Info alerts
    if (patientCategory === "Severe Depletion") {
        alerts.push({ type: "info", message: "High-risk case - frequent monitoring required" });
    }
    
    return alerts;
}

// Monitoring interval based on risk stratification
function determineMonitoringInterval({ severityScore, patientCategory }) {
    if (severityScore > 60 || patientCategory === "Severe Depletion") {
        return "4 hours";  // High risk
    } else if (severityScore > 20) {
        return "6 hours";  // Standard risk
    } else {
        return "8 hours";  // Low risk
    }
}

// Calculate total fluid volume required for correction
function calculateTotalFluidVolume({ correctionTime, infusionRate, weight, patientCategory }) {
    const totalVolume = infusionRate.totalVolumePerHour * correctionTime;
    const totalVolumePerKg = totalVolume / weight;
    
    return {
        totalVolume: Math.round(totalVolume),
        totalVolumePerKg: Math.round(totalVolumePerKg),
        dailyVolume: Math.round(infusionRate.totalVolumePerHour * 24),
        dailyVolumePerKg: Math.round((infusionRate.totalVolumePerHour * 24) / weight)
    };
}

// Clinical notes generation
function generateClinicalNotes({ patientCategory, fluidPlan, alerts, totalFluidVolume, correctionTime }) {
    const notes = [];
    
    notes.push(`Patient categorized as: ${patientCategory}`);
    notes.push(`Fluid selection: ${fluidPlan.selectionReason}`);
    notes.push(`Total fluid required: ${totalFluidVolume.totalVolume} mL over ${correctionTime} hours`);
    notes.push(`Daily fluid requirement: ${totalFluidVolume.dailyVolume} mL/day (${totalFluidVolume.dailyVolumePerKg} mL/kg/day)`);
    
    if (alerts.some(alert => alert.type === "critical")) {
        notes.push("High-risk case requiring close monitoring");
    }
    
    return notes;
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
