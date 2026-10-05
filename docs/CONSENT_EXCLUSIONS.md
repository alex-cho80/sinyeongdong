# 동의 조사제외 — 사용자 현장 확인, 2026-10-05

| 지번 | 사유 |
|---|---|
| 225-1 | 서울시 매입 부지 |
| 214-20 | 서울시 매입 부지 |
| 214-106 | 서울시 매입 부지 |
| 214-29 | 전기차 충전소 |

이 분류는 사용자가 제공한 현장 정보이며 API로 소유권을 검증했다는 의미가 아니다. 구역 편입과 동의 조사 가능 여부는 별도 관리한다.

두 이미지 지도와 개략도에 회색 `조사제외`로 표시하고 사유를 제공한다. 보류 상태와 구분하며, 해당 지번 또는 연결 지번에 속한 세대는 동의 조사 대상·상태별 집계·동의율에서 제외한다. 대장 원본 수량과 기존 동의·방문·소유자 확인 기록은 유지한다. 화면과 CSV에는 조사제외 사유를 표시하고 CSV의 보존된 동의 상태 열에 기존 상태를 유지한다.

API inventory summary의 `total`은 보존된 전체 목록, `consentTotal`은 제외 후 대상, `excludedUnits`는 제외된 목록 수량이다. 데이터베이스의 동의 상태를 수정하는 마이그레이션이나 요청은 없다.

검증: `node tests/consent-exclusions.mjs`, `node tests/unit-inventory.mjs`, `node tests/map-registration.mjs`, `node tests/pages-readonly.mjs`, TypeScript 및 양쪽 배포 빌드.
