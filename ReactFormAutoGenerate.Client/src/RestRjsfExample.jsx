import React, { useState } from "react";
import { Box, Tabs, Tab, Typography } from "@mui/material";
import AutoManager from "./components/rest/rjsf/AutoManager";

/**
 * RestRjsfExample Component
 * The main container for the auto-generating UI demo using RJSF via REST API.
 * 
 * NOTE ON ARCHITECTURE:
 * While Refine internally uses TanStack Query and Axios via its Data Provider,
 * this specific component is designed as an EXPLICIT EXAMPLE of using 
 * react-query and axios directly alongside Refine.
 */
export const RestRjsfExample = () => {
  const [activeTab, setActiveTab] = useState(0);

  /**
   * Handle Tab change event.
   */
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">REST + Refine + RJSF</Typography>
      </Box>

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
