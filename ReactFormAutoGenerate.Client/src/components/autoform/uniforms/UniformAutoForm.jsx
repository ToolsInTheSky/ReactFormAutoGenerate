/**
 * @file UniformAutoForm.jsx
 * @description A highly reusable, schema-driven form component powered by Uniforms.
 * It uses AJV for validation and a custom bridge (RobustCustomBridge) to translate 
 * JSON Schema into Uniforms-compatible fields. Integrates with Refine for state 
 * management and CRUD operations.
 */

import React, { useMemo } from 'react';
import { AutoForm } from 'uniforms';
import { Bridge } from 'uniforms';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { useCreate, useUpdate, useDelete, useNotification, useForm } from '@refinedev/core';
import { Button } from "@progress/kendo-react-buttons";
import { SvgIcon } from "@progress/kendo-react-common";
import { xIcon, trashIcon } from "@progress/kendo-svg-icons";
import { Loader } from "@progress/kendo-react-indicators";

import { TextField, NumberField, SelectField, BoolField, SubmitField, ErrorsField } from './Fields';

const ajv = new Ajv({ allErrors: true, useDefaults: true, strict: false });
addFormats(ajv);

const toCamelCase = (str) => str.charAt(0).toLowerCase() + str.slice(1);
const toPascalCase = (str) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * !!! IMPORTANT: RobustCustomBridge !!!
 * @description A custom Uniforms bridge that allows for deep integration with JSON Schema
 * and dynamic resolution of relational fields (options). It also handles custom 
 * English error message formatting.
 */
class RobustCustomBridge extends Bridge {
    constructor(schema, validator, overrides = {}) {
        super();
        this.schema = schema;
        this.validator = validator;
        this.overrides = overrides; 
    }
    
    // section: Error Handling
    getError(name, error) { return error?.details?.find(e => e.instancePath === `/${name}` || e.params?.missingProperty === name) || null; }
    
    /**
     * Translates technical AJV error keywords into user-friendly English messages.
     */
    getErrorMessage(name, error) { 
        const err = this.getError(name, error);
        if (!err) return '';
        const field = this.getField(name) || {};
        const fieldTitle = field.title || name;
        if (err.keyword === 'required') return `${fieldTitle} is a required property`;
        if (err.keyword === 'format') return `${fieldTitle} has an invalid format`;
        if (err.keyword === 'type') return `Please enter a valid value for ${fieldTitle}`;
        return err.message || ''; 
    }
    
    getErrorMessages(error) { 
        return error?.details?.map(err => {
            const fieldName = err.instancePath.replace('/', '') || err.params?.missingProperty;
            const field = this.getField(fieldName) || {};
            const fieldTitle = field.title || fieldName;
            if (err.keyword === 'required') return `${fieldTitle} is a required property`;
            if (err.keyword === 'format') return `${fieldTitle} has an invalid format`;
            if (err.keyword === 'type') return `Please enter a valid value for ${fieldTitle}`;
            return err.message;
        }) || []; 
    }

    // section: Field Metadata Extraction
    getField(name) { return this.schema.properties[name]; }
    
    getInitialValue(name) {
        const field = this.getField(name);
        if (this.overrides[name]?.options?.length > 0) return this.overrides[name].options[0].value;
        return field?.type === 'integer' || field?.type === 'number' ? 0 : '';
    }
    
    getProps(name) {
        const field = this.getField(name) || {};
        const override = this.overrides[name] || {};
        return { label: field.title || name, required: this.schema.required?.includes(name), ...field, ...override };
    }
    
