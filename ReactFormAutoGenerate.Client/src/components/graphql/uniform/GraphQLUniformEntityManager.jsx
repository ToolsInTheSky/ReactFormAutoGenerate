import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AutoForm } from 'uniforms';
import { Bridge } from 'uniforms';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { useCreate, useNotification, useInvalidate, useUpdate } from '@refinedev/core';
import { GraphQLClient, gql } from "graphql-request";
import axios from "axios";
import pluralize from "pluralize";

import { Grid, GridColumn } from "@progress/kendo-react-grid";
import { Button } from "@progress/kendo-react-buttons";
import { Loader } from "@progress/kendo-react-indicators";
import { Card, CardBody } from "@progress/kendo-react-layout";
import { plusIcon, arrowRotateCwIcon, xIcon } from "@progress/kendo-svg-icons";
import { SvgIcon } from "@progress/kendo-react-common";

import { TextField, NumberField, SelectField, BoolField, SubmitField, ErrorsField } from '../../common/uniforms-kendo/Fields';

const ajv = new Ajv({ allErrors: true, useDefaults: true, strict: false });
addFormats(ajv);

const toCamelCase = (str) => str.charAt(0).toLowerCase() + str.slice(1);
const toPluralCamelCase = (name) => toCamelCase(pluralize(name));

const getVal = (obj, key) => {
    if (!obj || !key) return undefined;
    const targetKey = key.toLowerCase();
    const actualKey = Object.keys(obj).find(k => k.toLowerCase() === targetKey);
    return actualKey ? obj[actualKey] : undefined;
};

/**
 * Modern KendoReact Custom Data Cell for GraphQL Uniforms
 */
const GraphQLUniformLookupCell = (props) => {
    const { dataItem, field, resolvedSelectOptions, originalCol } = props;
    const val = dataItem[field] ?? getVal(dataItem, originalCol);
    const opt = resolvedSelectOptions[originalCol] || resolvedSelectOptions[originalCol.toLowerCase()];
    const foundOpt = opt?.options?.find(o => String(o.value) === String(val));
    const displayVal = foundOpt ? foundOpt.label : val;
    const resultText = (displayVal === "null" || displayVal === "undefined") ? "" : String(displayVal ?? "");
    return <td {...props.tdProps}>{resultText}</td>;
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
        return field?.type === 'integer' || field?.type === 'number' ? 0 : '';
    }
    getProps(name) {
        const field = this.getField(name) || {};
        const override = this.overrides[name] || {};
        return { label: name, required: this.schema.required?.includes(name), ...field, ...override };
    }
    getSubfields(name) {
        return name ? [] : Object.keys(this.schema.properties).filter(key => {
            const prop = this.schema.properties[key];
            return !prop["x-identity"] && (prop.type !== "object" && prop.type !== "array" || !!prop["x-relation"]);
        });
    }
    getType(name) {
        const field = this.getField(name);
        if (field?.type === 'integer' || field?.type === 'number') return Number;
        if (field?.type === 'boolean') return Boolean;
        return String;
    }
    getValidator() { return this.validator; }
}

