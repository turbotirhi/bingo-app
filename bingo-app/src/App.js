import { useState, useEffect, useCallback, useRef } from "react";

// ─── Firebase config (user fills this in) ────────────────────────────────────
// Replace this object with your own Firebase project config
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDFs-TUGj5ty_Zte-slR-OsZQ18jaBwflA",
  authDomain: "bingo-5e6ca.firebaseapp.com",
  databaseURL: "https://bingo-5e6ca-default-rtdb.firebaseio.com",
  projectId: "bingo-5e6ca",
  storageBucket: "bingo-5e6ca.firebasestorage.app",
  messagingSenderId: "1068586536514",
  appId: "1:1068586536514:web:20583ca3459e9bca1f67db"
};,
};

const DB_KEY = "bingo-game-v1";
const FREE_SPACE = "__FREE__";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#1a0a00",
  surface: "#2b1000",
  card: "#3a1800",
  accent: "#f5a623",
  accentDeep: "#c8791a",
  crimson: "#c0392b",
  bindi: "#cc1a1a",
  marked: "#f5a623",
  markedText: "#1a0a00",
  text: "#f5e6c8",
  muted: "#a07850",
  border: "#6b3010",
  borderGold: "#c8791a",
  win: "#4ade80",
};

// ─── Firebase loader ──────────────────────────────────────────────────────────
let _db = null;
let _fbLoaded = false;
let _fbCallbacks = [];

function loadFirebase(onReady) {
  if (_fbLoaded) { onReady(_db); return; }
  _fbCallbacks.push(onReady);
  if (_fbCallbacks.length > 1) return;

  const s1 = document.createElement("script");
  s1.src = "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js";
  s1.onload = () => {
    const s2 = document.createElement("script");
    s2.src = "https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js";
    s2.onload = () => {
      if (!window.firebase.apps.length) {
        window.firebase.initializeApp(FIREBASE_CONFIG);
      }
      _db = window.firebase.database();
      _fbLoaded = true;
      _fbCallbacks.forEach(cb => cb(_db));
      _fbCallbacks = [];
    };
    document.head.appendChild(s2);
  };
  document.head.appendChild(s1);
}

function dbRef(db) { return db.ref(DB_KEY); }

async function loadState(db) {
  const snap = await dbRef(db).get();
  return snap.exists() ? snap.val() : null;
}

async function saveState(db, state) {
  await dbRef(db).set(state);
}

function subscribeState(db, cb) {
  const ref = dbRef(db);
  ref.on("value", snap => { if (snap.exists()) cb(snap.val()); });
  return () => ref.off("value");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateBoard(items) {
  const pool = shuffle(items).slice(0, 24);
  return [...pool.slice(0, 12), FREE_SPACE, ...pool.slice(12)];
}

function checkWin(marked, board) {
  const size = 5;
  const isM = (i) => marked.includes(i) || board[i] === FREE_SPACE;
  const lines = [];
  for (let r = 0; r < size; r++) lines.push([0,1,2,3,4].map(c => r*size+c));
  for (let c = 0; c < size; c++) lines.push([0,1,2,3,4].map(r => r*size+c));
  lines.push([0,6,12,18,24]);
  lines.push([4,8,12,16,20]);
  return lines.some(line => line.every(i => isM(i)));
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
const LotusDivider = () => (
  <svg width="100%" height="22" viewBox="0 0 300 22" preserveAspectRatio="xMidYMid meet" style={{ margin: "8px 0" }}>
    <g transform="translate(150,11)">
      {[-2,-1,0,1,2].map(i => (
        <ellipse key={i} cx={i*20} cy="0" rx="7" ry="10"
          transform={`rotate(${i*12})`}
          fill="none" stroke="#f5a623" strokeWidth="1" opacity={0.4 + Math.abs(i)*0.15}/>
      ))}
      <circle cx="0" cy="0" r="3.5" fill="#cc1a1a" opacity="0.85"/>
    </g>
    <line x1="0" y1="11" x2="110" y2="11" stroke="#c8791a" strokeWidth="0.5" opacity="0.35"/>
    <line x1="190" y1="11" x2="300" y2="11" stroke="#c8791a" strokeWidth="0.5" opacity="0.35"/>
  </svg>
);

const PaisleyCorner = ({ flip }) => (
  <svg width="32" height="32" viewBox="0 0 40 40" style={{ transform: flip ? "scaleX(-1)" : "none", opacity: 0.65 }}>
    <path d="M4 36 Q4 4 36 4 Q20 4 20 20 Q20 36 4 36Z" fill="none" stroke="#f5a623" strokeWidth="1.5"/>
    <path d="M9 31 Q9 9 31 9 Q18 9 18 22 Q18 31 9 31Z" fill="#f5a623" opacity="0.12"/>
    <circle cx="7" cy="33" r="2.5" fill="#cc1a1a"/>
  </svg>
);

function Btn({ children, onClick, style = {}, disabled = false, variant = "primary" }) {
  const variants = {
    primary: { background: `linear-gradient(135deg, ${C.accent}, ${C.accentDeep})`, color: C.bg, border: "none" },
    ghost:   { background: "transparent", color: C.accent, border: `1.5px solid ${C.accent}` },
    muted:   { background: C.surface, color: C.muted, border: `1px solid ${C.border}` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      borderRadius: 7, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "inherit", fontWeight: 700, fontSize: 14, padding: "10px 18px",
      opacity: disabled ? 0.45 : 1, transition: "transform .12s",
      letterSpacing: ".4px", boxShadow: variant === "primary" ? `0 2px 14px ${C.accent}44` : "none",
      ...variants[variant], ...style,
    }}
      onMouseDown={e => e.currentTarget.style.transform = "scale(.95)"}
      onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
    >{children}</button>
  );
}

function Tag({ label, onRemove }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: C.surface, color: C.text, borderRadius: 20,
      border: `1px solid ${C.border}`, padding: "4px 11px", fontSize: 12, margin: 3,
    }}>
      {label}
      {onRemove && <span onClick={onRemove} style={{ cursor: "pointer", color: C.crimson, fontWeight: 900, fontSize: 15, lineHeight: 1 }}>×</span>}
    </span>
  );
}

