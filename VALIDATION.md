# Validation

Current release audit (2026-10-10):

- Node 22.23.2: TypeScript check passed; 21 tests passed, including task-only data and rejection of saved Habit timers, completion isolation, rest-day filters, background deadline, pause and expiry notification state.
- Restored Today/Tasks/Insights/Account navigation (Habit feature removed, including subscriptions and editor): TypeScript check and Metro/Hermes Android export passed. The previous `configs.toReversed` failure is resolved under Node 22; use `nvm use` in each terminal.
- Notifee was replaced with maintained Expo Notifications; completion alerts, bundled sounds and the generated monochrome icon remain native.
- Target SDK is 36. Old storage/overlay permissions are blocked in app config.
- Emulator installation did not complete in the smoke-check session. Notification rendering, background countdown, permission denial and live task deletion still require device verification (see FEATURES.md).
- Firestore rules were updated locally but were not deployed or tested against a Firestore emulator.
- In-app account deletion removes current and legacy Firestore collections, local timer/sound data, and the Firebase Auth account after password reauthentication.
- Public privacy/deletion pages are prepared under `docs/`; support email replacement and hosting remain release blockers.
