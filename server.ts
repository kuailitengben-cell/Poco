import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import Stripe from "stripe";
import fs from "fs";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

dotenv.config();

// Initialize Firebase Admin securely prioritizing process.env environment variables
let projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "";
let firestoreDatabaseId = process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || "";

function isValidFirestoreDbId(id: string | undefined | null): boolean {
  if (!id) return false;
  if (id === '(default)') return true;
  return /^[a-z][a-z0-9-]{3,62}$/.test(id);
}

// If the environment-provided ID is invalid (e.g. Google Analytics ID 'G-...'), reset it
if (!isValidFirestoreDbId(firestoreDatabaseId)) {
  firestoreDatabaseId = "";
}

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const configRaw = fs.readFileSync(configPath, "utf-8");
    const parsedConfig = JSON.parse(configRaw);
    if (!projectId && parsedConfig.projectId) {
      projectId = parsedConfig.projectId;
    }
    if (!firestoreDatabaseId && parsedConfig.firestoreDatabaseId && isValidFirestoreDbId(parsedConfig.firestoreDatabaseId)) {
      firestoreDatabaseId = parsedConfig.firestoreDatabaseId;
    }
  }
} catch (configErr) {
  console.warn("Failed to read firebase-applet-config.json for admin initialization:", configErr);
}

// Global hardcoded defaults as last-resort fallback
if (!projectId) {
  projectId = "involuted-aura-807pf";
}
if (!firestoreDatabaseId) {
  firestoreDatabaseId = "ai-studio-bbb466ec-d3c9-4c86-afe5-402bb0588ae0";
}

const adminApps = getApps();
const adminApp = adminApps.find(app => app.name === "admin-backend") || initializeApp({
  projectId: projectId,
}, "admin-backend");

const adminDb = getFirestore(adminApp, firestoreDatabaseId);

// Standard BOTS structures for Jimitchi
const BOTS = [
  {
    uid: "bot_tanaka",
    displayName: "田中@年中布団コアラ",
    photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=tanaka",
    bio: "【地味っち公式BOT】布団から這い出ることが生きがい、のはずが毎日這い出せなくなっているコアラ。風呂めんどい協会会員。",
    coins: 12000,
    equippedBadges: ["early_adopter", "mindfulness_master"]
  },
  {
    uid: "bot_yuka",
    displayName: "ゆかちん@充電1%勝負",
    photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=yuka",
    bio: "【地味っち公式BOT】スマホ充電を1%でどれだけ長く稼働させられるかに命を燃やすスリルジャンキー。よく靴下を片方なくす。",
    coins: 8500,
    equippedBadges: ["streak_superstar"]
  },
  {
    uid: "bot_satoshy",
    displayName: "サトシ@風呂お断り",
    photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=satoshy",
    bio: "【地味っち公式BOT】夜の入浴タイミングを最大限サボる方法を研究中。「めんどい」が世界を救うと信じている。",
    coins: 9800,
    equippedBadges: ["cosmic_explorer"]
  },
  {
    uid: "bot_jimi_taro",
    displayName: "じみ太郎@宿題先延ばし",
    photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=jimi_taro",
    bio: "【地味っち公式BOT】今できることを絶対に明日以降に回すプロフェッショナル。お惣菜を冷蔵庫の奥地で化石化させるのが得意。",
    coins: 15000,
    equippedBadges: ["community_pillar"]
  },
  {
    uid: "bot_sleepy_mimi",
    displayName: "みみ@夜更かしプリンセス",
    photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=mimi",
    bio: "【地味っち公式BOT】特にすることもないのに深夜2時に虚無スマホしている住人。片耳イヤホンのスペアを探し続けている。",
    coins: 7100,
    equippedBadges: ["insight_pioneer"]
  }
];

