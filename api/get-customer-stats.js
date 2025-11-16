export default async function handler(req, res) {
    const { email } = req.query

    if (!email) {
        return res.status(400).json({ error: "Email required" })
    }

    try {
        const { createClient } = await import("@supabase/supabase-js")
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        )

        console.log("📊 Récupération des stats pour:", email)

        // 1. Récupérer le total dépensé depuis Shopify
        const SHOPIFY_DOMAIN = "f8bnjk-2f.myshopify.com"
        const ADMIN_API_URL = `https://${SHOPIFY_DOMAIN}/admin/api/2024-10/graphql.json`
        
        const shopifyQuery = `
            query getCustomerOrders($email: String!) {
                customers(first: 1, query: $email) {
                    edges {
                        node {
                            orders(first: 250) {
                                edges {
                                    node {
                                        totalPriceSet {
                                            shopMoney {
                                                amount
                                            }
                                        }
                                        createdAt
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `

        const shopifyResponse = await fetch(ADMIN_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_API_TOKEN,
            },
            body: JSON.stringify({
                query: shopifyQuery,
                variables: {
                    email: `email:${email}`,
                },
            }),
        })

        const shopifyData = await shopifyResponse.json()
        const customer = shopifyData.data?.customers?.edges[0]?.node
        const orders = customer?.orders?.edges || []

        console.log("📦 Nombre de commandes trouvées:", orders.length)

        // Calcul total dépensé et nombre de commandes
        const totalSpent = orders.reduce((sum, { node }) => {
            return sum + parseFloat(node.totalPriceSet.shopMoney.amount)
        }, 0)
        const orderCount = orders.length
        const averageBasket = orderCount > 0 ? totalSpent / orderCount : 0

        console.log("💰 Total dépensé:", totalSpent)
        console.log("📊 Panier moyen:", averageBasket)

        // Date de première commande
        const firstOrderDate = orders.length > 0 
            ? new Date(orders[orders.length - 1].node.createdAt)
            : null

        // 2. Récupérer les transactions (codes promo + cartes cadeaux)
        const { data: transactions, error: transError } = await supabase
            .from("transactions")
            .select("*")
            .eq("customer_email", email)
            .order("created_at", { ascending: false })

        if (transError) {
            console.error("❌ Erreur Supabase transactions:", transError)
        }

        console.log("📋 Transactions trouvées:", transactions?.length || 0)

        // Calcul des économies depuis les CODES PROMO (points dépensés)
        const codesPromoTransactions = transactions?.filter(t => 
            t.type === "discount_code_generated" && t.points < 0
        ) || []
        
        const savingsFromCodes = codesPromoTransactions.reduce((sum, t) => {
            // Les points sont négatifs, donc on prend la valeur absolue
            // 10 points = 1€, donc on divise par 10
            return sum + Math.abs(t.points) / 10
        }, 0)

        console.log("🎫 Codes promo utilisés:", codesPromoTransactions.length)
        console.log("💸 Économies codes promo:", savingsFromCodes)

        // Calcul des économies depuis les CARTES CADEAUX
        const giftCardsTransactions = transactions?.filter(t => 
            t.type === "gift_card_redeemed"
        ) || []

        // Récupérer les montants réels des cartes cadeaux depuis leur description
        const savingsFromGiftCards = giftCardsTransactions.reduce((sum, t) => {
            // Extraire le montant depuis la description
            // Format: "Carte cadeau Argent de 10€ récupérée (CODE)"
            const match = t.description.match(/de (\d+)€/)
            const amount = match ? parseFloat(match[1]) : 0
            return sum + amount
        }, 0)

        console.log("🎁 Cartes cadeaux récupérées:", giftCardsTransactions.length)
        console.log("💸 Économies cartes cadeaux:", savingsFromGiftCards)

        const totalSavings = savingsFromCodes + savingsFromGiftCards

        console.log("💰 TOTAL ÉCONOMIES:", totalSavings)

        // 3. Récupérer le total de points gagnés
        const { data: pointsData, error: pointsError } = await supabase
            .from("customer_points")
            .select("total_points_earned")
            .eq("customer_email", email)
            .single()

        if (pointsError) {
            console.error("❌ Erreur Supabase points:", pointsError)
        }

        console.log("⭐ Points gagnés:", pointsData?.total_points_earned || 0)

        const stats = {
            totalSpent: totalSpent.toFixed(2),
            orderCount,
            averageBasket: averageBasket.toFixed(2),
            totalSavings: totalSavings.toFixed(2),
            codesPromoCount: codesPromoTransactions.length,
            giftCardsCount: giftCardsTransactions.length,
            totalPointsEarned: pointsData?.total_points_earned || 0,
            memberSince: firstOrderDate 
                ? firstOrderDate.toLocaleDateString("fr-FR", {
                    month: "long",
                    year: "numeric"
                })
                : "Nouveau membre"
        }

        console.log("✅ Stats finales:", stats)

        res.status(200).json(stats)
    } catch (error) {
        console.error("❌ Erreur get-customer-stats:", error)
        res.status(500).json({ 
            error: "Internal server error",
            details: error.message 
        })
    }
}
