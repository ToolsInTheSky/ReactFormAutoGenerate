import React, { useState, useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import axios from "axios";
import { Grid, GridColumn } from "@progress/kendo-react-grid";
import { Button } from "@progress/kendo-react-buttons";
import { Loader } from "@progress/kendo-react-indicators";
import { plusIcon, arrowRotateCwIcon } from "@progress/kendo-svg-icons";
import { SvgIcon } from "@progress/kendo-react-common";
import AutoForm from "./AutoForm";

const api = axios.create({ baseURL: "/api" });

/**
 * Helper to get value from object case-insensitively.
 */
const getVal = (obj, key) => {
  if (!obj) return "";
  const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
  const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
  
  if (obj[camelKey] !== undefined) return obj[camelKey];
  if (obj[pascalKey] !== undefined) return obj[pascalKey];
  if (obj[key] !== undefined) return obj[key];
  
  return "";
};

const AutoManager = ({ resource, schemaKey, relations = [] }) => {
  const [editingId, setEditingId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Fetch the JSON Schema
  const { data: schema } = useQuery({
    queryKey: ["schema", schemaKey],
    queryFn: () => api.get(`/schema/rjsf/${schemaKey}`).then(res => res.data)
  });

  // Fetch all records
  const { data: recordsRaw, isLoading, refetch } = useQuery({
    queryKey: [resource],
    queryFn: () => api.get(`/${resource}`).then(res => res.data)
  });

  const records = useMemo(() => {
    return Array.isArray(recordsRaw) ? recordsRaw : (recordsRaw?.data || []);
  }, [recordsRaw]);

  // Fetch labels for foreign key fields
  const lookupQueriesResults = useQueries({
    queries: relations.map(rel => ({
      queryKey: [rel.resource],
      queryFn: () => api.get(`/${rel.resource}`).then(res => res.data),
    }))
  });

  const lookups = useMemo(() => {
    const maps = {};
    lookupQueriesResults.forEach((res, index) => {
      if (res.data) {
        const field = relations[index].field.toLowerCase();
        const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
        const map = {};
        list.forEach(item => {
          const id = item.id ?? item.Id ?? item.ID;
          map[id] = item[relations[index].labelField] || item.Name || item.name;
        });
        maps[field] = map;
      }
    });
    return maps;
  }, [lookupQueriesResults, relations]);

  const columns = useMemo(() => {
    if (!schema?.properties) return [];
    return Object.keys(schema.properties).filter(key => 
      !["category", "products", "Category", "Products"].includes(key.toLowerCase())
    );
  }, [schema]);

  const onRowClick = (event) => {
    const id = getVal(event.dataItem, "id");
    setEditingId(id);
    setSelectedRecord(event.dataItem);
  };

  return (
    <div style={{ padding: '10px' }}>
      {editingId !== null && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
          <div style={{ 
            width: '100%', 
            maxWidth: '600px', 
            padding: '20px', 
            border: '1px solid #ddd', 
            borderRadius: '8px', 
            backgroundColor: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
          }}>
            <AutoForm 
              id={editingId === "new" ? undefined : editingId} 
              action={editingId === "new" ? "create" : "edit"}
              schema={schema} 
              resource={resource} 
              record={selectedRecord} 
              onCancel={() => setEditingId(null)} 
              relations={relations}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>{resource.toUpperCase()} Management</h3>
        <div>
          <Button fillMode="outline" onClick={() => refetch()} style={{ marginRight: '10px' }}>
            <SvgIcon icon={arrowRotateCwIcon} /> Refresh
          </Button>
          <Button themeColor="primary" onClick={() => { setEditingId("new"); setSelectedRecord(null); }}>
            <SvgIcon icon={plusIcon} /> Create New
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
          <Loader size="large" type="pulsing" />
        </div>
      ) : (
        <Grid
          data={records}
          style={{ height: '400px' }}
          onRowClick={onRowClick}
        >
          {columns.map(col => {
            const camelField = col.charAt(0).toLowerCase() + col.slice(1);
            return (
              <GridColumn 
                key={col} 
                field={camelField} 
                title={col.toUpperCase()} 
                cell={(props) => {
                  const dataItem = props.dataItem;
                  const rawVal = dataItem[camelField] ?? dataItem[col] ?? "";
                  const displayVal = lookups[col.toLowerCase()]?.[rawVal] ?? String(rawVal);
                  
                  return (
                    <td style={props.style} className={props.className}>
                      {displayVal === "null" ? "" : displayVal}
                    </td>
                  );
                }}
              />
            );
          })}
        </Grid>
      )}
    </div>
  );
};

export default AutoManager;
