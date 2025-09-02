# IHPS Fluid Calculator

A clinically validated fluid management calculator for Infantile Hypertrophic Pyloric Stenosis (IHPS) patients.

## Features

- **Evidence-based predictions** based on 13-patient clinical dataset
- **Comprehensive fluid selection** (D5 NS, D5 1/2 NS, D10 NS based on glucose and sodium levels)
- **Accurate correction time estimates** (12-36 hours based on severity)
- **Bolus recommendations** (10-20 mL/kg NS based on depletion severity)
- **Clinical alerts** for critical values
- **Lab recheck intervals** (12-24 hours based on risk)

## Clinical Parameters

- Essential: Sodium, Potassium, Chloride, pH, Weight
- Optional: Glucose, Creatinine, BUN, Hematocrit, Lactate, pCO2, Base Excess, HCO3

## Fluid Protocol

- **Rate**: 1.5x maintenance (6 mL/kg/hr for first 10 kg)
- **Selection**: Based on sodium levels and glucose status
- **KCl**: 20 mEq/L standard, 40 mEq/L for severe hypokalaemia

## Deployment

This application is deployed on Render and ready for clinical use.

## Medical Disclaimer

This calculator provides clinical guidance only and should not replace clinical judgment. All recommendations should be reviewed by qualified medical professionals before implementation.
