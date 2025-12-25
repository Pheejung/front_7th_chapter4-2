import React, { createContext, PropsWithChildren, useContext, useReducer, useMemo, useCallback, useRef } from "react";
import { Schedule } from "./types.ts";
import dummyScheduleMap from "./dummyScheduleMap.ts";

interface ScheduleContextType {
  schedulesMap: Record<string, Schedule[]>;
  setSchedulesMap: React.Dispatch<React.SetStateAction<Record<string, Schedule[]>>>;
}

// setSchedulesMap만 필요할 때 사용하는 Context 분리
const ScheduleSetActionContext = createContext<React.Dispatch<React.SetStateAction<Record<string, Schedule[]>>> | undefined>(undefined);

export const useScheduleSetAction = () => {
  const context = useContext(ScheduleSetActionContext);
  if (context === undefined) {
    throw new Error('useScheduleSetAction must be used within a ScheduleProvider');
  }
  return context;
};

type ScheduleAction =
  | { type: 'SET_SCHEDULES_MAP'; updater: (prev: Record<string, Schedule[]>) => Record<string, Schedule[]> };

const scheduleReducer = (state: Record<string, Schedule[]>, action: ScheduleAction): Record<string, Schedule[]> => {
  switch (action.type) {
    case 'SET_SCHEDULES_MAP': {
      const newState = action.updater(state);
      // 참조가 같으면 이전 상태 반환 (리렌더링 방지)
      if (state === newState) return state;
      
      // 각 테이블의 배열 참조가 변경되지 않았으면 이전 참조 유지
      const stateKeys = Object.keys(state);
      const newStateKeys = Object.keys(newState);
      
      // 키가 변경되지 않았고, 각 배열 참조가 같은지 확인
      if (stateKeys.length === newStateKeys.length && 
          stateKeys.every(key => state[key] === newState[key])) {
        return state;
      }
      
      return newState;
    }
    default:
      return state;
  }
};

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export const useScheduleContext = () => {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
};

// 특정 테이블의 스케줄만 구독하는 hook
export const useScheduleTable = (tableId: string) => {
  const { schedulesMap } = useScheduleContext();
  return schedulesMap[tableId] || [];
};

// 테이블 키 목록만 구독하는 hook
// schedulesMap의 키 목록만 추적하여 불필요한 리렌더링 방지
export const useScheduleTableKeys = () => {
  const { schedulesMap } = useScheduleContext();
  const keysRef = useRef<string[]>([]);
  const keysStrRef = useRef<string>('');
  
  return useMemo(() => {
    const currentKeys = Object.keys(schedulesMap);
    const currentKeysStr = currentKeys.join(',');
    
    // 키 목록이 변경되지 않았으면 이전 배열 반환
    if (currentKeysStr === keysStrRef.current) {
      return keysRef.current;
    }
    
    // 키 목록이 변경되었으면 새 배열 반환
    keysRef.current = currentKeys;
    keysStrRef.current = currentKeysStr;
    return currentKeys;
  }, [schedulesMap]);
};

export const ScheduleProvider = ({ children }: PropsWithChildren) => {
  const [schedulesMap, dispatch] = useReducer(scheduleReducer, dummyScheduleMap);

  const setSchedulesMap: React.Dispatch<React.SetStateAction<Record<string, Schedule[]>>> = useCallback((updater) => {
    if (typeof updater === 'function') {
      dispatch({ type: 'SET_SCHEDULES_MAP', updater });
    } else {
      // 직접 객체를 설정하는 경우 (드물게 사용)
      dispatch({ type: 'SET_SCHEDULES_MAP', updater: () => updater });
    }
  }, []);

  // Context value를 메모이제이션하여 불필요한 리렌더링 방지
  const contextValue = useMemo(() => ({
    schedulesMap,
    setSchedulesMap,
  }), [schedulesMap, setSchedulesMap]);

  return (
    <ScheduleContext.Provider value={contextValue}>
      <ScheduleSetActionContext.Provider value={setSchedulesMap}>
        {children}
      </ScheduleSetActionContext.Provider>
    </ScheduleContext.Provider>
  );
};
