# nself-tv Wiki Home

Welcome to the architecture and implementation wiki for `nself-tv`.

Project owner and maintainer: Aric Camarata ([github.com/acamarata](https://github.com/acamarata)).

This wiki is the canonical source for how to build and operate the nTV repository:

1. backend platform (`backend`)
2. multi-platform TV clients (`frontend`)
3. edge capture runtime (`backend/antbox`)
4. cloud command-center and ingest runtime (`backend/antserver`)
5. repository governance (`00-Repository-Structure-Policy.md`)

## Start Here

1. [Repository Structure Policy](00-Repository-Structure-Policy.md)
2. [TOC](TOC.md)
3. [Project Overview](01-Project-Overview.md)
4. [Monorepo Map](02-Monorepo-Map.md)
5. [Architecture Reference](03-Architecture-Reference.md)
6. [System Architecture: Control/Data Plane](15-System-Architecture-Control-Data-Plane.md)
7. [Hetzner Sizing Plan](16-Hetzner-Sizing-Plan.md)
8. [Roadmap and Backlog](13-Roadmap-Backlog.md)

## Architecture Constraints

1. Backend contracts are nSelf-first.
2. Production hosting defaults to Hetzner VPS + HOS.
3. AntBox runs on local edge NUC-class hardware.
4. AntServer runs on dedicated VPS command-center infrastructure.
5. Root-level repository structure is strict and validated in CI.

## Entry Points

1. Backend: `../backend/README.md`
2. Frontend: `../frontend/README.md`
3. AntBox: `../backend/antbox/README.md`
4. AntServer: `../backend/antserver/README.md`
5. Changelog: `CHANGELOG.md`
6. License Notes: `LICENSE.md`

---

## Project Resources

- [Changelog](CHANGELOG.md) — Version history and release notes
- [Contributing](14-Contributing.md) — How to contribute to this project
- [License](LICENSE.md) — Licensing terms and conditions
- [Roadmap and Backlog](13-Roadmap-Backlog.md) — Development roadmap and feature backlog
