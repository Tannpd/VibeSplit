# VibeSplit — Decentralized Music Copyright Arbitration

**VibeSplit** is a decentralized royalty escrow and copyright arbitration intelligent contract built on GenLayer that protects independent musicians against plagiarism disputes and resolves fair splits transparently.

## ⚡ The Pitch: Why VibeSplit DIES without GenLayer

On traditional blockchains (Ethereum, Solana, etc.), smart contracts are fully deterministic and isolated from the outside world. This makes VibeSplit **impossible** to build because:
1. **No External Scraped Data**: Traditional contracts cannot access web pages or scrape dynamic lyric/track breakdown pages directly.
2. **Oracle Centralization**: Relying on standard web-scraping oracles introduces a single point of failure and centralized manipulation.
3. **No Native AI Processing**: Differentiating between creative "Inspiration" and blatant "Plagiarism" requires qualitative, natural language musicological analysis of melodies, structures, and rhythms. Traditional chains cannot run large language models on-chain.

**GenLayer solves all of this.** By using non-deterministic calls (`gl.nondet.web.render` and `gl.nondet.exec_prompt`) executed by a decentralized network of nodes, GenLayer allows the contract to:
- Directly read live lyrics and expert musicological blogs from the submitted track URLs.
- Feed the comparative descriptions into an AI "Musicologist Copyright Judge" to evaluate progression patterns and similarities.
- Run a custom consensus validator that accepts qualitative splits on a spectrum ($\pm 10\%$ split margin tolerance) while maintaining absolute boolean agreement on the final plagiarism decision.

---

## 🛠️ Project Structure

```
VibeSplit/
├── contracts/
│   └── vibesplit.py         # GenLayer Intelligent Smart Contract (v0.2.16)
├── frontend/                # Neon Synthwave DJ Mixer Deck Dashboard (React + Vite)
└── README.md                # Documentation
```

---

## 🚀 How to Deploy on GenLayer Studio

1. **Access GenLayer Studio**: Open the GenLayer Studio developer environment.
2. **Create Contract File**: Create a new file named `vibesplit.py` under the contracts section.
3. **Paste Code**: Copy the contents of [vibesplit.py](contracts/vibesplit.py) and paste it into the editor.
4. **Deploy**: Build and deploy the contract using the Studio interface. Save the returned contract address.

---

## 🖥️ How to Run the Frontend Dashboard

1. **Navigate to Frontend**:
   ```bash
   cd frontend
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment**:
   Create a `.env` file in the `frontend` folder and set your deployed contract address:
   ```env
   VITE_CONTRACT_ADDRESS=0xD55e691F328f88DB07A4588EE6e9365ad8Bb5E2b
   ```
4. **Launch Dev Server**:
   ```bash
   npm run dev
   ```
5. **Open Browser**: Open your browser to the local address displayed (e.g., `http://localhost:5173`) to access the Neon Audio Forensic Lab.

---

## 🌐 How to Push to GitHub & Deploy to Vercel

### 1. Push to GitHub
Open your terminal in the root directory `D:\Gen\VibeSplit` and run:
```bash
git init
git add .
git commit -m "feat: initial commit for VibeSplit dApp"
# Create a new public repository on GitHub and link it:
git remote add origin https://github.com/your-username/vibe-split.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Vercel
Deploy the frontend directly to Vercel using the Vercel CLI:
```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```
During the setup, configure the production environment variable:
- Key: `VITE_CONTRACT_ADDRESS`
- Value: `0xD55e691F328f88DB07A4588EE6e9365ad8Bb5E2b`
