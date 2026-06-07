import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Heart, 
  CheckCircle2, 
  AlertTriangle, 
  Edit2, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  Check, 
  AlertCircle
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GuidelineRule, GuidelinesData } from '../types';

interface GuidelinesViewProps {
  onBack: () => void;
  isAdmin?: boolean;
}

const defaultGuidelinesData: GuidelinesData = {
  intro: "日常の些細な出来事、なんとなく分かる気持ち、あるいは小さなこだわりを共有することを何より大切にしています。誰かを傷つけるためではなく、誰かと「わかる！」という温かい共感でつながるために、以下のガイドラインへのご協力をお願いします。",
  rules: [
    {
      num: 1,
      title: "共感を大切にしよう",
      content: "地味っちは勝ち負けを競う場所ではありません。投稿者を攻撃したり、見下したりするのではなく、「分かる」「そんなことあるよな」という、お互いの何気ない日々へのリスペクトを忘れないでください。"
    },
    {
      num: 2,
      title: "誹謗中傷と嫌がらせは禁止",
      content: "以下のような投稿やコメントは禁止です。",
      bullets: [
        "特定の人、個人へ向けられた悪口や攻撃",
        "暴言や嫌がらせ、ネットいじめに値する内容",
        "特定グループを侮辱する差別的発言"
      ]
    },
    {
      num: 3,
      title: "個人情報は絶対に載せない",
      content: "自分や誰かの本名、詳しい住所、電話番号、学校名、他SNSのアカウント特定情報などの投稿を書き込まないようご注意ください。トラブルを未然に防ぎましょう。"
    },
    {
      num: 4,
      title: "なりすましは禁止",
      content: "他人、芸能人、特定の団体、あるいは「地味っち運営者」になりすまし、誤解を招くような書き込みやプロフィール設定をする行為は規制対象となります。"
    },
    {
      num: 5,
      title: "スパム行為は禁止",
      content: "同一内容の繰り返し連投や、商品・外部サイトへの露骨な誘導・宣伝、自動Bot等の無断使用での投稿、荒らし行為はお控えください。"
    },
    {
      num: 6,
      title: "不快な内容について",
      content: "過度に暴力的・グロテスクな内容、わいせつな表現、違法行為や自傷行為を助長、あるいはその他ユーザーを不快にさせる不適切な投稿、お礼コインを稼ぐことが最優先となっている形骸化投稿については、運営の判断により非表示または削除させていただきます。"
    },
    {
      num: 7,
      title: "バグ・不具合を見つけたら？",
      content: "地味っちは個人開発で成長中のサービスです。もしガチャの不具合やプログラムの不審な挙動を見つけた場合は、それをハッキングや無限増殖などに悪用せず、優しく運営（Poco: kuailitengben@gmail.com）へ報告して頂けますと大変助かります！"
    },
    {
      num: 9,
      title: "運営の介入・アカウント管理について",
      content: "運営者は、みなさまが穏やかに安心して利用できる環境を提供するため、ガイドラインに違反・または不適切と判断した場合には事前の告知なく投稿削除、コメント削除、および一時的〜永久不変のアカウント停止(Ban)を執り行う場合があります。"
    }
  ],
  okExamples: [
    "冷蔵庫を開けたのに、何を取りに来たか本気で忘れる",
    "宿題をやろうとして、なぜか机の片付けから始めてしまう",
    "寝る寸前、急に部屋の家具配置を変えたくなる謎の衝動"
  ],
  ngExamples: [
    "他者を侮辱したり、特定の人の行動を馬鹿にする投稿",
    "誰かにケンカや議論を起こさせようと企む炎上狙い",
    "攻撃的な愚痴や、みんなが不快になるだけの下品な話題"
  ],
  closingHeadline: "みんなで一緒につくっていきましょう 🧸",
  closingBody: "地味っちは「すごい人が賞賛を集める場所」ではなく、「誰もがいつもの何気ない日々に『わかる！』の小さな光を見つけられる場所」です。あなたの地味で平凡な今日の一幕が、世界の誰かにとっての「安心」や「くすっと笑える一言」になるかもしれません。そんな場所を一緒に大切にしてくれたら嬉しいです。"
};

