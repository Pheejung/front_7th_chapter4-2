import { DndContext, Modifier, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import React, { PropsWithChildren, useCallback, useMemo, useState, useRef, useEffect } from "react";
import { CellSize, DAY_LABELS } from "./constants.ts";
import { useScheduleSetAction } from "./ScheduleContext.tsx";

// 드래그 중인 테이블 ID를 관리하는 Context
const ActiveTableIdContext = React.createContext<string | null>(null);

export const useActiveTableId = () => React.useContext(ActiveTableIdContext);

// 특정 테이블이 활성화되어 있는지 확인하는 hook
// Context를 구독하되, 값이 변경되지 않으면 리렌더링을 방지하기 위해 useRef 사용
export const useIsActiveTable = (tableId: string) => {
  const activeTableId = useActiveTableId();
  const prevValueRef = useRef<boolean>(activeTableId === tableId);
  const prevActiveTableIdRef = useRef<string | null>(activeTableId);
  
  // activeTableId가 변경되었을 때만 값 업데이트
  if (prevActiveTableIdRef.current !== activeTableId) {
    prevActiveTableIdRef.current = activeTableId;
    prevValueRef.current = activeTableId === tableId;
  }
  
  return prevValueRef.current;
};

function createSnapModifier(): Modifier {
  return ({ transform, containerNodeRect, draggingNodeRect }) => {
    const containerTop = containerNodeRect?.top ?? 0;
    const containerLeft = containerNodeRect?.left ?? 0;
    const containerBottom = containerNodeRect?.bottom ?? 0;
    const containerRight = containerNodeRect?.right ?? 0;

    const { top = 0, left = 0, bottom = 0, right = 0 } = draggingNodeRect ?? {};

    const minX = containerLeft - left + 120 + 1;
    const minY = containerTop - top + 40 + 1;
    const maxX = containerRight - right;
    const maxY = containerBottom - bottom;


    return ({
      ...transform,
      x: Math.min(Math.max(Math.round(transform.x / CellSize.WIDTH) * CellSize.WIDTH, minX), maxX),
      y: Math.min(Math.max(Math.round(transform.y / CellSize.HEIGHT) * CellSize.HEIGHT, minY), maxY),
    })
  };
}

const modifiers = [createSnapModifier()]

const ScheduleDndProvider = ({ children }: PropsWithChildren) => {
  // setSchedulesMap만 필요하므로 별도 Context 사용하여 불필요한 리렌더링 방지
  const setSchedulesMap = useScheduleSetAction();
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const activeId = String(event.active.id);
    const [tableId] = activeId.split(':');
    setActiveTableId(tableId);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTableId(null);
    const { active, delta } = event;
    const { x, y } = delta;
    
    // 드래그가 없으면 무시
    if (x === 0 && y === 0) return;
    
    const activeId = String(active.id);
    const [tableId, index] = activeId.split(':');
    
    if (!tableId || index === undefined) return;
    
    const moveDayIndex = Math.floor(x / 80);
    const moveTimeIndex = Math.floor(y / 30);

    // 이동이 없으면 무시
    if (moveDayIndex === 0 && moveTimeIndex === 0) return;

    setSchedulesMap(prev => {
      const schedule = prev[tableId]?.[Number(index)];
      if (!schedule) return prev;

      const nowDayIndex = DAY_LABELS.indexOf(schedule.day as typeof DAY_LABELS[number]);
      const newDayIndex = Math.max(0, Math.min(DAY_LABELS.length - 1, nowDayIndex + moveDayIndex));
      const newRange = schedule.range.map(time => Math.max(1, Math.min(24, time + moveTimeIndex)));
      
      // 실제로 변경이 없으면 이전 상태 반환 (리렌더링 방지)
      if (newDayIndex === nowDayIndex && 
          schedule.range.length === newRange.length &&
          schedule.range.every((time, idx) => time === newRange[idx])) {
        return prev;
      }

      // 변경된 스케줄만 새 객체로 생성
      const updatedSchedule = {
        ...schedule,
        day: DAY_LABELS[newDayIndex],
        range: newRange,
      };

      // 변경된 테이블의 배열만 새로 생성하고, 다른 테이블은 참조 유지
      // 변경되지 않은 스케줄은 참조를 유지하여 해당 테이블만 리렌더링되도록 함
      const updatedSchedules = prev[tableId].map((targetSchedule, targetIndex) => {
        if (targetIndex !== Number(index)) {
          return targetSchedule; // 변경되지 않은 스케줄은 참조 유지
        }
        return updatedSchedule; // 변경된 스케줄만 새 객체
      });

      return {
        ...prev,
        [tableId]: updatedSchedules,
      };
    });
  }, [setSchedulesMap]);

  // Context value를 메모이제이션하여 불필요한 리렌더링 방지
  const contextValue = useMemo(() => activeTableId, [activeTableId]);

  return (
    <ActiveTableIdContext.Provider value={contextValue}>
      <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTableId(null)}
        modifiers={modifiers}
        // 드래그 중 리렌더링 최소화를 위한 설정
        autoScroll={{ threshold: { x: 0.2, y: 0.2 } }}
      >
        {children}
      </DndContext>
    </ActiveTableIdContext.Provider>
  );
}

export default React.memo(ScheduleDndProvider);
