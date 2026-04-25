import React, { useState } from "react";
import { TabStrip, TabStripTab } from "@progress/kendo-react-layout";
import AutoManager from "./components/rest/rjsf/AutoManager";

/**
 * RestRjsfExample Component
 * The main container for the auto-generating UI demo using RJSF via REST API.
 */
export const RestRjsfExample = () => {
  const [selected, setSelected] = useState(0);

  const handleSelect = (e) => {
    setSelected(e.selected);
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>REST + Refine + RJSF (KendoReact)</h2>
      </div>

      <TabStrip selected={selected} onSelect={handleSelect}>
        <TabStripTab title="Products">
          <div style={{ marginTop: '20px' }}>
            <AutoManager 
              resource="products" 
              schemaKey="product" 
              relations={[
                { field: "CategoryId", resource: "categories", labelField: "Name" }
              ]}
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
