import React, { useMemo } from "react";
import { useForm } from "@refinedev/core";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import axios from "axios";
import { Button } from "@progress/kendo-react-buttons";
import { Loader } from "@progress/kendo-react-indicators";
import { xIcon, saveIcon } from "@progress/kendo-svg-icons";
import { SvgIcon } from "@progress/kendo-react-common";

import { widgets } from "../../common/rjsf-kendo/Widgets";
import { ObjectFieldTemplate } from "../../common/rjsf-kendo/ObjectFieldTemplate";

const api = axios.create({ baseURL: "/api" });

const getVal = (obj, key) => {
  if (!obj) return "";
  const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
  return foundKey ? obj[foundKey] : "";
};

const AutoForm = ({ id, action, onCancel, schema, resource, relations = [], record = null }) => {
  const formRef = React.useRef(null);
  const queryClient = useQueryClient();

  const relQueriesResults = useQueries({
    queries: relations.map(rel => ({
      queryKey: [rel.resource],
      queryFn: () => api.get(`/${rel.resource}`).then(res => res.data),
      select: (data) => (Array.isArray(data) ? data : (data.data || [])).map(item => ({
        const: item.id || item.Id || item.ID,
        title: String(item.name || item.Name || item.title || item.id)
      }))
    }))
  });

  const isRelLoading = relQueriesResults.some(res => res.isLoading);
  
  const relOptions = useMemo(() => {
    const options = {};
    relQueriesResults.forEach((res, index) => {
      const field = relations[index].field.toLowerCase();
      if (res.data) options[field] = res.data;
    });
    return options;
  }, [relQueriesResults, relations]);

  const { onFinish, queryResult, formLoading } = useForm({
    action: action,
    resource: resource,
    id: id,
    onMutationSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [resource] });
      onCancel();
    },
  });

  const initialData = queryResult?.data?.data;

  const cleanedSchema = useMemo(() => {
    if (!schema) return null;
    const s = JSON.parse(JSON.stringify(schema));
    if (s.properties) {
      // ID 필드는 폼 제목에 표시되므로 스키마에서 완전히 제거
      const idKey = Object.keys(s.properties).find(k => k.toLowerCase() === "id");
      if (idKey) delete s.properties[idKey];
      
      Object.keys(s.properties).forEach(key => {
        const prop = s.properties[key];
        const lowerKey = key.toLowerCase();
        
        // 1. 관계 데이터 여부 확인
        const isRelation = !!relations.find(r => r.field.toLowerCase() === lowerKey);
        
        // 2. 복합 객체 판별 (NJsonSchema의 $ref 또는 anyOf 포함 객체 대응)
        const isComplex = prop.type === "object" || prop.type === "array" || prop.$ref || 
                         (Array.isArray(prop.type) && (prop.type.includes("object") || prop.type.includes("array")));

        // 3. 관계가 아닌 복합 객체(내비게이션 속성 등)는 제거
        if (isComplex && !isRelation) {
          delete s.properties[key];
          return;
        }

        // 4. 필드 제목(Title) 보장 - 2열 레이아웃에서 라벨이 보이도록 함
        if (!prop.title) {
            // camelCase/PascalCase를 읽기 좋은 텍스트로 변환 (예: UpdateDate -> Update Date)
            prop.title = key.replace(/([A-Z])/g, ' $1').trim();
        }

        // 5. 관계 데이터 옵션 바인딩
        if (relOptions[lowerKey]) {
          prop.oneOf = relOptions[lowerKey];
          if (Array.isArray(prop.type)) prop.type = prop.type.find(t => t !== "null") || "integer";
          else if (prop.type === "null") prop.type = "integer";
        } else if (Array.isArray(prop.type)) {
          prop.type = prop.type.find(t => t !== "null") || "string";
        }
      });
    }
    return s;
  }, [schema, relOptions, action, relations]);

  const finalData = useMemo(() => {
    const data = {};
    if (cleanedSchema?.properties) {
      const sourceData = record || initialData;
      Object.keys(cleanedSchema.properties).forEach(key => {
        const prop = cleanedSchema.properties[key];
        const val = sourceData ? getVal(sourceData, key) : undefined;
        
        if (prop.type === "number" || prop.type === "integer") {
            data[key] = (val === "" || val === undefined || val === null) ? 0 : Number(val);
        } else {
            data[key] = val ?? "";
        }
      });
    }
    return data;
  }, [cleanedSchema, record, initialData]);

  if (formLoading || !cleanedSchema || isRelLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
        <Loader size="medium" type="pulsing" />
      </div>
    );
  }

  const uiSchema = { 
    "ui:submitButtonOptions": { "norender": true }
  };
  Object.keys(cleanedSchema.properties || {}).forEach(key => {
    // 커스텀 위젯에서 라벨을 그리므로 기본 라벨 출력 비활성화
    uiSchema[key] = { 
        "ui:label": false
    };
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ff6358', fontWeight: 'bold' }}>
          {action === "create" ? `Create New ${resource}` : `Edit ${resource} #${id}`}
        </h3>
        <Button fillMode="flat" onClick={onCancel}>
          <SvgIcon icon={xIcon} />
        </Button>
      </div>

      <Form 
        ref={formRef} 
        schema={cleanedSchema} 
        uiSchema={uiSchema} 
        validator={validator} 
        formData={finalData}
        widgets={widgets}
        templates={{ ObjectFieldTemplate }}
        onSubmit={({ formData }) => onFinish(formData)}
      >
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button fillMode="outline" type="button" onClick={onCancel}>Cancel</Button>
          <Button themeColor="primary" onClick={() => formRef.current?.submit()}>
            <SvgIcon icon={saveIcon} /> Save
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default AutoForm;
