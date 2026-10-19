---
title: "2026年10月時点のエージェント開発ワークフロー"
date: 2026-10-18T11:32:06-04:00
draft: false
description: "記事の要約"
categories:
- llm
tags:
- llm
---


# tl;dr:
この記事では、私が現在行っているエージェント開発のやり方を、まだ粗削りな第一版としてまとめます。
このやり方は、ドキュメント、フォルダ構成、そして検証フィードバックのための豊富なツールやスクリプトに重きを置いています。

現在のやり方は [Winetech Standard Repo](https://github.com/0xNF/wtstandardrepo) にまとめてあります。これは、新しいプロジェクトを始めるための最小限のフォルダ構成と、エージェントがそのまま読めるドキュメントを備えたスケルトンです。

## 主な要点
* ADR を使う
* メモリ、AGENTS.md、その他コンテキストを消費するドキュメントを定期的に整理する
* 作業中に見つけた気づきを書き留める場所を用意し、エージェントが脇道にそれず、情報も失われないようにする
* できるだけ多くの情報をリポジトリ内に置き、エージェントが必要なときに必要な文脈を取り出せるようにする
* エージェントにネガティブなフィードバックを返すツールやスクリプトを用意し、自力で素早く軌道修正できるようにする
* アプリケーションを実際に動かせるランタイムを渡し、実環境でテストさせる。静的解析だけでは足りない

{{< toc >}}


# 前提

ワークフロー、ツール、モデル、ハーネスが違えば結果も変わります。そこで、自分の環境がどのようなものかを最初に示しておきます。ご自身の期待値の調整にお役立てください。

## モデル
* 大型モデル
  * (メイン) Claude Opus 5.5 (xhigh)
  * (サブ) GPT Sol 6.1 (xhigh)
* 高速モデル
  * (メイン) Claude Sonnet 5.5 (medium)
  * (サブ) GPT Terra 6.1 (medium)

以前 Mistral を試したことがあります。DeepSeek、GLM、Kimi は評判は良く聞きますが、まだ試していません。

## ハーネス
* Claude Code
* [OhMyPi](https://github.com/can1357/oh-my-pi) (omp)

作業時間の 9 割は VSCode の中で過ごすため、[Claude Code の Visual Studio 拡張機能](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code)も使っています。LLM の出力の隣で、リッチな Markdown やコードの編集ができるのが気に入っています。次のような感じです。

![VS Code と Claude Code を並べた画面](/img/agentic/workflows/rev1/vscode_claudecode_1.png)

一方で _omp_ も好きです。Language Server が組み込まれているので、シンボルの名前変更などを効率よく、漏れなく行えます。

Anthropic は Max サブスクリプションを他のハーネスで使うことを認めていないため、_omp_ は OpenAI のモデルを使いたいときにだけ使っています。

## サブスクリプション
* Anthropic Teams Max サブスクリプション
* OpenAI GPT の従量課金

この構成のため、利用制限がずっと緩い Claude を好んで使っています。ただ、Anthropic がしばらく配っていた「ボーナストークン」を廃止したことで、最近は木曜日頃に制限に達することが多くなりました。そのため、週の終わりは _omp_ で GPT Sol を使うのが定番になっています。


## プロジェクトの所有権
私は自分のリポジトリの進め方をほぼ自分で決められるので、好きなように構成できます。チームの規模、コードレビューの要件、マネジメント上のプロセスなどにより、以下の内容はご自身の環境では実現できないかもしれません。それでも、一部は役に立つかもしれません。


# フォルダ構成
LLM は文脈が大好きで、より多くの文脈にアクセスしたがります。そこで、いくつかの初期ファイルを含むフォルダ構成を用意しており、これがうまく機能しているようです。

ここで詳しく説明することはしませんが、最近の私のリポジトリの構成は [Winetech Standard Repo](https://github.com/0xNF/wtstandardrepo) に多くをまとめてあるので、ぜひ見てみてください。

ざっくり言うと、次のような形です。
```bash
.
├── docs
│   ├── repo
│   │   ├── adr
│   │   │   └── 0000-adr-format.md
│   │   ├── investigations
│   │   │   └── README.md
│   │   ├── misc
│   │   │   ├── architecture.md
│   │   │   ├── debugging.md
│   │   │   ├── history.md
│   │   │   └── README.md
│   │   ├── plans
│   │   │   ├── inprogress
│   │   │   ├── README.md
│   │   │   └── unimplemented
│   │   │       └── backlog.md
│   │   └── workflows
│   │       └── README.md
│   ├── tickets
│   │   └── README.md
│   └── vendored
│       └── README.md
├── README.md
└── repotools
    ├── public
    │   ├── go
    │   ├── python
    │   └── rust
    └── README.md
```

各フォルダには、その目的とサブフォルダの役割を説明する README.md を置きます。例として、メインの `docs/README.md` を、この記事用に省略して載せます。
```markdown
# Docs

The front door to a project's documentation. It says what lives where and points to the separate rules file and the scripts README.
Vendored documentation is available in `vendored/`, so that agents don't have to go to the Web to learn about the details of their dependencies.

## Main documents

Standalone reference documents, listed in a table: a map of the system as it is, a symptom-first debugging index, a history of what was removed and why, rules for code that must survive a special compile step, a design and style guide, and an end-user guide that may lag the code.

## Workflows

Step-by-step procedures, one file per recurring task. They cover building and testing, running and driving the app, reading logs, releasing, and querying a local backend. They also cover guides for risky kinds of change and one page per automated check script.

## Architecture decision records

A numbered log of significant choices currently in force, each with its context, alternatives and consequences. Records are edited, replaced or deleted, never marked "superseded". Reversed designs go in the history document.

## Plans

Work in flight, written when work starts and deleted when it ends. One standing backlog collects problems noticed in passing, so they get recorded rather than fixed unprompted.

## Investigations

One folder per problem whose cause is still unknown. It holds the symptom, dated observations, open and ruled-out causes, and next steps. It is deleted in the same commit as the fix.

## Tickets

Defects and requests for code owned by other teams, filed one per file by owning component. Each ticket carries a priority (High, Medium or Low), a category, a validity note and verification evidence, and checks must not damage shared test environments.
```

どの見出しもそれぞれ重要ですが、特に大きな価値を得ているのは次の項目です。

## `adr/`
これは数か月前に Hacker News の投稿で知ったものです。アーキテクチャ決定記録 (ADR) の体裁を借りてはいますが、中身は私独自の、ちょっと奇妙かもしれない流儀です。`status` の欄は廃止しました。私の世界では常に `accepted` だからです。また、ADR は常にその場で編集し、廃止扱いにはしないというルールにしています。リポジトリに ADR が存在するなら、それは現役のドキュメントです。

ADR には、そのリポジトリに関する小さな事実を記録します。現在取り組んでいるいくつかのプロジェクトの ADR の例を挙げます。

C# のデスクトップアプリケーションのものです。
```
0002 — Layered MVVM application architecture
0005 — Use NotifyingObject for change notification
0024 — A message is a copyable dialog or a toast, and every message is kept
```

こちらは AWS のデプロイ環境のものです。
```
0001 — OpenTofu for Infrastructure Provisioning
0008 — Layered Internal PKI: Offline Root + Online step-ca Intermediate + Short-Lived Auto-Renewed Certs
0012 — OpenVPN, IPv6-Only Split-Tunnel, Certificate-Only, tls-crypt-v2 Hardened
```

このように続いていきます。私の標準 [ADR ベースラインドキュメント](https://github.com/0xNF/wtstandardrepo/blob/master/docs/repo/adr/0000-adr-format.md)も参照できます。

ADR はモデルから頻繁に参照されるので、履歴のような無関係な情報は入れないようにしています。履歴も残しておくことは大切なので、専用の history.md に書きます。

モデルは本当に ADR を頻繁に参照します。これはエージェントを軌道から外さず一貫性を保たせる強力な武器になっています。私自身の矛盾を指摘してくれることもあります。私の決定が ADR #XYZ と矛盾していると教えてくれるのです。これは、そのセッションで自分が本当に何を望んでいるのかを見つめ直す良い機会になります。

ADR は固定されたものとは考えていません。その場で編集し、必要に応じて削除、再編成、調整します。


## `investigations/`
セッション中に、たまに起きるクラッシュのような問題が見つかることがあります。そのようなとき、エージェントが同じ問題の観察結果を繰り返し書き込める場所と、investigations の README に問題の要約を書ける場所を用意しておくと役に立ちます。観察が十分に溜まったら、それ専用のセッションを立てて、本格的な調査の出発点にできます。こうしておくと、エージェントはセッション中に気を散らさず、既知の不具合を認識でき、最終的にはその問題だけに専念して取り組めます。

デスクトップアプリケーションの 1 つで、現在進行中の調査の例を示します。
```bash
./
├─── action-editor-hangs-on-load-and-selection
│       README.md
│
├─── studio-fails-fast-returning-to-actions-list
│       README.md
│
└─── studio-process-outlives-its-window
        README.md
```

そして、そうした README の抜粋がこちらです。

```markdown
# Studio's process can outlive its window and hold the layout

**Status: open.** Seven sightings of a stuck exit or windowless process between 2026-10-03 and 2026-10-18, and four timed closes on 2026-10-07 that did not reproduce it. The cause is not known. The leading candidate is a clipboard flush at exit, and it has not been tested. A fifth sighting, on 2026-10-09, was a start that failed and never exited, which has a known cause of its own.

## The symptom

A Studio the user has closed stays alive with no window anyone knows of and one thread left, waiting in the kernel (state Wait, reason UserRequest). While it lives it holds the layout: refreshing it fails on `gs.dll` (robocopy exit 10), and `Add-AppxPackage -Register` fails with `0x80073D02`. Nothing on screen says why.

## Observations

| Sighting | Started                      | Remote Desktop | Copy before close | Threads, handles, memory | Exit code | Dump |
| -------- | ---------------------------- | -------------- | ----------------- | ------------------------ | --------- | ---- |
| 1        | 2026-10-03, how not recorded | not recorded   | not recorded      | 1, 918, 237 MB           | not read  | none |

### Sighting 1 -- 2026-10-03: alive eight minutes after its close

A Studio the user closed stayed alive for more than eight minutes.

## Candidates

### Ruled out
[...]

### Open
[...]
```

## `tickets/`
チケットには、不具合、機能要望、大きな挙動の変更を置きます。エージェントには、セッション中に見つけたものをこのフォルダにチケットとして作成するよう、常時指示しています。サブフォルダの構成はまだ流動的ですが、現在は担当者(オーナー)ごとに整理しています。たとえば、_このリポジトリ_ で見つかった大きな項目は `$projectName/` に、別のチームが所有するバックエンドのリポジトリなどで見つかった不具合は `dependencyName/` に入れます。

例:
```bash
.
├── desktop_app/
│   ├── camera-reset-keeps-selected-profile.md
│   └── maintenance-max-log-days-drifts-on-disk.md

├── upstream_dep1/
│   └── trigger-condition-schema-disagrees-with-the-hub.md
└── README.md
```

チケットの形式も流動的ですが、現在は次の形式を使っています。

```markdown
Reset leaves one setting in place

## Assessment

- **Priority:** Medium
- **Category:** Correctness
- **Validity:** Confirmed
- **Assessed:** <date>
- **Basis:** Reset promises the default state but keeps a manually chosen setting, so a bad choice can't be undone by resetting. Picking "Auto" explicitly still works as a workaround.
- **Verification:** Confirmed by reading the source: the reset path applies defaults to every field except this one, and the code that reads the setting still honors any stored value. The API docs describe reset as a full restore with no exceptions. Not reproduced live, since no test device was in the required state.


what the upstream system does:
  Reset restores most fields to their defaults but skips one. A device pinned
  to a manual setting comes back from a reset still pinned, while every other
  field in the response is a default.

what we need:
  Reset should clear that setting too, so the result matches a fresh
  registration. If that isn't wanted, the docs should say it's deliberately
  excluded.

impact:
  A device pinned to a setting that no longer exists can't be recovered by
  resetting it. It keeps failing, and the reset control reports success
  without touching the field that matters.

evidence:
  The default-setting function covers six fields and omits this one. It's
  called from the reset handler. Other device types have no equivalent
  setting, so only this type is affected.

workaround on our side:
  None. The UI redraws from the reset response, so it shows the setting that
  survived instead of hiding it. Users can still select Auto and save, which
  does clear it.

once fixed, on our side:
  Nothing. The UI already renders whatever the response carries, so it will
  show Auto on its own.
```

カテゴリは `[Usability, Security, Correctness, Misc, Feature]` の中から選んでいます。

ときどき、エージェントに登録済みの各チケットを見直させ、今でも事実かどうかを再評価してもらいます。
このチケット形式の目的は、なぜそれが問題なのか、そして現在このリポジトリがそれを回避するために何をしているのかを、明確に示すことです。


## `backlog.md`
特に大きな価値を得ているものの 1 つが backlog.md です。これは、小さなバグ、食い違い、調整が必要なものをエージェントが書き留めるための、メモ用のスペースです。チケットに似ていますし、実際、チケットフォルダにリポジトリ自身のものも含めると決めるまでは、機能要望や大きな変更もここに入っていました。しかし両者を分けた後でも、このファイルは非常に役に立っています。

エージェントは作業中によく問題に出くわします。エージェントによっては、それを解決しようとして気が散ったり、セッションの終わりまでに忘れてしまったりします。この情報を失わないために、そうした不具合を見つけたらすぐに backlog.md に書き込み、そのうえで本来の作業を続けるよう、常時指示を出しています。これでエージェントは作業に集中でき、私のコードの不具合もかなり把握できます。

書き込まれたものがすべて必要というわけではないので、ときどき手作業で整理する価値はあります。それでも総じて、Claude や GPT が見つけた不具合は対応する価値のあるものでした。

backlog ファイルの形式は次のとおりです。

```markdown
# Code cleanup backlog

Things found while working on something else: dead code, latent defects, and behaviour that looks wrong but was left alone because fixing it was outside the change at hand. Nothing here is blocking. Each entry is a decision for the user, not a task already agreed.

**Add to this file rather than fixing in passing.** When a change turns up an unrelated problem - an unreachable class, a notification that reaches nobody, a leak, a binding that has never worked - write it down here and carry on with the change you were making. Say what it is, where it is, what it costs to leave, and what fixing it would change. If you do fix one, delete it from this file.


# Methodology
- Consider breaking tasks into sub-tasks 
- You have a dev deploymemt of the application on this box and permission to use and modify it;
- [...]


# Backlog

## Release dependencies report unresolved trim and AOT analysis warnings

The 2026-10-16 x64 `just build aot` run succeeds but reports IL2104 for `WinUI.TableView`,
`Common.Logging`, `Microsoft.Data.SqlClient`, `Microsoft.Data.SqlClient.Internal.Logging`
and `System.Configuration.ConfigurationManager`, and IL3053 for `Microsoft.Data.SqlClient`.
ILC also says `Makaretu.Dns.LinuxHelper.ReuseAddresss(Socket)` always throws because
`Tmds.LibC` cannot be loaded. No runtime failure was observed from these diagnostics; leaving
them unresolved makes the Release build's analysis inconclusive for those dependency paths.
Triage would inspect the detailed ILC diagnostics, determine which paths the Windows client
can reach, and update or root the affected dependencies rather than suppressing the summaries.

[...]
```

エージェントはこのファイルへの書き込みが非常にうまく、後で専用の時間を取って消化させるときも、同じくらい見事にこなしてくれます。

この方法で、ADR との食い違い、使い勝手の問題、重大なバグが数多く見つかりました。しかも、エージェントが脇道にそれることはありませんでした。


# 検証とフィードバック
エージェントは、自分の思い込みをリアルタイムで修正できるときに非常によく働きます。何かを試したときのコンパイルエラーなど、間違っていたことを示すネガティブなフィードバックにはとてもよく反応します。

エージェントが呼び出せるツールを作って渡すことで、これを後押ししましょう。診断情報を見られるように言語サーバーを渡すだけでも構いませんし、事前に作業を行うスクリプト群を用意するなど、もっと凝ったものでも構いません。たとえば、あるデスクトップアプリケーションでは、禁止された API や、使ってはいけない構造をチェックする一連のスクリプトを用意しています。
```bash
.
├── check-serialization-contracts.ps1
├── check-source-rules.ps1
├── check-tooltips.ps1
└── check-window-ownership.ps1
```
他にも多数あります。これらのツールは次のような出力を返します。
```bash
2 failed: 
Invalid API: src/models/ModelA.cs:76
{Binding} instead of {x:Bind}: src/views/LogView.xaml:862
```
これにより、モデルは自分の想定のどこが間違っていたのか、続ける前に何を直す必要があるのかが分かります。

## リポジトリツール
フィードバックを返すツールに加えて、エージェントが何度も自作してしまう機能を提供するツールを用意するのも有効です。
たとえば、エージェントがアプリケーションのアンインストールと再インストールのスクリプトをその場しのぎで何度も書いていることに気づきました。トークンを無駄にし、毎回少しずつ違うやり方をするので、代わりにそれを毎回同じように行うスクリプトを渡しました。今では `install_newest.ps1` を呼び出し、終わるまで待ってから先に進みます。

エージェントが何をしているかに注意を払い、一緒に作業することは価値があります。

# AGENTS.md とメモリ
リポジトリの最初の概要と思想をエージェントに伝えるには、良い AGENTS.md (旧 CLAUDE.md) が必須です。誰もが知っていることなので、ここでは詳しく触れません。

## AGENTS.md
私の AGENTS.md には、たとえば次のような内容が入っています。
* このリポジトリが何を目指しているかの簡単な概要
* ビルドとデプロイに使うツールチェーン (詳細は `building.md` を参照)
* スタイルガイドライン (詳細は `style.md` と `adr/` を参照)
* コードのバックログ、チケット、調査に関する指示 (該当する README.md を参照)
* この開発マシンで使える他のツール (Python、ffmpeg、curl、imagemagick などが使えるかどうか)


## メモリ
メモリが AGENTS.md や特定のリポジトリツールと違うのは、全体には当てはまらないことを表すためのものだという点です。

エージェントは自分でメモリを溜めることがよくありますが、同じ間違いが繰り返されるときは、こちらで指導しながらメモリを作らせると役に立ちます。私は Windows で作業することが多く、エージェントは当然のように UNIX の世界にいると想定しがちです。そのため、BOM の設定や、よく使うエディタがバックスラッシュを食べてしまうこと、エスケープ規則が異なることに関するメモリを持たせています。

また、コミットを行う、実行中の開発システムに変更を加える、一時データの場所、エージェントが知っておくと役に立つ近くの関連リポジトリやドキュメントの場所、といった常時許可もメモリで与えています。

これらはグローバルなものではなく、このリポジトリの他の開発者には当てはまらないので、リポジトリに恒久的に置く AGENTS.md に入れるのは適切ではありません。

> 補足: こうした個別の前提に合わせたツールを `repotools/$username/` フォルダに置くのは問題ありません。そこは開発者個人用のツールを置く場所です。自分のフォルダにあるツールが他のユーザーにも役立つ、あるいは動作することは期待されません。リポジトリ全体で使えるツールは `repotools/public/` フォルダに昇格させます。
>
> このことが、エージェント開発においてリポジトリツールフォルダが大きな相乗効果を持つと考える理由です。


## スキル
スキルはあまり役に立つとは感じていません。このテーマで特に書くことはありません。


## 大きくなりすぎた、古くなったファイルの整理
トークンの予算は無限ではなく、コンテキストのサイズは管理しなければなりません。そのため、毎回のリクエストでエージェントに読ませているファイルを、ときどき見直すことを考えてください。

AGENTS.md は `10,000` トークン未満に保つべきで、それでも多いくらいです。これは毎回のリクエストで送られることを忘れないでください。常に理解しておくべきこと、ときどき理解すればよいこと、まったく理解する必要がないことを区別して見直す価値があります。

前提が古くなっている、または指示が矛盾している場合は削除します。ときどきしか当てはまらないものは、専用の ADR やワークフロードキュメントに切り出し、代わりに参照を置きます。

できる限りシンプルに、ただし単純化しすぎないように。

メモリファイルにも同じルールが当てはまります。メモリファイルは `~/.claude/projects/$project/memory` や、ハーネスごとに異なる同様の場所にあります。

まとめる、切り出す、削除する。

# エージェントとの付き合い方

(LLM, ハーネス) の組み合わせにはそれぞれ癖があり、職人が道具と付き合うように扱うべきです。片方向にだけ速く回る電動ドリル、完全には平らでないために打つ方向に少し偏りが出るハンマー、アクセルがとても繊細な車のようなものです。癖を知り、うまく利用する価値があります。エージェントと戦うのではなく、一緒に働きましょう。

## プロンプトのスタイル
初期ドキュメントとオンデマンドで参照できる文脈をそれなりにきちんと整えているので、プロンプトにはあまり力を入れず、簡潔で最小限にしています。

* 「この $document を読んで、指摘された問題に対処して」
* 「クリーンアップで挙げられたバグを修正して」
* 「このプランファイルの作業を続けて」

例外的な場合を除き、追加の文脈は書きません。AGENTS.md、ADR、プランファイルで、すでに文脈を与えているからです。

先に詳しく調べないと進められない質問もあります。
* 次の機能をこのアプリケーションに追加する実現可能性を検討し、必要になる依存関係の数も考慮して
* 現在このアプリケーションでは $X を行っているが、$Y に移行したい。その手順のプランファイルを書いて

機械的で正確な用語で話すと生産的だと感じています。依頼を省略したり、略語やスラング、くだけた話し方をエージェントにはしません。正確ではっきりした言葉を与えるよう心がけています。「なぜ遅いの」や「バグ見つけて」の代わりに、「事前コンパイル (AOT) の問題を考慮して」や「この遅延をプロファイリングして、このサブルーチンに別のアルゴリズムを使うべきか調べて」のように言うと、エージェントの出発点が定まります。LLM はしばしばユーザーのプロンプトの口調や技量を映す鏡です。入力が雑なら、出力も雑になります。


## 訂正
エージェントは、あることはできないと自信を持って断言することがあります。あなたのほうが正しいこともあるでしょう。そのようなときは、関連するドキュメントを渡すことが大切です。そうすれば、喜んで方針を変えて作業を始めます。

エージェントには学習のカットオフ日があり、その時点までの情報しか覚えていないことを忘れないでください。それ以降に状況が変わったことは、こちらから伝える必要があります。


## エージェントの癖や、ツール・ドキュメントへの期待に合わせる
前にも述べたとおり、LLM には癖や偏り、期待があります。しばらく観察していると、「その API は存在しない、別のものを試そう」とか「このマシンには ffmpeg がないので、代わりに小さな Python スクリプトを書こう」といった発言に気づくはずです。

これは次の 2 つを行う機会です。
* トークンの使い方を効率化する
* ツールを改善する

エージェントが選択を引き返すたびに、トークン、時間、コンテキストが消費されます。状況はそれぞれですが、全体としては、エージェントが期待するものをツールや環境に用意することを検討すべきです。余計な回り道をせずに欲しいものが手に入れば、タスクをより有能にこなせます。エージェントはそれらについて学習しているので、使いこなすのも得意です。

さらに、特に API について言えば、期待とのずれは API 設計がどこか決定的に不十分であることの有力な兆候です。あなたのエージェントがこうした間違いをするなら、他の人のエージェントも同じ間違いをします。人間のユーザーも同じ誤解をするかもしれません。エージェントが期待した設計のほうが実は優れた設計ではないか、深く考える価値があります。実際、そうであることは非常に多いのです。


### 簡単な方法論
最近、過去 1 か月分の Claude のセッション記録を、別のエージェント (週の Claude トークン上限に達していたので、_omp_ 経由の GPT-Luna-6.1) に読ませました。指示は次のとおりです。

> 「これらのセッション記録を読み、エージェントが混乱した、引き返した、ツールやプログラムがないことに気づいた、または形の間違った API を使った箇所を見つけて」

その結果は、すぐに対処できる改善候補を探す出発点として役に立ちました。リポジトリ内のチェッカースクリプトをいくつか更新でき、姉妹リポジトリの改善を求めるチケットもいくつか起票できました。このスキャンで見つかったものと、私が選んだ対処のサンプルを示します。
```markdown
1) 
    - Expected: ffmpeg to be installed to change the encoding a screenshot
    - Actual: not installed, wrote a python script to adjust the encoding by hand.
> Resolution: install ffmpeg

2)
    - Expected: The same test date could be reused across pages.
    - Actual: The user clarified that Data Viewer needed September to get real data.
> Resolution: Add a script that seeds test data before certain diagnostic runs

3)
    - Expected: gsdrive can resize windows and click any named UI control.
    - Actual: It had no resize verb, resized by using pointer and click APIs manually.
> Resolution: Added a `resize` verb to the automation tooling
 ```

## フックと通知
エージェントのハーネスは [フック](https://code.claude.com/docs/en/hooks) に対応し始めています。これは標準的な概念を、この新しい技術に応用したものです。
私は主に Linux ホスト上の Windows VM で作業しており、長時間かかるタスクが多いため、セッションに戻って出力を確認したり質問に答えたりするのが遅れがちです。この問題に対処するため、Claude Code からフックを受け取る [KDE タスクバーウィジェット](https://github.com/0xNF/vm_llm_notify) を作りました。VM 内のセッションが私の確認待ちになると、このタスクバーウィジェットが点灯します。

![Claude が注意を必要とすると点灯する KDE タスクバーアプリ](https://github.com/0xNF/vm_llm_notify/raw/master/llm_notify.gif)

## 並列化
1 つのリポジトリで複数のことを片付けたいとき、1 つのエージェントが順番に処理するのを待ちたくないことがあります。
並列で行うのに向いていそうな、つまり異なるファイルを触り、互いの作業を邪魔しないタスクがあれば、Claude Code のペインを複数開いて、それぞれにタスクを与えます。これらのプロンプトの冒頭には、必ず次のように書いています。

> あなたは、この git リポジトリの同じチェックアウトで、他のエージェントと並行して作業しています。作業しながら互いに連携してください。

他のハーネスのことは分かりませんが、Claude Code ではこれがとてもうまく機能します。エージェントは互いにメッセージを送受信し、ファイルの一覧を共有し、誰が次のビルドパイプラインを動かすのか、それに相乗りできるかを確認し、アプリケーションのテストスイートを交代で動かすなど、全体としてうまく協力します。極端な場合には、エージェントが自分で新しい git worktree を作り、変更をメインの委任ブランチにリベースすることもあります。

私が同時に把握できるエージェントは 4 つ程度が限界でした。それを超えると動きを正確に追えなくなり、各エージェントが少し脱線するリスクも高まります。


# いくつかの使い方のパターン
この世代のエージェントとのやり取りで、私が使っているパターンを紹介します。

## 「Wrap up」
これはフロンティアモデルが強く学習しているキーワードのようです。「Wrap up」と言うと、区切りの良いところで作業を終え、ターンをユーザーに返すものと解釈されます。ふだんは次々と作業項目を消化する意欲的なエージェントも、一旦手を止め、解決策を整え、最後にテストスイートを一度走らせてから、ターンをユーザーに渡します。次の項目であるハンドオフドキュメントと組み合わせると非常に便利です。

## ハンドオフドキュメント
コンテキストがいっぱいになってきたとき、特に持続的な集中が必要な長時間のタスクでは、エージェントに wrap up してハンドオフドキュメントを作るよう頼みます。

ハンドオフドキュメントは、Pi ハーネスのようなローカルエージェントハーネスのコミュニティが先駆けとなった概念で、他のハーネスにも採用が広がり始めています。

考え方はこうです。今のエージェントは作業を止め、新しいエージェントが作業を引き継ぎます。コンテキストが多すぎて現在位置も不明確なメインのプランファイルから始めたくはありません。ハンドオフドキュメントはプランファイルと対になって存在し、実装の現在の状態と、新しいエージェントが作業を中断したところからすぐに再開するために知っておくべきことを表します。

上記のフォルダ構成の `plans/` フォルダと組み合わせると、単純な逐次的なエージェントの利用では `plan/` ディレクトリに素の `handoff.md` ファイルができ、複雑なプランでは専用のフォルダとそれぞれのハンドオフドキュメントができます。

`handoff.md` はごく一時的なファイルで、タスクの規模やトークン消費量に応じて絶えず書き換えられるか、不要になったら単に削除されます。

これは次の項目「前向きに書き直す」と密接に関係します。

## 前向きに書き直す
プランファイルやハンドオフファイルは、時間が経つにつれて、リポジトリや実装中のプランの過去の状態で汚れていきます。たとえば、次のようなものです。
* (完了) 前提となる機能 A
* (完了) 前提となる機能 B
* 以前はセット A にバグがあったが修正したので、セット B のブロックは解消された
* [,,,]

こうした記述は LLM の癖で、その場では役に立つかもしれませんが、作業を引き継ぐ新しいエージェントにはまったく不要です。ある時点で、エージェントに次のように指示するのが賢明になります。
> rewrite this document to be forward looking

「forward looking (前向き)」は、Opus の観察から取り入れたキーワードです。Opus は古い内容を削除するときにこの表現をよく使うので、望む動作を引き出しやすいように、私の語彙に取り入れました。

この指示の結果、古い詳細が削られ、まだ実装されていない必要な部分だけが残ったドキュメントが得られます。エージェントは、API の落とし穴やマシンの想定とのギャップのように、過去のものでも関連性が高いものはきちんと残すだけの賢さも持っています。

もちろん、削るべき詳細が残っていないか、自分の目で一度確認することもできます。

## Team A vs Team B
私は相互にさまざまなレベルでつながった複数のリポジトリを管理しており、それらのリポジトリで同時に VSCode のウィンドウを開き、エージェントを動かすことがよくあります。機能がリポジトリをまたいで共同開発され、2 つのリポジトリのエージェントが連携する必要があることもあります。

そのような場合、まずリポジトリ 1 のエージェント A (1.A) にコアとなる機能を作業させ、次にリポジトリ 2 のエージェント B (2.B) 向けの実装ドキュメントを書いてもらいます。
そのドキュメントを 2.B にそのまま渡します。作業するうちに、コアプロジェクトの機能セットや詳細に足りないものがあると分かることもあります。2.B が奇妙な回避策を作ったり、品質の低い結果を出したりしないよう、リポジトリ 1 のチームへの要望をまとめたドキュメントを 2.B に書いてもらい、それを 1.A に渡して対応してもらいます。このプロセスを繰り返します。

こうすることで、2 つのリポジトリにまたがる機能を同時に、非常に磨き上げた形で作り上げられます。エージェント同士が間接的に質問し合い、前提を洗練させ、機能を作り、バグを直し、体験を磨き上げていきます。

エージェントを 1 つにまとめないのは、私が扱うコンテキストの大きさでは、各リポジトリのエージェントに自分のリポジトリのコンテキストを管理させたほうが、はるかに簡単で一貫するからです。エージェント同士は私を介して連絡を取り合い、私が要望を調整します。最終的に、成果物の利用者であり、審判であるのは私だからです。

この「Team A vs Team B」のドキュメントの受け渡しは、非常に生産的だと感じています。


# 最近の実践例

最近エージェントにやってもらったことのうち、標準的な「この機能を実装して」や「このバグを直して」以外のものを紹介します。

## 失敗したテスト実行でのやり直しによるトークン消費の削減
デスクトップ GUI の C# アプリケーションには、専用のテストスイートのプロジェクトがあります。通常の出力には成功と失敗がすべて含まれていましたが、失敗は出力の先頭に表示されていました。一方、エージェントは PowerShell で `sed`、`trim`、末尾選択を使う癖があり、その結果テストの失敗がエージェントに見えなくなっていました。よくあったのは、汎用的な失敗 (終了コード 1) だけを見て、失敗したテストを知るためだけに新しいコマンドでテストスイートを再実行することでした。

解決策は、標準出力のノイズを減らし、失敗したテストの詳細だけを出力することでした。これで、エージェントはテストスイートで唯一重要な部分、つまり実行が成功したかどうか、失敗したならどのテストかが見えるようになりました。先に述べたとおり、これでトークン、コンテキスト、時間を節約できます。

## テストスイートの最適化
LLM の活用を最適にする 3 つの要素が揃った好例です。
* 明確なゴール
  * > このテストスイートの実行時間を 10 秒未満にして
* 測定方法
  * テストスイートの実行ファイルに対する `time`
* 変更できるもの
  * テストスイートのソースコード

この 3 つがあれば、LLM は成果を改善するために全速力で取り組めます。

このケースでは、LLM と一緒に、素朴に作られた C#/XAML のテストスイートを、1 回 5 分かかっていたものから 10 秒まで、段階的に短縮できました。途中の段階は 1 分、30 秒、16 秒、そして 8 秒でした。

エージェント自身も粘り強くよい仕事をしましたが、二人三脚の作業でした。並列化やスレッドの活用、古いテストの削除、テストしやすいようにプロジェクトを再構成することは、私が提案する必要があったからです。

## 自動化とアクセシビリティ
Microsoft の最新のデスクトップフレームワークである WinUI3 は、[Automation Properties](https://learn.microsoft.com/en-us/dotnet/framework/ui-automation/ui-automation-properties-overview) をサポートしています。puppeteer や playwright に馴染みがあれば分かるように、これによりプログラムを API で操作できます。エージェントの時代には、エージェントが使えるプログラムは、エージェントが改善できるプログラムです。

最初の問題は、このアプリケーションにそもそも Automation Properties を持たせることでした。もちろん、解決策は関連するドキュメントを渡し、最初のタスクをエージェントに与えることでした。
> このアプリケーションに automation properties を追加して

それが終わった後、「すべての UI 要素は automation properties を持たなければならない」という ADR を作成しました。

こうしてすべてが整うと、今後の不具合修正や機能実装のセッションは、エージェントが単独で最初から最後まで進められるようになりました。アプリケーションのあらゆる部分にアクセスできるからです。

大型のフロンティアモデルのようなビジョン対応モデルなら、エージェントははるかに強力になり、非常に繊細な判断もでき、自分の成果をより正確に評価できます。自分でアプリケーションを操作することもできるようになるからです。

## 失敗するロボティクスのサンプルを Gazebo から MuJoCo へ移行
私が読み進めているロボティクスの本は、シミュレーションプログラム Gazebo を前提に作られており、掲載されている例はすべてそのプログラムを想定し、利用しています。しかし Gazebo は、出来が悪く、信頼性が低く、起動に問題があり、ノード間で渡されるメッセージをよく取りこぼし、総じて厄介なものだと広く理解されています。これは私の経験とも一致します。私の悩みを聞いた経験豊富なロボティクスの方々からは、Isaac や MuJoCo のような他のシミュレータに時間を使うべきだと言われました。そこで、Opus に本のすべての例を MuJoCo へ自動的に移してもらいました。

Opus がすべての問題を片付けるのに、1 日 12 時間で 1 週間ほどかかりました。しかし最終的には、実行時の問題がまったくなく、非常に安定したシミュレータ環境が手に入りました。
