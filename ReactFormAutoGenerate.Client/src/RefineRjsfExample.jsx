import React, { useState, useEffect, useMemo } from "react";
import { Edit, Create, List as RefineList } from "@refinedev/mui";
import { useForm } from "@refinedev/core";
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
  return foundKey ? obj[foundKey] : "";
};

// 1. Generic Form Component with Relation Support
const AutoForm = ({ id, action, onCancel, schema, resource, onRefetch, relations = [], record = null }) => {
  const formRef = React.useRef(null);
  const [relOptions, setRelOptions] = useState({});
  const [isRelLoading, setIsRelLoading] = useState(false);

  const { onFinish, queryResult, saveButtonProps, formLoading } = useForm({
    action: action,
    resource: resource,
    id: id,
    onMutationSuccess: () => {
      if (onRefetch) onRefetch();
      onCancel();
    },
  });

  // Fetch relational data
  useEffect(() => {
    if (relations.length > 0) {
      setIsRelLoading(true);
      const fetchAll = relations.map(rel => 
        fetch(`/api/${rel.resource}`)
          .then(res => res.json())
          .then(data => ({
            field: rel.field.toLowerCase(),
            options: (Array.isArray(data) ? data : (data.data || [])).map(item => ({
              const: item.id || item.Id || item.ID,
              title: String(item[rel.labelField] || item.Name || item.name || item.id)
            }))
          }))
          .catch(err => {
              console.error(`Failed to fetch relation ${rel.resource}:`, err);
              return { field: rel.field.toLowerCase(), options: [] };
          })
      );

      Promise.all(fetchAll).then(results => {
        const newOptions = {};
        results.forEach(r => { newOptions[r.field] = r.options; });
        setRelOptions(newOptions);
        setIsRelLoading(false);
      });
    }
  }, [JSON.stringify(relations)]);

  // Process Schema
  const cleanedSchema = useMemo(() => {
    if (!schema) return null;
    const s = JSON.parse(JSON.stringify(schema));
    
    if (s.properties) {
      const idKey = Object.keys(s.properties).find(k => k.toLowerCase() === "id");
      if (action === "create" && idKey) delete s.properties[idKey];
      
      ["category", "products", "Category", "Products"].forEach(p => delete s.properties[p]);

      Object.keys(s.properties).forEach(key => {
        const prop = s.properties[key];
        const lowerKey = key.toLowerCase();
        if (!prop.title) prop.title = key.charAt(0).toUpperCase() + key.slice(1);
        
        if (relOptions[lowerKey] && relOptions[lowerKey].length > 0) {
          prop.oneOf = relOptions[lowerKey];
          if (Array.isArray(prop.type)) {
              prop.type = prop.type.find(t => t !== "null") || "integer";
          }
        } else {
          if (Array.isArray(prop.type)) prop.type = prop.type.find(t => t !== "null") || "string";
        }
      });
    }
    return s;
  }, [schema, relOptions, action]);

  // Map data to form: Prefer passed record, then fallback to Refine query result
  const finalData = useMemo(() => {
    const data = {};
    if (cleanedSchema && cleanedSchema.properties) {
      const sourceData = record || queryResult?.data?.data;
      
      Object.keys(cleanedSchema.properties).forEach(key => {
        const prop = cleanedSchema.properties[key];
        const val = sourceData ? getVal(sourceData, key) : undefined;
        
        if (key.toLowerCase() === "id" && action === "edit") {
          const idVal = val !== "" ? val : id;
          data[key] = typeof idVal === 'string' ? parseInt(idVal, 10) : idVal;
        } else if (val === "" || val === undefined || val === null) {
          data[key] = (prop.type === "number" || prop.type === "integer") ? 0 : "";
        } else {
          if (prop.type === "number" || prop.type === "integer") {
              data[key] = Number(val);
          } else {
              data[key] = val;
          }
        }
      });
    }
    return data;
  }, [cleanedSchema, record, queryResult?.data?.data, id, action]);

  if (formLoading || !cleanedSchema || isRelLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }

  const FormWrapper = action === "create" ? Create : Edit;
  const uiSchema = { "ui:submitButtonOptions": { "norender": true } };

  if (cleanedSchema.properties) {
      Object.keys(cleanedSchema.properties).forEach(key => {
          if (key.toLowerCase() === "id" && action === "edit") {
              uiSchema[key] = { "ui:readonly": true };
          }
          if (relOptions[key.toLowerCase()]) {
              uiSchema[key] = { "ui:widget": "select" };
          }
      });
  }

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
export const AutoManager = ({ resource, schemaKey, relations = [] }) => {
  const [editingId, setEditingId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [schema, setSchema] = useState(null);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lookups, setLookups] = useState({});

  const fetchRecords = () => {
    setIsLoading(true);
    fetch(`/api/${resource}`)
      .then(res => res.json())
      .then(data => {
        setRecords(Array.isArray(data) ? data : (data.data || []));
      })
      .catch(err => console.error(`[${resource}] Fetch error:`, err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetch(`/api/schema/${schemaKey}`)
      .then(res => res.json())
      .then(data => setSchema(data));
    fetchRecords();
  }, [schemaKey, resource]);

  useEffect(() => {
    if (relations.length > 0) {
      relations.forEach(rel => {
        fetch(`/api/${rel.resource}`)
          .then(res => res.json())
          .then(data => {
            const list = Array.isArray(data) ? data : (data.data || []);
            const map = {};
            list.forEach(item => {
              const id = item.id || item.Id || item.ID;
              map[id] = item[rel.labelField] || item.Name || item.name;
            });
            setLookups(prev => ({ ...prev, [rel.field.toLowerCase()]: map }));
          });
      });
    }
  }, [JSON.stringify(relations)]);

  const columns = schema?.properties ? Object.keys(schema.properties).filter(key => 
    !["category", "products", "Category", "Products"].includes(key.toLowerCase())
  ) : [];

  const handleRowClick = (row) => {
    const id = getVal(row, "id");
    setEditingId(id);
    setSelectedRecord(row);
  };

  const handleCreateClick = () => {
    setEditingId("new");
    setSelectedRecord(null);
  };

  const renderCell = (row, col) => {
    const val = getVal(row, col);
    const lookup = lookups[col.toLowerCase()];
    if (lookup && lookup[val]) {
        return lookup[val];
    }
    return String(val ?? "");
  };

  return (
    <Box sx={{ p: 2 }}>
      {editingId !== null && (
        <AutoForm 
          id={editingId === "new" ? undefined : editingId}
          action={editingId === "new" ? "create" : "edit"}
          schema={schema}
          resource={resource}
          record={selectedRecord}
          onCancel={() => setEditingId(null)}
          onRefetch={() => fetchRecords()}
          relations={relations}
        />
      )}

      <RefineList 
        title={`${resource} Management`}
        headerButtons={
          <>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => fetchRecords()} sx={{ mr: 1 }}>
              Refresh
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateClick}>
              Create New
            </Button>
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
              {isLoading ? (
                <TableRow><TableCell colSpan={columns.length || 1} align="center"><CircularProgress size={20} /></TableCell></TableRow>
              ) : records.length === 0 ? (
                <TableRow><TableCell colSpan={columns.length || 1} align="center">No row found</TableCell></TableRow>
              ) : (
                records.map((row) => (
                  <TableRow 
                    key={String(getVal(row, "id"))} 
                    hover 
                    onClick={() => handleRowClick(row)}
                    style={{ cursor: 'pointer' }}
                    selected={editingId === getVal(row, "id")}
                  >
                    {columns.map(col => <TableCell key={col}>{renderCell(row, col)}</TableCell>)}
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
        {activeTab === 0 && (
          <AutoManager 
            resource="products" 
            schemaKey="product" 
            relations={[
              { field: "CategoryId", resource: "categories", labelField: "Name" }
            ]}
          />
        )}
        {activeTab === 1 && <AutoManager resource="categories" schemaKey="category" />}
      </Box>
    </Box>
  );
};