function Section({ title, children, style }) {
  return (
    <div style={{
      background: C.card, borderRadius: 12, padding: "15px 17px",
      border: `1px solid ${C.border}`, boxShadow: "inset 0 0 24px #00000028", ...style
    }}>
      <p style={{ color: C.accent, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.8, margin: "0 0 11px", fontFamily: "'Cinzel',serif" }}>{title}</p>
      {children}
    </div>
  );
}

const inputStyle = {
  flex: 1, background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 8,
  padding: "9px 12px", color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none",
};

// ─── Admin Setup ──────────────────────────────────────────────────────────────
function AdminSetup({ onStart }) {
  const [items, setItems] = useState([]);
  const [players, setPlayers] = useState([]);
  const [itemInput, setItemInput] = useState("");
  const [playerInput, setPlayerInput] = useState("");

  const addItem = () => {
    const v = itemInput.trim();
    if (v && !items.includes(v)) { setItems(p => [...p, v]); setItemInput(""); }
  };
  const addPlayer = () => {
    const v = playerInput.trim();
    if (v && !players.includes(v)) { setPlayers(p => [...p, v]); setPlayerInput(""); }
  };
  const canStart = items.length >= 24 && players.length >= 1;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 16px 40px", position: "relative" }}>
      <div style={{ position: "absolute", top: 10, left: 8 }}><PaisleyCorner /></div>
      <div style={{ position: "absolute", top: 10, right: 8 }}><PaisleyCorner flip /></div>

      <div style={{ textAlign: "center", paddingTop: 44, paddingBottom: 6 }}>
        <div style={{ fontSize: 12, color: C.muted, letterSpacing: 4, textTransform: "uppercase", fontFamily: "'Cinzel',serif", marginBottom: 8 }}>
          ✦ स्वागत है ✦
        </div>
        <h1 style={{
          background: `linear-gradient(135deg, ${C.accent} 0%, #fff8e1 50%, ${C.accent} 100%)`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          fontSize: 36, margin: 0, fontFamily: "'Cinzel Decorative','Cinzel',serif", letterSpacing: 3,
        }}>BINGO</h1>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 5, letterSpacing: 1 }}>Game Setup · Admin</div>
      </div>

      <LotusDivider />

      <Section title={`Bingo Items — ${items.length} / 24 min`} style={{ marginTop: 10 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={itemInput} onChange={e => setItemInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addItem()}
            placeholder="Add a bingo item…" style={inputStyle} />
          <Btn onClick={addItem}>Add</Btn>
        </div>
        <div style={{ maxHeight: 150, overflowY: "auto" }}>
          {items.map(it => <Tag key={it} label={it} onRemove={() => setItems(p => p.filter(x => x !== it))} />)}
        </div>
        {items.length < 24 && <p style={{ color: C.crimson, fontSize: 12, margin: "6px 0 0" }}>{24 - items.length} more needed</p>}
      </Section>

      <Section title={`Players — ${players.length}`} style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={playerInput} onChange={e => setPlayerInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addPlayer()}
            placeholder="Player name…" style={inputStyle} />
          <Btn onClick={addPlayer}>Add</Btn>
        </div>
        <div>{players.map(p => <Tag key={p} label={p} onRemove={() => setPlayers(prev => prev.filter(x => x !== p))} />)}</div>
      </Section>

      <Btn onClick={() => onStart(items, players)} disabled={!canStart}
        style={{ width: "100%", marginTop: 22, padding: "14px", fontSize: 16, borderRadius: 10 }}>
        🪔 Start the Game
      </Btn>
      {!canStart && <p style={{ color: C.muted, fontSize: 12, textAlign: "center", marginTop: 8 }}>Need at least 24 items &amp; 1 player</p>}
    </div>
  );
}

