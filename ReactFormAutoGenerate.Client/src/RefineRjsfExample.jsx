import React, { useState } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import AutoManager from "./components/rjsf/AutoManager";

/**
 * RefineRjsfExample Component
 * The main container for the auto-generating UI demo.
 * Uses Material UI Tabs to switch between managing different resources.
 */
export const RefineRjsfExample = () => {
  const [activeTab, setActiveTab] = useState(0);

  /**
   * Handle Tab change event.
   */
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box>
      {/* Navigation Tabs for switching between entities */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="management tabs">
          <Tab label="Products" />
          <Tab label="Categories" />
        </Tabs>
      </Box>

      {/* Conditional Rendering of AutoManager based on active tab */}
      <Box key={activeTab}>
        {activeTab === 0 && (
          <AutoManager 
            resource="products" 
            schemaKey="product" 
            // Configuration for foreign key relations
            relations={[
              { field: "CategoryId", resource: "categories", labelField: "Name" }
            ]}
          />
        )}
        {activeTab === 1 && (
          <AutoManager 
            resource="categories" 
            schemaKey="category" 
          />
        )}
      </Box>
    </Box>
  );
};