export const GraphQLUniformEntityManager = ({ entityName }) => {
    const [schema, setSchema] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [records, setRecords] = useState([]);
    const [isListLoading, setIsListLoading] = useState(false);
    const [resolvedSelectOptions, setResolvedSelectOptions] = useState({});

    const client = useMemo(() => new GraphQLClient(window.location.origin + "/graphql"), []);
    const { mutate: createMutation } = useCreate();
    const { mutate: updateMutation } = useUpdate();
    const { open } = useNotification();
    
    const fetchSchema = useCallback(async () => {
        try {
            const query = gql`query GetSchema($name: String!, $proto: String!) { jsonSchema(entityName: $name, protocol: $proto) }`;
            const response = await client.request(query, { name: entityName, proto: "uniforms" });
            const data = JSON.parse(response.jsonSchema);
            setSchema(data);
            
            if (data.properties) {
                Object.entries(data.properties).forEach(async ([key, prop]) => {
                    const relRes = prop["x-relation"];
                    if (relRes) {
                        const qName = toPluralCamelCase(pluralize.singular(relRes));
                        const res = await axios.post("/graphql", { query: `query { ${qName} { items { id name } } }` });
                        const list = res.data?.data?.[qName]?.items || [];
                        const items = list.map(i => ({ label: i.name || i.id, value: i.id }));
                        setResolvedSelectOptions(prev => ({
                            ...prev,
                            [key]: { options: items },
                            [key.toLowerCase()]: { options: items }
                        }));
                    }
                });
            }
        } catch (err) { setFetchError(err.message); }
        finally { setLoading(false); }
    }, [client, entityName]);

    const fetchData = useCallback(async () => {
        if (!schema) return;
        setIsListLoading(true);
        try {
            const fields = Object.keys(schema.properties)
                .filter(k => !schema.properties[k]["x-identity"] && (schema.properties[k].type !== "object" && schema.properties[k].type !== "array" || !!schema.properties[k]["x-relation"]))
                .map(toCamelCase).join("\n");
            const qName = toPluralCamelCase(entityName);
            const query = `query { ${qName} { items { id ${fields} } } }`;
            const res = await axios.post("/graphql", { query });
            setRecords(res.data?.data?.[qName]?.items || []);
        } catch (err) { console.error(err); }
        finally { setIsListLoading(false); }
    }, [schema, entityName]);

    useEffect(() => { fetchSchema(); }, [fetchSchema]);
    useEffect(() => { if (schema) fetchData(); }, [schema, fetchData]);

    const formModel = useMemo(() => {
        if (selectedId) {
            const item = records.find(r => String(r.id) === String(selectedId));
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
            return valid ? null : { details: validate.errors };
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
                open?.({ type: "success", message: `Success` });
                setIsFormOpen(false); setSelectedId(null); fetchData();
            },
            onError: (err) => open?.({ type: "error", message: err.message })
        });
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Loader size="large" type="pulsing" /></div>;
    if (fetchError) return <div style={{ color: 'red', padding: '20px' }}>{fetchError}</div>;

    const fields = schema ? Object.keys(schema.properties).filter(k => {
        const p = schema.properties[k];
        return !p["x-identity"] && (p.type !== "object" && p.type !== "array" || !!p["x-relation"]);
    }) : [];

    return (
        <div style={{ width: '100%' }}>
            {isFormOpen && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
                    <Card style={{ width: '100%', maxWidth: '1000px', backgroundColor: '#f4f4f4' }}>
                        <CardBody>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ff6358', fontWeight: 'bold' }}>
                                    {selectedId ? `Edit ${entityName} #${selectedId}` : `Add New ${entityName}`}
                                </h3>
                                <Button fillMode="flat" onClick={() => { setIsFormOpen(false); setSelectedId(null); }}><SvgIcon icon={xIcon} /></Button>
                            </div>
                            {bridge && (
                                <AutoForm schema={bridge} model={formModel} onSubmit={onSubmit}>
                                    <div className="form-grid-container">
                                        {fields.map(name => {
                                            const prop = bridge.getProps(name);
                                            const fieldProps = { key: name, name: name };
                                            return (
                                                <div key={name} className="form-grid-item">
                                                    {prop.options ? <SelectField {...fieldProps} options={prop.options} /> :
                                                     (prop.type === 'integer' || prop.type === 'number') ? <NumberField {...fieldProps} /> :
                                                     prop.type === 'boolean' ? <BoolField {...fieldProps} /> :
                                                     <TextField {...fieldProps} />}
                                                </div>
                                            );
                                        })}
                                    </div>
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
                <h3 style={{ margin: 0 }}>{entityName} List</h3>
                <div>
                    <Button fillMode="outline" onClick={fetchData} style={{ marginRight: '10px' }}>
                        <SvgIcon icon={arrowRotateCwIcon} /> Refresh
                    </Button>
                    <Button themeColor="primary" onClick={() => { setSelectedId(null); setIsFormOpen(true); }}><SvgIcon icon={plusIcon} /> Create New</Button>
                </div>
            </div>

            {isListLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}><Loader size="large" type="pulsing" /></div>
            ) : (
                <Grid data={records} style={{ height: '400px' }} onRowClick={(e) => { 
                    const idKey = Object.keys(schema.properties).find(k => schema.properties[k]["x-identity"]) || "id";
                    setSelectedId(getVal(e.dataItem, idKey)); 
                    setIsFormOpen(true); 
                }}>
                    <GridColumn field="id" title="ID" width="80px" />
                    {fields.map(col => {
                        const prop = schema.properties[col];
                        const fieldName = toCamelCase(col);
                        const relationResource = prop["x-relation"];
                        
                        const title = relationResource ? relationResource.replace(/s$/, "").toUpperCase() : col.toUpperCase();

                        const CustomCell = (cp) => <GraphQLUniformLookupCell {...cp} resolvedSelectOptions={resolvedSelectOptions} originalCol={col} />;
                        return <GridColumn key={col} field={fieldName} title={title} cells={relationResource ? { data: CustomCell } : undefined} />;
                    })}
                </Grid>
            )}
        </div>
    );
};
