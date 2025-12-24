import {
  Box,
  Flex,
  Grid,
  GridItem,
  Text,
} from "@chakra-ui/react";
import { CellSize, DAY_LABELS, 분 } from "./constants.ts";
import { Schedule } from "./types.ts";
import { fill2, parseHnM } from "./utils.ts";
import React, { Fragment, useCallback, useMemo } from "react";
import { useActiveTableId } from "./ScheduleDndProvider.tsx";
import DraggableSchedule from "./DraggableSchedule.tsx";

// outline을 별도 컴포넌트로 분리하여 ScheduleTable 리렌더링 방지
// 이 컴포넌트만 Context를 구독하므로, ScheduleTable은 리렌더링되지 않음
const TableOutline = React.memo(({ tableId }: { tableId: string }) => {
  const activeTableId = useActiveTableId();
  const isActiveTable = activeTableId === tableId;
  
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
});
TableOutline.displayName = 'TableOutline';

interface Props {
  tableId: string;
  schedules: Schedule[];
  onScheduleTimeClick?: (timeInfo: { day: string, time: number }) => void;
  onDeleteButtonClick?: (timeInfo: { day: string, time: number }) => void;
}

const TIMES = [
  ...Array(18)
    .fill(0)
    .map((v, k) => v + k * 30 * 분)
    .map((v) => `${parseHnM(v)}~${parseHnM(v + 30 * 분)}`),

  ...Array(6)
    .fill(18 * 30 * 분)
    .map((v, k) => v + k * 55 * 분)
    .map((v) => `${parseHnM(v)}~${parseHnM(v + 50 * 분)}`),
] as const;

const ScheduleTable = ({ tableId, schedules, onScheduleTimeClick, onDeleteButtonClick }: Props) => {
  const colorMap = useMemo(() => {
    const lectures = [...new Set(schedules.map(({ lecture }) => lecture.id))];
    const colors = ["#fdd", "#ffd", "#dff", "#ddf", "#fdf", "#dfd"];
    return new Map(lectures.map((lectureId, index) => [lectureId, colors[index % colors.length]]));
  }, [schedules]);

  const getColor = useCallback((lectureId: string): string => {
    return colorMap.get(lectureId) || '#fdd';
  }, [colorMap]);

  return (
    <Box position="relative">
      <TableOutline tableId={tableId} />
      <Grid
        templateColumns={`120px repeat(${DAY_LABELS.length}, ${CellSize.WIDTH}px)`}
        templateRows={`40px repeat(${TIMES.length}, ${CellSize.HEIGHT}px)`}
        bg="white"
        fontSize="sm"
        textAlign="center"
        outline="1px solid"
        outlineColor="gray.300"
      >
        <GridItem key="교시" borderColor="gray.300" bg="gray.100">
          <Flex justifyContent="center" alignItems="center" h="full" w="full">
            <Text fontWeight="bold">교시</Text>
          </Flex>
        </GridItem>
        {DAY_LABELS.map((day) => (
          <GridItem key={day} borderLeft="1px" borderColor="gray.300" bg="gray.100">
            <Flex justifyContent="center" alignItems="center" h="full">
              <Text fontWeight="bold">{day}</Text>
            </Flex>
          </GridItem>
        ))}
        {TIMES.map((time, timeIndex) => (
          <Fragment key={`시간-${timeIndex + 1}`}>
            <GridItem
              borderTop="1px solid"
              borderColor="gray.300"
              bg={timeIndex > 17 ? 'gray.200' : 'gray.100'}
            >
              <Flex justifyContent="center" alignItems="center" h="full">
                <Text fontSize="xs">{fill2(timeIndex + 1)} ({time})</Text>
              </Flex>
            </GridItem>
            {DAY_LABELS.map((day) => (
              <GridItem
                key={`${day}-${timeIndex + 2}`}
                borderWidth="1px 0 0 1px"
                borderColor="gray.300"
                bg={timeIndex > 17 ? 'gray.100' : 'white'}
                cursor="pointer"
                _hover={{ bg: 'yellow.100' }}
                onClick={() => onScheduleTimeClick?.({ day, time: timeIndex + 1 })}
              />
            ))}
          </Fragment>
        ))}
      </Grid>

      {schedules.map((schedule, index) => (
        <DraggableSchedule
          key={`${tableId}:${index}:${schedule.lecture.id}:${schedule.day}:${schedule.range[0]}`}
          id={`${tableId}:${index}`}
          data={schedule}
          bg={getColor(schedule.lecture.id)}
          tableId={tableId}
          onDeleteButtonClick={() => onDeleteButtonClick?.({
            day: schedule.day,
            time: schedule.range[0],
          })}
        />
      ))}
    </Box>
  );
};

// React.memo를 사용하되, activeTableId는 Context에서 직접 읽으므로 비교 함수에 포함하지 않음
// activeTableId 변경 시 해당 테이블만 리렌더링됨
export default React.memo(ScheduleTable, (prevProps, nextProps) => {
  // schedules 배열의 얕은 비교
  if (prevProps.schedules.length !== nextProps.schedules.length) return false;
  for (let i = 0; i < prevProps.schedules.length; i++) {
    if (prevProps.schedules[i] !== nextProps.schedules[i]) return false;
  }
  return prevProps.tableId === nextProps.tableId &&
         prevProps.onScheduleTimeClick === nextProps.onScheduleTimeClick &&
         prevProps.onDeleteButtonClick === nextProps.onDeleteButtonClick;
});
