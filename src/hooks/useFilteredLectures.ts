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
  // searchOptions의 개별 필드를 의존성으로 사용하여
  // searchOptions 객체의 참조가 변경되어도 실제 값이 같으면 재계산하지 않음
  const { query, credits, grades, days, times, majors } = searchOptions;
  
  return useMemo(() => {
    return filterLectures(lectures, searchOptions);
  }, [lectures, query, credits, grades, days, times, majors]);
};