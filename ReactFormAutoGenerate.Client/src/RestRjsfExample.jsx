import React, { useState } from "react";
import { TabStrip, TabStripTab } from "@progress/kendo-react-layout";
import AutoManager from "./components/rest/rjsf/AutoManager";

export const RestRjsfExample = () => {
  const [selected, setSelected] = useState(0);

  const handleSelect = (e) => {
    setSelected(e.selected);
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>REST + Refine + RJSF (Inventory System)</h2>
      </div>

      <TabStrip selected={selected} onSelect={handleSelect}>
        <TabStripTab title="Inventory">
          <div style={{ marginTop: '20px' }}>
            <AutoManager 
              resource="inventoryitems" 
              schemaKey="inventoryitem" 
            />
          </div>
        </TabStripTab>
        <TabStripTab title="Products">
          <div style={{ marginTop: '20px' }}>
            <AutoManager 
              resource="products" 
              schemaKey="product" 
            />
          </div>
        </TabStripTab>
        <TabStripTab title="Categories">
          <div style={{ marginTop: '20px' }}>
            <AutoManager 
              resource="categories" 
              schemaKey="category" 
            />
          </div>
        </TabStripTab>
      </TabStrip>
    </div>
  );
};
