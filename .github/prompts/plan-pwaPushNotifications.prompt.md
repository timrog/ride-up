## Plan: Implement PWA Push Notifications

Add comprehensive push notification system for ride events with user-configurable preferences, using Web Push API and Firebase Cloud Functions for delivery.

### Steps

1. **Create notification preferences page** (`app/notifications/page.tsx`) - Build UI with checkboxes for event tags (use `SelectableTags` component), toggles for "event updates", "new signups for events I'm leading", "comments on events I'm leading", "new signups for events I'm signed up to", "comments on events I'm signed up to" and save button that writes to `notifications/{userId}` in Firestore with structure: `{tags: string[], eventUpdates: boolean, newSignupsForLeader: boolean, newSignupsForAttendees: boolean, commentsForLeader: boolean, commentsForAttendees: boolean, subscription: PushSubscription}`. 

2. **Implement push notification subscription** - Create `app/pushNotifications.tsx` client component that requests notification permission, subscribes to push service using service worker `sw.js`, stores subscription in Firestore under user's notification settings, and provides `usePushNotifications()` hook for app-wide access.

3. **Detect current browser context and provide appropriate instructions**
  Do this within `app/pushNotifications.tsx`:
  - In desktop browsers, guide users to enable notifications via browser prompts.
  - In Android apps, prompt to add to home screen and guide users to enable notifications.
  - In iOS Safari when not running as PWA, provide instructions to add to home screen for notifications.
  - In iOS Safari when running as PWA, prompt to enable notifications via browser prompts.

4. **Build notification aggregation function** (`functions/src/aggregateNotifications.ts`) - Create Firestore trigger on `notifications/{userId}` that maintains `notifications/_aggregated` document with structure: `{[tag]: string[]}` for efficient lookup during event changes. Also update existing `events/{eventId}/activity/private` documents to reflect the changes - query these documents where the user id is in the `signups` map; filter those signups to where the date is in the future; update the `notificationSubscribers` array accordingly for those future signups to match the revised notification preferences.

5. **Store notification preferences with signups** - Update `addSignup()` in `app/serverActions.ts` to fetch user's notification settings and store subset `{userId, eventUpdates, newSignups}` in `events/{eventId}/activity/private` document `notificationSubscribers` array.

6. **Implement event notification triggers** (`functions/src/sendEventNotifications.ts`) - Create `onDocumentWritten` trigger for `events/{eventId}` that: detects new events and queries `_aggregated` doc for tag matches → sends "new event" notifications; detects updates and reads `notificationSubscribers` → sends "event updated" notifications; includes helper `sendPushNotification(subscription, payload)` using web-push package; detects cancellations and reads `notificationSubscribers` → sends "event cancelled" notifications;

7. **Add initial notificationSubscribers structure for new events** - Within the `functions/src/sendEventNotifications.ts` trigger, when a new event is created, or when the `createdBy` field changes, look up the creator's notification preferences from `notifications/{userId}` and initialize the `notificationSubscribers` array in the event's `activity/private` document with an entry for the creator, setting `eventUpdates`, `newSignups`, and `comments` based on their preferences.

8. **Implement signup notification trigger** (`functions/src/sendSignupNotifications.ts`) - Create Firestore trigger on `events/{eventId}/activity/private` that detects new signups in `signups` map, reads `notificationSubscribers` array, filters users with `newSignups: true`, and sends push notification with signup details (name, user count).

9. **Implement comment notification trigger** (`functions/src/sendSignupNotifications.ts`) - Within the same trigger, detect new comments in `comments` map, reads `notificationSubscribers` array, filters users with `newComments: true`, and sends push notification with signup details (name, user count).

10. **Update service worker** (`public/sw.js`) - Add `push` event listener that receives notification payload, displays notification with `self.registration.showNotification()`, includes `notificationclick` handler to open event page (`/events/{eventId}`), and caches notification icons.

11. **Configure web-push credentials** - Generate VAPID keys with `npx web-push generate-vapid-keys`, store as Firebase secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`), add public key to client-side subscription code.

