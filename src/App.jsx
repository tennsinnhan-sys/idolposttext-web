import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Star, Heart, Sparkles, Moon, Sun, Leaf, Flame, Droplet, Crown, Music, Camera, Bird,
  Users, CalendarDays, FileText, History, Plus, X, Pencil, Trash2, Copy, Send,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Check, Eye, Download, Upload
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* 定数・ヘルパー                                                       */
/* ------------------------------------------------------------------ */

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);

const COLORS = [
  { key: "red", bg: "bg-rose-300", ring: "ring-rose-400", text: "text-rose-700" },
  { key: "orange", bg: "bg-orange-300", ring: "ring-orange-400", text: "text-orange-700" },
  { key: "yellow", bg: "bg-amber-300", ring: "ring-amber-400", text: "text-amber-700" },
  { key: "green", bg: "bg-emerald-300", ring: "ring-emerald-400", text: "text-emerald-700" },
  { key: "mint", bg: "bg-teal-300", ring: "ring-teal-400", text: "text-teal-700" },
  { key: "skyblue", bg: "bg-sky-300", ring: "ring-sky-400", text: "text-sky-700" },
  { key: "blue", bg: "bg-indigo-400", ring: "ring-indigo-500", text: "text-indigo-800" },
  { key: "purple", bg: "bg-violet-300", ring: "ring-violet-400", text: "text-violet-700" },
  { key: "pink", bg: "bg-pink-300", ring: "ring-pink-400", text: "text-pink-700" },
  { key: "white", bg: "bg-white", ring: "ring-gray-300", text: "text-gray-400" },
  { key: "black", bg: "bg-gray-800", ring: "ring-gray-900", text: "text-gray-100" },
];
const colorOf = (key) => COLORS.find((c) => c.key === key) || COLORS[6];

const SYMBOLS = [
  { key: "star", Icon: Star }, { key: "heart", Icon: Heart }, { key: "sparkles", Icon: Sparkles },
  { key: "moon", Icon: Moon }, { key: "sun", Icon: Sun }, { key: "leaf", Icon: Leaf },
  { key: "flame", Icon: Flame }, { key: "drop", Icon: Droplet }, { key: "crown", Icon: Crown },
  { key: "music", Icon: Music }, { key: "camera", Icon: Camera }, { key: "bird", Icon: Bird },
];
const symbolOf = (key) => (SYMBOLS.find((s) => s.key === key) || SYMBOLS[0]).Icon;

const CHAR_LIMIT = 280;
const MAX_MEMBER_SLOTS = 10;

const DEFAULT_TEMPLATE = `{メンバータグ一覧}
{グループ一覧}
{個人タグ一覧}
{グループタグ一覧}
{日付} {イベント名}
🎪{会場}
{レギュレーション}`;

const SINGLE_PLACEHOLDERS = ["グループ", "名前", "Xアカウント", "日付", "イベント名", "会場", "個人タグ", "グループタグ", "レギュレーション"];
const MULTI_PLACEHOLDERS = ["メンバータグ一覧", "個人タグ一覧", "グループタグ一覧", "グループ一覧"];

function dedupedNonEmpty(arr) {
  const seen = new Set();
  const out = [];
  for (const s of arr) {
    if (s && !seen.has(s)) { seen.add(s); out.push(s); }
  }
  return out;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function buildText(template, values) {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.split(`{${key}}`).join(value);
  }
  return result
    .split("\n")
    .filter((line) => line.replace(/🎪/g, "").trim().length > 0)
    .join("\n");
}

import { supabase } from "./supabaseClient";

/* ------------------------------------------------------------------ */
/* 永続化                                                               */
/* 個人用データ（イベント・テンプレート・履歴・選択状態）：このブラウザだけに保存 */
/* 共有データ（メンバー情報）：Supabaseに保存し、全員で共有                */
/* ------------------------------------------------------------------ */

function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(`idolposttext:${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveLocal(key, value) {
  try {
    localStorage.setItem(`idolposttext:${key}`, JSON.stringify(value));
  } catch {
    /* 保存に失敗しても致命的ではないので静かに無視 */
  }
}

async function loadShared(key, fallback) {
  if (!supabase) return loadLocal(key, fallback);
  const { data, error } = await supabase.from("shared_data").select("value").eq("key", key).maybeSingle();
  if (error || !data) return fallback;
  return data.value ?? fallback;
}
async function saveShared(key, value) {
  if (!supabase) { saveLocal(key, value); return; }
  await supabase.from("shared_data").upsert({ key, value, updated_at: new Date().toISOString() });
}

/* ------------------------------------------------------------------ */
/* 小さな共通パーツ                                                     */
/* ------------------------------------------------------------------ */

function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-3xl shadow-sm shadow-indigo-100 p-5 ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ icon: Icon, title, right }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-indigo-500" />
        <h2 className="text-[15px] font-bold text-gray-800 tracking-tight">{title}</h2>
      </div>
      {right}
    </div>
  );
}

function IconBadge({ colorKey, symbolKey, size = 32 }) {
  const c = colorOf(colorKey);
  const Icon = symbolOf(symbolKey);
  return (
    <div
      className={`rounded-full ${c.bg} ring-1 ${c.ring} flex items-center justify-center flex-shrink-0`}
      style={{ width: size, height: size }}
    >
      <Icon size={size * 0.5} className={c.text} strokeWidth={2.2} />
    </div>
  );
}

function SoftButton({ children, onClick, tone = "indigo", disabled, className = "", type = "button" }) {
  const tones = {
    indigo: "bg-indigo-500 text-white active:bg-indigo-600",
    mint: "bg-teal-100 text-teal-800 active:bg-teal-200",
    lavender: "bg-violet-100 text-violet-800 active:bg-violet-200",
    pink: "bg-pink-100 text-rose-600 active:bg-pink-200",
    ghost: "bg-gray-100 text-gray-600 active:bg-gray-200",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl font-bold text-sm px-4 py-2.5 transition disabled:opacity-40 disabled:pointer-events-none ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl bg-violet-50 focus:bg-white focus:ring-2 ring-indigo-300 outline-none px-4 py-3 text-[15px] text-gray-800 placeholder-gray-400 transition"
    />
  );
}

function TopBar({ title, onBack }) {
  return (
    <div className="flex items-center gap-2 mb-4 pt-1">
      {onBack && (
        <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-full active:bg-indigo-100 text-indigo-600">
          <ChevronLeft size={22} />
        </button>
      )}
      <h1 className="text-lg font-black text-gray-800 tracking-tight">{title}</h1>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* アイコン（色・シンボル）選択                                          */
/* ------------------------------------------------------------------ */

function IconPicker({ colorKey, symbolKey, onChangeColor, onChangeSymbol }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-400 mb-2">アイコン</p>
      <IconBadge colorKey={colorKey} symbolKey={symbolKey} size={48} />

      <p className="text-xs text-gray-400 mt-4 mb-1.5">カラー</p>
      <div className="flex flex-wrap gap-2">
        {COLORS.map((c) => (
          <button
            key={c.key}
            onClick={() => onChangeColor(c.key)}
            className={`w-7 h-7 rounded-full ${c.bg} ring-1 ring-gray-300 ${colorKey === c.key ? "ring-2 ring-offset-2 ring-indigo-500" : ""}`}
          />
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-4 mb-1.5">シンボル</p>
      <div className="grid grid-cols-6 gap-2">
        {SYMBOLS.map((s) => (
          <button
            key={s.key}
            onClick={() => onChangeSymbol(s.key)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
              symbolKey === s.key ? `${colorOf(colorKey).bg} ${colorOf(colorKey).text}` : "bg-violet-50 text-gray-400"
            }`}
          >
            <s.Icon size={17} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* メンバー一括登録フォーム                                              */
