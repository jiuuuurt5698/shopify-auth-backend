import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' })
    }

    // Récupérer l'utilisateur depuis Supabase
    const { data: user, error: userError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single()

    if (userError || !user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password_hash)

    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    // Retourner l'utilisateur (sans le mot de passe)
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    })

  } catch (error) {
    console.error('Error in signin:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
