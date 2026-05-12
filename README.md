# Next.JS With Firebase Boiler Plate

![image of app](/public/readme-img.png)

This repo is a sample [next.js](https://nextjs.org/) project with [Firebase](https://firebase.google.com/) integration. I used `yarn create next-app` to bootstrap the project and I did not remove any of the starter files. Feel free to follow along with the YouTube tutorial [here](TODO) and check out the live website hosted on [Vercel](https://vercel.com/) [here](TODO).


This repo contains the followng actions implemented:

- Authentication
  - popup auth flow
  - email + password
  - Google OAuth
  - Twitter OAuth
  - GitHub OAuth
- Cloud Firestore
  - read (examples for all availible data types)
  - write
- Storage
  - Uploade a file (video, image, etc)
- React Bootstrap
  - React Bootstrap installed with minimal styling

This is not meant to be a tutorial on how to use next.js or Firebase, but simply how to connect the two and perform common actions. As always, refer to the docs whenever you might have questions: 

- [next.js](https://nextjs.org/docs/getting-started)
- [Firebase](https://firebase.google.com/docs/build)

This is compatable with next.js v10+ and Firebase JavaScript v8+, which are currently the newest versions. May work with older versions.

## Google Sheets Exports

Cloud Functions now include exports to a Google Sheets workbook.

- Membership export:
  - Trigger: Pub/Sub topic `all-members`
  - Target tab: `Membership`
  - Behavior: append-only, once per month (month guard based on existing rows in sheet)
- Activity export:
  - Trigger: daily scheduler (`15 5 * * *`, Europe/London) via Pub/Sub topic `sheet-activity-exports`
  - Target tabs: `Rides` and `Signups`
  - Behavior: append-only, incremental by latest timestamp already present in each tab

### Required APP_SECRETS shape

`APP_SECRETS` must include:

```json
{
  "google": {
    "calendarId": "<existing-calendar-id>",
    "sheetId": "<google-sheet-id-placeholder>"
  }
}
```