import {
  Edge,
  LayoutNode,
  SplitNode,
  WidgetKind,
  WidgetNode,
  WidgetSettings,
} from "./layout-types";

export const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

export const equalSizes = (count: number): number[] =>
  Array.from({ length: count }, () => 100 / count);

export const makeWidget = (
  widgetKey: WidgetKind,
  settings?: WidgetSettings
): WidgetNode => ({
  type: "widget",
  id: generateId(),
  widgetKey,
  settings,
});

export const makeSplit = (
  direction: "horizontal" | "vertical",
  children: LayoutNode[]
): SplitNode => ({
  type: "split",
  id: generateId(),
  direction,
  sizes: equalSizes(children.length),
  children,
});

export const findParent = (
  root: LayoutNode | null,
  childId: string
): { parent: SplitNode; index: number } | null => {
  if (!root || root.type !== "split") return null;
  const idx = root.children.findIndex((c) => c.id === childId);
  if (idx >= 0) return { parent: root, index: idx };
  for (const child of root.children) {
    const hit = findParent(child, childId);
    if (hit) return hit;
  }
  return null;
};

export const collapse = (node: LayoutNode): LayoutNode => {
  if (node.type === "widget") return node;
  const collapsedChildren = node.children.map(collapse);
  if (collapsedChildren.length === 1) return collapsedChildren[0];
  // Flatten same-direction nested splits to avoid degenerate trees
  const flattened: LayoutNode[] = [];
  const flattenedSizes: number[] = [];
  collapsedChildren.forEach((child, i) => {
    if (
      child.type === "split" &&
      child.direction === node.direction &&
      child.children.length > 0
    ) {
      const parentShare = node.sizes[i] ?? 100 / collapsedChildren.length;
      child.children.forEach((grand, gi) => {
        flattened.push(grand);
        const grandShare = child.sizes[gi] ?? 100 / child.children.length;
        flattenedSizes.push((parentShare * grandShare) / 100);
      });
    } else {
      flattened.push(child);
      flattenedSizes.push(node.sizes[i] ?? 100 / collapsedChildren.length);
    }
  });
  return { ...node, children: flattened, sizes: flattenedSizes };
};

export const removeNode = (
  root: LayoutNode | null,
  targetId: string
): LayoutNode | null => {
  if (!root) return null;
  if (root.id === targetId) return null;
  if (root.type === "widget") return root;
  const filtered: LayoutNode[] = [];
  const filteredSizes: number[] = [];
  root.children.forEach((child, i) => {
    if (child.id === targetId) return;
    const reduced = removeNode(child, targetId);
    if (reduced) {
      filtered.push(reduced);
      filteredSizes.push(root.sizes[i] ?? 100 / root.children.length);
    }
  });
  if (filtered.length === 0) return null;
  // Renormalize sizes to sum 100
  const total = filteredSizes.reduce((a, b) => a + b, 0) || 1;
  const normalized = filteredSizes.map((s) => (s * 100) / total);
  const next: SplitNode = { ...root, children: filtered, sizes: normalized };
  return collapse(next);
};

export const splitWidgetAt = (
  root: LayoutNode | null,
  targetId: string,
  direction: "horizontal" | "vertical",
  position: "before" | "after",
  newWidget: WidgetNode
): LayoutNode | null => {
  if (!root) return newWidget;
  if (root.id === targetId && root.type === "widget") {
    const children =
      position === "after" ? [root, newWidget] : [newWidget, root];
    return makeSplit(direction, children);
  }
  if (root.type === "widget") return root;
  const hit = root.children.findIndex((c) => c.id === targetId);
  if (hit >= 0 && root.direction === direction) {
    // Insert as sibling in same-direction parent
    const insertAt = position === "after" ? hit + 1 : hit;
    const newChildren = [...root.children];
    newChildren.splice(insertAt, 0, newWidget);
    return { ...root, children: newChildren, sizes: equalSizes(newChildren.length) };
  }
  // Recurse
  const newChildren = root.children.map((c) =>
    splitWidgetAt(c, targetId, direction, position, newWidget)
  );
  return { ...root, children: newChildren as LayoutNode[] };
};

export const appendToRoot = (
  root: LayoutNode | null,
  newWidget: WidgetNode,
  direction: "horizontal" | "vertical" = "horizontal"
): LayoutNode => {
  if (!root) return newWidget;
  if (root.type === "split" && root.direction === direction) {
    const children = [...root.children, newWidget];
    return { ...root, children, sizes: equalSizes(children.length) };
  }
  return makeSplit(direction, [root, newWidget]);
};

export const edgeToSplit = (
  edge: Edge
): { direction: "horizontal" | "vertical"; position: "before" | "after" } => {
  switch (edge) {
    case "left":
      return { direction: "horizontal", position: "before" };
    case "right":
      return { direction: "horizontal", position: "after" };
    case "top":
      return { direction: "vertical", position: "before" };
    case "bottom":
      return { direction: "vertical", position: "after" };
  }
};

export const insertAtEdge = (
  root: LayoutNode | null,
  targetId: string,
  edge: Edge,
  newWidget: WidgetNode
): LayoutNode | null => {
  const { direction, position } = edgeToSplit(edge);
  return splitWidgetAt(root, targetId, direction, position, newWidget);
};

export const findWidget = (
  root: LayoutNode | null,
  id: string
): WidgetNode | null => {
  if (!root) return null;
  if (root.type === "widget") return root.id === id ? root : null;
  for (const child of root.children) {
    const hit = findWidget(child, id);
    if (hit) return hit;
  }
  return null;
};

export const updateWidgetSettings = (
  root: LayoutNode | null,
  targetId: string,
  patch: WidgetSettings
): LayoutNode | null => {
  if (!root) return null;
  if (root.type === "widget") {
    if (root.id !== targetId) return root;
    return { ...root, settings: { ...root.settings, ...patch } };
  }
  return {
    ...root,
    children: root.children.map(
      (c) => updateWidgetSettings(c, targetId, patch) as LayoutNode
    ),
  };
};

export const updateSplitSizes = (
  root: LayoutNode | null,
  splitId: string,
  sizes: number[]
): LayoutNode | null => {
  if (!root || root.type === "widget") return root;
  if (root.id === splitId) return { ...root, sizes };
  return {
    ...root,
    children: root.children.map(
      (c) => updateSplitSizes(c, splitId, sizes) as LayoutNode
    ),
  };
};

export const collectWidgetIds = (root: LayoutNode | null): string[] => {
  if (!root) return [];
  if (root.type === "widget") return [root.id];
  return root.children.flatMap(collectWidgetIds);
};

export const cloneTreeWithNewIds = (node: LayoutNode): LayoutNode => {
  if (node.type === "widget") {
    return { ...node, id: generateId() };
  }
  return {
    ...node,
    id: generateId(),
    children: node.children.map(cloneTreeWithNewIds),
  };
};
