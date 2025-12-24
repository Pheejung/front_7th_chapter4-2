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
import { useScheduleContext } from "./ScheduleContext.tsx";
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

const PAGE_SIZE = 100;

// TODO: 이 컴포넌트에서 불필요한 연산이 발생하지 않도록 다양한 방식으로 시도해주세요.
const SearchDialog = ({ searchInfo, onClose }: Props) => {
  const { setSchedulesMap } = useScheduleContext();
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
  const lastPage = useMemo(() => Math.ceil(filteredLectures.length / PAGE_SIZE), [filteredLectures.length]);
  const visibleLectures = useMemo(() => filteredLectures.slice(0, page * PAGE_SIZE), [filteredLectures, page]);
  const allMajors = useMemo(() => [...new Set(lectures.map(lecture => lecture.major))], [lectures]);
  
  // sortedTimes를 메모이제이션하여 매번 정렬하지 않도록
  const sortedTimes = useMemo(() => [...searchOptions.times].sort((a, b) => a - b), [searchOptions.times]);

  const changeSearchOption = useCallback((field: keyof SearchOption, value: SearchOption[typeof field]) => {
    setPage(1);
    setSearchOptions(prev => ({ ...prev, [field]: value }));
    loaderWrapperRef.current?.scrollTo(0, 0);
  }, []);

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

  // IntersectionObserver를 모달이 열려있을 때만 작동하도록 수정
  // useRef를 사용하여 최신 page와 lastPage 값을 참조
  const pageRef = useRef(page);
  const lastPageRef = useRef(lastPage);
  
  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  
  useEffect(() => {
    lastPageRef.current = lastPage;
  }, [lastPage]);

  useEffect(() => {
    const $loader = loaderRef.current;
    const $loaderWrapper = loaderWrapperRef.current;

    if (!$loader || !$loaderWrapper || !searchInfo) {
      return;
    }

    let observer: IntersectionObserver | null = null;

    // setTimeout을 사용하여 DOM 요소가 렌더링된 후 observer 초기화
    const timeoutId = setTimeout(() => {
      observer = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting) {
            setPage(prevPage => Math.min(lastPageRef.current, prevPage + 1));
          }
        },
        { threshold: 0, root: $loaderWrapper }
      );

      observer.observe($loader);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (observer) {
        observer.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInfo?.tableId]); // searchInfo의 tableId만 추적하여 모달이 열릴 때만 재설정

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
              <FormControl>
                <FormLabel>검색어</FormLabel>
                <Input
                  placeholder="과목명 또는 과목코드"
                  value={searchOptions.query}
                  onChange={(e) => changeSearchOption('query', e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>학점</FormLabel>
                <Select
                  value={searchOptions.credits}
                  onChange={(e) => changeSearchOption('credits', e.target.value)}
                >
                  <option value="">전체</option>
                  <option value="1">1학점</option>
                  <option value="2">2학점</option>
                  <option value="3">3학점</option>
                </Select>
              </FormControl>
            </HStack>

            <HStack spacing={4}>
              <FormControl>
                <FormLabel>학년</FormLabel>
                <CheckboxGroup
                  value={searchOptions.grades}
                  onChange={(value) => changeSearchOption('grades', value.map(Number))}
                >
                  <HStack spacing={4}>
                    {[1, 2, 3, 4].map(grade => (
                      <Checkbox key={grade} value={grade}>{grade}학년</Checkbox>
                    ))}
                  </HStack>
                </CheckboxGroup>
              </FormControl>

              <FormControl>
                <FormLabel>요일</FormLabel>
                <CheckboxGroup
                  value={searchOptions.days}
                  onChange={(value) => changeSearchOption('days', value as string[])}
                >
                  <HStack spacing={4}>
                    {DAY_LABELS.map(day => (
                      <Checkbox key={day} value={day}>{day}</Checkbox>
                    ))}
                  </HStack>
                </CheckboxGroup>
              </FormControl>
            </HStack>

            <HStack spacing={4}>
              <FormControl>
                <FormLabel>시간</FormLabel>
                <CheckboxGroup
                  colorScheme="green"
                  value={searchOptions.times}
                  onChange={(values) => changeSearchOption('times', values.map(Number))}
                >
                  <Wrap spacing={1} mb={2}>
                    {sortedTimes.map(time => (
                      <Tag key={time} size="sm" variant="outline" colorScheme="blue">
                        <TagLabel>{time}교시</TagLabel>
                        <TagCloseButton
                          onClick={() => changeSearchOption('times', searchOptions.times.filter(v => v !== time))}/>
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

              <FormControl>
                <FormLabel>전공</FormLabel>
                <CheckboxGroup
                  colorScheme="green"
                  value={searchOptions.majors}
                  onChange={(values) => changeSearchOption('majors', values as string[])}
                >
                  <Wrap spacing={1} mb={2}>
                    {searchOptions.majors.map(major => (
                      <Tag key={major} size="sm" variant="outline" colorScheme="blue">
                        <TagLabel>{major.split("<p>").pop()}</TagLabel>
                        <TagCloseButton
                          onClick={() => changeSearchOption('majors', searchOptions.majors.filter(v => v !== major))}/>
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
            </HStack>
            <Text align="right">
              검색결과: {filteredLectures.length}개
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

              <Box overflowY="auto" maxH="500px" ref={loaderWrapperRef}>
                <Table size="sm" variant="striped">
                  <Tbody>
                    {visibleLectures.map((lecture, index) => (
                      <Tr key={`${lecture.id}-${index}`}>
                        <Td width="100px">{lecture.id}</Td>
                        <Td width="50px">{lecture.grade}</Td>
                        <Td width="200px">{lecture.title}</Td>
                        <Td width="50px">{lecture.credits}</Td>
                        <Td width="150px" dangerouslySetInnerHTML={{ __html: lecture.major }}/>
                        <Td width="150px" dangerouslySetInnerHTML={{ __html: lecture.schedule || '' }}/>
                        <Td width="80px">
                          <Button size="sm" colorScheme="green" onClick={() => addSchedule(lecture)}>추가</Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                <Box ref={loaderRef} h="20px"/>
              </Box>
            </Box>
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