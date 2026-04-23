import React, { useState, useEffect, useMemo } from 'react';
import { 
    Box, Typography, Paper, CircularProgress, Button, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Collapse, Tooltip, TextField, MenuItem
} from '@mui/material';
import { AutoForm, AutoField, SubmitField, ErrorsField } from 'uniforms-mui';
import { Bridge, connectField } from 'uniforms';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { useNotification } from '@refinedev/core';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';

// Initialize AJV for schema validation
const ajv = new Ajv({ allErrors: true, useDefaults: true, strict: false });
addFormats(ajv);

/**
 * CustomSelectField for Uniforms
 * A custom Material UI select field connected to the Uniforms system.
 */
const CustomSelectField = connectField(({ 
    value, onChange, label, allowedValues, transform, required, error, errorMessage
}) => (
    <TextField
        select fullWidth label={label} value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        error={!!error} helperText={error ? errorMessage : ""}
        required={required} margin="normal" variant="outlined"
    >
        {allowedValues?.map(val => (
            <MenuItem key={val} value={val}>{transform ? transform(val) : val}</MenuItem>
        ))}
    </TextField>
));

/**
 * Robust Bridge for GraphQL + Uniforms
 * Bridges the JSON Schema and the Uniforms form system.
 */
class RobustGraphQLBridge extends Bridge {
    constructor(schema, validator, overrides = {}) {
        super();
        this.schema = schema;
        this.validator = validator;
        this.overrides = overrides; 
    }
    getError(name, error) { return error?.details?.find(e => e.instancePath === `/${name}` || e.params?.missingProperty === name) || null; }
    getErrorMessage(name, error) { return this.getError(name, error)?.message || ''; }
    getErrorMessages(error) { return error?.details?.map(e => e.message) || []; }
    getField(name) { return this.schema.properties[name]; }
    getInitialValue(name) {
        const field = this.getField(name);
        if (this.overrides[name]?.allowedValues?.length > 0) return this.overrides[name].allowedValues[0];
        if (field?.type === 'integer' || field?.type === 'number') return 0;
        return '';
    }
    getProps(name) {
        const field = this.getField(name) || {};
        const override = this.overrides[name] || {};
        return { label: name, required: this.schema.required?.includes(name), ...field, ...override };
    }
    getSubfields(name) {
        const excluded = ['Id', 'Products', 'Category'];
        return name ? [] : Object.keys(this.schema.properties).filter(key => !excluded.includes(key));
    }
    getType(name) {
        const field = this.getField(name);
        if (field?.type === 'integer' || field?.type === 'number') return Number;
        return String;
    }
    getValidator() { return this.validator; }
}

/**
 * GraphQLUniformEntityManager Component
 * Generic manager for handling GraphQL CRUD operations with Uniforms.
 */
