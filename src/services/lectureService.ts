import axios from "axios";
import { Lecture } from "../types.ts";

const fetchMajors = () => axios.get<Lecture[]>('/schedules-majors.json');
const fetchLiberalArts = () => axios.get<Lecture[]>('/schedules-liberal-arts.json');

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