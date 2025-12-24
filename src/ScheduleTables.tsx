import { Button, ButtonGroup, Flex, Heading, Stack } from "@chakra-ui/react";
import ScheduleTable from "./ScheduleTable.tsx";
import { useScheduleContext } from "./ScheduleContext.tsx";
import SearchDialog from "./SearchDialog.tsx";
import React, { useCallback, useMemo, useRef, useState } from "react";

export const ScheduleTables = () => {
  const { schedulesMap, setSchedulesMap } = useScheduleContext();
  const [searchInfo, setSearchInfo] = useState<{
    tableId: string;
    day?: string;
    time?: number;
  } | null>(null);

  // tableEntries를 스마트하게 메모이제이션
  // schedulesMap의 키 목록과 각 배열의 참조를 추적하여 불필요한 재계산 방지
  const tableKeysRef = React.useRef<string[]>([]);
  const tableEntriesRef = React.useRef<[string, any[]][]>([]);
  
  const tableEntries = useMemo(() => {
    const currentKeys = Object.keys(schedulesMap);
    const currentKeysStr = currentKeys.join(',');
    const prevKeysStr = tableKeysRef.current.join(',');
    
    // 키 목록이 같고, 각 테이블의 배열 참조가 변경되지 않았으면 이전 배열 반환
    if (currentKeysStr === prevKeysStr) {
      const entriesUnchanged = currentKeys.every(key => {
        const prevEntry = tableEntriesRef.current.find(([k]) => k === key);
        return prevEntry && prevEntry[1] === schedulesMap[key];
      });
      
      if (entriesUnchanged) {
        return tableEntriesRef.current;
      }
    }
    
    // 변경이 있으면 새 배열 생성
    const newEntries = Object.entries(schedulesMap);
    tableKeysRef.current = currentKeys;
    tableEntriesRef.current = newEntries;
    return newEntries;
  }, [schedulesMap]);

  // disabledRemoveButton을 schedulesMap의 키 개수만 추적하도록 최적화
  const tableCountRef = React.useRef(0);
  const disabledRemoveButtonRef = React.useRef(false);
  
  const disabledRemoveButton = useMemo(() => {
    const currentCount = Object.keys(schedulesMap).length;
    if (tableCountRef.current !== currentCount) {
      tableCountRef.current = currentCount;
      disabledRemoveButtonRef.current = currentCount === 1;
    }
    return disabledRemoveButtonRef.current;
  }, [schedulesMap]);

  const handleCloseSearchDialog = useCallback(() => setSearchInfo(null), []);

  // TableCard: 각 테이블 블록을 독립된 컴포넌트로 분리하여
  // 테이블별 콜백을 useCallback으로 고정시킵니다.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TableCard = React.memo(function TableCard({ tableId, schedules, index, disabledRemoveButton }: { tableId: string; schedules: any[]; index: number; disabledRemoveButton: boolean }) {
    const onOpenSearch = useCallback(() => setSearchInfo({ tableId }), [tableId]);
    const onScheduleTimeClick = useCallback((timeInfo: { day: string; time: number }) => setSearchInfo({ tableId, ...timeInfo }), [tableId]);
    const onDeleteButtonClick = useCallback(({ day, time }: { day: string; time: number }) => {
      setSchedulesMap(prev => ({
        ...prev,
        [tableId]: prev[tableId].filter(schedule => schedule.day !== day || !schedule.range.includes(time))
      }))
    }, [setSchedulesMap, tableId]);

    const duplicateTable = useCallback(() => {
      setSchedulesMap(prev => ({
        ...prev,
        [`schedule-${Date.now()}`]: [...prev[tableId]]
      }))
    }, [setSchedulesMap, tableId]);

    const removeTable = useCallback(() => {
      setSchedulesMap(prev => {
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
    // 더 엄격한 비교: schedules 배열의 참조가 같으면 true 반환 (리렌더링 방지)
    return prevProps.tableId === nextProps.tableId && 
           prevProps.schedules === nextProps.schedules && 
           prevProps.index === nextProps.index && 
           prevProps.disabledRemoveButton === nextProps.disabledRemoveButton;
  });

  return (
    <>
      <Flex w="full" gap={6} p={6} flexWrap="wrap">
        {tableEntries.map(([tableId, schedules], index) => (
          <TableCard key={tableId} tableId={tableId} schedules={schedules} index={index} disabledRemoveButton={disabledRemoveButton} />
        ))}
      </Flex>
      {/* SearchDialog는 searchInfo가 변경될 때만 리렌더링됨 */}
      <SearchDialog searchInfo={searchInfo} onClose={handleCloseSearchDialog} />
    </>
  );
}

export default React.memo(ScheduleTables);