export default function GuidelinesView({ onBack, isAdmin }: GuidelinesViewProps) {
  const [guidelines, setGuidelines] = useState<GuidelinesData>(defaultGuidelinesData);
  const [updatedAt, setUpdatedAt] = useState<string>('2026年6月3日');
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Backups of editing states
  const [editedGuidelines, setEditedGuidelines] = useState<GuidelinesData>(defaultGuidelinesData);
  const [editedUpdatedAt, setEditedUpdatedAt] = useState<string>('');
  const [editingRuleNum, setEditingRuleNum] = useState<number | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = "コミュニティガイドライン | 地味っち (Jimicchi)";

    async function loadGuidelines() {
      try {
        const docRef = doc(db, "legal_documents", "guidelines");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.guidelinesData) {
            setGuidelines(data.guidelinesData);
          }
          if (data.updatedAt) {
            setUpdatedAt(data.updatedAt);
          }
        }
      } catch (err) {
        console.error("Error loading guidelines:", err);
        showToast("ガイドラインデータの読み込みに失敗しました。", "error");
      } finally {
        setLoading(false);
      }
    }
    loadGuidelines();
  }, []);

  // Start Edit Mode
  const startEditing = () => {
    setEditedGuidelines(JSON.parse(JSON.stringify(guidelines)));
    setEditedUpdatedAt(updatedAt);
    setIsEditMode(true);
    setEditingRuleNum(null);
  };

  // Cancel Edit
  const cancelEditing = () => {
    setIsEditMode(false);
    setEditingRuleNum(null);
  };

  // Edit fields
  const handleIntroChange = (val: string) => {
    setEditedGuidelines({ ...editedGuidelines, intro: val });
  };

  const handleClosingHeadlineChange = (val: string) => {
    setEditedGuidelines({ ...editedGuidelines, closingHeadline: val });
  };

  const handleClosingBodyChange = (val: string) => {
    setEditedGuidelines({ ...editedGuidelines, closingBody: val });
  };

  // Rule Editing
  const handleRuleTitleChange = (idx: number, val: string) => {
    const nextRules = [...editedGuidelines.rules];
    nextRules[idx].title = val;
    setEditedGuidelines({ ...editedGuidelines, rules: nextRules });
  };

  const handleRuleContentChange = (idx: number, val: string) => {
    const nextRules = [...editedGuidelines.rules];
    nextRules[idx].content = val;
    setEditedGuidelines({ ...editedGuidelines, rules: nextRules });
  };

  const addBulletToRule = (idx: number) => {
    const nextRules = [...editedGuidelines.rules];
    if (!nextRules[idx].bullets) {
      nextRules[idx].bullets = [];
    }
    nextRules[idx].bullets!.push('');
    setEditedGuidelines({ ...editedGuidelines, rules: nextRules });
  };

  const handleBulletChange = (ruleIdx: number, bulletIdx: number, val: string) => {
    const nextRules = [...editedGuidelines.rules];
    if (nextRules[ruleIdx].bullets) {
      nextRules[ruleIdx].bullets![bulletIdx] = val;
    }
    setEditedGuidelines({ ...editedGuidelines, rules: nextRules });
  };

  const removeBulletFromRule = (ruleIdx: number, bulletIdx: number) => {
    const nextRules = [...editedGuidelines.rules];
    if (nextRules[ruleIdx].bullets) {
      nextRules[ruleIdx].bullets!.splice(bulletIdx, 1);
    }
    setEditedGuidelines({ ...editedGuidelines, rules: nextRules });
  };

  // Examples Editing
  const addOkExample = () => {
    setEditedGuidelines({
      ...editedGuidelines,
      okExamples: [...editedGuidelines.okExamples, ""]
    });
  };

  const handleOkExampleChange = (idx: number, val: string) => {
    const next = [...editedGuidelines.okExamples];
    next[idx] = val;
    setEditedGuidelines({ ...editedGuidelines, okExamples: next });
  };

  const removeOkExample = (idx: number) => {
    const next = [...editedGuidelines.okExamples];
    next.splice(idx, 1);
    setEditedGuidelines({ ...editedGuidelines, okExamples: next });
  };

  const addNgExample = () => {
    setEditedGuidelines({
      ...editedGuidelines,
      ngExamples: [...editedGuidelines.ngExamples, ""]
    });
  };

  const handleNgExampleChange = (idx: number, val: string) => {
    const next = [...editedGuidelines.ngExamples];
    next[idx] = val;
    setEditedGuidelines({ ...editedGuidelines, ngExamples: next });
  };

  const removeNgExample = (idx: number) => {
    const next = [...editedGuidelines.ngExamples];
    next.splice(idx, 1);
    setEditedGuidelines({ ...editedGuidelines, ngExamples: next });
  };

  // Add rule card
  const addNewRule = () => {
    const maxNum = editedGuidelines.rules.length > 0 
      ? Math.max(...editedGuidelines.rules.map(r => r.num)) 
      : 0;
    const newRule: GuidelineRule = {
      num: maxNum + 1,
      title: "新規ガイドラインルール",
      content: "内容を記述してください。"
    };
    setEditedGuidelines({
      ...editedGuidelines,
      rules: [...editedGuidelines.rules, newRule]
    });
    setEditingRuleNum(newRule.num);
  };

  // Delete rule card
  const deleteRule = (idx: number) => {
    const next = [...editedGuidelines.rules];
    next.splice(idx, 1);
    setEditedGuidelines({ ...editedGuidelines, rules: next });
    setEditingRuleNum(null);
  };

  // Move rule card
  const moveRule = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === editedGuidelines.rules.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const rules = [...editedGuidelines.rules];
    const temp = rules[idx];
    rules[idx] = rules[targetIdx];
    rules[targetIdx] = temp;
    setEditedGuidelines({ ...editedGuidelines, rules });
  };

  // Revert Defaults
  const resetToDefaults = () => {
    if (window.confirm("ガイドラインを初期状態に戻しますか？（未保存の編集はすべて失われます）")) {
      setEditedGuidelines(JSON.parse(JSON.stringify(defaultGuidelinesData)));
      setEditedUpdatedAt('2026年6月3日');
      setEditingRuleNum(null);
      showToast("デフォルトの設定に差し戻しました。保存を押すと確定します。");
    }
  };

  // Save guidelines to DB
  const saveGuidelines = async () => {
    try {
      const docRef = doc(db, "legal_documents", "guidelines");
      await setDoc(docRef, {
        docType: "guidelines",
        updatedAt: editedUpdatedAt,
        guidelinesData: editedGuidelines
      });
      setGuidelines(editedGuidelines);
      setUpdatedAt(editedUpdatedAt);
      setIsEditMode(false);
      setEditingRuleNum(null);
      showToast("ガイドラインが完璧に更新・公開されました！");
    } catch (error) {
      console.error("Firestore Save Error:", error);
      showToast("データの保存に失敗しました。", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="animate-spin text-4xl">🎪</div>
        <p className="text-xs text-orange-900/60 font-bold">データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto px-1 sm:px-0 relative mb-8">
      {/* Toast Notification block */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg border text-xs font-bold font-sans animate-bounce transition-all ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Navigation and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-orange-100">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="group flex items-center gap-1.5 px-3 py-1.5 text-xs text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl transition cursor-pointer font-bold"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>タイムラインに戻る</span>
          </button>

          {isAdmin && !isEditMode && (
            <button
              onClick={startEditing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer font-bold"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>管理者：ガイドラインを編集</span>
            </button>
          )}
        </div>

        <span className="text-[11px] text-orange-500 font-mono font-bold select-none">
          最終更新日：{isEditMode ? editedUpdatedAt : updatedAt}
        </span>
      </div>

      {/* Cozy Header Design */}
      <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-[32px] p-6 sm:p-8 text-white shadow-lg shadow-orange-500/10 select-none">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-[10px] tracking-wider uppercase font-extrabold inline-flex items-center gap-1">
              <Heart className="w-3 h-3 text-red-200 fill-red-200" />
              Community Guidelines
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight">
              地味っち コミュニティガイドライン
            </h2>
          </div>
          <span className="text-4xl filter drop-shadow">🎪</span>
        </div>
        <p className="text-xs text-white/90 max-w-xl mt-4 font-bold leading-relaxed">
          地味っちは、「地味に共感できること」をみんなで投稿して、ゆったりと共感を楽しむ場所です。大きな出来事や自慢ではなく、日常に転がる小さな“あるある”を大切にしています。
        </p>
      </div>

      {isEditMode ? (
        /* ==================== EDIT MODE UI ==================== */
        <div className="space-y-6 bg-orange-50/20 p-4 sm:p-6 rounded-[32px] border-2 border-dashed border-orange-200">
          <div className="flex items-center justify-between border-b border-orange-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-orange-950">ガイドライン編集パネル</h3>
              <p className="text-[10px] text-orange-400 font-bold">マナー説明、ルール文面、OK/NG事例などを自在に変更できます。</p>
            </div>
            <button
              onClick={resetToDefaults}
              className="p-1 px-3 py-1.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-900 border text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              リセット
            </button>
          </div>

          {/* Last Updated Input */}
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-black uppercase text-orange-950">最終更新日表示</label>
            <input
              type="text"
              value={editedUpdatedAt}
              onChange={(e) => setEditedUpdatedAt(e.target.value)}
              placeholder="例: 2026年6月3日"
              className="bg-white text-xs text-orange-950 font-bold p-3 rounded-2xl border border-orange-150 outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          {/* Intro Text Block */}
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-black uppercase text-orange-950">はじめに（イントロダクション文面）</label>
            <textarea
              rows={3}
              value={editedGuidelines.intro}
              onChange={(e) => handleIntroChange(e.target.value)}
              className="bg-white text-xs font-medium text-orange-950 p-3 rounded-2xl border border-orange-100 outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          {/* Rules Title Section */}
          <div className="pt-3 border-t border-orange-100">
            <h4 className="text-xs font-black text-orange-950 mb-3">ガイドライン規定カード一覧</h4>
            
            <div className="space-y-3">
              {editedGuidelines.rules.map((rule, idx) => {
                const isEditingRule = editingRuleNum === rule.num;
                return (
                  <div 
                    key={rule.num}
                    className={`bg-white border ${
                      isEditingRule ? 'border-orange-400 ring-2 ring-orange-200' : 'border-orange-105'
                    } rounded-2xl p-4 transition-all`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-black shrink-0">
                          {idx + 1}
                        </span>
                        {isEditingRule ? (
                          <input
                            type="text"
                            value={rule.title}
                            onChange={(e) => handleRuleTitleChange(idx, e.target.value)}
                            placeholder="ルールの見出し名"
                            className="w-full bg-orange-50/55 text-xs font-black text-orange-950 p-1.5 rounded-xl outline-none border border-orange-200 focus:border-orange-400"
                          />
                        ) : (
                          <span className="text-xs font-black text-orange-950 truncate">
                            {rule.title || "(見出しなし)"}
                          </span>
                        )}
                      </div>

                      {/* Direction and Edit Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveRule(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 hover:bg-orange-50 disabled:opacity-35 text-orange-600 rounded-lg"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRule(idx, 'down')}
                          disabled={idx === editedGuidelines.rules.length - 1}
                          className="p-1 hover:bg-orange-50 disabled:opacity-35 text-orange-600 rounded-lg"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingRuleNum(isEditingRule ? null : rule.num)}
                          className={`p-1.5 px-2.5 rounded-xl text-[10px] font-black ${
                            isEditingRule ? 'bg-orange-500 text-white' : 'bg-orange-50 hover:bg-orange-100 text-orange-700'
                          }`}
                        >
                          {isEditingRule ? '閉じる' : '編集する'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRule(idx)}
                          className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Rule Contents (Details) if selected */}
                    {isEditingRule && (
                      <div className="mt-4 pt-3 border-t border-orange-100 space-y-4">
                        <div className="flex flex-col space-y-1">
                          <label className="text-[10px] font-black text-orange-400">ルールの解説テキスト</label>
                          <textarea
                            rows={3}
                            value={rule.content}
                            onChange={(e) => handleRuleContentChange(idx, e.target.value)}
                            placeholder="ルールに説明・動機を書き込んでください。"
                            className="bg-[#FFFDFB] p-2.5 rounded-xl text-xs font-semibold text-orange-950 outline-none border focus:border-orange-300 focus:ring-1 focus:ring-orange-200 leading-relaxed"
                          />
                        </div>

                        {/* Bullets Sub-section optional */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-orange-400">箇条書き箇所の追加 (該当する場合のみ)</label>
                            <button
                              type="button"
                              onClick={() => addBulletToRule(idx)}
                              className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-black bg-orange-50 text-orange-700 rounded border"
                            >
                              <Plus className="w-3 text-orange-500 h-3" /> リスト項目を追加
                            </button>
                          </div>

                          <div className="space-y-1.5">
                            {rule.bullets?.map((bull, bIdx) => (
                              <div key={bIdx} className="flex gap-1.5 items-center">
                                <span className="text-[10px] text-orange-300 select-none">•</span>
                                <input
                                  type="text"
                                  value={bull}
                                  onChange={(e) => handleBulletChange(idx, bIdx, e.target.value)}
                                  placeholder="箇条書きのリスト文"
                                  className="flex-1 bg-orange-50/10 rounded-xl p-2 text-xs font-semibold text-orange-950 border outline-none focus:border-orange-250"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeBulletFromRule(idx, bIdx)}
                                  className="p-1 hover:bg-rose-50 text-rose-500 rounded transition"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={addNewRule}
              className="w-full flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-orange-50 border border-orange-200 border-dashed text-orange-950 text-xs font-black mt-3 hover:bg-orange-100 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-orange-500" />
              <span>新しいガイドライン規定カードを追加</span>
            </button>
          </div>

          {/* OK and NG Examples Setup row */}
          <div className="pt-3 border-t border-orange-100 space-y-4">
            <h4 className="text-xs font-black text-orange-950 font-display">素晴らしい例 (OK) vs 地味っちらしくない例 (NG) 事例集</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* OK column */}
              <div className="bg-emerald-50/40 border border-emerald-100/80 p-4 rounded-3xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" />素晴らしい例 (OK)
                  </span>
                  <button
                    type="button"
                    onClick={addOkExample}
                    className="p-1 px-2 font-black text-[9px] bg-emerald-100 text-emerald-800 rounded-xl hover:bg-emerald-200 transition"
                  >
                    + 追加
                  </button>
                </div>

                <div className="space-y-1.5 pt-1">
                  {editedGuidelines.okExamples.map((ex, exIdx) => (
                    <div key={exIdx} className="flex gap-1 items-center">
                      <input
                        type="text"
                        value={ex}
                        onChange={(e) => handleOkExampleChange(exIdx, e.target.value)}
                        className="flex-1 bg-white text-xs font-bold text-emerald-950 p-2 rounded-xl border border-emerald-100 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeOkExample(exIdx)}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-xl"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* NG column */}
              <div className="bg-rose-50/40 border border-rose-100/80 p-4 rounded-3xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full flex items-center gap-0.5">
                    <AlertTriangle className="w-3 h-3" />地味っちらしくない例 (NG)
                  </span>
                  <button
                    type="button"
                    onClick={addNgExample}
                    className="p-1 px-2 font-black text-[9px] bg-rose-100 text-rose-800 rounded-xl hover:bg-rose-200 transition"
                  >
                    + 追加
                  </button>
                </div>

                <div className="space-y-1.5 pt-1">
                  {editedGuidelines.ngExamples.map((ex, exIdx) => (
                    <div key={exIdx} className="flex gap-1 items-center">
                      <input
                        type="text"
                        value={ex}
                        onChange={(e) => handleNgExampleChange(exIdx, e.target.value)}
                        className="flex-1 bg-white text-xs font-bold text-rose-955 p-2 rounded-xl border border-rose-105 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeNgExample(exIdx)}
                        className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-xl"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Closing Block Editor */}
          <div className="pt-3 border-t border-orange-100 space-y-3">
            <h4 className="text-xs font-black text-orange-950 font-display">終わりに (クロージングセクション)</h4>
            
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-black text-orange-400">見出しのメッセージ</label>
              <input
                type="text"
                value={editedGuidelines.closingHeadline}
                onChange={(e) => handleClosingHeadlineChange(e.target.value)}
                className="bg-white text-xs font-black text-orange-950 p-3 rounded-2xl border border-orange-100 focus:outline-none"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-black text-orange-400">本文メッセージ</label>
              <textarea
                rows={4}
                value={editedGuidelines.closingBody}
                onChange={(e) => handleClosingBodyChange(e.target.value)}
                className="bg-white text-xs font-medium text-orange-950 p-3 rounded-2xl border border-orange-100 focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* Save Action Group */}
          <div className="flex gap-3 pt-4 border-t border-orange-100">
            <button
              onClick={saveGuidelines}
              className="flex-1 flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-orange-500/10 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>変更を保存して公開</span>
            </button>
            <button
              onClick={cancelEditing}
              className="flex-1 flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-black border border-gray-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>キャンセル</span>
            </button>
          </div>
        </div>
      ) : (
        /* ==================== VIEW MODE UI ==================== */
        <>
          {/* Intro Card */}
          <div className="bg-orange-50/50 border border-orange-100 rounded-[32px] p-6 sm:p-8 space-y-4">
            <h3 className="text-sm font-black text-orange-950 flex items-center gap-1.5 font-display select-none">
              <span>🌱</span> はじめに
            </h3>
            <p className="text-xs text-orange-900/85 leading-relaxed font-bold">
              {guidelines.intro}
            </p>
          </div>

          {/* Dynamic Content Rules Cards */}
          <div className="space-y-6">
            {guidelines.rules.map((rule, idx) => (
              <div 
                key={rule.num} 
                className="bg-white border border-orange-100 rounded-[32px] p-6 sm:p-8 space-y-3 shadow-sm hover:border-orange-200 transition"
              >
                <h4 className="text-xs font-black text-orange-950 flex items-center gap-2 border-b border-orange-50 pb-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-black">
                    {idx + 1}
                  </span>
                  {rule.title}
                </h4>
                <p className="text-xs text-orange-900/85 leading-relaxed font-medium">
                  {rule.content}
                </p>
                
                {rule.bullets && rule.bullets.length > 0 && (
                  <ul className="text-xs text-orange-950 font-extrabold pl-4 space-y-1.5 list-disc">
                    {rule.bullets.map((b, bIdx) => (
                      <li key={bIdx}>{b}</li>
                    ))}
                  </ul>
                )}

                {/* Specific advice on Rule 2 for reports */}
                {rule.title.includes("誹謗中傷") && (
                  <p className="text-[10px] text-orange-600 bg-orange-50/50 px-3 py-2 rounded-xl border border-orange-200/40">
                    🔔 <b>もし嫌な投稿・不適切投稿を見つけたら？</b><br />
                    該当投稿のカードをタップして詳細画面を開き、右上の「🚩 (旗)」マークをタップすることで、通報することができます。管理者が即座に確認し対応します。
                  </p>
                )}
              </div>
            ))}

            {/* OK vs NG Showcase Card */}
            {(guidelines.okExamples?.length > 0 || guidelines.ngExamples?.length > 0) && (
              <div className="bg-[#FFFDFB] border-2 border-dashed border-orange-200 rounded-[32px] p-6 sm:p-8 space-y-6">
                <h4 className="text-xs font-black text-orange-950 text-center flex items-center justify-center gap-1.5 font-display select-none">
                  <span>🎨</span> 事例で見る、地味っちらしさ
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Green OK Card */}
                  {guidelines.okExamples?.length > 0 && (
                    <div className="bg-emerald-50/50 border border-emerald-105 p-5 rounded-[24px] space-y-3">
                      <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        素晴らしい例 (OK)
                      </span>
                      <ul className="text-xs text-emerald-950 font-bold space-y-2 pl-2">
                        {guidelines.okExamples.map((ex, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span>・</span>
                            <span>{ex}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Red NG Card */}
                  {guidelines.ngExamples?.length > 0 && (
                    <div className="bg-rose-50/50 border border-rose-105 p-5 rounded-[24px] space-y-3">
                      <span className="text-[10px] uppercase font-black tracking-wider text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full flex items-center gap-1 w-fit font-display">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        地味っちらしくない例 (NG)
                      </span>
                      <ul className="text-xs text-rose-955 font-bold space-y-2 pl-2">
                        {guidelines.ngExamples.map((ex, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span>・</span>
                            <span>{ex}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sweet Closing Text Layout */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100/60 rounded-[32px] p-6 sm:p-8 text-center space-y-3 shadow-sm">
            <h4 className="text-sm font-black text-orange-950">
              {guidelines.closingHeadline}
            </h4>
            <p className="text-xs text-orange-900/85 leading-relaxed font-bold max-w-xl mx-auto">
              {guidelines.closingBody}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
