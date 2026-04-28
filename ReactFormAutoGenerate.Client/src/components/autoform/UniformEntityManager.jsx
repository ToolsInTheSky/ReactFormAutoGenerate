/**
 * @file UniformEntityManager.jsx
 * @description Orchestrator component for Uniforms-based entity management.
 * It manages the lifecycle of entities (Categories, Products, Inventory) by fetching 
 * schemas, list data, and relational lookups. It toggles between the Grid and Form views.
 * Supports REST and GraphQL protocols via the "protocol" prop.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useList } from '@refinedev/core';
import { GraphQLClient } from "graphql-request";
import axios from "axios";
import pluralize from "pluralize";

import { Card, CardBody } from "@progress/kendo-react-layout";
import { Loader } from "@progress/kendo-react-indicators";

import Form from './uniforms/Form';
import Grid from "./Grid";

const toCamelCase = (str) => str.charAt(0).toLowerCase() + str.slice(1);
const toPluralCamelCase = (name) => toCamelCase(pluralize(name));

/**
 * Utility: getVal
 * Safely extracts a value from an object regardless of key casing.
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
 * UniformEntityManager Component
 * @param {string} protocol - "rest" or "graphql"
 * @param {string} resource - REST resource name
 * @param {string} entityName - Entity type name
 * @param {string} schemaUrl - URL to fetch REST schema (if applicable)
 * @param {string} title - Display title for the entity
 */
export const UniformEntityManager = ({ protocol = "rest", resource, entityName, schemaUrl, title }) => {
    const isRest = protocol === "rest";
    const actualResource = isRest ? resource : toPluralCamelCase(entityName);
    const client = useMemo(() => isRest ? null : new GraphQLClient(window.location.origin + "/graphql"), [isRest]);
    
    // Section 1: Refine List Hook (REST only)
    const { data: listData, isLoading: isListLoadingRest } = useList({ resource: actualResource, queryOptions: { enabled: isRest } });

    const [schema, setSchema] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [records, setRecords] = useState([]);
    const [isListLoadingGql, setIsListLoadingGql] = useState(false);
    const [resolvedSelectOptions, setResolvedSelectOptions] = useState({});

    /**
     * Section 2: !!! IMPORTANT: Data Fetching Strategy !!!
     * GraphQL: Constructs dynamic queries based on schema properties.
     * REST: Standard fetch from the /api endpoint.
     */
    const fetchData = useCallback(async () => {
        if (!isRest && schema) {
            setIsListLoadingGql(true);
            try {
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
                    .map(toCamelCase).join("\n");
                const qName = toPluralCamelCase(entityName);
                const isKeyless = schema["x-keyless"] === true || schema["xKeyless"] === true;
                const idField = isKeyless ? "" : "id";
                const query = `query { ${qName} { items { ${idField} ${fields} } } }`;
                const res = await axios.post("/graphql", { query });
                setRecords(res.data?.data?.[qName]?.items || []);
            } catch (err) { console.error(err); }
            finally { setIsListLoadingGql(false); }
        } else if (isRest) {
            fetch(`/api/${resource}`).then(res => res.json()).then(data => setRecords(Array.isArray(data) ? data : []))
                .catch(err => console.error(err));
        }
    }, [isRest, schema, entityName, resource]);

    /**
     * Section 3: !!! IMPORTANT: Schema and Lookup Loading !!!
     * Fetches the JSON Schema and resolves "x-relation" fields into selectable options.
     */
    useEffect(() => {
        const loadSchema = async () => {
            try {
                let data;
                if (isRest) {
                    const res = await fetch(schemaUrl);
                    data = await res.json();
                } else {
                    const query = `query GetSchema($name: String!, $proto: String!) { jsonSchema(entityName: $name, protocol: $proto) }`;
                    const response = await client.request(query, { name: entityName, proto: "uniforms" });
                    data = JSON.parse(response.jsonSchema);
                }
                setSchema(data);
                
                // section: Resolve relationships
                if (data.properties) {
                    Object.entries(data.properties).forEach(async ([key, prop]) => {
                        const relRes = prop["x-relation"];
                        if (relRes) {
                            let items = [];
                            if (isRest) {
                                const res = await fetch(`/api/${relRes}`);
                                const list = await res.json();
                                items = (Array.isArray(list) ? list : (list.data || [])).map(item => ({
                                    label: getVal(item, "name") || String(item.id || item.Id),
                                    value: item.id || item.Id
                                }));
                            } else {
                                const qName = toPluralCamelCase(pluralize.singular(relRes));
                                const res = await axios.post("/graphql", { query: `query { ${qName} { items { id name } } }` });
                                items = (res.data?.data?.[qName]?.items || []).map(i => ({ label: i.name || i.id, value: i.id }));
                            }
                            setResolvedSelectOptions(prev => ({ ...prev, [key]: { options: items } }));
                        }
                    });
                }
            } catch (err) { setFetchError(err.message); }
            finally { setLoading(false); }
        };
        loadSchema();
    }, [isRest, schemaUrl, entityName, client]);

    useEffect(() => { if (isRest || schema) fetchData(); }, [isRest, schema, fetchData]);

    const entities = useMemo(() => isRest ? (listData?.data || records) : records, [isRest, listData, records]);

    /**
     * Maps ID values to Labels for display in the Grid.
     */
    const lookupsMap = useMemo(() => {
        const maps = {};
        Object.entries(resolvedSelectOptions).forEach(([key, opt]) => {
            const map = {};
            opt.options?.forEach(o => { map[String(o.value)] = o.label; });
            maps[key.toLowerCase()] = map;
        });
        return maps;
    }, [resolvedSelectOptions]);

    const selectedRecord = useMemo(() => {
        if (!selectedId) return null;
        return entities.find(e => String(e.id || e.Id) === String(selectedId));
    }, [selectedId, entities]);

    if (loading || !schema || (isRest && isListLoadingRest) || (!isRest && isListLoadingGql)) 
        return <div style={{ textAlign: 'center', padding: '50px' }}><Loader size="large" type="pulsing" /></div>;
    
    if (fetchError) return <div style={{ color: 'red', padding: '20px' }}>{fetchError}</div>;

    return (
        <div style={{ width: '100%' }}>
            
            {/* Section 4: Modal Form View */}
            {isFormOpen && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
                    <Card style={{ width: '100%', maxWidth: '1000px', backgroundColor: '#f4f4f4' }}>
                        <CardBody>
                            <Form 
                                protocol={protocol}
                                resource={actualResource}
                                entityName={entityName || title}
                                id={selectedId}
                                action={selectedId ? "edit" : "create"}
                                schema={schema}
                                selectOptions={resolvedSelectOptions}
                                initialRecord={selectedRecord}
                                onCancel={() => { setIsFormOpen(false); setSelectedId(null); }}
                                onSuccess={fetchData}
                            />
                        </CardBody>
                    </Card>
                </div>
            )}

            {/* Section 5: Data Grid View */}
            <Grid 
                data={entities} schema={schema} lookups={lookupsMap} isLoading={loading || (isRest ? isListLoadingRest : isListLoadingGql)}
                onRefresh={fetchData} onAdd={() => { setSelectedId(null); setIsFormOpen(true); }}
                onRowClick={(id) => { setSelectedId(id); setIsFormOpen(true); }} resourceName={title || entityName}
            />
        </div>
    );
};