// ─── Player Select ────────────────────────────────────────────────────────────
function PlayerSelect({ players, onSelect }) {
  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: "28px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 30 }}>🪔</div>
        <h2 style={{
          background: `linear-gradient(135deg, ${C.accent}, #fff8e1)`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          fontFamily: "'Cinzel',serif", fontSize: 22, margin: "8px 0 4px",
        }}>Who are you?</h2>
        <p style={{ color: C.muted, fontSize: 13 }}>Tap your name to play</p>
      </div>
      <LotusDivider />
      <div style={{ marginTop: 14 }}>
        {players.map(name => (
          <button key={name} onClick={() => onSelect(name)} style={{
            display: "block", width: "100%", marginBottom: 10,
            background: C.card, border: `1px solid ${C.border}`,
            borderLeft: `4px solid ${C.accent}`,
            borderRadius: 10, padding: "13px 18px", color: C.text,
            fontSize: 16, fontWeight: 600, cursor: "pointer", textAlign: "left",
            fontFamily: "inherit", transition: "background .15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = C.surface; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.card; }}
          >{name}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Bingo Board ──────────────────────────────────────────────────────────────
function BingoBoard({ board, marked, onToggle, readOnly = false, won = false }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 3, marginBottom: 3 }}>
        {"BINGO".split("").map(c => (
          <div key={c} style={{
            textAlign: "center", fontFamily: "'Cinzel Decorative','Cinzel',serif",
            fontWeight: 900, fontSize: 17, letterSpacing: 2,
            background: `linear-gradient(135deg, ${C.accent}, #fff3b0)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            padding: "2px 0",
          }}>{c}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 3 }}>
        {board.map((cell, i) => {
          const isFree = cell === FREE_SPACE;
          const isMarked = marked.includes(i) || isFree;

          if (isFree) return (
            <div key={i} style={{
              aspectRatio: "1", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              borderRadius: 8, background: "#1a0000",
              border: `2px solid ${C.bindi}`,
              boxShadow: `0 0 16px ${C.bindi}66, inset 0 0 12px #00000060`,
              cursor: "default",
            }}>
              <div style={{
                width: "38%", aspectRatio: "1", borderRadius: "50%",
                background: `radial-gradient(circle at 35% 35%, #ff7070, ${C.bindi} 55%, #5a0000)`,
                boxShadow: `0 0 12px ${C.bindi}cc, 0 0 24px ${C.bindi}44`,
                border: "1px solid #ff9999",
              }} />
              <div style={{ color: C.bindi, fontSize: 7, marginTop: 3, fontFamily: "'Cinzel',serif", letterSpacing: 1, opacity: 0.7 }}>WALLA</div>
            </div>
          );

          return (
            <div key={i} onClick={() => !readOnly && onToggle && onToggle(i)} style={{
              aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
              textAlign: "center", borderRadius: 8, fontSize: 10, fontWeight: 600, padding: 4,
              cursor: readOnly ? "default" : "pointer",
              background: isMarked ? `linear-gradient(135deg,${C.accent}dd,${C.accentDeep})` : C.card,
              color: isMarked ? C.markedText : C.text,
              border: `1.5px solid ${isMarked ? C.accent : C.border}`,
              transition: "all .18s",
              transform: isMarked ? "scale(1.03)" : "scale(1)",
              lineHeight: 1.25, wordBreak: "break-word",
              boxShadow: isMarked ? `0 0 10px ${C.accent}55` : "none",
              position: "relative", overflow: "hidden",
            }}>
              {isMarked && !readOnly && <div style={{
                position: "absolute", inset: 0, opacity: 0.08,
                backgroundImage: "repeating-linear-gradient(45deg,#000 0px,#000 1px,transparent 1px,transparent 6px)",
              }} />}
              {isMarked
                ? <span style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 900 }}>✓</div>
                    <div style={{ fontSize: 8, opacity: 0.85 }}>{cell}</div>
                  </span>
                : cell}
            </div>
          );
        })}
      </div>

      {won && (
        <div style={{
          textAlign: "center", marginTop: 14, padding: "12px",
          background: `linear-gradient(135deg,${C.accent}22,${C.crimson}22)`,
          borderRadius: 10, border: `2px solid ${C.accent}`,
          color: C.accent, fontWeight: 900, fontSize: 20,
          fontFamily: "'Cinzel Decorative',serif", letterSpacing: 2,
          boxShadow: `0 0 24px ${C.accent}44`,
          animation: "pulse 1s ease-in-out infinite alternate",
        }}>
          🪔 BINGO! 🪔
        </div>
      )}
    </div>
  );
}

