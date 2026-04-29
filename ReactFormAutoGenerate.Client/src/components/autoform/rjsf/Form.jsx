/**
 * @file RjsfAutoForm.jsx
 * @description A highly flexible, auto-generated form component based on react-jsonschema-form (RJSF).
 * It features dynamic schema processing (cleaning and relationship injection),
 * multi-protocol support (REST/GraphQL), and custom error message transformation.
 * Integrates Refine's useForm for seamless CRUD operations.
 */

import { Button } from "@progress/kendo-react-buttons";
import { SvgIcon } from "@progress/kendo-react-common";
import { Loader } from "@progress/kendo-react-indicators";
import { saveIcon, trashIcon, xIcon } from "@progress/kendo-svg-icons";
import { useDelete, useForm } from "@refinedev/core";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import pluralize from "pluralize";
import React, { useMemo } from "react";
import { setSchemaHeaders } from "../schemaHeaders";
import { ObjectFieldTemplate } from "./ObjectFieldTemplate";
import { widgets } from "./Widgets";

const api = axios.create({ baseURL: "/api" });

const toCamelCase = (str) => str.charAt(0).toLowerCase() + str.slice(1);
const toPascalCase = (str) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Utility: getVal
 * Safely retrieves a value from an object using case-insensitive key matching.
 */
const getVal = (obj, key) => {
	if (!obj) return "";
	const foundKey = Object.keys(obj).find(
		(k) => k.toLowerCase() === key.toLowerCase(),
	);
	return foundKey ? obj[foundKey] : "";
};

/**
 * RjsfAutoForm Component
 * @param {string} protocol - "rest" | "graphql"
 * @param {string|number} id - Record ID for edit mode
 * @param {string} action - "create" | "edit"
 * @param {object} schema - The raw JSON Schema
 * @param {array} relations - List of relational fields to resolve into dropdowns
 */
