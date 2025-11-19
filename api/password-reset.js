import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { action, email, token, newPassword } = req.body

    // ACTION 1 : DEMANDE DE RÉINITIALISATION
    if (action === 'request') {
      if (!email) {
        return res.status(400).json({ error: 'Email requis' })
      }

      // Vérifier si l'utilisateur existe
      const { data: user, error: userError } = await supabase
        .from('customers')
        .select('id, email, first_name')
        .eq('email', email)
        .single()

      if (userError || !user) {
        // Par sécurité, on renvoie toujours "OK" même si l'email n'existe pas
        return res.status(200).json({ 
          message: 'Si ce compte existe, un email a été envoyé' 
        })
      }

      // Générer un token de réinitialisation
      const resetToken = Array.from({ length: 32 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')
      
      const expiresAt = new Date(Date.now() + 3600000).toISOString() // 1 heure

      // Sauvegarder le token dans la base de données
      const { error: insertError } = await supabase
        .from('password_reset_tokens')
        .insert({
          customer_id: user.id,
          token: resetToken,
          expires_at: expiresAt
        })

      if (insertError) {
        console.error('Error inserting reset token:', insertError)
        return res.status(500).json({ error: 'Erreur serveur' })
      }

      // Envoyer l'email avec Resend
      const resetUrl = `https://aloha-cbd.fr/mdp-oublie?token=${resetToken}`

      try {
        await resend.emails.send({
  from: 'Aloha <noreply@noreply.aloha-cbd.fr>',
  to: email,
  subject: 'Réinitialisation de votre mot de passe',
  react: PasswordResetEmail({
    firstName: user.first_name,
    resetUrl: resetUrl
  })
})
      } catch (emailError) {
        console.error('Error sending email:', emailError)
        return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' })
      }

      return res.status(200).json({ 
        message: 'Email envoyé avec succès' 
      })
    }

    // ACTION 2 : RÉINITIALISATION DU MOT DE PASSE
    if (action === 'reset') {
      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token et nouveau mot de passe requis' })
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' })
      }

      // Vérifier le token
      const { data: resetToken, error: tokenError } = await supabase
        .from('password_reset_tokens')
        .select('customer_id, expires_at, used')
        .eq('token', token)
        .single()

      if (tokenError || !resetToken) {
        return res.status(400).json({ error: 'Token invalide' })
      }

      // Vérifier si le token a expiré
      if (new Date(resetToken.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Token expiré' })
      }

      // Vérifier si le token a déjà été utilisé
      if (resetToken.used) {
        return res.status(400).json({ error: 'Token déjà utilisé' })
      }

      // Hasher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      // Mettre à jour le mot de passe
      const { error: updateError } = await supabase
        .from('customers')
        .update({ password_hash: hashedPassword })
        .eq('id', resetToken.customer_id)

      if (updateError) {
        console.error('Error updating password:', updateError)
        return res.status(500).json({ error: 'Erreur lors de la mise à jour du mot de passe' })
      }

      // Marquer le token comme utilisé
      await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('token', token)

      return res.status(200).json({ 
        message: 'Mot de passe réinitialisé avec succès' 
      })
    }

    return res.status(400).json({ error: 'Action invalide' })

  } catch (error) {
    console.error('Error in password-reset:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
