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
import { useCreate, useNotification, useList, useInvalidate, useUpdate } from '@refinedev/core';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

// Initialize AJV for schema validation
const ajv = new Ajv({ allErrors: true, useDefaults: true, strict: false });
addFormats(ajv);

/**
 * CustomSelectField
 * A custom selection component that filters props to prevent DOM warnings.
 * Used for foreign key relationships (e.g., CategoryId in Product).
 */
const CustomSelectField = connectField(({ 
    value, 
    onChange, 
    label, 
    allowedValues, 
    transform, 
    required, 
    error, 
    showInlineError, 
    errorMessage,
    ...props 
}) => (
    <TextField
        select
        fullWidth
        label={label}
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        error={!!error}
        helperText={error ? errorMessage : ""}
        required={required}
        margin="normal"
        variant="outlined"
    >
        {allowedValues?.map(val => (
            <MenuItem key={val} value={val}>
                {transform ? transform(val) : val}
            </MenuItem>
        ))}
    </TextField>
));

/**
 * RobustCustomBridge
 * A custom Uniforms bridge to handle JSON Schema and AJV validation.
 * It provides field metadata, types, and validation logic to the form.
 */
class RobustCustomBridge extends Bridge {
    constructor(schema, validator, overrides = {}) {
        super();
        this.schema = schema;
        this.validator = validator;
        this.overrides = overrides; 
    }

    getError(name, error) {
        return error?.details?.find(e => e.instancePath === `/${name}` || e.params?.missingProperty === name) || null;
    }

    getErrorMessage(name, error) {
        return this.getError(name, error)?.message || '';
    }

    getErrorMessages(error) {
        return error?.details?.map(e => e.message) || [];
    }

    getField(name) {
        return this.schema.properties[name];
    }

    getInitialValue(name) {
        const field = this.getField(name);
        if (this.overrides[name]?.allowedValues?.length > 0) return this.overrides[name].allowedValues[0];
        if (field?.type === 'integer' || field?.type === 'number') return 0;
        return '';
    }

