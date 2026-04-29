import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { mergeClasses } from "@fluentui/react-components";

export type DroppableProps = {
  id: string;
  className?: string;
  activeClassName?: string;
  children?: React.ReactNode;
};

export const Droppable: React.FC<DroppableProps> = ({
  id,
  className,
  activeClassName,
  children,
}) => {
  const { isOver, setNodeRef } = useDroppable({ id });
  const merged =
    isOver && activeClassName
      ? mergeClasses(className, activeClassName)
      : className;
  return (
    <div ref={setNodeRef} className={merged}>
      {children}
    </div>
  );
};
