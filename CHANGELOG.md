# Changelog

All notable changes to this project are documented in this file.

## 2026-02-18

### Core startup and stability
- Reordered boot sequence to load `.env` before any environment usage.
- Wrapped startup in `bootstrap()` with top-level error handling.
- Ensured command/event loaders are awaited before `client.login()`.
- Added safer store usage by marking non-reactive discord.js objects with `markRaw` to avoid proxy/runtime issues.

### Loader and architecture improvements
- Reworked `src/core/loader.js` to support:
  - full reload (`all`)
  - scoped reload (`commands` / `events`)
  - single-module reload by folder name
  - sync flow for newly added command/event folders
- Added safer event rebinding logic to prevent duplicated listeners.
- Added autocomplete support backend helper for reload target names.
- Added environment validation for required bot vars (`TOKEN`, `APPLICATION_ID`).

### Slash commands added
- Added `/reload` command:
  - scope-based reload (`all`, `commands`, `events`)
  - optional folder-level reload
  - admin permission check
- Added `/sync` command:
  - scope-based sync scan
  - registers new command/event folders
  - admin permission check
- Added `/help` command:
  - ephemeral response
  - select-menu driven topic switch
  - migrated to embed-based help layout and improved Chinese content
- Added `/reactionrole` command with button-role flow:
  - `create`: create a panel message and add first role button
  - `bind`: bind more role buttons to existing message by message ID or message link
  - `once` mode toggle support
  - optional `style` for create (`embed` / `plain`)
  - mandatory `label` for both create/bind
- Added message context menu command:
  - `Bind Role Button` (right-click message -> Apps)
  - opens modal to bind role button quickly

### Interaction handling
- Extended `interactionCreate` pipeline to handle:
  - chat input commands
  - button interactions (role toggle)
  - autocomplete interactions (`/reload`)
  - string select menu interactions (`/help`)
  - modal submit interactions (context-menu role bind)
- Added robust interaction error replies using `MessageFlags.Ephemeral`.
- Replaced deprecated `ephemeral: true` with `flags: MessageFlags.Ephemeral`.

### Role button system (MEE6-like UX direction)
- Added `src/core/buttonRoles.js`:
  - persistent button-role mapping in `data/button-roles.json`
  - render/sync button rows to target messages
  - once-mode role exclusivity per message
  - ephemeral feedback on add/remove/switch
  - role switch message now states: from role A to role B
- Added `src/core/buttonRoleContext.js`:
  - context-menu modal driven bind flow
  - role ID / label / once parsing and validation
- Added startup sync on ready event to rehydrate button components on tracked messages.

### Message/reaction cleanup safety
- Added message delete guards:
  - `messageDelete` cleanup
  - `messageBulkDelete` cleanup
- Automatic removal of stale tracked entries when channel/message is unavailable.

### Legacy reaction-role support files
- Added and evolved `src/core/reactionRoles.js` and related migration logic during intermediate iterations.
- Kept runtime JSON stores under `data/` for persistence testing and local operation.

### Message content quality and UX
- Enhanced panel/help formatting using embeds for readability.
- Added text normalization so `\n` in command input can render as real newlines in created panel content.

### Event/message behavior updates
- Hardened `messageCreate` duplicate-processing guards and cooldown logic consistency.
- Introduced random food image response support for specific keyword trigger.

### Dependency/tooling updates
- Updated runtime dependencies and generated `package-lock.json`.
- Added compatibility improvements around event registration and runtime checks.