    getProps(name) {
        const field = this.getField(name) || {};
        const override = this.overrides[name] || {};
        
        return {
            label: name,
            required: this.schema.required?.includes(name),
            ...field,
            ...override
        };
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

    getValidator() {
        return this.validator;
    }
}

/**
 * UniformEntityManager Component
 * Generic manager for handling CRUD operations on any resource using JSON Schema.
 * It automatically generates forms based on the schema and displays data in a table.
 */
export const UniformEntityManager = ({ resource, schemaUrl, title, selectOptions = {} }) => {
    // Component State
    const [schema, setSchema] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [rawApiData, setRawApiData] = useState([]); // Backup data for when Refine list is empty

    // Refine Hooks
    const { mutate: createMutation, isLoading: isCreating } = useCreate();
    const { mutate: updateMutation, isLoading: isUpdating } = useUpdate();
    const invalidate = useInvalidate();
    const { open } = useNotification();
    
    // Fetch resource list via Refine
    const { data: listData, isLoading: isListLoading } = useList({
        resource: resource,
    });

    /**
     * Refreshes the data list by invalidating cache and re-fetching raw API data
     */
    const handleRefresh = () => {
        invalidate({ resource, invalidates: ["list", "detail"] });
        fetchBackupData();
    };

    /**
     * Fallback fetch directly from API to ensure data is displayed
     */
    const fetchBackupData = () => {
        fetch(`/api/${resource}`)
            .then(res => res.json())
            .then(data => setRawApiData(Array.isArray(data) ? data : []))
            .catch(err => console.error(`DEBUG: Manual fetch error for ${resource}:`, err));
    };

    /**
     * Consolidate entities from Refine or backup source
     */
    const entities = useMemo(() => {
        if (listData?.data && Array.isArray(listData.data)) return listData.data;
        return rawApiData;
    }, [listData, rawApiData]);

    /**
     * Prepares the form model when editing an existing entity
     */
    const formModel = useMemo(() => {
        if (selectedId) {
            const item = entities.find(e => (e.id || e.Id) === selectedId);
            if (!item) return {};
            const mapped = {};
            if (schema?.properties) {
                Object.keys(schema.properties).forEach(key => {
                    const value = item[key] !== undefined ? item[key] : item[key.charAt(0).toLowerCase() + key.slice(1)];
                    if (value !== undefined) mapped[key] = value;
                });
            }
            return mapped;
        }
        return {};
    }, [selectedId, entities, schema]);

    // Initial data and schema fetch
    useEffect(() => {
        fetchBackupData();
        fetch(schemaUrl)
            .then(res => res.json())
            .then(data => {
                setSchema(data);
                setLoading(false);
            })
            .catch(err => {
                setFetchError(err.message);
                setLoading(false);
            });
    }, [schemaUrl]);

    /**
     * Creates a bridge between the JSON schema and Uniforms form
     */
    const bridge = useMemo(() => {
        if (!schema) return null;
        const validate = ajv.compile(schema);
        const validator = (data) => {
            const valid = validate(data);
            if (valid) return null;
            return { details: validate.errors };
        };
        return new RobustCustomBridge(schema, validator, selectOptions);
    }, [schema, selectOptions]);

    /**
     * Handles form submission for both Create and Update operations
     */
    const onSubmit = (formData) => {
        const mutation = selectedId ? updateMutation : createMutation;
        const payload = { resource, values: formData };
        if (selectedId) payload.id = selectedId;

        mutation(payload, {
            onSuccess: () => {
                open?.({
                    type: "success",
                    message: "Success!",
                    description: `Entity has been ${selectedId ? 'updated' : 'created'} successfully.`,
                });
                setIsFormOpen(false);
                setSelectedId(null);
                handleRefresh();
            },
            onError: (err) => open?.({ type: "error", message: "Error", description: err.message })
        });
    };

    if (loading) return <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>;
    if (fetchError) return <Alert severity="error">Schema Error: {fetchError}</Alert>;

    // Filter fields to exclude system/navigation properties
    const fields = schema ? Object.keys(schema.properties).filter(k => k !== 'Products' && k !== 'Category' && k !== 'Id') : [];

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 2 }}>
                
                {/* Expandable Form Section */}
                <Collapse in={isFormOpen} sx={{ width: '100%', maxWidth: 600 }}>
                    <Paper sx={{ p: 4, mb: 4, position: 'relative' }}>
                        <IconButton 
                            onClick={() => { setIsFormOpen(false); setSelectedId(null); }}
                            sx={{ position: 'absolute', right: 8, top: 8 }}
                        >
                            <CloseIcon />
                        </IconButton>
                        <Typography variant="h6" gutterBottom>
                            {selectedId ? `Edit ${title} (ID: ${selectedId})` : `Add New ${title}`}
                        </Typography>
                        {bridge && (
                            <AutoForm 
                                schema={bridge} 
                                model={formModel}
                                onSubmit={onSubmit}
                                disabled={isCreating || isUpdating}
                            >
                                {fields.map(name => {
                                    if (selectOptions[name]) {
                                        return <CustomSelectField key={name} name={name} {...selectOptions[name]} />;
                                    }
                                    return <AutoField key={name} name={name} />;
                                })}
                                <ErrorsField />
                                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                    <SubmitField />
                                </Box>
                            </AutoForm>
                        )}
                    </Paper>
                </Collapse>

                {/* Action Buttons */}
                <Box sx={{ width: '100%', maxWidth: 800, display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 1 }}>
                    <Button variant="outlined" onClick={handleRefresh} disabled={isListLoading}>Refresh</Button>
                    {!isFormOpen && (
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setSelectedId(null); setIsFormOpen(true); }}>
                            Create New
                        </Button>
                    )}
                </Box>

                {/* Data Table Section */}
                <Paper sx={{ p: 4, width: '100%', maxWidth: 800 }}>
                    <Typography variant="h6" gutterBottom>{title} List ({entities.length} items)</Typography>
                    <TableContainer>
                        <Table sx={{ minWidth: 400 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>ID</TableCell>
                                    {fields.map(col => <TableCell key={col}>{col}</TableCell>)}
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isListLoading && entities.length === 0 ? (
                                    <TableRow><TableCell colSpan={fields.length + 2} align="center">Loading...</TableCell></TableRow>
                                ) : entities.length > 0 ? (
                                    entities.map((row) => (
                                        <TableRow 
                                            key={row.id || row.Id}
                                            hover
                                            onClick={() => { setSelectedId(row.id || row.Id); setIsFormOpen(true); }}
                                            style={{ cursor: 'pointer' }}
                                            selected={selectedId === (row.id || row.Id)}
                                        >
                                            <TableCell>{row.id ?? row.Id}</TableCell>
                                            {fields.map(col => {
                                                const val = row[col] ?? row[col.charAt(0).toLowerCase() + col.slice(1)];
                                                const displayVal = selectOptions[col]?.transform ? selectOptions[col].transform(val) : val;
                                                return <TableCell key={col}>{displayVal ?? ''}</TableCell>;
                                            })}
                                            <TableCell align="right">
                                                <Tooltip title="Edit"><IconButton size="small"><EditIcon fontSize="small" /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={fields.length + 2} align="center">No Data Found</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>
        </Box>
    );
};
