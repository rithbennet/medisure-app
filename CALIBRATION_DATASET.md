# Calibration Dataset System

This document explains how to build and use the calibration dataset for improving approval probability accuracy (RS-6.2 Phase 2).

## Overview

The calibration dataset automatically captures prediction-outcome pairs when GL requests are approved or denied. This data is used to train a calibrated model that improves accuracy over the initial rules-based approach.

## How It Works

### 1. Automatic Data Collection

When a GL request status is updated to `approved` or `denied`, the system automatically:

- Captures the predicted probability (from rule evaluation)
- Records the actual outcome
- Stores context (signals, warnings, diagnosis, cost, etc.)
- Creates a calibration data point

**Example:**
```typescript
// When you update status, calibration data is automatically captured
await convex.mutation(api.glRequests.updateStatus, {
  glId: "gl123",
  status: "approved", // or "denied"
  outcomeNotes: "Optional notes about the decision"
});
```

### 2. Data Structure

Each calibration data point includes:

**Prediction Data:**
- `predictedProbability`: The approval probability from rule engine (0-1)
- `scoreBucket`: Risk bucket (Low/Medium/High)
- `signalCount`, `blockerCount`, `warningCount`, `missingItemCount`

**Actual Outcome:**
- `actualOutcome`: "approved" or "denied"
- `outcomeSetAt`: Timestamp when outcome was recorded

**Context:**
- Diagnosis, cost, encounter type, policy ID
- All features used in prediction

### 3. Querying the Dataset

#### Get All Calibration Data
```typescript
const dataset = await convex.query(api.glRequests.getCalibrationDataset, {
  minSamples: 100, // Optional: require minimum samples
  startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
  endDate: Date.now()
});
```

#### Get Statistics
```typescript
const stats = await convex.query(api.glRequests.getCalibrationStats, {});

// Returns:
// {
//   totalSamples: 150,
//   approved: 120,
//   denied: 30,
//   actualApprovalRate: 0.8,
//   averagePredictedProbability: 0.75,
//   calibrationError: 0.05, // Difference between predicted and actual
//   byBucket: { Low: {...}, Medium: {...}, High: {...} },
//   readyForTraining: true // true if >= 100 samples
// }
```

#### Export for Model Training
```typescript
const exportData = await convex.query(api.glRequests.exportCalibrationDataset, {});

// Returns array of objects ready for CSV export or ML training:
// [
//   {
//     predicted_probability: 0.85,
//     score_bucket: "Low",
//     signal_count: 1,
//     blocker_count: 0,
//     warning_count: 1,
//     missing_item_count: 0,
//     actual_outcome: "approved",
//     actual_approved: 1,
//     diagnosis: "Dengue fever",
//     estimated_cost: 5000,
//     ...
//   },
//   ...
// ]
```

## Building the Dataset

### Step 1: Collect Data

As you process GL requests:
1. Run rule evaluation (generates prediction)
2. Update status to `approved` or `denied` when outcome is known
3. System automatically captures calibration data

**Minimum Recommended:** 100 samples before training

### Step 2: Analyze Calibration

Check calibration statistics:
```typescript
const stats = await convex.query(api.glRequests.getCalibrationStats, {});

if (stats.calibrationError > 0.1) {
  console.log("High calibration error - model needs recalibration");
}
```

**Good Calibration:** `calibrationError < 0.05` (within 5%)

### Step 3: Export for Training

When you have enough data:
```typescript
const trainingData = await convex.query(api.glRequests.exportCalibrationDataset, {});

// Export to CSV or use directly for model training
// Features: predicted_probability, signal_count, blocker_count, etc.
// Target: actual_approved (0 or 1)
```

### Step 4: Train Calibration Model

Use the exported data to train a calibration model:

**Option A: Platt Scaling (Logistic Regression)**
- Simple, fast
- Good for small datasets (100-1000 samples)
- Maps predicted probabilities to calibrated probabilities

**Option B: Isotonic Regression**
- More flexible
- Better for larger datasets (1000+ samples)
- Non-parametric, can handle non-monotonic relationships

**Example (Python):**
```python
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression

# Load exported data
X = data[['predicted_probability', 'signal_count', 'blocker_count', ...]]
y = data['actual_approved']

# Train calibration model
calibrator = CalibratedClassifierCV(
    LogisticRegression(), 
    method='isotonic', 
    cv=5
)
calibrator.fit(X, y)

# Use calibrated predictions
calibrated_probs = calibrator.predict_proba(X)[:, 1]
```

### Step 5: Integrate Calibrated Model

Once trained, integrate the calibrated model into the rule engine:

1. Export calibration data periodically
2. Retrain calibration model
3. Update `calculateRiskScore` to use calibrated probabilities
4. Monitor calibration error over time

## Monitoring

### Key Metrics

1. **Calibration Error**: Difference between average predicted probability and actual approval rate
   - Target: < 0.05 (5%)
   
2. **Sample Size**: Number of prediction-outcome pairs
   - Minimum for training: 100
   - Recommended: 500+

3. **Distribution**: Ensure balanced outcomes
   - Both approved and denied cases
   - Coverage across risk buckets

### Regular Checks

```typescript
// Weekly calibration check
const stats = await convex.query(api.glRequests.getCalibrationStats, {});

if (stats.calibrationError > 0.1) {
  // Recalibrate model
  const data = await convex.query(api.glRequests.exportCalibrationDataset, {});
  // Train new calibration model
  // Update rule engine
}
```

## Best Practices

1. **Collect Consistently**: Update status for all GL requests with known outcomes
2. **Add Notes**: Use `outcomeNotes` to capture context (e.g., "Approved after appeal")
3. **Monitor Quality**: Review calibration stats regularly
4. **Retrain Periodically**: Update calibration model as more data becomes available
5. **A/B Testing**: Compare calibrated vs. uncalibrated predictions

## Next Steps

1. ✅ Schema updated with calibration data fields
2. ✅ Automatic data collection on status update
3. ✅ Queries for dataset export and statistics
4. ⏳ Collect 100+ samples
5. ⏳ Train calibration model
6. ⏳ Integrate calibrated predictions
7. ⏳ Monitor and iterate

## References

- RS-6.2 Phase 2: Data-driven calibration (businessRules.MD)
- [Scikit-learn Calibration](https://scikit-learn.org/stable/modules/calibration.html)
- [Platt Scaling](https://en.wikipedia.org/wiki/Platt_scaling)
- [Isotonic Regression](https://en.wikipedia.org/wiki/Isotonic_regression)

