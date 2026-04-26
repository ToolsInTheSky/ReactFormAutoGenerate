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
  const val = dataItem[field] ?? getVal(dataItem, originalCol);
  
  // 하드코딩 제거: 전달받은 필드 키로만 검색
  const lookupMap = lookups[originalCol.toLowerCase()];
  
  const displayVal = lookupMap ? lookupMap[String(val)] : null;
  const finalValue = displayVal ?? String(val ?? "");
  return <td {...props.tdProps}>{(finalValue === "null" || finalValue === "undefined") ? "" : finalValue}</td>;
};

const AutoManager = ({ resource, schemaKey }) => {
  const [editingId, setEditingId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const { data: schema } = useQuery({
    queryKey: ["schema", schemaKey],
    queryFn: () => api.get(`/schema/${schemaKey}`).then(res => res.data)
  });

  const { data: recordsRaw, isLoading, refetch } = useQuery({
    queryKey: [resource],
    queryFn: () => api.get(`/${resource}`).then(res => res.data)
  });

  const records = useMemo(() => Array.isArray(recordsRaw) ? recordsRaw : (recordsRaw?.data || []), [recordsRaw]);

  const autoRelations = useMemo(() => {
    if (!schema?.properties) return [];
    return Object.entries(schema.properties)
      .filter(([_, prop]) => prop["x-relation"])
      .map(([key, prop]) => ({
        field: key,
        resource: prop["x-relation"]
      }));
  }, [schema]);

  const lookupQueriesResults = useQueries({
    queries: autoRelations.map(rel => ({
      queryKey: ["lookup", rel.resource, rel.field],
      queryFn: () => api.get(`/${rel.resource}`).then(res => res.data),
    }))
  });

  const lookups = useMemo(() => {
    const maps = {};
    lookupQueriesResults.forEach((res, index) => {
      if (res.data) {
        const rel = autoRelations[index];
        const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
        const map = {};
        list.forEach(item => {
          const id = item.id ?? item.Id ?? item.ID;
          const label = getVal(item, "name") || getVal(item, "Name") || String(id);
          map[String(id)] = label;
        });
        maps[rel.field.toLowerCase()] = map;
      }
    });
    return maps;
  }, [lookupQueriesResults, autoRelations]);

  const columns = useMemo(() => {
    if (!schema?.properties) return [];
    return Object.keys(schema.properties).filter(key => {
      const prop = schema.properties[key];
      if (prop["x-identity"]) return false;
      if (prop.type === "object" || prop.type === "array") return !!prop["x-relation"];
      return true;
    });
  }, [schema]);

  return (
    <div style={{ padding: '10px' }}>
      {editingId !== null && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
          <div style={{ 
            width: '100%', maxWidth: '1000px', padding: '20px', border: '1px solid #ddd', 
            borderRadius: '8px', backgroundColor: '#f4f4f4', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
          }}>
            <AutoForm 
              id={editingId === "new" ? undefined : editingId} 
              action={editingId === "new" ? "create" : "edit"}
              schema={schema} resource={resource} record={selectedRecord} 
              onCancel={() => setEditingId(null)} relations={autoRelations}
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
        <Grid data={records} style={{ height: '400px' }} onRowClick={(e) => { 
          const idKey = Object.keys(schema.properties).find(k => schema.properties[k]["x-identity"]) || "id";
          setEditingId(getVal(e.dataItem, idKey)); 
          setSelectedRecord(e.dataItem); 
        }}>
          {columns.map(col => {
            const prop = schema.properties[col];
            const dataKey = col.charAt(0).toLowerCase() + col.slice(1);
            const relationResource = prop["x-relation"];
            
            // 헤더명 결정: x-relation이 있으면 해당 리소스명 사용, 아니면 컬럼명 사용
            const title = relationResource ? relationResource.replace(/s$/, "").toUpperCase() : col.toUpperCase();

            const CustomCell = (cellProps) => (
              <LookupDataCell {...cellProps} lookups={lookups} originalCol={col} />
            );

            return (
              <GridColumn 
                key={col} field={dataKey} title={title} 
                cells={relationResource ? { data: CustomCell } : undefined}
              />
            );
          })}
        </Grid>
      )}
    </div>
  );
};

export default AutoManager;
