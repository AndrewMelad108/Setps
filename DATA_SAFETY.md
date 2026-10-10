# SYNQ — Google Play Data Safety draft

راجع هذه الإجابات داخل Play Console بعد وضع بريد الدعم ونشر سياسة الخصوصية. المسؤولية النهائية عن دقة النموذج على صاحب حساب Play Console.

## Security practices

- Data is encrypted in transit: **Yes**.
- Users can request data deletion: **Yes** — in app and through the public deletion page.
- Account creation: **Email and password**.
- Data sold: **No**.
- Data shared for advertising: **No**.

## Data collected for core functionality

| Play data type | Required? | Purpose |
|---|---:|---|
| Email address | Yes | Account management and authentication |
| User IDs | Yes | Account management and cloud synchronization |
| Other user-generated content | Yes | Tasks, appointments, sheets, rates, and work sessions; app functionality |

## Optional data when Analytics is enabled by the user

| Play data type | Required? | Purpose |
|---|---:|---|
| Approximate location | No | Analytics; derived by Firebase from masked IP |
| App interactions | No | Analytics |
| Device or other IDs | No | Analytics; Firebase app-instance ID |

Firebase Analytics is disabled by default in `firebase.json` and is enabled only after the in-app opt-in. Advertising ID collection and ad personalization signals are disabled, and Android advertising-ID permissions are removed from the final manifest. No task name or email is sent as a custom analytics event parameter.

## Not collected by SYNQ

- Contacts, SMS, call logs, photos, videos, precise location, health data, financial account/payment data, browsing history, microphone recordings.
- A custom sound chosen through Android's system picker remains in private local app storage.
- PDF/Excel reports remain local until the user explicitly selects a destination in the system share sheet.
