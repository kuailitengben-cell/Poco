import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartInteractive?: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose, onStartInteractive }) => {
  const [step, setStep] = useState(0);
  const { language, t } = useLanguage();

  if (!isOpen) return null;

  const stepsJa = [
    {
      title: "🎉 地味っち（Jimicchi）へようこそ！",
      description: "『それ、わかる。』という日常の些細な幸せをみんなでシンクロする、新感覚のSNSです！",
      illustration: "🍵",
      bullets: [
        "自分だけだと思っていた些細な日常をシェア",
        "シンプルないいね・コメントで共感を表現",
        "匿名投稿もサポート。誰でも気軽に参加できます"
      ]
    },
    {
      title: "📊 予想共感度シンクロチャレンジ！",
      description: "一風変わったゲーム感覚で共感の答え合わせを楽しむ機能です！",
      illustration: "🎯",
      bullets: [
        "投稿時に「この出来事に何％の人が共感するか」を予想設定",
        "5閲覧以上で予測結果と実際のいいね率（いいね/閲覧数）を比較",
        "誤差10％以内なら【シンクロ成功】！実績とGCコインを獲得",
        "💡 自信チャレンジ画面は、他ユーザーから隠されあなただけに見えます"
      ]
    },
    {
      title: "🎰 ２つ名 ＆ 地味バッジをGETしよう",
      description: "ガチャを回して自分だけのユニークなアバターを作りましょう！",
      illustration: "🎰",
      bullets: [
        "デイリーボーナスやシンクロ成功でガチャコイン（GC）を獲得",
        "ガチャから多彩なレア度の肩書き（２つ名）やバッジが出現！",
        "マイページから装備して自分だけの個性をアピールできます"
      ]
    },
    {
      title: "👑 リアルタイム地味ランキング！",
      description: "みんなが一番共感した話題の投稿をチェックできます！",
      illustration: "🏆",
      bullets: [
        "日間・週間・月間の3つのスパンで動的なスコアランキング",
        "共感、コメント、プロフアクセス、閲覧から自動評価されます",
        "フォロー中の人が上位に入ったり、自分がお祝いされると自動通知！"
      ]
    }
  ];

  const stepsEn = [
    {
      title: "🎉 Welcome to Jimicchi!",
      description: "Jimicchi is a social media app for small relatable moments. Not for viral posts. For everyday moments that make people say: 'Yeah, that happens to me too.'",
      illustration: "🍵",
      bullets: [
        "Share everyday experiences you thought only happened to you",
        "Express true empathy with simple upvotes or comments",
        "Anonymous support ensures everyone can express themselves freely"
      ]
    },
    {
      title: "📊 Synchro Challenge!",
      description: "An empathy prediction guessing game that brings everyday moments closer.",
      illustration: "🎯",
      bullets: [
        "Predict what % of people will think: 'Yeah, that happens to me too' when posting",
        "Once the post gets 5+ views, the system compares predictions with actual upvote rates",
        "Within 10% error counts as a [Synchro Success]! Earn achievements and GC Coins",
        "💡 Private: Only you can see your predictions — it's hidden from other players"
      ]
    },
    {
      title: "🎰 Custom Titles & Badges!",
      description: "Draw gacha machines to customize your unique social presence profile.",
      illustration: "🎰",
      bullets: [
        "Earn Gacha Coins (GC) through daily logins or successful Synchros",
        "Acquire different rarity custom Titles (prefixes, suffixes) and quirky Badges",
        "Equip them in your profile settings to showcase your unique personality"
      ]
    },
    {
      title: "👑 Real-time Relatability Rankings!",
      description: "See which common, everyday struggles resonated with people most!",
      illustration: "🏆",
      bullets: [
        "Check daily, weekly, and monthly dynamic trending charts",
        "Rankings are automatically calculated based on upvotes, comments, and profile visits",
        "Receive automated celebrations and notifications when friends chart top spots!"
      ]
    }
  ];

  const steps = language === 'en' ? stepsEn : stepsJa;
  const cur = steps[step];

  return (
    <div id="tutorial-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-orange-950/40 backdrop-blur-sm">
      <motion.div 
        id="tutorial-modal-card"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-[40px] border-4 border-orange-100 max-w-lg w-full overflow-hidden shadow-2xl relative"
      >
        <div className="p-8 sm:p-10 space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black tracking-widest text-orange-400 uppercase flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> STEP {step + 1} / {steps.length}
            </span>
            <button id="btn-tutorial-close" onClick={onClose} className="text-orange-300 hover:text-orange-500 text-lg font-bold bg-transparent border-0 cursor-pointer border-none outline-none">
              ✕
            </button>
          </div>

          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-orange-50 flex items-center justify-center text-4xl shadow-sm border border-orange-100">
              {cur.illustration}
            </div>
            <h3 className="text-2xl font-black text-orange-950 leading-tight">
              {cur.title}
            </h3>
            <p className="text-xs text-orange-850/80 leading-relaxed font-semibold">
              {cur.description}
            </p>
          </div>

          <div className="bg-orange-50/50 rounded-2xl p-5 border border-orange-100/50 space-y-2.5">
            {cur.bullets.map((b, i) => (
              <div key={i} className="flex gap-2.5 items-start text-xs font-bold text-orange-800">
                <span className="text-orange-500 shrink-0 mt-0.5">●</span>
                <span className="leading-relaxed">{b}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-orange-50">
            <button
              id="btn-tutorial-prev"
              onClick={() => step > 0 && setStep(step - 1)}
              disabled={step === 0}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition border border-orange-200/55 ${
                step === 0 ? "opacity-30 cursor-not-allowed text-stone-400 bg-stone-50" : "bg-white text-orange-600 hover:bg-orange-50"
              }`}
            >
              {t('前へ', 'Back')}
            </button>
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === step ? "bg-orange-500 w-4" : "bg-orange-200"}`} />
              ))}
            </div>
            {step < steps.length - 1 ? (
              <button
                id="btn-tutorial-next"
                onClick={() => setStep(step + 1)}
                className="px-6 py-2 rounded-xl text-xs font-extrabold bg-orange-500 hover:bg-orange-600 text-white cursor-pointer transition shadow-md shadow-orange-500/10 border-none"
              >
                {t('次へ', 'Next')}
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  id="btn-tutorial-close-normal"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-orange-200 text-orange-600 hover:bg-orange-50 cursor-pointer transition whitespace-nowrap bg-white"
                >
                  {t('説明を閉じる', 'Close')}
                </button>
                {onStartInteractive && (
                  <button
                    id="btn-tutorial-start-interactive"
                    onClick={() => {
                      onClose();
                      onStartInteractive();
                    }}
                    className="px-5 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white cursor-pointer transition shadow-md shadow-orange-500/10 flex items-center gap-1.5 whitespace-nowrap border-none"
                  >
                    <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-200 animate-pulse" />
                    {t('実践体験ツアーへ！ 🚀', 'Take Quick Tour! 🚀')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
