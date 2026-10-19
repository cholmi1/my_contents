# Personal Hub (로컬 테스트 버전)

한 사람이 PC와 Android 브라우저에서 쓰는 개인 관리 사이트의 **로컬 테스트 버전**입니다.
서버, 로그인, 회사 시스템, 외부 인증, 자동 동기화 없이 브라우저 안에서만 동작합니다.

> 이 폴더의 데이터는 모두 **테스트용 가상 데이터**입니다. 실제 회사 정보, 비밀번호,
> API 키, 토큰, 계좌번호, 카드번호를 입력하지 마세요.

## 지금 할 수 있는 일

| 메뉴 | 내용 |
| --- | --- |
| 홈 | 오늘 일정, 체크리스트, 빠른 메모, 바로가기를 한 화면에서 확인 |
| 생활·반복 관리 | 반복 업무 추가·수정·삭제, 회차별 완료 체크, 오늘 알림 |
| 메모·할 일 | 메모/할 일 추가·수정·삭제, 완료 처리, 검색·필터 |
| 앱·SNS | 앱과 SNS 채널 관리, CSV 미리보기 후 선택 가져오기 |
| 가계부 | 계좌·잔액 스냅샷, 수입/지출/이체 거래, 월 합계, 금액 숨기기 |
| 설정·백업 | 허브/가계부 JSON을 각각 내보내기·가져오기, 샘플 추가, 초기화 |

### 의도적으로 넣지 않은 것

- Google Calendar 실제 연동: 홈에 **“아직 연결되지 않음”** 상태만 표시합니다.
- 은행/카드 자동 연동, 금융 CSV 가져오기, 카드 결제 정산, 노후 계산: 없습니다.
- 서버 저장, 로그인, 외부 인증, 푸시 알림, 자동 클라우드 동기화: 없습니다.
- 회사 관련 앱을 자동으로 가져오지 않습니다. CSV에서 회사 관련 행은 기본 선택 해제됩니다.

## 실행 방법

### 준비물

- Node.js 20 이상 (이 프로젝트는 Node `v24.20.0`, npm `11.19.0`에서 확인)
- 최신 Chrome/Edge/Samsung Internet 등 일반 브라우저

### PC에서 실행

```powershell
cd C:\Users\chkang\personal-hub
npm install
npm run dev
```

브라우저에서 `http://localhost:5173`을 엽니다.

### Android 브라우저에서 접속

같은 Wi-Fi에 있는 PC에서 아래처럼 실행합니다.

```powershell
npm run dev -- --host 0.0.0.0
```

명령 출력에 나오는 `Network` 주소(예: `http://192.168.0.10:5173`)를 Android 브라우저에
입력합니다. Windows 방화벽이 막으면 같은 네트워크에 한해 허용이 필요할 수 있습니다.

> 개발 서버 주소는 PC마다 다를 수 있습니다. 데이터는 **그 브라우저의 그 주소**에만
> 저장되므로, PC와 Android는 서로 자동으로 공유되지 않습니다. 기기를 바꾸거나
> 브라우저를 바꾸면 설정에서 JSON 백업을 내보내고 가져와야 합니다.

### 빌드 결과를 로컬에서 확인

```powershell
npm run build
npm run preview
```

`dist` 폴더가 생성됩니다. 이 버전은 자동 배포를 하지 않습니다.

## 데이터가 저장되는 곳

- 허브(홈·반복·메모·앱·SNS): `localStorage`의 `personal-hub.hub.v1`
- 가계부: `localStorage`의 `personal-hub.ledger.v1`
- 두 영역은 저장소와 백업 파일이 **분리**되어 있습니다.
- JSON 백업에는 `app: "personal-hub"`, `kind: "hub" | "ledger"`, `schemaVersion: 1`이 들어갑니다.

브라우저의 사이트 데이터를 지우거나 시크릿 모드를 닫으면 저장 내용이 사라질 수 있습니다.
중요한 내용은 설정 화면에서 주기적으로 JSON으로 내보내 두세요.

## CSV 가져오기

1. `앱·SNS` 화면에서 `CSV 가져오기`를 누릅니다.
2. `public/samples/apps-import-sample.csv` 또는 `sns-import-sample.csv`로 동작을 확인할 수 있습니다.
3. 파일을 고르면 헤더 매핑, 미리보기, 오류, 중복 후보, 회사 관련 후보가 표시됩니다.
4. **선택한 행만** 가져옵니다. 오류가 있는 행은 선택할 수 없습니다.
5. 회사 관련 행, 중복 후보, 잘못된 URL(`http`/`https`가 아닌 주소)은 기본 선택되지 않습니다.

CSV 파일 자체와 원본 북마크는 수정하지 않습니다. 가져온 문자열은 HTML로 해석하지 않습니다.

## 테스트

```powershell
npm test          # 단위 테스트 (Vitest)
npm run test:e2e  # 브라우저 E2E 테스트 (Playwright)
npm run typecheck # TypeScript 검사
npm run build     # 타입 검사 + 프로덕션 빌드
```

E2E를 처음 실행하는 환경에서는 Chromium이 필요할 수 있습니다.

```powershell
npx playwright install chromium
```

자세한 확인 범위와 결과는 [TESTING.md](TESTING.md)를 참고하세요.

## 폴더 구조

```text
src/
  components/   공통 UI (레이아웃, 모달, 입력, 배지 등)
  data/         테스트용 가상 데이터와 CSV 샘플
  hooks/        localStorage 저장, 해시 라우팅, 오늘 날짜
  lib/          날짜, 반복 회차, 가계부 계산, CSV, 백업, 유효성 검사
  pages/        홈·반복·메모·앱/SNS·가계부·설정 화면
  types/        허브/가계부 데이터 타입
public/samples/ CSV 가져오기 예시
e2e/            Playwright 브라우저 테스트
```

## 알려진 한계

- 실제 Android 기기, Safari, Firefox, 화면 낭독기에서의 수동 검증은 아직 하지 않았습니다.
- 기기 간 자동 동기화가 없습니다. 백업 파일을 직접 옮겨야 합니다.
- Google Calendar는 표시만 되고 실제 일정을 읽지 않습니다.
- 반복 업무 알림은 사이트를 열었을 때 화면 안에서만 표시됩니다.
- 대량의 실제 CSV(예: 후보 141개)는 제공되지 않았으므로 작은 가상 샘플로만 검증했습니다.
- 실제 회사 데이터나 민감정보를 넣지 마세요.
