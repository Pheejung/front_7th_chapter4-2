import { Button, ButtonGroup, Flex, Heading, Stack } from "@chakra-ui/react";
import ScheduleTable from "./ScheduleTable.tsx";
import { useScheduleSetAction, useScheduleTableKeys } from "../../contexts/ScheduleContext.tsx";
import { useSearchDialogSetAction } from "../../contexts/SearchDialogContext.tsx";
import React, { useCallback, useMemo } from "react";
import { Schedule } from "../../types.ts";

export const ScheduleTables = () => {
  const tableKeys = useScheduleTableKeys();

  // disabledRemoveButton을 테이블 키 개수만 추적하도록 최적화
  const disabledRemoveButton = useMemo(() => {
    return tableKeys.length === 1;
  }, [tableKeys.length]);

  // TableCard: 각 테이블 블록을 독립된 컴포넌트로 분리하여
  // 각 테이블이 자신의 스케줄만 구독하도록 함
  const TableCard = React.memo(function TableCard({ tableId, index, disabledRemoveButton }: { tableId: string; index: number; disabledRemoveButton: boolean }) {
    const setSchedulesMap = useScheduleSetAction();
    const setSearchInfo = useSearchDialogSetAction();
    
    const onOpenSearch = useCallback(() => {
      setSearchInfo({ tableId });
    }, [tableId, setSearchInfo]);
    
    const onScheduleTimeClick = useCallback((timeInfo: { day: string; time: number }) => {
      setSearchInfo({ tableId, ...timeInfo });
    }, [tableId, setSearchInfo]);
    
    const onDeleteButtonClick = useCallback(({ day, time }: { day: string; time: number }) => {
      setSchedulesMap((prev: Record<string, Schedule[]>) => {
        const currentSchedules = prev[tableId] || [];
        const filteredSchedules = currentSchedules.filter((schedule: Schedule) => 
          schedule.day !== day || !schedule.range.includes(time)
        );
        
        // 실제로 변경이 없으면 이전 상태 반환
        if (filteredSchedules.length === currentSchedules.length) {
          return prev;
        }
        
        return {
          ...prev,
          [tableId]: filteredSchedules
        };
      });
    }, [setSchedulesMap, tableId]);

    const duplicateTable = useCallback(() => {
      setSchedulesMap((prev: Record<string, Schedule[]>) => {
        const currentSchedules = prev[tableId];
        if (!currentSchedules) return prev;
        
        const newTableId = `schedule-${Date.now()}`;
        return {
          ...prev,
          [newTableId]: [...currentSchedules]
        };
      });
    }, [setSchedulesMap, tableId]);

    const removeTable = useCallback(() => {
      setSchedulesMap((prev: Record<string, Schedule[]>) => {
        if (!(tableId in prev)) return prev;
        
        const copy = { ...prev };
        delete copy[tableId];
        return copy;
      });
    }, [setSchedulesMap, tableId]);

    return (
      <Stack key={tableId} width="600px">
        <Flex justifyContent="space-between" alignItems="center">
          <Heading as="h3" fontSize="lg">시간표 {index + 1}</Heading>
          <ButtonGroup size="sm" isAttached>
            <Button colorScheme="green" onClick={onOpenSearch}>시간표 추가</Button>
            <Button colorScheme="green" mx="1px" onClick={duplicateTable}>복제</Button>
            <Button colorScheme="green" isDisabled={disabledRemoveButton}
                    onClick={removeTable}>삭제</Button>
          </ButtonGroup>
        </Flex>
        <ScheduleTable
          tableId={tableId}
          onScheduleTimeClick={onScheduleTimeClick}
          onDeleteButtonClick={onDeleteButtonClick}
        />
      </Stack>
    );
  }, (prevProps, nextProps) => {
    // tableId, index, disabledRemoveButton만 비교
    // schedules는 ScheduleTable 내부에서 직접 구독하므로 여기서는 비교하지 않음
    return prevProps.tableId === nextProps.tableId && 
           prevProps.index === nextProps.index && 
           prevProps.disabledRemoveButton === nextProps.disabledRemoveButton;
  });

  return (
    <Flex w="full" gap={6} p={6} flexWrap="wrap">
      {tableKeys.map((tableId, index) => (
        <TableCard key={tableId} tableId={tableId} index={index} disabledRemoveButton={disabledRemoveButton} />
      ))}
    </Flex>
  );
}

export default React.memo(ScheduleTables);

