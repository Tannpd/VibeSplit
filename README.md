# VibeSplit - Decentralized Music Copyright Arbitration Primitive

**VibeSplit** is an Intelligent Contract built on GenLayer that implements a decentralized copyright arbitration and royalty escrow primitive. It enables independent musicians to open plagiarism disputes, lock stakes, and utilize on-chain AI and non-deterministic web scrapers to resolve royalty splits fairly and transparently.

---

## The Pitch: Why VibeSplit Requires GenLayer

On traditional blockchains (Ethereum, Solana, etc.), smart contracts cannot access the web or execute non-deterministic AI evaluation. GenLayer makes VibeSplit possible by utilizing a decentralized consensus network that can:
1. **Access Web Content**: Directly fetch dynamic lyric/track breakdown pages via `gl.nondet.web.render`.
2. **Execute AI Reasoning**: Feed metadata and lyrical/progression summaries into a natural language LLM consensus round (`gl.nondet.exec_prompt`).
3. **Consensus on Meaning**: Run a custom validator that verifies the **meaning** of the decision (absolute agreement on plagiarism vs. inspiration and a split margin tolerance of <= 10%), rejecting format-only validation.

---

## How Consensus & Custom Validation Works

Unlike naive contract validators that only verify JSON formatting, VibeSplit enforces **meaning-based consensus**:
- **Independent Node Evaluation**: Each validator runs its own scrape and LLM musicological analysis.
- **Decision Agreement**: Validators must reach absolute agreement on the boolean plagiarism verdict (`is_plagiarism`).
- **Split Proportional Tolerance**: The proposed royalty split percentage (`original_artist_split`) must match within a `10%` absolute margin.
- **Rejection on Meaning Mismatch**: If two validators reach different musicological decisions or their split estimates diverge beyond `10%`, the validator votes `Disagree`, rejecting the leader proposal and triggering leader rotation. Format-only compliance is insufficient to pass consensus.

---

## Public API Specification

### State Variables
- `disputes_count`: Total number of copyright disputes created.
- `dispute_original_artist`: Address of the claimant/original artist.
- `dispute_accused_artist`: Address of the defendant/accused artist.
- `dispute_original_url`/`dispute_accused_url`: Scrape targets for the tracks.
- `dispute_status`: `"CREATED"`, `"PENDING"`, `"RESOLVED"`, or `"FAILED"`.
- `dispute_original_stake`/`dispute_accused_stake`: GEN escrow pool amounts.
- `dispute_is_plagiarism`: Consensus verdict.
- `dispute_original_split`: Split percentage allocated to the original artist.
- `dispute_analysis`: Consolidated musicological consensus writeup.

### Write Methods
- `create_dispute(accused_artist: Address, original_url: str, accused_url: str) -> int` (payable): Opens a dispute, locking the claimant's initial stake.
- `join_dispute(dispute_id: int)` (payable): Defendant locks a matching stake.
- `resolve_dispute(dispute_id: int)`: Triggers GenVM multi-validator consensus to evaluate the track metadata and distribute escrowed funds.

### View Methods
- `get_dispute(dispute_id: int) -> str`: Returns a JSON representation of dispute details.
- `get_disputes_count() -> int`: Returns the total number of disputes.

---

## Deployment Evidence

- **Contract Address**: `0x8F0Ba7fE672FD44305d4187DEcD5E81CA5366eC2`
- **Network**: `studionet`

### Worked Example Call

#### Input Parameters (`resolve_dispute` call for Dispute #0):
- **Original Artist**: `0x8aB6Fd746F8928E116fd14850DE855a8A10eea13` (Staked `10.0 GEN`)
- **Accused Artist**: `0x0A2750043B217267493b4bb5B856107840361b8e` (Staked `10.0 GEN`)
- **Original URL**: `https://raw.githubusercontent.com/Tannpd/VibeSplit/master/tests/mock_original_song.txt`
- **Accused URL**: `https://raw.githubusercontent.com/Tannpd/VibeSplit/master/tests/mock_disputed_song.txt`

#### Real Consensus Output (Transaction Details from Studio Explorer):
- **Status**: `FINALIZED`
- **Verdict**:
  ```json
  {
    "is_plagiarism": true,
    "original_artist_split": 90,
    "musicological_analysis": "The disputed track reproduces the most legally protectable elements of the original song with near-total fidelity: sharing the identical chord progression in the same key, and the exact melodic chorus hook. The lyrics are only superficially altered..."
  }
  ```
- **Escrow Distribution**:
  - `18.0 GEN` paid out to Original Artist (90% of `20.0 GEN` pool).
  - `2.0 GEN` paid out to Accused Artist (10% of `20.0 GEN` pool).
