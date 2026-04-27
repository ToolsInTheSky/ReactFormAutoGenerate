/**
 * @file RestRjsfExample.jsx
 * @description Example component demonstrating the use of react-jsonschema-form (RJSF) 
 * with a REST API backend. It manages multiple entities (Categories, Products, Inventory)
 * using a tabbed interface.
 */

import React, { useState } from "react";
import { TabStrip, TabStripTab } from "@progress/kendo-react-layout";
import RjsfEntityManager from "./components/autoform/rjsf/RjsfEntityManager";

/**
 * RestRjsfExample Component
 * @description Organizes RjsfEntityManager instances into tabs for different REST resources.
 */
export const RestRjsfExample = () => {
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
        <h2 style={{ margin: 0 }}>REST + Refine + RJSF</h2>
      </div>

      {/* !!! IMPORTANT: Unified Entity Management !!!
          Each tab renders an RjsfEntityManager configured for a specific REST resource.
      */}
      <TabStrip selected={selected} onSelect={handleSelect}>
        
        {/* Tab 1: Categories Management */}
        <TabStripTab title="Categories">
          <div style={{ marginTop: '20px' }}>
            <RjsfEntityManager 
              protocol="rest"
              resource="categories" 
              schemaKey="category" 
              entityName="Category"
            />
          </div>
        </TabStripTab>

        {/* Tab 2: Products Management */}
        <TabStripTab title="Products">
          <div style={{ marginTop: '20px' }}>
            <RjsfEntityManager 
              protocol="rest"
              resource="products" 
              schemaKey="product" 
              entityName="Product"
            />
          </div>
        </TabStripTab>

        {/* Tab 3: Inventory Management */}
        <TabStripTab title="Inventory">
          <div style={{ marginTop: '20px' }}>
            <RjsfEntityManager 
              protocol="rest"
              resource="inventoryitems" 
              schemaKey="inventoryitem" 
              entityName="InventoryItem"
            />
          </div>
        </TabStripTab>
        
      </TabStrip>
    </div>
  );
};
