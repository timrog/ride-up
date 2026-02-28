import admin from "firebase-admin"
import { defineSecret } from "firebase-functions/params"

admin.initializeApp()

export const appSecretsParam = defineSecret("APP_SECRETS")

export * from './mailerlite'
export * from './refreshMembers'
export * from './sendMembersToFirestore'
export * from './sendMembersToAuth'
export * from './processMemberPhoto'
export * from './scheduler'
export * from './copyEventsToCalendar'
export * from './aggregateNotifications'
export * from './sendEventNotifications'
export * from './sendActivityNotifications'