// ─── Game View ────────────────────────────────────────────────────────────────
function GameView({ gameState, currentPlayer, onMark, onViewPlayer, viewingPlayer }) {
  const { players, boards, marked } = gameState;
  const myBoard = boards[currentPlayer];
  const myMarked = marked[currentPlayer] || [];
  const myWon = checkWin(myMarked, myBoard);
  const viewBoard = viewingPlayer && viewingPlayer !== currentPlayer ? boards[viewingPlayer] : null;
  const viewMarked = viewingPlayer && viewingPlayer !== currentPlayer ? (marked[viewingPlayer] || []) : null;
  const viewWon = viewBoard && checkWin(viewMarked, viewBoard);

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 12px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 18, paddingBottom: 10, borderBottom: `1px solid ${C.border}`, marginBottom: 14 }}>
        <div>
          <h2 style={{
            background: `linear-gradient(135deg,${C.accent},#fff8e1)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            margin: 0, fontFamily: "'Cinzel',serif", fontSize: 18,
          }}>{currentPlayer}</h2>
          <p style={{ color: C.muted, fontSize: 12, margin: "2px 0 0" }}>
            {myMarked.length} marked · {myWon ? "🪔 BINGO!" : "Keep playing!"}
          </p>
        </div>
        <div style={{ fontSize: 26 }}>{myWon ? "🏆" : "🎯"}</div>
      </div>

      <BingoBoard board={myBoard} marked={myMarked} onToggle={onMark} won={myWon} />

      <div style={{ marginTop: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "'Cinzel',serif" }}>Other Players</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {players.filter(p => p !== currentPlayer).map(p => {
            const pM = marked[p] || [];
            const pW = checkWin(pM, boards[p]);
            const isV = viewingPlayer === p;
            return (
              <button key={p} onClick={() => onViewPlayer(isV ? null : p)} style={{
                background: isV ? `linear-gradient(135deg,${C.accent},${C.accentDeep})` : C.card,
                color: isV ? C.bg : C.text,
                border: `1.5px solid ${pW ? C.win : isV ? C.accent : C.border}`,
                borderRadius: 20, padding: "7px 14px", fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: isV ? `0 0 10px ${C.accent}55` : "none",
              }}>
                {pW ? "🏆 " : "👁 "}{p}<span style={{ fontSize: 11, opacity: .75, marginLeft: 4 }}>({pM.length})</span>
              </button>
            );
          })}
        </div>
      </div>

      {viewBoard && (
        <div style={{ marginTop: 20, padding: "16px", background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: "inset 0 0 20px #00000040" }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <span style={{ color: C.accent, fontWeight: 700, fontSize: 13, fontFamily: "'Cinzel',serif" }}>
              👁 {viewingPlayer}'s Board {viewWon ? "🏆" : ""}
            </span>
          </div>
          <BingoBoard board={viewBoard} marked={viewMarked} readOnly won={viewWon} />
        </div>
      )}
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase] = useState("loading");
  const [gameState, setGameState] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [viewingPlayer, setViewingPlayer] = useState(null);
  const dbRef = useRef(null);

  useEffect(() => {
    loadFirebase(db => {
      dbRef.current = db;
      loadState(db).then(s => {
        if (s) { setGameState(s); setPhase("select"); }
        else setPhase("setup");
      });
      const unsub = subscribeState(db, s => setGameState(s));
      return unsub;
    });
  }, []);

  const handleStart = useCallback(async (items, players) => {
    const boards = {};
    players.forEach(p => { boards[p] = generateBoard(items); });
    const state = { items, players, boards, marked: {} };
    await saveState(dbRef.current, state);
    setGameState(state);
    setPhase("select");
  }, []);

  const handleMark = useCallback(async (idx) => {
    setGameState(prev => {
      const newM = { ...prev.marked };
      const pM = [...(newM[currentPlayer] || [])];
      const pos = pM.indexOf(idx);
      if (pos === -1) pM.push(idx); else pM.splice(pos, 1);
      newM[currentPlayer] = pM;
      const next = { ...prev, marked: newM };
      saveState(dbRef.current, next);
      return next;
    });
  }, [currentPlayer]);

  const handleReset = async () => {
    await dbRef.current.ref(DB_KEY).remove();
    setGameState(null); setCurrentPlayer(null); setViewingPlayer(null);
    setPhase("setup");
  };

  if (phase === "loading") return (
    <div style={{ ...fullPage, justifyContent: "center", alignItems: "center" }}>
      <div style={{ color: C.muted }}>🪔 Loading…</div>
    </div>
  );

  return (
    <div style={fullPage}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@400;700&family=Hind:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        input::placeholder { color: ${C.muted}; }
        input:focus { border-color: ${C.accent} !important; outline: none; box-shadow: 0 0 0 2px ${C.accent}22; }
        @keyframes pulse { from { box-shadow: 0 0 10px ${C.accent}44; } to { box-shadow: 0 0 28px ${C.accent}aa; } }
      `}</style>

      <div style={{
        background: C.surface, borderBottom: `2px solid ${C.border}`,
        padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 10, height: 52,
        boxShadow: "0 2px 20px #00000060",
      }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(to bottom,${C.accent},${C.crimson})` }} />
        <span style={{
          background: `linear-gradient(135deg,${C.accent} 0%,#fff8e1 50%,${C.accent} 100%)`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          fontFamily: "'Cinzel Decorative',serif", fontWeight: 900, fontSize: 16, letterSpacing: 2, paddingLeft: 8,
        }}>🪔 BINGO</span>
        <div style={{ display: "flex", gap: 8 }}>
          {phase === "game" && <Btn variant="ghost" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => { setCurrentPlayer(null); setPhase("select"); }}>Switch</Btn>}
          {(phase === "select" || phase === "game") && <Btn variant="muted" style={{ padding: "5px 12px", fontSize: 12 }} onClick={handleReset}>Reset</Btn>}
        </div>
      </div>

      <div style={{ height: 5, background: `repeating-linear-gradient(90deg,${C.accent} 0,${C.accent} 8px,${C.crimson} 8px,${C.crimson} 16px,${C.accentDeep} 16px,${C.accentDeep} 24px,transparent 24px,transparent 30px)`, opacity: 0.55 }} />

      {phase === "setup" && <AdminSetup onStart={handleStart} />}
      {phase === "select" && gameState && <PlayerSelect players={gameState.players} onSelect={name => { setCurrentPlayer(name); setPhase("game"); }} />}
      {phase === "game" && gameState && currentPlayer && (
        <GameView gameState={gameState} currentPlayer={currentPlayer}
          onMark={handleMark} onViewPlayer={setViewingPlayer} viewingPlayer={viewingPlayer} />
      )}
    </div>
  );
}

const fullPage = {
  minHeight: "100vh",
  background: `radial-gradient(ellipse at top,#2b0e00 0%,#1a0a00 60%)`,
  fontFamily: "'Hind',sans-serif",
  color: C.text,
  display: "flex", flexDirection: "column",
};
