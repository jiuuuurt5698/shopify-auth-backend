/**
 * API Newsletter - Aloha CBD
 * Endpoint pour inscription newsletter via Resend
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID

export default async function handler(req, res) {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")

    // Handle preflight
    if (req.method === "OPTIONS") {
        return res.status(200).end()
    }

    // Only POST
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" })
    }

    // Check API key
    if (!RESEND_API_KEY) {
        console.error("RESEND_API_KEY not configured")
        return res.status(500).json({ error: "Server configuration error" })
    }

    try {
        const { email, audienceId } = req.body

        // Validation email
        if (!email || !isValidEmail(email)) {
            return res.status(400).json({ error: "Invalid email address" })
        }

        const targetAudienceId = audienceId || RESEND_AUDIENCE_ID

        if (!targetAudienceId) {
            console.error("No audience ID provided")
            return res.status(500).json({ error: "Audience not configured" })
        }

        // Ajouter le contact à l'audience Resend
        const response = await fetch(
            `https://api.resend.com/audiences/${targetAudienceId}/contacts`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    unsubscribed: false,
                }),
            }
        )

        const data = await response.json()

        if (!response.ok) {
            // Si le contact existe déjà, c'est pas grave
            if (data.name === "validation_error" && data.message?.includes("already exists")) {
                return res.status(200).json({
                    success: true,
                    message: "Already subscribed",
                    alreadyExists: true,
                })
            }

            console.error("Resend API error:", data)
            return res.status(response.status).json({
                error: data.message || "Failed to subscribe",
            })
        }

        // Succès
        console.log(`New subscriber: ${email}`)

        return res.status(200).json({
            success: true,
            message: "Successfully subscribed",
            contactId: data.id,
        })

    } catch (error) {
        console.error("Newsletter API error:", error)
        return res.status(500).json({ error: "Internal server error" })
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
