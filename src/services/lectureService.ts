import { Lecture } from "../types.ts";

let cachedLectures: Lecture[] | null = null;

export const fetchAllLectures = async (): Promise<Lecture[]> => {
  if (cachedLectures) {
    return cachedLectures;
  }

  // Vite의 base URL을 사용하여 올바른 경로로 fetch
  // import.meta.env.BASE_URL은 vite.config.ts의 base 설정을 반영합니다
  const baseUrl = import.meta.env.BASE_URL;
  
  // Promise.all을 사용하여 두 JSON 파일을 병렬로 fetch
  const [majorsResponse, liberalArtsResponse] = await Promise.all([
    fetch(`${baseUrl}schedules-majors.json`),
    fetch(`${baseUrl}schedules-liberal-arts.json`)
  ]);

  // 404 오류 체크
  if (!majorsResponse.ok) {
    throw new Error(`Failed to fetch schedules-majors.json: ${majorsResponse.status}`);
  }
  if (!liberalArtsResponse.ok) {
    throw new Error(`Failed to fetch schedules-liberal-arts.json: ${liberalArtsResponse.status}`);
  }

  const [majorsData, liberalArtsData] = await Promise.all([
    majorsResponse.json() as Promise<Lecture[]>,
    liberalArtsResponse.json() as Promise<Lecture[]>
  ]);

  cachedLectures = [...majorsData, ...liberalArtsData];
  return cachedLectures;
};