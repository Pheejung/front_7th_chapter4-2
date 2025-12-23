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
  return useMemo(() => filterLectures(lectures, searchOptions), [lectures, searchOptions]);
};