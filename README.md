# Schema-Driven UI Generator (KendoReact Edition)

[English](#english) | [한국어](#한국어)

---

<a name="english"></a>
## English

A full-stack demonstration project that automatically generates functional CRUD (Create, Read, Update, Delete) interfaces by consuming JSON Schemas directly from a .NET 9 backend. This project provides a comprehensive comparison of industry-standard form libraries (**RJSF**, **Uniforms**) across both **REST** and **GraphQL** protocols, featuring a professional UI powered by **KendoReact**.

### 🚀 Key Features

- **Multi-Protocol & Multi-Library Integration**:
    - Unified **RjsfEntityManager** and **UniformEntityManager** supporting both REST and GraphQL.
    - Specialized **Form** components for both RJSF and Uniforms libraries.
- **Dynamic Theme Engine**: Interchangeable KendoReact themes (Default, Bootstrap, Material, Fluent) with real-time switching without page reloads.
- **Advanced List Views**: Modern, grid-like list views using KendoReact **ListView** and **Pager** with dynamic column generation from schemas.
- **Intelligent CRUD Orchestration**:
    - **Identity Column Protection**: Automatically hides `x-identity` columns in Create mode.
    - **Relationship Resolution**: Automatically fetches lookup data (e.g., Category Names) and replaces raw IDs in both Forms (ComboBoxes) and Grids.
    - **Auto-Focus**: Smartly focuses the first editable field when a form opens.
- **Dynamic Schema Processing**: Backend `ISchemaProcessor` automatically injects `x-identity` and `x-relation` metadata based on C# attributes (`[Key]`, `[ForeignKey]`).
- **Modern Data Management**: Integrated with **Refine**, providing a robust data provider layer (REST & GraphQL) and automatic notifications.

### 🛠 Tech Stack

#### Backend
- **Framework**: .NET 9 (ASP.NET Core)
- **GraphQL**: [Hot Chocolate 15](https://chillicream.com/) (Projections, Filtering, Sorting)
- **ORM**: Entity Framework Core 9.0 (PostgreSQL)
- **Schema Export**: `System.Text.Json.Schema` with custom `ISchemaProcessor`

#### Frontend
- **Framework**: [Refine](https://refine.dev/)
- **UI Kit**: [KendoReact](https://www.telerik.com/kendo-react-ui/)
- **Form Libraries**:
    - [react-jsonschema-form (RJSF)](https://rjsf-team.github.io/react-jsonschema-form/)
    - [Uniforms](https://uniforms.tools/) (with AJV validation)
- **State & API**: TanStack React Query v5, GraphQL-Request, Axios

### 📂 Directory Structure (Frontend)

```text
src/
├── components/
│   ├── autoform/      # Unified CRUD Orchestrators (REST/GQL)
│   │   ├── rjsf/      # RJSF-specific Form & Kendo Widgets
│   │   └── uniforms/  # Uniforms-specific Form & Kendo Fields
│   ├── autolist/      # Advanced ListView components
│   └── Grid.jsx       # Shared Grid component (KendoReact)
├── Rest...Example.jsx    # REST implementation examples
├── GraphQL...Example.jsx # GraphQL implementation examples
└── App.jsx               # Root with Router & Theme Engine
```

---

<a name="한국어"></a>
## 한국어

백엔드(.NET 9)에서 제공하는 JSON Schema를 직접 소비하여 CRUD(생성, 조회, 수정, 삭제) 인터페이스를 자동으로 생성하는 풀스택 데모 프로젝트입니다. 이 프로젝트는 **REST**와 **GraphQL** 프로토콜 환경에서 **RJSF** 및 **Uniforms** 라이브러리와 **KendoReact**의 통합 방식을 심도 있게 보여줍니다.

### 🚀 주요 기능

- **멀티 프로토콜 및 라이브러리 통합**:
    - REST와 GraphQL을 모두 지원하는 통합 **EntityManager** 구조.
    - RJSF와 Uniforms 라이브러리에 최적화된 공용 **Form** 컴포넌트 제공.
- **동적 테마 엔진**: Kendo UI의 4가지 테마(Default, Bootstrap, Material, Fluent)를 실시간으로 전환할 수 있는 기능을 제공합니다.
- **고급 리스트 뷰**: KendoReact의 **ListView**와 **Pager**를 조합하여 그리드 형태의 전문적인 리스트 뷰를 제공하며, 스키마에 따라 컬럼을 동적으로 생성합니다.
- **지능형 CRUD 오케스트레이션**:
    - **식별자 보호**: 백엔드 `[Key]` 어트리뷰트를 감지하여 신규 생성 시 ID 필드를 자동으로 숨깁니다.
    - **관계 해결 (Lookups)**: 외래 키(ID)를 실제 이름(Name)으로 자동 변환하여 폼(ComboBox)과 리스트에 표시합니다.
    - **자동 포커스**: 폼이 열릴 때 첫 번째 입력 가능한 필드에 자동으로 커서를 위치시킵니다.
- **동적 스키마 프로세싱**: 백엔드의 `ISchemaProcessor`가 C# 엔티티의 메타데이터를 분석하여 `x-identity`, `x-relation` 태그를 JSON 스키마에 자동으로 주입합니다.
- **현대적인 데이터 관리**: **Refine** 프레임워크를 기반으로 멀티 데이터 프로바이더 환경을 구축하고 알림 및 라우팅을 자동화했습니다.

### 🛠 기술 스택

#### Backend
- **Framework**: .NET 9 (ASP.NET Core)
- **GraphQL**: Hot Chocolate 15
- **ORM**: Entity Framework Core 9.0 (PostgreSQL)
- **Schema Export**: NJsonSchema 기반 커스텀 프로세서

#### Frontend
- **Framework**: Refine
- **UI Kit**: KendoReact
- **Form Libraries**: RJSF, Uniforms (AJV 검증)
- **Package Manager**: Yarn

---

### ⚙️ Getting Started / 실행 방법

#### 1. Database Setup (Docker)
```bash
docker-compose up -d
```

#### 2. Running the Backend
- **CLI**: `cd ReactFormAutoGenerate.Server && dotnet run`
- 또는 Visual Studio에서 프로젝트 실행.

#### 3. Running the Frontend
```bash
cd ReactFormAutoGenerate.Client
yarn install
yarn dev
```
