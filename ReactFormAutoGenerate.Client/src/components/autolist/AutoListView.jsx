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
import { gql } from "graphql-request";
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
	const [total, setTotal] = useState(0);
	const [schema, setSchema] = useState(null);
	const [lookups, setLookups] = useState({});

	const isRest = protocol === "rest";
	
	const toPluralCamelCase = useCallback(
		(name) => toCamelCase(pluralize(name || "")),
		[],
	);

	/**
	 * Phase 1: Fetch Schema and Lookup Options
	 */
	useEffect(() => {
		let isMounted = true;
		const loadMeta = async () => {
			if (!entityName && !resource) return;
			setLoading(true);
			console.log(`AutoListView [${protocol}] Phase 1: Loading metadata for ${entityName || resource}`);
			try {
				let parsedSchema = null;
				if (isRest) {
					const schemaKey = resource.endsWith("ies")
						? "category"
						: pluralize.singular(resource);
					const sRes = await axios.get(`/api/schema/${schemaKey}`);
					parsedSchema = sRes.data;
				} else {
					const schemaQuery = `query GetSchema($name: String!, $proto: String!) { jsonSchema(entityName: $name, protocol: $proto) }`;
					const sRes = await axios.post("/graphql", {
						query: schemaQuery,
						variables: { name: entityName, proto: "rjsf" }
					});
                    if (sRes.data.errors) throw new Error(sRes.data.errors[0].message);
					parsedSchema = JSON.parse(sRes.data.data.jsonSchema);
				}
				if (isMounted) setSchema(parsedSchema);

				// Resolve Relationships
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
					if (isMounted) setLookups(lookupResults);
				}
			} catch (err) {
				console.error(`AutoListView [${protocol}] Error loading metadata:`, err.message);
			} finally {
				if (isMounted) setLoading(false);
			}
		};

		loadMeta();
		return () => { isMounted = false; };
	}, [isRest, resource, entityName, toPluralCamelCase, protocol]);

	/**
	 * Phase 2: Fetch Paged Data
	 */
	useEffect(() => {
		if (!schema) return;
		let isMounted = true;
		
		const fetchData = async () => {
			setLoading(true);
			console.log(`AutoListView [${protocol}] Phase 2: Fetching ${entityName || resource} skip:${page.skip} take:${page.take}`);
			try {
				if (isRest) {
					const res = await axios.get(`/api/${resource}/page`, {
						params: { skip: page.skip, take: page.take },
					});
					if (isMounted) {
						console.log(`AutoListView [REST] received ${res.data?.items?.length} items, total: ${res.data?.totalCount}`);
						setData(res.data?.items || []);
						setTotal(res.data?.totalCount || 0);
					}
				} else {
					const queryFields = Object.keys(schema.properties)
						.filter((key) => {
							const prop = schema.properties[key];
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
					const isKeyless =
						schema["x-keyless"] === true || schema["xKeyless"] === true;
					const idField = isKeyless ? "" : "id";

					const dataQuery = `query GetData($skip: Int!, $take: Int!) { 
						${qName}(skip: $skip, take: $take) { 
							items { ${idField} ${queryFields} } 
							totalCount 
						} 
					}`;
					const res = await axios.post("/graphql", { 
                        query: dataQuery,
                        variables: { skip: page.skip, take: page.take }
                    });
                    if (res.data.errors) throw new Error(res.data.errors[0].message);

					if (isMounted) {
                        const gqlData = res.data.data[qName];
						console.log(`AutoListView [GQL] received ${gqlData?.items?.length} items, total: ${gqlData?.totalCount}`);
						setData(gqlData?.items || []);
						setTotal(gqlData?.totalCount || 0);
					}
				}
			} catch (err) {
				console.error(`AutoListView [${protocol}] Error fetching data:`, err.message);
			} finally {
				if (isMounted) setLoading(false);
			}
		};

		fetchData();
		return () => { isMounted = false; };
	}, [schema, page.skip, page.take, protocol, resource, entityName, isRest, toPluralCamelCase]);

	const columns = useMemo(() => {
		if (!schema?.properties) return [];
		return Object.keys(schema.properties).filter((key) => {
			const prop = schema.properties[key];
			const lowerKey = key.toLowerCase();
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

	const gridStyle = useMemo(() => ({
		display: "grid",
		gridTemplateColumns: (schema?.["x-keyless"] || schema?.["xKeyless"])
            ? `repeat(${columns.length}, 1fr)`
            : `120px repeat(${columns.length}, 1fr)`,
		gap: "10px",
		alignItems: "center",
	}), [schema, columns.length]);

	if (loading && !schema)
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
				{!(schema?.["x-keyless"] || schema?.["xKeyless"]) && <div>ID</div>}
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
				data={data}
				item={(props) => {
					const item = props.dataItem;
					if (!schema) return null;

					let displayId = "";
					let idValue = null;
					const isKeyless = schema["x-keyless"] || schema["xKeyless"];

					if (isKeyless) {
						const identityFields = schema["x-identity-fields"] || [];
						idValue = identityFields.map((f) => getVal(item, f)).join("|");
						displayId = `IDX:${page.skip + (props.index !== undefined ? props.index : 0) + 1}`;
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
							{!isKeyless && (
								<div
									style={{ fontWeight: "bold", color: "#666", fontSize: "0.85rem" }}
									title={idValue}
								>
									{displayId}
								</div>
							)}
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
									const date = new Date(val);
									if (!isNaN(date.getTime())) {
										const pad = (n, l = 2) => String(n).padStart(l, '0');
										displayVal = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
									} else {
										displayVal = String(val);
									}
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
				}}
				style={{ width: "100%", minHeight: "400px" }}
			/>

			{data.length === 0 && !loading && (
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
				total={total}
				onPageChange={(e) => {
                    console.log(`AutoListView Pager onPageChange: skip=${e.skip} take=${e.take}`);
                    setPage({ skip: e.skip, take: e.take });
                }}
				pageSizeValues={[5, 10, 20, 50]}
			/>
		</div>
	);
};

export default AutoListView;