/* ------------------------------------------------------------------ */

function BulkMemberForm({ onCancel, onSave }) {
  const [raw, setRaw] = useState("");

  const parsed = useMemo(() => {
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const parts = line.split(/[,、\t]/).map((p) => p.trim());
        return {
          groupName: parts[0] || "",
          groupTag: parts[1] || "",
          name: parts[2] || "",
          account: parts[3] || "",
          personalTag: parts[4] || "",
          regulation: parts[5] || "",
        };
      })
      .filter((p) => p.groupName.length > 0 && p.name.length > 0);
  }, [raw]);

  const submit = () => {
    if (parsed.length === 0) return;
    const newMembers = parsed.map((p, i) => ({
      id: uid(),
      groupName: p.groupName,
      name: p.name,
      account: p.account,
      personalTag: p.personalTag,
      groupTag: p.groupTag,
      regulation: p.regulation,
      iconColorName: COLORS[i % COLORS.length].key,
      iconSymbol: "star",
    }));
    onSave(newMembers);
  };

  return (
    <Card>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-400 mb-1.5">
            1行に1人ずつ、以下の形式で貼り付けてください（グループ名と名前は必須、それ以外は空欄でも可）
          </p>
          <p className="text-[11px] text-indigo-500 font-mono mb-1.5">
            グループ名,グループタグ,名前,Xアカウント,個人タグ,撮影レギュレーション
          </p>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={9}
            placeholder={
              "ファーストプレイリスト,FP,羽月あい,@example1,あいたぐ,撮影可能\n" +
              "ファーストプレイリスト,FP,宮脇はる,@example2,はるたぐ\n" +
              "STAiNY,STAiNY,浜辺千夢,@example3"
            }
            className="w-full rounded-2xl bg-violet-50 focus:bg-white focus:ring-2 ring-indigo-300 outline-none p-3 text-sm text-gray-800 font-mono"
          />
        </div>
        {parsed.length > 0 && (
          <div className="bg-indigo-50 rounded-2xl p-3">
            <p className="text-xs font-bold text-indigo-600 mb-1.5">{parsed.length}人を登録します</p>
            <div className="flex flex-wrap gap-1.5">
              {parsed.map((p, i) => (
                <span key={i} className="text-[11px] bg-white rounded-full px-2 py-1 text-gray-600">
                  {p.name}<span className="text-gray-400">（{p.groupName}）</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-5">
        <SoftButton tone="indigo" onClick={submit} disabled={parsed.length === 0}>
          {parsed.length > 0 ? `${parsed.length}人を登録` : "登録"}
        </SoftButton>
        <SoftButton tone="ghost" onClick={onCancel}>キャンセル</SoftButton>
      </div>
    </Card>
  );
}


function emptyMember(groupName = "") {
  return { id: uid(), groupName, name: "", account: "", personalTag: "", groupTag: "", regulation: "", iconColorName: "blue", iconSymbol: "star" };
}

function MemberForm({ initial, onCancel, onSave, onDelete }) {
  const [m, setM] = useState(initial);
  const set = (k) => (v) => setM((p) => ({ ...p, [k]: v }));

  return (
    <Card>
      <div className="space-y-3">
        <TextInput value={m.groupName} onChange={set("groupName")} placeholder="グループ" />
        <TextInput value={m.name} onChange={set("name")} placeholder="名前" />
        <TextInput value={m.account} onChange={set("account")} placeholder="Xアカウント" />
        <TextInput value={m.personalTag} onChange={set("personalTag")} placeholder="個人タグ" />
        <TextInput value={m.groupTag} onChange={set("groupTag")} placeholder="グループタグ" />
        <TextInput value={m.regulation} onChange={set("regulation")} placeholder="レギュレーション（撮影可能 など）" />
        <IconPicker
          colorKey={m.iconColorName}
          symbolKey={m.iconSymbol}
          onChangeColor={(k) => setM((p) => ({ ...p, iconColorName: k }))}
          onChangeSymbol={(k) => setM((p) => ({ ...p, iconSymbol: k }))}
        />
      </div>
      <div className="flex gap-2 mt-5">
        <SoftButton tone="indigo" onClick={() => onSave(m)} disabled={!m.name.trim()}>保存</SoftButton>
        <SoftButton tone="ghost" onClick={onCancel}>キャンセル</SoftButton>
        {onDelete && (
          <SoftButton tone="pink" onClick={() => onDelete(m.id)} className="ml-auto">
            <Trash2 size={15} className="inline -mt-0.5 mr-1" />削除
          </SoftButton>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* メンバー管理ページ                                                    */
/* ------------------------------------------------------------------ */

function MembersPage({ members, setMembers, onBack }) {
  const [openGroup, setOpenGroup] = useState(null);
  const [editing, setEditing] = useState(null); // 'new' | member | null

  const groups = useMemo(() => dedupedNonEmpty(members.map((m) => m.groupName)).sort(), [members]);

  const saveMember = (m) => {
    setMembers((prev) => {
      const exists = prev.some((x) => x.id === m.id);
      return exists ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m];
    });
    setEditing(null);
  };
  const deleteMember = (id) => {
    setMembers((prev) => prev.filter((x) => x.id !== id));
    setEditing(null);
  };
  const moveMemberInGroup = (groupName, indexInGroup, dir) => {
    setMembers((prev) => {
      const indices = prev.map((m, i) => (m.groupName === groupName ? i : -1)).filter((i) => i !== -1);
      const j = indexInGroup + dir;
      if (j < 0 || j >= indices.length) return prev;
      const next = [...prev];
      const a = indices[indexInGroup];
      const b = indices[j];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
  };

  if (editing === "bulk") {
    return (
      <div>
        <TopBar title="メンバー一括登録" onBack={() => setEditing(null)} />
        <BulkMemberForm
          onCancel={() => setEditing(null)}
          onSave={(newMembers) => {
            setMembers((prev) => [...prev, ...newMembers]);
            setOpenGroup(newMembers[0]?.groupName || openGroup);
            setEditing(null);
          }}
        />
      </div>
    );
  }

  if (editing) {
    return (
      <div>
        <TopBar title={editing === "new" ? "メンバー新規登録" : "メンバー編集"} onBack={() => setEditing(null)} />
        <MemberForm
          initial={editing === "new" ? emptyMember(openGroup || "") : editing}
          onCancel={() => setEditing(null)}
          onSave={saveMember}
          onDelete={editing === "new" ? null : deleteMember}
        />
      </div>
    );
  }

  return (
    <div>
      <TopBar title="メンバー一覧" onBack={onBack} />
      <p className="text-[11px] text-indigo-400 bg-indigo-50 rounded-2xl px-3 py-2 mb-3">
        メンバー情報はこのアプリを使う全員で共有されます。誰でも追加・編集・削除できるのでご注意ください（イベント・テンプレート・投稿履歴・現在の選択状態も同様に共有されます）。
      </p>
      <div className="flex gap-2 mb-4">
        <SoftButton tone="indigo" onClick={() => setEditing("new")}>
          <Plus size={15} className="inline -mt-0.5 mr-1" />新規登録
        </SoftButton>
        <SoftButton tone="lavender" onClick={() => setEditing("bulk")}>
          <Users size={15} className="inline -mt-0.5 mr-1" />一括登録
        </SoftButton>
      </div>

      {groups.length === 0 && <p className="text-sm text-gray-400">保存済みメンバーはいません</p>}

      <div className="space-y-3">
        {groups.map((g) => (
          <Card key={g}>
            <button className="w-full flex items-center justify-between" onClick={() => setOpenGroup(openGroup === g ? null : g)}>
              <span className="font-bold text-gray-800">{g}</span>
              <span className="flex items-center gap-2 text-xs text-gray-400">
                {members.filter((m) => m.groupName === g).length}人
                {openGroup === g ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            </button>
            {openGroup === g && (
              <div className="mt-3 space-y-2">
                {members.filter((m) => m.groupName === g).map((m, i, arr) => (
                  <div key={m.id} className="flex items-center gap-2 bg-violet-50 rounded-2xl px-3 py-2">
                    <IconBadge colorKey={m.iconColorName} symbolKey={m.iconSymbol} size={30} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{m.name}</p>
                      <p className="text-xs text-gray-400 truncate">{m.account}</p>
                    </div>
                    <button onClick={() => moveMemberInGroup(g, i, -1)} disabled={i === 0} className="text-gray-300 disabled:opacity-30 p-1">
                      <ChevronUp size={15} />
                    </button>
                    <button onClick={() => moveMemberInGroup(g, i, 1)} disabled={i === arr.length - 1} className="text-gray-300 disabled:opacity-30 p-1">
                      <ChevronDown size={15} />
                    </button>
                    <button onClick={() => setEditing(m)} className="p-1.5 text-indigo-500"><Pencil size={15} /></button>
                  </div>
                ))}
                <SoftButton tone="lavender" onClick={() => { setEditing("new"); }} className="w-full">
                  <Plus size={14} className="inline -mt-0.5 mr-1" />{g}に追加
                </SoftButton>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* イベント管理ページ                                                    */
/* ------------------------------------------------------------------ */

function emptyEvent() {
  return { id: uid(), date: new Date().toISOString().slice(0, 10), eventName: "", place: "" };
}

function EventForm({ initial, onCancel, onSave, onDelete }) {
  const [e, setE] = useState(initial);
  const set = (k) => (v) => setE((p) => ({ ...p, [k]: v }));
  return (
    <Card>
      <div className="space-y-3">
        <TextInput type="date" value={e.date} onChange={set("date")} placeholder="日付" />
        <TextInput value={e.eventName} onChange={set("eventName")} placeholder="イベント名" />
        <TextInput value={e.place} onChange={set("place")} placeholder="会場" />
      </div>
      <div className="flex gap-2 mt-5">
        <SoftButton tone="indigo" onClick={() => onSave(e)} disabled={!e.eventName.trim()}>保存</SoftButton>
        <SoftButton tone="ghost" onClick={onCancel}>キャンセル</SoftButton>
        {onDelete && (
          <SoftButton tone="pink" onClick={() => onDelete(e.id)} className="ml-auto">
            <Trash2 size={15} className="inline -mt-0.5 mr-1" />削除
          </SoftButton>
        )}
      </div>
    </Card>
  );
}

function EventsPage({ events, setEvents, onBack }) {
  const [editing, setEditing] = useState(null);
  const sorted = useMemo(() => [...events].sort((a, b) => (a.date < b.date ? 1 : -1)), [events]);

  const save = (e) => {
    setEvents((prev) => (prev.some((x) => x.id === e.id) ? prev.map((x) => (x.id === e.id ? e : x)) : [...prev, e]));
    setEditing(null);
  };
  const remove = (id) => { setEvents((prev) => prev.filter((x) => x.id !== id)); setEditing(null); };

  if (editing) {
    return (
      <div>
        <TopBar title={editing === "new" ? "イベント新規登録" : "イベント編集"} onBack={() => setEditing(null)} />
        <EventForm initial={editing === "new" ? emptyEvent() : editing} onCancel={() => setEditing(null)} onSave={save} onDelete={editing === "new" ? null : remove} />
      </div>
    );
  }

  return (
    <div>
      <TopBar title="イベント一覧" onBack={onBack} />
      <SoftButton tone="indigo" onClick={() => setEditing("new")} className="mb-4">
        <Plus size={15} className="inline -mt-0.5 mr-1" />新規イベント登録
      </SoftButton>
      {sorted.length === 0 && <p className="text-sm text-gray-400">保存済みイベントはいません</p>}
      <div className="space-y-2">
        {sorted.map((e) => (
          <Card key={e.id} className="!p-4">
            <button className="w-full flex items-center justify-between text-left" onClick={() => setEditing(e)}>
              <div className="min-w-0">
                <p className="text-xs text-indigo-500 font-bold">{formatDate(e.date)}</p>
                <p className="text-sm font-bold text-gray-800 truncate">{e.eventName}</p>
                {e.place && <p className="text-xs text-gray-400 truncate">{e.place}</p>}
              </div>
              <Pencil size={15} className="text-indigo-400 flex-shrink-0" />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* テンプレート管理ページ（チップ挿入・ライブプレビュー付き）              */
/* ------------------------------------------------------------------ */

function TemplatesPage({ templates, setTemplates, activeId, setActiveId, content, setContent, values, onBack }) {
  const [renaming, setRenaming] = useState(false);
  const [savingNewName, setSavingNewName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const taRef = useRef(null);
  const pendingCursor = useRef(null);

  useEffect(() => {
    if (pendingCursor.current !== null && taRef.current) {
      const pos = pendingCursor.current;
      taRef.current.focus();
      taRef.current.setSelectionRange(pos, pos);
      pendingCursor.current = null;
    }
  }, [content]);

  const insert = (key) => {
    const ta = taRef.current;
    const insertion = `{${key}}`;
    const start = ta ? ta.selectionStart : content.length;
    const end = ta ? ta.selectionEnd : content.length;
    const next = content.slice(0, start) + insertion + content.slice(end);
    pendingCursor.current = start + insertion.length;
    setContent(next);
  };

  const preview = useMemo(() => buildText(content, values), [content, values]);
  const overLimit = preview.length > CHAR_LIMIT;

  const selectTemplate = (t) => { setActiveId(t.id); setContent(t.content); };
  const overwrite = () => setTemplates((prev) => prev.map((t) => (t.id === activeId ? { ...t, content } : t)));
  const saveNew = () => {
    if (!nameDraft.trim()) return;
    const t = { id: uid(), name: nameDraft.trim(), content };
    setTemplates((prev) => [...prev, t]);
    setActiveId(t.id);
    setSavingNewName(false);
    setNameDraft("");
  };
  const rename = () => {
    if (!nameDraft.trim()) return;
    setTemplates((prev) => prev.map((t) => (t.id === activeId ? { ...t, name: nameDraft.trim() } : t)));
    setRenaming(false);
    setNameDraft("");
  };
  const remove = () => {
    setTemplates((prev) => prev.filter((t) => t.id !== activeId));
    setActiveId(null);
  };
  const move = (index, dir) => {
    setTemplates((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  return (
    <div>
      <TopBar title="テンプレート選択・編集" onBack={onBack} />

      <Card className="mb-4">
        {templates.length === 0 && <p className="text-sm text-gray-400">保存済みテンプレートはありません</p>}
        <div className="space-y-1">
          {templates.map((t, i) => (
            <div key={t.id} className={`flex items-center gap-2 rounded-2xl px-3 py-2 ${activeId === t.id ? "bg-indigo-50" : ""}`}>
              <button className="flex-1 flex items-center justify-between text-left" onClick={() => selectTemplate(t)}>
                <span className="text-sm text-gray-800">{t.name}</span>
                {activeId === t.id && <Check size={15} className="text-indigo-500" />}
              </button>
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-300 disabled:opacity-30"><ChevronUp size={15} /></button>
              <button onClick={() => move(i, 1)} disabled={i === templates.length - 1} className="text-gray-300 disabled:opacity-30"><ChevronDown size={15} /></button>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">↑↓で並び替え。1〜4番目はホームのクイックボタンに表示されます。</p>
        {activeId && (
          <SoftButton tone="ghost" className="mt-3" onClick={() => { setRenaming(true); setNameDraft(templates.find((t) => t.id === activeId)?.name || ""); }}>
            名前を変更
          </SoftButton>
        )}
        {renaming && (
          <div className="flex gap-2 mt-2">
            <TextInput value={nameDraft} onChange={setNameDraft} placeholder="新しい名前" />
            <SoftButton tone="indigo" onClick={rename}>保存</SoftButton>
          </div>
        )}
      </Card>

      <Card className="mb-4">
        <p className="text-xs text-gray-400 mb-2">タップで挿入</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {SINGLE_PLACEHOLDERS.map((k) => (
            <button key={k} onClick={() => insert(k)} className="text-[11px] font-bold bg-violet-100 text-violet-700 rounded-full px-2.5 py-1.5">{k}</button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mb-2">複数人まとめて使う場合（1人ずつ改行して並びます）</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {MULTI_PLACEHOLDERS.map((k) => (
            <button key={k} onClick={() => insert(k)} className="text-[11px] font-bold bg-teal-100 text-teal-700 rounded-full px-2.5 py-1.5">{k}</button>
          ))}
        </div>
        <textarea
          ref={taRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={7}
          className="w-full rounded-2xl bg-violet-50 focus:bg-white focus:ring-2 ring-indigo-300 outline-none p-3 text-sm text-gray-800 font-mono"
        />
      </Card>

      <Card className="mb-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2"><Eye size={13} />プレビュー（現在の選択内容で自動更新）</div>
        <div className="bg-violet-50 rounded-2xl p-3 text-sm text-gray-800 whitespace-pre-wrap min-h-[60px]">{preview}</div>
        <p className={`text-right text-[11px] mt-1.5 ${overLimit ? "text-rose-500" : "text-gray-400"}`}>
          {preview.length} / {CHAR_LIMIT}文字（{overLimit ? `${preview.length - CHAR_LIMIT}文字オーバー` : `あと${CHAR_LIMIT - preview.length}文字`}）
        </p>
      </Card>

      <div className="flex gap-2">
        <SoftButton tone="mint" onClick={overwrite} disabled={!activeId}>上書き保存</SoftButton>
        <SoftButton tone="lavender" onClick={() => { setSavingNewName(true); setNameDraft(""); }}>新規保存</SoftButton>
        <SoftButton tone="pink" onClick={remove} disabled={!activeId}>削除</SoftButton>
      </div>
      {savingNewName && (
        <div className="flex gap-2 mt-2">
          <TextInput value={nameDraft} onChange={setNameDraft} placeholder="例：撮影会用" />
          <SoftButton tone="indigo" onClick={saveNew}>保存</SoftButton>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 履歴ページ                                                           */
/* ------------------------------------------------------------------ */

function HistoryPage({ history, setHistory, onBack }) {
  const [copiedId, setCopiedId] = useState(null);
  const copyAgain = async (h) => {
    try { await navigator.clipboard.writeText(h.text); setCopiedId(h.id); } catch { /* noop */ }
  };
  return (
    <div>
      <TopBar title="投稿履歴" onBack={onBack} />
      {history.length === 0 && <p className="text-sm text-gray-400">まだ投稿履歴はありません</p>}
      <div className="space-y-3">
        {history.map((h) => (
          <Card key={h.id}>
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>{new Date(h.date).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              {h.eventName && <span className="text-indigo-500">{h.eventName}</span>}
            </div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-4 mb-2">{h.text}</p>
            <div className="flex gap-2">
              <SoftButton tone="mint" onClick={() => copyAgain(h)}>
                <Copy size={13} className="inline -mt-0.5 mr-1" />{copiedId === h.id ? "コピーしました" : "もう一度コピー"}
              </SoftButton>
              <SoftButton tone="ghost" onClick={() => setHistory((prev) => prev.filter((x) => x.id !== h.id))}>
                <Trash2 size={13} className="inline -mt-0.5 mr-1" />削除
              </SoftButton>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ホーム（投稿作成）ページ                                              */
/* ------------------------------------------------------------------ */

function MemberSlotRow({ slot, members, groupNames, onChangeGroup, onChangeMember, onRemove, removable }) {
  const current = members.find((m) => m.id === slot.memberId);
  const groupMembers = members.filter((m) => m.groupName === slot.groupFilter);

  return (
    <div className="flex items-center gap-2 border-l-2 border-dashed border-indigo-200 pl-3 py-1">
      <select
        value={slot.groupFilter || ""}
        onChange={(e) => onChangeGroup(e.target.value || null)}
        className="text-sm text-indigo-600 font-bold bg-transparent border-none outline-none max-w-[110px]"
      >
        <option value="">グループ</option>
        {groupNames.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>

      {slot.groupFilter && (
        <div className="flex items-center gap-1">
          {current && <IconBadge colorKey={current.iconColorName} symbolKey={current.iconSymbol} size={18} />}
          <select
            value={slot.memberId || ""}
            onChange={(e) => onChangeMember(e.target.value || null)}
            className="text-sm text-indigo-600 font-bold bg-transparent border-none outline-none max-w-[110px]"
          >
            <option value="">選択なし</option>
            {groupMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      )}

      <span className="flex-1" />
      {removable && (
        <button onClick={onRemove} className="text-gray-300"><X size={16} /></button>
      )}
    </div>
  );
}

function HomePage({ members, events, memberSlots, setMemberSlots, selectedEventId, setSelectedEventId, templates, activeTemplateContent, setActiveTemplateId, activeTemplateId, setActiveTemplateContent, values, recentGroups, touchGroup, onNavigate, recordHistory }) {
  const groupNames = useMemo(() => {
    const all = dedupedNonEmpty(members.map((m) => m.groupName));
    const used = recentGroups.filter((g) => all.includes(g));
    const rest = all.filter((g) => !used.includes(g)).sort();
    return [...used, ...rest];
  }, [members, recentGroups]);
  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const [openEvent, setOpenEvent] = useState(false);
  const [copyFlash, setCopyFlash] = useState(false);

  const text = useMemo(() => buildText(activeTemplateContent, values), [activeTemplateContent, values]);
  const overLimit = text.length > CHAR_LIMIT;

  const updateSlot = (index, patch) => {
    setMemberSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };
  const addSlot = () => {
    if (memberSlots.length >= MAX_MEMBER_SLOTS) return;
    setMemberSlots((prev) => [...prev, { id: uid(), groupFilter: null, memberId: null }]);
  };
  const removeSlot = (index) => setMemberSlots((prev) => prev.filter((_, i) => i !== index));

  const doCopy = async () => {
    try { await navigator.clipboard.writeText(text); setCopyFlash(true); setTimeout(() => setCopyFlash(false), 1500); } catch { /* noop */ }
    recordHistory(text);
  };
  const doPost = () => {
    recordHistory(text);
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  const quickTemplates = templates.slice(0, 4);

  return (
    <div className="space-y-4">
      {/* メンバー選択 */}
      <Card>
        <CardHeader
          icon={Users}
          title="メンバー選択"
          right={<button onClick={() => onNavigate("members")} className="text-xs font-bold text-indigo-500">一覧を管理</button>}
        />
        {groupNames.length === 0 ? (
          <p className="text-sm text-gray-400">保存済みメンバーはいません。まずは「一覧を管理」から登録してください。</p>
        ) : (
          <>
            <div className="space-y-2 mb-2">
              {memberSlots.map((slot, i) => (
                <MemberSlotRow
                  key={slot.id}
                  slot={slot}
                  members={members}
                  groupNames={groupNames}
                  removable={memberSlots.length > 1}
                  onChangeGroup={(g) => {
                    updateSlot(i, { groupFilter: g, memberId: null });
                    touchGroup(g);
                  }}
                  onChangeMember={(id) => {
                    updateSlot(i, { memberId: id });
                    const m = members.find((mm) => mm.id === id);
                    if (m) touchGroup(m.groupName);
                  }}
                  onRemove={() => removeSlot(i)}
                />
              ))}
            </div>
            {memberSlots.length < MAX_MEMBER_SLOTS ? (
              <button onClick={addSlot} className="text-xs font-bold text-indigo-500">＋ メンバーを追加</button>
            ) : (
              <p className="text-[11px] text-gray-400">最大{MAX_MEMBER_SLOTS}人まで選択できます（Xのタグ付け上限）</p>
            )}
          </>
        )}
      </Card>

      {/* イベント選択 */}
      <Card>
        <CardHeader
          icon={CalendarDays}
          title="イベント選択"
          right={<button onClick={() => onNavigate("events")} className="text-xs font-bold text-indigo-500">一覧を管理</button>}
        />
        {events.length === 0 ? (
          <p className="text-sm text-gray-400">保存済みイベントはいません。まずは「一覧を管理」から登録してください。</p>
        ) : (
          <div className="relative inline-block">
            <button onClick={() => setOpenEvent((v) => !v)} className="text-sm font-bold text-indigo-600 flex items-center gap-1">
              {selectedEvent ? `${formatDate(selectedEvent.date)} ${selectedEvent.eventName}` : "選択なし"} <ChevronDown size={13} />
            </button>
            {openEvent && (
              <div className="absolute z-10 mt-1 bg-white rounded-2xl shadow-lg py-1.5 min-w-[220px] max-h-56 overflow-auto">
                <button className="block w-full text-left px-3 py-1.5 text-sm text-gray-400" onClick={() => { setSelectedEventId(null); setOpenEvent(false); }}>選択なし</button>
                {[...events].sort((a, b) => (a.date < b.date ? 1 : -1)).map((e) => (
                  <button key={e.id} className="block w-full text-left px-3 py-1.5 text-sm text-gray-800" onClick={() => { setSelectedEventId(e.id); setOpenEvent(false); }}>
                    {formatDate(e.date)} {e.eventName}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* プレビュー */}
      <Card>
        <CardHeader icon={FileText} title="プレビュー" />
        <div className="flex justify-between text-xs font-bold mb-3">
          <button onClick={() => onNavigate("history")} className="text-indigo-500">履歴を見る</button>
          <button onClick={() => onNavigate("templates")} className="text-indigo-500">テンプレート選択・編集</button>
        </div>

        {quickTemplates.length > 0 && (
          <div className="flex gap-1.5 mb-3">
            {quickTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => { setActiveTemplateId(t.id); setActiveTemplateContent(t.content); }}
                className={`flex-1 text-xs font-bold rounded-2xl px-2 py-2 truncate ${activeTemplateId === t.id ? "bg-indigo-500 text-white" : "bg-teal-100 text-teal-800"}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        <div className="bg-violet-50 rounded-2xl p-3.5 text-[15px] text-gray-800 whitespace-pre-wrap min-h-[80px]">{text}</div>
        <p className={`text-right text-[11px] mt-1.5 mb-3 ${overLimit ? "text-rose-500" : "text-gray-400"}`}>
          {text.length} / {CHAR_LIMIT}文字（{overLimit ? `${text.length - CHAR_LIMIT}文字オーバー` : `あと${CHAR_LIMIT - text.length}文字`}）
        </p>

        <div className="space-y-2">
          <SoftButton tone="indigo" onClick={doCopy} className="w-full">
            <Copy size={15} className="inline -mt-0.5 mr-1.5" />{copyFlash ? "コピーしました！" : "コピー"}
          </SoftButton>
          <SoftButton tone="indigo" onClick={doPost} className="w-full">
            <Send size={15} className="inline -mt-0.5 mr-1.5" />Xで投稿
          </SoftButton>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ルート App                                                          */
/* ------------------------------------------------------------------ */

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("home");

  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [history, setHistory] = useState([]);

  const [memberSlots, setMemberSlots] = useState([{ id: uid(), groupFilter: null, memberId: null }]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const [activeTemplateContent, setActiveTemplateContent] = useState(DEFAULT_TEMPLATE);
  const [recentGroups, setRecentGroups] = useState(() => loadLocal("recentGroups", []));

  // グループを選ぶ・そのグループのメンバーを選ぶ、のどちらかが起きるたびに「使った順」を更新する
  const touchGroup = (groupName) => {
    if (!groupName) return;
    setRecentGroups((prev) => {
      const next = [groupName, ...prev.filter((g) => g !== groupName)];
      saveLocal("recentGroups", next);
      return next;
    });
  };

  // 最新のmembersを非同期コールバックからも参照できるようにしておく（他端末の選択状態を復元する際に使う）
  const membersRef = useRef([]);
  useEffect(() => { membersRef.current = members; }, [members]);

  // 「編集」専用の更新関数。生のsetXと違い、呼ばれた時点で必ずSupabaseへの保存も行う。
  // 読み込み・他端末からの同期(生のsetXを直接呼ぶ場合)では保存が走らないようにするための分離。
  // これをしないと、読み込みや他端末の変更が「保存」として誤って上書き保存されてしまう。
  const updateMembers = (updater) => {
    setMembers((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveShared("members", next);
      return next;
    });
  };
  const updateEvents = (updater) => {
    setEvents((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveShared("events", next);
      return next;
    });
  };
  const updateTemplates = (updater) => {
    setTemplates((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveShared("templates", next);
      return next;
    });
  };
  const updateHistory = (updater) => {
    setHistory((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveShared("postHistory", next);
      return next;
    });
  };

  const lastRemoteSelectionRef = useRef(null);

  // 選択中の状態（メンバー選択・イベント選択・テンプレート編集内容）を復元する共通処理
  // 他端末からの反映で「今まさに選ぼうとしている空の枠」を消してしまわないよう、
  // ローカルの空枠（まだ誰も選んでいないスロット）は残したまま合成する。
  const applySelection = (sel) => {
    if (!sel) return;
    lastRemoteSelectionRef.current = JSON.stringify(sel);
    const restoredSlots = (sel.memberIds || [])
      .map((id) => membersRef.current.find((mm) => mm.id === id))
      .filter(Boolean)
      .map((mm) => ({ id: uid(), groupFilter: mm.groupName, memberId: mm.id }));
    setMemberSlots((prevSlots) => {
      const localEmptySlots = prevSlots.filter((s) => !s.memberId);
      const merged = restoredSlots.length
        ? [...restoredSlots, ...localEmptySlots]
        : (localEmptySlots.length ? localEmptySlots : [{ id: uid(), groupFilter: null, memberId: null }]);
      return merged.slice(0, MAX_MEMBER_SLOTS);
    });
    setSelectedEventId(sel.eventId || null);
    if (sel.activeTemplateId) setActiveTemplateId(sel.activeTemplateId);
    if (typeof sel.activeTemplateContent === "string") setActiveTemplateContent(sel.activeTemplateContent);
  };

  /* 初回読み込み */
  useEffect(() => {
    (async () => {
      const [m, e, t, h, sel] = await Promise.all([
        loadShared("members", []),
        loadShared("events", []),
        loadShared("templates", []),
        loadShared("postHistory", []),
        loadShared("lastSelection", null),
      ]);

      setMembers(m);
      membersRef.current = m;
      setEvents(e);
      const isFreshDefault = t.length === 0;
      const finalTemplates = isFreshDefault ? [{ id: uid(), name: "デフォルト", content: DEFAULT_TEMPLATE }] : t;
      setTemplates(finalTemplates);
      if (isFreshDefault) saveShared("templates", finalTemplates);
      setHistory(h);

      if (sel) {
        applySelection(sel);
        if (!finalTemplates.find((x) => x.id === sel.activeTemplateId)) {
          setActiveTemplateId(finalTemplates[0]?.id ?? null);
          setActiveTemplateContent(finalTemplates[0]?.content ?? DEFAULT_TEMPLATE);
        }
      } else {
        setActiveTemplateId(finalTemplates[0]?.id ?? null);
        setActiveTemplateContent(finalTemplates[0]?.content ?? DEFAULT_TEMPLATE);
      }
      setLoaded(true);
    })();
  }, []);

  /* 他の人が更新したら、リアルタイムで反映する（メンバー・イベント・テンプレート・履歴・選択状態すべて） */
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("shared_data_all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shared_data" },
        (payload) => {
          const row = payload.new;
          if (!row) return;
          switch (row.key) {
            case "members":
              setMembers(row.value || []);
              break;
            case "events":
              setEvents(row.value || []);
              break;
            case "templates":
              setTemplates(row.value && row.value.length ? row.value : [{ id: uid(), name: "デフォルト", content: DEFAULT_TEMPLATE }]);
              break;
            case "postHistory":
              setHistory(row.value || []);
              break;
            case "lastSelection":
              applySelection(row.value);
              break;
            default:
              break;
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  /* 選択状態（メンバー選択・イベント選択・テンプレート編集内容）は変更の度に共有保存する。
     テンプレート編集は1文字ごとに変わるので、少し待ってからまとめて保存する（デバウンス）。
     直前に他端末から受信した内容と同じ場合は、送り返す(エコー)だけになるので保存しない。 */
  const selectionSaveTimer = useRef(null);
  useEffect(() => {
    if (!loaded) return;
    const payload = {
      memberIds: memberSlots.map((s) => s.memberId).filter(Boolean),
      eventId: selectedEventId,
      activeTemplateId,
      activeTemplateContent,
    };
    const serialized = JSON.stringify(payload);
    if (serialized === lastRemoteSelectionRef.current) return;
    if (selectionSaveTimer.current) clearTimeout(selectionSaveTimer.current);
    selectionSaveTimer.current = setTimeout(() => {
      lastRemoteSelectionRef.current = serialized;
      saveShared("lastSelection", payload);
    }, 600);
    return () => clearTimeout(selectionSaveTimer.current);
  }, [memberSlots, selectedEventId, activeTemplateId, activeTemplateContent, loaded]);

  /* テンプレ用の値（プレースホルダー置換） */
  const selectedMembers = useMemo(
    () => memberSlots.map((s) => members.find((m) => m.id === s.memberId)).filter(Boolean),
    [memberSlots, members]
  );
  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const first = selectedMembers[0];

  const values = useMemo(() => ({
    "グループ": first ? `#${first.groupName}` : "",
    "名前": first ? first.name : "",
    "Xアカウント": first ? first.account : "",
    "日付": selectedEvent ? formatDate(selectedEvent.date) : "",
    "イベント名": selectedEvent ? selectedEvent.eventName : "",
    "会場": selectedEvent ? selectedEvent.place : "",
    "個人タグ": first?.personalTag ? `#${first.personalTag}` : "",
    "グループタグ": first?.groupTag ? `#${first.groupTag}` : "",
    "レギュレーション": first?.regulation || "",
    "メンバータグ一覧": selectedMembers.map((m) => `#${m.name}`).join("\n"),
    "個人タグ一覧": dedupedNonEmpty(selectedMembers.map((m) => m.personalTag)).map((t) => `#${t}`).join("\n"),
    "グループタグ一覧": dedupedNonEmpty(selectedMembers.map((m) => m.groupTag)).map((t) => `#${t}`).join("\n"),
    "グループ一覧": dedupedNonEmpty(selectedMembers.map((m) => m.groupName)).map((t) => `#${t}`).join("\n"),
  }), [first, selectedEvent, selectedMembers]);

  const recordHistory = (text) => {
    if (!text.trim()) return;
    const names = selectedMembers.map((m) => m.name).join("・");
    updateHistory((prev) => [{ id: uid(), date: new Date().toISOString(), text, memberName: names, eventName: selectedEvent?.eventName || "" }, ...prev].slice(0, 100));
  };

  /* データのバックアップ（保存領域に頼りきらないための書き出し・読み込み） */
  const importInputRef = useRef(null);

  const exportData = () => {
    const payload = {
      members,
      events,
      templates,
      postHistory: history,
      selection: {
        memberIds: memberSlots.map((s) => s.memberId).filter(Boolean),
        eventId: selectedEventId,
        activeTemplateId,
        activeTemplateContent,
      },
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `idolposttext-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const nextMembers = Array.isArray(data.members) ? data.members : members;
        if (Array.isArray(data.members)) updateMembers(data.members);
        if (Array.isArray(data.events)) updateEvents(data.events);
        if (Array.isArray(data.templates) && data.templates.length) updateTemplates(data.templates);
        if (Array.isArray(data.postHistory)) updateHistory(data.postHistory);

        if (data.selection) {
          const restoredSlots = (data.selection.memberIds || [])
            .map((id) => nextMembers.find((m) => m.id === id))
            .filter(Boolean)
            .map((m) => ({ id: uid(), groupFilter: m.groupName, memberId: m.id }));
          setMemberSlots(restoredSlots.length ? restoredSlots : [{ id: uid(), groupFilter: null, memberId: null }]);
          setSelectedEventId(data.selection.eventId || null);
          if (data.selection.activeTemplateId) setActiveTemplateId(data.selection.activeTemplateId);
          if (typeof data.selection.activeTemplateContent === "string") setActiveTemplateContent(data.selection.activeTemplateContent);
        }
        alert("データを読み込みました");
      } catch {
        alert("ファイルの読み込みに失敗しました。正しいバックアップファイルか確認してください。");
      }
    };
    reader.readAsText(file);
  };

  if (!loaded) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-violet-50 to-pink-50 text-gray-400 text-sm">読み込み中…</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-pink-50">
      <div className="max-w-md mx-auto px-4 pb-16 pt-6">
        <div className="flex items-center gap-2 mb-2 px-1">
          <Sparkles size={20} className="text-indigo-500" />
          <span className="font-black text-xl tracking-tight text-gray-800">IdolPostText</span>
          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-100 rounded-full px-2 py-0.5 ml-auto">Web版</span>
        </div>

        {!supabase && (
          <p className="text-[11px] text-rose-600 bg-rose-50 rounded-2xl px-3 py-2 mb-3">
            Supabaseが未設定のため、メンバー情報の共有は無効になっています（このブラウザだけでも一覧管理は使えます）。README.mdの手順に沿って`.env`を設定してください。
          </p>
        )}

        <div className="flex items-center gap-3 mb-5 px-1">
          <button onClick={exportData} className="flex items-center gap-1 text-[11px] font-bold text-gray-400">
            <Download size={12} />データを書き出す
          </button>
          <button onClick={() => importInputRef.current?.click()} className="flex items-center gap-1 text-[11px] font-bold text-gray-400">
            <Upload size={12} />読み込む
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importData(f); e.target.value = ""; }}
          />
        </div>

        {view === "home" && (
          <HomePage
            members={members}
            events={events}
            memberSlots={memberSlots}
            setMemberSlots={setMemberSlots}
            selectedEventId={selectedEventId}
            setSelectedEventId={setSelectedEventId}
            templates={templates}
            activeTemplateId={activeTemplateId}
            setActiveTemplateId={setActiveTemplateId}
            activeTemplateContent={activeTemplateContent}
            setActiveTemplateContent={setActiveTemplateContent}
            values={values}
            recentGroups={recentGroups}
            touchGroup={touchGroup}
            onNavigate={setView}
            recordHistory={recordHistory}
          />
        )}
        {view === "members" && <MembersPage members={members} setMembers={updateMembers} onBack={() => setView("home")} />}
        {view === "events" && <EventsPage events={events} setEvents={updateEvents} onBack={() => setView("home")} />}
        {view === "templates" && (
          <TemplatesPage
            templates={templates}
            setTemplates={updateTemplates}
            activeId={activeTemplateId}
            setActiveId={setActiveTemplateId}
            content={activeTemplateContent}
            setContent={setActiveTemplateContent}
            values={values}
            onBack={() => setView("home")}
          />
        )}
        {view === "history" && <HistoryPage history={history} setHistory={updateHistory} onBack={() => setView("home")} />}
      </div>
    </div>
  );
}
