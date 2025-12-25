import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

interface SearchInfo {
  tableId: string;
  day?: string;
  time?: number;
}

// setSearchInfo만 필요할 때 사용하는 Context 분리
const SearchDialogSetActionContext = createContext<((info: SearchInfo | null) => void) | undefined>(undefined);

export const useSearchDialogSetAction = () => {
  const context = useContext(SearchDialogSetActionContext);
  if (context === undefined) {
    throw new Error('useSearchDialogSetAction must be used within a SearchDialogProvider');
  }
  return context;
};

// searchInfo만 구독하는 hook
const SearchInfoContext = createContext<SearchInfo | null>(null);

export const useSearchInfo = () => {
  return useContext(SearchInfoContext);
};

// 전체 Context (하위 호환성을 위해 유지)
interface SearchDialogContextType {
  searchInfo: SearchInfo | null;
  setSearchInfo: (info: SearchInfo | null) => void;
}

const SearchDialogContext = createContext<SearchDialogContextType | undefined>(undefined);

export const useSearchDialog = () => {
  const context = useContext(SearchDialogContext);
  if (context === undefined) {
    throw new Error('useSearchDialog must be used within a SearchDialogProvider');
  }
  return context;
};

export const SearchDialogProvider = ({ children }: React.PropsWithChildren) => {
  const [searchInfo, setSearchInfo] = useState<SearchInfo | null>(null);

  const handleSetSearchInfo = useCallback((info: SearchInfo | null) => {
    setSearchInfo(info);
  }, []);

  // setSearchInfo만 필요할 때 사용하는 Context value
  const setActionValue = useMemo(() => handleSetSearchInfo, [handleSetSearchInfo]);

  // 전체 Context value (하위 호환성)
  const fullValue = useMemo(() => ({
    searchInfo,
    setSearchInfo: handleSetSearchInfo,
  }), [searchInfo, handleSetSearchInfo]);

  return (
    <SearchDialogContext.Provider value={fullValue}>
      <SearchDialogSetActionContext.Provider value={setActionValue}>
        <SearchInfoContext.Provider value={searchInfo}>
          {children}
        </SearchInfoContext.Provider>
      </SearchDialogSetActionContext.Provider>
    </SearchDialogContext.Provider>
  );
};

