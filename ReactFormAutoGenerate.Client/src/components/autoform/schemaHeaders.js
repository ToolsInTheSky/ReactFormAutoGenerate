/**
 * @file schemaHeaders.js
 * @description Utility for injecting x-keyless, x-identity-fields, and x-id
 * into outgoing requests via Refine's internal axios instance interceptor.
 *
 * Usage:
 *   1. Call registerSchemaHeadersInterceptor(axiosInstance) once (e.g. in
 *      RjsfEntityManager / UniformEntityManager via useEffect).
 *   2. Call setSchemaHeaders(schema, recordData) immediately before
 *      onFinish() or deleteMutate() in the form components.
 *
 * x-id value formatting:
 *   - integer / number / boolean  → raw value, no quotes  (e.g. 42, true)
 *   - string / date / date-time / anything else → wrapped in ""  (e.g. "hello")
 */

/** Module-level store: set before a mutation, consumed by the interceptor. */
let _pendingHeaders = null;

/**
 * Resolves a field value from recordData trying exact, camelCase, and PascalCase keys.
 */
function resolveVal(recordData, field) {
    if (!recordData) return "";
    return (
        recordData[field] ??
        recordData[field.charAt(0).toLowerCase() + field.slice(1)] ??
        recordData[field.charAt(0).toUpperCase() + field.slice(1)] ??
        ""
    );
}

/**
 * Returns true when the JSON Schema type should NOT be quoted in x-id.
 * number, integer, boolean are raw; everything else (string, date-time, etc.) is quoted.
 */
function isUnquotedType(propType) {
    return propType === "integer" || propType === "number" || propType === "boolean";
}

/**
 * Stores schema-related headers to be injected into the next outgoing request.
 * @param {object} schema      - JSON Schema with x-keyless, x-identity-fields, properties
 * @param {object} recordData  - Form data or record to resolve x-id values from
 */
export function setSchemaHeaders(schema, recordData) {
    if (!schema) return;

    const isKeyless = schema["x-keyless"] === true;
    const identityFields = Array.isArray(schema["x-identity-fields"])
        ? schema["x-identity-fields"]
        : [];

    const idParts = identityFields.map((field) => {
        const val = resolveVal(recordData, field);

        // Case-insensitive lookup of the field's schema definition
        const propKey = Object.keys(schema.properties || {}).find(
            (k) => k === field || k.toLowerCase() === field.toLowerCase()
        );
        const propType = propKey ? schema.properties[propKey]?.type : undefined;

        const strVal = String(val);
        return isUnquotedType(propType) ? strVal : `"${strVal}"`;
    });

    _pendingHeaders = {
        "x-keyless": String(isKeyless),
        "x-identity-fields": identityFields.join(","),
        "x-id": idParts.join("|"),
    };
}

export function clearSchemaHeaders() {
    _pendingHeaders = null;
}

/**
 * Registers the schema headers request interceptor on the given axios instance.
 * Safe to call multiple times — tracks registration with a flag to avoid duplicates.
 * Call this once from each EntityManager component (RjsfEntityManager, UniformEntityManager).
 * @param {object} axiosInstance - The axios instance to register the interceptor on
 */
let _interceptorRegistered = false;
export function registerSchemaHeadersInterceptor(axiosInstance) {
    if (_interceptorRegistered) return;
    _interceptorRegistered = true;
    axiosInstance.interceptors.request.use((config) => {
        if (_pendingHeaders) {
            config.headers = config.headers || {};
            Object.assign(config.headers, _pendingHeaders);
            _pendingHeaders = null;
        }
        return config;
    });
}