import React, { useState, useMemo } from "react";
import { List as RefineList } from "@refinedev/mui";
import { useQuery, useQueries } from "@tanstack/react-query";
import { GraphQLClient, gql } from "graphql-request";
import axios from "axios";
import { 
  Box, 
  CircularProgress, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import GraphQLAutoForm from "./GraphQLAutoForm";

/**
 * GraphQLAutoManager Component
 * Dynamically fetches schema and data via GraphQL to build a CRUD interface.
 */
const GraphQLAutoManager = ({ resource, entityName, relations = [] }) => {
  // State for tracking which item is being edited, or "new" for creation
  const [editingId, setEditingId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Initialize GraphQL client with absolute URL for proxy compatibility
  const client = useMemo(() => new GraphQLClient(window.location.origin + "/graphql"), []);

  /**
   * Helper: Converts string to camelCase.
   */
  const toCamelCase = (str) => str.charAt(0).toLowerCase() + str.slice(1);
  
  /**
   * Helper: Handles pluralization for GraphQL query naming conventions.
   * Special case for 'y' -> 'ies' (e.g., Category -> categories).
   */
  const toPluralCamelCase = (name) => {
      const camel = name.charAt(0).toLowerCase() + name.slice(1);
      if (camel.endsWith("s")) return camel; 
      if (camel.endsWith("y")) return camel.slice(0, -1) + "ies";
      return camel + "s";
  };

  /**
   * Section 1: Schema Fetching
   * Retrieves the JSON Schema from the backend to define the form and table structure.
   */
  const { data: schema, isLoading: isSchemaLoading, error: schemaError } = useQuery({
    queryKey: ["gql-schema", entityName, "rjsf"],
    queryFn: async () => {
      const query = gql`
        query GetSchema($name: String!, $proto: String!) {
          jsonSchema(entityName: $name, protocol: $proto)
        }
      `;
      const response = await client.request(query, { name: entityName, proto: "rjsf" });
      return JSON.parse(response.jsonSchema);
    }
  });

  /**
   * Section 2: Dynamic Query Generation
   * Generates a GraphQL query string based on the properties defined in the JSON Schema.
   */
  const dynamicQuery = useMemo(() => {
    if (!schema || !schema.properties) return null;
    const fields = Object.keys(schema.properties)
        .filter(key => !["category", "products", "Category", "Products"].includes(key.toLowerCase()))
        .map(key => toCamelCase(key))
        .join("\n");
    const queryName = toPluralCamelCase(entityName);
    return `query { ${queryName} { items { ${fields} } totalCount } }`;
  }, [schema, entityName]);

  /**
   * Section 3: Data Fetching (Main List)
   * Fetches the actual entity records using the dynamically generated query.
   */
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

  /**
   * Section 4: Relational Data Lookup
   * Parallel fetching of labels for foreign key fields (e.g., Category names).
   */
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
        items.forEach(item => {
          map[item.id] = item[labelField] || item.name || item.id;
        });
        return map;
      }
    }))
  });

  // Combine lookup results into a single mapping object
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

  if (isSchemaLoading) return <Box sx={{ textAlign: 'center', p: 5 }}><CircularProgress /></Box>;
  if (schemaError) return <Typography color="error">Schema Error: {schemaError.message}</Typography>;

  // Filter columns to display based on schema (excluding navigation properties)
  const columns = schema?.properties ? Object.keys(schema.properties).filter(key => 
    !["category", "products", "Category", "Products"].includes(key.toLowerCase())
  ) : [];

  return (
    <Box sx={{ p: 2 }}>
      {/* Dynamic Form for Create/Edit */}
      {editingId !== null && (
        <GraphQLAutoForm 
          id={editingId === "new" ? undefined : editingId} 
          action={editingId === "new" ? "create" : "edit"}
          schema={schema} 
          entityName={entityName} 
          record={selectedRecord} 
          onCancel={() => setEditingId(null)} 
          relations={relations}
        />
      )}

      {/* Main List UI */}
      <RefineList 
        title={`${entityName} Management (GraphQL)`}
        headerButtons={
          <>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetchData()} sx={{ mr: 1 }}>Refresh</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingId("new"); setSelectedRecord(null); }}>Create New</Button>
          </>
        }
      >
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {columns.map(col => <TableCell key={col}>{col.toUpperCase()}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {isListLoading ? (
                <TableRow><TableCell colSpan={columns.length} align="center"><CircularProgress size={20} /></TableCell></TableRow>
              ) : records.length === 0 ? (
                <TableRow><TableCell colSpan={columns.length || 1} align="center">No data found</TableCell></TableRow>
              ) : (
                records.map((row) => {
                  const id = row.id ?? row.Id;
                  return (
                    <TableRow 
                      key={id} 
                      hover 
                      onClick={() => { setEditingId(id); setSelectedRecord(row); }} 
                      style={{ cursor: 'pointer' }}
                      selected={editingId === id}
                    >
                      {columns.map(col => {
                        const val = row[toCamelCase(col)] ?? row[col];
                        const lookupMap = lookups[col.toLowerCase()];
                        const displayVal = (lookupMap && val !== undefined) ? lookupMap[val] : undefined;
                        
                        return <TableCell key={col}>{displayVal ?? String(val ?? "")}</TableCell>;
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </RefineList>
    </Box>
  );
};

export default GraphQLAutoManager;
