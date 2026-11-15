# EyeHand (cc68) — Testing Guide

## 1. Unit Testing Strategy
All core math, filtering algorithms, coordinate transforms, and event dispatch mechanisms are verified via **Vitest**.

### Running Tests
```bash
# Run test suite once
pnpm test

# Run test suite in watch mode
pnpm test:watch
```

---

## 2. Jitter Reduction Benchmarks
The `OneEuroFilter` unit test verifies that when subjected to stationary high-frequency simulated micro-tremors ($\pm 6\text{px}$ at $60\text{Hz}$), the output standard deviation is reduced by $>60\%$ while settling within $160\text{ms}$ during rapid saccades.

---

## 3. Headless Simulation
Tests do not require physical camera access. All tests utilize mathematical point streams or synthetic mock landmarks from `@cc68/core`.
