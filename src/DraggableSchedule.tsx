import React, { useMemo } from "react";
import { Box, Button, Popover, PopoverArrow, PopoverBody, PopoverCloseButton, PopoverContent, PopoverTrigger, Text } from "@chakra-ui/react";
import { CSS } from "@dnd-kit/utilities";
import { useDraggable } from "@dnd-kit/core";
import { CellSize, DAY_LABELS } from "./constants.ts";
import { Schedule } from "./types.ts";

interface Props {
  id: string;
  data: Schedule;
  bg?: string;
  tableId: string;
  onDeleteButtonClick: () => void;
}

// tableId는 React.memo 비교 함수(아래)에서 사용되므로 Props에 필요
const DraggableScheduleInner = ({ id, data, bg, tableId: _tableId, onDeleteButtonClick }: Props) => {
  const { day, range, room, lecture } = data;
  const { attributes, setNodeRef, listeners, transform, isDragging } = useDraggable({ id });
  
  const leftIndex = DAY_LABELS.indexOf(day as typeof DAY_LABELS[number]);
  const topIndex = range[0] - 1;
  const size = range.length;

  // 위치 계산 메모이제이션 - transform만 변경되므로 리렌더링 최소화
  const style = useMemo(() => ({
    position: 'absolute' as const,
    left: `${120 + (CellSize.WIDTH * leftIndex) + 1}px`,
    top: `${40 + (topIndex * CellSize.HEIGHT + 1)}px`,
    width: `${CellSize.WIDTH - 1}px`,
    height: `${CellSize.HEIGHT * size - 1}px`,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }), [leftIndex, topIndex, size, transform, isDragging]);

  return (
    <Popover>
      <PopoverTrigger>
        <Box
          {...style}
          bg={bg}
          p={1}
          boxSizing="border-box"
          cursor={isDragging ? 'grabbing' : 'pointer'}
          ref={setNodeRef}
          {...listeners}
          {...attributes}
        >
          <Text fontSize="sm" fontWeight="bold">{lecture.title}</Text>
          <Text fontSize="xs">{room}</Text>
        </Box>
      </PopoverTrigger>
      <PopoverContent onClick={event => event.stopPropagation()}>
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverBody>
          <Text>강의를 삭제하시겠습니까?</Text>
          <Button colorScheme="red" size="xs" onClick={onDeleteButtonClick}>
            삭제
          </Button>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

// memoize to avoid re-renders unless props identity changes
// 드래그 중에는 transform만 변경되므로 불필요한 리렌더링 방지
// tableId는 이 비교 함수에서 사용되므로 컴포넌트 Props에 필요함
export default React.memo(DraggableScheduleInner, (prev, next) => {
  // id, bg, tableId, onDeleteButtonClick는 참조 비교 (tableId는 위 컴포넌트에서 언더스코어로 처리)
  if (prev.id !== next.id || prev.bg !== next.bg || prev.tableId !== next.tableId || prev.onDeleteButtonClick !== next.onDeleteButtonClick) {
    return false;
  }
  
  // data는 깊은 비교 필요 - schedule의 주요 속성만 비교
  if (prev.data !== next.data) {
    const prevSchedule = prev.data;
    const nextSchedule = next.data;
    
    return (
      prevSchedule.day === nextSchedule.day &&
      prevSchedule.lecture.id === nextSchedule.lecture.id &&
      prevSchedule.range.length === nextSchedule.range.length &&
      prevSchedule.range.every((time, idx) => time === nextSchedule.range[idx]) &&
      prevSchedule.room === nextSchedule.room
    );
  }
  
  return true;
});
