import React, { useState, useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { GraphQLClient, gql } from "graphql-request";
import axios from "axios";
import pluralize from "pluralize";
import { Grid, GridColumn } from "@progress/kendo-react-grid";
import { Button } from "@progress/kendo-react-buttons";
import { Loader } from "@progress/kendo-react-indicators";
import { plusIcon, arrowRotateCwIcon } from "@progress/kendo-svg-icons";
import { SvgIcon } from "@progress/kendo-react-common";
import GraphQLAutoForm from "./GraphQLAutoForm";

const toCamelCase = (str) => str.charAt(0).toLowerCase() + str.slice(1);

const getVal = (obj, key) => {
  if (!obj || !key) return undefined;
  const targetKey = key.toLowerCase();
  const actualKey = Object.keys(obj).find(k => k.toLowerCase() === targetKey);
  return actualKey ? obj[actualKey] : undefined;
};

/**
 * Modern KendoReact Custom Data Cell for GraphQL RJSF
 */
const GraphQLLookupDataCell = (props) => {
  const { dataItem, field, lookups, originalCol } = props;
  const val = dataItem[field] ?? dataItem[originalCol];
  const lookupKey = originalCol.toLowerCase();
  const lookupMap = lookups[lookupKey];
  const displayVal = lookupMap ? (lookupMap[val] || lookupMap[String(val)]) : null;
  const finalDisplay = displayVal ?? String(val ?? "");
  return <td {...props.tdProps}>{finalDisplay}</td>;
};

const GraphQLAutoManager = ({ entityName }) => {
  const [editingId, setEditingId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const client = useMemo(() => new GraphQLClient(window.location.origin + "/graphql"), []);

  const toPluralCamelCase = (name) => toCamelCase(pluralize(name));

  const { data: schema, isLoading: isSchemaLoading, error: schemaError } = useQuery({
    queryKey: ["gql-schema", entityName, "rjsf"],
    queryFn: async () => {
      const query = gql`query GetSchema($name: String!, $proto: String!) { jsonSchema(entityName: $name, protocol: $proto) }`;
      const response = await client.request(query, { name: entityName, proto: "rjsf" });
      return JSON.parse(response.jsonSchema);
    }
  });

  const autoRelations = useMemo(() => {
    if (!schema?.properties) return [];
    return Object.entries(schema.properties)
      .filter(([_, prop]) => prop["x-relation"])
      .map(([key, prop]) => ({
        field: key,
        resource: prop["x-relation"]
      }));
  }, [schema]);

  const dynamicQuery = useMemo(() => {
    if (!schema || !schema.properties) return null;
    const fields = Object.keys(schema.properties)
        .filter(key => {
            const prop = schema.properties[key];
            return !prop["x-identity"] && (prop.type !== "object" && prop.type !== "array" || !!prop["x-relation"]);
        })
        .map(key => toCamelCase(key))
        .join("\n");
    const queryName = toPluralCamelCase(entityName);
    return `query { ${queryName} { items { id ${fields} } totalCount } }`;
  }, [schema, entityName]);

  const { data: listResponse, refetch: refetchData } = useQuery({
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
    queries: autoRelations.map(rel => ({
      queryKey: ["gql-lookup", rel.resource],
      queryFn: async () => {
        const qName = toPluralCamelCase(pluralize.singular(rel.resource));
        const query = `query { ${qName} { items { id name } } }`;
        const res = await axios.post("/graphql", { query });
        const items = res.data?.data?.[qName]?.items || [];
        const map = {};
        items.forEach(item => { map[String(item.id)] = item.name || String(item.id); });
        return map;
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

  if (isSchemaLoading) return <div style={{ textAlign: 'center', padding: '50px' }}><Loader size="large" type="pulsing" /></div>;
  if (schemaError) return <div style={{ color: 'red' }}>Schema Error: {schemaError.message}</div>;

  const columns = schema?.properties ? Object.keys(schema.properties).filter(key => {
    const prop = schema.properties[key];
    return !prop["x-identity"] && (prop.type !== "object" && prop.type !== "array" || !!prop["x-relation"]);
  }) : [];

  return (
    <div style={{ padding: '10px' }}>
      {editingId !== null && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
          <div style={{ 
            width: '100%', maxWidth: '1000px', padding: '20px', border: '1px solid #ddd', 
            borderRadius: '8px', backgroundColor: '#f4f4f4', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
          }}>
            <GraphQLAutoForm 
              id={editingId === "new" ? undefined : editingId} 
              action={editingId === "new" ? "create" : "edit"}
              schema={schema} entityName={entityName} record={selectedRecord} 
              onCancel={() => setEditingId(null)} relations={autoRelations}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>{entityName} List (GraphQL)</h3>
        <div>
          <Button fillMode="outline" onClick={() => refetchData()} style={{ marginRight: '10px' }}>
            <SvgIcon icon={arrowRotateCwIcon} /> Refresh
          </Button>
          <Button themeColor="primary" onClick={() => { setEditingId("new"); setSelectedRecord(null); }}>
            <SvgIcon icon={plusIcon} /> Create New
          </Button>
        </div>
      </div>

      <Grid data={records} style={{ height: '400px' }} onRowClick={(e) => { 
        const idKey = Object.keys(schema.properties).find(k => schema.properties[k]["x-identity"]) || "id";
        setEditingId(getVal(e.dataItem, idKey)); 
        setSelectedRecord(e.dataItem); 
      }}>
        {columns.map(col => {
          const prop = schema.properties[col];
          const field = toCamelCase(col);
          const relationResource = prop["x-relation"];
          
          const title = relationResource ? relationResource.replace(/s$/, "").toUpperCase() : col.toUpperCase();

          const CustomCell = (cellProps) => <GraphQLLookupDataCell {...cellProps} lookups={lookups} originalCol={col} />;

          return (
            <GridColumn key={col} field={field} title={title} cells={relationResource ? { data: CustomCell } : undefined} />
          );
        })}
      </Grid>
    </div>
  );
};

export default GraphQLAutoManager;
