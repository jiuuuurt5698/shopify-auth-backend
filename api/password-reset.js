import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'

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

  // ============================================
  // ACTION 1 : DEMANDE DE RÉINITIALISATION
  // ============================================
  if (action === 'request') {
    if (!email) {
      return res.status(400).json({ error: 'Email requis' })
    }

    try {
      // Vérifier si l'utilisateur existe
      const { data: user, error: userError } = await supabase
        .from('customers')
        .select('id, email, first_name')
        .eq('email', email)
        .single()

      if (userError || !user) {
        // Ne pas révéler si l'email existe ou non (sécurité)
        return res.status(200).json({
          message: 'Si ce compte existe, un email a été envoyé'
        })
      }

      // Générer un token sécurisé
      const resetToken = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 3600000) // 1 heure

      // Sauvegarder le token dans la DB
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

     // Envoyer l'email avec Resend
const resetUrl = `https://aloha-cbd.fr/mdp-oublie?token=${resetToken}`

try {
  const { data, error } = await resend.emails.send({
    from: 'Aloha <noreply@noreply.aloha-cbd.fr>',
    to: email,
    subject: 'Réinitialisation de votre mot de passe',
    html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Archivo', -apple-system, sans-serif; background-color: #FAF9F9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; border-collapse: collapse; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #22192E 0%, #3d2f52 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0 0 20px 0; color: #ffffff; font-size: 36px; font-weight: 700;">Aloha</h1>
              <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Réinitialisation de mot de passe</h2>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #22192E; font-size: 16px;">
                Bonjour <strong>${user.first_name}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; color: #718096; font-size: 15px; line-height: 1.6;">
                Vous avez demandé à réinitialiser le mot de passe de votre compte Aloha.
              </p>
              
              <p style="margin: 0 0 30px 0; color: #718096; font-size: 15px; line-height: 1.6;">
                Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
              </p>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${resetUrl}" style="display: inline-block; background: #BC6170; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 700; box-shadow: 0 4px 12px rgba(188, 97, 112, 0.3);">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; color: #718096; font-size: 13px; text-align: center;">
                Ou copiez ce lien :
              </p>
              <p style="margin: 10px 0 30px 0; color: #BC6170; font-size: 13px; text-align: center; word-break: break-all;">
                ${resetUrl}
              </p>
              
              <!-- Warning -->
              <table role="presentation" style="width: 100%; background: #FEF3C7; border-radius: 10px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 8px 0; color: #78350f; font-size: 14px; font-weight: 700;">
                      ⚠️ Important
                    </p>
                    <p style="margin: 0; color: #78350f; font-size: 13px; line-height: 1.5;">
                      Ce lien est valable pendant <strong>1 heure</strong> seulement. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #EFEDEE; padding: 30px; text-align: center;">
              <p style="margin: 0 0 16px 0; color: #22192E; font-size: 14px; font-weight: 600;">
                L'équipe Aloha 🌺
              </p>
              <p style="margin: 0 0 16px 0; color: #718096; font-size: 13px;">
                <a href="https://aloha-cbd.fr" style="color: #718096; text-decoration: none; margin: 0 10px;">Boutique</a>
                <span style="color: #e2e8f0;">|</span>
                <a href="https://aloha-cbd.fr/mon-compte" style="color: #718096; text-decoration: none; margin: 0 10px;">Mon compte</a>
                <span style="color: #e2e8f0;">|</span>
                <a href="https://aloha-cbd.fr/contact" style="color: #718096; text-decoration: none; margin: 0 10px;">Support</a>
              </p>
              <p style="margin: 0; color: #718096; font-size: 12px;">
                © ${new Date().getFullYear()} Aloha CBD. Tous droits réservés.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  })

  if (error) {
    console.error('❌ Erreur Resend:', error)
    console.error('Détails:', JSON.stringify(error, null, 2))
    return res.status(500).json({ 
      error: 'Erreur lors de l\'envoi de l\'email',
      details: error.message 
    })
  }

  console.log('✅ Email envoyé avec succès à:', email)
  console.log('✅ Resend response:', data)

} catch (emailError) {
  console.error('❌ Erreur catch email:', emailError)
  return res.status(500).json({ 
    error: 'Erreur lors de l\'envoi de l\'email'
  })
}

return res.status(200).json({
  message: 'Email de réinitialisation envoyé'
})

  // ============================================
  // ACTION 2 : RÉINITIALISATION DU MOT DE PASSE
  // ============================================
  if (action === 'reset') {
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token et nouveau mot de passe requis' })
    }

    try {
      // Vérifier le token
      const { data: tokenData, error: tokenError } = await supabase
        .from('password_reset_tokens')
        .select('customer_id, expires_at, used')
        .eq('token', token)
        .single()

      if (tokenError || !tokenData) {
        return res.status(400).json({ error: 'Token invalide' })
      }

      if (tokenData.used) {
        return res.status(400).json({ error: 'Token déjà utilisé' })
      }

      if (new Date(tokenData.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Token expiré' })
      }

      // Hasher le nouveau mot de passe
      const bcrypt = require('bcryptjs')
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      // Mettre à jour le mot de passe
      const { error: updateError } = await supabase
        .from('customers')
        .update({ password: hashedPassword })
        .eq('id', tokenData.customer_id)

      if (updateError) {
        console.error('Erreur lors de la mise à jour:', updateError)
        return res.status(500).json({ error: 'Erreur serveur' })
      }

      // Marquer le token comme utilisé
      await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('token', token)

      return res.status(200).json({
        message: 'Mot de passe réinitialisé avec succès'
      })

    } catch (error) {
      console.error('❌ Erreur globale:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(400).json({ error: 'Action invalide' })
}
