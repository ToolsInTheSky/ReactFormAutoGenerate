/**
 * @file AutoGrid.jsx
 * @description A generic, schema-driven data grid based on KendoReact Grid.
 * It dynamically generates columns from JSON Schema properties, resolves ID values 
 * into display labels via lookups, and handles specialized data types like dates.
 */

import React, { useMemo, useState } from "react";
import { Grid, GridColumn } from "@progress/kendo-react-grid";
import { Button } from "@progress/kendo-react-buttons";
import { Loader } from "@progress/kendo-react-indicators";
import { plusIcon, arrowRotateCwIcon } from "@progress/kendo-svg-icons";
import { SvgIcon } from "@progress/kendo-react-common";
import { orderBy } from "@progress/kendo-data-query";
import pluralize from "pluralize";

/**
 * Utility: getVal
 * Case-insensitive helper to extract values from data items (REST/GraphQL agnostic).
 */
const getVal = (obj, key) => {
  if (!obj || !key) return undefined;
  if (obj[key] !== undefined) return obj[key];
  const camel = key.charAt(0).toLowerCase() + key.slice(1);
  if (obj[camel] !== undefined) return obj[camel];
  const pascal = key.charAt(0).toUpperCase() + key.slice(1);
  if (obj[pascal] !== undefined) return obj[pascal];
  return undefined;
};

/**
 * AutoDataCell Component
 * @description Specialized cell renderer for the Grid.
 * Handles:
 * 1. Date formatting (YYYY-MM-DD HH:mm:ss)
 * 2. Lookup resolution (ID -> Name)
 */
const AutoDataCell = (props) => {
  const { dataItem, field, lookups, originalCol, isDate, isBoolean } = props;
  const val = dataItem[field] ?? getVal(dataItem, originalCol);
  
  // section: Boolean Formatting
  if (isBoolean) {
    return <td {...props.tdProps}>{val ? "Yes" : "No"}</td>;
  }

  // section: Date Formatting
  if (isDate && val) {
    const date = new Date(val);
    if (!isNaN(date.getTime())) {
      const pad = (n) => n < 10 ? '0' + n : n;
      return <td {...props.tdProps}>{`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`}</td>;
    }
  }

  // section: Lookup Resolution
  const lookupMap = lookups[originalCol.toLowerCase()];
  if (lookupMap) {
    const displayVal = lookupMap[String(val)];
    return <td {...props.tdProps}>{displayVal ?? String(val ?? "")}</td>;
  }

  return <td {...props.tdProps}>{String(val ?? "")}</td>;
};

/**
 * AutoGrid Component
 */
const AutoGrid = ({ 
    data, 
    schema, 
    lookups = {}, 
    isLoading, 
    onRefresh, 
    onAdd, 
    onRowClick, 
    resourceName 
}) => {
  const [sort, setSort] = useState([{ field: "id", dir: "desc" }]);
  
  /**
   * section: Column Extraction
   * !!! IMPORTANT: Schema-to-Column Logic !!!
   * Filters out technical fields (ID, metadata) and complex objects without relations.
   */
  const columns = useMemo(() => {
    if (!schema?.properties) return [];
    const isKeyless = schema["x-keyless"] === true || schema["xKeyless"] === true;
    
    return Object.keys(schema.properties).filter(key => {
      const prop = schema.properties[key];
      const lowerKey = key.toLowerCase();
      
      // Filter 1: Always skip ID fields from dynamic columns (they are either fixed or technical)
      if (lowerKey === "id" || prop["x-identity"]) return false;
      
      // Filter 2: Detect complex nested types (objects/arrays)
      const isComplex = prop.type === "object" || 
                         prop.type === "array" || 
                         prop.$ref || 
                         prop.oneOf || 
                         prop.anyOf ||
                         (Array.isArray(prop.type) && (prop.type.includes("object") || prop.type.includes("array")));
      
      // Filter 3: Only allow complex objects if they represent a resolvable relation
      if (isComplex && !prop["x-relation"]) return false;
      
      return true;
    });
  }, [schema]);

  if (isLoading || !schema) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}><Loader size="large" type="pulsing" /></div>;
  }

  const isKeyless = schema["x-keyless"] === true || schema["xKeyless"] === true;

  const handleRowClick = (e) => {
    let idValue = null;
    if (isKeyless) {
        const identityFields = schema["x-identity-fields"] || [];
        idValue = identityFields.map(f => getVal(e.dataItem, f)).join('|');
    } else {
        const idKey = Object.keys(schema.properties).find(k => schema.properties[k]["x-identity"]) || "id";
        idValue = getVal(e.dataItem, idKey);
    }
    onRowClick(idValue, e.dataItem);
  };

  return (
    <div className="auto-grid-wrapper">
      {/* Grid Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>{(resourceName || "Data").toUpperCase()} List</h3>
        <div>
          <Button fillMode="outline" onClick={onRefresh} style={{ marginRight: '10px' }}><SvgIcon icon={arrowRotateCwIcon} /> Refresh</Button>
          <Button themeColor="primary" onClick={onAdd}><SvgIcon icon={plusIcon} /> Create New</Button>
        </div>
      </div>

      {/* !!! IMPORTANT: Kendo Grid Core !!! */}
      <Grid 
        data={orderBy(data, sort)} 
        style={{ height: '400px' }} 
        sortable={true}
        sort={sort}
        onSortChange={(e) => setSort(e.sort)}
        onRowClick={handleRowClick}>
        {/* Fixed ID Column - Hidden for keyless entities */}
        {!isKeyless && (
          <GridColumn 
              field="id" 
              title="ID" 
              width="120px" 
              cell={(props) => {
                  const item = props.dataItem;
                  return <td {...props.tdProps}>#{getVal(item, "id")}</td>;
              }} 
          />
        )}
        
        {/* Dynamically Generated Columns */}
        {columns.map(col => {
          const prop = schema.properties[col];
          const dataKey = col.charAt(0).toLowerCase() + col.slice(1);
          const relationResource = prop["x-relation"];
          const isDate = col.toLowerCase().includes("date") || prop.format === "date-time";
          const isBoolean = prop.type === "boolean";
          const title = relationResource ? pluralize.singular(relationResource).toUpperCase() : (prop.title || col).toUpperCase();

          return (
            <GridColumn 
              key={col} 
              field={dataKey} 
              title={title} 
              cells={{ data: (cp) => <AutoDataCell {...cp} lookups={lookups} originalCol={col} isDate={isDate} isBoolean={isBoolean} /> }}
            />
          );
        })}
      </Grid>
    </div>
  );
};

export default AutoGrid;
