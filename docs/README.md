# P Profile — Documentation Index

This folder holds the architecture and product documentation for **P Profile**, a
**Product Identity Platform**. The Product Profile is the permanent digital identity
of a product across its entire lifecycle and across all actors (Consumer, Business,
Manufacturer, Service Center, Warranty Provider).

---

## ✅ Current source of truth

| Document | Purpose |
|----------|---------|
| [PRODUCT_PROFILE_DESIGN.md](PRODUCT_PROFILE_DESIGN.md) | **Current architectural source of truth.** Product Profile as the central object: entities, relationships, permission model, lifecycle, B2B/B2C flows, and Phase 1 / Phase 2 scope. **If any other document conflicts with this one, this document takes precedence.** |

---

## 📘 Reference documentation (current)

| Document | Purpose |
|----------|---------|
| [API_REFERENCE.md](API_REFERENCE.md) | All endpoints, bodies, permissions, error codes |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Tables, enums, relations, cascade behavior |
| [RBAC_MATRIX.md](RBAC_MATRIX.md) | Roles, permissions, endpoint guards |
| [USER_FLOWS.md](USER_FLOWS.md) | B2B / B2C / public flows, lifecycle |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Env vars, build, run, ops |
| [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) | Phase 1 boundaries (intentional + real) |

## 📊 Audit reports (current)

| Document | Purpose |
|----------|---------|
| [PHASE1_AUDIT.md](PHASE1_AUDIT.md) | Architecture / RBAC / security / DB audit + fixes |
| [PHASE1_GAP_ANALYSIS.md](PHASE1_GAP_ANALYSIS.md) | Design Phase 1 vs implemented, per actor |
| [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) | GA readiness assessment + checklist |
| [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) | Prioritized debt |
| [BUILD_REPORT.md](BUILD_REPORT.md) | Session build report (files, bugs, risks, next milestone) |

---

## 🗂️ Historical / superseded documents

Retained for historical context only. Each carries a **⚠️ SUPERSEDED** banner at the
top. Do not treat these as current; refer to `PRODUCT_PROFILE_DESIGN.md` instead.

| Document | Purpose |
|----------|---------|
| [PRODUCT_VISION.md](PRODUCT_VISION.md) | Historical vision evolution |
| [MODULE_MAP.md](MODULE_MAP.md) | Module breakdown |
| [PROJECT_STATE.md](PROJECT_STATE.md) | Historical project audit |
| [FEATURE_MATRIX.md](FEATURE_MATRIX.md) | Historical feature audit |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Historical architecture review |
| [NEXT_STEPS.md](NEXT_STEPS.md) | Historical roadmap notes |

---

*Start here: [PRODUCT_PROFILE_DESIGN.md](PRODUCT_PROFILE_DESIGN.md).*
