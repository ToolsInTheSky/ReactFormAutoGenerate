import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AutoForm } from 'uniforms';
import { Bridge } from 'uniforms';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { useCreate, useNotification, useInvalidate, useUpdate } from '@refinedev/core';
import { GraphQLClient, gql } from "graphql-request";
import axios from "axios";

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

export const GraphQLUniformEntityManager = ({ entityName, selectOptions = {} }) => {
    const [schema, setSchema] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [records, setRecords] = useState([]);
    const [resolvedSelectOptions, setResolvedSelectOptions] = useState(selectOptions);

    const client = useMemo(() => new GraphQLClient(window.location.origin + "/graphql"), []);
    const { mutate: createMutation, isLoading: isCreating } = useCreate();
    const { mutate: updateMutation, isLoading: isUpdating } = useUpdate();
    const { open } = useNotification();
    
    const toCamelCase = (str) => str.charAt(0).toLowerCase() + str.slice(1);
    const toPluralCamelCase = (name) => {
        const camel = name.charAt(0).toLowerCase() + name.slice(1);
        if (camel.endsWith("s")) return camel; 
        if (camel.endsWith("y")) return camel.slice(0, -1) + "ies";
        return camel + "s";
    };

    const fetchSchema = useCallback(async () => {
        try {
            const query = gql`query GetSchema($name: String!, $proto: String!) { jsonSchema(entityName: $name, protocol: $proto) }`;
            const response = await client.request(query, { name: entityName, proto: "uniforms" });
            setSchema(JSON.parse(response.jsonSchema));
        } catch (err) { setFetchError(err.message); }
        finally { setLoading(false); }
    }, [client, entityName]);

    const fetchData = useCallback(async () => {
        if (!schema) return;
        try {
            const fields = Object.keys(schema.properties)
                .filter(k => k !== 'Products' && k !== 'Category' && k !== 'Id')
                .map(toCamelCase).join("\n");
            const qName = toPluralCamelCase(entityName);
            const query = `query { ${qName} { items { id ${fields} } } }`;
            const res = await axios.post("/graphql", { query });
            setRecords(res.data?.data?.[qName]?.items || []);
        } catch (err) { console.error(err); }
    }, [schema, entityName]);

    const fetchRelations = useCallback(async () => {
        const newOptions = { ...selectOptions };
        for (const key of Object.keys(selectOptions)) {
            const opt = selectOptions[key];
            if (opt.resource) {
                const qName = toPluralCamelCase(opt.resource);
                const lField = toCamelCase(opt.labelField || 'Name');
                const query = `query { ${qName} { items { id ${lField} } } }`;
                const res = await axios.post("/graphql", { query });
                const items = (res.data?.data?.[qName]?.items || []).map(item => ({
                    label: item[lField] || item.id,
                    value: item.id
                }));
                newOptions[key] = { ...opt, options: items };
            }
        }
        setResolvedSelectOptions(newOptions);
    }, [selectOptions]);

    useEffect(() => { fetchSchema(); fetchRelations(); }, [fetchSchema, fetchRelations]);
    useEffect(() => { if (schema) fetchData(); }, [schema, fetchData]);

    const formModel = useMemo(() => {
        if (selectedId) {
            const item = records.find(r => r.id === selectedId);
            if (!item) return {};
            const mapped = {};
            if (schema?.properties) {
                Object.keys(schema.properties).forEach(key => {
                    const val = item[toCamelCase(key)] ?? item[key];
                    if (val !== undefined) mapped[key] = val;
                });
            }
            return mapped;
        }
        return {};
    }, [selectedId, records, schema]);

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
        const gqlData = {};
        Object.keys(formData).forEach(k => { gqlData[toCamelCase(k)] = formData[k]; });
        const payload = { resource: toPluralCamelCase(entityName), values: gqlData, meta: { dataProviderName: "graphql" } };
        if (selectedId) payload.id = selectedId;
        mutation(payload, {
            onSuccess: () => {
                open?.({ type: "success", message: `Entity ${selectedId ? 'updated' : 'created'} successfully.` });
                setIsFormOpen(false); setSelectedId(null); fetchData();
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
                                <CardTitle>{selectedId ? `Edit ${entityName} (ID: ${selectedId})` : `Add New ${entityName}`}</CardTitle>
                                <Button fillMode="flat" onClick={() => { setIsFormOpen(false); setSelectedId(null); }}><SvgIcon icon={xIcon} /></Button>
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
                <h3 style={{ margin: 0 }}>{entityName} List ({records.length} items)</h3>
                <div>
                    <Button fillMode="outline" onClick={fetchData} style={{ marginRight: '10px' }}><SvgIcon icon={arrowRotateCwIcon} /> Refresh</Button>
                    <Button themeColor="primary" onClick={() => { setSelectedId(null); setIsFormOpen(true); }}><SvgIcon icon={plusIcon} /> Create New</Button>
                </div>
            </div>

            <Grid data={records} style={{ height: '400px' }} onRowClick={(e) => { setSelectedId(e.dataItem.id); setIsFormOpen(true); }}>
                <GridColumn field="id" title="ID" width="80px" />
                {fields.map(col => (
                    <GridColumn key={col} field={toCamelCase(col)} title={col.toUpperCase()} cell={(props) => {
                        const val = props.dataItem[toCamelCase(col)] ?? props.dataItem[col];
                        const opt = resolvedSelectOptions[col];
                        const displayVal = opt?.options?.find(o => o.value === val)?.label || val;
                        return <td {...props.tdProps}>{String(displayVal ?? '')}</td>;
                    }} />
                ))}
            </Grid>
        </div>
    );
};
