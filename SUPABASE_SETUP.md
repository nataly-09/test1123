# Supabase 연동 방법

이 사이트는 기본적으로 브라우저 localStorage를 사용합니다. 아래 단계대로 설정하면 기록을 Supabase에 저장합니다.

## 1. 테이블 만들기

1. Supabase에서 새 프로젝트를 만듭니다.
2. 왼쪽 메뉴의 **SQL Editor**를 엽니다.
3. `supabase-setup.sql`의 전체 내용을 붙여 넣고 실행합니다.
4. **Table Editor**에서 `students`와 `typing_records` 테이블을 확인합니다.

## 2. API 값 확인하기

Supabase Dashboard에서 다음 메뉴로 이동합니다.

- **Project Settings**
- **API**
- 또는 **Data API**

다음 두 값을 복사합니다.

- Project URL
- anon/public key 또는 publishable key

예:

```js
window.SUPABASE_CONFIG = {
  url: "https://abc123.supabase.co",
  anonKey: "eyJ..."
};
```

## 3. 연동 파일 수정하기

`supabase-config.js`의 두 값을 실제 값으로 바꿉니다.

절대 다음 키는 사용하거나 공개하지 마세요.

- `service_role key`
- 데이터베이스 비밀번호
- 개인 액세스 토큰

## 4. 로컬에서 확인하기

```powershell
cd D:\copliotstudy\test1123
py -m http.server 4173
```

브라우저에서 `http://localhost:4173`을 엽니다.

## 5. 동작 확인

1. 학번과 비밀번호 4자리로 로그인합니다.
2. 한글·영어 기록을 저장합니다.
3. Supabase의 `typing_records` 테이블에서 저장된 날짜와 점수를 확인합니다.
4. 기록 목록의 수정 버튼으로 기존 날짜의 기록을 변경합니다.

같은 학번과 같은 날짜에는 기록이 하나만 저장됩니다.

## 테이블 구조

| 테이블 | 주요 컬럼 |
|---|---|
| `students` | `student_id`, `password_hash`, `created_at` |
| `typing_records` | `student_id`, `korean_score`, `english_score`, `recorded_at`, `created_at` |

## 보안 주의

현재 SQL은 연동 테스트를 위한 데모 정책입니다. 공개 사이트로 운영하면 익명 사용자가 다른 학번의 기록을 조회하거나 수정할 수 있습니다.

실제 운영에서는 다음을 권장합니다.

- Supabase Auth 사용
- 비밀번호 검증과 기록 CRUD를 하는 Edge Function 사용
- 서버에서만 `service_role key` 사용
