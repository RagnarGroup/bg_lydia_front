"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { EvoBotGraph, EvoBotNodeType } from "@/lib/lydia-api/types";
import { LYDIA_API_ENABLED } from "@/lib/lydia-api/config";
import { useBotFlow, useUpdateBotFlow } from "@/lib/queries/bot";
import {
  BotCanvasActionsContext,
  MAX_OPTIONS,
  MessageNode,
  QuestionNode,
  type BotCanvasOption,
  type BotMessageNodeData,
  type BotQuestionNodeData,
} from "./BotCanvasNodes";

// LYD-49: editor de canvas real (cajas arrastrables + flechas dibujadas +
// minimapa) con @xyflow/react -- reemplaza a la lista de tarjetas de
// LYD-48. No reinventa drag&drop ni el dibujado de conexiones; solo el
// modelo de datos (BotGraph) sigue siendo el mismo que ya valida el back.

const NODE_TYPES = { message: MessageNode, question: QuestionNode };
// LYD-51: un mensaje tiene un solo handle de salida "real", pero el
// componente lo dibuja en 2 lados (abajo/derecha) para poder armar tanto un
// layout vertical como horizontal -- cualquiera de los dos representa la
// misma salida. Al recargar se reconecta siempre a este, aunque se haya
// guardado usando el otro (no se persiste "de que lado" se dibujo).
const DEFAULT_MESSAGE_HANDLE = "out-bottom";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random()}`;
}

type BotNode = Node<BotMessageNodeData | BotQuestionNodeData>;

function graphToFlow(graph: EvoBotGraph): { nodes: BotNode[]; edges: Edge[] } {
  const nodes: BotNode[] = graph.nodes.map((n, i) => ({
    id: n.id,
    type: n.type,
    position: { x: typeof n.x === "number" ? n.x : i * 280, y: typeof n.y === "number" ? n.y : 80 },
    data:
      n.type === "question"
        ? { text: n.text, isStart: n.id === graph.startNodeId, options: n.options ?? [] }
        : { text: n.text, isStart: n.id === graph.startNodeId },
  }));
  const nodeTypeById = new Map(graph.nodes.map((n) => [n.id, n.type]));
  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.from,
    // fromOption solo existe para nodos "question" (el back lo exige asi);
    // para "message" siempre es null en los datos guardados, asi que se
    // reconecta al handle canonico -- ver DEFAULT_MESSAGE_HANDLE.
    sourceHandle: nodeTypeById.get(e.from) === "question" ? (e.fromOption ?? undefined) : DEFAULT_MESSAGE_HANDLE,
    // LYD-51: si no hay toHandle guardado (grafo viejo, de antes de esto),
    // queda undefined y xyflow cae solo al primer handle (t-top) -- mismo
    // comportamiento de siempre, no rompe nada ya guardado.
    targetHandle: e.toHandle ?? undefined,
    target: e.to,
  }));
  return { nodes, edges };
}

function flowToGraph(nodes: BotNode[], edges: Edge[]): EvoBotGraph {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const startNode = nodes.find((n) => n.data.isStart);
  const graphNodes = nodes.map((n) => {
    const isQuestion = n.type === "question";
    return {
      id: n.id,
      type: (n.type ?? "message") as EvoBotNodeType,
      text: n.data.text.trim(),
      x: n.position.x,
      y: n.position.y,
      ...(isQuestion
        ? { options: (n.data as BotQuestionNodeData).options.map((o) => ({ id: o.id, title: o.title.trim() })) }
        : {}),
    };
  });
  const graphEdges = edges.map((e) => {
    // Se resuelve por el TIPO del nodo origen, no por el string exacto del
    // handle -- un mensaje ofrece 2 handles de salida (LYD-51) que
    // representan la misma salida unica, asi que siempre es fromOption null
    // sin importar cual de los dos se uso para conectar.
    const isQuestionSource = nodeById.get(e.source)?.type === "question";
    return {
      id: e.id,
      from: e.source,
      fromOption: isQuestionSource ? (e.sourceHandle ?? null) : null,
      to: e.target,
      toHandle: e.targetHandle ?? null,
    };
  });
  return { startNodeId: startNode?.id ?? null, nodes: graphNodes, edges: graphEdges };
}

function CanvasInner() {
  const { data: realFlow, error: flowError, isLoading } = useBotFlow();
  const isMockMode = !LYDIA_API_ENABLED || flowError !== null;
  const update = useUpdateBotFlow();

  const initial = useMemo(() => {
    if (isMockMode || !realFlow) return { nodes: [] as BotNode[], edges: [] as Edge[] };
    return graphToFlow(realFlow.graph);
  }, [isMockMode, realFlow]);

  const [enabled, setEnabled] = useState(realFlow?.enabled ?? false);
  const [nodes, setNodes, onNodesChange] = useNodesState<BotNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Solo se carga una vez lo que llega del back/mock -- despues de eso el
  // canvas es la fuente de verdad (evita pisar ediciones en curso si la
  // query revalida en el medio).
  if (!loaded && (isMockMode || realFlow)) {
    setLoaded(true);
    setEnabled(realFlow?.enabled ?? false);
    setNodes(initial.nodes);
    setEdges(initial.edges);
  }

  const markDirty = useCallback(() => {
    setDirty(true);
    setError(null);
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      // Un paso no puede conectarse a si mismo -- ni el back ni tiene
      // sentido en el flujo (mismo criterio que el editor de lista, que
      // ni mostraba el paso actual en su propio selector "Lleva a").
      if (connection.source === connection.target) return;
      const isMessageSource = nodes.find((n) => n.id === connection.source)?.type === "message";
      setEdges((eds) => {
        // Una sola salida real por nodo "message" (aunque tenga 2 handles
        // visuales, LYD-51: cualquiera de los dos reemplaza al otro) o por
        // boton de una pregunta -- misma regla que ya valida el back.
        const withoutOld = eds.filter((e) => {
          if (e.source !== connection.source) return true;
          if (isMessageSource) return false;
          return e.sourceHandle !== connection.sourceHandle;
        });
        return addEdge({ ...connection, id: newId() }, withoutOld);
      });
      markDirty();
    },
    [setEdges, markDirty, nodes],
  );

  const addNode = (type: EvoBotNodeType) => {
    const id = newId();
    const node: BotNode =
      type === "question"
        ? {
            id,
            type,
            position: { x: 80 + nodes.length * 60, y: 80 + nodes.length * 40 },
            data: { text: "", isStart: nodes.length === 0, options: [{ id: newId(), title: "" }] },
          }
        : {
            id,
            type,
            position: { x: 80 + nodes.length * 60, y: 80 + nodes.length * 40 },
            data: { text: "", isStart: nodes.length === 0 },
          };
    setNodes((nds) => [...nds, node]);
    markDirty();
  };

  const actions = useMemo(
    () => ({
      updateText: (nodeId: string, text: string) => {
        setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, text } } : n)));
        markDirty();
      },
      setStart: (nodeId: string) => {
        setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, isStart: n.id === nodeId } })));
        markDirty();
      },
      deleteNode: (nodeId: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
        markDirty();
      },
      addOption: (nodeId: string) => {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id !== nodeId || n.type !== "question") return n;
            const data = n.data as BotQuestionNodeData;
            if (data.options.length >= MAX_OPTIONS) return n;
            const option: BotCanvasOption = { id: newId(), title: "" };
            return { ...n, data: { ...data, options: [...data.options, option] } };
          }),
        );
        markDirty();
      },
      updateOption: (nodeId: string, optionId: string, title: string) => {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id !== nodeId || n.type !== "question") return n;
            const data = n.data as BotQuestionNodeData;
            return {
              ...n,
              data: { ...data, options: data.options.map((o) => (o.id === optionId ? { ...o, title } : o)) },
            };
          }),
        );
        markDirty();
      },
      removeOption: (nodeId: string, optionId: string) => {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id !== nodeId || n.type !== "question") return n;
            const data = n.data as BotQuestionNodeData;
            if (data.options.length <= 1) return n;
            return { ...n, data: { ...data, options: data.options.filter((o) => o.id !== optionId) } };
          }),
        );
        setEdges((eds) => eds.filter((e) => !(e.source === nodeId && e.sourceHandle === optionId)));
        markDirty();
      },
    }),
    [setNodes, setEdges, markDirty],
  );

  const startId = nodes.find((n) => n.data.isStart)?.id ?? null;
  const hasValidNodes = nodes.every((n) => {
    if (!n.data.text.trim()) return false;
    if (n.type === "question") {
      const options = (n.data as BotQuestionNodeData).options;
      return options.length >= 1 && options.length <= MAX_OPTIONS && options.every((o) => o.title.trim());
    }
    return true;
  });
  const canSave = nodes.length === 0 ? !enabled : !!startId && hasValidNodes;

  const handleSave = async () => {
    if (!canSave) return;
    const graph = flowToGraph(nodes, edges);
    if (isMockMode) {
      setDirty(false);
      return;
    }
    try {
      await update.mutateAsync({ enabled, graph });
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el bot");
    }
  };

  return (
    <BotCanvasActionsContext.Provider value={actions}>
      <section className="flex h-full flex-1 flex-col bg-bg">
        <div className="flex items-start justify-between gap-4 border-b border-line-soft px-8 py-4">
          <div>
            <h1 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Bot</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Flujo automatico para numeros de WhatsApp sin conversacion previa. Arrastra desde el punto de un paso
              hasta otro para conectarlos. Si el cliente escribe texto libre en vez de tocar un boton, el bot se calla y
              sigue la asesora.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => {
                setEnabled((v) => !v);
                markDirty();
              }}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? "bg-brand" : "bg-muted-2"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  enabled ? "translate-x-5" : ""
                }`}
              />
            </button>
            <button
              type="button"
              disabled={!dirty || !canSave || update.isPending}
              onClick={handleSave}
              className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-muted-2"
            >
              Guardar
            </button>
          </div>
        </div>

        {!isMockMode && !dirty && (realFlow?.warnings.length ?? 0) > 0 && (
          <div className="mx-8 mt-3 rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-800">
            {realFlow?.warnings.map((w) => (
              <p key={w}>⚠️ {w}</p>
            ))}
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="mx-8 mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
          >
            {error}
          </p>
        )}

        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={NODE_TYPES}
            fitView
            deleteKeyCode={["Backspace", "Delete"]}
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
            <Panel position="top-left">
              <div className="flex gap-2 rounded-lg border border-line bg-surface p-1.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => addNode("message")}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-bg-subtle"
                >
                  + Mensaje
                </button>
                <button
                  type="button"
                  onClick={() => addNode("question")}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-bg-subtle"
                >
                  + Pregunta
                </button>
              </div>
            </Panel>
            {isLoading && !isMockMode && (
              <Panel position="top-right">
                <span className="text-xs text-muted">Cargando…</span>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </section>
    </BotCanvasActionsContext.Provider>
  );
}

export function BotFlowCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
