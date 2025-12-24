import { Lecture } from "../types.ts";

let cachedLectures: Lecture[] | null = null;

export const fetchAllLectures = async (): Promise<Lecture[]> => {
  if (cachedLectures) {
    return cachedLectures;
  }

  // Vite의 base URL을 사용하여 올바른 경로로 fetch
  // import.meta.env.BASE_URL은 vite.config.ts의 base 설정을 반영합니다
  const baseUrl = import.meta.env.BASE_URL;
  
  const startTime = performance.now();
  console.log('API 호출 시작: ', startTime);
  
  // Promise.all을 사용하여 두 JSON 파일을 병렬로 fetch
  const fetchPromises = [
    fetch(`${baseUrl}schedules-majors.json`).then(response => {
      console.log('API Call 1', performance.now());
      return response;
    }),
    fetch(`${baseUrl}schedules-liberal-arts.json`).then(response => {
      console.log('API Call 2', performance.now());
      return response;
    })
  ];
  
  const [majorsResponse, liberalArtsResponse] = await Promise.all(fetchPromises);
  
  console.log('API Call 3', performance.now());

  // 404 오류 체크
  if (!majorsResponse.ok) {
    throw new Error(`Failed to fetch schedules-majors.json: ${majorsResponse.status}`);
  }
  if (!liberalArtsResponse.ok) {
    throw new Error(`Failed to fetch schedules-liberal-arts.json: ${liberalArtsResponse.status}`);
  }

  const [majorsData, liberalArtsData] = await Promise.all([
    majorsResponse.json().then(data => {
      console.log('API Call 4', performance.now());
      return data as Lecture[];
    }),
    liberalArtsResponse.json().then(data => {
      console.log('API Call 5', performance.now());
      return data as Lecture[];
    })
  ]);

  console.log('API Call 6', performance.now());
  cachedLectures = [...majorsData, ...liberalArtsData];
  
  const endTime = performance.now();
  console.log('모든 API 호출 완료 ', endTime);
  console.log('API 호출에 걸린 시간(ms): ', endTime - startTime);
  
  return cachedLectures;
};