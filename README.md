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

The proposed stack is Go, Wails, React/TypeScript, CodeMirror 6, `pgx`, and the
official MongoDB Go driver. Kafka and HTTP integrations are future extensions.
