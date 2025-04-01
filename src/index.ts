import { HttpFunction } from '@google-cloud/functions-framework';
import { Firestore } from '@google-cloud/firestore';
import FormData from 'form-data';
import makeFetchCookie from 'fetch-cookie'
const firestore = new Firestore()
const fetchCookie = makeFetchCookie(fetch)

const mm_email = process.env.SECRET_MM_USERNAME
const mm_password = process.env.SECRET_MM_PASSWORD

export const getUsers: HttpFunction = async (req, res) => {

  const cookies = firestore.doc('mm_cookies/1')
  const cookieDoc = await cookies.get()
  var cookie = cookieDoc.get('value')

  if (cookie) console.log("Found cookie value", cookie)
  const formData = new FormData();
  formData.append("email", mm_email)
  formData.append("password", mm_password)

  const loginResponse = await fetchCookie("https://membermojo.co.uk/vcgh/signin_password", {
    body: formData,
    method: "POST",
    headers: {
      cookie
    }
  })

  console.log("login response", loginResponse.status, loginResponse.text())

  const newCookie = loginResponse.headers.getSetCookie()
    .map(x => x.split(';')[0])
    .join('; ')

  console.log("new cookie", newCookie)
  if (newCookie.length) await cookies.set({ value: newCookie });

  //const loginText = await loginResponse.text()
  //const csrf_token = loginText.match(/"csrf_token":"([^"]+)/)[1]
  //console.log("csrf token", csrf_token)

  var upstream = await fetchCookie("https://membermojo.co.uk/vcgh/membership/download_members?", {
    "headers": {
      "cookie": newCookie
    },
    "method": "GET"
  });

  res.send(await upstream.text());
}
