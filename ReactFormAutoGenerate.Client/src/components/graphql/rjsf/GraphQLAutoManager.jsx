import React, { useState, useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { GraphQLClient, gql } from "graphql-request";
import axios from "axios";
import { Grid, GridColumn } from "@progress/kendo-react-grid";
import { Button } from "@progress/kendo-react-buttons";
import { Loader } from "@progress/kendo-react-indicators";
import { plusIcon, arrowRotateCwIcon } from "@progress/kendo-svg-icons";
import { SvgIcon } from "@progress/kendo-react-common";
import GraphQLAutoForm from "./GraphQLAutoForm";

const GraphQLAutoManager = ({ entityName, relations = [] }) => {
  const [editingId, setEditingId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const client = useMemo(() => new GraphQLClient(window.location.origin + "/graphql"), []);

  const toCamelCase = (str) => str.charAt(0).toLowerCase() + str.slice(1);
  const toPluralCamelCase = (name) => {
      const camel = name.charAt(0).toLowerCase() + name.slice(1);
      if (camel.endsWith("s")) return camel; 
      if (camel.endsWith("y")) return camel.slice(0, -1) + "ies";
      return camel + "s";
  };

  const { data: schema, isLoading: isSchemaLoading, error: schemaError } = useQuery({
    queryKey: ["gql-schema", entityName, "rjsf"],
    queryFn: async () => {
      const query = gql`query GetSchema($name: String!, $proto: String!) { jsonSchema(entityName: $name, protocol: $proto) }`;
      const response = await client.request(query, { name: entityName, proto: "rjsf" });
      return JSON.parse(response.jsonSchema);
    }
  });

  const dynamicQuery = useMemo(() => {
    if (!schema || !schema.properties) return null;
    const fields = Object.keys(schema.properties)
        .filter(key => !["category", "products", "Category", "Products"].includes(key.toLowerCase()))
        .map(key => toCamelCase(key))
        .join("\n");
    const queryName = toPluralCamelCase(entityName);
    return `query { ${queryName} { items { id ${fields} } totalCount } }`;
  }, [schema, entityName]);

  const { data: listResponse, isLoading: isListLoading, refetch: refetchData } = useQuery({
    queryKey: ["gql-data", entityName, dynamicQuery],
    queryFn: async () => {
        const res = await axios.post("/graphql", { query: dynamicQuery });
        if (res.data.errors) throw new Error(res.data.errors[0].message);
        return res.data;
    },
    enabled: !!dynamicQuery
  });

  const queryNamePlural = useMemo(() => toPluralCamelCase(entityName), [entityName]);
  const records = useMemo(() => listResponse?.data?.[queryNamePlural]?.items || [], [listResponse, queryNamePlural]);

  const lookupQueriesResults = useQueries({
    queries: relations.map(rel => ({
      queryKey: ["gql-lookup", rel.resource],
      queryFn: async () => {
        const qName = toPluralCamelCase(rel.resource);
        const labelField = toCamelCase(rel.labelField);
        const query = `query { ${qName} { items { id ${labelField} } } }`;
        const res = await axios.post("/graphql", { query });
        const items = res.data?.data?.[qName]?.items || [];
        const map = {};
        items.forEach(item => { map[item.id] = item[labelField] || item.name || item.id; });
        return map;
      }
    }))
  });

  const lookups = useMemo(() => {
    const maps = {};
    lookupQueriesResults.forEach((res, index) => {
      if (res.data) {
        const field = relations[index].field.toLowerCase();
        maps[field] = res.data;
      }
    });
    return maps;
  }, [lookupQueriesResults, relations]);

  if (isSchemaLoading) return <div style={{ textAlign: 'center', padding: '50px' }}><Loader size="large" type="pulsing" /></div>;
  if (schemaError) return <div style={{ color: 'red' }}>Schema Error: {schemaError.message}</div>;

  const columns = schema?.properties ? Object.keys(schema.properties).filter(key => 
    !["category", "products", "Category", "Products"].includes(key.toLowerCase())
  ) : [];

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
            <GraphQLAutoForm 
              id={editingId === "new" ? undefined : editingId} 
              action={editingId === "new" ? "create" : "edit"}
              schema={schema} entityName={entityName} record={selectedRecord} onCancel={() => setEditingId(null)} relations={relations}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>{entityName} Management (GraphQL)</h3>
        <div>
          <Button fillMode="outline" onClick={() => refetchData()} style={{ marginRight: '10px' }}>
            <SvgIcon icon={arrowRotateCwIcon} /> Refresh
          </Button>
          <Button themeColor="primary" onClick={() => { setEditingId("new"); setSelectedRecord(null); }}>
            <SvgIcon icon={plusIcon} /> Create New
          </Button>
        </div>
      </div>

      <Grid data={records} style={{ height: '400px' }} onRowClick={(e) => { setEditingId(e.dataItem.id || e.dataItem.Id); setSelectedRecord(e.dataItem); }}>
        {columns.map(col => (
          <GridColumn key={col} field={toCamelCase(col)} title={col.toUpperCase()} cell={(props) => {
            const dataItem = props.dataItem;
            const field = toCamelCase(col);
            const val = dataItem[field] ?? dataItem[col];
            const displayVal = lookups[col.toLowerCase()]?.[val] ?? String(val ?? "");
            return (
              <td style={props.style} className={props.className}>
                {displayVal}
              </td>
            );
          }} />
        ))}
      </Grid>
    </div>
  );
};

export default GraphQLAutoManager;
