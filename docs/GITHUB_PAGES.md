# GitHub Pages 공개 조회 화면

GitHub Pages는 조회 전용 정적 화면이며, 기존 Sites의 공개 조회 API에서 최신 자료를 가져옵니다. 동의·방문 기록과 관리자 수정은 기존 Sites의 데이터베이스를 계속 사용합니다. API 키나 동의 데이터 사본은 정적 빌드에 포함하지 않습니다.

1. 저장소 Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 선택합니다.
2. Actions → **Deploy GitHub Pages** → Run workflow에서 main을 실행합니다. 이후 main 변경 시 자동 배포됩니다.
3. 공개 주소: https://alex-cho80.github.io/sinyeongdong/

로컬 검증: `pnpm build:pages`, `node tests/pages-readonly.mjs`.

`github-pages/` 진입점과 `vite.pages.config.ts`는 기존 대시보드 화면을 재사용합니다. `lib/client-runtime.ts`가 Pages 자산 경로와 조회 전용 API 경로를 선택합니다. 관리자는 Pages의 **관리자 화면** 링크를 통해 기존 사이트로 이동해 로그인·수정합니다. 최신 현황을 보려면 페이지를 새로고침합니다. 기존 서버가 중단되면 조회도 중단되며 과거 사본으로 대체하지 않습니다.
