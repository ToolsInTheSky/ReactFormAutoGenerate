/**
 * @file AutoListView.jsx
 * @description A generic, paginated list component designed to look like a Grid.
 * It dynamically generates headers and columns from JSON Schema properties,
 * including resolving related data (e.g., showing Category Name instead of CategoryId).
 * Supports onRowClick callback for interactivity.
 */

import { process } from "@progress/kendo-data-query";
import { Button } from "@progress/kendo-react-buttons";
import { Pager } from "@progress/kendo-react-data-tools";
import { Loader } from "@progress/kendo-react-indicators";
import { ListView, ListViewHeader } from "@progress/kendo-react-listview";
import { arrowRotateCwIcon, plusIcon } from "@progress/kendo-svg-icons";
import axios from "axios";
import { GraphQLClient, gql } from "graphql-request";
import pluralize from "pluralize";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const toCamelCase = (str) => str.charAt(0).toLowerCase() + str.slice(1);

/**
 * Utility: getVal
 */
const getVal = (obj, key) => {
	if (!obj || !key) return undefined;
	if (obj[key] !== undefined) return obj[key];
	const camel = toCamelCase(key);
	if (obj[camel] !== undefined) return obj[camel];
	const pascal = key.charAt(0).toUpperCase() + key.slice(1);
	if (obj[pascal] !== undefined) return obj[pascal];
	return undefined;
};

