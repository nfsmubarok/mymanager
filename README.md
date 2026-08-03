# 🎋 Zen Dashboard

> A centralized, distraction-free personal management dashboard to seamlessly track finances, schedule tasks, and manage hobbies with a clean and neat UI.


## 🚀 Live Demo

**Live URL:** [https://zenmanager-hazel.vercel.app/login.html]

**Want to test it out quickly?** You don't need to register! Just click the **"Try Demo Account"** button on the login page to explore the full functionality of the app.

---

## ✨ Features

- 💰 **Money Manager:** Dynamic income, expense, and transfer tracking across multiple wallets. Includes a real-time **Pie Chart visualization** (powered by `Chart.js`) to monitor monthly expenses.
- 📅 **Schedule & Task Planner:** An interactive calendar with daily schedule modals and priority-based to-do lists.
- 🎯 **Leisure Hub:** - **Wishlist Tracker:** Track saving progress for your dream items.
  - **Hobbies & Ratings:** Log and review movies, anime, or games.
  - **Zen Sudoku:** An embedded Sudoku mini-game featuring a built-in auto-validation algorithm and a "lives" system for quick brain breaks.
- 📦 **Dumpspaces:** A dedicated space to drop notes, important links, and image uploads.
- 🔒 **Secure Authentication:** Fully protected using **Supabase Auth**. Employs Row Level Security (RLS) to ensure strict data isolation—users can only access their own data.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML, Custom CSS (Mobile-Responsive), Modular JavaScript
- **Backend / BaaS:** Supabase (PostgreSQL, Authentication, Cloud Storage)
- **Data Visualization:** Chart.js
- **Deployment & Hosting:** Vercel / GitHub

---

## 🏗️ Architecture Highlight

Building this application was a massive learning curve. The project was successfully refactored from a monolithic file structure into a **clean, modular architecture**. 

Instead of relying on heavy frontend frameworks, each core feature (`api.js`, `ui.js`, `schedule.js`, `minigames.js`) has its own dedicated logic file. This ensures the application remains lightweight, scalable, maintainable, and highly performant.
