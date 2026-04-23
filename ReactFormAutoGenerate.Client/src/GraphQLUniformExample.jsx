import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Paper } from '@mui/material';
import { GraphQLUniformEntityManager } from './components/graphql/uniform/GraphQLUniformEntityManager';

/**
 * GraphQLUniformExample Component
 * Demonstrates the integration of GraphQL with Uniforms for CRUD operations.
 */
export const GraphQLUniformExample = () => {
    const [tabIndex, setTabIndex] = useState(0);

    const handleTabChange = (event, newValue) => {
        setTabIndex(newValue);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">GraphQL + Refine + Uniforms</Typography>
            </Box>

            <Paper sx={{ width: '100%', mb: 3 }}>
                <Tabs value={tabIndex} onChange={handleTabChange} centered indicatorColor="primary" textColor="primary">
                    <Tab label="Categories" />
                    <Tab label="Products" />
                </Tabs>
            </Paper>

            <Box sx={{ mt: 2 }}>
                {tabIndex === 0 && (
                    <GraphQLUniformEntityManager 
                        entityName="Category" 
                    />
                )}
                {tabIndex === 1 && (
                    <GraphQLUniformEntityManager 
                        entityName="Product" 
                        relations={[
                            { field: "CategoryId", resource: "categories", labelField: "Name" }
                        ]}
                    />
                )}
            </Box>
        </Box>
    );
};

export default GraphQLUniformExample;
