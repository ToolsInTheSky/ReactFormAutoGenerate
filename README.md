# ReactFormAutoGenerate

[English](#english) | [한국어](#한국어)

---

<a name="english"></a>
## English

A full-stack project that automatically generates Frontend (React + Refine + RJSF) UI directly from Backend (.NET 9) data models.

### 🚀 Key Features

- **Auto UI Generation**: Utilizes .NET 9 `JsonSchemaExporter` to convert C# entity models into JSON Schema, enabling automatic form generation without manual coding.
- **Generic Management Component (`AutoManager`)**: A reusable CRUD interface that handles list views, creation, and editing by simply passing the resource name and schema key.
- **Refine + RJSF Integration**: Combines powerful data orchestration (Refine) with flexible form rendering (React JSON Schema Form) for maximum productivity.
- **Automated Database Initialization**: Automatic database creation, schema application, and data seeding upon running the PostgreSQL container.
- **Intelligent Field Matching**: Automatically bridges the gap between Backend (PascalCase) and Frontend (camelCase) naming conventions, and intelligently handles Identity fields (Id).

### 🛠 Tech Stack

#### Backend
- **Framework**: .NET 9
- **ORM**: Entity Framework Core 9.0
- **Database**: PostgreSQL
- **Key Feature**: `System.Text.Json.Schema` (JsonSchemaExporter)

#### Frontend
- **Library**: React 19
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
> **Note**: On startup, `DatabaseInitializer` will automatically create the `reactform_db` and necessary tables.

#### 3. Running the Frontend
The frontend runs automatically via `SpaProxy`, but to run manually:
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
- **범용 관리 컴포넌트 (`AutoManager`)**: 리소스 이름과 스키마 키만 인자로 넘기면 목록 조회, 생성, 수정을 모두 처리하는 재사용 가능한 CRUD 인터페이스를 제공합니다.
- **Refine + RJSF 통합**: 데이터 오케스트레이션(Refine)과 강력한 폼 렌더링(React JSON Schema Form)의 결합으로 생산성을 극대화했습니다.
- **자동 데이터베이스 초기화**: PostgreSQL 컨테이너 실행 시 데이터베이스 생성, 스키마 적용, 시드 데이터 주입이 자동으로 수행됩니다.
- **지능형 필드 매칭**: 백엔드(PascalCase)와 프론트엔드(camelCase) 간의 필드명 차이를 자동으로 극복하며, Identity 필드(Id)를 모드에 따라 지능적으로 노출/숨김 처리합니다.

### 🛠 기술 스택

#### Backend
- **Framework**: .NET 9
- **ORM**: Entity Framework Core 9.0
- **Database**: PostgreSQL
- **Key Feature**: `System.Text.Json.Schema` (JsonSchemaExporter)

#### Frontend
- **Library**: React 19
- **Framework**: [Refine](https://refine.dev/)
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
