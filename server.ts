import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import Stripe from "stripe";
import fs from "fs";

dotenv.config();

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function getHTMLTemplate(req: express.Request, viteInstance: any) {
  if (process.env.NODE_ENV !== "production" && viteInstance) {
    const templatePath = path.join(process.cwd(), "index.html");
    let html = await fs.promises.readFile(templatePath, "utf-8");
    html = await viteInstance.transformIndexHtml(req.originalUrl, html);
    return html;
  } else {
    const templatePath = path.join(process.cwd(), "dist", "index.html");
    return await fs.promises.readFile(templatePath, "utf-8");
  }
}

async function startServer() {
  try {
    const app = express();
    const PORT = 3000;

    app.use(express.json());

    // Gemini Setup
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not set. AI features may not work.");
    }
    const ai = new GoogleGenAI({
      apiKey: apiKey || "dummy_key",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // API Routes
    app.post("/api/generate-scene", async (req, res) => {
      try {
        const { prompt } = req.body;
        if (!prompt) {
          return res.status(400).json({ error: "Prompt is required" });
        }

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: "You are a master of 'relatable everyday moments' (地味に共感できるシーン). " +
          "Based on the user's input, generate 3 short, punchy, and highly relatable Japanese scenes. " +
          "Format: Return only a JSON array of strings. Each string should be a scene. " +
          "User input: " + prompt
        });

        const text = response.text || "[]";
        const jsonMatch = text.match(/\[.*\]/s);
        const scenes = jsonMatch ? JSON.parse(jsonMatch[0]) : [text];

        res.json({ scenes });
      } catch (error) {
        console.error("Gemini Error:", error);
        res.status(500).json({ error: "Failed to generate scenes" });
      }
    });

    // Lazy initialization of Stripe client
    let stripeClient: Stripe | null = null;
    function getStripe(): Stripe | null {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) return null;
      if (!stripeClient) {
        stripeClient = new Stripe(key, {
          apiVersion: "2023-10-16" as any, // Standard stable API version
        });
      }
      return stripeClient;
    }

    // Stripe checkout session creation
    app.post("/api/stripe/create-checkout-session", async (req, res) => {
      try {
        const { packId, userId, successUrl, cancelUrl } = req.body;
        if (!packId || !userId || !successUrl || !cancelUrl) {
          return res.status(400).json({ error: "Missing required params: packId, userId, successUrl, cancelUrl" });
        }

        const stripe = getStripe();
        if (!stripe) {
          // Send a recognizable demo code back so the client can fallback seamlessly info simulated checkout
          return res.status(200).json({
            isDemo: true,
            message: "Stripe is not configured in environment variables. Simulating payment..."
          });
        }

        let amount = 500;
        let coins = 500;
        let name = "ぷちコインパック";

        if (packId === "pack_value") {
          amount = 1000;
          coins = 1200;
          name = "お得チャージパック";
        } else if (packId === "pack_legend") {
          amount = 5000;
          coins = 6500;
          name = "極み大人買いパック";
        }

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "jpy",
                product_data: {
                  name: `地味コイン: ${name}`,
                  description: `地味っちで回せるガチャコイン ${coins} GC`,
                },
                unit_amount: amount,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          metadata: {
            packId,
            userId,
            coinsCount: String(coins),
          },
          success_url: `${successUrl}?stripe_session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: cancelUrl,
        });

        res.json({ url: session.url, isDemo: false });
      } catch (error: any) {
        console.error("Stripe Checkout Error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Verification of real Stripe session status
    app.post("/api/stripe/verify-session", async (req, res) => {
      try {
        const { sessionId } = req.body;
        if (!sessionId) {
          return res.status(400).json({ error: "sessionId is required" });
        }

        const stripe = getStripe();
        if (!stripe) {
          return res.status(400).json({ error: "Stripe is not configured on the server." });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === "paid") {
          const coins = parseInt(session.metadata?.coinsCount || "0", 10);
          const userId = session.metadata?.userId;
          const packId = session.metadata?.packId;

          res.json({
            success: true,
            coins,
            userId,
            packId,
            status: "paid"
          });
        } else {
          res.json({
            success: false,
            status: session.payment_status,
            message: "This checkout session has not been successfully completed."
          });
        }
      } catch (error: any) {
        console.error("Stripe Verify Error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    let vite: any = null;

    // robots.txt route
    app.get("/robots.txt", (req, res) => {
      const host = req.get("host");
      const robots = `User-agent: *
Allow: /

Sitemap: https://${host}/sitemap.xml
`;
      res.header('Content-Type', 'text/plain');
      res.send(robots);
    });

    // sitemap.xml route
    app.get("/sitemap.xml", async (req, res) => {
      try {
        const host = req.get("host");
        const baseUrl = `https://${host}`;
        const scenesUrl = `https://firestore.googleapis.com/v1/projects/involuted-aura-807pf/databases/ai-studio-bbb466ec-d3c9-4c86-afe5-402bb0588ae0/documents/scenes?pageSize=200`;
        
        let urls = [
          `<loc>${baseUrl}/</loc>`,
          `<loc>${baseUrl}/terms</loc>`,
          `<loc>${baseUrl}/privacy</loc>`,
          `<loc>${baseUrl}/guidelines</loc>`,
          `<loc>${baseUrl}/plaza</loc>`,
        ];

        try {
          const response = await fetch(scenesUrl);
          if (response.ok) {
            const data = await response.json();
            const documents = data.documents || [];
            for (const doc of documents) {
              const nameParts = doc.name.split("/scenes/");
              const docId = nameParts[nameParts.length - 1];
              if (docId) {
                urls.push(`<loc>${baseUrl}/post/${docId}</loc>`);
              }
            }
          }
        } catch (fetchErr) {
          console.error("Failed to fetch scenes for sitemap:", fetchErr);
        }

        const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map(url => `  <url>\n    ${url}\n    <changefreq>daily</changefreq>\n    <priority>${url.includes('/post/') ? '0.6' : '1.0'}</priority>\n  </url>`).join('\n')}
</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.send(sitemapXml);
      } catch (err) {
        console.error("Sitemap generation error:", err);
        res.status(500).send("Internal Server Error");
      }
    });

    // post/:id details route with metadata and OGP tags injection
    app.get("/post/:id", async (req, res) => {
      try {
        const postId = req.params.id;
        const postUrl = `https://firestore.googleapis.com/v1/projects/involuted-aura-807pf/databases/ai-studio-bbb466ec-d3c9-4c86-afe5-402bb0588ae0/documents/scenes/${postId}`;
        
        let title = "地味っち | 地味に共感するSNS";
        let desc = "日々の地味な出来事、小さなこだわり、どうでもいい日常を投稿して『地味な共感』を分かち合う、最高に優しいコミュニティSNS。";
        let interactionStatistic = "";
        let authorName = "地味っち";
        let hasPost = false;

        try {
          const response = await fetch(postUrl);
          if (response.ok) {
            const data = await response.json();
            const fields = data.fields || {};
            const postTitle = fields.title?.stringValue || "";
            const postContent = fields.content?.stringValue || "";
            const author = fields.authorName?.stringValue || "匿名ユーザー";
            const upvotes = parseInt(fields.upvotes?.integerValue || "0", 10);
            
            if (postTitle) {
              title = `${postTitle} | 地味っち`;
              desc = `「${postTitle}」 共感数: ${upvotes} | 地味に共感できる日常のあるある投稿。地味っちで共感しよう。`;
              authorName = author;
              hasPost = true;
              interactionStatistic = JSON.stringify({
                "@type": "InteractionCounter",
                "interactionType": "https://schema.org/LikeAction",
                "userInteractionCount": upvotes
              });
            }
          }
        } catch (fetchErr) {
          console.error("Failed to fetch post from Firestore REST API on server:", fetchErr);
        }

        let html = await getHTMLTemplate(req, vite);

        // Replace title tag
        html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHTML(title)}</title>`);

        const ogTags = `
    <meta name="description" content="${escapeHTML(desc)}" />
    <meta property="og:title" content="${escapeHTML(title)}" />
    <meta property="og:description" content="${escapeHTML(desc)}" />
    <meta property="og:type" content="article" />
    <meta property="og:image" content="https://api.dicebear.com/7.x/bottts/svg?seed=jimicchi" />
    <meta name="twitter:card" content="summary_large_image" />
    ${hasPost ? `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "DiscussionForumPosting",
      "headline": "${escapeHTML(title)}",
      "image": "https://api.dicebear.com/7.x/bottts/svg?seed=jimicchi",
      "author": {
        "@type": "Person",
        "name": "${escapeHTML(authorName)}"
      },
      "interactionStatistic": ${interactionStatistic},
      "publisher": {
        "@type": "Organization",
        "name": "地味っち"
      }
    }
    </script>
    ` : ""}
        `;

        // Insert OGP tags inside <head>
        html = html.replace("</head>", `${ogTags}</head>`);

        res.set({ "Content-Type": "text/html" }).send(html);
      } catch (err: any) {
        console.error("Post Page Render Error:", err);
        res.status(500).send("Internal Server Error");
      }
    });

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      console.log("Starting in development mode with Vite middleware...");
      vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      console.log("Starting in production mode...");
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server successfully running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("FAILED TO START SERVER:", err);
    process.exit(1);
  }
}

startServer();
