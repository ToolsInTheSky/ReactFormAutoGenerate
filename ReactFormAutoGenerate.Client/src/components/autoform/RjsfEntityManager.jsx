/**
 * @file RjsfEntityManager.jsx
 * @description Orchestrator component for RJSF-based entity management.
 * It handles data fetching (schema, list, and lookups), state management for the form modal,
 * and renders both the Grid and Form.
 * Supports both REST and GraphQL protocols via the "protocol" prop.
 */

import React, { useState, useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { GraphQLClient, gql } from "graphql-request";
import axios from "axios";
import pluralize from "pluralize";
import Form from "./rjsf/Form";
import Grid from "./Grid";

const api = axios.create({ baseURL: "/api" });

/**
 * Utility: toCamelCase
 * Converts a string to camelCase.
 */
const toCamelCase = (str) => str.charAt(0).toLowerCase() + str.slice(1);

/**
 * Utility: getVal
 * Safely extracts a value from an object regardless of key casing (camelCase, PascalCase, etc.).
 */
const getVal = (obj, key) => {
  if (!obj || !key) return undefined;
  if (obj[key] !== undefined) return obj[key];
  const camel = toCamelCase(key);
  if (obj[camel] !== undefined) return obj[camel];
  const pascal = key.charAt(0).toUpperCase() + key.slice(1);
  if (obj[pascal] !== undefined) return obj[pascal];
  return undefined;
};

/**
 * RjsfEntityManager Component
 * @param {string} protocol - "rest" or "graphql"
 * @param {string} resource - The REST resource name (e.g., "products")
 * @param {string} entityName - The Entity type name (e.g., "Product")
 * @param {string} schemaKey - The key to fetch the JSON schema
 */
const RjsfEntityManager = ({ protocol = "rest", resource, entityName, schemaKey }) => {
  const [editingId, setEditingId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  const isRest = protocol === "rest";
  const client = useMemo(() => isRest ? null : new GraphQLClient(window.location.origin + "/graphql"), [isRest]);

  const toPluralCamelCase = (name) => toCamelCase(pluralize(name));

  // Section 1: !!! IMPORTANT: Schema Fetching !!!
  // Fetches the JSON Schema from the server. The source varies by protocol.
  const { data: schema, isLoading: isSchemaLoading, error: schemaError } = useQuery({
    queryKey: isRest ? ["schema", schemaKey] : ["gql-schema", entityName, "rjsf"],
    queryFn: async () => {
      if (isRest) {
        const res = await api.get(`/schema/${schemaKey}`);
        return res.data;
      } else {
        const query = gql`query GetSchema($name: String!, $proto: String!) { jsonSchema(entityName: $name, protocol: $proto) }`;
        const response = await client.request(query, { name: entityName, proto: "rjsf" });
        return JSON.parse(response.jsonSchema);
      }
    }
  });

  /**
   * Identifies relational fields in the schema marked with "x-relation".
   */
  const autoRelations = useMemo(() => {
    if (!schema?.properties) return [];
    return Object.entries(schema.properties)
      .filter(([_, prop]) => prop["x-relation"])
      .map(([key, prop]) => ({ field: key, resource: prop["x-relation"] }));
  }, [schema]);

  // Section 2: !!! IMPORTANT: Dynamic Query Generation (GraphQL) !!!
  // Constructs a GraphQL query string based on the schema properties.
  const dynamicQuery = useMemo(() => {
    if (isRest || !schema || !schema.properties) return null;
    const fields = Object.keys(schema.properties)
        .filter(key => {
            const prop = schema.properties[key];
            const lowerKey = key.toLowerCase();

            // Exclude identity fields
            if (prop["x-identity"] || lowerKey === "id") return false;

            // Identify complex types ($ref, object, array, oneOf, anyOf)
            const isArray = prop.type === "array" || (Array.isArray(prop.type) && prop.type.includes("array"));
            const isObject = prop.type === "object" || (Array.isArray(prop.type) && prop.type.includes("object"));
            const hasComposition = prop.oneOf || prop.anyOf || prop.$ref;

            const isComplex = isArray || isObject || hasComposition;
            
            // Only allow if it's a simple type OR a complex type with explicit relation mapping
            // IMPORTANT: Never request technical navigation properties or arrays without subfields
            if (isComplex && !prop["x-relation"]) return false;
            
            return true;
        })
        .map(key => toCamelCase(key))
        .join("\n");
    const queryName = toPluralCamelCase(entityName);
    const isKeyless = schema["x-keyless"] === true || schema["xKeyless"] === true;
    
    if (isKeyless) {
        return `query { ${queryName} { items { ${fields} } } }`;
    }
    return `query { ${queryName} { items { id ${fields} } totalCount } }`;
  }, [schema, entityName, isRest]);

  // Section 3: Fetch List Data
  const { data: listResponse, isLoading: isListLoading, refetch: refetchData } = useQuery({
    queryKey: isRest ? [resource] : ["gql-data", entityName, dynamicQuery],
    queryFn: async () => {
        if (isRest) {
            const res = await api.get(`/${resource}`);
            return res.data;
        } else {
            const res = await axios.post("/graphql", { query: dynamicQuery });
            if (res.data.errors) throw new Error(res.data.errors[0].message);
            return res.data;
        }
    },
    enabled: isRest ? !!resource : !!dynamicQuery
  });

  const records = useMemo(() => {
    if (!listResponse) return [];
    if (isRest) {
        return Array.isArray(listResponse) ? listResponse : (listResponse.data || []);
    } else {
        const queryNamePlural = toPluralCamelCase(entityName);
        return listResponse?.data?.[queryNamePlural]?.items || [];
    }
  }, [listResponse, isRest, entityName]);

  // Section 4: !!! IMPORTANT: Lookup Data Fetching !!!
  // Fetches display values for relational IDs (e.g., Category Name for CategoryId).
  const lookupQueriesResults = useQueries({
    queries: autoRelations.map(rel => ({
      queryKey: isRest ? ["lookup", rel.resource, rel.field] : ["gql-lookup", rel.resource],
      queryFn: async () => {
        if (isRest) {
            const res = await api.get(`/${rel.resource}`);
            const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
            const map = {};
            list.forEach(item => {
                const id = item.id ?? item.Id ?? item.ID;
                const label = getVal(item, "name") || getVal(item, "Name") || String(id);
                map[String(id)] = label;
            });
            return map;
        } else {
            const qName = toPluralCamelCase(pluralize.singular(rel.resource));
            const query = `query { ${qName} { items { id name } } }`;
            const res = await axios.post("/graphql", { query });
            const items = res.data?.data?.[qName]?.items || [];
            const map = {};
            items.forEach(item => { map[String(item.id)] = item.name || String(item.id); });
            return map;
        }
      }
    }))
  });

  const lookups = useMemo(() => {
    const maps = {};
    lookupQueriesResults.forEach((res, index) => {
      if (res.data) {
        maps[autoRelations[index].field.toLowerCase()] = res.data;
      }
    });
    return maps;
  }, [lookupQueriesResults, autoRelations]);

  const isLookupsLoading = lookupQueriesResults.some(r => r.isLoading);

  if (schemaError) return <div style={{ color: 'red' }}>Schema Error: {schemaError.message}</div>;

  return (
    <div style={{ padding: '10px' }}>
      
      {/* Section 5: Auto-Generated Form Section */}
      {editingId !== null && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
          <div style={{ width: '100%', maxWidth: '1000px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f4f4f4', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <Form 
                protocol={protocol} 
                id={editingId === "new" ? undefined : editingId} 
                action={editingId === "new" ? "create" : "edit"}
                schema={schema} 
                resource={resource}
                entityName={entityName} 
                record={selectedRecord} 
                onCancel={() => setEditingId(null)} 
                relations={autoRelations}
            />
          </div>
        </div>
      )}

      {/* Section 6: Data Grid Section */}
      <Grid 
        data={records}
        schema={schema}
        lookups={lookups}
        isLoading={isSchemaLoading || isListLoading || isLookupsLoading}
        onRefresh={refetchData}
        onAdd={() => { setEditingId("new"); setSelectedRecord(null); }}
        onRowClick={(id, record) => { setEditingId(id); setSelectedRecord(record); }}
        resourceName={entityName || resource}
      />
    </div>
  );
};

export default RjsfEntityManager;