const LOCAL_BOT_TEMPLATES: Record<string, {
  scenes: { title: string; content: string; category: string; hashtags: string[]; matchedStockId: string | null; explanation: string | null }[];
  comments: string[];
  surveys: string[];
}> = {
  bot_tanaka: {
    scenes: [
      {
        title: "布団重力10倍の日",
        content: "朝起きたら布団の重力がいつもの10倍くらいになってて、さすがに脱出不能。コアラとしての本能かもしれない…誰か引っ張って。",
        category: "Everyday",
        hashtags: ["布団から出られない", "コアラ化"],
        matchedStockId: "futon_escape",
        explanation: "🛌 コアラの本能によって布団重力が10倍に増幅！急激に布団脱出が困難になった模様。"
      },
      {
        title: "お風呂との心理戦",
        content: "帰宅してからお風呂に入るまでの時間、だいたい2時間くらいスマホ見ながら『入らなきゃ…』って瞑想してる。この時間が一番疲れる説。",
        category: "Home",
        hashtags: ["風呂めんどい", "心理戦"],
        matchedStockId: "furo_mendoi",
        explanation: "🛀 帰宅後の風呂待ち瞑想が限界を突破！心理的なめんどくささ指数が急降下。"
      }
    ],
    comments: [
      "それなすぎるwww 私も今まさに布団の中からこのコメント打ってる😴",
      "風呂めんどい同盟の会員として、その気持ち痛いほど分かります…！",
      "今からお風呂入るボタン、誰か代わりに押して！",
      "地球の重力、全部布団に集まってない？",
      "諦めて布団と一緒に生活しよ？"
    ],
    surveys: [
      "朝起きてから布団を出るまでに15分以上ゴロゴロしますか？",
      "お風呂入る前に最低1時間はスマホで瞑想してしまう？"
    ]
  },
  bot_yuka: {
    scenes: [
      {
        title: "1%の限界突破",
        content: "充電1%になってから、画面の明るさ極限まで下げてどこまでSNS見れるか耐久チキンレース。このスリルがたまらん。",
        category: "Everyday",
        hashtags: ["充電1パーセント", "チキンレース"],
        matchedStockId: "charge_1percent",
        explanation: "🔌 充電1%でのチキンレースが開催中！スリルジャンキーの買い圧力が強まっています。"
      },
      {
        title: "靴下異空間失踪事件",
        content: "洗濯機から出すと、なぜか毎回靴下が片方だけ消えてる。うちの洗濯機、裏側が異世界に繋がってる気がするんだけど仲間いる？",
        category: "Home",
        hashtags: ["靴下失踪", "異世界洗濯機"],
        matchedStockId: "socks_lost",
        explanation: "🧦 靴下の片方消失アノマリーが発生！ランドリーでの失踪案件が急増中。"
      }
    ],
    comments: [
      "スマホ充電1%のスリルに比べれば、日常のやらかしなんて可愛いもんだよ！🔌",
      "うちの靴下も絶対異次元に吸い込まれてる。今度一緒に捜索隊組もう🧦",
      "私も今ちょうど片方の靴下探しながらコメント読んでるw",
      "充電1%はまだいける！私の体感では5分はもつ！",
      "それ、充電0%の瞬間に心臓バクバクするやつですねw"
    ],
    surveys: [
      "スマホの充電が10%以下でも「まぁいっか」と外出できる？",
      "洗濯すると靴下が片方だけ行方不明になる現象、よくある？"
    ]
  },
  bot_satoshy: {
    scenes: [
      {
        title: "風呂キャン界のプロ",
        content: "お風呂入るのめんどくさすぎて、気づいたら夜中の2時。もう『明日、朝シャワーを浴びる自分』を全幅の信頼で信じることにした。",
        category: "Home",
        hashtags: ["風呂キャンセル界隈", "明日の自分"],
        matchedStockId: "furo_mendoi",
        explanation: "🛀 風呂キャンセルアノマリー発動！明日の朝シャワー浴びる自分への絶対的信頼感。"
      },
      {
        title: "めんどいの力",
        content: "人間、めんどくさいと思い始めたらリモコン取るのすら超能力使いたくなる。このめんどいパワーが世界を救うんじゃないか？",
        category: "Everyday",
        hashtags: ["めんどい", "超能力希望"],
        matchedStockId: "homework_pro",
        explanation: "✏️ めんどくさいタスクの最長先延ばし記録が更新されました！"
      }
    ],
    comments: [
      "風呂キャンは立派な現代サボりスキル。朝の自分にすべてを託そう！🛀",
      "めんどくさいは、人類が進化するために必要な感情だからセーフ！！",
      "風呂入るくらいなら、布団と友達になった方が有意義な時間過ごせる説",
      "お風呂の準備を自動でやってくれるロボット、誰かJ-Coinで売ってくれ😭",
      "明日やろうは、馬鹿野郎じゃなくて『天才の先延ばし』だよな！"
    ],
    surveys: [
      "帰宅後、1秒でも早くお風呂に入れますか？（めんどくさい？）",
      "「明日の自分がやってくれる」と信じてタスクを放置しがち？"
    ]
  },
  bot_jimi_taro: {
    scenes: [
      {
        title: "冷蔵庫の古代遺跡",
        content: "冷蔵庫の奥から賞味期限が3ヶ月前の未開封プリンが出てきた。もはやプリンじゃなくて古代の地層から発掘された美しき化石。",
        category: "Food",
        hashtags: ["化石プリン", "冷蔵庫忘却"],
        matchedStockId: "refrigerator_forget",
        explanation: "🍎 冷蔵庫深部で謎 of 謎の遺跡（プリン）が発掘されました。食品忘却による時価総額上昇。"
      },
      {
        title: "先延ばしギネス記録",
        content: "『明日こそ本気出す』と言い続けて15年。私の本気はまだ温存中。先延ばしすぎて、もはやギネスに載ってもいいレベル。",
        category: "Everyday",
        hashtags: ["本気は明日から", "先延ばし"],
        matchedStockId: "homework_pro",
        explanation: "✏️ 宿題・先延ばしプロが15年連続で本気温存宣言！買い相場継続。"
      }
    ],
    comments: [
      "先延ばしのプロとして、そのやらかしは非常に共感できる（宿題放置中）",
      "冷蔵庫の奥は本当に未知の遺跡。たまに発掘調査するとビビるよね…化石プリン…",
      "まだ本気出してないだけだから！明日から本気出せば全部解決するから！",
      "プリンの化石は流石に草。胃袋の耐久力テストしてみる？",
      "私も今、やるべきタスクを横目に見ながらこのアプリをスクロールしてるw"
    ],
    surveys: [
      "冷蔵庫の奥地で化石化（腐らせる等）させた食べ物がある？",
      "学校や仕事の課題・提出物を締切5分前まで放置したことがある？"
    ]
  },
  bot_sleepy_mimi: {
    scenes: [
      {
        title: "深夜2時の虚無スマホ",
        content: "特に見たい情報もないのに、深夜2時に延々とショート動画をスクロールしてしまうあの現象に名前をつけたい。虚無すぎる。",
        category: "Everyday",
        hashtags: ["夜更かし", "虚無スマホ"],
        matchedStockId: "yofukashi_late",
        explanation: "🌙 深夜2時の極限虚無スマホ現象が活発化！夜更かし指数の急騰を検知。"
      },
      {
        title: "片耳イヤホンの謎",
        content: "Bluetoothイヤホンの左耳だけが、部屋のどこかに永遠に姿を消した。右耳だけでステレオ放送を聴く寂しさを誰か共有しよう。",
        category: "Everyday",
        hashtags: ["片耳イヤホン", "ワイヤレスの罠"],
        matchedStockId: "single_earbud",
        explanation: "🎧 片耳イヤホン異次元吸い込み事象が発生。スペア探索市場が急伸中。"
      }
    ],
    comments: [
      "深夜2時に意味もなくスクロールしてる同士を発見！早く寝ろ私w📱",
      "片耳イヤホンの悲劇はつらい。私は左耳を3回なくして諦めました…",
      "虚無スマホ中に地味話に遭遇すると、地味に救われた気分になるね⭐",
      "今ちょうど深夜1時半。何もしてないけど、寝るのがもったいないのよね",
      "片耳だけでいいから、お互いのスペアをフュージョンさせたいw"
    ],
    surveys: [
      "特に何も見たいわけでもなく、深夜にスマホを20分以上巡回してしまう？",
      "ワイヤレスイヤホンを片方だけなくしたことがある？"
    ]
  }
};

