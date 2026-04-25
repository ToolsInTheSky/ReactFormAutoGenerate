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

const GraphQLAutoForm = ({ id, action, onCancel, schema, entityName, relations = [], record = null }) => {
  const formRef = React.useRef(null);
  const queryClient = useQueryClient();
  const toCamelCase = (str) => str.charAt(0).toLowerCase() + str.slice(1);

  const relQueriesResults = useQueries({
    queries: relations.map(rel => ({
      queryKey: ["gql-lookup-options", rel.resource],
      queryFn: async () => {
        const qName = rel.resource.charAt(0).toLowerCase() + rel.resource.slice(1);
        const lField = toCamelCase(rel.labelField);
        const query = `query { ${qName} { items { id ${lField} } } }`;
        const res = await axios.post("/graphql", { query });
        const items = res.data?.data?.[qName]?.items || [];
        return items.map(item => ({
          const: item.id || item.Id,
          title: String(item[lField] || item.name || item.id)
        }));
      }
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
    resource: entityName.toLowerCase() + "s",
    id: id,
    meta: { dataProviderName: "graphql" },
    onMutationSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gql-data", entityName] });
      onCancel();
    },
  });

  const initialData = queryResult?.data?.data;
  const cleanedSchema = useMemo(() => {
    if (!schema) return null;
    const s = JSON.parse(JSON.stringify(schema));
    if (s.properties) {
      // ID 필드는 폼 제목에 표시되므로 스키마에서 완전히 제거 (생성/수정 모두)
      const idKey = Object.keys(s.properties).find(k => k.toLowerCase() === "id");
      if (idKey) delete s.properties[idKey];
      
      Object.keys(s.properties).forEach(key => {
        const prop = s.properties[key];
        const lowerKey = key.toLowerCase();
        const isRelation = !!relations.find(r => r.field.toLowerCase() === lowerKey);
        if ((prop.type === "object" || prop.type === "array") && !isRelation) { delete s.properties[key]; return; }
        if (!prop.title) prop.title = key.charAt(0).toUpperCase() + key.slice(1);
        if (relOptions[lowerKey]) {
          prop.oneOf = relOptions[lowerKey];
          if (Array.isArray(prop.type)) prop.type = prop.type.find(t => t !== "null") || "integer";
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
        const camelKey = toCamelCase(key);
        const val = sourceData ? (sourceData[camelKey] ?? sourceData[key]) : undefined;
        if (key.toLowerCase() === "id") {
          if (action === "edit") {
            const idVal = (val !== "" && val !== undefined) ? val : id;
            data[key] = typeof idVal === 'string' ? parseInt(idVal, 10) : Number(idVal);
          }
        } else if (val === "" || val === undefined || val === null) {
          data[key] = (prop.type === "number" || prop.type === "integer") ? 0 : "";
        } else {
          data[key] = (prop.type === "number" || prop.type === "integer") ? Number(val) : val;
        }
      });
    }
    return data;
  }, [cleanedSchema, record, initialData, id, action]);

  if (formLoading || !cleanedSchema || isRelLoading) {
    return <div style={{ textAlign: 'center', padding: '20px' }}><Loader size="medium" type="pulsing" /></div>;
  }

  const uiSchema = { 
    "ui:submitButtonOptions": { "norender": true }
  };
  Object.keys(cleanedSchema.properties || {}).forEach(key => {
    const isIdField = key.toLowerCase() === "id";
    
    if (isIdField && action === "edit") {
      uiSchema[key] = { 
        "ui:readonly": true,
        "ui:disabled": true
      };
    }
    
    // 커스텀 위젯에서 라벨을 그리므로 기본 라벨 출력 비활성화
    if (!uiSchema[key]) uiSchema[key] = {};
    uiSchema[key]["ui:label"] = false;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ff6358', fontWeight: 'bold' }}>
          {action === "create" ? `Create New ${entityName}` : `Edit ${entityName} #${id}`}
        </h3>
        <Button fillMode="flat" onClick={onCancel}><SvgIcon icon={xIcon} /></Button>
      </div>
      <Form ref={formRef} schema={cleanedSchema} uiSchema={uiSchema} validator={validator} formData={finalData}
        widgets={widgets} templates={{ ObjectFieldTemplate }}
        onSubmit={({ formData }) => {
            const gqlData = {};
            Object.keys(formData).forEach(k => { gqlData[toCamelCase(k)] = formData[k]; });
            onFinish(gqlData);
        }}
      >
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button fillMode="outline" onClick={onCancel}>Cancel</Button>
          <Button themeColor="primary" onClick={() => formRef.current?.submit()}><SvgIcon icon={saveIcon} /> Save</Button>
        </div>
      </Form>
    </div>
  );
};

export default GraphQLAutoForm;
