import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Table,
  Tag,
  TagCloseButton,
  TagLabel,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  Wrap,
} from "@chakra-ui/react";
import { useScheduleSetAction } from "./ScheduleContext.tsx";
import { Lecture } from "./types.ts";
import { parseSchedule } from "./utils.ts";
import { DAY_LABELS } from "./constants.ts";
import { useLectures } from "./hooks/useLectures.ts";
import { useFilteredLectures } from "./hooks/useFilteredLectures.ts";

interface Props {
  searchInfo: {
    tableId: string;
    day?: string;
    time?: number;
  } | null;
  onClose: () => void;
}

interface SearchOption {
  query?: string,
  grades: number[],
  days: string[],
  times: number[],
  majors: string[],
  credits?: number,
}

const TIME_SLOTS = [
  { id: 1, label: "09:00~09:30" },
  { id: 2, label: "09:30~10:00" },
  { id: 3, label: "10:00~10:30" },
  { id: 4, label: "10:30~11:00" },
  { id: 5, label: "11:00~11:30" },
  { id: 6, label: "11:30~12:00" },
  { id: 7, label: "12:00~12:30" },
  { id: 8, label: "12:30~13:00" },
  { id: 9, label: "13:00~13:30" },
  { id: 10, label: "13:30~14:00" },
  { id: 11, label: "14:00~14:30" },
  { id: 12, label: "14:30~15:00" },
  { id: 13, label: "15:00~15:30" },
  { id: 14, label: "15:30~16:00" },
  { id: 15, label: "16:00~16:30" },
  { id: 16, label: "16:30~17:00" },
  { id: 17, label: "17:00~17:30" },
  { id: 18, label: "17:30~18:00" },
  { id: 19, label: "18:00~18:50" },
  { id: 20, label: "18:55~19:45" },
  { id: 21, label: "19:50~20:40" },
  { id: 22, label: "20:45~21:35" },
  { id: 23, label: "21:40~22:30" },
  { id: 24, label: "22:35~23:25" },
];

const INITIAL_PAGE_SIZE = 100; // 초기 렌더링 크기
const PAGE_SIZE_INCREMENT = 40; // 스크롤 시 추가로 로드할 크기

