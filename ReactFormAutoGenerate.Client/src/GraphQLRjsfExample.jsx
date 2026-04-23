import React, { useState } from "react";
import { Box, Tabs, Tab, Typography, Button } from "@mui/material";
import { Link } from "react-router-dom";
import GraphQLAutoManager from "./components/graphql/rjsf/GraphQLAutoManager";

export const GraphQLRjsfExample = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">GraphQL + Refine + RJSF</Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Products" />
          <Tab label="Categories" />
        </Tabs>
      </Box>

      <Box key={activeTab}>
        {activeTab === 0 && (
          <GraphQLAutoManager 
            resource="products" 
            entityName="Product" 
            relations={[
              { field: "CategoryId", resource: "categories", labelField: "Name" }
            ]}
          />
        )}
        {activeTab === 1 && (
          <GraphQLAutoManager 
            resource="categories" 
            entityName="Category" 
          />
        )}
      </Box>
    </Box>
  );
};

export default GraphQLRjsfExample;