const AutoListView = ({
	protocol = "rest",
	resource,
	entityName,
	title,
	onRowClick,
	onRefresh,
	onCreate,
}) => {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState({ skip: 0, take: 10 });
	const [schema, setSchema] = useState(null);
	const [lookups, setLookups] = useState({});

	const isRest = protocol === "rest";
	const client = useMemo(
		() =>
			isRest ? null : new GraphQLClient(window.location.origin + "/graphql"),
		[isRest],
	);

	const toPluralCamelCase = useCallback(
		(name) => toCamelCase(pluralize(name)),
		[],
	);

	/**
	 * section: Schema, Data, and Lookups Fetching
	 */
	const fetchAll = useCallback(async () => {
		setLoading(true);
		try {
			let parsedSchema = null;

			// 1. Fetch Schema
			if (isRest) {
				const schemaKey = resource.endsWith("ies")
					? "category"
					: pluralize.singular(resource);
				const sRes = await axios.get(`/api/schema/${schemaKey}`);
				parsedSchema = sRes.data;
			} else {
				const schemaQuery = gql`query GetSchema($name: String!, $proto: String!) { jsonSchema(entityName: $name, protocol: $proto) }`;
				const sRes = await client.request(schemaQuery, {
					name: entityName,
					proto: "rjsf",
				});
				parsedSchema = JSON.parse(sRes.jsonSchema);
			}
			setSchema(parsedSchema);

			// 2. Fetch Lookups (Relationships)
			if (parsedSchema?.properties) {
				const lookupResults = {};
				const relEntries = Object.entries(parsedSchema.properties).filter(
					([_, p]) => p["x-relation"],
				);

				await Promise.all(
					relEntries.map(async ([key, prop]) => {
						const relRes = prop["x-relation"];
						const map = {};
						if (isRest) {
							const res = await axios.get(`/api/${relRes}/all`);
							const list = Array.isArray(res.data)
								? res.data
								: res.data.data || [];
							list.forEach((item) => {
								const id = item.id ?? item.Id ?? item.ID;
								const label =
									getVal(item, "name") || getVal(item, "Name") || String(id);
								map[String(id)] = label;
							});
						} else {
							const qName = toPluralCamelCase(pluralize.singular(relRes));
							const res = await axios.post("/graphql", {
								query: `query { ${qName} { items { id name } } }`,
							});
							const items = res.data?.data?.[qName]?.items || [];
							items.forEach((item) => {
								map[String(item.id)] = item.name || String(item.id);
							});
						}
						lookupResults[key.toLowerCase()] = map;
					}),
				);
				setLookups(lookupResults);
			}

			// 3. Fetch Main Data
			if (isRest) {
				const res = await axios.get(`/api/${resource}`);
				setData(Array.isArray(res.data) ? res.data : res.data.data || []);
			} else {
				const queryFields = Object.keys(parsedSchema.properties)
					.filter((key) => {
						const prop = parsedSchema.properties[key];
						const isComplex =
							prop.type === "object" ||
							prop.type === "array" ||
							prop.$ref ||
							prop.oneOf ||
							prop.anyOf;
						return !isComplex || !!prop["x-relation"];
					})
					.map(toCamelCase)
					.join("\n");

				const qName = toPluralCamelCase(entityName);
				// Check for x-keyless or xKeyless depending on how it's serialized
				const isKeyless =
					parsedSchema["x-keyless"] === true ||
					parsedSchema["xKeyless"] === true;
				const idField = isKeyless ? "" : "id";

				const dataQuery = `query { ${qName} { items { ${idField} ${queryFields} } } }`;
				const res = await axios.post("/graphql", { query: dataQuery });
				setData(res.data?.data?.[qName]?.items || []);
			}
		} catch (err) {
			console.error("Error in AutoListView fetchAll:", err);
		} finally {
			setLoading(false);
		}
	}, [isRest, resource, entityName, client, toPluralCamelCase]);

	useEffect(() => {
		fetchAll();
	}, [fetchAll]);

	const columns = useMemo(() => {
		if (!schema?.properties) return [];
		return Object.keys(schema.properties).filter((key) => {
			const prop = schema.properties[key];
			const lowerKey = key.toLowerCase();
			// In keyless mode, we don't skip "id" if it's just a regular column
			if (!schema["x-keyless"] && (lowerKey === "id" || prop["x-identity"]))
				return false;

			const isComplex =
				prop.type === "object" ||
				prop.type === "array" ||
				prop.$ref ||
				prop.oneOf ||
				prop.anyOf;
			return !isComplex || !!prop["x-relation"];
		});
	}, [schema]);

	const gridStyle = {
		display: "grid",
		gridTemplateColumns: `120px repeat(${columns.length}, 1fr)`,
		gap: "10px",
		alignItems: "center",
	};

	/**
	 * Custom Item Renderer (Grid Row)
	 */
	const GridRowRender = (props) => {
		const item = props.dataItem;

		let displayId = "";
		let idValue = null;

		if (schema["x-keyless"]) {
			const identityFields = schema["x-identity-fields"] || [];
			idValue = identityFields.map((f) => getVal(item, f)).join("|");
			displayId = `IDX:${props.itemIndex + 1}`;
		} else {
			idValue = getVal(item, "id");
			displayId = `#${idValue}`;
		}

		return (
			<div
				className="autolist-row"
				style={{
					...gridStyle,
					padding: "12px 15px",
					borderBottom: "1px solid #eee",
					cursor: onRowClick ? "pointer" : "default",
					transition: "background-color 0.2s",
				}}
				onClick={() => onRowClick?.(idValue, item)}
			>
				<div
					style={{ fontWeight: "bold", color: "#666", fontSize: "0.85rem" }}
					title={idValue}
				>
					{displayId}
				</div>
				{columns.map((col) => {
					const prop = schema.properties[col];
					const val = getVal(item, col);
					const isDate =
						col.toLowerCase().includes("date") || prop.format === "date-time";
					const lookupMap = lookups[col.toLowerCase()];

					let displayVal = "";

					if (lookupMap && val !== undefined) {
						displayVal = lookupMap[String(val)] || String(val);
					} else if (isDate && val) {
						displayVal = new Date(val).toLocaleDateString();
					} else if (typeof val === "boolean") {
						displayVal = val ? "Yes" : "No";
					} else {
						displayVal = String(val ?? "");
					}

					return (
						<div
							key={col}
							style={{
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
							}}
							title={displayVal}
						>
							{displayVal}
						</div>
					);
				})}
			</div>
		);
	};

	const pagedData = useMemo(
		() => process(data, { skip: page.skip, take: page.take }).data,
		[data, page],
	);

	if (loading || !schema)
		return (
			<div style={{ padding: "50px", textAlign: "center" }}>
				<Loader size="large" type="pulsing" />
			</div>
		);

	return (
		<div
			style={{
				border: "1px solid #ddd",
				borderRadius: "8px",
				overflow: "hidden",
				backgroundColor: "#fff",
				boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
			}}
		>
			{/* Toolbar for Actions */}
			{(onRefresh || onCreate) && (
				<div
					style={{
						display: "flex",
						justifyContent: "flex-end",
						padding: "10px 15px",
						gap: "10px",
						borderBottom: "1px solid #eee",
						backgroundColor: "#f9f9f9",
					}}
				>
					{onRefresh && (
						<Button svgIcon={arrowRotateCwIcon} onClick={onRefresh}>
							Refresh
						</Button>
					)}
					{onCreate && (
						<Button svgIcon={plusIcon} onClick={onCreate} themeColor="primary">
							Create
						</Button>
					)}
				</div>
			)}

			{/* Custom Header Row */}
			<ListViewHeader
				style={{
					...gridStyle,
					padding: "12px 15px",
					backgroundColor: "#333",
					color: "#fff",
					fontWeight: "bold",
					textTransform: "uppercase",
					fontSize: "0.8rem",
					letterSpacing: "1px",
				}}
			>
				<div>ID</div>
				{columns.map((col) => {
					const prop = schema.properties[col];
					const relRes = prop["x-relation"];
					const titleStr = relRes
						? pluralize.singular(relRes).toUpperCase()
						: (prop.title || col).toUpperCase();
					return <div key={col}>{titleStr}</div>;
				})}
			</ListViewHeader>

			<ListView
				data={pagedData}
				item={GridRowRender}
				style={{ width: "100%", minHeight: "400px" }}
			/>

			{data.length === 0 && (
				<div
					style={{
						padding: "60px 20px",
						textAlign: "center",
						color: "#888",
						backgroundColor: "#fff",
						borderBottom: "1px solid #eee",
					}}
				>
					<div style={{ fontSize: "1.2rem", marginBottom: "10px" }}>
						No records found
					</div>
					<div style={{ fontSize: "0.9rem" }}>
						There is no data to display for this resource.
					</div>
				</div>
			)}

			<Pager
				skip={page.skip}
				take={page.take}
				total={data.length}
				onPageChange={(e) => setPage({ skip: e.skip, take: e.take })}
				pageSizeValues={[5, 10, 20, 50]}
			/>
		</div>
	);
};

export default AutoListView;
