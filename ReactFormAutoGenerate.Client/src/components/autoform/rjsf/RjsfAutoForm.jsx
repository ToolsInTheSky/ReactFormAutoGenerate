/**
 * @file RjsfAutoForm.jsx
 * @description A highly flexible, auto-generated form component based on react-jsonschema-form (RJSF).
 * It features dynamic schema processing (cleaning and relationship injection), 
 * multi-protocol support (REST/GraphQL), and custom error message transformation.
 * Integrates Refine's useForm for seamless CRUD operations.
 */

import React, { useMemo } from "react";
import { useForm, useDelete } from "@refinedev/core";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import axios from "axios";
import { Button } from "@progress/kendo-react-buttons";
import { Loader } from "@progress/kendo-react-indicators";
import { xIcon, saveIcon, trashIcon } from "@progress/kendo-svg-icons";
import { SvgIcon } from "@progress/kendo-react-common";

import { widgets } from "./Widgets";
import { ObjectFieldTemplate } from "./ObjectFieldTemplate";

const api = axios.create({ baseURL: "/api" });

const toCamelCase = (str) => str.charAt(0).toLowerCase() + str.slice(1);
const toPascalCase = (str) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Utility: getVal
 * Safely retrieves a value from an object using case-insensitive key matching.
 */
const getVal = (obj, key) => {
  if (!obj) return "";
  const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
  return foundKey ? obj[foundKey] : "";
};

/**
 * RjsfAutoForm Component
 * @param {string} protocol - "rest" | "graphql"
 * @param {string|number} id - Record ID for edit mode
 * @param {string} action - "create" | "edit"
 * @param {object} schema - The raw JSON Schema
 * @param {array} relations - List of relational fields to resolve into dropdowns
 */
