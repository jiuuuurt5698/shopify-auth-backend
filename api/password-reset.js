const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, email, token, newPassword } = req.body;

    // ACTION 1 : Demander un reset (envoyer l'email)
    if (action === 'request') {
      if (!email) {
        return res.status(400).json({ error: 'Email requis' });
      }

      // Vérifier si l'utilisateur existe
      const { data: user } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email)
        .single();

      if (!user) {
        // Pour la sécurité, on retourne toujours success
        return res.status(200).json({ 
          success: true, 
          message: 'Si cet email existe, un lien de réinitialisation a été envoyé' 
        });
      }

      // Générer un token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1h

      // Sauvegarder le token
      await supabase.from('password_reset_tokens').insert({
        email: email,
        token: resetToken,
        expires_at: expiresAt,
        used: false
      });

      // Envoyer l'email
      if (RESEND_API_KEY) {
        const resetUrl = `https://aloha-cbd.fr/mdp-oublie?token=${resetToken}`;
        
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'Aloha <noreply@contact.aloha-cbd.fr>',
            to: email,
            subject: 'Réinitialisation de votre mot de passe',
            html: `
              <h2>Réinitialisation de mot de passe</h2>
              <p>Bonjour,</p>
              <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
              <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
              <a href="${resetUrl}" style="background: #22192E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">Réinitialiser mon mot de passe</a>
              <p>Ce lien est valable pendant 1 heure.</p>
              <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
              <p>Cordialement,<br>L'équipe Aloha</p>
            `
          })
        });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé' 
      });
    }

    // ACTION 2 : Réinitialiser le mot de passe
    if (action === 'reset') {
      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token et mot de passe requis' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
      }

      // Vérifier le token
      const { data: resetToken } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .single();

      if (!resetToken) {
        return res.status(400).json({ error: 'Token invalide ou expiré' });
      }

      // Vérifier l'expiration
      if (new Date(resetToken.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Token expiré' });
      }

      // Hasher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Mettre à jour le mot de passe
      await supabase
        .from('customers')
        .update({ password: hashedPassword })
        .eq('email', resetToken.email);

      // Marquer le token comme utilisé
      await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('token', token);

      return res.status(200).json({ 
        success: true, 
        message: 'Mot de passe réinitialisé avec succès' 
      });
    }

    return res.status(400).json({ error: 'Action invalide' });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
