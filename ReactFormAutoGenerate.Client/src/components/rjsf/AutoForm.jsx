import React, { useMemo } from "react";
import { Edit, Create } from "@refinedev/mui";
import { useForm } from "@refinedev/core";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";
import axios from "axios";
import { Box, CircularProgress, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const api = axios.create({ baseURL: "/api" });

/**
 * Helper utility to retrieve a value from an object using a case-insensitive key.
 * Essential for bridging .NET (PascalCase) and JS (camelCase) naming differences.
 */
const getVal = (obj, key) => {
  if (!obj) return "";
  const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
  return foundKey ? obj[foundKey] : "";
};

/**
 * AutoForm Component
 * Dynamically generates a Create or Edit form based on a JSON Schema.
 * It handles automatic data binding, type conversion, and relational dropdowns.
 */
const AutoForm = ({ id, action, onCancel, schema, resource, relations = [], record = null }) => {
  const formRef = React.useRef(null);
  const queryClient = useQueryClient();

  // --- 1. Relational Data Loading ---
  // Fetches data for fields that should be rendered as dropdowns (e.g., CategoryId).
  const relQueriesResults = useQueries({
    queries: relations.map(rel => ({
      queryKey: [rel.resource],
      queryFn: () => api.get(`/${rel.resource}`).then(res => res.data),
      select: (data) => (Array.isArray(data) ? data : (data.data || [])).map(item => ({
        const: item.id || item.Id || item.ID,
        title: String(item[rel.labelField] || item.Name || item.name || item.id)
      }))
    }))
  });

  const isRelLoading = relQueriesResults.some(res => res.isLoading);
  
  // Aggregate relational options into a lookup object
  const relOptions = useMemo(() => {
    const options = {};
    relQueriesResults.forEach((res, index) => {
      const field = relations[index].field.toLowerCase();
      if (res.data) options[field] = res.data;
    });
    return options;
  }, [relQueriesResults, relations]);

  // --- 2. Refine useForm Hook ---
  // Manages the mutation (POST/PATCH) and initial data fetching from the API.
  const { onFinish, queryResult, saveButtonProps, formLoading } = useForm({
    action: action,
    resource: resource,
    id: id,
    onMutationSuccess: () => {
      // Refresh the list view by invalidating the React Query cache
      queryClient.invalidateQueries({ queryKey: [resource] });
      onCancel();
    },
  });

  const initialData = queryResult?.data?.data;

  // --- 3. Schema Transformation ---
  // Dynamically cleans the schema and injects relational options.
  const cleanedSchema = useMemo(() => {
    if (!schema) return null;
    const s = JSON.parse(JSON.stringify(schema));
    if (s.properties) {
      const idKey = Object.keys(s.properties).find(k => k.toLowerCase() === "id");
      if (action === "create" && idKey) delete s.properties[idKey];
      
      Object.keys(s.properties).forEach(key => {
        const prop = s.properties[key];
        const lowerKey = key.toLowerCase();

        // Dynamically remove EF navigation properties or complex objects
        // We only want to keep primitive types or fields explicitly defined in relations
        const isRelation = !!relations.find(r => r.field.toLowerCase() === lowerKey);
        const isComplexType = prop.type === "object" || prop.type === "array" || 
                             (Array.isArray(prop.type) && (prop.type.includes("object") || prop.type.includes("array")));

        if (isComplexType && !isRelation) {
          delete s.properties[key];
          return;
        }

        if (!prop.title) prop.title = key.charAt(0).toUpperCase() + key.slice(1);
        
        // Convert to dropdown if relation exists
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

  // --- 4. Data Mapping (formData) ---
  // Maps raw server data to the form fields, ensuring correct types and defaults.
  const finalData = useMemo(() => {
    const data = {};
    if (cleanedSchema?.properties) {
      const sourceData = record || initialData;
      Object.keys(cleanedSchema.properties).forEach(key => {
        const prop = cleanedSchema.properties[key];
        const val = sourceData ? getVal(sourceData, key) : undefined;
        
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
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }

  // --- 5. UI Schema Configuration ---
  const FormWrapper = action === "create" ? Create : Edit;
  const uiSchema = { "ui:submitButtonOptions": { "norender": true } };
  
  Object.keys(cleanedSchema.properties || {}).forEach(key => {
    if (key.toLowerCase() === "id" && action === "edit") uiSchema[key] = { "ui:readonly": true };
    if (relOptions[key.toLowerCase()]) uiSchema[key] = { "ui:widget": "select" };
  });

  return (
    <Box sx={{ mb: 4 }}>
      <FormWrapper 
        saveButtonProps={{ ...saveButtonProps, onClick: (e) => { e.preventDefault(); formRef.current?.submit(); } }} 
        title={action === "create" ? `Create New ${resource}` : `Edit ${resource} #${id}`}
        headerButtons={<IconButton onClick={onCancel}><CloseIcon /></IconButton>}
      >
        <Form ref={formRef} schema={cleanedSchema} uiSchema={uiSchema} validator={validator} formData={finalData}
          onSubmit={({ formData }) => onFinish(formData)} children={<></>} 
        />
      </FormWrapper>
    </Box>
  );
};

export default AutoForm;