const JSE_STOCK_IDS = [
  "furo_mendoi",
  "homework_pro",
  "futon_escape",
  "charge_1percent",
  "socks_lost",
  "refrigerator_forget",
  "yofukashi_late",
  "test_panic",
  "key_disappear",
  "single_earbud",
  "late_dash"
];

async function ensureBotProfiles(db: any) {
  try {
    for (const bot of BOTS) {
      const docRef = db.collection("profiles").doc(bot.uid);
      const snap = await docRef.get();
      if (!snap.exists) {
        console.log(`[BOT SEED] Creating bot profile for ${bot.displayName}...`);
        await docRef.set({
          displayName: bot.displayName,
          photoURL: bot.photoURL,
          bio: bot.bio,
          coins: bot.coins,
          shards: 10,
          equippedBadges: bot.equippedBadges,
          unlockedBadgeIds: bot.equippedBadges,
          registeredAt: FieldValue.serverTimestamp(),
          isBot: true
        });
      }
    }
  } catch (err) {
    console.error("Failed to ensure BOT profiles:", err);
  }
}

async function simulateRandomAction(db: any, ai: GoogleGenAI) {
  try {
    const bot = BOTS[Math.floor(Math.random() * BOTS.length)];
    const roll = Math.random();
    console.log(`[BOT TICK] Preparing action for ${bot.displayName} (Roll: ${roll.toFixed(3)})`);

    if (roll < 0.15) {
      // 1. Post a scene (Scene Creation) - Reduced posting frequency
      console.log(`[BOT ACTION] Creating Scene...`);
      const prompt = `You are simulating a user on 'Jimitchi' (a social network for highly relatable, mundane, everyday failures and thoughts in Japan).
Write an authentic post matching your persona of "${bot.displayName}" whose bio is: "${bot.bio}".
The post must share a tiny, hilarious everyday struggle or failure that is deeply sympathetic (あるある・小さなやらかし).

Important constraints:
- Use natural, modern Japanese (internet slang/emoji is good, but keep it organic).
- Create a short, witty title (under 20 characters).
- Create funny, relatable post content (under 130 characters).
- Output categories must match one of: 'Everyday', 'Work', 'School', 'Home', 'Food', 'Love'.
- Include 1 to 2 fitting hashtags (string, starting with '#').

Output ONLY raw JSON format matching this schema (do NOT surround it with markdown triple backticks or any dialog):
{
  "title": "Title here",
  "content": "Content here",
  "category": "Everyday",
  "hashtags": ["#tag1", "#tag2"]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      let text = (response.text || "").trim();
      if (text.includes("```")) {
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      }

      const parsed = JSON.parse(text);
      const sceneId = "scene_bot_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

      await db.collection("scenes").doc(sceneId).set({
        title: parsed.title,
        content: parsed.content,
        category: parsed.category || "Everyday",
        hashtags: (parsed.hashtags || []).map((h: string) => h.replace("#", "").trim().toLowerCase()),
        authorId: bot.uid,
        authorName: bot.displayName,
        authorPhoto: bot.photoURL,
        createdAt: FieldValue.serverTimestamp(),
        upvotes: 0,
        views: 0,
        commentCount: 0,
        profileVisits: 0,
        isBot: true
      });

      console.log(`[BOT ACTION] Scene Published by Bot: "${parsed.title}"`);

      // Automate stock-market alignment / JSE report creation
      const alignPrompt = `
You are a JSE (Jimi Stock Exchange) algorithmic indexing AI. Determine if this new post belongs to one of the following listed phenomenon stock IDs:
- furo_mendoi: 🛀 風呂めんどい (Avoiding bath/shower)
- homework_pro: ✏️ 宿題先延ばし (Postponing chores/tasks/homework)
- futon_escape: 🛌 布団から出られない (Can't get out of warm bed)
- charge_1percent: 🔌 充電1%チャレンジ (Surviving on 1% battery)
- socks_lost: 🧦 靴下片方消失 (Socks disappearing in laundry)
- refrigerator_forget: 🍎 冷蔵庫忘却 (Forgotten rotten food inside fridge)
- yofukashi_late: 🌙 なんとなく夜更かし (Staying up late unproductive)
- test_panic: 📝 テスト前焦り (Cramming panic before exams)
- key_disappear: 🔑 鍵どこだっけ (Losing keys right before departure)
- single_earbud: 🎧 片耳イヤホン (Missing or utilizing single-earbud)
- late_dash: 🏃 遅刻ギリギリダッシュ (Racing fully because of alarm fails)

Title: "${parsed.title}"
Content: "${parsed.content}"

If it matched strongly, return a JSON format with:
{
  "matchedStockId": "furo_mendoi",
  "explanation": "concise Japanese financial-flash comment string under 50 chars starting with emoji"
}
Otherwise return both as null. Return ONLY RAW JSON. No backticks.
`;

      const alignRes = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: alignPrompt
      });

      let alignText = (alignRes.text || "").trim();
      if (alignText.includes("```")) {
        alignText = alignText.replace(/```json/g, "").replace(/```/g, "").trim();
      }

      try {
        const alignParsed = JSON.parse(alignText);
        if (alignParsed && alignParsed.matchedStockId) {
          console.log(`[BOT ACTION] JSE Match detected: ${alignParsed.matchedStockId}`);
          await db.collection("jse_reports").add({
            stockId: alignParsed.matchedStockId,
            explanation: alignParsed.explanation || `「${parsed.title}」の投稿が検知されました。`,
            postId: sceneId,
            postTitle: parsed.title,
            authorName: bot.displayName,
            createdAt: FieldValue.serverTimestamp()
          });
        }
      } catch (e) {
        console.warn("Failed to parse automatic BOT stock auto-alignment:", e);
      }

    } else if (roll < 0.60) {
      // 2. JSE Trade (replaces comments and covers larger probability space)
      console.log(`[BOT ACTION] Performing JSE Trade...`);
      const stockId = JSE_STOCK_IDS[Math.floor(Math.random() * JSE_STOCK_IDS.length)];
      const qty = Math.floor(Math.random() * 80) + 10;
      const type = Math.random() < 0.65 ? "buy" : "sell";

      await db.collection("jse_global_trades").add({
        stockId: stockId,
        qty: qty,
        type: type,
        userId: bot.uid,
        createdAt: FieldValue.serverTimestamp()
      });

      console.log(`[BOT ACTION] JSE Trade: ${bot.displayName} executed ${type} of ${qty} ${stockId}`);

    } else if (roll < 0.90) {
      // 4. Upvote a post
      console.log(`[BOT ACTION] Upvoting Post...`);
      const scenesSnap = await db.collection("scenes").orderBy("createdAt", "desc").limit(15).get();
      if (scenesSnap.empty) return;

      const validDocs = scenesSnap.docs.filter(d => d.data().authorId !== bot.uid);
      if (validDocs.length === 0) return;

      const chosenDoc = validDocs[Math.floor(Math.random() * validDocs.length)];
      const key = `${bot.uid}_${chosenDoc.id}`;

      const voteRef = db.collection("upvotes").doc(key);
      const voteSnap = await voteRef.get();

      if (!voteSnap.exists) {
        await voteRef.set({
          userId: bot.uid,
          sceneId: chosenDoc.id,
          createdAt: FieldValue.serverTimestamp()
        });

        await chosenDoc.ref.update({
          upvotes: FieldValue.increment(1)
        });

        console.log(`[BOT ACTION] Upvoted: ${bot.displayName} upvoted "${chosenDoc.data().title}"`);
      }

    } else {
      // 5. Plaza Interaction
      console.log(`[BOT ACTION] Plaza activity...`);
      const surveysSnap = await db.collection("plaza_surveys").orderBy("createdAt", "desc").limit(6).get();
      
      if (!surveysSnap.empty && Math.random() < 0.70) {
        // Vote
        const chosenDoc = surveysSnap.docs[Math.floor(Math.random() * surveysSnap.docs.length)];
        const voteRef = chosenDoc.ref.collection("votes").doc(bot.uid);
        const voteSnap = await voteRef.get();
        if (!voteSnap.exists) {
          const choice = Math.random() < 0.58 ? "yes" : "no";
          await voteRef.set({
            choice: choice,
            votedAt: FieldValue.serverTimestamp()
          });

          await chosenDoc.ref.update({
            [choice === "yes" ? "yesVotes" : "noVotes"]: FieldValue.increment(1)
          });
          console.log(`[BOT ACTION] Voted on plaza survey "${chosenDoc.data().question}" with: ${choice}`);
        }
      } else {
        // Create new survey
        const srvPrompt = `Write a lighthearted yes/no question about a funny everyday struggle or weird habit for a Japanese social app survey. Keep it short (under 50 chars).
Return ONLY the raw question text, no explanation or formatting or quotes.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: srvPrompt
        });

        const quest = (response.text || "").trim().replace(/^"/, "").replace(/"$/, "");
        if (quest) {
          await db.collection("plaza_surveys").add({
            question: quest,
            authorId: bot.uid,
            authorName: bot.displayName,
            authorPhoto: bot.photoURL,
            yesVotes: 0,
            noVotes: 0,
            createdAt: FieldValue.serverTimestamp()
          });
          console.log(`[BOT ACTION] Created new Plaza Survey: "${quest}"`);
        }
      }
    }
  } catch (err) {
    console.error("Error running BOT actions simulation:", err);
  }
}

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
    app.post("/api/admin/trigger-bot", async (req, res) => {
      try {
        const { recentScenes, recentSurveys, botId } = req.body;
        
        // Pick specific or random Bot
        let bot = BOTS.find(b => b.uid === botId);
        if (!bot) {
          bot = BOTS[Math.floor(Math.random() * BOTS.length)];
        }
        const roll = Math.random();
        
        const templates = LOCAL_BOT_TEMPLATES[bot.uid] || LOCAL_BOT_TEMPLATES.bot_tanaka;

        if (roll < 0.15) {
          // 1. Post a scene (Scene Creation) - Reduced posting frequency
          let parsed: { title: string; content: string; category: string; hashtags: string[] } = {
            title: "",
            content: "",
            category: "Everyday",
            hashtags: []
          };
          let matchedStockId: string | null = null;
          let explanation: string | null = null;

          const existingTitles = new Set((recentScenes || []).map((s: any) => s.title?.trim().toLowerCase()).filter(Boolean));
          const existingContents = new Set((recentScenes || []).map((s: any) => s.content?.trim().toLowerCase()).filter(Boolean));
          const avoidList = (recentScenes || []).map((s: any) => s.title).filter(Boolean);
          const avoidStr = avoidList.slice(0, 30).join("、");

          try {
            const prompt = `You are simulating a user on 'Jimitchi' (a social network for highly relatable, mundane, everyday failures and thoughts in Japan).
Write an authentic post matching your persona of "${bot.displayName}" whose bio is: "${bot.bio}".
The post must share a tiny, hilarious everyday struggle or failure that is deeply sympathetic (あるある・小さなやらかし).

Important constraints:
- Use natural, modern Japanese (internet slang/emoji is good, but keep it organic).
- Create a short, witty title (under 20 characters).
- Create funny, relatable post content (under 130 characters).
- Output categories must match one of: 'Everyday', 'Work', 'School', 'Home', 'Food', 'Love'.
- Include 1 to 2 fitting hashtags (string, starting with '#').
- Crucial: Do NOT write any post with a title similar to these already existing posts: [${avoidStr || "なし"}].

Output ONLY raw JSON format matching this schema (do NOT surround it with markdown triple backticks or any dialog):
{
  "title": "Title here",
  "content": "Content here",
  "category": "Everyday",
  "hashtags": ["#tag1", "#tag2"]
}`;

            const response = await ai.models.generateContent({
              model: "gemini-3.5-flash",
              contents: prompt
            });

            let text = (response.text || "").trim();
            if (text.includes("```")) {
              text = text.replace(/```json/g, "").replace(/```/g, "").trim();
            }

            parsed = JSON.parse(text);

            // Double check for duplicate title/content in generated result
            if (existingTitles.has(parsed.title?.trim().toLowerCase()) || existingContents.has(parsed.content?.trim().toLowerCase())) {
              console.warn(`[BOT REPEAT WATCH] Gemini generated a duplicate post ("${parsed.title}"). Swapping to unused local template.`);
              throw new Error("Duplicate generated post detected");
            }
            
            // Stock Alignment AI
            try {
              const alignPrompt = `
You are a JSE (Jimi Stock Exchange) algorithmic indexing AI. Determine if this new post belongs to one of the following listed phenomenon stock IDs:
- furo_mendoi: 🛀 風呂めんどい (Avoiding bath/shower)
- homework_pro: ✏️ 宿題先延ばし (Postponing chores/tasks/homework)
- futon_escape: 🛌 布団から出られない (Can't get out of warm bed)
- charge_1percent: 🔌 充電1%チャレンジ (Surviving on 1% battery)
- socks_lost: 🧦 靴下片方消失 (Socks disappearing in laundry)
- refrigerator_forget: 🍎 冷蔵庫忘却 (Forgotten rotten food inside fridge)
- yofukashi_late: 🌙 なんとなく夜更かし (Staying up late unproductive)
- test_panic: 📝 テスト前焦り (Cramming panic before exams)
- key_disappear: 🔑 鍵どこだっけ (Losing keys right before departure)
- single_earbud: 🎧 片耳イヤホン (Missing or utilizing single-earbud)
- late_dash: 🏃 遅刻ギリギリダッシュ (Racing fully because of alarm fails)

Title: "${parsed.title}"
Content: "${parsed.content}"

If it matched strongly, return a JSON format with:
{
  "matchedStockId": "furo_mendoi",
  "explanation": "concise Japanese financial-flash comment string under 50 chars starting with emoji"
}
Otherwise return both as null. Return ONLY RAW JSON. No backticks.
`;

              const alignRes = await ai.models.generateContent({
                model: "gemini-3.5-flash",
                contents: alignPrompt
              });

              let alignText = (alignRes.text || "").trim();
              if (alignText.includes("```")) {
                alignText = alignText.replace(/```json/g, "").replace(/```/g, "").trim();
              }

              const alignParsed = JSON.parse(alignText);
              if (alignParsed && alignParsed.matchedStockId) {
                matchedStockId = alignParsed.matchedStockId;
                explanation = alignParsed.explanation;
              }
            } catch (e) {
              console.warn("AI alignment failed, continuing without stock tag:", e);
            }
          } catch (apiErr) {
            console.warn("Gemini API error/repeat or limit at trigger-bot (scene), falling back to unused local template:", apiErr);
            const availableScenes = templates.scenes.filter(s => 
              !existingTitles.has(s.title.trim().toLowerCase()) && 
              !existingContents.has(s.content.trim().toLowerCase())
            );

            const chosenScene = availableScenes.length > 0 
              ? availableScenes[Math.floor(Math.random() * availableScenes.length)]
              : templates.scenes[Math.floor(Math.random() * templates.scenes.length)];

            parsed = {
              title: chosenScene.title,
              content: chosenScene.content,
              category: chosenScene.category,
              hashtags: chosenScene.hashtags
            };
            matchedStockId = chosenScene.matchedStockId;
            explanation = chosenScene.explanation;
          }

          return res.json({
            success: true,
            actionType: "scene",
            bot,
            data: {
              title: parsed.title,
              content: parsed.content,
              category: parsed.category || "Everyday",
              hashtags: (parsed.hashtags || []).map((h: string) => h.replace("#", "").trim().toLowerCase()),
              matchedStockId,
              explanation
            }
          });
        } else if (roll < 0.60) {
          // 2. JSE Trade (replaces comments and covers larger probability space)
          const stockId = JSE_STOCK_IDS[Math.floor(Math.random() * JSE_STOCK_IDS.length)];
          const qty = Math.floor(Math.random() * 80) + 10;
          const type = Math.random() < 0.65 ? "buy" : "sell";

          return res.json({
            success: true,
            actionType: "jse_trade",
            bot,
            data: {
              stockId,
              qty,
              type
            }
          });
        } else if (roll < 0.82) {
          // 3. Upvote a post
          const scenes = recentScenes || [];
          const validScenes = scenes.filter((s: any) => s.authorId !== bot.uid);
          if (validScenes.length === 0) {
            return res.json({ success: false, reason: "No target scenes for upvote" });
          }

          const chosenScene = validScenes[Math.floor(Math.random() * validScenes.length)];
          return res.json({
            success: true,
            actionType: "upvote",
            bot,
            targetSceneId: chosenScene.id,
            targetSceneTitle: chosenScene.title
          });
        } else if (roll < 0.93) {
          // 4. Kairanban (Circulate) - Always cheapest (20 coins) to prevent economic crash
          const scenes = recentScenes || [];
          const validScenes = scenes.filter((s: any) => s.authorId !== bot.uid);
          if (validScenes.length === 0) {
            return res.json({ success: false, reason: "No target scenes for kairanban" });
          }

          const chosenScene = validScenes[Math.floor(Math.random() * validScenes.length)];
          return res.json({
            success: true,
            actionType: "kairanban",
            bot,
            targetSceneId: chosenScene.id,
            targetSceneTitle: chosenScene.title,
            data: {
              coinsSpent: 20
            }
          });
        } else {
          // 6. Plaza Interaction (Vote or Survey)
          const surveys = recentSurveys || [];
          if (surveys.length > 0 && Math.random() < 0.70) {
            const chosenSurvey = surveys[Math.floor(Math.random() * surveys.length)];
            const choice = Math.random() < 0.58 ? "yes" : "no";
            return res.json({
              success: true,
              actionType: "plaza_vote",
              bot,
              targetSurveyId: chosenSurvey.id,
              targetSurveyQuestion: chosenSurvey.question,
              data: {
                choice
              }
            });
          } else {
            // Create new survey
            let quest = "";
            try {
              const srvPrompt = `Write a lighthearted yes/no question about a funny everyday struggle or weird habit for a Japanese social app survey. Keep it short (under 50 chars).
Return ONLY the raw question text, no explanation or formatting or quotes.`;

              const response = await ai.models.generateContent({
                model: "gemini-3.5-flash",
                contents: srvPrompt
              });

              quest = (response.text || "").trim().replace(/^"/, "").replace(/"$/, "");
            } catch (apiErr) {
              console.warn("Gemini API error or limit at trigger-bot (survey), falling back to local template:", apiErr);
              quest = templates.surveys[Math.floor(Math.random() * templates.surveys.length)];
            }

            if (!quest) {
              quest = templates.surveys[Math.floor(Math.random() * templates.surveys.length)];
            }

            return res.json({
              success: true,
              actionType: "plaza_survey",
              bot,
              data: {
                question: quest
              }
            });
          }
        }
      } catch (err: any) {
        console.error("Critical error in trigger-bot endpoint fallback:", err);
        // Absolute fail-safe fallback to prevent 500 error and keep simulation seamless
        const bot = BOTS[Math.floor(Math.random() * BOTS.length)];
        const templates = LOCAL_BOT_TEMPLATES[bot.uid] || LOCAL_BOT_TEMPLATES.bot_tanaka;
        const randScene = templates.scenes[Math.floor(Math.random() * templates.scenes.length)];
        return res.json({
          success: true,
          actionType: "scene",
          bot,
          data: {
            title: randScene.title,
            content: randScene.content,
            category: randScene.category,
            hashtags: randScene.hashtags,
            matchedStockId: randScene.matchedStockId,
            explanation: randScene.explanation
          }
        });
      }
    });

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

    app.post("/api/suggest-tags", async (req, res) => {
      try {
        const { title, content, availableTags } = req.body;
        if (!title || !content || !Array.isArray(availableTags)) {
          return res.status(400).json({ error: "Missing title, content, or availableTags" });
        }

        if (availableTags.length === 0) {
          return res.json({ suggestions: [] });
        }

        const tagsListStr = availableTags.map(t => `"${t}"`).join(", ");

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `You are an expert at analyzing daily life observations (地味な日常の現象) and categorizing them.
Based on the following custom observation categories (KAIWANs):
[${tagsListStr}]

And the user's post content:
Title: "${title}"
Content: "${content}"

Select up to 3 categories from the provided list that are most relevant to the post.
Your answer MUST be a raw JSON array containing ONLY the selected categories, exactly matching the strings in the list. Do not include any other markdown formatting or code blocks outside of the brackets.
Example output: ["学校", "コンビニ", "一人暮らし"]`
        });

        const text = response.text || "[]";
        const jsonMatch = text.match(/\[.*\]/s);
        const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

        // Ensure suggestions are part of the original tags
        const validSuggestions = suggestions.filter((s: string) => availableTags.includes(s));

        res.json({ suggestions: validSuggestions });
      } catch (error) {
        console.error("Gemini Suggest Tags Error:", error);
        res.status(500).json({ error: "Failed to suggest tags" });
      }
    });

    app.post("/api/analyze-post-stock", async (req, res) => {
      try {
        const { title, content } = req.body;
        if (!title || !content) {
          return res.status(400).json({ error: "Missing title or content" });
        }

        const promptText = `
You are a JSE (Jimi Stock Exchange) algorithmic indexing AI. JSE lists these specific phenomenon stock IDs with their emojis and descriptions:
- furo_mendoi: 🛀 風呂めんどい (Taking a bath is hassle / avoiding shower)
- homework_pro: ✏️ 宿題先延ばし (Postponing homework or tasks / cramming at the last minute)
- futon_escape: 🛌 布団から出られない (Can't get out of futon / sleepy morning cocooning)
- charge_1percent: 🔌 充電1%チャレンジ (Surviving on 1% battery / low battery thrill)
- socks_lost: 🧦 靴下片方消失 (One sock gone missing / laundry portals)
- refrigerator_forget: 🍎 冷蔵庫忘却 (Forgot something bought or hidden inside refrigerator until it spoiled)
- yofukashi_late: 🌙 なんとなく夜更かし (Staying up late doing absolutely nothing productive)
- test_panic: 📝 テスト前焦り (Panic study the night before exam / pretending everything is fine)
- key_disappear: 🔑 鍵どこだっけ (Losing keys right before leaving)
- single_earbud: 🎧 片耳イヤホン (Using/misplacing only one side of earbud)
- late_dash: 🏃 遅刻ギリギリダッシュ (Running like crazy because of oversleeping)

Review the following post written by a user:
Title: "${title}"
Content: "${content}"

Your job is to determine if the post content closely matches or strongly relates semantically to one of the stock items listed above.
If there is a match, return a JSON object with:
- "matchedStockId": the matching stock ID from the list above (e.g. "furo_mendoi").
- "explanation": a concise Japanese headline describing the match in a lively, dramatic financial-news style, starting with a suitable emoji (e.g., "🛀 深夜の入浴拒否アノマリーが発生！実生活での『めんどくささ』が上限を突破した模様。")

If there is no close match, return:
- "matchedStockId": null
- "explanation": null

Return ONLY raw JSON, nothing else. If you wrap it in markdown codeblocks, use \`\`\`json ... \`\`\`.
`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptText
        });

        let text = response.text || "{}";
        if (text.includes("```")) {
          text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        }

        let parsed = { matchedStockId: null, explanation: null };
        try {
          const jsonMatch = text.match(/\{.*\}/s);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
        } catch (e) {
          console.error("Failed to parse stock analysis response:", text, e);
        }

        res.json(parsed);
      } catch (error) {
        console.error("Post stock analysis error:", error);
        res.status(500).json({ error: "Failed to analyze post stock alignment" });
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
        const scenesUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${firestoreDatabaseId}/documents/scenes?pageSize=200`;
        
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
        const postUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${firestoreDatabaseId}/documents/scenes/${postId}`;
        
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

     app.listen(PORT, "0.0.0.0", async () => {
      console.log(`Server successfully running on http://0.0.0.0:${PORT}`);
      console.log("[BOT BOOT] Seeding and activity are now securely managed via front-end admin dashboard.");
    });
  } catch (err) {
    console.error("FAILED TO START SERVER:", err);
    process.exit(1);
  }
}

startServer();
