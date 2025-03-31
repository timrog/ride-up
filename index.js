import functions from '@google-cloud/functions-framework'
import { Firestore } from '@google-cloud/firestore'
const firestore = new Firestore()

functions.http('getUsers', async (req, res) => {

  const cookies = firestore.doc('mm_cookies/1')
  const cookie = await cookies.get()
  var cookieValue = cookies.exists ? cookie.data().value : null

  if (cookieValue) console.log("Found cookie value", cookieValue)

  const loginResponse = await fetch("https://membermojo.co.uk/vcgh/signin_password", {
    "body": `email=${encodeURI('timrog@googlemail.com')}&password=${encodeURI('@c7g.A<y.$adDc)p[DZg')}`,
    "method": "POST"
  })

  const newCookie = loginResponse.headers.entries
    .filter(([k]) => k.toLowerCase == 'set-cookie')
    .map(([k, v]) => v)
    .join('; ')

  console.log("new cookie", newCookie)

  const loginText = await loginResponse.text()
  const csrf_token = loginText.match(/"csrf_token":"([^"]+)/)[1]

  console.log("csrf token", csrf_token)

  var upstream = await fetch("https://membermojo.co.uk/vcgh/membership/download_members?", {
    "headers": {
      "cookie": newCookie
    },
    "body": null,
    "method": "GET"
  });

  res.send(await upstream.text())
})
