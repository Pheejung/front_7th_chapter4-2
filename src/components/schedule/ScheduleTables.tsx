import { Button, ButtonGroup, Flex, Heading, Stack } from "@chakra-ui/react";
import ScheduleTable from "./ScheduleTable.tsx";
import { useScheduleSetAction, useScheduleTableKeys, useScheduleTable } from "../../contexts/ScheduleContext.tsx";
import SearchDialog from "../search/SearchDialog.tsx";
import React, { useCallback, useMemo, useState } from "react";
import { Schedule } from "../../types.ts";

export const ScheduleTables = () => {
  const tableKeys = useScheduleTableKeys();
  const [searchInfo, setSearchInfo] = useState<{
    tableId: string;
    day?: string;
    time?: number;
  } | null>(null);

  // disabledRemoveButton을 테이블 키 개수만 추적하도록 최적화
  const disabledRemoveButton = useMemo(() => {
    return tableKeys.length === 1;
  }, [tableKeys.length]);

  const handleCloseSearchDialog = useCallback(() => setSearchInfo(null), []);

  // TableCard: 각 테이블 블록을 독립된 컴포넌트로 분리하여
  // 각 테이블이 자신의 스케줄만 구독하도록 함
  const TableCard = React.memo(function TableCard({ tableId, index, disabledRemoveButton }: { tableId: string; index: number; disabledRemoveButton: boolean }) {
    // 각 테이블이 자신의 스케줄만 구독
    const schedules = useScheduleTable(tableId);
    const setSchedulesMap = useScheduleSetAction();
    
    const onOpenSearch = useCallback(() => setSearchInfo({ tableId }), [tableId]);
    const onScheduleTimeClick = useCallback((timeInfo: { day: string; time: number }) => setSearchInfo({ tableId, ...timeInfo }), [tableId]);
    const onDeleteButtonClick = useCallback(({ day, time }: { day: string; time: number }) => {
      setSchedulesMap((prev: Record<string, Schedule[]>) => ({
        ...prev,
        [tableId]: prev[tableId].filter((schedule: Schedule) => schedule.day !== day || !schedule.range.includes(time))
      }))
    }, [setSchedulesMap, tableId]);

    const duplicateTable = useCallback(() => {
      setSchedulesMap((prev: Record<string, Schedule[]>) => ({
        ...prev,
        [`schedule-${Date.now()}`]: [...prev[tableId]]
      }))
    }, [setSchedulesMap, tableId]);

    const removeTable = useCallback(() => {
      setSchedulesMap((prev: Record<string, Schedule[]>) => {
        const copy = { ...prev };
        delete copy[tableId];
        return copy;
      })
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
          schedules={schedules}
          tableId={tableId}
          onScheduleTimeClick={onScheduleTimeClick}
          onDeleteButtonClick={onDeleteButtonClick}
        />
      </Stack>
    );
  }, (prevProps, nextProps) => {
    // tableId, index, disabledRemoveButton만 비교
    // schedules는 TableCard 내부에서 구독하므로 여기서는 비교하지 않음
    return prevProps.tableId === nextProps.tableId && 
           prevProps.index === nextProps.index && 
           prevProps.disabledRemoveButton === nextProps.disabledRemoveButton;
  });

  return (
    <>
      <Flex w="full" gap={6} p={6} flexWrap="wrap">
        {tableKeys.map((tableId, index) => (
          <TableCard key={tableId} tableId={tableId} index={index} disabledRemoveButton={disabledRemoveButton} />
        ))}
      </Flex>
      {/* SearchDialog는 searchInfo가 변경될 때만 리렌더링됨 */}
      <SearchDialog searchInfo={searchInfo} onClose={handleCloseSearchDialog} />
    </>
  );
}

export default React.memo(ScheduleTables);

