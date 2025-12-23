import { useEffect, useState } from "react";
import { Lecture } from "../types.ts";
import { fetchAllLectures } from "../services/lectureService.ts";

export const useLectures = () => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLectures = async () => {
      try {
        const data = await fetchAllLectures();
        setLectures(data);
      } catch (err) {
        setError('Failed to load lectures');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadLectures();
  }, []);

  return { lectures, loading, error };
};