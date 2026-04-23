# ReactFormAutoGenerate

[English](#english) | [한국어](#한국어)

---

<a name="english"></a>
## English

A full-stack project that automatically generates Frontend (React + Refine + RJSF) UI directly from Backend (.NET 9) data models.

### 🚀 Key Features

- **Auto UI Generation**: Utilizes .NET 9 `JsonSchemaExporter` to convert C# entity models into JSON Schema, enabling automatic form generation without manual coding.
- **Modern Data Fetching**: Powered by **TanStack React Query** and **Axios** for efficient caching, automatic revalidation, and robust API communication.
- **Dynamic Schema Filtering**: Automatically detects and filters out complex EF navigation properties (objects/arrays) from the UI while preserving essential foreign key relations.
- **Generic Management Component (`AutoManager`)**: A reusable CRUD dashboard that handles list views, creation, and editing by simply passing resource names.
- **Intelligent Relational Support**: Automatically renders foreign keys as searchable ComboBoxes (Select) in forms and displays human-readable labels in list views.
- **Automated Database Initialization**: Automatic database creation, schema application, and data seeding upon running the PostgreSQL container.

### 🛠 Tech Stack

#### Backend
- **Framework**: .NET 9
- **ORM**: Entity Framework Core 9.0
- **Database**: PostgreSQL
- **Key Feature**: `System.Text.Json.Schema` (JsonSchemaExporter)

#### Frontend
- **Library**: React 19
- **Data Fetching**: TanStack React Query v5, Axios
- **Framework**: [Refine](https://refine.dev/) (Enterprise-grade CRUD framework)
- **Form**: [React JSON Schema Form (RJSF)](https://rjsf-team.github.io/react-jsonschema-form/)
- **UI Kit**: Material UI (MUI) v6
- **Build Tool**: Vite

### ⚙️ Getting Started

#### 1. Database Setup
Run PostgreSQL using the provided `docker-compose.yml` in the root directory.
```bash
docker-compose up -d
```

#### 2. Running the Backend
Execute the `ReactFormAutoGenerate.Server` project.
- **Visual Studio**: Set `ReactFormAutoGenerate.Server` as the startup project and press **F5**.
- **CLI**: 
  ```bash
  cd ReactFormAutoGenerate.Server
  dotnet run
  ```

#### 3. Running the Frontend
```bash
cd ReactFormAutoGenerate.Client
npm install
npm run dev
```

---

<a name="한국어"></a>
## 한국어

백엔드(.NET 9)의 데이터 모델로부터 프론트엔드(React + Refine + RJSF) UI를 자동으로 생성하는 풀스택 프로젝트입니다.

### 🚀 주요 기능

- **동적 UI 생성 (Auto UI Generation)**: .NET 9의 `JsonSchemaExporter`를 사용하여 C# 엔티티 모델을 JSON Schema로 변환하고, 이를 기반으로 프론트엔드 폼을 코딩 없이 자동 생성합니다.
- **현대적인 데이터 페칭**: **TanStack React Query**와 **Axios**를 도입하여 효율적인 캐싱, 자동 데이터 갱신 및 안정적인 API 통신을 구현했습니다.
- **동적 스키마 필터링**: UI 렌더링 시 복잡한 EF 내비게이션 속성(객체/배열)을 자동으로 감지하여 제외하고, 필수적인 외래 키 관계만 지능적으로 유지합니다.
- **범용 관리 컴포넌트 (`AutoManager`)**: 리소스 이름만 넘기면 목록 조회, 생성, 수정을 모두 처리하는 재사용 가능한 CRUD 인터페이스를 제공합니다.
- **지능형 관계 지원**: 폼에서는 외래 키를 콤보박스(Select)로 자동 변환하고, 리스트에서는 ID 대신 실제 이름(Label)을 표시합니다.
- **자동 데이터베이스 초기화**: PostgreSQL 컨테이너 실행 시 데이터베이스 생성, 스키마 적용, 시드 데이터 주입이 자동으로 수행됩니다.

### 🛠 기술 스택

#### Backend
- **Framework**: .NET 9
- **ORM**: Entity Framework Core 9.0
- **Database**: PostgreSQL
- **Key Feature**: `System.Text.Json.Schema` (JsonSchemaExporter)

#### Frontend
- **Library**: React 19
- **Data Fetching**: TanStack React Query, Axios
- **Framework**: [Refine](https://refine.dev/) (Enterprise-grade CRUD framework)
- **Form**: [React JSON Schema Form (RJSF)](https://rjsf-team.github.io/react-jsonschema-form/)
- **UI Kit**: Material UI (MUI) v6
- **Build Tool**: Vite

### ⚙️ 실행 방법

#### 1. 데이터베이스 설정
루트 디렉토리에 포함된 `docker-compose.yml`을 사용하여 PostgreSQL을 실행합니다.
```bash
docker-compose up -d
```

#### 2. 백엔드 실행
`ReactFormAutoGenerate.Server` 프로젝트를 실행합니다.
- **Visual Studio**: `ReactFormAutoGenerate.Server`를 시작 프로젝트로 설정 후 **F5**.
- **CLI**: 
  ```bash
  cd ReactFormAutoGenerate.Server
  dotnet run
  ```

#### 3. 프론트엔드 실행
```bash
cd ReactFormAutoGenerate.Client
npm install
npm run dev
```
