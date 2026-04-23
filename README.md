# Schema-Driven UI Generator

[English](#english) | [한국어](#한국어)

---

<a name="english"></a>
## English

A full-stack demonstration project that automatically generates functional CRUD (Create, Read, Update, Delete) interfaces by consuming JSON Schemas directly from a .NET 9 backend. This project provides a comprehensive comparison of industry-standard form libraries (**RJSF**, **Uniforms**) across both **REST** and **GraphQL** protocols.

### 🚀 Key Features

- **Multi-Protocol & Multi-Library Comparison**:
    - **REST + RJSF / Uniforms**: Standard RESTful implementations.
    - **GraphQL + RJSF / Uniforms**: Modern GraphQL implementations using **Hot Chocolate 15**.
- **Dynamic Schema API**: Generic controllers and GraphQL resolvers that generate JSON Schemas for any C# entity on-the-fly via URL parameters or queries.
- **Dynamic Query Generation**: Frontend components (`GraphQLAutoManager`, `GraphQLUniformEntityManager`) that build GraphQL queries and mutations dynamically by inspecting the backend JSON Schema.
- **Auto UI Generation**: Utilizes .NET 9 `JsonSchemaExporter` to convert C# entity models into JSON Schema, enabling automatic form generation without manual coding.
- **Modern Data Management**: Integrated with **Refine**, providing a robust data provider layer (REST & GraphQL), notification system, and routing.
- **Intelligent Relational Support**: Automatically handles foreign key relationships by mapping them to searchable Select components, with support for automatic pluralization (e.g., Category -> categories).
- **Organized Architecture**: Cleanly separated component structure by protocol (REST/GraphQL) and library (RJSF/Uniforms).

### 🛠 Tech Stack

#### Backend
- **Framework**: .NET 9 (ASP.NET Core)
- **GraphQL**: [Hot Chocolate 15](https://chillicream.com/) (with Offset Paging & Projections)
- **ORM**: Entity Framework Core 9.0 (PostgreSQL)
- **Schema Export**: `System.Text.Json.Schema` (JsonSchemaExporter)

#### Frontend
- **Framework**: [Refine](https://refine.dev/) (Multi-DataProvider support)
- **UI Kit**: Material UI (MUI) v6
- **Form Libraries**:
    - [react-jsonschema-form (RJSF)](https://rjsf-team.github.io/react-jsonschema-form/)
    - [Uniforms](https://uniforms.tools/) (with AJV validation)
- **API Clients**: GraphQL-Request, Axios, TanStack React Query v5

### 📂 Directory Structure (Frontend)

```text
src/
├── components/
│   ├── common/       # Shared utilities (SchemaFetcher)
│   ├── rest/         # REST API components (RJSF & Uniforms)
│   └── graphql/      # GraphQL components (RJSF & Uniforms)
├── App.jsx           # Main entry point with implementation selection
├── Rest...Example    # REST implementations
└── GraphQL...Example # GraphQL implementations
```

---

<a name="한국어"></a>
## 한국어

백엔드(.NET 9)에서 제공하는 JSON Schema를 직접 소비하여 CRUD(생성, 조회, 수정, 삭제) 인터페이스를 자동으로 생성하는 풀스택 데모 프로젝트입니다. 이 프로젝트는 **REST**와 **GraphQL** 두 가지 프로토콜 환경에서 **RJSF** 및 **Uniforms** 라이브러리의 통합 방식을 심도 있게 비교합니다.

### 🚀 주요 기능

- **멀티 프로토콜 및 라이브러리 비교**:
    - **REST + RJSF / Uniforms**: 표준적인 RESTful API 기반 구현.
    - **GraphQL + RJSF / Uniforms**: **Hot Chocolate 15**를 사용한 최신 GraphQL 기반 구현.
- **동적 스키마 API**: 범용 컨트롤러와 GraphQL 리졸버를 통해 C# 엔티티의 JSON Schema를 즉석에서 생성하여 제공합니다.
- **동적 쿼리 및 뮤테이션 생성**: 프론트엔드 컴포넌트가 백엔드 스키마를 분석하여 GraphQL Query와 Mutation 문을 실시간으로 자동 생성합니다.
- **자동 UI 생성**: .NET 9의 `JsonSchemaExporter`를 사용하여 C# 엔티티 모델을 JSON Schema로 변환하고, 이를 기반으로 코딩 없이 UI를 자동 생성합니다.
- **현대적인 데이터 관리**: **Refine** 프레임워크를 기반으로 멀티 데이터 프로바이더(REST & GraphQL), 알림 시스템, 라우팅 기능을 제공합니다.
- **지능형 관계 지원**: 외래 키 관계를 자동으로 감지하여 드롭다운으로 변환하며, `Category -> categories`와 같은 복수형 규칙을 자동으로 처리합니다.
- **체계적인 아키텍처**: 프로토콜과 라이브러리별로 컴포넌트를 분리하여 높은 유지보수성과 확장성을 확보했습니다.

### 🛠 기술 스택

#### Backend
- **Framework**: .NET 9 (ASP.NET Core)
- **GraphQL**: [Hot Chocolate 15](https://chillicream.com/)
- **ORM**: Entity Framework Core 9.0 (PostgreSQL)
- **Schema Export**: `System.Text.Json.Schema` (JsonSchemaExporter)

#### Frontend
- **Framework**: [Refine](https://refine.dev/)
- **UI Kit**: Material UI (MUI) v6
- **Form Libraries**: RJSF, Uniforms (AJV 검증)
- **API Clients**: GraphQL-Request, Axios, TanStack React Query

---

### ⚙️ Getting Started / 실행 방법

#### 1. Database Setup
```bash
docker-compose up -d
```

#### 2. Running the Backend
- **Visual Studio**: `ReactFormAutoGenerate.Server`를 시작 프로젝트로 설정 후 **F5**.
- **CLI**: `cd ReactFormAutoGenerate.Server && dotnet run`

#### 3. Running the Frontend
```bash
cd ReactFormAutoGenerate.Client
yarn install
yarn dev
```
