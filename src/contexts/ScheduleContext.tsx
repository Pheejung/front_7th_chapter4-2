import React, { createContext, PropsWithChildren, useContext, useMemo, useCallback } from "react";
import { Schedule } from "../types.ts";
import dummyScheduleMap from "../dummyScheduleMap.ts";

interface ScheduleContextType {
  schedulesMap: Record<string, Schedule[]>;
  setSchedulesMap: React.Dispatch<React.SetStateAction<Record<string, Schedule[]>>>;
}

// 외부 스토어를 사용하여 각 테이블별로 구독
class ScheduleStore {
  private schedulesMap: Record<string, Schedule[]> = {};
  private listeners = new Map<string, Set<() => void>>(); // tableId별 리스너
  private keysListeners = new Set<() => void>(); // 키 목록 변경 리스너
  private keysCache: string[] = [];
  private keysCacheStr: string = '';
  private schedulesCache = new Map<string, Schedule[]>(); // tableId별 스케줄 캐시
  private stateCache: Record<string, Schedule[]> | null = null; // 전체 상태 캐시

  getSchedules(tableId: string): Schedule[] {
    const currentSchedules = this.schedulesMap[tableId] || [];
    const cachedSchedules = this.schedulesCache.get(tableId);
    
    // 배열 참조가 같으면 캐시된 배열 반환
    if (cachedSchedules === currentSchedules) {
      return cachedSchedules;
    }
    
    // 배열 참조가 변경되었으면 캐시 업데이트
    this.schedulesCache.set(tableId, currentSchedules);
    return currentSchedules;
  }

  getKeys(): string[] {
    const currentKeys = Object.keys(this.schedulesMap);
    const currentKeysStr = currentKeys.join(',');
    
    // 키 목록이 변경되지 않았으면 캐시된 배열 반환
    if (currentKeysStr === this.keysCacheStr) {
      return this.keysCache;
    }
    
    // 키 목록이 변경되었으면 새 배열 반환 및 캐시 업데이트
    this.keysCache = currentKeys;
    this.keysCacheStr = currentKeysStr;
    return currentKeys;
  }

  // 현재 전체 상태를 반환 (참조 안정성을 위해 캐시 사용)
  getCurrentState(): Record<string, Schedule[]> {
    // 캐시가 있고 모든 키의 배열 참조가 같으면 캐시 반환
    if (this.stateCache) {
      const keys = this.getKeys();
      const cacheKeys = Object.keys(this.stateCache);
      if (keys.length === cacheKeys.length && 
          keys.every(key => cacheKeys.includes(key) && 
                          this.stateCache![key] === this.getSchedules(key))) {
        return this.stateCache;
      }
    }
    
    // 캐시가 없거나 변경되었으면 새로 생성
    const state: Record<string, Schedule[]> = {};
    const keys = this.getKeys();
    for (const key of keys) {
      state[key] = this.getSchedules(key);
    }
    this.stateCache = state;
    return state;
  }

  setSchedulesMap(schedulesMap: Record<string, Schedule[]>) {
    const prevSchedulesMap = this.schedulesMap;
    const prevKeys = Object.keys(prevSchedulesMap);
    const currentKeys = Object.keys(schedulesMap);
    const keysChanged = prevKeys.length !== currentKeys.length || 
                        !prevKeys.every(key => currentKeys.includes(key));
    
    this.schedulesMap = schedulesMap;
    
    // 상태가 변경되었으면 캐시 무효화
    this.stateCache = null;
    
    // 키 목록이 변경되었을 때 키 리스너 호출
    if (keysChanged) {
      this.keysListeners.forEach(listener => listener());
    }
    
    // 각 tableId별로 배열 참조가 변경되었는지 확인하고 리스너 호출
    const allTableIds = new Set([
      ...Object.keys(prevSchedulesMap),
      ...Object.keys(schedulesMap)
    ]);
    
    allTableIds.forEach(tableId => {
      const prevSchedules = prevSchedulesMap[tableId] || [];
      const currentSchedules = schedulesMap[tableId] || [];
      
      // 배열 참조가 변경되었을 때만 리스너 호출
      if (prevSchedules !== currentSchedules) {
        const listeners = this.listeners.get(tableId);
        if (listeners) {
          listeners.forEach(listener => listener());
        }
      }
    });
  }

  subscribe(tableId: string, listener: () => void) {
    if (!this.listeners.has(tableId)) {
      this.listeners.set(tableId, new Set());
    }
    this.listeners.get(tableId)!.add(listener);
    return () => {
      const listeners = this.listeners.get(tableId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(tableId);
        }
      }
    };
  }

  subscribeKeys(listener: () => void) {
    this.keysListeners.add(listener);
    return () => {
      this.keysListeners.delete(listener);
    };
  }
}

