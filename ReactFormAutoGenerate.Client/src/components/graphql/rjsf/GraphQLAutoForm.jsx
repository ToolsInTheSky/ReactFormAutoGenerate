import React, { useMemo, useRef } from "react";
import { Edit, Create } from "@refinedev/mui";
import { useNotification } from "@refinedev/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";
import axios from "axios";
import { Box, CircularProgress, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

/**
 * GraphQLAutoForm Component
 * Generates Create/Edit forms using JSON Schema and executes GraphQL Mutations.
 */
const GraphQLAutoForm = ({ id, action, onCancel, schema, entityName, relations = [], record = null }) => {
  const formRef = useRef(null);
  const queryClient = useQueryClient();
  const { open } = useNotification();

  /**
   * Helper: Converts PascalCase (C# style) to camelCase (GraphQL/JS style).
   */
  const toCamelCase = (str) => str.charAt(0).toLowerCase() + str.slice(1);
  
  /**
   * Helper: Handles pluralization for GraphQL resource naming.
   */
  const toPluralCamelCase = (name) => {
      const camel = name.charAt(0).toLowerCase() + name.slice(1);
      if (camel.endsWith("s")) return camel; 
      if (camel.endsWith("y")) return camel.slice(0, -1) + "ies";
      return camel + "s";
  };

  /**
   * Section 1: Relational Data Loading
   * Fetches dropdown options for foreign key fields (e.g., CategoryId).
   */
  const { data: relOptions, isLoading: isRelLoading } = useQuery({
      queryKey: ["gql-rel-options", relations],
      queryFn: async () => {
          const options = {};
          for (const rel of relations) {
              const qName = toPluralCamelCase(rel.resource);
              const labelField = toCamelCase(rel.labelField);
              const query = `query { ${qName} { items { id ${labelField} } } }`;
              const res = await axios.post("/graphql", { query });
              const items = res.data?.data?.[qName]?.items || [];
              options[rel.field.toLowerCase()] = items.map(item => ({
                  const: item.id,
                  title: String(item[labelField] || item.id)
              }));
          }
          return options;
      },
      enabled: relations.length > 0
  });

  /**
   * Section 2: Mutation Logic
   * Dynamically constructs and executes GraphQL Create/Update mutations.
   */
  const mutation = useMutation({
      mutationFn: async (formData) => {
          const isCreate = action === "create";
          const operation = isCreate ? `Create${entityName}` : `Update${entityName}`;
          
          const argsMap = new Map();
          if (!isCreate && id) argsMap.set("id", id);

          // Map PascalCase form fields to camelCase GraphQL arguments
          Object.keys(formData).forEach(key => {
              const gqlKey = toCamelCase(key);
              if (gqlKey === "id") return; // Skip id as it is handled separately
              
              const val = formData[key];
              if (typeof val === 'number') argsMap.set(gqlKey, val);
              else argsMap.set(gqlKey, `"${val}"`);
          });

          const argsString = Array.from(argsMap.entries())
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ");

          const query = `mutation { ${toCamelCase(operation)}(${argsString}) { id } }`;
          const res = await axios.post("/graphql", { query });
          if (res.data.errors) throw new Error(res.data.errors[0].message);
          return res.data;
      },
      onSuccess: () => {
          open?.({ type: "success", message: "Success", description: `${entityName} saved successfully.` });
          // Invalidate list queries to trigger a refresh
          queryClient.invalidateQueries({ queryKey: ["gql-data"] });
          onCancel();
      },
      onError: (err) => open?.({ type: "error", message: "Error", description: err.message })
  });

  /**
   * Section 3: Schema Transformation
   * Cleans the backend JSON schema to make it compatible with RJSF and injects dropdown options.
   */
  const cleanedSchema = useMemo(() => {
    if (!schema) return null;
    const s = JSON.parse(JSON.stringify(schema));
    if (s.properties) {
      // Remove ID field for create operations
      if (action === "create") {
          const idKey = Object.keys(s.properties).find(k => k.toLowerCase() === "id");
          if (idKey) delete s.properties[idKey];
      }
      
      Object.keys(s.properties).forEach(key => {
        const prop = s.properties[key];
        const lowerKey = key.toLowerCase();

        // Filter out navigation properties (objects/arrays) that aren't defined as relations
        if ((prop.type === "object" || prop.type === "array" || Array.isArray(prop.type)) && 
            !relations.find(r => r.field.toLowerCase() === lowerKey)) {
          delete s.properties[key];
          return;
        }

        if (!prop.title) prop.title = key;
        
        // Convert field to a dropdown if relation metadata exists
        if (relOptions?.[lowerKey]) {
          prop.oneOf = relOptions[lowerKey];
          prop.type = "integer";
        } else if (Array.isArray(prop.type)) {
          prop.type = prop.type.find(t => t !== "null") || "string";
        }
      });
    }
    return s;
  }, [schema, relOptions, action, relations]);

  /**
   * Section 4: Form Data Mapping
   * Pre-fills the form with existing record data when editing.
   */
  const finalData = useMemo(() => {
    const data = {};
    if (cleanedSchema?.properties) {
      Object.keys(cleanedSchema.properties).forEach(key => {
        const prop = cleanedSchema.properties[key];
        const val = record ? (record[toCamelCase(key)] ?? record[key]) : undefined;
        
        if (val === undefined || val === null || val === "") {
          data[key] = (prop.type === "number" || prop.type === "integer") ? 0 : "";
        } else {
          data[key] = (prop.type === "number" || prop.type === "integer") ? Number(val) : val;
        }
      });
    }
    return data;
  }, [cleanedSchema, record]);

  if (!cleanedSchema || (relations.length > 0 && isRelLoading)) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }

  // Choose the appropriate Refine wrapper based on action
  const FormWrapper = action === "create" ? Create : Edit;
  const uiSchema = { "ui:submitButtonOptions": { "norender": true } };

  return (
    <Box sx={{ mb: 4 }}>
      <FormWrapper 
        saveButtonProps={{ onClick: () => formRef.current?.submit(), disabled: mutation.isLoading }} 
        title={action === "create" ? `Create New ${entityName}` : `Edit ${entityName}`}
        headerButtons={<IconButton onClick={onCancel}><CloseIcon /></IconButton>}
      >
        <Form 
          ref={formRef} 
          schema={cleanedSchema} 
          uiSchema={uiSchema} 
          validator={validator} 
          formData={finalData}
          onSubmit={({ formData }) => mutation.mutate(formData)} 
          children={<></>} 
        />
      </FormWrapper>
    </Box>
  );
};

export default GraphQLAutoForm;
