/**
 * @file AutoListView.jsx
 * @description A generic, paginated list component designed to look like a Grid.
 * It dynamically generates headers and columns from JSON Schema properties,
 * including resolving related data (e.g., showing Category Name instead of CategoryId).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ListView, ListViewHeader } from '@progress/kendo-react-listview';
import { Pager } from '@progress/kendo-react-data-tools';
import { process } from '@progress/kendo-data-query';
import { Loader } from "@progress/kendo-react-indicators";
import axios from 'axios';
import { GraphQLClient, gql } from 'graphql-request';
import pluralize from 'pluralize';

const toCamelCase = (str) => str.charAt(0).toLowerCase() + str.slice(1);

/**
 * Utility: getVal
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

const AutoListView = ({ protocol = "rest", resource, entityName, title }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState({ skip: 0, take: 10 });
    const [schema, setSchema] = useState(null);
    const [lookups, setLookups] = useState({});

    const isRest = protocol === "rest";
    const client = useMemo(() => isRest ? null : new GraphQLClient(window.location.origin + "/graphql"), [isRest]);

    const toPluralCamelCase = (name) => toCamelCase(pluralize(name));

    /**
     * section: Schema, Data, and Lookups Fetching
     */
    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            let parsedSchema = null;
            
            // 1. Fetch Schema
            if (isRest) {
                const schemaKey = resource.endsWith('ies') ? 'category' : pluralize.singular(resource);
                const sRes = await axios.get(`/api/schema/${schemaKey}`);
                parsedSchema = sRes.data;
            } else {
                const schemaQuery = gql`query GetSchema($name: String!, $proto: String!) { jsonSchema(entityName: $name, protocol: $proto) }`;
                const sRes = await client.request(schemaQuery, { name: entityName, proto: "rjsf" });
                parsedSchema = JSON.parse(sRes.jsonSchema);
            }
            setSchema(parsedSchema);

            // 2. Fetch Lookups (Relationships)
            if (parsedSchema?.properties) {
                const lookupResults = {};
                const relEntries = Object.entries(parsedSchema.properties).filter(([_, p]) => p["x-relation"]);
                
                await Promise.all(relEntries.map(async ([key, prop]) => {
                    const relRes = prop["x-relation"];
                    const map = {};
                    if (isRest) {
                        const res = await axios.get(`/api/${relRes}`);
                        const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
                        list.forEach(item => {
                            const id = item.id ?? item.Id ?? item.ID;
                            const label = getVal(item, "name") || getVal(item, "Name") || String(id);
                            map[String(id)] = label;
                        });
                    } else {
                        const qName = toPluralCamelCase(pluralize.singular(relRes));
                        const res = await axios.post("/graphql", { query: `query { ${qName} { items { id name } } }` });
                        const items = res.data?.data?.[qName]?.items || [];
                        items.forEach(item => { map[String(item.id)] = item.name || String(item.id); });
                    }
                    lookupResults[key.toLowerCase()] = map;
                }));
                setLookups(lookupResults);
            }

            // 3. Fetch Main Data
            if (isRest) {
                const res = await axios.get(`/api/${resource}`);
                setData(Array.isArray(res.data) ? res.data : (res.data.data || []));
            } else {
                const queryFields = Object.keys(parsedSchema.properties)
                    .filter(key => {
                        const prop = parsedSchema.properties[key];
                        const isComplex = prop.type === "object" || prop.type === "array" || prop.$ref || prop.oneOf || prop.anyOf;
                        return !isComplex || !!prop["x-relation"];
                    })
                    .map(toCamelCase).join("\n");

                const qName = toPluralCamelCase(entityName);
                const dataQuery = `query { ${qName} { items { id ${queryFields} } } }`;
                const res = await axios.post("/graphql", { query: dataQuery });
                setData(res.data?.data?.[qName]?.items || []);
            }
        } catch (err) {
            console.error("Error in AutoListView:", err);
        } finally {
            setLoading(false);
        }
    }, [isRest, resource, entityName, client]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const columns = useMemo(() => {
        if (!schema?.properties) return [];
        return Object.keys(schema.properties).filter(key => {
            const prop = schema.properties[key];
            const lowerKey = key.toLowerCase();
            if (lowerKey === "id" || prop["x-identity"]) return false;
            const isComplex = prop.type === "object" || prop.type === "array" || prop.$ref || prop.oneOf || prop.anyOf;
            return !isComplex || !!prop["x-relation"];
        });
    }, [schema]);

    const gridStyle = {
        display: 'grid',
        gridTemplateColumns: `80px repeat(${columns.length}, 1fr)`,
        gap: '10px',
        alignItems: 'center'
    };

    const GridRowRender = (props) => {
        const item = props.dataItem;
        return (
            <div style={{ ...gridStyle, padding: '12px 15px', borderBottom: '1px solid #eee' }}>
                <div style={{ fontWeight: 'bold', color: '#666' }}>#{getVal(item, "id")}</div>
                {columns.map(col => {
                    const prop = schema.properties[col];
                    const val = getVal(item, col);
                    const isDate = col.toLowerCase().includes("date") || prop.format === "date-time";
                    const lookupMap = lookups[col.toLowerCase()];
                    
                    let displayVal = "";
                    
                    if (lookupMap && val !== undefined) {
                        displayVal = lookupMap[String(val)] || String(val);
                    } else if (isDate && val) {
                        displayVal = new Date(val).toLocaleDateString();
                    } else if (typeof val === 'boolean') {
                        displayVal = val ? "Yes" : "No";
                    } else {
                        displayVal = String(val ?? "");
                    }

                    return (
                        <div key={col} style={{ 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis' 
                        }} title={displayVal}>
                            {displayVal}
                        </div>
                    );
                })}
            </div>
        );
    };

    const pagedData = useMemo(() => process(data, { skip: page.skip, take: page.take }).data, [data, page]);

    if (loading || !schema) return <div style={{ padding: '50px', textAlign: 'center' }}><Loader size="large" type="pulsing" /></div>;

    return (
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <ListViewHeader style={{ 
                ...gridStyle, 
                padding: '12px 15px', 
                backgroundColor: '#333', 
                color: '#fff',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                fontSize: '0.8rem',
                letterSpacing: '1px'
            }}>
                <div>ID</div>
                {columns.map(col => {
                    const prop = schema.properties[col];
                    const relRes = prop["x-relation"];
                    const title = relRes ? pluralize.singular(relRes).toUpperCase() : (prop.title || col).toUpperCase();
                    return <div key={col}>{title}</div>;
                })}
            </ListViewHeader>
            
            <ListView
                data={pagedData}
                item={GridRowRender}
                style={{ width: '100%', minHeight: '400px' }}
            />

            <Pager
                skip={page.skip}
                take={page.take}
                total={data.length}
                onPageChange={(e) => setPage({ skip: e.skip, take: e.take })}
                pageSizeValues={[5, 10, 20, 50]}
            />
        </div>
    );
};

export default AutoListView;
