# ReactFormAutoGenerate

백엔드(.NET 9)의 데이터 모델로부터 프론트엔드(React + Refine + RJSF) UI를 자동으로 생성하는 풀스택 프로젝트입니다.

## 🚀 주요 기능 (Key Features)

- **동적 UI 생성 (Auto UI Generation)**: .NET 9의 `JsonSchemaExporter`를 사용하여 C# 엔티티 모델을 JSON Schema로 변환하고, 이를 기반으로 프론트엔드 폼을 코딩 없이 자동 생성합니다.
- **범용 관리 컴포넌트 (`AutoManager`)**: 리소스 이름과 스키마 키만 인자로 넘기면 목록 조회, 생성, 수정을 모두 처리하는 재사용 가능한 CRUD 인터페이스를 제공합니다.
- **Refine + RJSF 통합**: 데이터 오케스트레이션(Refine)과 강력한 폼 렌더링(React JSON Schema Form)의 결합으로 생산성을 극대화했습니다.
- **자동 데이터베이스 초기화**: PostgreSQL 컨테이너 실행 시 데이터베이스 생성, 스키마 적용, 시드 데이터 주입이 자동으로 수행됩니다.
- **지능형 필드 매칭**: 백엔드(PascalCase)와 프론트엔드(camelCase) 간의 필드명 차이를 자동으로 극복하며, Identity 필드(Id)를 모드에 따라 지능적으로 노출/숨김 처리합니다.

## 🛠 기술 스택 (Tech Stack)

### Backend
- **Framework**: .NET 9
- **ORM**: Entity Framework Core 9.0
- **Database**: PostgreSQL
- **Key Feature**: `System.Text.Json.Schema` (JsonSchemaExporter)

### Frontend
- **Library**: React 19
- **Framework**: [Refine](https://refine.dev/) (Enterprise-grade CRUD framework)
- **Form**: [React JSON Schema Form (RJSF)](https://rjsf-team.github.io/react-jsonschema-form/)
- **UI Kit**: Material UI (MUI) v6
- **Build Tool**: Vite

## ⚙️ 실행 방법 (Getting Started)

### 1. 데이터베이스 설정 (Database Setup)
루트 디렉토리에 포함된 `docker-compose.yml`을 사용하여 PostgreSQL을 실행합니다.
```bash
docker-compose up -d
```

### 2. 백엔드 실행 (Backend)
`ReactFormAutoGenerate.Server` 프로젝트를 실행합니다.
- **Visual Studio**: `ReactFormAutoGenerate.Server`를 시작 프로젝트로 설정 후 **F5**.
- **CLI**: 
  ```bash
  cd ReactFormAutoGenerate.Server
  dotnet run
  ```
> **참고**: 앱 시작 시 `DatabaseInitializer`가 실행되어 `reactform_db` 데이터베이스와 필요한 테이블을 자동으로 생성합니다.

### 3. 프론트엔드 실행 (Frontend)
백엔드 실행 시 `SpaProxy`에 의해 자동으로 실행되지만, 수동으로 실행하려면:
```bash
cd ReactFormAutoGenerate.Client
npm install
npm run dev
```

## 📖 아키텍처 구조 (Architecture)

1.  **Model Definition**: C#에서 `[Required]`, `[MaxLength]` 등의 어노테이션과 함께 엔티티 정의.
2.  **Schema Export**: `SchemaController`를 통해 엔티티의 JSON Schema를 API 엔드포인트로 노출.
3.  **Generic CRUD**: 프론트엔드의 `AutoManager` 컴포넌트가 해당 스키마를 읽어 테이블 컬럼과 입력 폼을 동적으로 구성.
4.  **Data Sync**: Refine의 `useForm`과 직접 `fetch`를 혼합하여 실시간 데이터 동기화 및 안정적인 목록 표시.

---
이 프로젝트는 데이터 모델 중심 개발(Model-Driven Development) 환경에서 개발 생산성을 높이는 모범 사례를 제시합니다.
