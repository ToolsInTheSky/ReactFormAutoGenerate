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
        const lField = "name";
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
      const idKey = Object.keys(s.properties).find(k => k.toLowerCase() === "id");
      if (idKey) delete s.properties[idKey];

      Object.keys(s.properties).forEach(key => {
        const prop = s.properties[key];
        const lowerKey = key.toLowerCase();
        const isRelation = !!relations.find(r => r.field.toLowerCase() === lowerKey);
        
        // 복합 객체 제거 로직 보강
        const isComplex = prop.type === "object" || prop.type === "array" || prop.$ref || 
                         (Array.isArray(prop.type) && (prop.type.includes("object") || prop.type.includes("array")));

        if (isComplex && !isRelation) { 
            delete s.properties[key]; 
            return; 
        }

        if (!prop.title) {
            prop.title = key.replace(/([A-Z])/g, ' $1').trim();
        }

        if (relOptions[lowerKey]) {
          prop.oneOf = relOptions[lowerKey];
          if (Array.isArray(prop.type)) prop.type = prop.type.find(t => t !== "null") || "integer";
        } else if (Array.isArray(prop.type)) {
          prop.type = prop.type.find(t => t !== "null") || "string";
        }
      });
    }
    return s;
  }, [schema, relOptions, relations]);

  const finalData = useMemo(() => {
    const data = {};
    if (cleanedSchema?.properties) {
      const sourceData = record || initialData;
      Object.keys(cleanedSchema.properties).forEach(key => {
        const prop = cleanedSchema.properties[key];
        const camelKey = toCamelCase(key);
        const val = sourceData ? (sourceData[camelKey] ?? sourceData[key]) : undefined;

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
    return <div style={{ textAlign: 'center', padding: '20px' }}><Loader size="medium" type="pulsing" /></div>;
  }

  const uiSchema = { 
    "ui:submitButtonOptions": { "norender": true }
  };
  Object.keys(cleanedSchema.properties || {}).forEach(key => {
    uiSchema[key] = { "ui:label": false };
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
          <Button fillMode="outline" type="button" onClick={onCancel}>Cancel</Button>
          <Button themeColor="primary" onClick={() => formRef.current?.submit()}><SvgIcon icon={saveIcon} /> Save</Button>
        </div>
      </Form>
    </div>
  );
};

export default GraphQLAutoForm;
