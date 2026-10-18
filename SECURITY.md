# Security policy

Please report vulnerabilities privately through GitHub's
[private vulnerability reporting](https://github.com/assemblyline-sh/al-orc/security/advisories/new),
not in a public issue.

al-orc talks to the Assembly Line Orchestrator API with an API key and secret. The CLI stores
them in `~/.assemblyline/al-orc/config.yml`; the client takes them as arguments. They are sent only to
the Orchestrator URL you configure.

If you think an API key was exposed, revoke it in the Orchestrator and issue a new one.
