# Data Viewer

A planned desktop workspace for browsing PostgreSQL and MongoDB, built as a
personal project to learn Go.

The first release, `0.0.1`, targets December 31, 2026. It will focus on connecting
to databases, browsing their structure, retrieving data, and basic autocomplete.
The repository currently contains planning documentation; no application or
installation workflow has been implemented yet.

## Implementation documentation

- [Release plan and weekly milestones](docs/release-0.0.1-plan.md)
- [Architecture and feature design](docs/architecture.md)
- [Beginner implementation guide](docs/implementation-guide.md)
- [Feature inventory and ownership](docs/features.md)
- [Integration plugin design](docs/plugin-design.md)
- [UI/UX guide and wireframes](docs/ui-ux-guide.md)
- [UI research, sources, and design decisions](docs/ui-research.md)
- [Interactive UI prototype](docs/ui-prototype.html) — open locally in a browser;
  searchable integration setup, Kafka Consume/Publish, and HTTP future workspaces; fictional data
  only, no application backend
- [Backend/frontend handoff](docs/frontend-handoff.md)
- [Codex PR review guide](docs/pr-review-guide.md)
- [Repository context for AI reviewers](AGENTS.md)

The developer's main learning focus is implementing the Go backend. Frontend
work can proceed separately using the UI specification and agreed response
fixtures. The prototype is a design aid and does not implement release features.

The proposed stack is Go, Wails, React/TypeScript, CodeMirror 6, `pgx`, and the
official MongoDB Go driver. Kafka and HTTP integrations are future extensions.