export const GraphQLUniformEntityManager = ({ entityName, relations = [] }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const queryClient = useQueryClient();

    /**
     * Helper Utilities for Naming Conventions
     */
    const toCamelCase = (str) => str.charAt(0).toLowerCase() + str.slice(1);
    const toPluralCamelCase = (name) => {
        const camel = name.charAt(0).toLowerCase() + name.slice(1);
        if (camel.endsWith("s")) return camel; 
        if (camel.endsWith("y")) return camel.slice(0, -1) + "ies";
        return camel + "s";
    };

    /**
     * Section 1: Schema Fetching
     * Retrieves the JSON Schema specifically formatted for Uniforms.
     */
    const { data: schema, isLoading: isSchemaLoading, error: schemaError } = useQuery({
        queryKey: ["gql-schema", entityName, "uniforms"],
        queryFn: async () => {
            const query = `query { jsonSchema(entityName: "${entityName}", protocol: "uniforms") }`;
            const res = await axios.post("/graphql", { query });
            return JSON.parse(res.data.data.jsonSchema);
        }
    });

    /**
     * Section 2: Relational Data Lookup
     * Parallel fetching of data for dropdown menus.
     */
    const lookupQueries = useQueries({
        queries: relations.map(rel => ({
            queryKey: ["gql-lookup", rel.resource],
            queryFn: async () => {
                const qName = toPluralCamelCase(rel.resource);
                const labelField = toCamelCase(rel.labelField);
                const query = `query { ${qName} { items { id ${labelField} } } }`;
                const res = await axios.post("/graphql", { query });
                const items = res.data?.data?.[qName]?.items || [];
                return items.map(item => ({
                    value: item.id,
                    label: String(item[labelField] || item.id)
                }));
            }
        }))
    });

    // Transform lookup data into Uniforms select options
    const selectOptions = useMemo(() => {
        const options = {};
        lookupQueries.forEach((res, index) => {
            if (res.data) {
                const rel = relations[index];
                options[rel.field] = {
                    allowedValues: res.data.map(o => o.value),
                    transform: (val) => res.data.find(o => o.value === val)?.label || val
                };
            }
        });
        return options;
    }, [lookupQueries, relations]);

    /**
     * Section 3: Data Fetching (Main List)
     * Dynamically constructs a query to fetch entity records based on schema properties.
     */
    const dynamicQuery = useMemo(() => {
        if (!schema) return null;
        const fields = Object.keys(schema.properties)
            .filter(k => !['Products', 'Category', 'Id'].includes(k))
            .map(toCamelCase).join("\n") + "\nid";
        const qName = toPluralCamelCase(entityName);
        return `query { ${qName} { items { ${fields} } } }`;
    }, [schema, entityName]);

    const { data: listData, isLoading: isListLoading, refetch } = useQuery({
        queryKey: ["gql-data-uniforms", entityName],
        queryFn: async () => {
            const res = await axios.post("/graphql", { query: dynamicQuery });
            return res.data.data[toPluralCamelCase(entityName)].items;
        },
        enabled: !!dynamicQuery
    });

    /**
     * Section 4: Mutation Logic
     * Handles both Create and Update operations using dynamically built mutation strings.
     */
    const mutation = useMutation({
        mutationFn: async (formData) => {
            const isCreate = !selectedId;
            const operation = isCreate ? `Create${entityName}` : `Update${entityName}`;
            
            const argsMap = new Map();
            if (selectedId) argsMap.set("id", selectedId);
            
            Object.keys(formData).forEach(key => {
                const gqlKey = toCamelCase(key);
                if (gqlKey === "id") return; // Explicitly handle id
                
                const val = formData[key];
                if (typeof val === 'number') argsMap.set(gqlKey, val);
                else argsMap.set(gqlKey, `"${val}"`);
            });

            const argsString = Array.from(argsMap.entries())
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ");

            const query = `mutation { ${toCamelCase(operation)}(${argsString}) { id } }`;
            const res = await axios.post("/graphql", { query });
            if (res.data.errors) throw new Error(res.data.errors[0].message);
            return res.data;
        },
        onSuccess: () => {
            // Refresh the data list and close the form on success
            queryClient.invalidateQueries(["gql-data-uniforms"]);
            setIsFormOpen(false);
            setSelectedId(null);
        }
    });

    /**
     * Section 5: Form Bridge and Model Preparation
     */
    const bridge = useMemo(() => {
        if (!schema) return null;
        const validate = ajv.compile(schema);
        const validator = (data) => validate(data) ? null : { details: validate.errors };
        return new RobustGraphQLBridge(schema, validator, selectOptions);
    }, [schema, selectOptions]);

    const formModel = useMemo(() => {
        if (selectedId && listData) {
            const item = listData.find(i => i.id === selectedId);
            if (!item) return {};
            const model = {};
            Object.keys(schema.properties).forEach(key => {
                const val = item[toCamelCase(key)] ?? item[key];
                if (val !== undefined) model[key] = val;
            });
            return model;
        }
        return {};
    }, [selectedId, listData, schema]);

    if (isSchemaLoading) return <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>;
    if (schemaError) return <Alert severity="error">Schema Error: {schemaError.message}</Alert>;

    // List of fields to display (excluding system properties)
    const fields = schema ? Object.keys(schema.properties).filter(k => !['Products', 'Category', 'Id'].includes(k)) : [];

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 2 }}>
                
                {/* Collapsible Form Section */}
                <Collapse in={isFormOpen} sx={{ width: '100%', maxWidth: 600 }}>
                    <Paper sx={{ p: 4, mb: 4, position: 'relative' }}>
                        <IconButton onClick={() => { setIsFormOpen(false); setSelectedId(null); }} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
                        <Typography variant="h6" gutterBottom>{selectedId ? `Edit ${entityName}` : `Add New ${entityName}`}</Typography>
                        {bridge && (
                            <AutoForm schema={bridge} model={formModel} onSubmit={data => mutation.mutate(data)} disabled={mutation.isLoading}>
                                {fields.map(name => selectOptions[name] ? <CustomSelectField key={name} name={name} {...selectOptions[name]} /> : <AutoField key={name} name={name} />)}
                                <ErrorsField /><Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}><SubmitField /></Box>
                            </AutoForm>
                        )}
                    </Paper>
                </Collapse>

                {/* Top Action Bar */}
                <Box sx={{ width: '100%', maxWidth: 800, display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 1 }}>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()}>Refresh</Button>
                    {!isFormOpen && <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setSelectedId(null); setIsFormOpen(true); }}>Create New</Button>}
                </Box>

                {/* Data Table */}
                <Paper sx={{ p: 4, width: '100%', maxWidth: 800 }}>
                    <Typography variant="h6" gutterBottom>{entityName} List (GraphQL + Uniforms)</Typography>
                    <TableContainer>
                        <Table sx={{ minWidth: 400 }}>
                            <TableHead><TableRow><TableCell>ID</TableCell>{fields.map(col => <TableCell key={col}>{col}</TableCell>)}<TableCell align="right">Actions</TableCell></TableRow></TableHead>
                            <TableBody>
                                {isListLoading ? <TableRow><TableCell colSpan={fields.length + 2} align="center"><CircularProgress size={20} /></TableCell></TableRow> :
                                 listData?.length > 0 ? listData.map((row) => (
                                    <TableRow key={row.id} hover onClick={() => { setSelectedId(row.id); setIsFormOpen(true); }} style={{ cursor: 'pointer' }} selected={selectedId === row.id}>
                                        <TableCell>{row.id}</TableCell>
                                        {fields.map(col => {
                                            const val = row[toCamelCase(col)] ?? row[col];
                                            return <TableCell key={col}>{selectOptions[col]?.transform ? selectOptions[col].transform(val) : String(val ?? '')}</TableCell>;
                                        })}
                                        <TableCell align="right"><Tooltip title="Edit"><IconButton size="small"><EditIcon fontSize="small" /></IconButton></Tooltip></TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={fields.length + 2} align="center">No Data Found</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>
        </Box>
    );
};
