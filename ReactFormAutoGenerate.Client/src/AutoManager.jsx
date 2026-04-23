import React, { useState, useMemo } from "react";
import { List as RefineList } from "@refinedev/mui";
import { useQuery } from "@tanstack/react-query";
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
  Paper
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import AutoForm from "./AutoForm";

const api = axios.create({ baseURL: "/api" });

/**
 * Helper to get value from object case-insensitively.
 */
const getVal = (obj, key) => {
  if (!obj) return "";
  const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
  return foundKey ? obj[foundKey] : "";
};

/**
 * AutoManager Component
 * Provides a complete CRUD dashboard for a specific resource.
 * It combines a data table for listing and the AutoForm for creation/editing.
 */
const AutoManager = ({ resource, schemaKey, relations = [] }) => {
  // --- 1. State Management ---
  const [editingId, setEditingId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // --- 2. Data Fetching (React Query) ---
  
  // Fetch the JSON Schema for the current entity
  const { data: schema } = useQuery({
    queryKey: ["schema", schemaKey],
    queryFn: () => api.get(`/schema/${schemaKey}`).then(res => res.data)
  });

  // Fetch all records for the list view
  const { data: recordsRaw, isLoading, refetch } = useQuery({
    queryKey: [resource],
    queryFn: () => api.get(`/${resource}`).then(res => res.data)
  });

  const records = useMemo(() => Array.isArray(recordsRaw) ? recordsRaw : (recordsRaw?.data || []), [recordsRaw]);

  // Fetch labels for foreign key fields (e.g., displaying Category Name instead of ID)
  const lookupQueries = relations.map(rel => ({
    field: rel.field.toLowerCase(),
    query: useQuery({
      queryKey: [rel.resource],
      queryFn: () => api.get(`/${rel.resource}`).then(res => res.data),
      select: (data) => {
        const list = Array.isArray(data) ? data : (data.data || []);
        const map = {};
        list.forEach(item => {
          map[item.id || item.Id || item.ID] = item[rel.labelField] || item.Name || item.name;
        });
        return map;
      }
    })
  }));

  const lookups = useMemo(() => {
    const maps = {};
    lookupQueries.forEach(lq => { if (lq.query.data) maps[lq.field] = lq.query.data; });
    return maps;
  }, [lookupQueries.map(lq => lq.query.data)]);

  // --- 3. Dynamic Column Generation ---
  // Exclude navigation properties from the table columns
  const columns = schema?.properties ? Object.keys(schema.properties).filter(key => 
    !["category", "products", "Category", "Products"].includes(key.toLowerCase())
  ) : [];

  return (
    <Box sx={{ p: 2 }}>
      {/* --- 4. Dynamic Form Section --- */}
      {editingId !== null && (
        <AutoForm id={editingId === "new" ? undefined : editingId} action={editingId === "new" ? "create" : "edit"}
          schema={schema} resource={resource} record={selectedRecord} onCancel={() => setEditingId(null)} relations={relations}
        />
      )}

      {/* --- 5. Data List Section --- */}
      <RefineList title={`${resource} Management`}
        headerButtons={
          <>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()} sx={{ mr: 1 }}>Refresh</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingId("new"); setSelectedRecord(null); }}>Create New</Button>
          </>
        }
      >
        <TableContainer component={Paper}>
          <Table>
            <TableHead><TableRow>{columns.map(col => <TableCell key={col}>{col.toUpperCase()}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={columns.length || 1} align="center"><CircularProgress size={20} /></TableCell></TableRow> :
                records.length === 0 ? <TableRow><TableCell colSpan={columns.length || 1} align="center">No row found</TableCell></TableRow> :
                records.map((row) => (
                  <TableRow 
                    key={String(getVal(row, "id"))} 
                    hover 
                    onClick={() => { setEditingId(getVal(row, "id")); setSelectedRecord(row); }} 
                    style={{ cursor: 'pointer' }} 
                    selected={editingId === getVal(row, "id")}
                  >
                    {columns.map(col => {
                      const val = getVal(row, col);
                      // Display lookup label if available, otherwise raw value
                      return <TableCell key={col}>{lookups[col.toLowerCase()]?.[val] || String(val ?? "")}</TableCell>;
                    })}
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </TableContainer>
      </RefineList>
    </Box>
  );
};

export default AutoManager;
