import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'  // ⬅️ AJOUTÉ ICI

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
          html: `<!DOCTYPE html>
html: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Archivo', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background-color: #FAF9F9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #FAF9F9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Container principal -->
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
          
          <!-- Header avec gradient violet -->
          <tr>
            <td style="background: linear-gradient(135deg, #22192E 0%, #3d2f52 100%); padding: 50px 40px; text-align: center;">
              <h1 style="margin: 0 0 24px 0; color: #ffffff; font-size: 42px; font-weight: 700; font-family: 'Archivo', -apple-system, sans-serif; letter-spacing: -0.5px;">Aloha</h1>
              <h2 style="margin: 0; color: #FAF9F9; font-size: 26px; font-weight: 600; font-family: 'Archivo', -apple-system, sans-serif; line-height: 1.3;">Réinitialisation de votre mot de passe</h2>
            </td>
          </tr>
          
          <!-- Corps du message -->
          <tr>
            <td style="padding: 48px 40px;">
              
              <!-- Salutation -->
              <p style="margin: 0 0 24px 0; color: #22192E; font-size: 17px; font-weight: 400; line-height: 1.6; font-family: 'Archivo', -apple-system, sans-serif;">
                Bonjour <strong style="font-weight: 700;">${user.first_name}</strong>,
              </p>
              
              <!-- Message principal -->
              <p style="margin: 0 0 24px 0; color: #718096; font-size: 16px; font-weight: 400; line-height: 1.7; font-family: 'Archivo', -apple-system, sans-serif;">
                Vous avez demandé à réinitialiser le mot de passe de votre compte Aloha. Nous sommes là pour vous aider !
              </p>
              
              <p style="margin: 0 0 36px 0; color: #718096; font-size: 16px; font-weight: 400; line-height: 1.7; font-family: 'Archivo', -apple-system, sans-serif;">
                Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe sécurisé :
              </p>
              
              <!-- Bouton CTA -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 24px 0;">
                    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #BC6170 0%, #a0515f 100%); color: #ffffff; text-decoration: none; padding: 18px 48px; border-radius: 14px; font-size: 17px; font-weight: 700; font-family: 'Archivo', -apple-system, sans-serif; box-shadow: 0 6px 20px rgba(188, 97, 112, 0.35); transition: all 0.3s ease;">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Lien alternatif -->
              <p style="margin: 32px 0 0 0; color: #718096; font-size: 14px; font-weight: 400; line-height: 1.6; font-family: 'Archivo', -apple-system, sans-serif; text-align: center;">
                Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :
              </p>
              <p style="margin: 12px 0 36px 0; text-align: center;">
                <a href="${resetUrl}" style="color: #BC6170; font-size: 13px; font-weight: 500; word-break: break-all; font-family: 'Archivo', -apple-system, sans-serif; text-decoration: underline;">${resetUrl}</a>
              </p>
              
              <!-- Box d'avertissement -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 14px; border-left: 4px solid #F59E0B; margin-top: 36px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 10px 0; color: #78350f; font-size: 15px; font-weight: 700; font-family: 'Archivo', -apple-system, sans-serif; display: flex; align-items: center;">
                      <span style="font-size: 20px; margin-right: 8px;">⚠️</span>
                      <span>Important - Sécurité</span>
                    </p>
                    <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 400; line-height: 1.6; font-family: 'Archivo', -apple-system, sans-serif;">
                      Ce lien est valable pendant <strong style="font-weight: 700;">1 heure</strong> seulement. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email en toute sécurité. Votre compte reste protégé.
                    </p>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Séparateur -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid #e2e8f0;"></div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #EFEDEE 0%, #E8E6E7 100%); padding: 36px 40px; text-align: center;">
              
              <!-- Signature -->
              <p style="margin: 0 0 20px 0; color: #22192E; font-size: 16px; font-weight: 700; font-family: 'Archivo', -apple-system, sans-serif; letter-spacing: -0.2px;">
                L'équipe Aloha <span style="font-size: 18px;">🌺</span>
              </p>
              
              <!-- Liens utiles -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <a href="https://aloha-cbd.fr" style="color: #718096; text-decoration: none; font-size: 14px; font-weight: 500; font-family: 'Archivo', -apple-system, sans-serif; margin: 0 12px; transition: color 0.2s;">Boutique</a>
                    <span style="color: #cbd5e0; font-weight: 300;">•</span>
                    <a href="https://aloha-cbd.fr/mon-compte" style="color: #718096; text-decoration: none; font-size: 14px; font-weight: 500; font-family: 'Archivo', -apple-system, sans-serif; margin: 0 12px; transition: color 0.2s;">Mon compte</a>
                    <span style="color: #cbd5e0; font-weight: 300;">•</span>
                    <a href="https://aloha-cbd.fr/contact" style="color: #718096; text-decoration: none; font-size: 14px; font-weight: 500; font-family: 'Archivo', -apple-system, sans-serif; margin: 0 12px; transition: color 0.2s;">Support</a>
                  </td>
                </tr>
              </table>
              
              <!-- Réseaux sociaux (optionnel) -->
              <!-- <table role="presentation" style="margin: 0 auto 20px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 0 8px;">
                    <a href="https://instagram.com/aloha" style="text-decoration: none;">
                      <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" style="width: 24px; height: 24px; display: block;">
                    </a>
                  </td>
                  <td style="padding: 0 8px;">
                    <a href="https://facebook.com/aloha" style="text-decoration: none;">
                      <img src="https://cdn-icons-png.flaticon.com/512/174/174848.png" alt="Facebook" style="width: 24px; height: 24px; display: block;">
                    </a>
                  </td>
                </tr>
              </table> -->
              
              <!-- Copyright -->
              <p style="margin: 0; color: #9CA3AF; font-size: 13px; font-weight: 400; font-family: 'Archivo', -apple-system, sans-serif;">
                © ${new Date().getFullYear()} Aloha CBD. Tous droits réservés.
              </p>
              <p style="margin: 8px 0 0 0; color: #9CA3AF; font-size: 12px; font-weight: 400; font-family: 'Archivo', -apple-system, sans-serif;">
                Aubenas, Rhône-Alpes, France
              </p>
              
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
          return res.status(500).json({ 
            error: 'Erreur lors de l\'envoi de l\'email'
          })
        }

        console.log('✅ Email envoyé avec succès à:', email)

      } catch (emailError) {
        console.error('❌ Erreur catch email:', emailError)
        return res.status(500).json({ 
          error: 'Erreur lors de l\'envoi de l\'email'
        })
      }

      return res.status(200).json({
        message: 'Email de réinitialisation envoyé'
      })

    } catch (error) {
      console.error('❌ Erreur globale:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  // ============================================
  // ACTION 2 : RÉINITIALISATION DU MOT DE PASSE
  // ============================================
  if (action === 'reset') {
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token et nouveau mot de passe requis' })
    }

    try {
      console.log('🔍 Recherche du token:', token)

      // Vérifier le token
      const { data: tokenData, error: tokenError } = await supabase
        .from('password_reset_tokens')
        .select('customer_id, expires_at, used')
        .eq('token', token)
        .single()

      console.log('📋 Token data:', tokenData)
      console.log('❌ Token error:', tokenError)

      if (tokenError || !tokenData) {
        console.error('Token invalide:', tokenError)
        return res.status(400).json({ error: 'Token invalide ou introuvable' })
      }

      if (tokenData.used) {
        console.error('Token déjà utilisé')
        return res.status(400).json({ error: 'Ce lien a déjà été utilisé' })
      }

      const now = new Date()
      const expiresAt = new Date(tokenData.expires_at)
      console.log('⏰ Now:', now)
      console.log('⏰ Expires at:', expiresAt)

      if (expiresAt < now) {
        console.error('Token expiré')
        return res.status(400).json({ error: 'Ce lien a expiré. Demandez un nouveau lien de réinitialisation.' })
      }

      // Hasher le nouveau mot de passe
      console.log('🔐 Hachage du mot de passe...')
      const hashedPassword = await bcrypt.hash(newPassword, 10)  // ⬅️ UTILISE bcrypt IMPORTÉ
      console.log('✅ Mot de passe haché')

      // Mettre à jour le mot de passe
      console.log('💾 Mise à jour du mot de passe pour customer_id:', tokenData.customer_id)
      const { error: updateError } = await supabase
  .from('customers')
  .update({ password_hash: hashedPassword })  // ✅ OU le nom correct de votre colonne
  .eq('id', tokenData.customer_id)
      if (updateError) {
        console.error('❌ Erreur lors de la mise à jour du mot de passe:', updateError)
        return res.status(500).json({ error: 'Erreur lors de la mise à jour du mot de passe' })
      }

      console.log('✅ Mot de passe mis à jour')

      // Marquer le token comme utilisé
      const { error: markError } = await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('token', token)

      if (markError) {
        console.error('⚠️ Erreur lors du marquage du token:', markError)
        // Ne pas bloquer si ça échoue
      }

      console.log('✅ Token marqué comme utilisé')

      return res.status(200).json({
        success: true,
        message: 'Mot de passe réinitialisé avec succès'
      })

    } catch (error) {
      console.error('❌ Erreur globale lors du reset:', error)
      console.error('Stack:', error.stack)
      return res.status(500).json({ 
        error: 'Erreur serveur',
        details: error.message 
      })
    }
  }

  return res.status(400).json({ error: 'Action invalide' })
}
