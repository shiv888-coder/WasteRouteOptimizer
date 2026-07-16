import React, { useState, useMemo, useRef, useEffect } from "react";
import { Truck, Trash2, MapPin, Fuel, Clock, Route as RouteIcon, Gauge, Warehouse } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ---------- Graph data (abstract city grid: intersections + bins) ----------
const NODES = [
  { id: "depot", label: "Depot", x: 60, y: 210, bin: false, depot: true },
  { id: "n1", label: "Bin 01", x: 190, y: 90, bin: true, fill: 82 },
  { id: "n2", label: "N2", x: 190, y: 210, bin: false },
  { id: "n3", label: "Bin 02", x: 190, y: 330, bin: true, fill: 45 },
  { id: "n4", label: "N4", x: 330, y: 60, bin: false },
  { id: "n5", label: "Bin 03", x: 330, y: 165, bin: true, fill: 91 },
  { id: "n6", label: "N6", x: 330, y: 270, bin: false },
  { id: "n7", label: "Bin 04", x: 330, y: 365, bin: true, fill: 30 },
  { id: "n8", label: "N8", x: 470, y: 110, bin: false },
  { id: "n9", label: "Bin 05", x: 470, y: 215, bin: true, fill: 67 },
  { id: "n10", label: "N10", x: 470, y: 315, bin: false },
  { id: "n11", label: "Bin 06", x: 595, y: 160, bin: true, fill: 95 },
  { id: "n12", label: "Bin 07", x: 595, y: 265, bin: true, fill: 20 },
];

const EDGES = [
  ["depot", "n1", 14], ["depot", "n2", 9], ["depot", "n3", 15],
  ["n1", "n2", 8], ["n1", "n4", 12],
  ["n2", "n3", 8], ["n2", "n5", 9],
  ["n3", "n6", 11], ["n3", "n7", 16],
  ["n4", "n5", 7], ["n4", "n8", 10],
  ["n5", "n6", 8], ["n5", "n9", 11], ["n5", "n8", 9],
  ["n6", "n7", 7], ["n6", "n9", 10], ["n6", "n10", 12],
  ["n7", "n10", 9],
  ["n8", "n9", 7], ["n8", "n11", 9],
  ["n9", "n10", 8], ["n9", "n11", 8], ["n9", "n12", 10],
  ["n10", "n12", 7],
  ["n11", "n12", 8],
];

const nodeById = Object.fromEntries(NODES.map((n) => [n.id, n]));

function buildAdj(edges) {
  const adj = {};
  edges.forEach(([a, b, w]) => {
    adj[a] = adj[a] || [];
    adj[b] = adj[b] || [];
    adj[a].push({ to: b, w });
    adj[b].push({ to: a, w });
  });
  return adj;
}
const ADJ = buildAdj(EDGES);

function pathEdges(path) {
  const set = new Set();
  for (let i = 0; i < path.length - 1; i++) {
    set.add([path[i], path[i + 1]].sort().join("--"));
  }
  return set;
}
function pathWeight(path) {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const nbrs = ADJ[path[i]];
    const e = nbrs.find((n) => n.to === path[i + 1]);
    total += e ? e.w : 0;
  }
  return total;
}

// ---------- Algorithms ----------
function bfs(start, end) {
  const queue = [start];
  const visitedOrder = [];
  const parent = { [start]: null };
  const seen = new Set([start]);
  while (queue.length) {
    const cur = queue.shift();
    visitedOrder.push(cur);
    if (cur === end) break;
    for (const { to } of ADJ[cur] || []) {
      if (!seen.has(to)) {
        seen.add(to);
        parent[to] = cur;
        queue.push(to);
      }
    }
  }
  const path = [];
  let cur = end;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = parent[cur];
  }
  return { path: path[0] === start ? path : [], visited: visitedOrder };
}

function dfs(start, end) {
  const stack = [start];
  const visitedOrder = [];
  const parent = { [start]: null };
  const seen = new Set([start]);
  while (stack.length) {
    const cur = stack.pop();
    visitedOrder.push(cur);
    if (cur === end) break;
    const nbrs = [...(ADJ[cur] || [])].reverse();
    for (const { to } of nbrs) {
      if (!seen.has(to)) {
        seen.add(to);
        parent[to] = cur;
        stack.push(to);
      }
    }
  }
  const path = [];
  let cur = end;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = parent[cur];
  }
  return { path: path[0] === start ? path : [], visited: visitedOrder };
}

