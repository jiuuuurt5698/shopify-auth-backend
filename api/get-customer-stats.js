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

        // Calcul total dépensé et nombre de commandes
        const totalSpent = orders.reduce((sum, { node }) => {
            return sum + parseFloat(node.totalPriceSet.shopMoney.amount)
        }, 0)
        const orderCount = orders.length
        const averageBasket = orderCount > 0 ? totalSpent / orderCount : 0

        // Date de première commande
        const firstOrderDate = orders.length > 0 
            ? new Date(orders[orders.length - 1].node.createdAt)
            : null

        // 2. Récupérer les transactions (codes promo + cartes cadeaux)
        const { data: transactions } = await supabase
            .from("transactions")
            .select("*")
            .eq("customer_email", email)
            .order("created_at", { ascending: false })

        // Calcul des économies
        const codesPromoUsed = transactions?.filter(t => 
            t.type === "discount_code_generated" && t.points < 0
        ) || []
        
        const giftCardsRedeemed = transactions?.filter(t => 
            t.type === "gift_card_redeemed"
        ) || []

        const savingsFromCodes = codesPromoUsed.reduce((sum, t) => {
            return sum + Math.abs(t.points) / 10 // 10 points = 1€
        }, 0)

        const savingsFromGiftCards = giftCardsRedeemed.length * 10 // Estimation moyenne

        const totalSavings = savingsFromCodes + savingsFromGiftCards

        // 3. Récupérer le total de points gagnés
        const { data: pointsData } = await supabase
            .from("customer_points")
            .select("total_points_earned")
            .eq("customer_email", email)
            .single()

        const stats = {
            totalSpent: totalSpent.toFixed(2),
            orderCount,
            averageBasket: averageBasket.toFixed(2),
            totalSavings: totalSavings.toFixed(2),
            codesPromoCount: codesPromoUsed.length,
            giftCardsCount: giftCardsRedeemed.length,
            totalPointsEarned: pointsData?.total_points_earned || 0,
            memberSince: firstOrderDate 
                ? firstOrderDate.toLocaleDateString("fr-FR", {
                    month: "long",
                    year: "numeric"
                })
                : "Nouveau membre"
        }

        res.status(200).json(stats)
    } catch (error) {
        console.error("❌ Erreur get-customer-stats:", error)
        res.status(500).json({ error: "Internal server error" })
    }
}
