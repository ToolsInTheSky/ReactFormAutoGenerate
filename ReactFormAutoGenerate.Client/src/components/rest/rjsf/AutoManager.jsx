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

const getVal = (obj, key) => {
  if (!obj || !key) return undefined;
  const targetKey = key.toLowerCase();
  const actualKey = Object.keys(obj).find(k => k.toLowerCase() === targetKey);
  return actualKey ? obj[actualKey] : undefined;
};

/**
 * Modern KendoReact Custom Data Cell
 */
const LookupDataCell = (props) => {
  const { dataItem, field, lookups, originalCol } = props;
  // field(camelCase) 또는 originalCol(PascalCase)로 값 찾기
  const val = dataItem[field] ?? getVal(dataItem, originalCol);
  
  const lookupKey = originalCol.toLowerCase();
  const lookupMap = lookups[lookupKey] || lookups["categoryid"];
  
  const displayVal = lookupMap ? lookupMap[String(val)] : null;
  const finalValue = displayVal ?? String(val ?? "");
  const resultText = (finalValue === "null" || finalValue === "undefined") ? "" : finalValue;

  return (
    <td {...props.tdProps}>
      {resultText}
    </td>
  );
};

const AutoManager = ({ resource, schemaKey, relations = [] }) => {
  const [editingId, setEditingId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const { data: schema } = useQuery({
    queryKey: ["schema", schemaKey],
    queryFn: () => api.get(`/schema/rjsf/${schemaKey}`).then(res => res.data)
  });

  const { data: recordsRaw, isLoading, refetch } = useQuery({
    queryKey: [resource],
    queryFn: () => api.get(`/${resource}`).then(res => res.data)
  });

  const records = useMemo(() => Array.isArray(recordsRaw) ? recordsRaw : (recordsRaw?.data || []), [recordsRaw]);

  const lookupQueriesResults = useQueries({
    queries: relations.map(rel => ({
      queryKey: ["lookup", rel.resource, rel.field],
      queryFn: () => api.get(`/${rel.resource}`).then(res => res.data),
    }))
  });

  const lookups = useMemo(() => {
    const maps = {};
    lookupQueriesResults.forEach((res, index) => {
      if (res.data) {
        const rel = relations[index];
        const fieldKey = rel.field.toLowerCase();
        const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
        const map = {};
        list.forEach(item => {
          const id = item.id ?? item.Id ?? item.ID;
          if (id !== undefined && id !== null) {
            const label = getVal(item, rel.labelField) || getVal(item, "name") || getVal(item, "Name") || String(id);
            map[String(id)] = label;
          }
        });
        maps[fieldKey] = map;
      }
    });
    return maps;
  }, [lookupQueriesResults, relations]);

  const columns = useMemo(() => {
    if (!schema?.properties) return [];
    return Object.keys(schema.properties).filter(key => {
      const k = key.toLowerCase();
      const prop = schema.properties[key];
      if (["category", "products", "id"].includes(k)) return false;
      const isRelation = relations.some(r => r.field.toLowerCase() === k);
      if ((prop.type === "object" || prop.type === "array") && !isRelation) return false;
      return true;
    });
  }, [schema, relations]);

  return (
    <div style={{ padding: '10px' }}>
      {editingId !== null && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
          <div style={{ 
            width: '100%', maxWidth: '600px', padding: '20px', border: '1px solid #ddd', 
            borderRadius: '8px', backgroundColor: '#f4f4f4', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
          }}>
            <AutoForm 
              id={editingId === "new" ? undefined : editingId} 
              action={editingId === "new" ? "create" : "edit"}
              schema={schema} resource={resource} record={selectedRecord} 
              onCancel={() => setEditingId(null)} relations={relations}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>{resource.toUpperCase()} List</h3>
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
        <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}><Loader size="large" type="pulsing" /></div>
      ) : (
        <Grid data={records} style={{ height: '400px' }} onRowClick={(e) => { setEditingId(getVal(e.dataItem, "id")); setSelectedRecord(e.dataItem); }}>
          {columns.map(col => {
            const isCategoryId = col.toLowerCase() === "categoryid";
            const dataKey = col.charAt(0).toLowerCase() + col.slice(1);
            
            // Modern cells.data pattern
            const CustomCell = (cellProps) => (
              <LookupDataCell {...cellProps} lookups={lookups} originalCol={col} />
            );

            return (
              <GridColumn 
                key={col} 
                field={dataKey} 
                title={isCategoryId ? "CATEGORY" : col.toUpperCase()} 
                cells={{ data: CustomCell }}
              />
            );
          })}
        </Grid>
      )}
    </div>
  );
};

export default AutoManager;
