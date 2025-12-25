import { Box } from "@chakra-ui/react";
import React, { useCallback, useMemo, useEffect } from "react";
import { useIsActiveTable } from "../../providers/ScheduleDndProvider.tsx";
import { useScheduleTable } from "../../contexts/ScheduleContext.tsx";
import DraggableSchedule from "./DraggableSchedule.tsx";
import ScheduleTableLayout, { registerClickHandler, unregisterClickHandler } from "./ScheduleTableLayout.tsx";

const COLORS = ["#fdd", "#ffd", "#dff", "#ddf", "#fdf", "#dfd"] as const;

// outline을 별도 컴포넌트로 분리하여 ScheduleTable 리렌더링 방지
const TableOutline = React.memo(({ tableId }: { tableId: string }) => {
  const isActiveTable = useIsActiveTable(tableId);
  
  if (!isActiveTable) return null;
  
  return (
    <Box
      position="absolute"
      inset="0"
      outline="5px dashed"
      outlineColor="blue.300"
      pointerEvents="none"
      zIndex={999}
    />
  );
}, (prevProps, nextProps) => {
  return prevProps.tableId === nextProps.tableId;
});
TableOutline.displayName = 'TableOutline';


interface Props {
  tableId: string;
  onScheduleTimeClick?: (timeInfo: { day: string, time: number }) => void;
  onDeleteButtonClick?: (timeInfo: { day: string, time: number }) => void;
}

// ScheduleTable - schedules를 useScheduleTable로 직접 가져옴
const ScheduleTable = ({ tableId, onScheduleTimeClick, onDeleteButtonClick }: Props) => {
  // schedules를 useScheduleTable로 직접 가져와서 해당 테이블만 구독
  const schedules = useScheduleTable(tableId);
  
  // 콜백을 ref로 저장하여 안정화 - 콜백이 변경되어도 리렌더링되지 않도록
  const onScheduleTimeClickRef = React.useRef(onScheduleTimeClick);
  const onDeleteButtonClickRef = React.useRef(onDeleteButtonClick);
  
  React.useEffect(() => {
    onScheduleTimeClickRef.current = onScheduleTimeClick;
    onDeleteButtonClickRef.current = onDeleteButtonClick;
  }, [onScheduleTimeClick, onDeleteButtonClick]);

  // 클릭 핸들러를 레지스트리에 등록/해제
  useEffect(() => {
    if (onScheduleTimeClickRef.current) {
      registerClickHandler(tableId, (day: string, timeIndex: number) => {
        onScheduleTimeClickRef.current?.({ day, time: timeIndex + 1 });
      });
    }
    return () => {
      unregisterClickHandler(tableId);
    };
  }, [tableId]);

  // colorMap을 schedules의 lecture.id만 추적하도록 최적화
  const lectureIdsStr = useMemo(() => {
    const ids = new Set(schedules.map(({ lecture }) => lecture.id));
    return Array.from(ids).sort().join(',');
  }, [schedules]);
  
  const colorMap = useMemo(() => {
    const uniqueLectures = lectureIdsStr ? lectureIdsStr.split(',') : [];
    return new Map(uniqueLectures.map((lectureId, index) => [lectureId, COLORS[index % COLORS.length]]));
  }, [lectureIdsStr]);

  const getColor = useCallback((lectureId: string): string => {
    return colorMap.get(lectureId) || '#fdd';
  }, [colorMap]);

  // onDeleteButtonClick을 안정화하여 매번 새로 생성되지 않도록
  const stableOnDeleteButtonClick = useCallback((day: string, time: number) => {
    onDeleteButtonClickRef.current?.({ day, time });
  }, []);

  // DraggableSchedule 목록을 메모이제이션
  const draggableSchedules = useMemo(() => {
    return schedules.map((schedule, index) => {
      const handleDelete = () => {
        stableOnDeleteButtonClick(schedule.day, schedule.range[0]);
      };
      
      return (
        <DraggableSchedule
          key={`${tableId}:${index}:${schedule.lecture.id}:${schedule.day}:${schedule.range[0]}`}
          id={`${tableId}:${index}`}
          data={schedule}
          bg={getColor(schedule.lecture.id)}
          tableId={tableId}
          onDeleteButtonClick={handleDelete}
        />
      );
    });
  }, [schedules, tableId, getColor, stableOnDeleteButtonClick]);

  return (
    <Box position="relative">
      <TableOutline tableId={tableId} />
      <ScheduleTableLayout tableId={tableId} />
      {draggableSchedules}
    </Box>
  );
};

// React.memo를 사용하되, schedules는 내부에서 직접 구독하므로 props에서 제거
// 콜백은 ref로 저장되므로 비교하지 않음 - 콜백 변경 시에도 리렌더링되지 않음
export default React.memo(ScheduleTable, (prevProps, nextProps) => {
  // tableId만 비교
  return prevProps.tableId === nextProps.tableId;
});
