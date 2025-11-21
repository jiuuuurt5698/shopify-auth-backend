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
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Archivo', sans-serif; background-color: #EACDC2;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background: #FAF9F9; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(34, 25, 46, 0.12);">
          
          <!-- HEADER AVEC SMILEY -->
          <tr>
            <td style="background: linear-gradient(135deg, #BC6170 0%, #9d5260 100%); padding: 32px 40px; text-align: center;">
              <img src="https://xdkdxtrlldghcwymbttt.supabase.co/storage/v1/object/public/email-assets/SMILEY%202.png" alt="Aloha" style="width: 140px; height: 140px; margin: 0 auto 16px; display: block;" />
              <h2 style="margin: 0 0 8px 0; color: #FAF9F9; font-size: 28px; font-weight: 700; font-family: 'Archivo', sans-serif;">Réinitialisation</h2>
              <p style="margin: 0; color: rgba(250, 249, 249, 0.85); font-size: 16px; font-family: 'Archivo', sans-serif;">de votre mot de passe</p>
            </td>
          </tr>

          <!-- CONTENU PRINCIPAL -->
          <tr>
            <td style="padding: 48px 40px;">
              <p style="margin: 0 0 20px 0; color: #22192E; font-size: 17px; font-family: 'Archivo', sans-serif;">
                Salut <strong style="font-weight: 700; color: #BC6170;">${user.first_name}</strong> 👋
              </p>
              <p style="margin: 0 0 32px 0; color: #4a5568; font-size: 16px; line-height: 1.6; font-family: 'Archivo', sans-serif;">
                Pas de panique ! On a reçu ta demande de réinitialisation de mot de passe. Clique sur le bouton ci-dessous pour créer ton nouveau mot de passe.
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 8px 0 40px 0;">
                    <a href="${resetUrl}" style="display: inline-block; background: #FE7BFF; color: #22192E; text-decoration: none; padding: 18px 48px; border-radius: 16px; font-size: 17px; font-weight: 700; font-family: 'Archivo', sans-serif; box-shadow: 0 8px 24px rgba(254, 123, 255, 0.35);">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>
              <table role="presentation" style="width: 100%; background: #FEF3C7; border-radius: 16px; border-left: 5px solid #F59E0B;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 8px 0; color: #78350f; font-size: 15px; font-weight: 700; font-family: 'Archivo', sans-serif;">⏱️ Attention</p>
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6; font-family: 'Archivo', sans-serif;">
                      Ce lien expire dans <strong>1 heure</strong>. Si tu n'as pas demandé cette réinitialisation, ignore simplement cet email.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin: 32px 0 0 0; color: #718096; font-size: 13px; font-family: 'Archivo', sans-serif; text-align: center;">
                Le bouton ne fonctionne pas ? Copie ce lien dans ton navigateur :
              </p>
              <p style="margin: 12px 0 0 0; text-align: center;">
                <a href="${resetUrl}" style="color: #BC6170; font-size: 12px; word-break: break-all; font-family: 'Archivo', sans-serif; text-decoration: none;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 32px 40px; text-align: center; background: #EFEDEE;">
              <p style="margin: 0 0 16px 0; color: #22192E; font-size: 16px; font-weight: 600; font-family: 'Archivo', sans-serif;">L'équipe Aloha 🌺</p>
              <p style="margin: 0 0 16px 0; font-size: 14px; font-family: 'Archivo', sans-serif;">
                <a href="https://aloha-cbd.fr" style="color: #22192E; text-decoration: none; margin: 0 10px; font-weight: 500;">Boutique</a>
                <span style="color: #BC6170;">•</span>
                <a href="https://aloha-cbd.fr/mon-compte" style="color: #22192E; text-decoration: none; margin: 0 10px; font-weight: 500;">Mon compte</a>
                <span style="color: #BC6170;">•</span>
                <a href="https://aloha-cbd.fr/contact" style="color: #22192E; text-decoration: none; margin: 0 10px; font-weight: 500;">Support</a>
              </p>
              <p style="margin: 0; color: #718096; font-size: 12px; font-family: 'Archivo', sans-serif;">© ${new Date().getFullYear()} Aloha CBD. Tous droits réservés.</p>
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