    getSubfields(name) {
        return name ? [] : Object.keys(this.schema.properties).filter(key => {
            const prop = this.schema.properties[key];
            // Exclude identity fields (ID)
            if (prop["x-identity"]) return false;
            
            // Check if it's a complex type (object, array, $ref, oneOf, anyOf)
            // Some schemas use oneOf without a top-level type
            const isComplex = prop.type === "object" || prop.type === "array" || prop.$ref || 
                             prop.oneOf || prop.anyOf ||
                             (Array.isArray(prop.type) && (prop.type.includes("object") || prop.type.includes("array")));
            
            // Only allow complex types if they have an explicit relation mapping
            if (isComplex && !prop["x-relation"]) return false;
            
            return true;
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

/**
 * UniformAutoForm Component
 * @description Handles the rendering and submission of the auto-generated Uniforms form.
 */
const UniformAutoForm = ({ 
    protocol = "rest", 
    resource, 
    entityName, 
    id, 
    action, 
    schema, 
    onCancel, 
    onSuccess,
    selectOptions = {},
    initialRecord = null 
}) => {
    const isRest = protocol === "rest";
    const { open } = useNotification();
    const dataProviderName = isRest ? "default" : "graphql";

    // section: Refine Integration
    const { onFinish, queryResult, formLoading } = useForm({
        action,
        resource,
        id,
        meta: { dataProviderName },
        onMutationSuccess: () => {
            open?.({ type: "success", message: "Success" });
            onSuccess?.();
            onCancel();
        }
    });

    const { mutate: deleteMutation } = useDelete();
    const serverData = queryResult?.data?.data;

    // section: Schema Bridge Creation
    const bridge = useMemo(() => {
        if (!schema) return null;
        const s = JSON.parse(JSON.stringify(schema));
        delete s.$schema; // Prevent AJV Draft resolution errors

        if (s.properties) {
            const keysToDelete = [];
            Object.keys(s.properties).forEach(key => {
                const prop = s.properties[key];
                
                // Exclude identity fields
                if (prop["x-identity"]) {
                    keysToDelete.push(key);
                    return;
                }

                // Identify complex navigation properties ($ref, object, array)
                const isComplex = prop.type === "object" || prop.type === "array" || prop.$ref || 
                                 (Array.isArray(prop.type) && (prop.type.includes("object") || prop.type.includes("array"))) ||
                                 prop.anyOf || prop.oneOf;
                
                // If it's complex but has no relation mapping, it's a technical navigation property to be removed
                if (isComplex && !prop["x-relation"]) {
                    keysToDelete.push(key);
                }
            });

            keysToDelete.forEach(k => delete s.properties[k]);
            
            // Clean up required array
            if (s.required && Array.isArray(s.required)) {
                s.required = s.required.filter(reqKey => !keysToDelete.includes(reqKey));
            }
        }

        const validate = ajv.compile(s);
        const validator = (data) => {
            const valid = validate(data);
            return valid ? null : { details: validate.errors };
        };
        return new RobustCustomBridge(s, validator, selectOptions);
    }, [schema, selectOptions]);

    /**
     * section: Data Normalization
     * Adapts incoming server data (PascalCase/camelCase) to the internal form model.
     */
    const formModel = useMemo(() => {
        const source = initialRecord || serverData;
        if (!source || !schema?.properties) return {};
        const mapped = {};
        Object.keys(schema.properties).forEach(key => {
            const val = isRest ? (source[key] ?? source[toPascalCase(key)] ?? source[toCamelCase(key)]) : (source[toCamelCase(key)] ?? source[key]);
            if (val !== undefined) mapped[key] = val;
        });
        return mapped;
    }, [initialRecord, serverData, schema, isRest]);

    /**
     * Handles item deletion with a confirmation prompt.
     */
    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this item?")) {
            deleteMutation({
                resource,
                id,
                meta: { dataProviderName }
            }, {
                onSuccess: () => {
                    open?.({ type: "success", message: "Deleted successfully" });
                    onSuccess?.();
                    onCancel();
                }
            });
        }
    };

    /**
     * Final submission handler that maps form data back to the protocol-specific format.
     */
    const onSubmit = (formData) => {
        const payload = {};
        Object.keys(formData).forEach(key => {
            const mappedKey = isRest ? toPascalCase(key) : toCamelCase(key);
            payload[mappedKey] = formData[key];
        });
        // Include ID for REST PUT requests if required by backend
        if (isRest && id) {
            payload["Id"] = typeof id === 'string' ? parseInt(id, 10) : id;
        }
        onFinish(payload);
    };

    if (formLoading || !bridge) {
        return <div style={{ textAlign: 'center', padding: '20px' }}><Loader size="medium" type="pulsing" /></div>;
    }

    const fields = bridge.getSubfields();

    return (
        <div>
            {/* Form Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ff6358', fontWeight: 'bold' }}>
                    {id ? `Edit ${entityName || resource} #${id}` : `Add New ${entityName || resource}`}
                </h3>
                <Button fillMode="flat" onClick={onCancel}><SvgIcon icon={xIcon} /></Button>
            </div>
            
            {/* !!! IMPORTANT: Uniforms Form Rendering !!! */}
            <AutoForm schema={bridge} model={formModel} onSubmit={onSubmit}>
                <div className="form-grid-container">
                    {fields.map(name => {
                        const prop = bridge.getProps(name);
                        const isIdField = name.toLowerCase() === 'id';
                        const fieldProps = { name: name, disabled: isIdField && !!id };
                        return (
                            <div key={name} className="form-grid-item">
                                {prop.options ? <SelectField key={name} {...fieldProps} options={prop.options} /> :
                                 (prop.type === 'integer' || prop.type === 'number') ? <NumberField key={name} {...fieldProps} /> :
                                 prop.type === 'boolean' ? <BoolField key={name} {...fieldProps} /> :
                                 <TextField key={name} {...fieldProps} />}
                            </div>
                        );
                    })}
                </div>
                
                <ErrorsField />

                {/* Form Footer Action Buttons */}
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    {id && (
                        <div style={{ marginRight: 'auto' }}>
                            <Button themeColor="error" type="button" onClick={handleDelete}><SvgIcon icon={trashIcon} /> Delete</Button>
                        </div>
                    )}
                    <Button fillMode="outline" type="button" onClick={onCancel}>Cancel</Button>
                    <SubmitField value="Save" />
                </div>
            </AutoForm>
        </div>
    );
};

export default UniformAutoForm;
