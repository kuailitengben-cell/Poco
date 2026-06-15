import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  HelpCircle, 
  Heart, 
  Award, 
  BookOpen, 
  MessageSquare, 
  ChevronRight, 
  ArrowLeft, 
  Coins, 
  Compass, 
  Smile, 
  ShieldCheck, 
  UserPlus, 
  Zap, 
  Globe
} from 'lucide-react';

interface JimiLandingPageProps {
  onBack: () => void;
  onGoToApp: () => void;
  user: any;
}

export function JimiLandingPage({ onBack, onGoToApp, user }: JimiLandingPageProps) {
  const [lang, setLang] = useState<'ja' | 'en'>('ja');

  // Translations dictionary
  const text = {
    ja: {
      siteName: "地味っち",
      siteSub: "Jimicchi",
      tagline: "「それ、わかる」という地味な幸せ。",
      subTagline: "何気ない日常の『地味な共感』を分かち合う、最高に優しい高校生発のコミュニティSNS。",
      ctaStart: "地味っちをはじめる",
      ctaViewFeed: "投稿を見に行く",
      backToApp: "アプリに戻る",
      
      // Features
      featuresTitle: "地味っちの4つの特徴",
      feature1Title: "🏆 競わない、自慢しない",
      feature1Desc: "贅沢な旅行も、ビジネスの成功も、地味っちには不要です。求められるのは「1日の終わりに靴下を脱いだ時のあの解放感」のような、取るに足らない地味なあるあるです。",
      feature2Title: "🪙 ガチャを回して楽しむ",
      feature2Desc: "他の人の「あるある」に共感（いいね）したり、自分で投稿したりすると「地味コイン(GC)」が貯まります。貯まったコインでガチャを回し、ユニークなプロフィール肩書きやアバター枠をゲットしよう！",
      feature3Title: "🗺️ 地味ひろば＆共闘クエスト",
      feature3Desc: "みんなで力を合わせる共闘クエスト、独自の回答が楽しい「人類調査アンケート」、共同執筆型の「地味文庫・地味日記」など、普通のSNSにはない遊び心が詰まっています。",
      feature4Title: "🛡️ 世界一やさしい場所",
      feature4Desc: "攻撃的な書き込みやSNS疲れを生むシステムを徹底的に排除。高校生の開発者・Pocoが運営する、実家に帰ってきたような安心感とぬくもりを大切にしています。",

      // How to Use
      howToUseTitle: "地味っちのあそびかた",
      step1Title: "1. ログイン（または匿名でお試し）",
      step1Desc: "Googleアカウントによるパスワード不要ログイン、または簡単にお試しできる匿名ログインが選べます。",
      step2Title: "2. 日常の「あるある」を投稿する",
      step2Desc: "「アラームが鳴る1分前に奇跡的に目が覚めた」「USBケーブルが1回目で刺さった」など、あなたの些細な瞬間を気軽にアウトプット。",
      step3Title: "3. 共感して、コインを貯める",
      step3Desc: "「わかる！」と思ったらオレンジの共感スタンプをポン！お互いに共感し合うことで、ガチャに使える地味コインがどんどん増えていきます。",
      step4Title: "4. ガチャ＆マイプロフィールを飾る",
      step4Desc: "ガチャから出た限定の肩書き（例：「布団の魔術師」「目覚まし無視の達人」）やバッジを装備して、自分だけの地味プロフィールを彩りましょう。",

      // Creator Section
      creatorTitle: "開発者の想い（高校生 Poco より）",
      creatorText1: "「普通のSNSって、誰かのキラキラした生活自慢や、フォロワー数・いいね数を誇示し合う場所ばかりで、なんだか疲れてしまいませんか？」",
      creatorText2: "地味っちは、そんなSNSの『競争』に疲れた人が、肩の力を抜いて、実家に帰ってきてお茶を飲んでいる時のような、ほっとした気持ちになれる場所を目指して作られた、高校生個人開発のSNSです。",
      creatorText3: "ただのWebサイトではなく、あなたの日々のがんばりや、何気ない瞬間に寄り添える『やさしいプラットフォーム』に育てていきたいと思っています。ぜひ、あなたの日常のたわいもない1幕を、そっと置いていってください。",

      // FAQ
      faqTitle: "よくあるご質問 (FAQ)",
      faq1Q: "本当に無料で使えるの？",
      faq1A: "はい、すべての基本機能（投稿・共感・ガチャ・広場）は完全に無料で遊べます。ヘビーコレクター向けのサポートとして有料コインバックも用意していますが、完全に任意です。",
      faq2Q: "他のSNSと何がちがうの？",
      faq2A: "いいね数を爆発させるための過剰演出（インフルエンサー育成など）は一切不要です。「地味だけど誰にでも当てはまる」ささやかな出来事だけをシェアし、匿名性も高く、安心して発言できます。",
      faq3Q: "安全性は大丈夫？",
      faq3A: "Firebaseによる安心確実な認証、自動パトロールや通報システム、明確な「コミュニティガイドライン」により、常に清潔でやさしい空気が保たれています。",

      // Stats
      statsLabel1: "総ユーザー数",
      statsVal1: "急増中",
      statsLabel2: "共感スタンプ",
      statsVal2: "温かく稼働中",
      statsLabel3: "ガチャ景品",
      statsVal3: "100種類以上",

      // Footer CTA
      readyTitle: "あなたの地味な今日も、誰かの笑顔に変わる。",
      enterBtn: "さっそく地味っちにアクセスする",
      orGoTxt: "または、詳細なコミュニティガイドラインを読んでみる",
    },
    en: {
      siteName: "Jimicchi",
      siteSub: "地味っち",
      tagline: "The Simple Joy of Saying 'I Get That'.",
      subTagline: "A cozy and gentle community SNS created by a high schooler, designed purely for sharing and celebrating life's funniest average moments.",
      ctaStart: "Get Started on Jimicchi",
      ctaViewFeed: "Jump into Main Feed",
      backToApp: "Back to App",
      
      // Features
      featuresTitle: "Double down on 'Understatement': 4 Epic Features",
      feature1Title: "🏆 No Showing Off, No Competition",
      feature1Desc: "You don't need luxurious travels or commercial success. We want your ultimate trivial moments—like the blissful feeling of peeling off socks at the end of a long, average day.",
      feature2Title: "🪙 Earn Coins & Roll Gacha Machine",
      feature2Desc: "Upvoting or posting rewards you with 'Gacha Coins' (GC). Use them to play the interactive digital capsule machine to unlock funny custom titles and background frames!",
      feature3Title: "🗺️ Jimi Plaza & Collaborative Co-op Quests",
      feature3Desc: "Work together to hit community upvote targets, join hilarious surveys about humanity, and share inside a public diary co-authored by the whole community.",
      feature4Title: "🛡️ The Safest Harbor on the Web",
      feature4Desc: "We eliminate toxic feeds, ads, and follower anxiety. Maintained by student developer Poco, it functions like a cozy living room where you can drink tea and rest.",

      // How to Use
      howToUseTitle: "How to Play Jimicchi",
      step1Title: "1. Log In (or Try Anonymously)",
      step1Desc: "Sign in instantly with password-free Google login, or try it out using anonymous guest session.",
      step2Title: "2. Post a 'Relatable' Everyday Moment",
      step2Desc: "Share slight milestones like 'Waking up 1 minute قبل the alarm rings' or 'Plugging in the USB correctly on the first attempt'.",
      step3Title: "3. Stamp Sympathy, Get GC Coins",
      step3Desc: "Whenever you feel 'Yes, that is me!', press the orange stamp. Exchanging warmth gives you coins in real time.",
      step4Title: "4. Personalize Your Profile Cards",
      step4Desc: "Equip your favorite unlocked badges and titles (e.g. 'Wizard of Quilts', 'Alarm Snoozing Legend') to stand out quietly.",

      // Creator Section
      creatorTitle: "A Word from the Creator (Poco, High Schooler)",
      creatorText1: "\"Don't you feel slightly burnt out by massive social media apps where everyone brags about their perfect, glittering lives or worries about follower stats?\"",
      creatorText2: "Jimicchi was built to fix that. As a high school student, I crafted this gentle sanctuary where anyone can take a deep breath and share small, unremarkable segments of their day.",
      creatorText3: "This isn't just a website; it's a cozy home on the cloud. I want to continue keeping this platform warm and full of life's tiny comforts. Please leave a slice of your quiet day behind with us.",

      // FAQ
      faqTitle: "Frequently Asked Questions",
      faq1Q: "Is it really free?",
      faq1A: "Yes! All main components (posting, upvoting, gacha spins, plaza activities) are completely free. Optional custom payment packs exist for hardcore collectors, powered securely by Stripe.",
      faq2Q: "How is in-app interaction controlled?",
      faq2A: "We prohibit aggressive call-outs, bragging, and unnecessary telemetry data. The focus is strictly on peaceful daily anecdotes.",
      faq3Q: "How secure is Jimicchi?",
      faq3A: "We utilize Firebase Authentication, Firestore Rules, automated clean guards, and clear community guidelines to maintain a warm atmosphere.",

      // Stats
      statsLabel1: "Total Users",
      statsVal1: "Growing Daily",
      statsLabel2: "Sympathy Stamps",
      statsVal2: "Running Warmly",
      statsLabel3: "Gacha Rewards",
      statsVal3: "100+ Collectibles",

      // Footer CTA
      readyTitle: "Bring your unsung average today into someone else's comfort.",
      enterBtn: "Launch Jimicchi Now",
      orGoTxt: "Or, read our community guidelines first",
    }
  };

  const c = text[lang];

  return (
    <div id="jimi-landing-page-container" className="min-h-screen bg-orange-50/40 dark:bg-zinc-950 text-stone-800 dark:text-zinc-200 selection:bg-orange-200 dark:selection:bg-orange-950 font-sans transition-colors duration-200 pb-16">
      {/* Dynamic Header */}
      <nav id="landing-navbar" className="sticky top-0 z-50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border-b border-orange-100 dark:border-zinc-800/80 px-4 py-3.5 transition-colors">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={onBack}
              id="landing-back-arrow"
              className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-zinc-850 text-orange-900 dark:text-orange-500 cursor-pointer transition"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="ml-1">
              <span className="text-xl font-black text-orange-950 dark:text-zinc-100 tracking-tight font-display select-none">
                {c.siteName}
              </span>
              <span className="text-[10px] ml-1 bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent font-extrabold uppercase tracking-wide">
                {c.siteSub}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher Button */}
            <div id="lang-switcher" className="flex items-center gap-1 bg-orange-100/50 dark:bg-zinc-800/50 p-1 rounded-full border border-orange-200/30 dark:border-zinc-700/30">
              <button
                onClick={() => setLang('ja')}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  lang === 'ja' 
                    ? 'bg-amber-600 text-white shadow-sm' 
                    : 'text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-100'
                }`}
              >
                日本語
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  lang === 'en' 
                    ? 'bg-amber-600 text-white shadow-sm' 
                    : 'text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-100'
                }`}
              >
                English
              </button>
            </div>

            {/* Launch CTA */}
            <button 
              onClick={onGoToApp}
              id="header-launch-app-button"
              className="hidden sm:flex items-center gap-1.5 bg-orange-950 dark:bg-orange-600 hover:bg-orange-900 dark:hover:bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-md shadow-orange-950/5 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin-slow" />
              {c.ctaStart}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 mt-8 sm:mt-12 space-y-16">
        {/* Hero Section */}
        <header id="landing-hero" className="text-center space-y-6 max-w-3xl mx-auto py-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40 rounded-full px-4 py-1 text-xs font-black tracking-wide uppercase shadow-sm select-none">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span>{lang === 'ja' ? '高校生が贈る超共感型ミニマルSNS' : 'Super cozy micro-SNS by a high-schooler'}</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-orange-950 dark:text-zinc-100 tracking-tight leading-tight font-serif select-none">
            {c.tagline}
          </h1>

          <p className="text-base sm:text-xl text-stone-600/90 dark:text-zinc-300 max-w-2xl mx-auto leading-relaxed font-sans">
            {c.subTagline}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button 
              onClick={onGoToApp}
              id="hero-primary-cta"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-gradient-to-r from-orange-900 to-amber-700 dark:from-orange-600 dark:to-orange-500 hover:from-orange-800 hover:to-amber-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-orange-900/10 dark:shadow-orange-600/10 active:scale-98 transition-all cursor-pointer group"
            >
              <Zap className="w-5 h-5 text-amber-300" />
              <span>{c.ctaStart}</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition" />
            </button>

            <button 
              onClick={onBack}
              id="hero-secondary-cta"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-zinc-900 border border-orange-200 dark:border-zinc-800 text-orange-950 dark:text-zinc-300 hover:bg-orange-50/50 dark:hover:bg-zinc-850 px-8 py-4 rounded-2xl font-bold active:scale-98 transition cursor-pointer"
            >
              {c.backToApp}
            </button>
          </div>
        </header>

        {/* Real Stats Board */}
        <section id="landing-stats" className="grid grid-cols-3 max-w-2xl mx-auto bg-gradient-to-br from-white to-amber-50/30 dark:from-zinc-900 dark:to-zinc-900/30 border border-orange-100/60 dark:border-zinc-800 p-6 rounded-3xl text-center shadow-md select-none">
          <div className="space-y-1">
            <p className="text-[10px] sm:text-xs text-orange-700 dark:text-zinc-500 font-extrabold uppercase tracking-widest">{c.statsLabel1}</p>
            <p className="text-base sm:text-lg font-black dark:text-orange-400 text-orange-950">{c.statsVal1}</p>
          </div>
          <div className="border-x border-orange-100 dark:border-zinc-800/80 space-y-1">
            <p className="text-[10px] sm:text-xs text-orange-700 dark:text-zinc-500 font-extrabold uppercase tracking-widest">{c.statsLabel2}</p>
            <p className="text-base sm:text-lg font-black dark:text-orange-400 text-orange-950 flex items-center justify-center gap-1">
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              {c.statsVal2}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] sm:text-xs text-orange-700 dark:text-zinc-500 font-extrabold uppercase tracking-widest">{c.statsLabel3}</p>
            <p className="text-base sm:text-lg font-black dark:text-orange-400 text-orange-950">{c.statsVal3}</p>
          </div>
        </section>

        {/* Features Grid */}
        <section id="landing-features" className="space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-orange-950 dark:text-zinc-100 select-none">
              {c.featuresTitle}
            </h2>
            <div className="h-1 w-12 bg-amber-500 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-orange-50/80 dark:border-zinc-800/80 p-7 rounded-3xl hover:shadow-lg hover:border-orange-100 dark:hover:border-zinc-700 transition duration-350 space-y-3">
              <h3 className="text-lg font-black text-orange-950 dark:text-orange-400">{c.feature1Title}</h3>
              <p className="text-sm text-stone-600 dark:text-zinc-400 leading-relaxed font-sans">{c.feature1Desc}</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-orange-50/80 dark:border-zinc-800/80 p-7 rounded-3xl hover:shadow-lg hover:border-orange-100 dark:hover:border-zinc-700 transition duration-350 space-y-3">
              <h3 className="text-lg font-black text-orange-950 dark:text-orange-400">{c.feature2Title}</h3>
              <p className="text-sm text-stone-600 dark:text-zinc-400 leading-relaxed font-sans">{c.feature2Desc}</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-orange-50/80 dark:border-zinc-800/80 p-7 rounded-3xl hover:shadow-lg hover:border-orange-100 dark:hover:border-zinc-700 transition duration-350 space-y-3">
              <h3 className="text-lg font-black text-orange-950 dark:text-orange-400">{c.feature3Title}</h3>
              <p className="text-sm text-stone-600 dark:text-zinc-400 leading-relaxed font-sans">{c.feature3Desc}</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-orange-50/80 dark:border-zinc-800/80 p-7 rounded-3xl hover:shadow-lg hover:border-orange-100 dark:hover:border-zinc-700 transition duration-350 space-y-3">
              <h3 className="text-lg font-black text-orange-950 dark:text-orange-400">{c.feature4Title}</h3>
              <p className="text-sm text-stone-600 dark:text-zinc-400 leading-relaxed font-sans">{c.feature4Desc}</p>
            </div>
          </div>
        </section>

        {/* Walkthrough Guide */}
        <section id="landing-guide" className="space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-orange-950 dark:text-zinc-100 select-none">
              {c.howToUseTitle}
            </h2>
            <div className="h-1 w-12 bg-amber-500 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="relative group p-6 bg-gradient-to-b from-white to-orange-50/20 dark:from-zinc-900 dark:to-zinc-900/20 border border-orange-100/50 dark:border-zinc-800 rounded-2xl flex flex-col space-y-3">
              <div className="absolute top-4 right-4 text-xs font-black text-orange-200/80 dark:text-zinc-800 uppercase select-none">STEP 01</div>
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-zinc-800 text-orange-950 dark:text-orange-300 flex items-center justify-center font-black">1</div>
              <h4 className="font-extrabold text-orange-950 dark:text-zinc-200 text-sm">{c.step1Title}</h4>
              <p className="text-xs text-stone-600 dark:text-zinc-400 leading-relaxed font-sans">{c.step1Desc}</p>
            </div>

            <div className="relative group p-6 bg-gradient-to-b from-white to-orange-50/20 dark:from-zinc-900 dark:to-zinc-900/20 border border-orange-100/50 dark:border-zinc-800 rounded-2xl flex flex-col space-y-3">
              <div className="absolute top-4 right-4 text-xs font-black text-orange-200/80 dark:text-zinc-800 uppercase select-none">STEP 02</div>
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-zinc-800 text-orange-950 dark:text-orange-300 flex items-center justify-center font-black">2</div>
              <h4 className="font-extrabold text-orange-950 dark:text-zinc-200 text-sm">{c.step2Title}</h4>
              <p className="text-xs text-stone-600 dark:text-zinc-400 leading-relaxed font-sans">{c.step2Desc}</p>
            </div>

            <div className="relative group p-6 bg-gradient-to-b from-white to-orange-50/20 dark:from-zinc-900 dark:to-zinc-900/20 border border-orange-100/50 dark:border-zinc-800 rounded-2xl flex flex-col space-y-3">
              <div className="absolute top-4 right-4 text-xs font-black text-orange-200/80 dark:text-zinc-800 uppercase select-none">STEP 03</div>
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-zinc-800 text-orange-950 dark:text-orange-300 flex items-center justify-center font-black">3</div>
              <h4 className="font-extrabold text-orange-950 dark:text-zinc-200 text-sm">{c.step3Title}</h4>
              <p className="text-xs text-stone-600 dark:text-zinc-400 leading-relaxed font-sans">{c.step3Desc}</p>
            </div>

            <div className="relative group p-6 bg-gradient-to-b from-white to-orange-50/20 dark:from-zinc-900 dark:to-zinc-900/20 border border-orange-100/50 dark:border-zinc-800 rounded-2xl flex flex-col space-y-3">
              <div className="absolute top-4 right-4 text-xs font-black text-orange-200/80 dark:text-zinc-800 uppercase select-none">STEP 04</div>
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-zinc-800 text-orange-950 dark:text-orange-300 flex items-center justify-center font-black">4</div>
              <h4 className="font-extrabold text-orange-950 dark:text-zinc-200 text-sm">{c.step4Title}</h4>
              <p className="text-xs text-stone-600 dark:text-zinc-400 leading-relaxed font-sans">{c.step4Desc}</p>
            </div>
          </div>
        </section>

        {/* Developer / Creator Story Card */}
        <section id="landing-creator" className="bg-orange-900/90 dark:bg-zinc-900 text-orange-50 dark:text-zinc-100 p-8 sm:p-12 rounded-3xl border border-orange-850 dark:border-zinc-800 shadow-xl space-y-6 relative overflow-hidden select-none">
          <div className="absolute -right-12 -bottom-12 opacity-5 select-none pointer-events-none">
            <Heart className="w-64 h-64 fill-white" />
          </div>

          <div className="space-y-2 relative z-10">
            <span className="text-amber-300 font-extrabold tracking-widest text-[11px] uppercase block">
              {lang === 'ja' ? '開発ストーリー' : 'Behind the Code'}
            </span>
            <h3 className="text-2xl sm:text-3xl font-black font-serif leading-snug">
              {c.creatorTitle}
            </h3>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-orange-100 dark:text-zinc-300 max-w-3xl leading-relaxed relative z-10 font-sans">
            <p className="italic">
              {c.creatorText1}
            </p>
            <p>
              {c.creatorText2}
            </p>
            <p>
              {c.creatorText3}
            </p>
          </div>

          <div className="pt-2 flex items-center gap-3 relative z-10 select-none">
            <img 
              src="https://api.dicebear.com/7.x/bottts/svg?seed=Poco&backgroundColor=f59e0b" 
              alt="Poco" 
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl bg-amber-500 border-2 border-amber-300/60 shadow-inner select-none pointer-events-none"
            />
            <div>
              <p className="font-extrabold text-white text-sm">Poco</p>
              <p className="text-xs text-orange-200 dark:text-zinc-500 font-bold">{lang === 'ja' ? '地味っち 個人開発者 （高校生）' : 'Jimicchi Solo Developer (High School Student)'}</p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="landing-faq" className="space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-orange-950 dark:text-zinc-100 select-none">
              {c.faqTitle}
            </h2>
            <div className="h-1 w-12 bg-amber-500 mx-auto rounded-full" />
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-orange-100/40 dark:border-zinc-800 p-6 rounded-2xl space-y-2">
              <h4 className="font-black text-orange-950 dark:text-orange-400 text-sm sm:text-base flex items-center gap-2">
                <HelpCircle className="w-4.5 h-4.5 shrink-0 text-amber-600" />
                {c.faq1Q}
              </h4>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-zinc-400 leading-relaxed pl-6.5 font-sans">{c.faq1A}</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-orange-100/40 dark:border-zinc-800 p-6 rounded-2xl space-y-2">
              <h4 className="font-black text-orange-950 dark:text-orange-400 text-sm sm:text-base flex items-center gap-2">
                <HelpCircle className="w-4.5 h-4.5 shrink-0 text-amber-600" />
                {c.faq2Q}
              </h4>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-zinc-400 leading-relaxed pl-6.5 font-sans">{c.faq2A}</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-orange-100/40 dark:border-zinc-800 p-6 rounded-2xl space-y-2">
              <h4 className="font-black text-orange-950 dark:text-orange-400 text-sm sm:text-base flex items-center gap-2">
                <HelpCircle className="w-4.5 h-4.5 shrink-0 text-amber-600" />
                {c.faq3Q}
              </h4>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-zinc-400 leading-relaxed pl-6.5 font-sans">{c.faq3A}</p>
            </div>
          </div>
        </section>

        {/* Final CTA Area */}
        <footer id="landing-ctas" className="text-center py-12 space-y-6 bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-zinc-900/40 dark:to-zinc-950 rounded-3xl border border-orange-100/60 dark:border-zinc-800/80 p-8 select-none">
          <h3 className="text-xl sm:text-2xl font-black text-orange-950 dark:text-zinc-100 font-serif leading-tight">
            {c.readyTitle}
          </h3>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto pt-2">
            <button 
              onClick={onGoToApp}
              id="footer-launch-app-cta"
              className="w-full flex items-center justify-center gap-2 bg-orange-950 dark:bg-orange-600 hover:bg-orange-900 dark:hover:bg-orange-500 text-white font-black px-8 py-4 rounded-2xl shadow-lg active:scale-98 transition duration-150 cursor-pointer text-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>{c.enterBtn}</span>
            </button>
          </div>

          <p className="text-xs text-stone-500 dark:text-zinc-500 max-w-sm mx-auto">
            © 2026 Jimicchi. Powered by Poco. Free & Ad-free safe social workspace.
          </p>
        </footer>
      </div>
    </div>
  );
}
