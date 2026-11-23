# 타자 기록표

학번과 4자리 비밀번호로 학생별 한글·영어 타자 기록을 저장하고 날짜별 성장 그래프를 보여주는 정적 웹사이트입니다.

## 로컬 실행

```powershell
cd D:\copliotstudy\test1123
py -m http.server 4173
```

브라우저에서 `http://localhost:4173`을 엽니다.

현재는 브라우저의 localStorage에 저장됩니다. 학번과 비밀번호는 브라우저별로 저장되며 GitHub Pages에서도 데모로 사용할 수 있습니다.

## Supabase 연동

자세한 절차는 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)를 참고하세요.

1. Supabase 프로젝트의 SQL Editor에서 `supabase-schema.sql`을 실행합니다.
2. Supabase 프로젝트 설정의 API에서 Project URL과 anon/public key를 확인합니다.
3. `supabase-config.js`의 `url`과 `anonKey`에 값을 입력합니다.
4. SQL의 테이블을 기준으로 적절한 RLS 정책을 적용합니다.
