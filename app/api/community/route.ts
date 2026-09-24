import { NextResponse } from "next/server"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const url = process.env.EMAIL_SEND_URL
  const apiKey = process.env.EMAIL_SEND_API_KEY

  if (!url || !apiKey) {
    return NextResponse.json({ error: "Contact service is not configured" }, { status: 500 })
  }

  try {
    const body = await request.json()
    const email = String(body?.email ?? "").trim().toLowerCase()
    const signedUpAt = body?.signedUpAt ? new Date(body.signedUpAt) : new Date()

    if (!EMAIL_RE.test(email) || Number.isNaN(signedUpAt.getTime())) {
      return NextResponse.json({ error: "Invalid signup details" }, { status: 400 })
    }

    const signedUpIso = signedUpAt.toISOString()

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "StudyFlow community",
        email,
        title: "StudyFlow community signup",
        content: `New StudyFlow community signup\n\nEmail: ${email}\nSigned up: ${signedUpIso}`,
        apiKey,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Contact service rejected the request" }, { status: response.status })
    }

    return NextResponse.json({ success: true, email, signedUpAt: signedUpIso })
  } catch (error) {
    console.log("Error sending community signup email", error)
    return NextResponse.json({ error: "Unable to send contact request" }, { status: 500 })
  }
}
