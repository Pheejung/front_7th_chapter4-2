import { useMemo } from "react";
import { Lecture } from "../types.ts";
import { filterLectures } from "../utils.ts";

interface SearchOption {
  query?: string,
  grades: number[],
  days: string[],
  times: number[],
  majors: string[],
  credits?: number,
}

export const useFilteredLectures = (lectures: Lecture[], searchOptions: SearchOption) => {
  // searchOptions 객체 전체를 의존성으로 사용
  // setSearchOptions(prev => ({ ...prev, [field]: value }))는 새 객체를 생성하므로
  // searchOptions의 참조가 변경되어 useMemo가 재계산됨
  return useMemo(() => {
    return filterLectures(lectures, searchOptions);
  }, [lectures, searchOptions]);
};