const RjsfAutoForm = ({ 
  protocol = "rest", 
  id, 
  action, 
  onCancel, 
  schema, 
  resource, 
  entityName, 
  relations = [], 
  record = null 
}) => {
  const formRef = React.useRef(null);
  const queryClient = useQueryClient();

  const isRest = protocol === "rest";
  const actualResource = isRest ? resource : (entityName.toLowerCase() + "s");
  const dataProviderName = isRest ? "default" : "graphql";

  // section 1: !!! IMPORTANT: Relationship Resolution !!!
  // Fetches lookup data for ComboBoxes. Strategy changes based on REST or GraphQL.
  const relQueriesResults = useQueries({
    queries: relations.map(rel => ({
      queryKey: isRest ? [rel.resource] : ["gql-lookup-options", rel.resource],
      queryFn: async () => {
        if (isRest) {
          const res = await api.get(`/${rel.resource}`);
          const data = res.data;
          return (Array.isArray(data) ? data : (data.data || [])).map(item => ({
            const: item.id || item.Id || item.ID,
            title: String(item.name || item.Name || item.title || item.id)
          }));
        } else {
          const qName = toCamelCase(rel.resource);
          const query = `query { ${qName} { items { id name } } }`;
          const res = await axios.post("/graphql", { query });
          const items = res.data?.data?.[qName]?.items || [];
          return items.map(item => ({
            const: item.id || item.Id,
            title: String(item.name || item.id)
          }));
        }
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

  // section 2: Refine useForm Integration
  const { onFinish, queryResult, formLoading } = useForm({
    action: action,
    resource: actualResource,
    id: id,
    meta: isRest ? {} : { dataProviderName },
    onMutationSuccess: () => {
      if (isRest) {
        queryClient.invalidateQueries({ queryKey: [resource] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["gql-data", entityName] });
      }
      onCancel();
    },
  });

  const { mutate: deleteMutate } = useDelete();
  const initialData = queryResult?.data?.data;

  // section 3: !!! IMPORTANT: Schema Cleaning & Transformation !!!
  // Strips technical fields (like $schema, ID) and injects lookup options (oneOf) into relational fields.
  const cleanedSchema = useMemo(() => {
    if (!schema) return null;
    const s = JSON.parse(JSON.stringify(schema));
    delete s.$schema;

    if (s.properties) {
      const idKey = Object.keys(s.properties).find(k => k.toLowerCase() === "id");
      if (idKey) delete s.properties[idKey];
      
      const keysToDelete = [];
      Object.keys(s.properties).forEach(key => {
        const prop = s.properties[key];
        const lowerKey = key.toLowerCase();
        const isRelation = !!relations.find(r => r.field.toLowerCase() === lowerKey);
        
        // Filter out complex nested types that aren't explicit relations
        const isComplex = prop.type === "object" || prop.type === "array" || prop.$ref || 
                         (Array.isArray(prop.type) && (prop.type.includes("object") || prop.type.includes("array"))) ||
                         prop.anyOf || prop.oneOf;

        if (isComplex && !isRelation) {
          keysToDelete.push(key);
          return;
        }

        if (!prop.title) {
          prop.title = key.replace(/([A-Z])/g, ' $1').trim();
        }

        // section: Inject ComboBox Options
        if (relOptions[lowerKey]) {
          prop.oneOf = relOptions[lowerKey];
          prop.type = "integer";
          delete prop.anyOf;
          delete prop.$ref;
        }
      });

      keysToDelete.forEach(k => delete s.properties[k]);
      if (s.required && Array.isArray(s.required)) {
        s.required = s.required.filter(reqKey => !keysToDelete.includes(reqKey) && reqKey.toLowerCase() !== "id");
      }
    }
    return s;
  }, [schema, relOptions, relations]);

  /**
   * section 4: Data Normalization
   * Maps server response data to form field keys, handling type casting (e.g., empty string to number).
   */
  const finalData = useMemo(() => {
    const data = {};
    if (cleanedSchema?.properties) {
      const sourceData = record || initialData;
      Object.keys(cleanedSchema.properties).forEach(key => {
        const prop = cleanedSchema.properties[key];
        const val = isRest ? getVal(sourceData, key) : (sourceData?.[toCamelCase(key)] ?? sourceData?.[key]);
        
        if (prop.type === "number" || prop.type === "integer") {
            data[key] = (val === "" || val === undefined || val === null) ? 0 : Number(val);
        } else {
            data[key] = val ?? "";
        }
      });
    }
    return data;
  }, [cleanedSchema, record, initialData, isRest]);

  /**
   * Handles deletion with confirmation.
   */
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      deleteMutate(
        { 
          resource: actualResource, 
          id: id, 
          meta: isRest ? {} : { dataProviderName } 
        },
        { 
          onSuccess: () => onCancel() 
        }
      );
    }
  };

  const uiSchema = { "ui:submitButtonOptions": { "norender": true } };
  Object.keys(cleanedSchema?.properties || {}).forEach(key => {
    uiSchema[key] = { "ui:label": false };
  });

  /**
   * section 5: !!! IMPORTANT: Error Transformation !!!
   * Converts technical AJV validation errors into clean English sentences and deduplicates by field.
   */
  const transformErrors = (errors) => {
    const uniqueErrors = [];
    const seenFields = new Set();

    errors.forEach((error) => {
      const { name, property, message, params } = error;
      
      if (!property || property === ".") {
        if (message && message.includes("no schema with key")) {
          error.message = "Schema validation setup error.";
          error.stack = error.message;
          uniqueErrors.push(error);
        }
        return;
      }

      const fieldName = property.replace(/^[.\[]|['"\]]/g, "");
      const propertyKeys = Object.keys(cleanedSchema.properties || {});
      const actualKey = propertyKeys.find(k => k.toLowerCase() === fieldName.toLowerCase()) || fieldName;
      const fieldTitle = cleanedSchema.properties[actualKey]?.title || actualKey;

      if (seenFields.has(property)) return;

      let friendlyMessage = "";
      if (name === "required") friendlyMessage = "is required";
      else if (name === "const" || name === "oneOf" || name === "anyOf") friendlyMessage = "selection is invalid. Please select a valid option.";
      else if (name === "format") friendlyMessage = params?.format === "date-time" ? "requires a valid date and time format" : "has an invalid format";
      else if (name === "type") friendlyMessage = "has an invalid value type";
      else if (message && (message.includes("match exactly one schema") || message.includes("must be equal to constant"))) friendlyMessage = "selection is invalid";
      else friendlyMessage = message;

      error.message = friendlyMessage;
      error.stack = `${fieldTitle} ${friendlyMessage}`;
      
      uniqueErrors.push(error);
      seenFields.add(property);
    });

    return uniqueErrors;
  };

  if (formLoading || !cleanedSchema || isRelLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><Loader size="medium" type="pulsing" /></div>;
  }

  return (
    <div>
      {/* Form Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ff6358', fontWeight: 'bold' }}>
          {action === "create" ? `Create New ${entityName || resource}` : `Edit ${entityName || resource} #${id}`}
        </h3>
        <Button fillMode="flat" onClick={onCancel}><SvgIcon icon={xIcon} /></Button>
      </div>

      {/* !!! IMPORTANT: RJSF Core Form !!! */}
      <Form 
        ref={formRef} 
        schema={cleanedSchema} 
        uiSchema={uiSchema} 
        validator={validator} 
        formData={finalData}
        widgets={widgets}
        templates={{ ObjectFieldTemplate }}
        transformErrors={transformErrors}
        onSubmit={({ formData }) => {
            const payload = {};
            Object.keys(formData).forEach(key => {
                const mappedKey = isRest ? toPascalCase(key) : toCamelCase(key);
                payload[mappedKey] = formData[key];
            });
            if (isRest && id) {
                payload["Id"] = typeof id === 'string' ? parseInt(id, 10) : id;
            }
            onFinish(payload);
        }}
      >
        {/* Form Footer Action Buttons */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          {action === "edit" && (
            <div style={{ marginRight: 'auto' }}>
              <Button themeColor="error" type="button" onClick={handleDelete}><SvgIcon icon={trashIcon} /> Delete</Button>
            </div>
          )}
          <Button fillMode="outline" type="button" onClick={onCancel}>Cancel</Button>
          <Button themeColor="primary" type="submit"><SvgIcon icon={saveIcon} /> Save</Button>
        </div>
      </Form>
    </div>
  );
};

export default RjsfAutoForm;