function dijkstra(start, end) {
  const dist = {};
  const parent = { [start]: null };
  const visited = new Set();
  const visitedOrder = [];
  Object.keys(ADJ).forEach((n) => (dist[n] = Infinity));
  dist[start] = 0;
  const pq = new Set(Object.keys(ADJ));
  while (pq.size) {
    let u = null;
    let best = Infinity;
    for (const n of pq) {
      if (dist[n] < best) {
        best = dist[n];
        u = n;
      }
    }
    if (u === null) break;
    pq.delete(u);
    visited.add(u);
    visitedOrder.push(u);
    if (u === end) break;
    for (const { to, w } of ADJ[u] || []) {
      if (!visited.has(to) && dist[u] + w < dist[to]) {
        dist[to] = dist[u] + w;
        parent[to] = u;
      }
    }
  }
  const path = [];
  let cur = end;
  while (cur !== undefined && cur !== null) {
    path.unshift(cur);
    cur = parent[cur];
  }
  return { path: path[0] === start ? path : [], visited: visitedOrder, distance: dist[end] };
}

function nearestNeighborRoute(start, targets) {
  let current = start;
  let remaining = [...targets];
  const fullPath = [current];
  const legs = [];
  let totalDistance = 0;
  while (remaining.length) {
    let bestTarget = null;
    let bestResult = null;
    for (const t of remaining) {
      const r = dijkstra(current, t);
      if (!bestResult || r.distance < bestResult.distance) {
        bestResult = r;
        bestTarget = t;
      }
    }
    legs.push(bestResult);
    fullPath.push(...bestResult.path.slice(1));
    totalDistance += bestResult.distance;
    current = bestTarget;
    remaining = remaining.filter((t) => t !== bestTarget);
  }
  const home = dijkstra(current, start);
  legs.push(home);
  fullPath.push(...home.path.slice(1));
  totalDistance += home.distance;
  return { fullPath, legs, totalDistance };
}

const ALGO_FN = { BFS: bfs, DFS: dfs, Dijkstra: dijkstra };
const ALGO_BIGO = {
  BFS: "O(V + E) — unweighted, hop-count shortest path",
  DFS: "O(V + E) — explores depth-first, not distance-optimal",
  Dijkstra: "O((V + E) log V) — weighted shortest path",
};

const FUEL_RATE = 12; // currency per km
const AVG_SPEED = 22; // km/h

