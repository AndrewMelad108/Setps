# Tasks

The product is branded **SYNQ** with a time-and-completion app icon. In addition to tasks, it includes work sheets, recurring appointments with loud alerts, and PDF/Excel export.

## Work sheets and appointments

- A sheet has a title, inclusive date range, EGP/USD hourly rate, and selected tasks.
- Each task can have any number of timer or manual work sessions on the same day or across different days.
- Reports show task/session counts, measured hours and live value. PDF and Excel-compatible `.xls` files can be shared or saved with the native system share sheet.
- Appointments can be viewed for a selected day and for the selected date's full year, and can be edited or deleted.
- Stopping the stopwatch saves its elapsed time without forcing the task to be marked complete. Manual time accepts any valid past/today date, and every task exposes a history where individual entries can be deleted.

## Appointment sounds

- Three loud bundled appointment sounds can be selected and previewed in the appointment editor.
- Appointment alerts are scheduled through `expo-notifications`, with maximum-importance Android channels and strong vibration.
- Native sound resources are configured by the Expo plugin and the monochrome timer icon by `plugins/withTimerIcon.js`, so rebuild the native app after pulling this version.

The bottom navigation contains Today, Tasks, Sheets, Appointments and Account. Today contains the compact actions and statistics. Account includes the privacy policy, analytics consent, sign-out, and permanent account/data deletion.

- Create, edit, search, filter by completion, complete and undo tasks.
- Essential tasks repeat daily. Flexible tasks use selected days and offer deletion with confirmation. Rest-day tasks remain visible under All so they can still be edited or deleted.
- Task duration is calculated automatically from timer and manual work sessions; no duration is required when creating a task.
- Only task records are loaded. Stored Habit data is untouched in Firestore but is not shown, edited or counted by this app. Existing task timers are preserved; saved Habit timers are discarded.
- Android shows a sticky stopwatch-status notification synchronized with pause/resume. Stopping the stopwatch records the work session but does not automatically mark the task complete.

- Task completions and recorded work time remain separate; statistics use the actual recorded work sessions.

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
