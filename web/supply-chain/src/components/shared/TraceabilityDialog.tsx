"use client";
import { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Button, Typography, CircularProgress, Divider, Chip,
} from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import { usePublicClient } from "wagmi";
import RawMaterialAbi from "@/abi/RawMaterial.json";
import UserRegistryAbi from "@/abi/UserRegistry.json";
import { RAW_MATERIAL_ADDRESS, USER_REGISTRY_ADDRESS, UserRole } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import type { Address, Abi } from "viem";

interface RawToken {
  id: bigint;
  creator: Address;
  name: string;
  supply: bigint;
  balance: bigint;
  features: string;
  parentId: bigint;
  createdAt: bigint;
}

interface TraceNode {
  tokenId: string;
  name: string;
  creator: string;
  role: UserRole;
  createdAt: bigint;
  parentIds: string[];
  level: number;
  x: number;
  y: number;
}

interface TraceEdge { from: string; to: string; }

const ROLE_COLORS: Record<number, string> = {
  0: "#9e9e9e",   // None/Unknown
  1: "#795548",   // Admin
  2: "#2e7d32",   // Producer
  3: "#1565c0",   // Factory
  4: "#e65100",   // Retailer
  5: "#6a1b9a",   // Consumer
};

const ROLE_NAMES: Record<number, string> = {
  0: "Unknown", 1: "Admin", 2: "Producer", 3: "Factory", 4: "Retailer", 5: "Consumer",
};

const LEGEND_ROLES = [
  { role: UserRole.Producer, label: "Producer" },
  { role: UserRole.Factory, label: "Factory" },
  { role: UserRole.Retailer, label: "Retailer" },
];

const NODE_R = 28;
const ROW_H = 155;
const PAD_X = 70;
const PAD_Y = 60;

interface Props {
  tokenId: bigint | null;
  onClose: () => void;
}