export default function WasteRouteOptimizer() {
  const [threshold, setThreshold] = useState(60);
  const [targetBin, setTargetBin] = useState("n5");
  const [algo, setAlgo] = useState("Dijkstra");
  const [showFullRoute, setShowFullRoute] = useState(false);
  const [dash, setDash] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setDash((d) => (d + 1) % 1000), 60);
    return () => clearInterval(id);
  }, []);

  const bins = NODES.filter((n) => n.bin);
  const binsNeedingCollection = bins.filter((b) => b.fill >= threshold).map((b) => b.id);

  const comparison = useMemo(() => {
    return Object.keys(ALGO_FN).map((name) => {
      const r = ALGO_FN[name]("depot", targetBin);
      return {
        name,
        distance: r.distance !== undefined ? r.distance : pathWeight(r.path),
        nodesVisited: r.visited.length,
        pathLen: r.path.length,
      };
    });
  }, [targetBin]);

  const singleResult = useMemo(() => ALGO_FN[algo]("depot", targetBin), [algo, targetBin]);
  const singleDistance = singleResult.distance !== undefined ? singleResult.distance : pathWeight(singleResult.path);

  const fullRoute = useMemo(() => {
    if (!binsNeedingCollection.length) return null;
    return nearestNeighborRoute("depot", binsNeedingCollection);
  }, [threshold]);

  const activePath = showFullRoute && fullRoute ? fullRoute.fullPath : singleResult.path;
  const activeEdges = pathEdges(activePath);
  const activeDistance = showFullRoute && fullRoute ? fullRoute.totalDistance : singleDistance;
  const activeTimeMin = Math.round((activeDistance / AVG_SPEED) * 60);
  const activeCost = Math.round(activeDistance * FUEL_RATE);

  const fillColor = (f) => (f >= 80 ? "#E4572E" : f >= 50 ? "#F4A522" : "#6B9B37");

  return (
    <div style={{ background: "#161A18", minHeight: "100vh", padding: "28px", fontFamily: "'IBM Plex Sans', sans-serif", color: "#EDEFE9" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');
        .hdr { font-family: 'Oswald', sans-serif; letter-spacing: 0.02em; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .hazard-tab {
          border-bottom: 3px solid transparent;
          transition: border-color 0.2s, color 0.2s;
        }
        .hazard-tab.active {
          border-image: repeating-linear-gradient(45deg, #F4A522 0 8px, #161A18 8px 16px) 3;
        }
        .panel {
          background: #1E2320;
          border: 1px solid #2C322E;
          border-radius: 4px;
        }
        input[type=range] { accent-color: #F4A522; }
        .binrow:hover { background: #262C28; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "22px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ background: "#F4A522", padding: "8px", borderRadius: "4px" }}>
            <Truck size={22} color="#161A18" />
          </div>
          <div>
            <div className="hdr" style={{ fontSize: "22px", fontWeight: 600, lineHeight: 1 }}>ROUTE/OPTIMIZER</div>
            <div className="mono" style={{ fontSize: "11px", color: "#8A9187", marginTop: "2px" }}>SMART WASTE COLLECTION — MUNICIPAL DISPATCH</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={() => setShowFullRoute(false)}
            className={`hazard-tab ${!showFullRoute ? "active" : ""}`}
            style={{ background: "transparent", border: "none", color: !showFullRoute ? "#F4A522" : "#8A9187", padding: "8px 14px", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontSize: "13px", fontWeight: 600, letterSpacing: "0.03em" }}
          >
            POINT-TO-POINT COMPARE
          </button>
          <button
            onClick={() => setShowFullRoute(true)}
            className={`hazard-tab ${showFullRoute ? "active" : ""}`}
            style={{ background: "transparent", border: "none", color: showFullRoute ? "#F4A522" : "#8A9187", padding: "8px 14px", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontSize: "13px", fontWeight: 600, letterSpacing: "0.03em" }}
          >
            FULL COLLECTION ROUTE
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "18px", flexWrap: "wrap" }}>
        {/* Bin status column */}
        <div className="panel" style={{ padding: "16px", width: "230px", flexShrink: 0 }}>
          <div className="hdr" style={{ fontSize: "13px", fontWeight: 600, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Trash2 size={15} color="#F4A522" /> BIN STATUS
          </div>
          <div style={{ marginBottom: "12px" }}>
            <div className="mono" style={{ fontSize: "10px", color: "#8A9187", marginBottom: "4px" }}>
              COLLECTION THRESHOLD: {threshold}%
            </div>
            <input type="range" min="10" max="95" value={threshold} onChange={(e) => setThreshold(+e.target.value)} style={{ width: "100%" }} />
          </div>
          {bins.map((b) => (
            <div key={b.id} className="binrow" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 4px", borderRadius: "3px" }}>
              <span style={{ fontSize: "12px" }}>{b.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "40px", height: "6px", background: "#2C322E", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ width: `${b.fill}%`, height: "100%", background: fillColor(b.fill) }} />
                </div>
                <span className="mono" style={{ fontSize: "10px", color: fillColor(b.fill), width: "26px" }}>{b.fill}%</span>
              </div>
            </div>
          ))}
          <div className="mono" style={{ fontSize: "10px", color: "#8A9187", marginTop: "10px", borderTop: "1px solid #2C322E", paddingTop: "8px" }}>
            {binsNeedingCollection.length} of {bins.length} bins need pickup
          </div>
        </div>

        {/* Map column */}
        <div className="panel" style={{ padding: "16px", flex: "1 1 460px", minWidth: "460px" }}>
          <div className="hdr" style={{ fontSize: "13px", fontWeight: 600, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
            <MapPin size={15} color="#F4A522" /> CITY MAP — WARD 7
          </div>
          <svg viewBox="0 0 660 400" style={{ width: "100%", height: "auto" }}>
            {EDGES.map(([a, b, w], i) => {
              const key = [a, b].sort().join("--");
              const active = activeEdges.has(key);
              const A = nodeById[a], B = nodeById[b];
              return (
                <g key={i}>
                  <line x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                    stroke={active ? "#F4A522" : "#33392F"}
                    strokeWidth={active ? 3 : 1.5}
                    strokeDasharray={active ? "8 5" : "0"}
                    strokeDashoffset={active ? -dash : 0}
                  />
                  <text x={(A.x + B.x) / 2} y={(A.y + B.y) / 2 - 4} className="mono" fontSize="9" fill="#5D6459" textAnchor="middle">{w}</text>
                </g>
              );
            })}
            {NODES.map((n) => (
              <g key={n.id}>
                {n.depot ? (
                  <rect x={n.x - 14} y={n.y - 14} width="28" height="28" rx="4" fill="#F4A522" stroke="#161A18" strokeWidth="2" />
                ) : n.bin ? (
                  <circle cx={n.x} cy={n.y} r="12" fill={fillColor(n.fill)} stroke="#161A18" strokeWidth="2" opacity={binsNeedingCollection.includes(n.id) ? 1 : 0.55} />
                ) : (
                  <circle cx={n.x} cy={n.y} r="6" fill="#454C41" />
                )}
                <text x={n.x} y={n.y + (n.depot ? 30 : n.bin ? 26 : 18)} className="mono" fontSize="9.5" fill="#8A9187" textAnchor="middle">{n.label}</text>
              </g>
            ))}
          </svg>
          <div style={{ display: "flex", gap: "14px", marginTop: "6px", flexWrap: "wrap" }}>
            <Legend color="#F4A522" label="Depot" />
            <Legend color="#E4572E" label="Bin ≥80%" />
            <Legend color="#F4A522" label="Bin 50–79%" />
            <Legend color="#6B9B37" label="Bin <50%" />
          </div>
        </div>

        {/* Controls + metrics column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", width: "260px", flexShrink: 0 }}>
          {!showFullRoute ? (
            <div className="panel" style={{ padding: "16px" }}>
              <div className="hdr" style={{ fontSize: "13px", fontWeight: 600, marginBottom: "10px" }}>TARGET BIN</div>
              <select value={targetBin} onChange={(e) => setTargetBin(e.target.value)} style={{ width: "100%", background: "#161A18", color: "#EDEFE9", border: "1px solid #2C322E", padding: "6px", borderRadius: "3px", marginBottom: "12px", fontFamily: "'IBM Plex Sans', sans-serif" }}>
                {bins.map((b) => <option key={b.id} value={b.id}>{b.label} ({b.fill}%)</option>)}
              </select>
              <div className="hdr" style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>ALGORITHM</div>
              {Object.keys(ALGO_FN).map((name) => (
                <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", padding: "5px 0", cursor: "pointer" }}>
                  <input type="radio" checked={algo === name} onChange={() => setAlgo(name)} />
                  {name}
                </label>
              ))}
              <div className="mono" style={{ fontSize: "9.5px", color: "#8A9187", marginTop: "6px", lineHeight: 1.5 }}>{ALGO_BIGO[algo]}</div>
            </div>
          ) : (
            <div className="panel" style={{ padding: "16px" }}>
              <div className="hdr" style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>ROUTE STRATEGY</div>
              <div style={{ fontSize: "12px", color: "#8A9187", lineHeight: 1.5 }}>
                Nearest-neighbor heuristic over Dijkstra shortest paths — visits every bin at/above the {threshold}% threshold and returns to depot.
              </div>
              {!fullRoute && <div style={{ fontSize: "12px", color: "#F4A522", marginTop: "10px" }}>No bins currently meet the threshold.</div>}
            </div>
          )}

          <div className="panel" style={{ padding: "16px" }}>
            <div className="hdr" style={{ fontSize: "13px", fontWeight: 600, marginBottom: "10px" }}>COST ANALYSIS</div>
            <MetricRow icon={<RouteIcon size={13} color="#F4A522" />} label="Distance" value={`${activeDistance.toFixed(0)} km`} />
            <MetricRow icon={<Clock size={13} color="#F4A522" />} label="Est. time" value={`${activeTimeMin} min`} />
            <MetricRow icon={<Fuel size={13} color="#F4A522" />} label="Fuel cost" value={`₹${activeCost}`} />
            <MetricRow icon={<Gauge size={13} color="#F4A522" />} label="Nodes visited" value={showFullRoute ? "—" : singleResult.visited.length} />
          </div>
        </div>
      </div>

      {/* Performance dashboard */}
      <div className="panel" style={{ padding: "16px", marginTop: "18px" }}>
        <div className="hdr" style={{ fontSize: "13px", fontWeight: 600, marginBottom: "10px" }}>PERFORMANCE DASHBOARD — DEPOT → {nodeById[targetBin].label.toUpperCase()}</div>
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={comparison} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#2C322E" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#8A9187" fontSize={11} />
              <YAxis stroke="#8A9187" fontSize={11} />
              <Tooltip contentStyle={{ background: "#1E2320", border: "1px solid #2C322E", fontSize: "12px" }} labelStyle={{ color: "#EDEFE9" }} />
              <Bar dataKey="distance" fill="#F4A522" name="Path distance (km)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="nodesVisited" fill="#6B9B37" name="Nodes visited" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
      <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: color }} />
      <span className="mono" style={{ fontSize: "10px", color: "#8A9187" }}>{label}</span>
    </div>
  );
}

function MetricRow({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #262C28" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#8A9187" }}>{icon}{label}</div>
      <div className="mono" style={{ fontSize: "13px", fontWeight: 600 }}>{value}</div>
    </div>
  );
}
