# IdolPostText Web

推し活イベント用の投稿テキストを生成するアプリのWeb版です。メンバー情報はSupabase（無料のデータベース）で全員に共有され、イベント・テンプレート・投稿履歴・選択中の状態はブラウザごとの個人用データとして保存されます。

## 1. Supabaseのセットアップ（メンバー共有に必要）

### 1-1. プロジェクトを作る
1. https://supabase.com にアクセスし、無料アカウントを作成
2. 「New Project」からプロジェクトを作成（リージョンは Northeast Asia (Tokyo) がおすすめ）
3. 作成が終わるまで1〜2分待つ

### 1-2. テーブルを作る
プロジェクト画面左メニューの「SQL Editor」を開き、以下をそのまま貼り付けて実行（Run）してください。

```sql
create table shared_data (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

alter table shared_data enable row level security;

create policy "Allow public read" on shared_data
  for select using (true);

create policy "Allow public insert" on shared_data
  for insert with check (true);

create policy "Allow public update" on shared_data
  for update using (true);

alter publication supabase_realtime add table shared_data;
```

> **重要**：このSQLは「誰でも読み書きできる」設定にしています。パスワードなどのログイン機能は付いていないため、このアプリのURLを知っている人は誰でもメンバー情報を編集・削除できます。荒らし対策が必要な場合は、後述の「発展：アクセス制限」を参考にしてください。

### 1-3. キーを取得する
左メニューの「Project Settings」→「API」を開き、以下の2つをコピーしておきます。

- **Project URL**（例：`https://xxxxxxxxxxxx.supabase.co`）
- **anon public** キー（`anon` `public` と書かれている長い文字列）

## 2. アプリ側の設定

1. このプロジェクトのルートに `.env.example` をコピーして `.env` という名前で保存
2. 中身を1-3で取得した値に書き換える

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=あなたのanon publicキー
```

## 3. ローカルで動かす

```bash
npm install
npm run dev
```

表示されたURL（例：`http://localhost:5173`）をブラウザで開いて動作確認してください。

## 4. インターネットに公開する（Vercelの例）

1. このプロジェクトのフォルダをGitHubリポジトリにアップロード
2. https://vercel.com にアクセスし、GitHubアカウントで登録
3. 「Add New」→「Project」から、アップロードしたリポジトリを選択
4. 「Environment Variables」に `.env` と同じ内容（`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`）を追加
5. 「Deploy」を押すと数十秒〜数分で公開され、`https://（プロジェクト名）.vercel.app` のようなURLが発行されます

Netlifyでも同様の手順（Build command: `npm run build`、Publish directory: `dist`）で公開できます。

## 5. iPhoneのホーム画面に追加する

公開したURLをSafariで開き、共有ボタン→「ホーム画面に追加」。`index.html`にアプリ名を設定してあるので、今度は「claude.ai」ではなく「IdolPostText」という名前でアイコンが作られます。

## オフライン対応について

- アプリの画面自体は一度開けば端末にキャッシュされ、電波が無い状態でもすぐに開けます（PWA対応）
- メンバー・イベント・テンプレート・履歴も、前回読み込んだ内容がそのまま表示されます（閲覧・コピーはオフラインでも可能）
- オフライン中に新規登録・編集した内容は、いったん端末には保存されますが、通信が回復するまでは他の端末には反映されません。通信が回復すると自動で再送されますが、他の人が同じ内容を先に編集していた場合は上書きされる可能性があります（複数人がオフラインのまま同時編集するような使い方は避けてください）

## データの持ち方まとめ

| データ | 保存場所 | 共有範囲 |
|---|---|---|
| メンバー情報 | Supabase | 全員で共有 |
| イベント情報 | このブラウザ（localStorage） | 個人用 |
| テンプレート | このブラウザ（localStorage） | 個人用 |
| 投稿履歴・選択中の状態（プレビュー） | このブラウザ（localStorage） | 個人用 |

個人用データはブラウザ・端末ごとなので、PCとiPhoneの間では共有されません。アプリ内の「データを書き出す／読み込む」機能で手動で移すことができます。

## 発展：アクセス制限をかけたい場合

今の設定は「リンクを知っている人なら誰でも編集可能」です。もし特定の人だけに絞りたい場合は、Supabaseの認証機能（Auth）でログインを追加し、RLSのポリシーを `auth.uid() is not null` のような条件に変更する方法があります。必要であれば、その実装もお手伝いできます。
