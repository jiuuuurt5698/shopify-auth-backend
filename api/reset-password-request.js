const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

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
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }

    // Vérifier si l'utilisateur existe
    const { data: user, error: userError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      // Pour des raisons de sécurité, on retourne toujours success même si l'email n'existe pas
      return res.status(200).json({ 
        success: true, 
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé' 
      });
    }

    // Générer un token unique
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 heure

    // Sauvegarder le token dans Supabase
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        email: email,
        token: resetToken,
        expires_at: expiresAt,
        used: false
      });

    if (tokenError) {
      console.error('Error saving token:', tokenError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    // Envoyer l'email avec Resend
    if (RESEND_API_KEY) {
      const resetUrl = `https://votre-site.com/reset-password?token=${resetToken}`;
      
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'Aloha <noreply@votre-domaine.com>',
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

      if (!emailResponse.ok) {
        console.error('Error sending email');
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé' 
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
