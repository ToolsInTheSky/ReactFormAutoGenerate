/**
 * @file GraphQLUniformExample.jsx
 * @description Example component demonstrating the use of Uniforms
 * with a GraphQL backend. It utilizes the unified UniformEntityManager
 * with the "graphql" protocol to manage Categories, Products, and Inventory.
 */

import React, { useState } from 'react';
import { TabStrip, TabStripTab } from "@progress/kendo-react-layout";
import { UniformEntityManager } from './components/autoform/UniformEntityManager';

/**
 * GraphQLUniformExample Component
 * @description Serves as a host for Uniform-based entity management using GraphQL queries and mutations.
 */
export const GraphQLUniformExample = () => {
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
                <h2 style={{ margin: 0 }}>GraphQL + Refine + Uniforms</h2>
            </div>

            {/* !!! IMPORTANT: Unified Component with GraphQL Protocol !!!
                Passing protocol="graphql" informs the manager to use the 
                GraphQL-specific data fetching and schema extraction logic.
            */}
            <TabStrip selected={selected} onSelect={handleSelect}>
                
                {/* Section: Category Management (GraphQL) */}
                <TabStripTab title="Categories">
                    <div style={{ marginTop: '20px' }}>
                        <UniformEntityManager 
                            protocol="graphql"
                            entityName="Category"
                        />
                    </div>
                </TabStripTab>

                {/* Section: Product Management (GraphQL) */}
                <TabStripTab title="Products">
                    <div style={{ marginTop: '20px' }}>
                        <UniformEntityManager 
                            protocol="graphql"
                            entityName="Product"
                        />
                    </div>
                </TabStripTab>

                {/* Section: Inventory Management (GraphQL) */}
                <TabStripTab title="Inventory">
                    <div style={{ marginTop: '20px' }}>
                        <UniformEntityManager 
                            protocol="graphql"
                            entityName="InventoryItem"
                        />
                    </div>
                </TabStripTab>

            </TabStrip>
        </div>
    );
};