export default function TraceabilityDialog({ tokenId, onClose }: Props) {
  const { t, formatDate } = useI18n();
  const publicClient = usePublicClient();
  const [nodes, setNodes] = useState<Map<string, TraceNode>>(new Map());
  const [edges, setEdges] = useState<TraceEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TraceNode | null>(null);

  const open = tokenId !== null;

  useEffect(() => {
    if (!open || !publicClient || tokenId === null) return;
    setLoading(true);
    setFetchError(null);
    setNodes(new Map());
    setEdges([]);
    setSelected(null);

    const build = async () => {
      const nodeData = new Map<string, {
        tokenId: string; name: string; creator: string;
        role: UserRole; createdAt: bigint; parentIds: string[];
      }>();
      const edgeList: TraceEdge[] = [];
      const queue: string[] = [tokenId.toString()];
      const seen = new Set<string>();

      while (queue.length > 0) {
        const idStr = queue.shift()!;
        if (seen.has(idStr)) continue;
        seen.add(idStr);

        let rawTok: RawToken;
        try {
          rawTok = await publicClient.readContract({
            address: RAW_MATERIAL_ADDRESS,
            abi: RawMaterialAbi as Abi,
            functionName: "getToken",
            args: [BigInt(idStr)],
          }) as RawToken;
        } catch { continue; }

        let role = UserRole.None;
        try {
          const userData = await publicClient.readContract({
            address: USER_REGISTRY_ADDRESS,
            abi: UserRegistryAbi as Abi,
            functionName: "getUserByWallet",
            args: [rawTok.creator],
          }) as { role: number };
          role = userData.role as UserRole;
        } catch {}

        const parentIds: string[] = [];
        if (rawTok.parentId > 0n) {
          const pid = rawTok.parentId.toString();
          parentIds.push(pid);
          if (!seen.has(pid)) queue.push(pid);
        }
        try {
          const f = JSON.parse(rawTok.features);
          if (Array.isArray(f._parentIds)) {
            for (const pid of f._parentIds) {
              const pidStr = String(pid);
              if (!parentIds.includes(pidStr)) {
                parentIds.push(pidStr);
                if (!seen.has(pidStr)) queue.push(pidStr);
              }
            }
          }
        } catch {}

        nodeData.set(idStr, {
          tokenId: idStr,
          name: rawTok.name,
          creator: rawTok.creator,
          role,
          createdAt: rawTok.createdAt,
          parentIds,
        });

        for (const pid of parentIds) {
          edgeList.push({ from: pid, to: idStr });
        }
      }

      // Assign levels via BFS from roots (nodes with no parents in the set)
      const levelMap = new Map<string, number>();
      const getLevel = (id: string): number => {
        if (levelMap.has(id)) return levelMap.get(id)!;
        const node = nodeData.get(id);
        if (!node) { levelMap.set(id, 0); return 0; }
        const knownParents = node.parentIds.filter(pid => nodeData.has(pid));
        const lv = knownParents.length > 0
          ? Math.max(...knownParents.map(pid => getLevel(pid))) + 1
          : 0;
        levelMap.set(id, lv);
        return lv;
      };
      for (const id of nodeData.keys()) getLevel(id);

      // Group by level, sort within level by createdAt
      const byLevel = new Map<number, string[]>();
      for (const [id, lv] of levelMap) {
        if (!byLevel.has(lv)) byLevel.set(lv, []);
        byLevel.get(lv)!.push(id);
      }
      for (const [lv, ids] of byLevel) {
        ids.sort((a, b) => {
          const na = nodeData.get(a), nb = nodeData.get(b);
          if (!na || !nb) return 0;
          return Number(na.createdAt - nb.createdAt);
        });
        byLevel.set(lv, ids);
      }

      // Compute canvas dimensions
      const maxLevel = Math.max(0, ...[...levelMap.values()]);
      const maxCols = Math.max(1, ...[...byLevel.values()].map(ids => ids.length));
      const svgW = Math.max(maxCols * 220 + PAD_X * 2, 420);
      const svgH = (maxLevel + 1) * ROW_H + PAD_Y * 2;

      // Assign (x, y) positions
      const finalNodes = new Map<string, TraceNode>();
      for (const [lv, ids] of byLevel) {
        const count = ids.length;
        ids.forEach((id, i) => {
          const node = nodeData.get(id)!;
          const x = PAD_X + (i + 0.5) * (svgW - PAD_X * 2) / count;
          const y = PAD_Y + lv * ROW_H;
          finalNodes.set(id, { ...node, level: lv, x, y });
        });
      }

      setNodes(finalNodes);
      setEdges(edgeList);
      const leaf = finalNodes.get(tokenId.toString());
      if (leaf) setSelected(leaf);
    };

    build().catch(e => setFetchError(String(e))).finally(() => setLoading(false));
  }, [tokenId, open, publicClient]);

  const allNodes = [...nodes.values()];
  const maxLevel = allNodes.length > 0 ? Math.max(...allNodes.map(n => n.level)) : 0;
  const maxCols = allNodes.length > 0
    ? Math.max(...[...new Set(allNodes.map(n => n.level))].map(lv => allNodes.filter(n => n.level === lv).length))
    : 1;
  const svgW = Math.max(maxCols * 220 + PAD_X * 2, 420);
  const svgH = (maxLevel + 1) * ROW_H + PAD_Y * 2;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1.5 }}>
        <AccountTreeIcon color="primary" />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: "bold", lineHeight: 1 }}>
            {t("traceabilityTitle")}
          </Typography>
          {tokenId !== null && (
            <Typography variant="caption" color="text.secondary">Token #{tokenId.toString()}</Typography>
          )}
        </Box>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ p: 3, minHeight: 300 }}>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && fetchError && (
          <Typography color="error" sx={{ py: 4, textAlign: "center" }}>{fetchError}</Typography>
        )}

        {!loading && !fetchError && allNodes.length === 0 && (
          <Typography color="text.secondary" sx={{ textAlign: "center", py: 6 }}>
            {t("traceabilityEmpty")}
          </Typography>
        )}

        {!loading && !fetchError && allNodes.length > 0 && (
          <>
            {/* Legend */}
            <Box sx={{ display: "flex", gap: 1, mb: 2.5, flexWrap: "wrap", alignItems: "center" }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Roles:</Typography>
              {LEGEND_ROLES.map(({ role, label }) => (
                <Chip
                  key={role}
                  size="small"
                  label={label}
                  sx={{ bgcolor: ROLE_COLORS[role], color: "#fff", fontWeight: 700, fontSize: "0.7rem", height: 22 }}
                />
              ))}
              <Typography variant="caption" color="text.disabled" sx={{ ml: "auto" }}>
                Click on a node for details
              </Typography>
            </Box>

            {/* SVG commit graph */}
            <Box sx={{
              overflowX: "auto", border: "1px solid", borderColor: "grey.200",
              borderRadius: 2, bgcolor: "#f8fafc",
            }}>
              <svg
                width={svgW}
                height={svgH}
                style={{ display: "block" }}
              >
                <defs>
                  <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5"
                    markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#bdbdbd" />
                  </marker>
                </defs>

                {/* Edges — dashed bezier curves */}
                {edges.map((edge, i) => {
                  const fn = nodes.get(edge.from);
                  const tn = nodes.get(edge.to);
                  if (!fn || !tn) return null;
                  const x1 = fn.x, y1 = fn.y + NODE_R + 2;
                  const x2 = tn.x, y2 = tn.y - NODE_R - 2;
                  const midY = (y1 + y2) / 2;
                  return (
                    <path
                      key={i}
                      d={`M ${x1} ${y1} C ${x1} ${midY} ${x2} ${midY} ${x2} ${y2}`}
                      fill="none"
                      stroke="#bdbdbd"
                      strokeWidth={2}
                      strokeDasharray="8 5"
                      markerEnd="url(#arr)"
                    />
                  );
                })}

                {/* Nodes */}
                {allNodes.map(node => {
                  const color = ROLE_COLORS[node.role] ?? "#9e9e9e";
                  const isSelected = selected?.tokenId === node.tokenId;
                  const isLeaf = node.tokenId === tokenId?.toString();

                  return (
                    <g key={node.tokenId} onClick={() => setSelected(node)} style={{ cursor: "pointer" }}>
                      {/* Selection ring */}
                      {isSelected && (
                        <circle
                          cx={node.x} cy={node.y} r={NODE_R + 8}
                          fill="none" stroke={color} strokeWidth={2.5} opacity={0.3}
                        />
                      )}
                      {/* Leaf indicator (double ring) */}
                      {isLeaf && !isSelected && (
                        <circle
                          cx={node.x} cy={node.y} r={NODE_R + 5}
                          fill="none" stroke={color} strokeWidth={1.5} opacity={0.4}
                          strokeDasharray="4 3"
                        />
                      )}
                      {/* Main circle */}
                      <circle
                        cx={node.x} cy={node.y} r={NODE_R}
                        fill={color}
                        style={{ filter: isSelected ? `drop-shadow(0 0 10px ${color}88)` : "none" }}
                      />
                      {/* Token ID inside */}
                      <text
                        x={node.x} y={node.y + 1}
                        textAnchor="middle" dominantBaseline="middle"
                        fill="#fff" fontSize={11} fontWeight="bold" fontFamily="monospace"
                      >
                        #{node.tokenId}
                      </text>
                      {/* Name below */}
                      <text
                        x={node.x} y={node.y + NODE_R + 17}
                        textAnchor="middle" dominantBaseline="middle"
                        fill="#333" fontSize={12} fontWeight="600"
                      >
                        {node.name.length > 16 ? `${node.name.slice(0, 14)}…` : node.name}
                      </text>
                      {/* Role badge */}
                      <text
                        x={node.x} y={node.y + NODE_R + 32}
                        textAnchor="middle" dominantBaseline="middle"
                        fill={color} fontSize={10} fontWeight="700"
                      >
                        {ROLE_NAMES[node.role]}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </Box>

            {/* Detail panel */}
            {selected && (
              <Box sx={{
                mt: 2.5, p: 2, bgcolor: "grey.50",
                borderRadius: 2, border: "1px solid", borderColor: "grey.200",
              }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 12, height: 12, borderRadius: "50%",
                      bgcolor: ROLE_COLORS[selected.role] ?? "#9e9e9e", flexShrink: 0,
                    }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                    {selected.name}
                  </Typography>
                  <Chip size="small" label={`#${selected.tokenId}`} sx={{ fontFamily: "monospace", height: 20, fontSize: "0.7rem" }} />
                  <Chip
                    size="small"
                    label={ROLE_NAMES[selected.role]}
                    sx={{ bgcolor: ROLE_COLORS[selected.role], color: "#fff", height: 20, fontSize: "0.7rem", fontWeight: 700, ml: "auto" }}
                  />
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75 }}>
                  {([
                    ["Creator", `${selected.creator.slice(0, 8)}…${selected.creator.slice(-6)}`],
                    ["Created at", formatDate(selected.createdAt)],
                    ["Parents", selected.parentIds.length === 0 ? "— (root)" : selected.parentIds.map(p => `#${p}`).join(", ")],
                    ["Is leaf", selected.tokenId === tokenId?.toString() ? "Yes (selected token)" : "No"],
                  ] as [string, string][]).map(([k, v]) => (
                    <Box key={k} sx={{ display: "flex", gap: 1, alignItems: "baseline" }}>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 76 }}>{k}:</Typography>
                      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>{v}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="contained" onClick={onClose}>{t("close")}</Button>
      </DialogActions>
    </Dialog>
  );
}
