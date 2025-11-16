export default async function handler(req, res) {
    const { accessToken, first = 10 } = req.query

    console.log("🔍 Demande de commandes reçue")
    console.log("🔑 Access Token:", accessToken ? "Présent" : "Absent")

    if (!accessToken) {
        return res.status(400).json({ error: "Access token required" })
    }

    const SHOPIFY_DOMAIN = "f8bnjk-2f.myshopify.com"
    const GRAPHQL_URL = `https://${SHOPIFY_DOMAIN}/api/2024-10/graphql.json`

    const query = `
        query getOrders($customerAccessToken: String!, $first: Int!) {
            customer(customerAccessToken: $customerAccessToken) {
                orders(first: $first, reverse: true, sortKey: PROCESSED_AT) {
                    edges {
                        node {
                            id
                            orderNumber
                            processedAt
                            totalPrice { amount currencyCode }
                            fulfillmentStatus
                            lineItems(first: 10) {
                                edges {
                                    node {
                                        title
                                        quantity
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    `

    try {
        console.log("📡 Appel à Shopify GraphQL...")

        const response = await fetch(GRAPHQL_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Storefront-Access-Token": process.env.SHOPIFY_STOREFRONT_TOKEN,
            },
            body: JSON.stringify({
                query,
                variables: {
                    customerAccessToken: accessToken,
                    first: parseInt(first),
                },
            }),
        })

        const data = await response.json()

        console.log("📦 Réponse Shopify:", JSON.stringify(data, null, 2))

        if (data.errors) {
            console.error("❌ Erreur GraphQL:", data.errors)
            return res.status(400).json({ error: data.errors[0].message })
        }

        if (!data.data?.customer) {
            console.error("❌ Client introuvable")
            return res.status(404).json({ error: "Customer not found" })
        }

        const orders = data.data.customer.orders.edges.map(({ node }) => ({
            id: node.orderNumber,
            date: new Date(node.processedAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
            }),
            montant: parseFloat(node.totalPrice.amount),
            currency: node.totalPrice.currencyCode,
            statut:
                node.fulfillmentStatus === "FULFILLED"
                    ? "Livré"
                    : node.fulfillmentStatus === "PARTIAL"
                      ? "Partiellement livré"
                      : "En cours",
            produits: node.lineItems.edges
                .map(({ node: item }) => `${item.title} (x${item.quantity})`)
                .join(", "),
        }))

        console.log("✅ Nombre de commandes trouvées:", orders.length)
        res.status(200).json({ orders })
    } catch (error) {
        console.error("❌ Erreur serveur:", error)
        res.status(500).json({ error: "Internal server error" })
    }
}
