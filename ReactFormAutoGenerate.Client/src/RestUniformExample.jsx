/**
 * @file RestUniformExample.jsx
 * @description Example component demonstrating the use of Uniforms
 * with a REST API backend. It manages Categories, Products, and Inventory
 * entities using a centralized UniformEntityManager within a tabbed layout.
 */

import React, { useState } from 'react';
import { TabStrip, TabStripTab } from "@progress/kendo-react-layout";
import { UniformEntityManager } from './components/autoform/UniformEntityManager';

/**
 * RestUniformExample Component
 * @description Serves as a container for Uniform-based entity management using standard REST endpoints.
 */
export const RestUniformExample = () => {
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
                <h2 style={{ margin: 0 }}>REST + Refine + Uniforms</h2>
            </div>

            {/* !!! IMPORTANT: Unified Component Usage !!!
                The same UniformEntityManager is used for all tabs, 
                demonstrating high reusability across different resources.
            */}
            <TabStrip selected={selected} onSelect={handleSelect}>
                
                {/* Section: Category Management */}
                <TabStripTab title="Categories">
                    <div style={{ marginTop: '20px' }}>
                        <UniformEntityManager 
                            protocol="rest"
                            resource="categories"
                            title="Category"
                            schemaUrl="/api/schema/category"
                        />
                    </div>
                </TabStripTab>

                {/* Section: Product Management */}
                <TabStripTab title="Products">
                    <div style={{ marginTop: '20px' }}>
                        <UniformEntityManager 
                            protocol="rest"
                            resource="products"
                            title="Product"
                            schemaUrl="/api/schema/product"
                        />
                    </div>
                </TabStripTab>

                {/* Section: Inventory Management */}
                <TabStripTab title="Inventory">
                    <div style={{ marginTop: '20px' }}>
                        <UniformEntityManager 
                            protocol="rest"
                            resource="inventoryitems"
                            title="Inventory Item"
                            schemaUrl="/api/schema/inventoryitem"
                        />
                    </div>
                </TabStripTab>

                {/* Section: Product Logs (Keyless) */}
                <TabStripTab title="Logs">
                    <div style={{ marginTop: '20px' }}>
                        <UniformEntityManager 
                            protocol="rest"
                            resource="productlogs"
                            title="Product Log"
                            schemaUrl="/api/schema/productlog"
                        />
                    </div>
                </TabStripTab>

            </TabStrip>
        </div>
    );
};
