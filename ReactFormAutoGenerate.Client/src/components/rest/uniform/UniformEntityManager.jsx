import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AutoForm } from 'uniforms';
import { Bridge } from 'uniforms';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { useCreate, useNotification, useList, useInvalidate, useUpdate } from '@refinedev/core';

import { Grid, GridColumn } from "@progress/kendo-react-grid";
import { Button } from "@progress/kendo-react-buttons";
import { Loader } from "@progress/kendo-react-indicators";
import { Card, CardBody } from "@progress/kendo-react-layout";
import { plusIcon, arrowRotateCwIcon, xIcon, pencilIcon } from "@progress/kendo-svg-icons";
import { SvgIcon } from "@progress/kendo-react-common";

import { TextField, NumberField, SelectField, BoolField, SubmitField, ErrorsField } from '../../common/uniforms-kendo/Fields';

const ajv = new Ajv({ allErrors: true, useDefaults: true, strict: false });
addFormats(ajv);

const getVal = (obj, key) => {
    if (!obj || !key) return undefined;
    const targetKey = key.toLowerCase();
    const actualKey = Object.keys(obj).find(k => k.toLowerCase() === targetKey);
    return actualKey ? obj[actualKey] : undefined;
};

/**
 * Modern KendoReact Custom Data Cell for Uniforms
 */
const UniformLookupDataCell = (props) => {
    const { dataItem, field, resolvedSelectOptions, originalCol } = props;
    const val = dataItem[field] ?? getVal(dataItem, originalCol);
    
    const opt = resolvedSelectOptions[originalCol] || 
                resolvedSelectOptions[originalCol.toLowerCase()] || 
                resolvedSelectOptions["categoryid"];
    
    const foundOpt = opt?.options?.find(o => String(o.value) === String(val));
    const displayVal = foundOpt ? foundOpt.label : val;
    const resultText = (displayVal === "null" || displayVal === "undefined") ? "" : String(displayVal ?? "");

    return (
        <td {...props.tdProps}>
            {resultText}
        </td>
    );
};

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
    const { open } = useNotification();
    const { data: listData } = useList({ resource });

    const fetchBackupData = useCallback(() => {
        fetch(`/api/${resource}`).then(res => res.json()).then(data => setRawApiData(Array.isArray(data) ? data : []))
            .catch(err => console.error(err));
    }, [resource]);

    const entities = useMemo(() => (listData?.data && Array.isArray(listData.data)) ? listData.data : rawApiData, [listData, rawApiData]);

    const formModel = useMemo(() => {
        if (selectedId) {
            const item = entities.find(e => String(e.id || e.Id) === String(selectedId));
            if (!item) return {};
            const mapped = {};
            if (schema?.properties) {
                Object.keys(schema.properties).forEach(key => {
                    const value = getVal(item, key);
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

        Object.keys(selectOptions).forEach(key => {
            const opt = selectOptions[key];
            if (opt.resource) {
                fetch(`/api/${opt.resource}`).then(res => res.json()).then(data => {
                    const list = Array.isArray(data) ? data : (data.data || []);
                    const items = list.map(item => ({
                        label: getVal(item, "Name") || getVal(item, "name") || String(item.id || item.Id),
                        value: item.id || item.Id || item.ID
                    }));
                    setResolvedSelectOptions(prev => ({
                        ...prev,
                        [key]: { ...prev[key], options: items },
                        [key.toLowerCase()]: { ...prev[key.toLowerCase()], options: items }
                    }));
                });
            }
        });
    }, [schemaUrl, resource, selectOptions, fetchBackupData]);

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
                open?.({ type: "success", message: `Success` });
                setIsFormOpen(false); setSelectedId(null); fetchBackupData();
            },
            onError: (err) => open?.({ type: "error", message: err.message })
        });
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Loader size="large" type="pulsing" /></div>;
    if (fetchError) return <div style={{ color: 'red', padding: '20px' }}>{fetchError}</div>;

    const fields = schema ? Object.keys(schema.properties).filter(k => k !== 'Products' && k !== 'Category' && k !== 'Id') : [];

    return (
        <div style={{ width: '100%' }}>
            {isFormOpen && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
                    <Card style={{ width: '100%', maxWidth: '600px', backgroundColor: '#f4f4f4' }}>
                        <CardBody>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ff6358', fontWeight: 'bold' }}>
                                    {selectedId ? `Edit ${title} #${selectedId}` : `Add New ${title}`}
                                </h3>
                                <Button fillMode="flat" onClick={() => { setIsFormOpen(false); setSelectedId(null); }}><SvgIcon icon={xIcon} /></Button>
                            </div>
                            {bridge && (
                                <AutoForm schema={bridge} model={formModel} onSubmit={onSubmit}>
                                    {fields.map(name => {
                                        const isIdField = name.toLowerCase() === 'id';
                                        if (isIdField && !selectedId) return null;
                                        const prop = bridge.getProps(name);
                                        const fieldProps = { key: name, name: name, disabled: isIdField && !!selectedId };
                                        if (prop.options) return <SelectField {...fieldProps} options={prop.options} />;
                                        if (prop.type === 'integer' || prop.type === 'number') return <NumberField {...fieldProps} />;
                                        if (prop.type === 'boolean') return <BoolField {...fieldProps} />;
                                        return <TextField {...fieldProps} />;
                                    })}
                                    <ErrorsField />
                                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                        <Button fillMode="outline" type="button" onClick={() => { setIsFormOpen(false); setSelectedId(null); }}>Cancel</Button>
                                        <SubmitField value="Save" />
                                    </div>
                                </AutoForm>
                            )}
                        </CardBody>
                    </Card>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>{title} List</h3>
                <div>
                    <Button fillMode="outline" onClick={fetchBackupData} style={{ marginRight: '10px' }}>
                        <SvgIcon icon={arrowRotateCwIcon} /> Refresh
                    </Button>
                    <Button themeColor="primary" onClick={() => { setSelectedId(null); setIsFormOpen(true); }}>
                        <SvgIcon icon={plusIcon} /> Create New
                    </Button>
                </div>
            </div>

            <Grid data={entities} style={{ height: '400px' }} onRowClick={(e) => { setSelectedId(e.dataItem.id || e.dataItem.Id); setIsFormOpen(true); }}>
                <GridColumn field="id" title="ID" width="80px" cell={(props) => <td {...props.tdProps}>{props.dataItem.id || props.dataItem.Id}</td>} />
                {fields.map(col => {
                    const isCategoryId = col.toLowerCase() === "categoryid";
                    const dataKey = col.charAt(0).toLowerCase() + col.slice(1);

                    const CustomCell = (cellProps) => (
                        <UniformLookupDataCell 
                            {...cellProps} 
                            resolvedSelectOptions={resolvedSelectOptions} 
                            originalCol={col} 
                        />
                    );

                    return (
                        <GridColumn 
                            key={col} 
                            field={dataKey} 
                            title={isCategoryId ? "CATEGORY" : col.toUpperCase()} 
                            cells={{ data: CustomCell }}
                        />
                    );
                })}
            </Grid>
        </div>
    );
};
