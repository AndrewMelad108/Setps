# Tasks

The product is branded **SYNQ** with a time-and-completion app icon. In addition to tasks, it includes work sheets, annual/day appointment lists, finish sounds, and PDF/Excel export.

## Work sheets and appointments

- A sheet has a title, inclusive date range, EGP/USD hourly rate, and selected tasks.
- Each task can have any number of timer or manual work sessions on the same day or across different days.
- Reports show task/session counts, measured hours and live value. PDF and Excel-compatible `.xls` files can be shared or saved with the native system share sheet.
- Appointments can be viewed for a selected day and for the selected date's full year, and can be edited or deleted.
- Stopping or finishing a timer saves its elapsed time without forcing the task to be marked complete. Manual time accepts any valid past/today date.

## Finish sounds

- Three bundled sounds, silent mode, and a device audio picker are available under Account.
- Bundled sounds are scheduled through `expo-notifications` when the app is backgrounded. A user-picked file plays while the app is active; Android falls back to its default sound for the background completion alert.
- Native sound resources are configured by the Expo plugin and the monochrome timer icon by `plugins/withTimerIcon.js`, so rebuild the native app after pulling this version.

The bottom navigation contains Today, Tasks, Sheets, Appointments, Insights and Account. Account includes the privacy policy, analytics consent, sign-out, and permanent account/data deletion.

- Create, edit, search, filter by completion, complete and undo tasks.
- Essential tasks repeat daily. Flexible tasks use selected days and offer deletion with confirmation. Rest-day tasks remain visible under All so they can still be edited or deleted.
- Every task has a duration and focus timer. Existing tasks without a duration default to 20 minutes until edited.
- Only task records are loaded. Stored Habit data is untouched in Firestore but is not shown, edited or counted by this app. Existing task timers are preserved; saved Habit timers are discarded.
- Android and iOS schedule a native completion alert with the task name and selected bundled sound. Android also shows a sticky timer-status notification synchronized with pause/resume. Expiry logs the work session but does not automatically mark the task complete.

- New task completions store their planned duration for statistics. Older completions without recorded minutes still count as completions but do not contribute guessed minutes.

## Setup

```bash
nvm use
npm run android
```

Deploy the updated task permissions and optional duration validation separately:

```bash
npx firebase-tools deploy --only firestore:rules
```

## Verification

Automated checks cover task identity, historical completion, default durations, essential-task classification, archive handling, rest-day filters, translations and notification timing.

On a device, verify task create/edit/complete/undo/delete with Firestore, account deletion, then start a one-minute timer, background the app, pause/resume and cancel. Check permission denial and expiry using Expo Notifications.
