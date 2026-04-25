import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AutoForm } from 'uniforms';
import { Bridge } from 'uniforms';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { useCreate, useNotification, useList, useInvalidate, useUpdate } from '@refinedev/core';

import { Grid, GridColumn } from "@progress/kendo-react-grid";
import { Button } from "@progress/kendo-react-buttons";
import { Loader } from "@progress/kendo-react-indicators";
import { Card, CardBody, CardTitle } from "@progress/kendo-react-layout";
import { plusIcon, arrowRotateCwIcon, xIcon, pencilIcon } from "@progress/kendo-svg-icons";
import { SvgIcon } from "@progress/kendo-react-common";

import { TextField, NumberField, SelectField, BoolField, SubmitField, ErrorsField } from '../../common/uniforms-kendo/Fields';

const ajv = new Ajv({ allErrors: true, useDefaults: true, strict: false });
addFormats(ajv);

class RobustCustomBridge extends Bridge {
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
        if (this.overrides[name]?.options?.length > 0) return this.overrides[name].options[0].value;
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
        if (field?.type === 'boolean') return Boolean;
        return String;
    }
    getValidator() { return this.validator; }
}

export const UniformEntityManager = ({ resource, schemaUrl, title, selectOptions = {} }) => {
    const [schema, setSchema] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [rawApiData, setRawApiData] = useState([]);
    const [resolvedSelectOptions, setResolvedSelectOptions] = useState(selectOptions);

    const { mutate: createMutation, isLoading: isCreating } = useCreate();
    const { mutate: updateMutation, isLoading: isUpdating } = useUpdate();
    const invalidate = useInvalidate();
    const { open } = useNotification();
    
    const { data: listData, isLoading: isListLoading } = useList({ resource });

    const handleRefresh = () => {
        invalidate({ resource, invalidates: ["list", "detail"] });
        fetchBackupData();
    };

    const fetchBackupData = useCallback(() => {
        fetch(`/api/${resource}`).then(res => res.json()).then(data => setRawApiData(Array.isArray(data) ? data : []))
            .catch(err => console.error(`DEBUG: Manual fetch error for ${resource}:`, err));
    }, [resource]);

    const entities = useMemo(() => (listData?.data && Array.isArray(listData.data)) ? listData.data : rawApiData, [listData, rawApiData]);

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

    useEffect(() => {
        fetchBackupData();
        fetch(schemaUrl).then(res => res.json()).then(data => { setSchema(data); setLoading(false); })
            .catch(err => { setFetchError(err.message); setLoading(false); });

        // Resolve relational options
        Object.keys(selectOptions).forEach(key => {
            const opt = selectOptions[key];
            if (opt.resource) {
                fetch(`/api/${opt.resource}`).then(res => res.json()).then(data => {
                    const items = (Array.isArray(data) ? data : (data.data || [])).map(item => ({
                        label: item.Name || item.name || item.id,
                        value: item.id || item.Id || item.ID
                    }));
                    setResolvedSelectOptions(prev => ({
                        ...prev,
                        [key]: { ...prev[key], options: items }
                    }));
                });
            }
        });
    }, [schemaUrl]);

    const bridge = useMemo(() => {
        if (!schema) return null;
        const validate = ajv.compile(schema);
        const validator = (data) => {
            const valid = validate(data);
            if (valid) return null;
            return { details: validate.errors };
        };
        return new RobustCustomBridge(schema, validator, resolvedSelectOptions);
    }, [schema, resolvedSelectOptions]);

    const onSubmit = (formData) => {
        const mutation = selectedId ? updateMutation : createMutation;
        const payload = { resource, values: formData };
        if (selectedId) payload.id = selectedId;
        mutation(payload, {
            onSuccess: () => {
                open?.({ type: "success", message: `Entity ${selectedId ? 'updated' : 'created'} successfully.` });
                setIsFormOpen(false); setSelectedId(null); handleRefresh();
            },
            onError: (err) => open?.({ type: "error", message: err.message })
        });
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Loader size="large" type="pulsing" /></div>;
    if (fetchError) return <div style={{ color: 'red', padding: '20px' }}>Schema Error: {fetchError}</div>;

    const fields = schema ? Object.keys(schema.properties).filter(k => k !== 'Products' && k !== 'Category' && k !== 'Id') : [];

    return (
        <div style={{ width: '100%' }}>
            {isFormOpen && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
                    <Card style={{ width: '100%', maxWidth: '600px' }}>
                        <CardBody>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <CardTitle>{selectedId ? `Edit ${title} (ID: ${selectedId})` : `Add New ${title}`}</CardTitle>
                                <Button fillMode="flat" onClick={() => { setIsFormOpen(false); setSelectedId(null); }}>
                                    <SvgIcon icon={xIcon} />
                                </Button>
                            </div>
                            {bridge && (
                                <AutoForm schema={bridge} model={formModel} onSubmit={onSubmit} disabled={isCreating || isUpdating}>
                                    {fields.map(name => {
                                        const isIdField = name.toLowerCase() === 'id';
                                        
                                        // 생성 모드에서 ID 필드는 렌더링하지 않음
                                        if (isIdField && !selectedId) return null;

                                        const prop = bridge.getProps(name);
                                        const fieldProps = {
                                            key: name,
                                            name: name,
                                            // 수정 모드에서 ID 필드는 비활성화
                                            disabled: isIdField && !!selectedId
                                        };

                                        if (prop.options) return <SelectField {...fieldProps} options={prop.options} />;
                                        if (prop.type === 'integer' || prop.type === 'number') return <NumberField {...fieldProps} />;
                                        if (prop.type === 'boolean') return <BoolField {...fieldProps} />;
                                        return <TextField {...fieldProps} />;
                                    })}
                                    <ErrorsField />
                                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                        <Button fillMode="outline" onClick={() => { setIsFormOpen(false); setSelectedId(null); }}>Cancel</Button>
                                        <SubmitField value="Save" />
                                    </div>
                                </AutoForm>
                            )}
                        </CardBody>
                    </Card>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>{title} List ({entities.length} items)</h3>
                <div>
                    <Button fillMode="outline" onClick={handleRefresh} style={{ marginRight: '10px' }}>
                        <SvgIcon icon={arrowRotateCwIcon} /> Refresh
                    </Button>
                    <Button themeColor="primary" onClick={() => { setSelectedId(null); setIsFormOpen(true); }}>
                        <SvgIcon icon={plusIcon} /> Create New
                    </Button>
                </div>
            </div>

            <Grid data={entities} style={{ height: '400px' }} onRowClick={(e) => { setSelectedId(e.dataItem.id || e.dataItem.Id); setIsFormOpen(true); }}>
                <GridColumn field="id" title="ID" width="80px" cell={(props) => <td style={props.style} className={props.className}>{props.dataItem.id || props.dataItem.Id}</td>} />
                {fields.map(col => {
                    const camelField = col.charAt(0).toLowerCase() + col.slice(1);
                    return (
                        <GridColumn 
                            key={col} 
                            field={camelField} 
                            title={col.toUpperCase()} 
                            cell={(props) => {
                                const val = props.dataItem[camelField] ?? props.dataItem[col] ?? "";
                                const opt = resolvedSelectOptions[col];
                                const displayVal = opt?.options?.find(o => String(o.value) === String(val))?.label || val;
                                return (
                                    <td style={props.style} className={props.className}>
                                        {displayVal === "null" ? "" : String(displayVal)}
                                    </td>
                                );
                            }} 
                        />
                    );
                })}
            </Grid>
        </div>
    );
};
