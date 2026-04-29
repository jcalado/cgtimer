import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { WidgetKind } from "../lib/layout-types";

export type DragData =
  | { kind: "palette"; widgetKey: WidgetKind; label: string }
  | { kind: "move"; widgetId: string; widgetKey: WidgetKind; label: string };

export type DraggableProps = {
  id: string;
  data: DragData;
  className?: string;
  children: React.ReactNode;
};

export const Draggable: React.FC<DraggableProps> = ({
  id,
  data,
  className,
  children,
}) => {
  const { attributes, listeners, setNodeRef } = useDraggable({ id, data });
  return (
    <div ref={setNodeRef} className={className} {...listeners} {...attributes}>
      {children}
    </div>
  );
};
