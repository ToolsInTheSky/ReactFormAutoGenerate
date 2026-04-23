import React, { useState, useEffect } from "react";
import { Edit, Create, List as RefineList } from "@refinedev/mui";
import { useForm, useList } from "@refinedev/core";
import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  IconButton,
  Tabs,
  Tab,
  Alert
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";

// Helper to get value from object case-insensitively
const getVal = (obj, key) => {
  if (!obj) return "";
  const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
  return foundKey ? String(obj[foundKey] ?? "") : "";
};

// 1. Generic Form Component
const AutoForm = ({ id, action, onCancel, schema, resource, onRefetch }) => {
  const formRef = React.useRef(null);
  const { onFinish, queryResult, saveButtonProps, formLoading } = useForm({
    action: action,
    resource: resource,
    id: id,
    onMutationSuccess: () => {
      console.log(`${resource} mutation successful!`);
      if (onRefetch) onRefetch();
      onCancel();
    },
  });

  const initialData = queryResult?.data?.data;

  // Schema & Data Cleaning
  const cleanedSchema = schema ? JSON.parse(JSON.stringify(schema)) : null;
  const idKey = cleanedSchema?.properties ? Object.keys(cleanedSchema.properties).find(k => k.toLowerCase() === "id") : null;

  if (cleanedSchema && cleanedSchema.properties) {
    if (action === "create" && idKey) delete cleanedSchema.properties[idKey];
    delete cleanedSchema.properties.category;
    delete cleanedSchema.properties.products;
    delete cleanedSchema.properties.Category; 
    delete cleanedSchema.properties.Products;

    Object.keys(cleanedSchema.properties).forEach(key => {
      const prop = cleanedSchema.properties[key];
      if (!prop.title) prop.title = key.charAt(0).toUpperCase() + key.slice(1);
      if (Array.isArray(prop.type)) prop.type = prop.type.find(t => t !== "null") || "string";
    });
  }

  const finalData = {};
  if (cleanedSchema && cleanedSchema.properties) {
    Object.keys(cleanedSchema.properties).forEach(key => {
      const prop = cleanedSchema.properties[key];
      const val = initialData ? (initialData[key] ?? initialData[key.charAt(0).toLowerCase() + key.slice(1)]) : undefined;
      
      if (key.toLowerCase() === "id" && action === "edit") {
        finalData[key] = val ?? id;
      } else if (val === null || val === undefined) {
        finalData[key] = (prop.type === "number" || prop.type === "integer") ? 0 : "";
      } else {
        finalData[key] = val;
      }
    });
  }

  if (formLoading || !cleanedSchema) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;

  const FormWrapper = action === "create" ? Create : Edit;
  const uiSchema = { "ui:submitButtonOptions": { "norender": true } };
  if (idKey && action === "edit") uiSchema[idKey] = { "ui:readonly": true };

  return (
    <Box sx={{ mb: 4 }}>
      <FormWrapper 
        saveButtonProps={{
            ...saveButtonProps,
            onClick: (e) => {
                if (e && e.preventDefault) e.preventDefault();
                if (formRef.current) formRef.current.submit();
            }
        }} 
        title={action === "create" ? `Create New ${resource}` : `Edit ${resource} #${id}`}
        headerButtons={<IconButton onClick={onCancel}><CloseIcon /></IconButton>}
      >
        <Form
          ref={formRef}
          schema={cleanedSchema}
          uiSchema={uiSchema}
          validator={validator}
          formData={finalData}
          onSubmit={({ formData }) => onFinish(formData)}
          onError={(errors) => console.error("Validation Errors:", errors)}
          children={<></>} 
        />
      </FormWrapper>
    </Box>
  );
};

// 2. Generic Manager Component (List + Form)
export const AutoManager = ({ resource, schemaKey }) => {
  const [editingId, setEditingId] = useState(null);
  const [schema, setSchema] = useState(null);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecords = () => {
    setIsLoading(true);
    fetch(`/api/${resource}`)
      .then(res => res.json())
      .then(data => {
        console.log(`[${resource}] Records received:`, data);
        setRecords(Array.isArray(data) ? data : (data.data || []));
      })
      .catch(err => console.error(`[${resource}] Fetch error:`, err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    // 1. Fetch Schema
    fetch(`/api/schema/${schemaKey}`)
      .then(res => res.json())
      .then(data => setSchema(data));
    
    // 2. Fetch Records
    fetchRecords();
  }, [schemaKey, resource]);

  const columns = schema?.properties ? Object.keys(schema.properties).filter(key => 
    !["category", "products", "Category", "Products"].includes(key.toLowerCase())
  ) : [];

  return (
    <Box sx={{ p: 2 }}>
      {editingId !== null && (
        <AutoForm 
          id={editingId === "new" ? undefined : editingId}
          action={editingId === "new" ? "create" : "edit"}
          schema={schema}
          resource={resource}
          onCancel={() => setEditingId(null)}
          onRefetch={() => fetchRecords()}
        />
      )}

      <RefineList 
        title={`${resource} Management`}
        headerButtons={
          <>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => fetchRecords()} sx={{ mr: 1 }}>
              Refresh
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditingId("new")}>
              Create New
            </Button>
          </>
        }
      >
        {records.length === 0 && !isLoading && (
            <Alert severity="info" sx={{ mb: 2 }}>
                No records found. Check console for "useList Raw Data".
            </Alert>
        )}
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {columns.map(col => <TableCell key={col}>{col.toUpperCase()}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={columns.length || 1} align="center"><CircularProgress size={20} /></TableCell></TableRow>
              ) : records.length === 0 ? (
                <TableRow><TableCell colSpan={columns.length || 1} align="center">No row found</TableCell></TableRow>
              ) : (
                records.map((row) => (
                  <TableRow 
                    key={getVal(row, "id")} 
                    hover 
                    onClick={() => setEditingId(getVal(row, "id"))}
                    style={{ cursor: 'pointer' }}
                    selected={editingId === getVal(row, "id")}
                  >
                    {columns.map(col => <TableCell key={col}>{getVal(row, col)}</TableCell>)}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </RefineList>
    </Box>
  );
};

// 3. Usage Example with Navigation
export const RefineRjsfExample = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} aria-label="management tabs">
          <Tab label="Products" />
          <Tab label="Categories" />
        </Tabs>
      </Box>

      <Box key={activeTab}>
        {activeTab === 0 && <AutoManager resource="products" schemaKey="product" />}
        {activeTab === 1 && <AutoManager resource="categories" schemaKey="category" />}
      </Box>
    </Box>
  );
};
