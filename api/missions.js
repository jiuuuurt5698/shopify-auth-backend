import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
)

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { action, user_id, mission_id, email } = req.body

    try {
        // ============================================
        // ACTION: GET - Récupérer les missions d'un utilisateur
        // ============================================
        if (action === 'get') {
            if (!user_id && !email) {
                return res.status(400).json({ error: 'user_id ou email requis' })
            }

            // Si email fourni, récupérer le user_id
            let finalUserId = user_id
            if (!finalUserId && email) {
                const { data: customer } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('email', email)
                    .single()
                
                if (!customer) {
                    return res.status(404).json({ error: 'Utilisateur non trouvé' })
                }
                finalUserId = customer.id
            }

            // Récupérer toutes les missions actives
            const { data: missions, error: missionsError } = await supabase
                .from('missions')
                .select('*')
                .eq('is_active', true)
                .order('points', { ascending: true })

            if (missionsError) {
                throw missionsError
            }

            // Récupérer les missions de l'utilisateur
            const { data: userMissions, error: userMissionsError } = await supabase
                .from('user_missions')
                .select('*')
                .eq('user_id', finalUserId)

            if (userMissionsError) {
                throw userMissionsError
            }

            // Combiner les données
            const missionsWithStatus = missions.map(mission => {
                const userMission = userMissions?.find(um => um.mission_id === mission.id)
                return {
                    ...mission,
                    status: userMission?.status || 'available',
                    current_progress: userMission?.current_progress || 0,
                    completed_at: userMission?.completed_at || null
                }
            })

            return res.status(200).json({ 
                success: true, 
                missions: missionsWithStatus 
            })
        }

        // ============================================
        // ACTION: COMPLETE - Compléter une mission
        // ============================================
        if (action === 'complete') {
            if (!user_id || !mission_id) {
                return res.status(400).json({ error: 'user_id et mission_id requis' })
            }

            // Récupérer la mission
            const { data: mission, error: missionError } = await supabase
                .from('missions')
                .select('*')
                .eq('id', mission_id)
                .single()

            if (missionError || !mission) {
                return res.status(404).json({ error: 'Mission non trouvée' })
            }

            // Vérifier si déjà complétée
            const { data: existingUserMission } = await supabase
                .from('user_missions')
                .select('*')
                .eq('user_id', user_id)
                .eq('mission_id', mission_id)
                .single()

            if (existingUserMission?.status === 'completed' && !mission.is_repeatable) {
                return res.status(400).json({ error: 'Mission déjà complétée' })
            }

            // Créer/mettre à jour user_mission
            const { error: upsertError } = await supabase
                .from('user_missions')
                .upsert({
                    user_id,
                    mission_id,
                    status: 'completed',
                    current_progress: mission.target_count,
                    completed_at: new Date().toISOString(),
                    points_awarded: mission.points
                }, {
                    onConflict: 'user_id,mission_id'
                })

            if (upsertError) {
                throw upsertError
            }

            // Ajouter les points au client
            const { data: customer, error: customerError } = await supabase
                .from('customers')
                .select('points_balance, total_points_earned')
                .eq('id', user_id)
                .single()

            if (customerError) {
                throw customerError
            }

            const { error: updateError } = await supabase
                .from('customers')
                .update({
                    points_balance: customer.points_balance + mission.points,
                    total_points_earned: customer.total_points_earned + mission.points
                })
                .eq('id', user_id)

            if (updateError) {
                throw updateError
            }

            // Enregistrer la transaction
            await supabase
                .from('points_transactions')
                .insert({
                    customer_id: user_id,
                    points: mission.points,
                    type: 'mission',
                    description: `Mission complétée : ${mission.name}`
                })

            return res.status(200).json({
                success: true,
                message: `+${mission.points} points !`,
                mission: mission.name,
                points_awarded: mission.points
            })
        }

        // ============================================
        // ACTION: PROGRESS - Mettre à jour la progression
        // ============================================
        if (action === 'progress') {
            if (!user_id || !mission_id) {
                return res.status(400).json({ error: 'user_id et mission_id requis' })
            }

            const { progress } = req.body

            if (progress === undefined) {
                return res.status(400).json({ error: 'progress requis' })
            }

            // Récupérer la mission
            const { data: mission } = await supabase
                .from('missions')
                .select('*')
                .eq('id', mission_id)
                .single()

            if (!mission) {
                return res.status(404).json({ error: 'Mission non trouvée' })
            }

            // Mettre à jour ou créer la progression
            const newProgress = Math.min(progress, mission.target_count)
            const isCompleted = newProgress >= mission.target_count

            const { error: upsertError } = await supabase
                .from('user_missions')
                .upsert({
                    user_id,
                    mission_id,
                    status: isCompleted ? 'completed' : 'in_progress',
                    current_progress: newProgress,
                    completed_at: isCompleted ? new Date().toISOString() : null,
                    points_awarded: isCompleted ? mission.points : 0
                }, {
                    onConflict: 'user_id,mission_id'
                })

            if (upsertError) {
                throw upsertError
            }

            // Si complétée, ajouter les points
            if (isCompleted) {
                const { data: customer } = await supabase
                    .from('customers')
                    .select('points_balance, total_points_earned')
                    .eq('id', user_id)
                    .single()

                if (customer) {
                    await supabase
                        .from('customers')
                        .update({
                            points_balance: customer.points_balance + mission.points,
                            total_points_earned: customer.total_points_earned + mission.points
                        })
                        .eq('id', user_id)

                    await supabase
                        .from('points_transactions')
                        .insert({
                            customer_id: user_id,
                            points: mission.points,
                            type: 'mission',
                            description: `Mission complétée : ${mission.name}`
                        })
                }
            }

            return res.status(200).json({
                success: true,
                current_progress: newProgress,
                is_completed: isCompleted,
                points_awarded: isCompleted ? mission.points : 0
            })
        }

        return res.status(400).json({ error: 'Action invalide' })

    } catch (error) {
        console.error('Erreur missions:', error)
        return res.status(500).json({ error: 'Erreur serveur', details: error.message })
    }
}
