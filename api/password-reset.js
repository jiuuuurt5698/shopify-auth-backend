import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const { action, email, token, newPassword } = req.body

  if (action === 'request') {
    if (!email) {
      return res.status(400).json({ error: 'Email requis' })
    }

    try {
      const { data: user, error: userError } = await supabase
        .from('customers')
        .select('id, email, first_name')
        .eq('email', email)
        .single()

      if (userError || !user) {
        return res.status(200).json({
          message: 'Si ce compte existe, un email a été envoyé'
        })
      }

      const resetToken = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 3600000)

      const { error: tokenError } = await supabase
        .from('password_reset_tokens')
        .insert({
          customer_id: user.id,
          token: resetToken,
          expires_at: expiresAt.toISOString()
        })

      if (tokenError) {
        console.error('Erreur lors de la création du token:', tokenError)
        return res.status(500).json({ error: 'Erreur serveur' })
      }

      const resetUrl = `https://aloha-cbd.fr/mdp-oublie?token=${resetToken}`

      try {
        const { data, error } = await resend.emails.send({
          from: 'Aloha <noreply@noreply.aloha-cbd.fr>',
          to: email,
          subject: 'Réinitialisation de votre mot de passe',
          html: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&display=swap');
    
    /* Force light mode */
    :root {
      color-scheme: light only !important;
      supported-color-schemes: light !important;
    }
    
    /* Protection dark mode pour tous les clients */
    @media (prefers-color-scheme: dark) {
      .email-container { background-color: #EACDC2 !important; }
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
<body style="margin: 0 !important; padding: 0 !important; font-family: 'Archivo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important; background-color: #EACDC2 !important; color-scheme: light only !important;">
  <table role="presentation" class="email-container" style="width: 100% !important; border-collapse: collapse !important; background-color: #EACDC2 !important;">
    <tr>
      <td align="center" style="padding: 40px 20px !important;">
        <table role="presentation" class="email-card" style="max-width: 600px !important; width: 100% !important; border-collapse: collapse !important; background: #FAF9F9 !important; border-radius: 24px !important; overflow: hidden !important; box-shadow: 0 10px 40px rgba(34, 25, 46, 0.12) !important;">
          
          <!-- HEADER AVEC SMILEY -->
          <tr>
            <td class="header-section" style="background: linear-gradient(135deg, #BC6170 0%, #9d5260 100%) !important; padding: 24px 40px !important; text-align: center !important;">
              <img src="https://xdkdxtrlldghcwymbttt.supabase.co/storage/v1/object/public/email-assets/SMILEY%202.png" alt="Aloha" style="width: 140px !important; height: 140px !important; margin: 0 auto 12px !important; display: block !important;" />
              <h2 style="margin: 0 0 6px 0 !important; color: #FAF9F9 !important; font-size: 28px !important; font-weight: 700 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">Réinitialisation</h2>
              <p style="margin: 0 !important; color: #FAF9F9 !important; opacity: 0.85 !important; font-size: 16px !important; font-family: 'Archivo', -apple-system, sans-serif !important;">de votre mot de passe</p>
            </td>
          </tr>

          <!-- CONTENU PRINCIPAL -->
          <tr>
            <td class="content-section" style="padding: 48px 40px !important; background-color: #FAF9F9 !important;">
              <p class="text-dark" style="margin: 0 0 20px 0 !important; color: #22192E !important; font-size: 17px !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                Salut <strong style="font-weight: 700 !important; color: #BC6170 !important;">${user.first_name}</strong> 👋
              </p>
              <p class="text-gray" style="margin: 0 0 32px 0 !important; color: #4a5568 !important; font-size: 16px !important; line-height: 1.6 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                Pas de panique ! On a reçu ta demande de réinitialisation de mot de passe. Clique sur le bouton ci-dessous pour créer ton nouveau mot de passe.
              </p>
              <table role="presentation" style="width: 100% !important; border-collapse: collapse !important;">
                <tr>
                  <td align="center" style="padding: 8px 0 40px 0 !important;">
                    <a href="${resetUrl}" style="display: inline-block !important; background: #FE7BFF !important; color: #22192E !important; text-decoration: none !important; padding: 18px 48px !important; border-radius: 16px !important; font-size: 17px !important; font-weight: 700 !important; font-family: 'Archivo', -apple-system, sans-serif !important; box-shadow: 0 4px 14px rgba(254, 123, 255, 0.4) !important;">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>
              <table role="presentation" style="width: 100% !important; background: #FEF3C7 !important; border-radius: 16px !important;">
                <tr>
                  <td style="padding: 24px !important;">
                    <p style="margin: 0 0 8px 0 !important; color: #78350f !important; font-size: 15px !important; font-weight: 700 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">⏱️ Attention</p>
                    <p style="margin: 0 !important; color: #92400e !important; font-size: 14px !important; line-height: 1.6 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                      Ce lien expire dans <strong>1 heure</strong>. Si tu n'as pas demandé cette réinitialisation, ignore simplement cet email.
                    </p>
                  </td>
                </tr>
              </table>
              <p class="text-light-gray" style="margin: 32px 0 0 0 !important; color: #718096 !important; font-size: 13px !important; font-family: 'Archivo', -apple-system, sans-serif !important; text-align: center !important;">
                Le bouton ne fonctionne pas ? Copie ce lien dans ton navigateur :
              </p>
              <p style="margin: 12px 0 0 0 !important; text-align: center !important;">
                <a href="${resetUrl}" style="color: #BC6170 !important; font-size: 12px !important; word-break: break-all !important; font-family: 'Archivo', -apple-system, sans-serif !important; text-decoration: none !important;">${resetUrl}</a>
              </p>
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
                <a href="https://aloha-cbd.fr/mon-compte" style="color: #22192E !important; text-decoration: none !important; margin: 0 10px !important; font-weight: 500 !important;">Mon compte</a>
                <span style="color: #BC6170 !important;">•</span>
                <a href="https://aloha-cbd.fr/contact" style="color: #22192E !important; text-decoration: none !important; margin: 0 10px !important; font-weight: 500 !important;">Support</a>
              </p>
              <p class="text-light-gray" style="margin: 0 !important; color: #718096 !important; font-size: 12px !important; font-family: 'Archivo', -apple-system, sans-serif !important;">© ${new Date().getFullYear()} Aloha CBD. Tous droits réservés.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
        })

        if (error) {
          console.error('❌ Erreur Resend:', error)
          return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' })
        }

        console.log('✅ Email envoyé avec succès à:', email)

      } catch (emailError) {
        console.error('❌ Erreur catch email:', emailError)
        return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' })
      }

      return res.status(200).json({ message: 'Email de réinitialisation envoyé' })

    } catch (error) {
      console.error('❌ Erreur globale:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (action === 'reset') {
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token et nouveau mot de passe requis' })
    }

    try {
      const { data: tokenData, error: tokenError } = await supabase
        .from('password_reset_tokens')
        .select('customer_id, expires_at, used')
        .eq('token', token)
        .single()

      if (tokenError || !tokenData) {
        return res.status(400).json({ error: 'Token invalide ou introuvable' })
      }

      if (tokenData.used) {
        return res.status(400).json({ error: 'Ce lien a déjà été utilisé' })
      }

      const now = new Date()
      const expiresAt = new Date(tokenData.expires_at)

      if (expiresAt < now) {
        return res.status(400).json({ error: 'Ce lien a expiré. Demandez un nouveau lien de réinitialisation.' })
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10)

      const { error: updateError } = await supabase
        .from('customers')
        .update({ password_hash: hashedPassword })
        .eq('id', tokenData.customer_id)
      
      if (updateError) {
        return res.status(500).json({ error: 'Erreur lors de la mise à jour du mot de passe' })
      }

      await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('token', token)

      return res.status(200).json({
        success: true,
        message: 'Mot de passe réinitialisé avec succès'
      })

    } catch (error) {
      console.error('❌ Erreur globale lors du reset:', error)
      return res.status(500).json({ 
        error: 'Erreur serveur',
        details: error.message 
      })
    }
  }

  return res.status(400).json({ error: 'Action invalide' })
}
