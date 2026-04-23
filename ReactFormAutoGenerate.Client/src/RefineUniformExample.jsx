import React, { useState, useMemo } from 'react';
import { Box, Typography, Tabs, Tab, Paper } from '@mui/material';
import { useSelect } from '@refinedev/core';
import { UniformEntityManager } from './components/uniform/UniformEntityManager';

/**
 * RefineUniformExample Component
 * Demonstrates the integration of Refine with UniformEntityManager for CRUD operations
 * on Categories and Products using JSON Schema-driven forms.
 */
export const RefineUniformExample = () => {
    // State to manage active tab (0 for Categories, 1 for Products)
    const [tabIndex, setTabIndex] = useState(0);

    /**
     * Handles tab switching between different entity managers
     */
    const handleTabChange = (event, newValue) => {
        setTabIndex(newValue);
    };

    /**
     * Data Fetching Section
     * Pre-fetch Category list for use in the Product management tab
     * to provide selection options for CategoryId.
     */
    const { options: categoryOptions } = useSelect({
        resource: "categories",
        optionLabel: "name",
        optionValue: "id"
    });

    /**
     * Select Options Configuration
     * Maps category data to a format compatible with Uniforms selection fields.
     */
    const productSelectOptions = useMemo(() => {
        if (!categoryOptions || categoryOptions.length === 0) return {};
        
        return {
            CategoryId: {
                allowedValues: categoryOptions.map(o => o.value),
                transform: (value) => categoryOptions.find(o => o.value === value)?.label || value,
            }
        };
    }, [categoryOptions]);

    return (
        <Box sx={{ p: 3 }}>
            {/* Page Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Refine + Uniform Management</Typography>
            </Box>

            {/* Navigation Tabs */}
            <Paper sx={{ width: '100%', mb: 3 }}>
                <Tabs 
                    value={tabIndex} 
                    onChange={handleTabChange} 
                    centered
                    indicatorColor="primary"
                    textColor="primary"
                >
                    <Tab label="Categories" />
                    <Tab label="Products" />
                </Tabs>
            </Paper>

            {/* Entity Manager Display Section */}
            <Box sx={{ mt: 2 }}>
                {/* Category Management Tab */}
                {tabIndex === 0 && (
                    <UniformEntityManager 
                        resource="categories" 
                        schemaUrl="/api/schema/uniforms/category" 
                        title="Category" 
                    />
                )}
                {/* Product Management Tab */}
                {tabIndex === 1 && (
                    <UniformEntityManager 
                        resource="products" 
                        schemaUrl="/api/schema/uniforms/product" 
                        title="Product" 
                        selectOptions={productSelectOptions}
                    />
                )}
            </Box>
        </Box>
    );
};

export default RefineUniformExample;
