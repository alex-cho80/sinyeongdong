# 신영동 주거환경개선구역 조사 대시보드

종로구 신영동 214번지 일대의 건축물·주소 정보를 조회하고 세대별 동의 / 비동의 / 보류 / 미조사 상태를 관리하는 대시보드입니다.

## 운영 사이트

https://sinyeong-neighborhood.regal-deer-9246.chatgpt.site

운영 사이트는 승인된 사용자만 접근하는 비공개 Sites입니다. 이 저장소는 소스 코드이며 운영 데이터베이스와 인증키를 포함하지 않습니다. GitHub에 커밋하는 것만으로 운영 사이트가 자동 배포되지는 않습니다.

## 조사 범위와 집계 기준

- 사용자가 제공한 빨간 경계선 안에서 식별되는 지번은 포함으로 반영합니다. 지번 자체가 불확실한 7곳만 검토 중으로 둡니다.
- 지도에서 판독한 124개 지번은 조사 후보입니다. 지번 수는 주택 수나 가구 수가 아닙니다.
- 북서쪽 일부 후보는 구기동(법정동코드 1111018200), 나머지는 신영동(1111018600)으로 조회합니다.
- 판독 재검토가 필요한 7개 후보는 주요 건축물 집계에서 제외합니다.
- 건축물대장 관리번호로 중복을 제거하고 부속 건축물을 제외합니다.
- 건축물대장 세대수(hhldCnt)와 가구수(fmlyCnt)는 각각 표시하며 합산하지 않습니다. 실제 거주 가구 수 및 동의 대상자 수는 별도 확인이 필요합니다.
- 공백뿐인 대장 건물명은 주소 API 명칭으로 보완합니다. 공식 명칭이 없는 건물은 명칭 미기재로 표시합니다.
- 동의 조사 기록은 실제로 확인한 동·호 또는 조사 단위로 등록합니다. 대장 숫자만으로 가상 세대를 생성하지 않습니다.

## 기능

- 구역도와 지번 목록, 건물 유형·건물명·주소 확인
- 주소정보 API 및 건축물대장 API 조회와 결과 캐시
- 세대별 의견 등록, 수정 충돌 방지, 변경 이력
- 조사 상태·경계 검토 상태별 필터 및 CSV 내보내기
- API 오류와 조회 결과 없음 구분, 성공한 이전 조회 결과 보존

## 기술 구성

Vinext / React / TypeScript / Tailwind CSS, Cloudflare Worker, D1, Drizzle ORM.

| 경로 | 역할 |
| --- | --- |
| app/page.tsx | 대시보드 화면 |
| app/api/lookup/route.ts | 서버 측 주소·건축물대장 조회 |
| app/api/survey/route.ts | 지번 조사 및 조회 캐시 |
| app/api/households/route.ts | 세대 의견 저장 |
| lib/candidates.ts | 지도에서 판독한 후보 지번과 법정동 |
| lib/address-links.json | 제공된 주소 연계 자료 중 해당 법정동 자료 |
| lib/housing.ts | 명칭 정리, 건물 중복 제거, 유형·집계 |
| db/schema.ts | 조사·세대·이력·조회 테이블 |
| drizzle/ | 데이터베이스 마이그레이션 |
| public/plan-updated.png | 사용자 제공 빨간 경계선 구역도 |
| public/plan.jpg | 원본 토지이용계획도 |

## 실행

Node.js 22.13 이상과 package.json에 지정된 pnpm을 사용합니다.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm exec tsc --noEmit
```

첫 로컬 데이터베이스에 마이그레이션을 적용합니다. 이미 적용한 마이그레이션은 다시 실행하지 않습니다.

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_ordinary_swarm.sql
pnpm dev
```

운영 환경에서는 JUSO_API_KEY와 BUILDING_API_KEY를 서버 비밀값으로 설정합니다. .env.example에는 변수명만 제공합니다. 실제 키, 로컬 데이터베이스, 운영 조사 데이터는 커밋하지 않습니다. 로컬 Worker 환경의 비밀값 주입은 실행 환경에 맞게 설정해야 합니다.

인증은 비공개 Sites의 접근 정책에 의존합니다. 다른 호스팅 환경에서 운영할 경우 데이터 조회·수정 API에 서버 측 인증과 접근 제어를 구성한 후 공개해야 합니다.

실행 프로필 및 런타임의 자세한 설명은 [docs/runtime.md](docs/runtime.md)를 참조하세요.

## 데이터 출처

- 사용자 제공 토지이용계획도 및 빨간 경계선 구역도
- 사용자 제공 지번·도로명주소 연계 TXT
- 행정안전부 도로명주소 검색 API
- 국토교통부 건축물대장정보 서비스

API 조회 결과는 운영 D1에 저장됩니다. 이 저장소를 새로 복제하면 운영 조회 캐시나 의견 기록이 자동으로 복제되지 않습니다.