// 검색 필터 컴포넌트들을 분리하여 각각 메모이제이션
const QueryInput = React.memo(({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  return (
    <FormControl>
      <FormLabel>검색어</FormLabel>
      <Input
        placeholder="과목명 또는 과목코드"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormControl>
  );
}, (prevProps, nextProps) => prevProps.value === nextProps.value && prevProps.onChange === nextProps.onChange);
QueryInput.displayName = 'QueryInput';

const CreditsSelect = React.memo(({ value, onChange }: { value?: number; onChange: (value: string) => void }) => {
  return (
    <FormControl>
      <FormLabel>학점</FormLabel>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">전체</option>
        <option value="1">1학점</option>
        <option value="2">2학점</option>
        <option value="3">3학점</option>
      </Select>
    </FormControl>
  );
}, (prevProps, nextProps) => prevProps.value === nextProps.value && prevProps.onChange === nextProps.onChange);
CreditsSelect.displayName = 'CreditsSelect';

const GradesCheckboxGroup = React.memo(({ value, onChange }: { value: number[]; onChange: (value: number[]) => void }) => {
  return (
    <FormControl>
      <FormLabel>학년</FormLabel>
      <CheckboxGroup value={value} onChange={(values) => onChange(values.map(Number))}>
        <HStack spacing={4}>
          {[1, 2, 3, 4].map(grade => (
            <Checkbox key={grade} value={grade}>{grade}학년</Checkbox>
          ))}
        </HStack>
      </CheckboxGroup>
    </FormControl>
  );
}, (prevProps, nextProps) => {
  if (prevProps.value.length !== nextProps.value.length) return false;
  return prevProps.value.every((v, i) => v === nextProps.value[i]) && 
         prevProps.onChange === nextProps.onChange;
});
GradesCheckboxGroup.displayName = 'GradesCheckboxGroup';

const DaysCheckboxGroup = React.memo(({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) => {
  return (
    <FormControl>
      <FormLabel>요일</FormLabel>
      <CheckboxGroup value={value} onChange={(values) => onChange(values as string[])}>
        <HStack spacing={4}>
          {DAY_LABELS.map(day => (
            <Checkbox key={day} value={day}>{day}</Checkbox>
          ))}
        </HStack>
      </CheckboxGroup>
    </FormControl>
  );
}, (prevProps, nextProps) => {
  if (prevProps.value.length !== nextProps.value.length) return false;
  return prevProps.value.every((v, i) => v === nextProps.value[i]) && 
         prevProps.onChange === nextProps.onChange;
});
DaysCheckboxGroup.displayName = 'DaysCheckboxGroup';

const TimesCheckboxGroup = React.memo(({ value, sortedTimes, onChange, onRemoveTime }: { 
  value: number[]; 
  sortedTimes: number[];
  onChange: (value: number[]) => void;
  onRemoveTime: (time: number) => void;
}) => {
  return (
    <FormControl>
      <FormLabel>시간</FormLabel>
      <CheckboxGroup colorScheme="green" value={value} onChange={(values) => onChange(values.map(Number))}>
        <Wrap spacing={1} mb={2}>
          {sortedTimes.map(time => (
            <Tag key={time} size="sm" variant="outline" colorScheme="blue">
              <TagLabel>{time}교시</TagLabel>
              <TagCloseButton onClick={() => onRemoveTime(time)}/>
            </Tag>
          ))}
        </Wrap>
        <Stack spacing={2} overflowY="auto" h="100px" border="1px solid" borderColor="gray.200"
               borderRadius={5} p={2}>
          {TIME_SLOTS.map(({ id, label }) => (
            <Box key={id}>
              <Checkbox key={id} size="sm" value={id}>
                {id}교시({label})
              </Checkbox>
            </Box>
          ))}
        </Stack>
      </CheckboxGroup>
    </FormControl>
  );
}, (prevProps, nextProps) => {
  if (prevProps.value.length !== nextProps.value.length) return false;
  if (prevProps.sortedTimes.length !== nextProps.sortedTimes.length) return false;
  return prevProps.value.every((v, i) => v === nextProps.value[i]) &&
         prevProps.sortedTimes.every((v, i) => v === nextProps.sortedTimes[i]) &&
         prevProps.onChange === nextProps.onChange &&
         prevProps.onRemoveTime === nextProps.onRemoveTime;
});
TimesCheckboxGroup.displayName = 'TimesCheckboxGroup';

const MajorsCheckboxGroup = React.memo(({ value, allMajors, onChange, onRemoveMajor }: { 
  value: string[]; 
  allMajors: string[];
  onChange: (value: string[]) => void;
  onRemoveMajor: (major: string) => void;
}) => {
  return (
    <FormControl>
      <FormLabel>전공</FormLabel>
      <CheckboxGroup colorScheme="green" value={value} onChange={(values) => onChange(values as string[])}>
        <Wrap spacing={1} mb={2}>
          {value.map(major => (
            <Tag key={major} size="sm" variant="outline" colorScheme="blue">
              <TagLabel>{major.split("<p>").pop()}</TagLabel>
              <TagCloseButton onClick={() => onRemoveMajor(major)}/>
            </Tag>
          ))}
        </Wrap>
        <Stack spacing={2} overflowY="auto" h="100px" border="1px solid" borderColor="gray.200"
               borderRadius={5} p={2}>
          {allMajors.map(major => (
            <Box key={major}>
              <Checkbox key={major} size="sm" value={major}>
                {major.replace(/<p>/gi, ' ')}
              </Checkbox>
            </Box>
          ))}
        </Stack>
      </CheckboxGroup>
    </FormControl>
  );
}, (prevProps, nextProps) => {
  if (prevProps.value.length !== nextProps.value.length) return false;
  if (prevProps.allMajors.length !== nextProps.allMajors.length) return false;
  return prevProps.value.every((v, i) => v === nextProps.value[i]) &&
         prevProps.allMajors.every((v, i) => v === nextProps.allMajors[i]) &&
         prevProps.onChange === nextProps.onChange &&
         prevProps.onRemoveMajor === nextProps.onRemoveMajor;
});
MajorsCheckboxGroup.displayName = 'MajorsCheckboxGroup';

// 테이블 행 컴포넌트를 분리하여 메모이제이션
// dangerouslySetInnerHTML을 useMemo로 최적화
const LectureRow = React.memo(({ lecture, onAddSchedule }: { lecture: Lecture; onAddSchedule: (lecture: Lecture) => void }) => {
  const handleAdd = useCallback(() => {
    onAddSchedule(lecture);
  }, [lecture, onAddSchedule]);

  // HTML 콘텐츠를 메모이제이션하여 불필요한 재생성 방지
  const majorHtml = React.useMemo(() => ({ __html: lecture.major }), [lecture.major]);
  const scheduleHtml = React.useMemo(() => ({ __html: lecture.schedule || '' }), [lecture.schedule]);

  return (
    <Tr style={{ 
      contain: 'layout style paint',
      willChange: 'transform',
      backfaceVisibility: 'hidden'
    }}>
      <Td width="100px">{lecture.id}</Td>
      <Td width="50px">{lecture.grade}</Td>
      <Td width="200px">{lecture.title}</Td>
      <Td width="50px">{lecture.credits}</Td>
      <Td width="150px" dangerouslySetInnerHTML={majorHtml}/>
      <Td width="150px" dangerouslySetInnerHTML={scheduleHtml}/>
      <Td width="80px">
        <Button size="sm" colorScheme="green" onClick={handleAdd}>추가</Button>
      </Td>
    </Tr>
  );
}, (prevProps, nextProps) => {
  // lecture 객체의 참조가 같으면 리렌더링 방지
  return prevProps.lecture === nextProps.lecture && 
         prevProps.onAddSchedule === nextProps.onAddSchedule;
});
LectureRow.displayName = 'LectureRow';

// 검색 결과 테이블 컴포넌트 분리
const ResultsTable = React.memo(({ 
  visibleLectures, 
  filteredCount,
  onAddSchedule,
  loaderWrapperRef,
  loaderRef,
  onLoadMore,
  hasMore
}: { 
  visibleLectures: Array<{ lecture: Lecture; index: number }>;
  filteredCount: number;
  onAddSchedule: (lecture: Lecture) => void;
  loaderWrapperRef: React.RefObject<HTMLDivElement | null>;
  loaderRef: React.RefObject<HTMLDivElement | null>;
  onLoadMore: () => void;
  hasMore: boolean;
}) => {
  // IntersectionObserver를 ResultsTable 내부로 이동
  // 성능 최적화를 위해 requestIdleCallback과 requestAnimationFrame 조합 사용
  const loadingRef = React.useRef(false);
  const scheduledRef = React.useRef(false);
  
  React.useEffect(() => {
    // 더 로드할 항목이 없으면 observer 설정하지 않음
    if (!hasMore) {
      return;
    }

    const $loader = loaderRef.current;
    const $loaderWrapper = loaderWrapperRef.current;

    if (!$loader || !$loaderWrapper) {
      return;
    }

    let observer: IntersectionObserver | null = null;
    let rafId: number | null = null;
    let idleId: number | null = null;

    // observer를 즉시 설정 (timeout 제거)
    observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingRef.current && !scheduledRef.current) {
          scheduledRef.current = true;
          
          // requestIdleCallback을 사용하여 브라우저가 idle 상태일 때 로드
          const scheduleLoad = () => {
            if (typeof requestIdleCallback !== 'undefined') {
              idleId = requestIdleCallback(() => {
                if (!loadingRef.current) {
                  loadingRef.current = true;
                  onLoadMore();
                  setTimeout(() => {
                    loadingRef.current = false;
                    scheduledRef.current = false;
                  }, 300);
                }
              }, { timeout: 100 });
            } else {
              // requestIdleCallback이 없으면 requestAnimationFrame 사용
              rafId = requestAnimationFrame(() => {
                if (!loadingRef.current) {
                  loadingRef.current = true;
                  onLoadMore();
                  setTimeout(() => {
                    loadingRef.current = false;
                    scheduledRef.current = false;
                  }, 300);
                }
              });
            }
          };

          // React 18의 startTransition 사용 (있으면)
          if (typeof (React as any).startTransition === 'function') {
            (React as any).startTransition(scheduleLoad);
          } else {
            scheduleLoad();
          }
        }
      },
      { 
        threshold: 0, 
        root: $loaderWrapper, 
        // 90개 정도 보였을 때 로드하도록 rootMargin 조정
        // 행 높이를 약 40px로 추정하면, 10개 행 = 400px 정도
        // 하지만 너무 크면 조기 로드되므로 200px로 조정
        rootMargin: '200px' 
      }
    );

    observer.observe($loader);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (idleId !== null && typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(idleId);
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, [loaderRef, loaderWrapperRef, onLoadMore, hasMore]);

  return (
    <>
      <Text align="right">
        검색결과: {filteredCount}개
      </Text>
      <Box>
        <Table>
          <Thead>
            <Tr>
              <Th width="100px">과목코드</Th>
              <Th width="50px">학년</Th>
              <Th width="200px">과목명</Th>
              <Th width="50px">학점</Th>
              <Th width="150px">전공</Th>
              <Th width="150px">시간</Th>
              <Th width="80px"></Th>
            </Tr>
          </Thead>
        </Table>

        <Box 
          overflowY="auto" 
          maxH="500px" 
          ref={loaderWrapperRef}
          style={{ 
            willChange: 'scroll-position',
            contain: 'layout style paint',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <Table size="sm" variant="striped" style={{ 
            tableLayout: 'fixed',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
          }}>
            <Tbody>
              {visibleLectures.map(({ lecture, index }) => (
                <LectureRow 
                  key={`${lecture.id}-${index}`} 
                  lecture={lecture} 
                  onAddSchedule={onAddSchedule}
                />
              ))}
            </Tbody>
          </Table>
          {hasMore && <Box ref={loaderRef} h="50px" minH="50px"/>}
        </Box>
      </Box>
    </>
  );
}, (prevProps, nextProps) => {
  // visibleLectures 배열의 길이와 참조 비교
  if (prevProps.visibleLectures.length !== nextProps.visibleLectures.length) return false;
  if (prevProps.filteredCount !== nextProps.filteredCount) return false;
  if (prevProps.hasMore !== nextProps.hasMore) return false;
  
  // 각 lecture의 참조 비교
  const lecturesChanged = prevProps.visibleLectures.some((item, index) => 
    item.lecture !== nextProps.visibleLectures[index]?.lecture
  );
  if (lecturesChanged) return false;
  
  return prevProps.onAddSchedule === nextProps.onAddSchedule &&
         prevProps.onLoadMore === nextProps.onLoadMore;
});
ResultsTable.displayName = 'ResultsTable';

// TODO: 이 컴포넌트에서 불필요한 연산이 발생하지 않도록 다양한 방식으로 시도해주세요.
const SearchDialog = ({ searchInfo, onClose }: Props) => {
  // setSchedulesMap만 필요하므로 useScheduleSetAction 사용하여 불필요한 리렌더링 방지
  const setSchedulesMap = useScheduleSetAction();
  const { lectures } = useLectures();

  const loaderWrapperRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [searchOptions, setSearchOptions] = useState<SearchOption>({
    query: '',
    grades: [],
    days: [],
    times: [],
    majors: [],
  });

  const filteredLectures = useFilteredLectures(lectures, searchOptions);
  
  // 점진적 로드를 위한 visibleCount 계산
  // 초기 100개, 이후 100개씩 추가
  // filteredLectures.length를 초과하지 않도록 보장
  const visibleCount = useMemo(() => {
    let count: number;
    if (page === 1) {
      count = INITIAL_PAGE_SIZE; // 100개
    } else {
      count = INITIAL_PAGE_SIZE + (page - 1) * PAGE_SIZE_INCREMENT; // 100 + (page-1) * 100
    }
    // filteredLectures.length를 초과하지 않도록 제한
    return Math.min(count, filteredLectures.length);
  }, [page, filteredLectures.length]);
  
  // 더 로드할 항목이 있는지 확인
  const hasMore = useMemo(() => {
    return visibleCount < filteredLectures.length;
  }, [visibleCount, filteredLectures.length]);
  
  const visibleLectures = useMemo(() => 
    filteredLectures.slice(0, visibleCount).map((lecture, index) => ({
      lecture,
      index,
    })), 
    [filteredLectures, visibleCount]
  );
  
  // allMajors를 메모이제이션하여 lectures가 변경되지 않으면 재계산하지 않음
  const allMajors = useMemo(() => {
    const majorsSet = new Set<string>();
    for (const lecture of lectures) {
      majorsSet.add(lecture.major);
    }
    return Array.from(majorsSet);
  }, [lectures]);
  
  // sortedTimes를 메모이제이션하여 매번 정렬하지 않도록
  // 배열의 참조가 같으면 이전 결과 반환
  const sortedTimes = useMemo(() => {
    if (searchOptions.times.length === 0) return [];
    return [...searchOptions.times].sort((a, b) => a - b);
  }, [searchOptions.times]);

  const changeSearchOption = useCallback((field: keyof SearchOption, value: SearchOption[typeof field]) => {
    setPage(1);
    setSearchOptions(prev => ({ ...prev, [field]: value }));
    loaderWrapperRef.current?.scrollTo(0, 0);
  }, []);

  // 각 필터별 콜백을 메모이제이션하여 불필요한 리렌더링 방지
  const handleQueryChange = useCallback((value: string) => changeSearchOption('query', value), [changeSearchOption]);
  const handleCreditsChange = useCallback((value: string) => changeSearchOption('credits', value ? Number(value) : undefined), [changeSearchOption]);
  const handleGradesChange = useCallback((value: number[]) => changeSearchOption('grades', value), [changeSearchOption]);
  const handleDaysChange = useCallback((value: string[]) => changeSearchOption('days', value), [changeSearchOption]);
  const handleTimesChange = useCallback((value: number[]) => changeSearchOption('times', value), [changeSearchOption]);
  const handleTimesRemove = useCallback((time: number) => changeSearchOption('times', searchOptions.times.filter(v => v !== time)), [changeSearchOption, searchOptions.times]);
  const handleMajorsChange = useCallback((value: string[]) => changeSearchOption('majors', value), [changeSearchOption]);
  const handleMajorsRemove = useCallback((major: string) => changeSearchOption('majors', searchOptions.majors.filter(v => v !== major)), [changeSearchOption, searchOptions.majors]);

  const addSchedule = useCallback((lecture: Lecture) => {
    if (!searchInfo) return;

    const { tableId } = searchInfo;

    const schedules = lecture.schedule ? parseSchedule(lecture.schedule).map(schedule => ({
      ...schedule,
      lecture
    })) : [];

    setSchedulesMap(prev => ({
      ...prev,
      [tableId]: [...prev[tableId], ...schedules]
    }));

    onClose();
  }, [searchInfo, setSchedulesMap, onClose]);

  // 무한 스크롤을 위한 로드 더보기 핸들러
  // React 18의 startTransition 사용하여 우선순위 낮춤
  const handleLoadMore = useCallback(() => {
    if (!hasMore) return;
    
    const loadMore = () => {
      setPage(prevPage => {
        // hasMore가 true일 때만 페이지 증가
        // visibleCount가 filteredLectures.length를 초과하지 않도록 보장됨
        return prevPage + 1;
      });
    };
    
    if (typeof (React as any).startTransition === 'function') {
      (React as any).startTransition(loadMore);
    } else {
      // requestIdleCallback을 사용하여 브라우저가 idle 상태일 때 로드
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(loadMore, { timeout: 100 });
      } else {
        requestAnimationFrame(loadMore);
      }
    }
  }, [hasMore]);

  // searchInfo가 변경될 때만 검색 옵션 업데이트
  useEffect(() => {
    if (!searchInfo) return;
    
    setSearchOptions(prev => {
      const newDays = searchInfo.day ? [searchInfo.day] : [];
      const newTimes = searchInfo.time ? [searchInfo.time] : [];
      
      // 실제로 변경이 없으면 이전 상태 유지
      if (prev.days.length === newDays.length && 
          prev.days.every((d, i) => d === newDays[i]) &&
          prev.times.length === newTimes.length &&
          prev.times.every((t, i) => t === newTimes[i])) {
        return prev;
      }
      
      return {
        ...prev,
        days: newDays,
        times: newTimes,
      };
    });
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInfo?.day, searchInfo?.time]);

  return (
    <Modal isOpen={Boolean(searchInfo)} onClose={onClose} size="6xl">
      <ModalOverlay/>
      <ModalContent maxW="90vw" w="1000px">
        <ModalHeader>수업 검색</ModalHeader>
        <ModalCloseButton/>
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <HStack spacing={4}>
              <QueryInput value={searchOptions.query || ''} onChange={handleQueryChange} />
              <CreditsSelect value={searchOptions.credits} onChange={handleCreditsChange} />
            </HStack>

            <HStack spacing={4}>
              <GradesCheckboxGroup value={searchOptions.grades} onChange={handleGradesChange} />
              <DaysCheckboxGroup value={searchOptions.days} onChange={handleDaysChange} />
            </HStack>

            <HStack spacing={4}>
              <TimesCheckboxGroup 
                  value={searchOptions.times}
                sortedTimes={sortedTimes}
                onChange={handleTimesChange}
                onRemoveTime={handleTimesRemove}
              />
              <MajorsCheckboxGroup 
                  value={searchOptions.majors}
                allMajors={allMajors}
                onChange={handleMajorsChange}
                onRemoveMajor={handleMajorsRemove}
              />
            </HStack>
            <ResultsTable
              visibleLectures={visibleLectures}
              filteredCount={filteredLectures.length}
              onAddSchedule={addSchedule}
              loaderWrapperRef={loaderWrapperRef}
              loaderRef={loaderRef}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
            />
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

// props 비교 함수를 추가하여 불필요한 리렌더링 방지
export default React.memo(SearchDialog, (prevProps, nextProps) => {
  // searchInfo가 null이면 같다고 간주
  if (!prevProps.searchInfo && !nextProps.searchInfo) {
    return prevProps.onClose === nextProps.onClose;
  }
  
  // 둘 중 하나만 null이면 다름
  if (!prevProps.searchInfo || !nextProps.searchInfo) {
    return false;
  }
  
  // searchInfo의 속성들을 비교
  return prevProps.searchInfo.tableId === nextProps.searchInfo.tableId &&
         prevProps.searchInfo.day === nextProps.searchInfo.day &&
         prevProps.searchInfo.time === nextProps.searchInfo.time &&
         prevProps.onClose === nextProps.onClose;
});