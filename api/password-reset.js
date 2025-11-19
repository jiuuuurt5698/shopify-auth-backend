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
    template_id: '0a7ae2b5-6ed4-4338-a873-8c9c186b3d74',  // ⬅️ VOTRE ID
    template_data: {
      firstName: user.first_name,
      resetUrl: resetUrl
    }
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

  return res.status(200).json({
    message: 'Email de réinitialisation envoyé'
  })

} catch (emailError) {
  console.error('❌ Erreur globale:', emailError)
  return res.status(500).json({ 
    error: 'Erreur serveur'
  })
}

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
      console.error('Erreur globale:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(400).json({ error: 'Action invalide' })
}
