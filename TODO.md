# 작업 우선순위 (투두 리스트)

아래는 `.github/pull_request_template.md`의 체크리스트를 기준으로 우선순위화한 작업 목록입니다. 각 항목 옆에 간단한 확인 방법과 권장 명령을 적어두었습니다. 지금 이 파일에서 바로 진행 상황을 체크할 수 있습니다.

- [ ] 1. 개발 서버 실행 및 핵심 동작 확인 (우선)

  - 목적: UI와 주요 기능(검색, 드래그/드롭, 시간표 렌더링) 동작 확인
  - 실행: ```powershell
    pnpm install
    pnpm run dev

    ```

    ```

- [ ] 2. TypeScript 검사 및 콘솔 오류 확인

  - 목적: 타입/런타임 오류를 먼저 정리하면 최적화 작업이 쉬워집니다.
  - 실행: ```powershell
    pnpm tsc --noEmit
    pnpm run build

    ```

    ```

- [ ] 3. 배포 및 URL 제출 준비

  - 목적: 과제 요구사항(배포 URL 제출) 충족
  - 절차: `pnpm run build` → 정적 호스팅(예: Vercel/Netlify/GitHub Pages)

- [x] 4. API 호출 최적화 (Promise.all 적용 검토)

  - 목적: 여러 API 호출을 병렬화해 로드 시간 단축
  - 점검 위치: `ScheduleContext.tsx`, `utils.ts` 등 API 호출 부분
  - 완료: `SearchDialog.tsx`에서 `fetchAllLectures` 함수를 개선하여 중복 API 호출 제거 및 `Promise.all`을 올바르게 적용. 이제 `schedules-majors.json`과 `schedules-liberal-arts.json`을 각각 한 번씩 병렬 호출하여 데이터를 합침.
  - 추가: `lectureService.ts`에 API 호출 로직 분리 및 모듈 레벨 캐싱 구현, `useLectures` 훅으로 데이터 로딩 관리, `SearchDialog`에서 훅 사용으로 로직 분리.

- [x] 5. `SearchDialog` 불필요한 연산 최적화

  - 목적: 검색창에서 불필요한 계산(필터, 매칭)이 반복 실행되는지 확인
  - 기법: `useMemo`, `useCallback` 사용 검토
  - 완료: `SearchDialog.tsx`에서 `getFilteredLectures`, `allMajors`, `changeSearchOption`을 각각 `useMemo`와 `useCallback`으로 최적화하여 불필요한 재계산 방지.
  - 추가: `filterLectures` 함수를 `utils.ts`에 추가하여 여러 filter 체이닝을 단일 순회로 통합, `useFilteredLectures` 훅으로 필터링 결과 메모이제이션.

- [x] 6. `SearchDialog` 불필요한 리렌더링 최적화

  - 목적: 부모로부터 전달되는 props 변경으로 인한 잦은 리렌더링 방지
  - 기법: `React.memo`, props 구조 분리
  - 완료: `SearchDialog.tsx` 컴포넌트를 `React.memo`로 감싸서 props가 변경되지 않으면 리렌더링하지 않도록 최적화.

- [x] 7. 시간표 블록 드래그 시 렌더링 최적화

  - 목적: 드래그 중 전체 리렌더링을 줄여 성능 향상
  - 점검 위치: `ScheduleDndProvider.tsx`, DnD 설정
  - 기법: `useCallback`으로 핸들러 최적화
  - 완료: `ScheduleDndProvider.tsx`의 `handleDragEnd` 함수를 `useCallback`으로 감싸서 불필요한 리렌더링 방지.

- [x] 8. 시간표 블록 드롭 시 렌더링 최적화

  - 목적: 드롭 처리 후 필요한 부분만 업데이트
  - 기법: 상태 분리, 불변성 유지, 개별 블록 키 관리
  - 완료: `ScheduleTable.tsx`의 블록 key를 `lecture.id` 기반으로 개선하고, 컴포넌트를 `React.memo`로 감싸서 불필요한 리렌더링 방지.

- [x] 9. 과제 회고 문서 및 PR 템플릿 작성

  - 목적: PR 템플릿에 있는 회고/리뷰 요청 항목을 채워 제출 준비
  - 완료: `.github/pull_request_template.md`에 기술적 성장, 코드 품질, 학습 효과 분석, 과제 피드백, 리뷰 요청 내용을 작성.

- [ ] 10. 변경사항 커밋 / PR 생성
  - 권장 절차: 기능 단위 브랜치 → 커밋 → 원격 푸시 → PR 생성

간단한 안내:

-- 개발 서버(1번)부터 시작하시고, 에러 로그와 타입스크립트 결과(2번)를 먼저 공유해 주세요.

- 원하시면 제가 지금 터미널에서 1번과 2번을 실행해 결과(에러/경고 로그)를 가져오겠습니다.

자동배포 (GitHub Pages) 설정 안내:

- 생성된 워크플로우: `.github/workflows/deploy.yml`
  - 동작: `main` 브랜치에 푸시되면 `pnpm install` → `pnpm build` 후 `./dist` 폴더를 `gh-pages` 브랜치로 배포합니다.
  - 주의: Vite를 사용 중이므로 GitHub Pages에 리포지토리 경로가 포함된 URL로 배포하는 경우 `vite.config.ts`의 `base` 값을 리포 이름(예: `/front_7th_chapter4-2/`)으로 설정해야 합니다.

설정 확인 및 배포 흐름:

- 1. 로컬에서 먼저 `pnpm build` 실행해 `dist` 폴더가 정상 생성되는지 확인하세요.
- 2. `main` 브랜치에 푸시하면 워크플로우가 자동 실행되어 `gh-pages`에 배포됩니다.
- 3. GitHub 리포의 `Settings > Pages`에서 배포 브랜치(`gh-pages`)와 경로(`/`)가 올바른지 확인하세요.

원하시면 제가 추가로 도와드릴 수 있습니다:

- `vite.config.ts`의 `base` 자동 설정(원하시면 제가 파일을 업데이트)
- 워크플로우 정상 작동 확인을 위한 테스트 커밋 생성 및 푸시(사용자 승인 필요)
