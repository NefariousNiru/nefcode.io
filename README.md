# 🚀 NefCode.io

> ⚡ Offline-first Company-wise LeetCode / DSA problem tracker
>
> 

---

![GitHub last commit](https://img.shields.io/github/last-commit/NefariousNiru/nefcode.io)
![GitHub repo size](https://img.shields.io/github/repo-size/NefariousNiru/nefcode.io)
![GitHub Actions](https://img.shields.io/github/actions/workflow/status/NefariousNiru/nefcode.io/pages.yml?branch=master)
![License](https://img.shields.io/badge/license-MIT-blue)

### 🧰 Stack

![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react\&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript\&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Build_Tool-646CFF?logo=vite\&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-UI-38B2AC?logo=tailwindcss\&logoColor=white)
![IndexedDB](https://img.shields.io/badge/IndexedDB-Local_DB-FFCA28)
![Dexie](https://img.shields.io/badge/Dexie-IndexedDB_Wrapper-orange)
![PapaParse](https://img.shields.io/badge/PapaParse-CSV_Parser-green)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Hosting-222?logo=github)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI/CD-2088FF?logo=github-actions)
![Node.js](https://img.shields.io/badge/Node.js-Build_Scripts-339933?logo=node.js\&logoColor=white)

---

## 🌐 Live Demo

👉 **[https://nefariousniru.github.io/nefcode.io/](https://nefariousniru.github.io/nefcode.io/)**

---

## 🧠 What is NefCode?

**NefCode.io** is a company-wise LeetCode tracker that:

✅ Loads curated company problem lists
✅ Tracks problem completion using checkboxes
✅ Support for adding comments and time to problems
✅ Stores progress locally in browser storage
✅ Works fully offline after first load
✅ Requires **no accounts or signup**
---

## 🏗 Core Concepts

### 🌍 Global Completion Model

Each problem is uniquely identified by its **LeetCode URL**.

This enables:

* Cross-company deduplication
* Global completion state
* Clean stats aggregation
* No redundant tracking

---

### ⚡ Offline-First Architecture

```
CSV Files (data/)
        ↓
Manifest Builder (CI script)
        ↓
public/manifest.json
        ↓
Vite build → dist/
        ↓
GitHub Pages
        ↓
Browser
        ↓
IndexedDB (Dexie persistence)
```

💡 All progress is stored locally in IndexedDB
🧹 Clearing browser storage resets progress

---

## ⚙️ Tech Stack

### 🖥 Frontend

* React
* TypeScript
* Vite
* TailwindCSS (Glassy UI)
* IndexedDB via Dexie
* PapaParse (CSV parsing)

### 🏗 Infrastructure

* GitHub Actions (CI/CD)
* GitHub Pages (Static Hosting)
* Node.js (Manifest Generator Script)

**Zero backend. Zero servers. Zero runtime cost.**

---

## 📦 CSV Data Format

Each CSV must include:

| Column          | Required    |
| --------------- | ----------- |
| Difficulty      | ✅           |
| Title           | ✅           |
| Frequency       | ✅           |
| Acceptance Rate | ✅           |
| Link            | ⭐ GLOBAL ID |
| Topics          | ✅           |

Example:

```csv
Difficulty,Title,Frequency,Acceptance Rate,Link,Topics
EASY,Best Time to Buy and Sell Stock,100.0,0.5525,https://leetcode.com/problems/best-time-to-buy-and-sell-stock,"Array, Dynamic Programming"
```

---

## 🔄 Automated Manifest Pipeline

On push to `master`:

1. CI scans `data/**/*.csv`
2. Generates `public/manifest.json`
3. Copies CSV → `public/data/`
4. Runs Vite build
5. Deploys to GitHub Pages

✅ Fully automated with zero manual manifest editing

---

## 📁 Repository Structure

```
data/                # Source of truth CSV files
scripts/             # Manifest builder
public/              # Generated manifest + copied data
src/                 # React application
.github/workflows/   # GitHub Actions CI
```

---

## 🚀 Development

### Install

```bash
npm install
```

### Run Local Dev

```bash
npm run dev
```

### Build

```bash
npm run build
```

Build step automatically:

* Generates manifest.json
* Copies CSVs
* Outputs production build to `dist/`

---

## 🙏 Credits

Problem datasets inspired by:

[https://github.com/liquidslr/interview-company-wise-problems](https://github.com/liquidslr/interview-company-wise-problems)

Huge thanks to the maintainers for dataset curation.

---

## 📜 License

MIT — see LICENSE file.
