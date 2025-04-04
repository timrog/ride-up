import { HttpFunction } from '@google-cloud/functions-framework';
import { Firestore } from '@google-cloud/firestore';
import makeFetchCookie from 'fetch-cookie'
const firestore = new Firestore()

const isLocal = process.env.LOCAL

const mm_email = process.env.SECRET_MM_USERNAME
if (!mm_email) throw new Error("SECRET_MM_USERNAME not set")

const mm_password = process.env.SECRET_MM_PASSWORD
if (!mm_password) throw new Error("SECRET_MM_PASSWORD not set")

let localData: { [key: string]: string } = { value: '' };

function getCookieDoc() {
  if (isLocal) {
    return {
      async get() { return { get: (key: string) => localData[key] } },
      async set(value: any) { localData = { ...localData, ...value }; console.log("Cookie Jar", localData) }
    }
  }

  return firestore.doc('mm_cookies/1')
}


export const getUsers: HttpFunction = async (req, res) => {
  console.log("Request received", req.path, req.body)
  const fetchCookie = makeFetchCookie(fetch)
  const cookieDoc = getCookieDoc()
  const cookieDocSnapshot = await cookieDoc.get()
  const cookieValue = cookieDocSnapshot.get('value')
  if (cookieValue) {
    await fetchCookie.cookieJar.setCookie(cookieValue, "https://membermojo.co.uk", { ignoreError: false })
  }

  async function extractToken(text: string) {
    const match = text.match(/"csrf_token":"([^"]+)/)
    if (!match?.length) return null
    const csrf = match[1]
    await cookieDoc.set({ csrf })
    return csrf
  }

  async function validateCsrfToken(url: string, csrf: string) {
    console.log("CSRF", csrf)
    const response = await fetchCookie(url, {
      method: "POST",
      body: `csrf_token=${encodeURIComponent(csrf)}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    })
    console.log("validate response", response.status, response.url)
    return response
  }

  let upstream: Response
  let upstreamBody: string
  const validationLink = req.query['validate']
  if (validationLink) {
    const doc = await cookieDoc.get()
    const csrf = doc.get('csrf')
    upstream = await validateCsrfToken(validationLink.toString(), csrf)
    upstreamBody = await upstream.text()
  }
  else {
    upstream = await fetchCookie("https://membermojo.co.uk/vcgh/membership/download_members")
    upstreamBody = await upstream.text()
    console.log("download response", upstream.status, upstream.url)
    var csrf = await extractToken(upstreamBody)
    if (csrf) {
      upstream = await fetchCookie("https://membermojo.co.uk/vcgh/signin_password", {
        body: `email=${encodeURIComponent(mm_email)}&password=${encodeURIComponent(mm_password)}&csrf_token=${encodeURIComponent(csrf)}`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        method: "POST"
      })
      upstreamBody = await upstream.text()
      console.log("login response", upstream.status, upstream.url)
    }
  }

  if (upstream.url.includes("signin_verification_sent")) {
    await extractToken(upstreamBody)
    res.status(401).send("Verification sent")
  }
  else if (upstream.url.includes("download_members")) {
    res.send(upstreamBody)
  }
  else {
    console.error("Unexpected response", upstream.status, upstream.url)
    res.status(400).end()
  }

  const cookieString = await fetchCookie.cookieJar.getCookieString("https://membermojo.co.uk")
  await cookieDoc.set({ value: cookieString })
}
