/**
 * @file GraphQLRjsfExample.jsx
 * @description Example component demonstrating the use of react-jsonschema-form (RJSF) 
 * with a GraphQL backend. It shows how the same RjsfEntityManager can adapt to 
 * the GraphQL protocol for multiple entities.
 */

import React, { useState } from "react";
import { TabStrip, TabStripTab } from "@progress/kendo-react-layout";
import RjsfEntityManager from "./components/autoform/RjsfEntityManager";

/**
 * GraphQLRjsfExample Component
 * @description Centralizes GraphQL-based entity management using RJSF forms and KendoReact tabs.
 */
export const GraphQLRjsfExample = () => {
  const [selected, setSelected] = useState(0);

  /**
   * Handles tab selection changes.
   */
  const handleSelect = (e) => {
    setSelected(e.selected);
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>GraphQL + Refine + RJSF</h2>
      </div>

      {/* !!! IMPORTANT: GraphQL Protocol Integration !!!
          The protocol="graphql" prop switches the manager's behavior to use 
          GraphQL queries and mutations instead of REST.
      */}
      <TabStrip selected={selected} onSelect={handleSelect}>
        
        {/* Section: Category Management (GraphQL) */}
        <TabStripTab title="Categories">
          <div style={{ marginTop: '20px' }}>
            <RjsfEntityManager 
              protocol="graphql"
              resource="categories" 
              entityName="Category" 
            />
          </div>
        </TabStripTab>

        {/* Section: Product Management (GraphQL) */}
        <TabStripTab title="Products">
          <div style={{ marginTop: '20px' }}>
            <RjsfEntityManager 
              protocol="graphql"
              resource="products" 
              entityName="Product" 
            />
          </div>
        </TabStripTab>

        {/* Section: Inventory Management (GraphQL) */}
        <TabStripTab title="Inventory">
          <div style={{ marginTop: '20px' }}>
            <RjsfEntityManager 
              protocol="graphql"
              resource="inventoryitems" 
              entityName="InventoryItem" 
            />
          </div>
        </TabStripTab>

      </TabStrip>
    </div>
  );
};

export default GraphQLRjsfExample;
