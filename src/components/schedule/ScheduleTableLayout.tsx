import {
  Flex,
  Grid,
  GridItem,
  Text,
} from "@chakra-ui/react";
import { CellSize, DAY_LABELS, 분 } from "../../constants.ts";
import { fill2, parseHnM } from "../../utils.ts";
import React, { Fragment, useCallback, useMemo } from "react";

// 상수 정의
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

const GRID_TEMPLATE_COLUMNS = `120px repeat(${DAY_LABELS.length}, ${CellSize.WIDTH}px)`;
const GRID_TEMPLATE_ROWS = `40px repeat(${TIMES.length}, ${CellSize.HEIGHT}px)`;

// 클릭 핸들러를 전역으로 관리하여 셀 컴포넌트가 안정적으로 유지되도록 함
const clickHandlerRegistry = new Map<string, (day: string, timeIndex: number) => void>();

// 클릭 핸들러 등록 함수 (외부에서 사용)
export const registerClickHandler = (tableId: string, handler: (day: string, timeIndex: number) => void) => {
  clickHandlerRegistry.set(tableId, handler);
};

// 클릭 핸들러 제거 함수 (외부에서 사용)
export const unregisterClickHandler = (tableId: string) => {
  clickHandlerRegistry.delete(tableId);
};

// 교시 라벨 셀 - 완전히 정적
const PeriodLabelCell = React.memo(() => {
  return (
    <GridItem borderColor="gray.300" bg="gray.100">
      <Flex justifyContent="center" alignItems="center" h="full" w="full">
        <Text fontWeight="bold">교시</Text>
      </Flex>
    </GridItem>
  );
});
PeriodLabelCell.displayName = 'PeriodLabelCell';

// 요일 라벨 셀 - 완전히 정적
const DayLabelCell = React.memo(({ day }: { day: string }) => {
  return (
    <GridItem borderLeft="1px" borderColor="gray.300" bg="gray.100">
      <Flex justifyContent="center" alignItems="center" h="full">
        <Text fontWeight="bold">{day}</Text>
      </Flex>
    </GridItem>
  );
}, (prevProps, nextProps) => prevProps.day === nextProps.day);
DayLabelCell.displayName = 'DayLabelCell';

// 시간 라벨 셀 - 완전히 정적
const TimeLabelCell = React.memo(({ timeIndex, time }: { timeIndex: number; time: string }) => {
  const labelText = useMemo(() => `${fill2(timeIndex + 1)} (${time})`, [timeIndex, time]);
  const bgColor = useMemo(() => timeIndex > 17 ? 'gray.200' : 'gray.100', [timeIndex]);

  return (
    <GridItem
      borderTop="1px solid"
      borderColor="gray.300"
      bg={bgColor}
    >
      <Flex justifyContent="center" alignItems="center" h="full">
        <Text fontSize="xs">{labelText}</Text>
      </Flex>
    </GridItem>
  );
}, (prevProps, nextProps) => {
  return prevProps.timeIndex === nextProps.timeIndex && 
         prevProps.time === nextProps.time;
});
TimeLabelCell.displayName = 'TimeLabelCell';

// 클릭 가능한 빈 셀 - 드래그와 무관하지만 클릭 이벤트가 있음
const ScheduleCell = React.memo(({ 
  day, 
  timeIndex, 
  tableId
}: { 
  day: string; 
  timeIndex: number; 
  tableId: string;
}) => {
  const handleClick = useCallback(() => {
    const handler = clickHandlerRegistry.get(tableId);
    handler?.(day, timeIndex);
  }, [day, timeIndex, tableId]);

  const bgColor = useMemo(() => timeIndex > 17 ? 'gray.100' : 'white', [timeIndex]);

  return (
    <GridItem
      borderWidth="1px 0 0 1px"
      borderColor="gray.300"
      bg={bgColor}
      cursor="pointer"
      _hover={{ bg: 'yellow.100' }}
      onClick={handleClick}
    />
  );
}, (prevProps, nextProps) => {
  return prevProps.day === nextProps.day && 
         prevProps.timeIndex === nextProps.timeIndex &&
         prevProps.tableId === nextProps.tableId;
});
ScheduleCell.displayName = 'ScheduleCell';

// 드래그와 관련없는 정적 테이블 레이아웃
// 모든 정적 셀들을 포함하며, 한 번 렌더링되면 재렌더링되지 않음
const ScheduleTableLayout = React.memo(({ 
  tableId
}: { 
  tableId: string;
}) => {
  // 시간 라벨 목록 메모이제이션 - 한 번만 생성
  const timeLabels = useMemo(() => {
    return TIMES.map((time, timeIndex) => (
      <TimeLabelCell
        key={`시간-${timeIndex + 1}`}
        timeIndex={timeIndex}
        time={time}
      />
    ));
  }, []);

  // 요일 라벨 목록 메모이제이션 - 한 번만 생성
  const dayLabels = useMemo(() => {
    return DAY_LABELS.map((day) => (
      <DayLabelCell key={day} day={day} />
    ));
  }, []);

  // 스케줄 셀 목록을 메모이제이션 - tableId가 안정적이므로 한 번만 생성
  const scheduleCells = useMemo(() => {
    return TIMES.map((_time, timeIndex) => (
      <Fragment key={`시간-${timeIndex + 1}`}>
        {timeLabels[timeIndex]}
        {DAY_LABELS.map((day) => (
          <ScheduleCell
            key={`${day}-${timeIndex}`}
            day={day}
            timeIndex={timeIndex}
            tableId={tableId}
          />
        ))}
      </Fragment>
    ));
  }, [timeLabels, tableId]);

  return (
    <Grid
      templateColumns={GRID_TEMPLATE_COLUMNS}
      templateRows={GRID_TEMPLATE_ROWS}
      bg="white"
      fontSize="sm"
      textAlign="center"
      outline="1px solid"
      outlineColor="gray.300"
    >
      <PeriodLabelCell />
      {dayLabels}
      {scheduleCells}
    </Grid>
  );
}, (prevProps, nextProps) => {
  // tableId만 비교 - 완전히 정적 컴포넌트이므로 tableId가 같으면 리렌더링하지 않음
  return prevProps.tableId === nextProps.tableId;
});
ScheduleTableLayout.displayName = 'ScheduleTableLayout';

export default ScheduleTableLayout;

