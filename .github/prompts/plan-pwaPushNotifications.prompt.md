## Plan: Implement PWA Push Notifications

Add comprehensive push notification system for ride events with user-configurable preferences, using Firebase Cloud Messaging (FCM) and Firebase Cloud Functions for delivery.

### Steps

1. **Create notification preferences page** (`app/notifications/page.tsx`) - Build UI with checkboxes for event tags (use `SelectableTags` component), toggles for "event updates", "activity on events I'm leading". "activity on events I'm signed up to" and save button that writes to `notifications/{userId}` in Firestore with structure: `{tags: string[], eventUpdates: boolean, activityForLeader: boolean, activityForSignups: boolean, token: string}`. 

2. **Detect current browser context and provide appropriate instructions**
  Do this within `app/notifications/page.tsx`:
  - In desktop browsers, guide users to enable notifications via browser prompts.
  - In Android apps, prompt to add to home screen and guide users to enable notifications.
  - In iOS Safari when not running as PWA, provide instructions to add to home screen for notifications.
  - In iOS Safari when running as PWA, prompt to enable notifications via browser prompts.

3. **Build notification aggregation function** (`functions/src/aggregateNotifications.ts`) - Create Firestore trigger on `notifications/{userId}` that maintains `notifications/_aggregated` document with structure: `{[tag]: string[]}` for efficient lookup during event changes. 

4. **Update existing signups** (`functions/src/aggregateNotifications.ts`) - Update existing `events/{eventId}/activity/private` documents to reflect the changes to users' notification settings, if any have changed. Query the documents where the user id is in the `signups` map; filter those signups to where the date is in the future; update the `notificationSubscribers` array accordingly for those future signups to match the revised notification preferences. Query for events where `createdBy` is the user id; filter those to where the created date is in the future; update the `notificationSubscribers` array on the associated `events/{eventId}/activity/private` document accordingly for those future events to match the revised `activityForLeader` preferences.

5. **Store notification preferences with signups** - Update `addSignup()` in `app/serverActions.ts` to fetch user's notification settings from `notifications/{userId}`. If notifications are enabled (`token` exists), add user to `events/{eventId}/activity/private` document `notificationSubscribers` array with `{userId, eventUpdates, activity}` where `activity` is populated from `activityForSignups` field in their preferences.

6. **Implement event notification triggers** (`functions/src/sendEventNotifications.ts`) - Create `onDocumentWritten` trigger for `events/{eventId}` that: detects new events and queries `_aggregated` doc for tag matches → sends "new event" notifications to all users subscribed to those tags; detects updates and reads `notificationSubscribers` → sends "event updated" notifications to ALL users in the array (they are only in the array if their settings allow); includes helper `sendFCMNotification(tokens, payload)` using Firebase Admin SDK `messaging().sendEachForMulticast()`; detects cancellations and reads `notificationSubscribers` → sends "event cancelled" notifications to ALL users in the array; detects changes of `createdBy` field → sends "You are now leading this event" notification to new leader (regardless of settings). 

7. **Add initial notificationSubscribers structure for new events** - Within the `functions/src/sendEventNotifications.ts` trigger, when a new event is created, or when the `createdBy` field changes, look up the creator's notification preferences from `notifications/{userId}`. If notifications are enabled (`token` exists), initialize the `notificationSubscribers` array in the event's `activity/private` document with an entry for the creator `{userId, eventUpdates, activity}` where `eventUpdates` and `activity` are populated from their `eventUpdates` and `activityForLeader` preferences respectively.

8. **Implement activity notification trigger** (`functions/src/sendSignupNotifications.ts`) - Create Firestore trigger on `events/{eventId}/activity/private` that detects new signups in `signups` map or new comments in the `comments` array, reads `notificationSubscribers` array, filters users with `activity: true` (this denormalized field was populated from either `activityForLeader` or `activityForSignups` when the user was added to the array), fetches FCM tokens from `notifications/{userId}`, and sends push notification using Firebase Admin SDK `messaging().sendEachForMulticast()` with signup details (name, user count), or comment details (commenter name, excerpt). The url attached to the notification should link directly to the event page.
