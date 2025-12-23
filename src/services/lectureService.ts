import axios from "axios";
import { Lecture } from "../types.ts";

const API_BASE_URL = import.meta.env.DEV ? '' : '/front_7th_chapter4-2';

const fetchMajors = () => axios.get<Lecture[]>(`${API_BASE_URL}/schedules-majors.json`);
const fetchLiberalArts = () => axios.get<Lecture[]>(`${API_BASE_URL}/schedules-liberal-arts.json`);

let cachedLectures: Lecture[] | null = null;

export const fetchAllLectures = async (): Promise<Lecture[]> => {
  if (cachedLectures) {
    return cachedLectures;
  }

  const [majorsResponse, liberalArtsResponse] = await Promise.all([
    fetchMajors(),
    fetchLiberalArts(),
  ]);

  cachedLectures = [...majorsResponse.data, ...liberalArtsResponse.data];
  return cachedLectures;
};