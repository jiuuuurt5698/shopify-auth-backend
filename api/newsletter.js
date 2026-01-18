/**
 * API Newsletter - Aloha CBD
 * Endpoint pour inscription newsletter via Resend
 * + Email de bienvenue automatique
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
        const cleanEmail = email.toLowerCase().trim()

        if (!targetAudienceId) {
            console.error("No audience ID provided")
            return res.status(500).json({ error: "Audience not configured" })
        }

        // Ajouter le contact à l'audience Resend
        const contactResponse = await fetch(
            `https://api.resend.com/audiences/${targetAudienceId}/contacts`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: cleanEmail,
                    unsubscribed: false,
                }),
            }
        )

        const contactData = await contactResponse.json()

        // Si le contact existe déjà, on n'envoie pas de mail
        if (!contactResponse.ok) {
            if (contactData.name === "validation_error" && contactData.message?.includes("already exists")) {
                return res.status(200).json({
                    success: true,
                    message: "Already subscribed",
                    alreadyExists: true,
                })
            }

            console.error("Resend API error:", contactData)
            return res.status(contactResponse.status).json({
                error: contactData.message || "Failed to subscribe",
            })
        }

        // Envoyer l'email de bienvenue
        const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: "ALOHA CBD <hello@noreply.aloha-cbd.fr>",
                to: cleanEmail,
                subject: "Bienvenue dans l'ohana - Ton code -10%",
                html: getWelcomeEmailHTML(),
            }),
        })

        const emailData = await emailResponse.json()

        if (!emailResponse.ok) {
            console.error("Email send error:", emailData)
            // On ne fail pas la requête, le contact est déjà ajouté
        }

        // Succès
        console.log(`New subscriber: ${cleanEmail}`)

        return res.status(200).json({
            success: true,
            message: "Successfully subscribed",
            contactId: contactData.id,
            emailSent: emailResponse.ok,
        })

    } catch (error) {
        console.error("Newsletter API error:", error)
        return res.status(500).json({ error: "Internal server error" })
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getWelcomeEmailHTML() {
    const currentYear = new Date().getFullYear()
    
    return `
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&display=swap');
    
    :root {
      color-scheme: light only !important;
      supported-color-schemes: light !important;
    }
    
    @media (prefers-color-scheme: dark) {
      .email-container { background-color: #FAF9F9 !important; }
      .email-card { background-color: #FAF9F9 !important; }
      .header-section { background: linear-gradient(135deg, #BC6170 0%, #9d5260 100%) !important; }
      .content-section { background-color: #FAF9F9 !important; color: #22192E !important; }
      .footer-section { background-color: #EFEDEE !important; }
      .text-dark { color: #22192E !important; }
      .text-gray { color: #4a5568 !important; }
      .text-light-gray { color: #718096 !important; }
    }
  </style>
</head>
<body style="margin: 0 !important; padding: 0 !important; font-family: 'Archivo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important; background-color: #FAF9F9 !important; color-scheme: light only !important;">
  <table role="presentation" class="email-container" style="width: 100% !important; border-collapse: collapse !important; background-color: #FAF9F9 !important;">
    <tr>
      <td align="center" style="padding: 40px 20px !important;">
        <table role="presentation" class="email-card" style="max-width: 600px !important; width: 100% !important; border-collapse: collapse !important; background: #FAF9F9 !important; border-radius: 24px !important; overflow: hidden !important; box-shadow: 0 10px 40px rgba(34, 25, 46, 0.12) !important;">
          
          <!-- HEADER AVEC SMILEY -->
          <tr>
            <td class="header-section" style="background: linear-gradient(135deg, #BC6170 0%, #9d5260 100%) !important; padding: 24px 40px !important; text-align: center !important;">
              <img src="https://xdkdxtrlldghcwymbttt.supabase.co/storage/v1/object/public/email-assets/SMILEY%202.png" alt="Aloha" style="width: 140px !important; height: 140px !important; margin: 0 auto 12px !important; display: block !important;" />
              <h2 style="margin: 0 0 6px 0 !important; color: #FAF9F9 !important; font-size: 28px !important; font-weight: 700 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">Bienvenue dans l'ohana</h2>
              <p style="margin: 0 !important; color: #FAF9F9 !important; opacity: 0.85 !important; font-size: 16px !important; font-family: 'Archivo', -apple-system, sans-serif !important;">Tu fais maintenant partie de la famille</p>
            </td>
          </tr>

          <!-- CONTENU PRINCIPAL -->
          <tr>
            <td class="content-section" style="padding: 48px 40px 24px 40px !important; background-color: #FAF9F9 !important;">
              <p class="text-dark" style="margin: 0 0 20px 0 !important; color: #22192E !important; font-size: 17px !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                Salut,
              </p>
              <p class="text-gray" style="margin: 0 0 24px 0 !important; color: #4a5568 !important; font-size: 16px !important; line-height: 1.6 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                Merci de nous rejoindre. Chaque semaine, tu recevras ta <strong style="color: #BC6170 !important;">météo du chill</strong> : des promos exclusives et une dose de bonnes nouvelles pour garder le smile.
              </p>
              <p class="text-gray" style="margin: 0 0 24px 0 !important; color: #4a5568 !important; font-size: 16px !important; line-height: 1.6 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                Pour te souhaiter la bienvenue, voici un petit cadeau :
              </p>
            </td>
          </tr>

          <!-- CARTE CODE PROMO -->
          <tr>
            <td style="padding: 0 24px 24px 24px !important; background-color: #FAF9F9 !important;">
              <table role="presentation" style="width: 100% !important; background: #22192E !important; border-radius: 16px !important;">
                <tr>
                  <td style="padding: 32px 24px !important; text-align: center !important;">
                    <p style="margin: 0 0 16px 0 !important; color: #FAF9F9 !important; font-size: 15px !important; font-weight: 600 !important; font-family: 'Archivo', -apple-system, sans-serif !important; text-transform: uppercase !important; letter-spacing: 1px !important; opacity: 0.9 !important;">
                      Ton code de bienvenue
                    </p>
                    <p style="margin: 0 0 12px 0 !important; color: #FAF9F9 !important; font-size: 40px !important; font-weight: 700 !important; font-family: 'Archivo', -apple-system, sans-serif !important; letter-spacing: 3px !important;">
                      WELCOME10
                    </p>
                    <p style="margin: 0 !important; color: #BC6170 !important; font-size: 18px !important; font-weight: 600 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                      -10% sur ta première commande
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BOX MÉTÉO DU CHILL -->
          <tr>
            <td style="padding: 0 24px 24px 24px !important; background-color: #FAF9F9 !important;">
              <table role="presentation" style="width: 100% !important; background: #EFEDEE !important; border-radius: 16px !important;">
                <tr>
                  <td style="padding: 24px !important;">
                    <p style="margin: 0 0 12px 0 !important; color: #22192E !important; font-size: 16px !important; font-weight: 700 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                      C'est quoi la météo du chill ?
                    </p>
                    <p style="margin: 0 !important; color: #4a5568 !important; font-size: 14px !important; line-height: 1.6 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                      Des promos qui claquent, des news qui réchauffent. On t'envoie du lourd et du love, sans spam. Promis.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- IMAGE SOCIAL PREVIEW AVEC BOUTON CENTRÉ -->
          <tr>
            <td style="padding: 0 24px 24px 24px !important; background-color: #FAF9F9 !important;">
              <table role="presentation" style="width: 100% !important; border-collapse: collapse !important; background-image: url('https://xdkdxtrlldghcwymbttt.supabase.co/storage/v1/object/public/email-assets/SOCIAL%20PREVIEW.png') !important; background-size: cover !important; background-position: center !important; border-radius: 16px !important; height: 300px !important;">
                <tr>
                  <td align="center" valign="middle" style="height: 300px !important;">
                    <a href="https://aloha-cbd.fr" style="display: inline-block !important; background: #22192E !important; color: #FAF9F9 !important; text-decoration: none !important; padding: 16px 40px !important; border-radius: 14px !important; font-size: 16px !important; font-weight: 700 !important; font-family: 'Archivo', -apple-system, sans-serif !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;">
                      Découvrir la boutique
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td class="footer-section" style="padding: 32px 40px !important; text-align: center !important; background: #EFEDEE !important;">
              <p class="text-dark" style="margin: 0 0 16px 0 !important; color: #22192E !important; font-size: 16px !important; font-weight: 600 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">L'équipe Aloha</p>
              <p style="margin: 0 0 16px 0 !important; font-size: 14px !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                <a href="https://aloha-cbd.fr" style="color: #22192E !important; text-decoration: none !important; margin: 0 10px !important; font-weight: 500 !important;">Boutique</a>
                <span style="color: #BC6170 !important;">•</span>
                <a href="https://aloha-cbd.fr/contact" style="color: #22192E !important; text-decoration: none !important; margin: 0 10px !important; font-weight: 500 !important;">Contact</a>
              </p>
              <p class="text-light-gray" style="margin: 0 !important; color: #718096 !important; font-size: 12px !important; font-family: 'Archivo', -apple-system, sans-serif !important;">© ${currentYear} Aloha CBD. Tous droits réservés.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}