// dummyScheduleMap을 깊은 복사하여 참조를 고정
const createInitialSchedulesMap = () => {
  const initialMap: Record<string, Schedule[]> = {};
  for (const [key, schedules] of Object.entries(dummyScheduleMap)) {
    initialMap[key] = [...schedules];
  }
  return initialMap;
};

const scheduleStore = new ScheduleStore();
const initialSchedulesMap = createInitialSchedulesMap();
scheduleStore.setSchedulesMap(initialSchedulesMap);

// setSchedulesMap만 필요할 때 사용하는 Context 분리
const ScheduleSetActionContext = createContext<React.Dispatch<React.SetStateAction<Record<string, Schedule[]>>> | undefined>(undefined);

export const useScheduleSetAction = () => {
  const context = useContext(ScheduleSetActionContext);
  if (context === undefined) {
    throw new Error('useScheduleSetAction must be used within a ScheduleProvider');
  }
  return context;
};

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export const useScheduleContext = () => {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
};

// 스토어 Context (구독하지 않음)
export const ScheduleStoreContext = React.createContext<ScheduleStore>(scheduleStore);

// 특정 테이블의 스케줄만 구독하는 hook
// useSyncExternalStore를 사용하여 해당 tableId의 배열 참조만 추적
export const useScheduleTable = (tableId: string) => {
  const store = useContext(ScheduleStoreContext);
  
  return React.useSyncExternalStore(
    (onStoreChange) => store.subscribe(tableId, onStoreChange),
    () => store.getSchedules(tableId),
    () => store.getSchedules(tableId)
  );
};

// 테이블 키 목록만 구독하는 hook
export const useScheduleTableKeys = () => {
  const store = useContext(ScheduleStoreContext);
  
  return React.useSyncExternalStore(
    (onStoreChange) => store.subscribeKeys(onStoreChange),
    () => store.getKeys(),
    () => []
  );
};

export const ScheduleProvider = ({ children }: PropsWithChildren) => {
  // setSchedulesMap을 useCallback으로 메모이제이션
  // scheduleStore를 직접 업데이트하고, 변경된 테이블만 새 배열로 만들고, 다른 테이블은 이전 참조 유지
  const memoizedSetSchedulesMap = useCallback((updater: React.SetStateAction<Record<string, Schedule[]>>) => {
    // scheduleStore에서 현재 상태를 가져옴 (캐시된 참조 사용)
    const currentState = scheduleStore.getCurrentState();
    
    const newState = typeof updater === 'function' ? updater(currentState) : updater;
    
    // 참조가 같으면 이전 상태 반환 (리렌더링 방지)
    if (currentState === newState) {
      return;
    }
    
    // 변경된 테이블만 새 배열로 만들고, 다른 테이블은 이전 참조 유지
    const allKeys = new Set([...Object.keys(currentState), ...Object.keys(newState)]);
    let hasChanges = false;
    const optimizedState: Record<string, Schedule[]> = {};
    
    for (const key of allKeys) {
      const prevSchedules = currentState[key];
      const newSchedules = newState[key];
      
      // 키가 새 상태에 없으면 (삭제된 경우) 제외
      if (!(key in newState)) {
        hasChanges = true;
        continue;
      }
      
      // 배열 참조가 같으면 이전 참조 유지 (리렌더링 방지)
      if (prevSchedules === newSchedules) {
        optimizedState[key] = prevSchedules;
      } else {
        // 배열 참조가 다르면 새 참조 사용
        optimizedState[key] = newSchedules;
        hasChanges = true;
      }
    }
    
    // 실제로 변경이 있으면 스토어 업데이트
    if (hasChanges) {
      scheduleStore.setSchedulesMap(optimizedState);
    }
  }, []);

  // Context value를 메모이제이션하여 불필요한 리렌더링 방지
  // schedulesMap은 더 이상 필요하지 않으므로 제거
  const contextValue = useMemo(() => ({
    schedulesMap: initialSchedulesMap, // 더미 값 (실제로 사용되지 않음)
    setSchedulesMap: memoizedSetSchedulesMap,
  }), [memoizedSetSchedulesMap]);

  return (
    <ScheduleContext.Provider value={contextValue}>
      <ScheduleSetActionContext.Provider value={memoizedSetSchedulesMap}>
        <ScheduleStoreContext.Provider value={scheduleStore}>
          {children}
        </ScheduleStoreContext.Provider>
      </ScheduleSetActionContext.Provider>
    </ScheduleContext.Provider>
  );
};