const RjsfAutoForm = ({
	protocol = "rest",
	id,
	action,
	onCancel,
	schema,
	resource,
	entityName,
	relations = [],
	record = null,
}) => {
	const formRef = React.useRef(null);
	const formContainerRef = React.useRef(null);
	const queryClient = useQueryClient();

	const isRest = protocol === "rest";

	/**
	 * !!! IMPORTANT: Protocol-specific resource naming !!!
	 * For GraphQL, we use correctly pluralized camelCase names.
	 */
	const actualResource = isRest
		? resource
		: toCamelCase(pluralize(entityName || ""));
	const dataProviderName = isRest ? "default" : "graphql";

	// section 1: !!! IMPORTANT: Relationship Resolution !!!
	const relQueriesResults = useQueries({
		queries: relations.map((rel) => ({
			queryKey: isRest ? [rel.resource] : ["gql-lookup-options", rel.resource],
			queryFn: async () => {
				if (isRest) {
					const res = await api.get(`/${rel.resource}/all`);
					const data = res.data;
					return (Array.isArray(data) ? data : data.data || []).map((item) => ({
						const: item.id || item.Id || item.ID,
						title: String(item.name || item.Name || item.title || item.id),
					}));
				} else {
					const qName = toCamelCase(rel.resource);
					const query = `query { ${qName} { items { id name } } }`;
					const res = await axios.post("/graphql", { query });
					const items = res.data?.data?.[qName]?.items || [];
					return items.map((item) => ({
						const: item.id || item.Id,
						title: String(item.name || item.id),
					}));
				}
			},
		})),
	});

	const isRelLoading = relQueriesResults.some((res) => res.isLoading);
	const relOptions = useMemo(() => {
		const options = {};
		relQueriesResults.forEach((res, index) => {
			const field = relations[index].field.toLowerCase();
			if (res.data) options[field] = res.data;
		});
		return options;
	}, [relQueriesResults, relations]);

	// section: Keyless Meta Handling
	const meta = useMemo(() => {
		const isKeyless =
			schema && (schema["x-keyless"] === true || schema["xKeyless"] === true);
		if (isRest || !isKeyless || !schema?.properties) return undefined;

		// Now that we have a virtual Id property, we can include it in the GraphQL query
		const fields = Object.keys(schema.properties).map(toCamelCase);
		fields.push("id"); // Request the virtual ID

		return { fields };
	}, [isRest, schema]);

	// section 2: Refine useForm Integration
	// !!! IMPORTANT: dataProviderName must be at the top level of options !!!
	// Optimization: Disable automatic GetOne query since we already have the record prop
	const { onFinish, queryResult, formLoading } = useForm({
		action,
		resource: actualResource,
		id,
		dataProviderName,
		meta,
		queryOptions: {
			enabled: false, // Don't fetch single item from server
		},
		onMutationSuccess: () => {
			if (isRest) {
				queryClient.invalidateQueries({ queryKey: [resource] });
			} else {
				queryClient.invalidateQueries({ queryKey: ["gql-data", entityName] });
			}
			onCancel();
		},
	});

	const { mutate: deleteMutate } = useDelete();
	const initialData = queryResult?.data?.data;

	// section 3: !!! IMPORTANT: Schema Cleaning & Transformation !!!
	const cleanedSchema = useMemo(() => {
		if (!schema) return null;
		const s = JSON.parse(JSON.stringify(schema));
		delete s.$schema;

		if (s.properties) {
			const keysToDelete = [];
			Object.keys(s.properties).forEach((key) => {
				const prop = s.properties[key];
				const lowerKey = key.toLowerCase();

				// Exclude identity fields (ID)
				if (prop["x-identity"] || lowerKey === "id") {
					keysToDelete.push(key);
					return;
				}

				const isRelation = !!relations.find(
					(r) => r.field.toLowerCase() === lowerKey,
				);
				const isComplex =
					prop.type === "object" ||
					prop.type === "array" ||
					prop.$ref ||
					(Array.isArray(prop.type) &&
						(prop.type.includes("object") || prop.type.includes("array"))) ||
					prop.anyOf ||
					prop.oneOf;

				if (isComplex && !isRelation) {
					keysToDelete.push(key);
					return;
				}

				if (!prop.title) {
					prop.title = key.replace(/([A-Z])/g, " $1").trim();
				}

				if (relOptions[lowerKey]) {
					prop.oneOf = relOptions[lowerKey];
					prop.type = "integer";
					delete prop.anyOf;
					delete prop.$ref;
				}
			});

			keysToDelete.forEach((k) => delete s.properties[k]);
			if (s.required && Array.isArray(s.required)) {
				s.required = s.required.filter(
					(reqKey) => !keysToDelete.includes(reqKey),
				);
			}
		}
		return s;
	}, [schema, relOptions, relations]);

	// section 4: Data Normalization
	const finalData = useMemo(() => {
		const data = {};
		if (cleanedSchema?.properties) {
			const sourceData = record || initialData;
			Object.keys(cleanedSchema.properties).forEach((key) => {
				const prop = cleanedSchema.properties[key];
				const val = isRest
					? getVal(sourceData, key)
					: (sourceData?.[toCamelCase(key)] ?? sourceData?.[key]);

				if (prop.type === "number" || prop.type === "integer") {
					data[key] =
						val === "" || val === undefined || val === null ? 0 : Number(val);
				} else {
					data[key] = val ?? "";
				}
			});
		}
		return data;
	}, [cleanedSchema, record, initialData, isRest]);

	// section: Auto-focus logic
	React.useEffect(() => {
		if (!formLoading && formContainerRef.current && cleanedSchema) {
			const firstEditableInput = formContainerRef.current.querySelector(
				'input:not([disabled]):not([readonly]):not([type="hidden"]), ' +
					"textarea:not([disabled]):not([readonly]), " +
					".k-dropdownlist:not(.k-disabled), " +
					'[role="combobox"]:not([aria-disabled="true"])',
			);
			if (firstEditableInput) {
				setTimeout(() => firstEditableInput.focus(), 200);
			}
		}
	}, [cleanedSchema, id, formLoading]);

	const handleDelete = () => {
		if (window.confirm("Are you sure you want to delete this item?")) {
			setSchemaHeaders(schema, record);
			deleteMutate(
				{ resource: actualResource, id: id, dataProviderName },
				{
					onSuccess: () => {
						if (isRest) {
							queryClient.invalidateQueries({ queryKey: [resource] });
						} else {
							queryClient.invalidateQueries({
								queryKey: ["gql-data", entityName],
							});
						}
						onCancel();
					},
				},
			);
		}
	};

	const uiSchema = useMemo(() => {
		const ui = { "ui:submitButtonOptions": { norender: true } };
		if (cleanedSchema?.properties) {
			Object.keys(cleanedSchema.properties).forEach((key) => {
				ui[key] = { "ui:label": false };
			});
		}
		return ui;
	}, [cleanedSchema]);

	const transformErrors = (errors) => {
		const uniqueErrors = [];
		const seenFields = new Set();
		errors.forEach((error) => {
			const { name, property, message, params } = error;
			if (!property || property === ".") {
				if (message && message.includes("no schema with key")) {
					error.message = "Schema validation setup error.";
					error.stack = error.message;
					uniqueErrors.push(error);
				}
				return;
			}
			const fieldName = property.replace(/^[.[]|['"\]]/g, "");
			const propertyKeys = Object.keys(cleanedSchema.properties || {});
			const actualKey =
				propertyKeys.find((k) => k.toLowerCase() === fieldName.toLowerCase()) ||
				fieldName;
			const fieldTitle =
				cleanedSchema.properties[actualKey]?.title || actualKey;
			if (seenFields.has(property)) return;
			let friendlyMessage = "";
			if (name === "required") friendlyMessage = "is required";
			else if (name === "const" || name === "oneOf" || name === "anyOf")
				friendlyMessage = "selection is invalid. Please select a valid option.";
			else if (name === "format")
				friendlyMessage =
					params?.format === "date-time"
						? "requires a valid date and time format"
						: "has an invalid format";
			else if (name === "type") friendlyMessage = "has an invalid value type";
			else if (
				message &&
				(message.includes("match exactly one schema") ||
					message.includes("must be equal to constant"))
			)
				friendlyMessage = "selection is invalid";
			else friendlyMessage = message;
			error.message = friendlyMessage;
			error.stack = `${fieldTitle} ${friendlyMessage}`;
			uniqueErrors.push(error);
			seenFields.add(property);
		});
		return uniqueErrors;
	};

	if (formLoading || !cleanedSchema || isRelLoading) {
		return (
			<div
				style={{ display: "flex", justifyContent: "center", padding: "20px" }}
			>
				<Loader size="medium" type="pulsing" />
			</div>
		);
	}

	return (
		<div ref={formContainerRef} className="k-form">
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "20px",
					borderBottom: "1px solid rgba(0,0,0,0.1)",
					paddingBottom: "10px",
				}}
			>
				<h3 className="form-section-header k-text-primary">
					{action === "create"
						? `Create New ${entityName || resource}`
						: `Edit ${entityName || resource} #${id}`}
				</h3>
				<Button fillMode="flat" onClick={onCancel}>
					<SvgIcon icon={xIcon} />
				</Button>
			</div>
			<Form
				ref={formRef}
				schema={cleanedSchema}
				uiSchema={uiSchema}
				validator={validator}
				formData={finalData}
				widgets={widgets}
				templates={{ ObjectFieldTemplate }}
				transformErrors={transformErrors}
				onSubmit={({ formData }) => {
					const payload = {};
					Object.keys(formData).forEach((key) => {
						const mappedKey = isRest ? toPascalCase(key) : toCamelCase(key);
						payload[mappedKey] = formData[key];
					});
					if (isRest && id)
						payload["Id"] = typeof id === "string" ? parseInt(id, 10) : id;

					// For keyless entities the x-id must identify the ORIGINAL record
					// (used by the backend to locate the row to update/delete).
					// Use the original `record` prop so that edited key fields
					// (e.g. ProductId changed 111→222) don't corrupt x-id.
					// For normal keyed entities, fall back to id/formData as before.
					const isKeyless = schema?.["x-keyless"] === true;
					setSchemaHeaders(
						schema,
						isKeyless ? record : { ...formData, ...(id ? { Id: id, id } : {}) },
					);
					onFinish(payload);
				}}
			>
				<div
					style={{
						marginTop: "20px",
						display: "flex",
						justifyContent: "flex-end",
						gap: "10px",
					}}
				>
					{action === "edit" && (
						<div style={{ marginRight: "auto" }}>
							<Button themeColor="error" type="button" onClick={handleDelete}>
								<SvgIcon icon={trashIcon} /> Delete
							</Button>
						</div>
					)}
					<Button fillMode="outline" type="button" onClick={onCancel}>
						Cancel
					</Button>
					<Button themeColor="primary" type="submit">
						<SvgIcon icon={saveIcon} /> Save
					</Button>
				</div>
			</Form>
		</div>
	);
};

export default RjsfAutoForm;
